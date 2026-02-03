import mongoose from 'mongoose';

const stageSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true
  },
  label: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'running', 'success', 'failed'],
    default: 'pending'
  },
  order: {
    type: Number,
    required: true
  },
  startedAt: Date,
  endedAt: Date,
  lastNodeTitle: String,
  lastNodeType: String,
  lastNodeId: String,
  lastEventAt: Date
}, { _id: false });

const agentTaskSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    unique: true
  },
  contextId: String,
  mode: {
    type: String,
    enum: ['casual', 'standard'],
    required: true
  },
  stages: [stageSchema],
  currentStageKey: String,
  workflowRunId: String,
  lastEventAt: Date
}, {
  timestamps: true
});

agentTaskSchema.index({ userId: 1, updatedAt: -1 });

export default mongoose.model('AgentTask', agentTaskSchema);
