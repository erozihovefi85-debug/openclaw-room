import mongoose from 'mongoose';

/**
 * 采购品类模板模型
 * 用于管理不同采购品类的需求清单模板
 */
const procurementCategorySchema = new mongoose.Schema({
  // 品类名称（如：软件开发、硬件采购、咨询服务等）
  name: {
    type: String,
    required: true,
    unique: true,
  },

  // 品类代码（唯一标识，用于匹配）
  code: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  },

  // 品类描述
  description: {
    type: String,
    default: '',
  },

  // 关键词列表（用于AI自动识别匹配）
  keywords: [{
    type: String,
    trim: true,
  }],

  // Excel模板配置
  templateConfig: {
    // 表头字段定义
    columns: [{
      // 字段键名（英文）
      key: {
        type: String,
        required: true,
      },
      // 字段显示名称（中文）
      label: {
        type: String,
        required: true,
      },
      // 是否必填
      required: {
        type: Boolean,
        default: false,
      },
      // 列宽
      width: {
        type: Number,
        default: 15,
      },
      // 字段类型：text, number, date, select, textarea
      type: {
        type: String,
        enum: ['text', 'number', 'date', 'select', 'textarea', 'multiselect'],
        default: 'text',
      },
      // 选项（用于select类型）
      options: [{
        type: String,
      }],
      // 默认值
      defaultValue: String,
      // 填写说明
      instruction: String,
      // 示例值
      example: String,
    }],

    // 工作表配置
    sheets: [{
      // 工作表名称
      name: {
        type: String,
        required: true,
      },
      // 工作表类型：main（主表）、summary（概要）、instruction（说明）
      type: {
        type: String,
        enum: ['main', 'summary', 'instruction'],
        default: 'main',
      },
      // 是否启用
      enabled: {
        type: Boolean,
        default: true,
      },
    }],
  },

  // AI识别提示词（帮助大模型识别该品类）
  identificationPrompt: {
    type: String,
    default: '',
  },

  // 排序优先级（数字越小越优先）
  priority: {
    type: Number,
    default: 0,
  },

  // 是否启用
  enabled: {
    type: Boolean,
    default: true,
  },

  // 创建者
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },

  // 最后修改者
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// 索引（移除重复的code索引，已在schema定义中添加）
procurementCategorySchema.index({ enabled: 1 });
procurementCategorySchema.index({ priority: 1 });

export default mongoose.model('ProcurementCategory', procurementCategorySchema);
