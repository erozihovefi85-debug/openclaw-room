import mongoose from 'mongoose';

/**
 * 用户反馈模型
 * 用于收集用户对AI回复的评价，驱动智能体自我迭代
 */
const feedbackSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },
  messageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  // 满意度评分 1-5星
  satisfaction: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  // 不满意原因（可选）
  reason: {
    type: String,
    enum: ['not_relevant', 'inaccurate', 'too_long', 'too_short', 'missing_info', 'other'],
  },
  // 具体原因描述
  reasonText: { type: String, default: '' },
  // 用户改进建议
  improvements: { type: String, default: '' },
  // AI回复内容快照（用于分析）
  aiResponseSnapshot: { type: String, default: '' },
  // 用户查询快照
  querySnapshot: { type: String, default: '' },
  // 上下文信息（场景、品类等）
  context: {
    contextId: String,
    category: String,
    mode: String
  },
  // 是否已分析处理
  processed: {
    type: Boolean,
    default: false
  },
  // 处理结果
  analysisResult: {
    actionTaken: String,
    preferenceAdjustments: {},
    timestamp: Date
  }
}, {
  timestamps: true,
});

// 索引
feedbackSchema.index({ userId: 1, createdAt: -1 });
feedbackSchema.index({ processed: 1, createdAt: -1 });
feedbackSchema.index({ satisfaction: 1 });

export default mongoose.model('Feedback', feedbackSchema);
