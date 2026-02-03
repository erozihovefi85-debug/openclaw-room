import mongoose from 'mongoose';

/**
 * 用户偏好模型
 * 存储用户的个性化配置，用于智能体提供个性化服务
 */
const userPreferenceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },

  // === 采购偏好 ===
  procurementPreferences: {
    // 默认采购品类
    defaultCategory: {
      type: String,
      enum: ['', 'software_development', 'hardware_procurement', 'consulting_service', 'system_integration', 'general_procurement'],
      default: ''
    },
    // 偏好供应商ID列表
    preferredSuppliers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier'
    }],
    // 价格区间偏好
    preferredPriceRange: {
      min: { type: Number, default: 0 },
      max: { type: Number, default: Number.MAX_SAFE_INTEGER }
    },
    // 交付地点
    deliveryLocation: { type: String, default: '' },
    // 质量 vs 价格优先级
    qualityPriority: {
      type: { type: String, enum: ['quality', 'price', 'balanced'], default: 'balanced' },
      weight: { type: Number, default: 0.5, min: 0, max: 1 }
    },
    // 偏好付款方式
    paymentTerms: { type: String, default: '' }
  },

  // === 对话偏好 ===
  chatPreferences: {
    // 回复风格
    replyStyle: {
      type: { type: String, enum: ['concise', 'detailed', 'professional'], default: 'professional' }
    },
    // 语言偏好
    language: { type: String, default: 'zh-CN' },
    // AI人设
    voice: { type: String, enum: ['xiaomei', 'xiaoshuai'], default: 'xiaoshuai' },
    // 是否启用流式输出
    enableStream: { type: Boolean, default: true }
  },

  // === 功能偏好 ===
  featurePreferences: {
    // 自动加入心愿单
    autoSaveWishlist: { type: Boolean, default: false },
    // 显示价格对比
    showPriceComparison: { type: Boolean, default: true },
    // 启用通知
    enableNotifications: { type: Boolean, default: true },
    // 深色模式
    darkMode: { type: Boolean, default: false }
  },

  // === 智能体学习数据 ===
  learningData: {
    // 满意的查询（用于强化）
    satisfiedQueries: [{
      query: String,
      context: String,
      category: String,
      timestamp: { type: Date, default: Date.now }
    }],
    // 不满意的查询（用于改进）
    dissatisfiedQueries: [{
      query: String,
      reason: String,
      category: String,
      timestamp: { type: Date, default: Date.now }
    }],
    // 品类使用频率
    categoryFrequency: {
      type: Map,
      of: Number,
      default: new Map()
    },
    // 供应商关注频率
    supplierFrequency: {
      type: Map,
      of: Number,
      default: new Map()
    }
  },

  // 版本号（用于A/B测试和迁移）
  version: { type: Number, default: 1 },

  // 最后分析时间
  lastAnalyzedAt: { type: Date }
}, {
  timestamps: true,
});

// 索引优化查询性能
userPreferenceSchema.index({ userId: 1 });
userPreferenceSchema.index({ 'learningData.satisfiedQueries.timestamp': -1 });
userPreferenceSchema.index({ 'learningData.dissatisfiedQueries.timestamp': -1 });

export default mongoose.model('UserPreference', userPreferenceSchema);
