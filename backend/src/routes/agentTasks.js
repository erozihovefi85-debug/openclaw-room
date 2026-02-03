import express from 'express';
import { auth } from '../middleware/auth.js';
import AgentTask from '../models/AgentTask.js';

const router = express.Router();

/**
 * 获取指定会话的 Agent 任务状态
 * GET /api/agent-tasks/:conversationId
 */
router.get('/:conversationId', auth, async (req, res) => {
  try {
    const userId = req.userId;
    const { conversationId } = req.params;

    const task = await AgentTask.findOne({ conversationId, userId }).lean();

    res.json({
      success: true,
      data: task || null
    });
  } catch (error) {
    console.error('[AgentTask] Get error:', error);
    res.status(500).json({ message: '获取任务状态失败', error: error.message });
  }
});

export default router;
