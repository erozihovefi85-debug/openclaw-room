import express from 'express';
import multer from 'multer';
import { auth, adminAuth } from '../middleware/auth.js';
import ProcurementCategory from '../models/ProcurementCategory.js';
import * as XLSX from 'xlsx';

const router = express.Router();

// 配置文件上传
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

/**
 * 获取所有采购品类模板
 * GET /api/procurement-categories
 */
router.get('/', auth, async (req, res) => {
  try {
    const { enabled = 'true' } = req.query;

    const query = {
      ...(enabled === 'true' ? { enabled: true } : {}),
    };

    const categories = await ProcurementCategory.find(query)
      .sort({ priority: 1, name: 1 })
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('[Procurement Categories] Get error:', error);
    res.status(500).json({ success: false, message: '获取品类模板失败' });
  }
});

/**
 * 获取单个品类模板详情
 * GET /api/procurement-categories/:id
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const category = await ProcurementCategory.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!category) {
      return res.status(404).json({ success: false, message: '品类模板不存在' });
    }

    res.json({ success: true, data: category });
  } catch (error) {
    console.error('[Procurement Categories] Get detail error:', error);
    res.status(500).json({ success: false, message: '获取品类模板详情失败' });
  }
});

/**
 * 根据代码获取品类模板
 * GET /api/procurement-categories/code/:code
 */
router.get('/code/:code', auth, async (req, res) => {
  try {
    const category = await ProcurementCategory.findOne({
      code: req.params.code.toLowerCase(),
      enabled: true,
    });

    if (!category) {
      return res.status(404).json({ success: false, message: '品类模板不存在' });
    }

    res.json({ success: true, data: category });
  } catch (error) {
    console.error('[Procurement Categories] Get by code error:', error);
    res.status(500).json({ success: false, message: '获取品类模板失败' });
  }
});

/**
 * 创建品类模板（仅管理员）
 * POST /api/procurement-categories
 */
router.post('/', adminAuth, async (req, res) => {
  try {
    const {
      name,
      code,
      description,
      keywords,
      templateConfig,
      identificationPrompt,
      priority,
    } = req.body;

    // 验证必填字段
    if (!name || !code) {
      return res.status(400).json({ success: false, message: '品类名称和代码不能为空' });
    }

    // 检查代码是否已存在
    const existing = await ProcurementCategory.findOne({
      code: code.toLowerCase(),
    });

    if (existing) {
      return res.status(400).json({ success: false, message: '品类代码已存在' });
    }

    const category = await ProcurementCategory.create({
      name,
      code: code.toLowerCase(),
      description,
      keywords: keywords || [],
      templateConfig: templateConfig || getDefaultTemplateConfig(),
      identificationPrompt: identificationPrompt || '',
      priority: priority || 0,
      enabled: true,
      createdBy: req.user._id,
      updatedBy: req.user._id,
    });

    const populated = await ProcurementCategory.findById(category._id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    console.error('[Procurement Categories] Create error:', error);
    res.status(500).json({ success: false, message: '创建品类模板失败' });
  }
});

/**
 * 更新品类模板（仅管理员）
 * PUT /api/procurement-categories/:id
 */
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const {
      name,
      code,
      description,
      keywords,
      templateConfig,
      identificationPrompt,
      priority,
      enabled,
    } = req.body;

    const category = await ProcurementCategory.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ success: false, message: '品类模板不存在' });
    }

    // 如果修改了代码，检查新代码是否已被使用
    if (code && code.toLowerCase() !== category.code) {
      const existing = await ProcurementCategory.findOne({
        code: code.toLowerCase(),
        _id: { $ne: req.params.id },
      });

      if (existing) {
        return res.status(400).json({ success: false, message: '品类代码已存在' });
      }
    }

    // 更新字段
    if (name) category.name = name;
    if (code) category.code = code.toLowerCase();
    if (description !== undefined) category.description = description;
    if (keywords) category.keywords = keywords;
    if (templateConfig) category.templateConfig = templateConfig;
    if (identificationPrompt !== undefined) category.identificationPrompt = identificationPrompt;
    if (priority !== undefined) category.priority = priority;
    if (enabled !== undefined) category.enabled = enabled;
    category.updatedBy = req.user._id;

    await category.save();

    const updated = await ProcurementCategory.findById(category._id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('[Procurement Categories] Update error:', error);
    res.status(500).json({ success: false, message: '更新品类模板失败' });
  }
});

/**
 * 删除品类模板（仅管理员）
 * DELETE /api/procurement-categories/:id
 */
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const category = await ProcurementCategory.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ success: false, message: '品类模板不存在' });
    }

    await ProcurementCategory.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('[Procurement Categories] Delete error:', error);
    res.status(500).json({ success: false, message: '删除品类模板失败' });
  }
});

/**
 * 上传Excel模板文件并解析为品类模板（仅管理员）
 * POST /api/procurement-categories/upload-template
 */
router.post('/upload-template', adminAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: '请上传Excel文件' });
    }

    // 解析Excel文件
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });

    // 读取第一个工作表
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // 获取表头
    const headers = [];
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c: col });
      const cell = worksheet[cellAddress];
      if (cell && cell.v) {
        headers.push({
          key: cell.v.toString().toLowerCase().replace(/\s+/g, '_'),
          label: cell.v.toString(),
        });
      }
    }

    // 返回解析的表头，供管理员确认后创建品类模板
    res.json({
      success: true,
      data: {
        fileName: req.file.originalname,
        sheetName,
        headers,
        headerCount: headers.length,
      },
    });
  } catch (error) {
    console.error('[Procurement Categories] Upload template error:', error);
    res.status(500).json({ success: false, message: '上传模板文件失败' });
  }
});

/**
 * AI识别采购品类
 * POST /api/procurement-categories/identify
 */
router.post('/identify', auth, async (req, res) => {
  try {
    const { conversation, messages } = req.body;

    // 获取所有启用的品类模板
    const categories = await ProcurementCategory.find({ enabled: true })
      .sort({ priority: 1 });

    if (categories.length === 0) {
      return res.status(404).json({ success: false, message: '没有可用的品类模板' });
    }

    // 构建匹配文本
    const textToAnalyze = conversation || (
      messages ? messages.map((m) => `${m.role}: ${m.content}`).join('\n\n') : ''
    );

    if (!textToAnalyze) {
      return res.status(400).json({ success: false, message: '请提供对话内容' });
    }

    // 简单关键词匹配算法
    const scores = categories.map(category => {
      let score = 0;
      const lowerText = textToAnalyze.toLowerCase();

      // 匹配品类名称
      if (lowerText.includes(category.name.toLowerCase())) {
        score += 10;
      }

      // 匹配品类代码
      if (lowerText.includes(category.code.toLowerCase())) {
        score += 5;
      }

      // 匹配关键词
      category.keywords.forEach(keyword => {
        if (lowerText.includes(keyword.toLowerCase())) {
          score += 3;
        }
      });

      return {
        category,
        score,
      };
    });

    // 按分数排序
    scores.sort((a, b) => b.score - a.score);

    // 返回匹配结果
    const matched = scores.filter(s => s.score > 0);

    if (matched.length === 0) {
      return res.json({
        success: true,
        data: {
          matched: false,
          message: '未能识别出明确的采购品类',
          categories: categories.map(c => ({
            _id: c._id,
            name: c.name,
            code: c.code,
            description: c.description,
          })),
        },
      });
    }

    res.json({
      success: true,
      data: {
        matched: true,
        bestMatch: {
          category: matched[0].category,
          score: matched[0].score,
        },
        alternatives: matched.slice(1, 4).map(m => ({
          category: m.category,
          score: m.score,
        })),
      },
    });
  } catch (error) {
    console.error('[Procurement Categories] Identify error:', error);
    res.status(500).json({ success: false, message: '识别采购品类失败' });
  }
});

/**
 * 初始化默认品类模板（仅管理员，用于初始化系统）
 * POST /api/procurement-categories/init-defaults
 */
router.post('/init-defaults', adminAuth, async (req, res) => {
  try {
    const { force } = req.body;

    // 检查是否已存在默认模板（除非强制重新初始化）
    const existingCount = await ProcurementCategory.countDocuments();
    if (existingCount > 0 && !force) {
      return res.status(400).json({ success: false, message: '系统已存在品类模板，如需重新初始化请设置force参数为true' });
    }

    const defaultCategories = getDefaultCategories();

    // 如果是强制重新初始化，先删除所有现有模板
    if (force && existingCount > 0) {
      await ProcurementCategory.deleteMany({});
    }

    await ProcurementCategory.insertMany(defaultCategories.map(cat => ({
      ...cat,
      createdBy: req.user._id,
      updatedBy: req.user._id,
    })));

    const categories = await ProcurementCategory.find()
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    res.status(201).json({
      success: true,
      message: force
        ? `已重新初始化 ${defaultCategories.length} 个默认品类模板`
        : `已创建 ${defaultCategories.length} 个默认品类模板`,
      data: categories,
    });
  } catch (error) {
    console.error('[Procurement Categories] Init defaults error:', error);
    res.status(500).json({ success: false, message: '初始化默认模板失败' });
  }
});

// 辅助函数：获取默认模板配置
function getDefaultTemplateConfig() {
  return {
    columns: [
      { key: '序号', label: '序号', required: true, width: 6, type: 'number', defaultValue: '1' },
      { key: '需求编号', label: '需求编号', required: true, width: 15, type: 'text', defaultValue: 'REQ-001' },
      { key: '项目名称', label: '项目名称', required: true, width: 25, type: 'text', example: '企业ERP系统开发' },
      { key: '业务背景', label: '业务背景', required: true, width: 35, type: 'textarea', example: '为提升企业管理效率，需开发ERP系统' },
      { key: '优先级', label: '优先级', required: true, width: 8, type: 'select', options: ['高', '中', '低'], defaultValue: '中' },
      { key: '功能需求', label: '功能需求', required: true, width: 40, type: 'textarea', example: '用户管理；订单管理；报表统计' },
      { key: '预算金额', label: '预算金额（元）', required: false, width: 15, type: 'number', example: '100000' },
      { key: '交付日期', label: '交付日期', required: false, width: 15, type: 'date', example: '2024-12-31' },
      { key: '备注', label: '备注', required: false, width: 30, type: 'textarea' },
    ],
    sheets: [
      { name: '需求清单', type: 'main', enabled: true },
      { name: '项目概要', type: 'summary', enabled: true },
      { name: '填写说明', type: 'instruction', enabled: true },
    ],
  };
}

// 辅助函数：获取默认品类模板
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
          { key: '预算金额', label: '预算金额（元）', required: false, width: 15, type: 'number' },
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
          { key: '预算单价', label: '预算单价（元）', required: false, width: 15, type: 'number' },
          { key: '预算总价', label: '预算总价（元）', required: false, width: 15, type: 'number' },
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
          { key: '预算金额', label: '预算金额（元）', required: false, width: 15, type: 'number' },
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
      templateConfig: getDefaultTemplateConfig(),
      identificationPrompt: '通用采购需求，当无法明确分类时使用',
      priority: 99,
      enabled: true,
    },
  ];
}

export default router;
