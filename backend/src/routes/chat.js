import express from 'express';
import multer from 'multer';
import { auth } from '../middleware/auth.js';
import { getApiKey, streamChatMessage, uploadFile } from '../services/difyService.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import UserPreference from '../models/UserPreference.js';
import AgentTask from '../models/AgentTask.js';
import { buildSystemContext, enhanceQueryWithPreferences, buildDifyInputs } from '../utils/contextBuilder.js';

const router = express.Router();

// Configure multer for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760,
  },
});

const AGENT_STAGE_DEFS = {
  casual: [
    { key: 'receive', label: '接收任务' },
    { key: 'preliminary', label: '初步调研' },
    { key: 'deep', label: '深度调研' },
    { key: 'check', label: '结果检查' },
    { key: 'review', label: '结果校对' },
    { key: 'result', label: '选购方案' }
  ],
  standard: [
    { key: 'receive', label: '接收任务' },
    { key: 'preliminary', label: '初步调研' },
    { key: 'deep', label: '深度搜索' },
    { key: 'check', label: '结果检查' },
    { key: 'review', label: '结果校对' },
    { key: 'result', label: '供应商推荐' }
  ]
};

const getAgentStageDefs = (mode) => AGENT_STAGE_DEFS[mode] || AGENT_STAGE_DEFS.casual;

const buildDefaultStages = (mode) => {
  const defs = getAgentStageDefs(mode);
  return defs.map((stage, index) => ({
    key: stage.key,
    label: stage.label,
    status: 'pending',
    order: index
  }));
};

const normalizeText = (value) => (value || '').toString().toLowerCase();

const matchAny = (text, keywords) => keywords.some((kw) => text.includes(kw));

const inferStageFromContent = (text, mode, lastStageKey) => {
  if (!text) return lastStageKey || 'preliminary';

  const normalized = normalizeText(text);

  if (mode === 'casual') {
    if (matchAny(normalized, ['选购方案', '推荐方案', '最终推荐', '建议选择', '购买建议', '综合推荐', '采购建议']))
      return 'result';
  } else {
    if (matchAny(normalized, ['供应商推荐', '推荐供应商', '最终供应商', '建议供应商', '优选供应商', '供应商清单']))
      return 'result';
  }

  if (matchAny(normalized, ['校对', '修正', '优化', '调整', '改进', '复核', '修订', '完善']))
    return 'review';

  if (matchAny(normalized, ['检查', '审查', '验证', '评估', '核实', '审核', '确认']))
    return 'check';

  if (matchAny(normalized, ['深度', '详细', '进一步', '深入', '全面', '完整', '详尽']))
    return 'deep';

  if (matchAny(normalized, ['初步', '概要', '需求', '开始', '了解', '基本', '大致']))
    return 'preliminary';

  if (normalized.length < 30) return lastStageKey || 'preliminary';

  const stages = ['receive', 'preliminary', 'deep', 'check', 'review', 'result'];
  const currentIndex = stages.indexOf(lastStageKey);
  if (currentIndex >= 0 && currentIndex < stages.length - 1) {
    return stages[currentIndex + 1];
  }

  return lastStageKey || 'preliminary';
};

const inferStageKey = (event, data, lastStageKey, mode = 'casual', messageContent = null) => {
  if (event === 'workflow_started') return 'receive';
  if (event === 'workflow_finished') return 'result';

  if (event === 'agent_message' || event === 'message') {
    const content = data?.answer || data?.content || messageContent;
    if (content) {
      return inferStageFromContent(content, mode, lastStageKey);
    }
  }

  if (messageContent && messageContent.length > 50) {
    return inferStageFromContent(messageContent, mode, lastStageKey);
  }

  const rawTitle = `${data?.title || ''} ${data?.node_type || ''}`;
  const title = normalizeText(rawTitle);

  if (matchAny(title, ['初步', 'preliminary', '需求', '分析'])) return 'preliminary';
  if (matchAny(title, ['深度', 'deep', '搜索', 'search', '寻源', 'sourcing', '调研'])) return 'deep';
  if (matchAny(title, ['检查', '校验', '验证', 'check', '审查', '评估'])) return 'check';
  if (matchAny(title, ['校对', '修正', '修改', '复核', 'revise', 'correction'])) return 'review';
  if (matchAny(title, ['推荐', '方案', '结果', '输出', 'report', '结论'])) return 'result';

  return lastStageKey || 'preliminary';
};

const mapStageStatus = (event, data) => {
  if (event === 'workflow_started') return 'success';
  if (event === 'node_started') return 'running';
  if (event === 'node_finished') {
    const status = data?.status || data?.status_code || data?.state;
    if (typeof status === 'string' && ['failed', 'error'].includes(status.toLowerCase())) return 'failed';
    return 'success';
  }
  if (event === 'workflow_finished') {
    const status = data?.status || data?.status_code || data?.state;
    if (typeof status === 'string' && ['failed', 'error'].includes(status.toLowerCase())) return 'failed';
    return 'success';
  }
  return 'pending';
};

const upsertAgentTask = async ({
  conversationId,
  userId,
  contextId,
  mode,
  stageKey,
  status,
  nodeInfo,
  workflowRunId,
  reset
}) => {
  const now = new Date();
  const stageDefs = getAgentStageDefs(mode);

  let task = await AgentTask.findOne({ conversationId });
  if (!task) {
    task = new AgentTask({
      userId,
      conversationId,
      contextId,
      mode,
      stages: buildDefaultStages(mode),
      currentStageKey: stageKey,
      workflowRunId,
      lastEventAt: now
    });
  }

  if (!task.stages || task.stages.length === 0) {
    task.stages = buildDefaultStages(mode);
  }

  if (reset) {
    task.stages = buildDefaultStages(mode);
  }

  const stageIndex = stageDefs.findIndex((s) => s.key === stageKey);
  let stage = task.stages.find((s) => s.key === stageKey);
  if (!stage) {
    const def = stageDefs[stageIndex] || { key: stageKey, label: stageKey };
    stage = {
      key: def.key,
      label: def.label,
      status: 'pending',
      order: stageIndex >= 0 ? stageIndex : task.stages.length
    };
    task.stages.push(stage);
  }

  if (stageIndex >= 0) {
    for (let i = 0; i < stageIndex; i += 1) {
      const prevKey = stageDefs[i].key;
      const prevStage = task.stages.find((s) => s.key === prevKey);
      if (prevStage && prevStage.status === 'pending') {
        prevStage.status = 'success';
        prevStage.startedAt = prevStage.startedAt || now;
        prevStage.endedAt = prevStage.endedAt || now;
        prevStage.lastEventAt = now;
      }
    }
  }

  if (status === 'running' && !stage.startedAt) stage.startedAt = now;
  if (status === 'success' || status === 'failed') {
    stage.startedAt = stage.startedAt || now;
    stage.endedAt = now;
  }

  stage.status = status;
  stage.lastEventAt = now;
  if (nodeInfo?.title) stage.lastNodeTitle = nodeInfo.title;
  if (nodeInfo?.type) stage.lastNodeType = nodeInfo.type;
  if (nodeInfo?.id) stage.lastNodeId = nodeInfo.id;

  task.currentStageKey = stageKey;
  task.lastEventAt = now;
  if (workflowRunId) task.workflowRunId = workflowRunId;
  if (contextId && !task.contextId) task.contextId = contextId;
  if (mode && !task.mode) task.mode = mode;

  await task.save();
  return task;
};

// Helper function to find conversation by either MongoDB ObjectId or Dify UUID
const findConversationById = async (id) => {
  console.log('findConversationById called with ID:', id, 'contains hyphen:', id.includes('-'));
  // Check if it's a Dify UUID (contains hyphens, length 36)
  if (id.includes('-')) {
    console.log('Querying by difyConversationId:', id);
    return await Conversation.findOne({ difyConversationId: id });
  }
  // Otherwise, assume it's a MongoDB ObjectId
  console.log('Querying by MongoDB ObjectId:', id);
  return await Conversation.findById(id);
};

// Stream chat endpoint
router.post('/stream', auth, upload.array('files', 10), async (req, res) => {
  const { query, conversationId, contextId } = req.body;
  const userId = req.userId;
  const files = req.files;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const apiKey = getApiKey(contextId);
  console.log('=== Chat Request Debug ===');
  console.log('ContextId:', contextId);
  console.log('API Key (first 20 chars):', apiKey?.substring(0, 20));
  console.log('Query:', query?.substring(0, 50));
  console.log('Request conversationId:', conversationId);
  console.log('========================');

  try {
    // 🆕 获取用户偏好（用于个性化增强）
    const userPreference = await UserPreference.findOne({ userId }).lean().catch(() => null);
    console.log('[Chat] User preference found:', !!userPreference);

    // Upload files to Dify
    let uploadedFiles = [];
    if (files && files.length > 0) {
      uploadedFiles = await Promise.all(
        files.map(async (f) => {
          const fileBuffer = Buffer.from(f.buffer);
          const file = new File([fileBuffer], f.originalname, { type: f.mimetype });
          return await uploadFile(file, userId);
        })
      );
    }

    // Get or create conversation
    let conv = null;
    if (conversationId) {
      conv = await findConversationById(conversationId);
      console.log('Found conversation from DB:', {
        mongoId: conv._id.toString(),
        difyConversationId: conv.difyConversationId,
        contextId: conv.contextId
      });
    } else {
      conv = await Conversation.create({
        userId,
        contextId,
        name: query.substring(0, 50) + '...',
        mode: contextId.startsWith('casual') ? 'casual' : 'standard',
        tab: contextId.replace('standard_', '') || null,
      });
      console.log('Created new conversation:', {
        mongoId: conv._id.toString(),
        contextId: conv.contextId
      });
    }

    // 🆕 增强用户查询（基于偏好自动补充信息）
    const enhancedQuery = enhanceQueryWithPreferences(query, userPreference);
    const queryChanged = enhancedQuery !== query;
    if (queryChanged) {
      console.log('[Chat] Query enhanced with user preferences');
    }

    // 🆕 构建Dify inputs（传递用户偏好给工作流）
    const difyInputs = buildDifyInputs(userPreference, contextId);
    console.log('[Chat] Dify inputs:', Object.keys(difyInputs));

    // Create user message in local DB
    await Message.create({
      conversationId: conv._id,
      userId,
      role: 'user',
      content: query, // 保存原始查询
      files: uploadedFiles,
      // 🆕 保存增强后的查询上下文
      metadata: {
        enhancedQuery: queryChanged ? enhancedQuery : undefined,
        userPreferenceVersion: userPreference?.version
      }
    });

    // Track message for streaming
    let fullResponse = '';

    // Log Dify conversation ID before streaming
    console.log('Sending to Dify:', {
      query: enhancedQuery.substring(0, 50),
      originalQuery: query.substring(0, 50),
      difyConversationId: conv.difyConversationId || '(empty - new conversation)',
      userId,
      hasPreferences: !!userPreference
    });

    // 🆕 构建系统上下文（用于AI理解用户偏好）
    const systemContext = buildSystemContext(userPreference, contextId);
    if (systemContext) {
      console.log('[Chat] System context added, length:', systemContext.length);
    }

    const mode = contextId?.startsWith('casual') ? 'casual' : 'standard';
    let lastStageKey = null;
    let accumulatedContent = '';

    const emitTaskEvent = (payload) => {
      res.write(`data: ${JSON.stringify({ type: 'task', payload })}\n\n`);
    };

    // Stream from Dify
    await streamChatMessage(
      enhancedQuery, // 🆕 使用增强后的查询
      conv.difyConversationId || '',
      uploadedFiles,
      userId,
      apiKey,
      (chunk) => {
        fullResponse += chunk;
        accumulatedContent += chunk;
        res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
      },
      (newDifyConvId, generatedFiles) => {
        // Update conversation with Dify ID
        if (newDifyConvId && !conv.difyConversationId) {
          console.log('Saving Dify conversation ID:', {
            mongoId: conv._id.toString(),
            difyConversationId: newDifyConvId
          });
          conv.difyConversationId = newDifyConvId;
          conv.save();
        }

        // Create assistant message
        Message.create({
          conversationId: conv._id,
          userId,
          role: 'assistant',
          content: fullResponse,
          generatedFiles,
        }).catch(err => console.error('Failed to save message:', err));

        res.write(`data: ${JSON.stringify({ type: 'end', conversationId: conv._id, generatedFiles })}\n\n`);
        res.end();
      },
      (error) => {
        console.error('Stream error:', error);
        res.write(`data: ${JSON.stringify({ type: 'error', error })}\n\n`);
        res.end();
      },
      (nodeName) => {
        res.write(`data: ${JSON.stringify({ type: 'node', nodeName })}\n\n`);
      },
      (eventData) => {
        const event = eventData?.event;
        if (!event) return;

        const data = eventData?.data || {};
        const stageKey = inferStageKey(event, data, lastStageKey, mode, accumulatedContent);
        const status = mapStageStatus(event, data);
        lastStageKey = stageKey;

        const nodeInfo = {
          id: data?.node_id,
          title: data?.title || data?.node_type,
          type: data?.node_type
        };

        const stageLabel = getAgentStageDefs(mode).find((s) => s.key === stageKey)?.label || stageKey;

        emitTaskEvent({
          conversationId: conv._id.toString(),
          contextId,
          mode,
          stageKey,
          stageLabel,
          status,
          event,
          nodeTitle: nodeInfo.title,
          nodeType: nodeInfo.type,
          nodeId: nodeInfo.id,
          timestamp: Date.now()
        });

        upsertAgentTask({
          conversationId: conv._id,
          userId,
          contextId,
          mode,
          stageKey,
          status,
          nodeInfo,
          workflowRunId: eventData?.workflow_run_id,
          reset: event === 'workflow_started'
        }).catch((err) => console.error('[AgentTask] Update error:', err));
      },
      difyInputs // 🆕 传递用户偏好
    );
  } catch (error) {
    console.error('Chat stream error:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
    res.end();
  }
});

export default router;
