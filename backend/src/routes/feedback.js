import express from 'express';
import { auth } from '../middleware/auth.js';
import Feedback from '../models/Feedback.js';
import UserPreference from '../models/UserPreference.js';
import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';

const router = express.Router();

/**
 * 提交用户反馈
 * POST /api/feedback
 */
router.post('/', auth, async (req, res) => {
  try {
    const userId = req.userId;
    const {
      conversationId,
      messageId,
      satisfaction,  // 1-5星
      reason,        // 不满意原因
      reasonText,    // 具体原因描述
      improvements   // 用户建议
    } = req.body;

    // 验证必填字段
    if (!satisfaction || satisfaction < 1 || satisfaction > 5) {
      return res.status(400).json({ message: '满意度评分必须是1-5星' });
    }

    if (!conversationId) {
      return res.status(400).json({ message: '缺少会话ID' });
    }

    // 获取消息快照（用于分析）
    let aiResponseSnapshot = '';
    let querySnapshot = '';
    let contextInfo = {};

    if (messageId) {
      const message = await Message.findById(messageId);
      if (message && message.conversationId.toString() === conversationId) {
        aiResponseSnapshot = message.content || '';
        querySnapshot = message.role === 'assistant' ? '' : message.content;
      }
    }

    // 获取会话上下文
    const conversation = await Conversation.findById(conversationId);
    if (conversation) {
      contextInfo = {
        contextId: conversation.contextId,
        mode: conversation.mode,
        tab: conversation.tab
      };
    }

    // 1. 创建反馈记录
    const feedback = await Feedback.create({
      userId,
      conversationId,
      messageId,
      satisfaction,
      reason,
      reasonText: reasonText || '',
      improvements: improvements || '',
      aiResponseSnapshot,
      querySnapshot,
      context: contextInfo,
      processed: false
    });

    // 2. 更新用户学习数据
    await updateUserLearningData(userId, feedback, contextInfo);

    // 3. 异步分析反馈趋势（不阻塞响应）
    analyzeFeedbackTrends(userId).catch(err => {
      console.error('[Feedback] Analysis error:', err);
    });

    res.json({
      success: true,
      message: satisfaction >= 4 ? '感谢您的肯定！' : '感谢您的反馈，我们会持续改进',
      data: feedback
    });
  } catch (error) {
    console.error('[Feedback] Submit error:', error);
    res.status(500).json({ message: '提交反馈失败', error: error.message });
  }
});

/**
 * 获取用户反馈历史
 * GET /api/feedback
 */
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.userId;
    const { limit = 20, skip = 0 } = req.query;

    const feedbacks = await Feedback.find({ userId })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .lean();

    const total = await Feedback.countDocuments({ userId });

    res.json({
      success: true,
      data: {
        feedbacks,
        total,
        hasMore: parseInt(skip) + parseInt(limit) < total
      }
    });
  } catch (error) {
    console.error('[Feedback] Get history error:', error);
    res.status(500).json({ message: '获取反馈历史失败', error: error.message });
  }
});

/**
 * 获取反馈统计
 * GET /api/feedback/stats
 */
router.get('/stats', auth, async (req, res) => {
  try {
    const userId = req.userId;

    const stats = await Feedback.aggregate([
      { $match: { userId: mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          totalFeedbacks: { $sum: 1 },
          avgSatisfaction: { $avg: '$satisfaction' },
          satisfactionDistribution: {
            $push: '$satisfaction'
          }
        }
      }
    ]);

    const result = stats[0] || {
      totalFeedbacks: 0,
      avgSatisfaction: 0,
      satisfactionDistribution: []
    };

    // 计算分布
    const distribution = [1, 2, 3, 4, 5].map(star =>
      (result.satisfactionDistribution || []).filter(s => s === star).length
    );

    res.json({
      success: true,
      data: {
        totalFeedbacks: result.totalFeedbacks,
        avgSatisfaction: result.avgSatisfaction ? result.avgSatisfaction.toFixed(1) : 0,
        distribution
      }
    });
  } catch (error) {
    console.error('[Feedback] Stats error:', error);
    res.status(500).json({ message: '获取统计失败', error: error.message });
  }
});

/**
 * 更新用户学习数据
 */
async function updateUserLearningData(userId, feedback, contextInfo) {
  try {
    let preference = await UserPreference.findOne({ userId });

    // 如果用户没有偏好记录，创建一个
    if (!preference) {
      preference = await UserPreference.create({
        userId,
        procurementPreferences: {},
        chatPreferences: {},
        featurePreferences: {},
        learningData: {
          satisfiedQueries: [],
          dissatisfiedQueries: [],
          categoryFrequency: new Map(),
          supplierFrequency: new Map()
        }
      });
    }

    const { satisfaction, querySnapshot, context } = feedback;
    const category = context?.category || extractCategory(querySnapshot);

    if (satisfaction >= 4) {
      // 满意：强化模式
      preference.learningData.satisfiedQueries.push({
        query: querySnapshot,
        context: context?.contextId || '',
        category: category || '',
        timestamp: new Date()
      });

      // 保持最近100条
      if (preference.learningData.satisfiedQueries.length > 100) {
        preference.learningData.satisfiedQueries.shift();
      }

      // 更新品类频率
      if (category) {
        const freq = preference.learningData.categoryFrequency.get(category) || 0;
        preference.learningData.categoryFrequency.set(category, freq + 1);
      }
    } else {
      // 不满意：学习改进
      preference.learningData.dissatisfiedQueries.push({
        query: querySnapshot,
        reason: feedback.reason || 'unknown',
        category: category || '',
        timestamp: new Date()
      });

      // 保持最近50条
      if (preference.learningData.dissatisfiedQueries.length > 50) {
        preference.learningData.dissatisfiedQueries.shift();
      }
    }

    preference.lastAnalyzedAt = new Date();
    await preference.save();

    console.log('[Feedback] Learning data updated for user:', userId);
  } catch (error) {
    console.error('[Feedback] Update learning data error:', error);
  }
}

/**
 * 分析反馈趋势并自动调整偏好
 */
async function analyzeFeedbackTrends(userId) {
  try {
    const preference = await UserPreference.findOne({ userId });
    if (!preference) return;

    const { satisfiedQueries, dissatisfiedQueries } = preference.learningData;

    let adjustments = [];

    // 策略1：根据满意度调整回复风格
    if (dissatisfiedQueries.length >= 5) {
      const recentDissatisfied = dissatisfiedQueries.slice(-10);
      const tooLongCount = recentDissatisfied.filter(q => q.reason === 'too_long').length;
      const tooShortCount = recentDissatisfied.filter(q => q.reason === 'too_short').length;
      const notRelevantCount = recentDissatisfied.filter(q => q.reason === 'not_relevant').length;

      if (tooLongCount >= 3) {
        // 用户偏好更简洁
        if (preference.chatPreferences.replyStyle.type !== 'concise') {
          preference.chatPreferences.replyStyle.type = 'concise';
          adjustments.push('回复风格已调整为简洁模式');
        }
      } else if (tooShortCount >= 3) {
        // 用户偏好更详细
        if (preference.chatPreferences.replyStyle.type !== 'detailed') {
          preference.chatPreferences.replyStyle.type = 'detailed';
          adjustments.push('回复风格已调整为详细模式');
        }
      }

      if (notRelevantCount >= 3) {
        // 可能需要调整品类识别
        adjustments.push('检测到相关性问题，建议检查品类识别准确性');
      }
    }

    // 策略2：识别高频品类并设置为默认
    const categoryFreq = preference.learningData.categoryFrequency;
    if (categoryFreq && categoryFreq.size > 0) {
      const sortedCategories = Array.from(categoryFreq.entries())
        .sort((a, b) => b[1] - a[1]);

      const [topCategory, freq] = sortedCategories[0];

      if (freq >= 5 && topCategory !== preference.procurementPreferences.defaultCategory) {
        const oldCategory = preference.procurementPreferences.defaultCategory || '无';
        preference.procurementPreferences.defaultCategory = topCategory;
        adjustments.push(`默认品类已从 ${oldCategory} 调整为 ${topCategory}`);
      }
    }

    // 策略3：生成改进报告（当负面反馈达到阈值）
    if (dissatisfiedQueries.length >= 20) {
      const report = generateImprovementReport(dissatisfiedQueries, satisfiedQueries);
      // 这里可以发送给管理员或存入专门的改进建议表
      console.log('[Feedback] Improvement report generated:', report);
      // 清空已处理的反馈
      preference.learningData.dissatisfiedQueries = [];
      adjustments.push('已生成改进报告并重置反馈队列');
    }

    if (adjustments.length > 0) {
      preference.version += 1;
      await preference.save();
      console.log('[Feedback] Auto-adjustments made:', adjustments);
    }

    // 标记已处理的反馈
    await Feedback.updateMany(
      {
        userId,
        processed: false,
        createdAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } // 24小时前的
      },
      { processed: true }
    );
  } catch (error) {
    console.error('[Feedback] Trend analysis error:', error);
  }
}

/**
 * 生成改进报告
 */
function generateImprovementReport(dissatisfiedQueries, satisfiedQueries) {
  const reasonCounts = {};
  dissatisfiedQueries.forEach(q => {
    reasonCounts[q.reason] = (reasonCounts[q.reason] || 0) + 1;
  });

  return {
    totalDissatisfied: dissatisfiedQueries.length,
    topReasons: Object.entries(reasonCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3),
    generatedAt: new Date().toISOString()
  };
}

/**
 * 从查询中提取品类
 */
function extractCategory(query) {
  if (!query) return null;

  const categoryKeywords = {
    'software_development': ['软件', '开发', '系统', '平台', 'app', '应用'],
    'hardware_procurement': ['硬件', '设备', '服务器', '电脑', '机器'],
    'consulting_service': ['咨询', '顾问', '培训', '服务'],
    'system_integration': ['集成', '对接', '接口'],
    'general_procurement': ['采购', '买']
  };

  const lowerQuery = query.toLowerCase();
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(kw => lowerQuery.includes(kw))) {
      return category;
    }
  }

  return null;
}

export default router;
