import express from 'express';
import multer from 'multer';
import { auth } from '../middleware/auth.js';
import { getApiKey, streamChatMessage, uploadFile } from '../services/difyService.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import User from '../models/User.js';

const router = express.Router();

// Configure multer for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760,
  },
});

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

    // Create user message in local DB
    await Message.create({
      conversationId: conv._id,
      userId,
      role: 'user',
      content: query,
      files: uploadedFiles,
    });

    // Track message for streaming
    let fullResponse = '';

    // Log Dify conversation ID before streaming
    console.log('Sending to Dify:', {
      query: query?.substring(0, 50),
      difyConversationId: conv.difyConversationId || '(empty - new conversation)',
      userId
    });

    // Stream from Dify
    await streamChatMessage(
      query,
      conv.difyConversationId || '',
      uploadedFiles,
      userId,
      apiKey,
      (chunk) => {
        fullResponse += chunk;
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
      }
    );
  } catch (error) {
    console.error('Chat stream error:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
    res.end();
  }
});

export default router;
