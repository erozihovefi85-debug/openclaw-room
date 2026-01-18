/**
 * 初始化采购品类模板脚本
 * 运行方式: node backend/src/scripts/initProcurementCategories.js
 */

import mongoose from 'mongoose';
import ProcurementCategory from '../models/ProcurementCategory.js';

// 默认品类模板数据
function getDefaultCategories() {
  return [
    {
      name: '软件开发',
      code: 'software_development',
      description: '包括各类应用系统、平台、APP等软件开发项目',
      keywords: ['软件', '开发', '系统', '平台', 'APP', '网站', '小程序', 'ERP', 'CRM', 'OA', '代码', '编程'],
      templateConfig: {
        columns: [
          { key: '序号', label: '序号', required: true, width: 6, type: 'number' },
          { key: '需求编号', label: '需求编号', required: true, width: 15, type: 'text' },
          { key: '项目名称', label: '项目名称', required: true, width: 25, type: 'text' },
          { key: '业务背景', label: '业务背景', required: true, width: 35, type: 'textarea' },
          { key: '优先级', label: '优先级', required: true, width: 8, type: 'select', options: ['高', '中', '低'] },
          { key: '模块类别', label: '模块类别', required: true, width: 12, type: 'select', options: ['前端开发', '后端开发', '全栈开发', '移动端开发'] },
          { key: '功能需求', label: '功能需求', required: true, width: 40, type: 'textarea' },
          { key: '性能要求', label: '性能要求', required: false, width: 30, type: 'textarea' },
          { key: '安全要求', label: '安全要求', required: false, width: 30, type: 'textarea' },
          { key: '兼容性要求', label: '兼容性要求', required: false, width: 30, type: 'textarea' },
          { key: '技术栈', label: '技术栈', required: false, width: 25, type: 'text' },
          { key: '部署方式', label: '部署方式', required: false, width: 12, type: 'select', options: ['云服务器', '本地服务器', '混合部署'] },
          { key: '集成要求', label: '集成要求', required: false, width: 30, type: 'textarea' },
          { key: '代码标准', label: '代码标准', required: false, width: 25, type: 'text' },
          { key: '交付物', label: '交付物', required: false, width: 35, type: 'textarea' },
          { key: '预估工作量', label: '预估工作量', required: false, width: 15, type: 'text' },
          { key: '预算金额（元）', label: '预算金额（元）', required: false, width: 15, type: 'number' },
          { key: '供应商经验要求', label: '供应商经验要求', required: false, width: 25, type: 'text' },
          { key: '认证要求', label: '认证要求', required: false, width: 30, type: 'text' },
          { key: '团队规模', label: '团队规模', required: false, width: 10, type: 'number' },
          { key: '交付日期', label: '交付日期', required: false, width: 15, type: 'date' },
          { key: '付款条件', label: '付款条件', required: false, width: 20, type: 'text' },
          { key: '质保期', label: '质保期', required: false, width: 15, type: 'text' },
          { key: '知识产权', label: '知识产权', required: false, width: 25, type: 'select', options: ['归甲方所有', '归乙方所有', '共同拥有'] },
          { key: '备注', label: '备注', required: false, width: 30, type: 'textarea' },
        ],
        sheets: [
          { name: '需求清单', type: 'main', enabled: true },
          { name: '项目概要', type: 'summary', enabled: true },
          { name: '填写说明', type: 'instruction', enabled: true },
        ],
      },
      identificationPrompt: '识别软件开发类项目，包括应用系统、平台、APP、网站等',
      priority: 1,
      enabled: true,
    },
    {
      name: '硬件采购',
      code: 'hardware_procurement',
      description: '包括服务器、网络设备、办公设备等硬件采购',
      keywords: ['服务器', '电脑', '硬件', '设备', '采购', '网络设备', '存储', '打印机', '办公设备'],
      templateConfig: {
        columns: [
          { key: '序号', label: '序号', required: true, width: 6, type: 'number' },
          { key: '需求编号', label: '需求编号', required: true, width: 15, type: 'text' },
          { key: '物品名称', label: '物品名称', required: true, width: 25, type: 'text' },
          { key: '规格型号', label: '规格型号', required: true, width: 30, type: 'text' },
          { key: '优先级', label: '优先级', required: true, width: 8, type: 'select', options: ['高', '中', '低'] },
          { key: '数量', label: '数量', required: true, width: 10, type: 'number' },
          { key: '单位', label: '单位', required: true, width: 8, type: 'select', options: ['台', '个', '套', '批'] },
          { key: '技术参数', label: '技术参数', required: false, width: 40, type: 'textarea' },
          { key: '品牌要求', label: '品牌要求', required: false, width: 20, type: 'text' },
          { key: '预算单价（元）', label: '预算单价（元）', required: false, width: 15, type: 'number' },
          { key: '预算总价（元）', label: '预算总价（元）', required: false, width: 15, type: 'number' },
          { key: '交货期限', label: '交货期限', required: false, width: 15, type: 'date' },
          { key: '质保期', label: '质保期', required: false, width: 15, type: 'text' },
          { key: '售后要求', label: '售后要求', required: false, width: 30, type: 'textarea' },
          { key: '验收标准', label: '验收标准', required: false, width: 30, type: 'textarea' },
          { key: '备注', label: '备注', required: false, width: 30, type: 'textarea' },
        ],
        sheets: [
          { name: '硬件采购清单', type: 'main', enabled: true },
          { name: '采购概要', type: 'summary', enabled: true },
          { name: '填写说明', type: 'instruction', enabled: true },
        ],
      },
      identificationPrompt: '识别硬件采购类项目，包括服务器、网络设备、办公设备等',
      priority: 2,
      enabled: true,
    },
    {
      name: '咨询服务',
      code: 'consulting_service',
      description: '包括管理咨询、技术咨询、培训服务等',
      keywords: ['咨询', '顾问', '培训', '服务', '咨询方案', '咨询报告', '专家', '顾问服务'],
      templateConfig: {
        columns: [
          { key: '序号', label: '序号', required: true, width: 6, type: 'number' },
          { key: '需求编号', label: '需求编号', required: true, width: 15, type: 'text' },
          { key: '咨询项目名称', label: '咨询项目名称', required: true, width: 25, type: 'text' },
          { key: '业务背景', label: '业务背景', required: true, width: 35, type: 'textarea' },
          { key: '优先级', label: '优先级', required: true, width: 8, type: 'select', options: ['高', '中', '低'] },
          { key: '咨询类型', label: '咨询类型', required: true, width: 15, type: 'select', options: ['管理咨询', '技术咨询', '培训服务', '战略咨询'] },
          { key: '服务内容', label: '服务内容', required: true, width: 40, type: 'textarea' },
          { key: '服务方式', label: '服务方式', required: false, width: 15, type: 'select', options: ['现场服务', '远程服务', '混合服务'] },
          { key: '服务周期', label: '服务周期', required: false, width: 15, type: 'text' },
          { key: '专家资质要求', label: '专家资质要求', required: false, width: 30, type: 'textarea' },
          { key: '交付成果', label: '交付成果', required: false, width: 35, type: 'textarea' },
          { key: '预算金额（元）', label: '预算金额（元）', required: false, width: 15, type: 'number' },
          { key: '开始日期', label: '开始日期', required: false, width: 15, type: 'date' },
          { key: '结束日期', label: '结束日期', required: false, width: 15, type: 'date' },
          { key: '付款方式', label: '付款方式', required: false, width: 20, type: 'text' },
          { key: '验收标准', label: '验收标准', required: false, width: 30, type: 'textarea' },
          { key: '备注', label: '备注', required: false, width: 30, type: 'textarea' },
        ],
        sheets: [
          { name: '咨询服务清单', type: 'main', enabled: true },
          { name: '项目概要', type: 'summary', enabled: true },
          { name: '填写说明', type: 'instruction', enabled: true },
        ],
      },
      identificationPrompt: '识别咨询服务类项目，包括管理咨询、技术咨询、培训服务等',
      priority: 3,
      enabled: true,
    },
    {
      name: '通用采购',
      code: 'general_procurement',
      description: '通用采购需求模板，适用于其他类型采购',
      keywords: ['采购', '需求', '清单', '通用'],
      templateConfig: {
        columns: [
          { key: '序号', label: '序号', required: true, width: 6, type: 'number', defaultValue: '1' },
          { key: '需求编号', label: '需求编号', required: true, width: 15, type: 'text', defaultValue: 'REQ-001' },
          { key: '项目名称', label: '项目名称', required: true, width: 25, type: 'text', example: '企业ERP系统开发' },
          { key: '业务背景', label: '业务背景', required: true, width: 35, type: 'textarea', example: '为提升企业管理效率，需开发ERP系统' },
          { key: '优先级', label: '优先级', required: true, width: 8, type: 'select', options: ['高', '中', '低'], defaultValue: '中' },
          { key: '功能需求', label: '功能需求', required: true, width: 40, type: 'textarea', example: '用户管理；订单管理；报表统计' },
          { key: '预算金额（元）', label: '预算金额（元）', required: false, width: 15, type: 'number', example: '100000' },
          { key: '交付日期', label: '交付日期', required: false, width: 15, type: 'date', example: '2024-12-31' },
          { key: '备注', label: '备注', required: false, width: 30, type: 'textarea' },
        ],
        sheets: [
          { name: '需求清单', type: 'main', enabled: true },
          { name: '项目概要', type: 'summary', enabled: true },
          { name: '填写说明', type: 'instruction', enabled: true },
        ],
      },
      identificationPrompt: '通用采购需求，当无法明确分类时使用',
      priority: 99,
      enabled: true,
    },
  ];
}

async function initCategories() {
  try {
    // 连接数据库
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/procureai';
    await mongoose.connect(MONGODB_URI);
    console.log('✓ MongoDB Connected');

    // 检查是否已存在品类模板
    const existingCount = await ProcurementCategory.countDocuments();
    console.log(`Existing categories: ${existingCount}`);

    if (existingCount > 0) {
      console.log('⚠️  数据库中已存在品类模板');
      const shouldContinue = process.argv.includes('--force');
      if (!shouldContinue) {
        console.log('💡 如需重新初始化，请使用: node initProcurementCategories.js --force');
        await mongoose.disconnect();
        process.exit(0);
      }
      console.log('🔄 强制重新初始化...');
      await ProcurementCategory.deleteMany({});
    }

    // 插入默认品类模板
    const defaultCategories = getDefaultCategories();
    await ProcurementCategory.insertMany(defaultCategories);

    console.log(`✅ 成功初始化 ${defaultCategories.length} 个默认品类模板:`);
    defaultCategories.forEach(cat => {
      console.log(`   - ${cat.name} (${cat.code}): ${cat.templateConfig.columns.length} 个字段`);
    });

    // 验证插入结果
    const categories = await ProcurementCategory.find().sort({ priority: 1 });
    console.log(`\n📊 当前数据库中共有 ${categories.length} 个品类模板`);

    await mongoose.disconnect();
    console.log('✓ 数据库连接已关闭');

  } catch (error) {
    console.error('❌ 初始化失败:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// 运行初始化
initCategories();
