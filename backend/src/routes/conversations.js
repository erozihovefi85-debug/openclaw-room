import express from 'express';
import { auth } from '../middleware/auth.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import { fetchConversations, fetchMessages, deleteConversation } from '../services/difyService.js';

const router = express.Router();

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

// Get all conversations for a user
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.userId;
    const contextId = req.query.contextId || 'casual_main';
    const sync = req.query.sync === 'true'; // 可选参数：是否同步 Dify 数据

    // 如果请求同步，则从 Dify 获取并更新本地数据库
    if (sync) {
      const { getApiKey } = await import('../services/difyService.js');
      const apiKey = getApiKey(contextId);

      // Get conversations from Dify
      const difyConversations = await fetchConversations(userId, apiKey);

      // Sync with local database
      for (const difyConv of difyConversations) {
        await Conversation.findOneAndUpdate(
          { difyConversationId: difyConv.id, userId },
          {
            contextId,
            name: difyConv.name || 'New Conversation',
            mode: contextId.startsWith('casual') ? 'casual' : 'standard',
            tab: contextId.replace('standard_', '') || null,
          },
          { upsert: true, new: true }
        );
      }
    }

    // Get all local conversations for this context (优先使用本地数据)
    const localConversations = await Conversation.find({ userId, contextId })
      .sort({ updatedAt: -1 });

    // Transform MongoDB documents to include id field (map _id to id)
    const transformedConversations = localConversations.map(conv => ({
      ...conv.toObject(),
      id: conv._id.toString()
    }));

    res.json(transformedConversations);
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get specific conversation
router.get('/:id', auth, async (req, res) => {
  try {
    const userId = req.userId;
    const conversation = await findConversationById(req.params.id);

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    if (conversation.userId.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(conversation);
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get messages for a conversation
router.get('/:id/messages', auth, async (req, res) => {
  try {
    const userId = req.userId;
    const conversation = await findConversationById(req.params.id);

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    if (conversation.userId.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get messages from local database
    const localMessages = await Message.find({ conversationId: conversation._id })
      .sort({ createdAt: 1 });

    // Transform MongoDB documents to match frontend Message interface
    const transformedMessages = localMessages.map(msg => ({
      id: msg._id.toString(),
      role: msg.role,
      content: msg.content,
      created_at: Math.floor(msg.createdAt.getTime() / 1000),
      files: msg.files?.map(f => ({
        id: f.id || '',
        name: f.name,
        size: f.size || 0,
        extension: f.name?.split('.').pop() || '',
        mime_type: f.type || '',
        created_by: 0,
        created_at: 0
      })) || [],
      generated_files: msg.generatedFiles || []
    }));

    res.json(transformedMessages);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete conversation
router.delete('/:id', auth, async (req, res) => {
  try {
    const userId = req.userId;
    const conversation = await findConversationById(req.params.id);

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    if (conversation.userId.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Delete from Dify
    if (conversation.difyConversationId) {
      // Get API key for this conversation's context
      const { getApiKey } = await import('../services/difyService.js');
      const apiKey = getApiKey(conversation.contextId);

      await deleteConversation(
        conversation.difyConversationId,
        userId,
        apiKey
      );
    }

    // Delete from local database
    await Message.deleteMany({ conversationId: conversation._id });
    await Conversation.findByIdAndDelete(conversation._id);

    res.json({ message: 'Conversation deleted successfully' });
  } catch (error) {
    console.error('Delete conversation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
