import express from 'express';
import multer from 'multer';
import { auth } from '../middleware/auth.js';
import ProcurementCategory from '../models/ProcurementCategory.js';
import axios from 'axios';
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
 * 生成需求清单Excel
 * POST /api/requirement-list/generate
 */
router.post('/generate', auth, async (req, res) => {
  try {
    const { items, projectSummary } = req.body;

    console.log('[Requirement List] Received items:', items?.length);
    console.log('[Requirement List] First item:', JSON.stringify(items?.[0], null, 2));

    if (!Array.isArray(items) || items.length === 0) {
      console.error('[Requirement List] No items');
      return res.status(400).json({ message: '需求清单不能为空' });
    }

    // 创建工作簿
    const workbook = XLSX.utils.book_new();

    // 辅助函数：处理各种格式转字符串
    const formatString = (value) => {
      if (value === null || value === undefined) return '';
      if (Array.isArray(value)) return value.join('；');
      if (typeof value === 'object') return JSON.stringify(value);
      return String(value);
    };

    // 1. 创建需求清单主表
    const mainData = items.map((item, index) => {
      console.log(`[Requirement List] Processing item ${index}:`, item.projectName);

      const row = {
        '序号': index + 1,
        '需求编号': formatString(item.requirementId) || `REQ-${String(index + 1).padStart(3, '0')}`,
        '项目名称': formatString(item.projectName),
        '业务背景': formatString(item.businessBackground),
        '优先级': (() => {
          const p = String(item.priority || '').toLowerCase();
          if (p === 'high') return '高';
          if (p === 'low') return '低';
          return '中';
        })(),
        '模块类别': formatString(item.moduleCategory),
        '功能需求': formatString(item.functionalRequirements),
      };

      // 处理非功能性需求
      if (item.nonFunctionalRequirements) {
        row['性能要求'] = formatString(item.nonFunctionalRequirements.performance);
        row['安全要求'] = formatString(item.nonFunctionalRequirements.security);
        row['兼容性要求'] = formatString(item.nonFunctionalRequirements.compatibility);
      } else {
        row['性能要求'] = '';
        row['安全要求'] = '';
        row['兼容性要求'] = '';
      }

      // 处理技术规格
      if (item.technicalSpecs) {
        row['技术栈'] = formatString(item.technicalSpecs.techStack);
        row['部署方式'] = formatString(item.technicalSpecs.deploymentMode);
        row['集成要求'] = formatString(item.technicalSpecs.integrationRequirements);
        row['代码标准'] = formatString(item.technicalSpecs.codeStandards);
      } else {
        row['技术栈'] = '';
        row['部署方式'] = '';
        row['集成要求'] = '';
        row['代码标准'] = '';
      }

      // 处理交付物
      row['交付物'] = Array.isArray(item.deliverables)
        ? item.deliverables.join('；')
        : formatString(item.deliverables);

      // 处理工作量
      if (item.estimatedWorkload) {
        row['预估工作量'] = item.workloadUnit
          ? `${item.estimatedWorkload} ${item.workloadUnit}`.trim()
          : formatString(item.estimatedWorkload);
      } else {
        row['预估工作量'] = '';
      }

      row['预算金额（元）'] = formatString(item.budgetAmount);

      // 处理供应商资质
      if (item.vendorQualifications) {
        row['供应商经验要求'] = formatString(item.vendorQualifications.minExperience);
        row['认证要求'] = Array.isArray(item.vendorQualifications.requiredCertifications)
          ? item.vendorQualifications.requiredCertifications.join('、')
          : formatString(item.vendorQualifications.requiredCertifications);
        row['团队规模'] = formatString(item.vendorQualifications.teamSize);
      } else {
        row['供应商经验要求'] = '';
        row['认证要求'] = '';
        row['团队规模'] = '';
      }

      row['交付日期'] = formatString(item.deliveryDate);
      row['付款条件'] = formatString(item.paymentTerms);
      row['质保期'] = formatString(item.warrantyPeriod);
      row['知识产权'] = formatString(item.intellectualProperty);
      row['备注'] = formatString(item.additionalNotes);

      return row;
    });

    console.log('[Requirement List] Main data prepared:', mainData.length, 'rows');

    const mainWorksheet = XLSX.utils.json_to_sheet(mainData);

    // 设置列宽
    mainWorksheet['!cols'] = [
      { wch: 6 },   // 序号
      { wch: 15 },  // 需求编号
      { wch: 25 },  // 项目名称
      { wch: 35 },  // 业务背景
      { wch: 8 },   // 优先级
      { wch: 12 },  // 模块类别
      { wch: 40 },  // 功能需求
      { wch: 30 },  // 性能要求
      { wch: 30 },  // 安全要求
      { wch: 30 },  // 兼容性要求
      { wch: 25 },  // 技术栈
      { wch: 12 },  // 部署方式
      { wch: 30 },  // 集成要求
      { wch: 25 },  // 代码标准
      { wch: 35 },  // 交付物
      { wch: 15 },  // 预估工作量
      { wch: 15 },  // 预算金额
      { wch: 25 },  // 供应商经验要求
      { wch: 30 },  // 认证要求
      { wch: 10 },  // 团队规模
      { wch: 15 },  // 交付日期
      { wch: 20 },  // 付款条件
      { wch: 15 },  // 质保期
      { wch: 25 },  // 知识产权
      { wch: 30 }   // 备注
    ];

    XLSX.utils.book_append_sheet(workbook, mainWorksheet, '需求清单');

    // 2. 创建项目概要表
    if (projectSummary) {
      const summaryData = [
        { '项目': '总预算（元）', '内容': formatString(projectSummary.totalBudget) },
        { '项目': '整体截止日期', '内容': formatString(projectSummary.overallDeadline) },
        { '项目': '评估标准', '内容': formatString(projectSummary.evaluationCriteria) },
        { '项目': '是否需要保密', '内容': projectSummary.confidentialityRequired ? '是' : '否' },
        { '项目': '需求数量', '内容': `${items.length} 项` },
        { '项目': '生成时间', '内容': new Date().toLocaleString('zh-CN') }
      ];
      const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData);
      summaryWorksheet['!cols'] = [{ wch: 20 }, { wch: 50 }];
      XLSX.utils.book_append_sheet(workbook, summaryWorksheet, '项目概要');
    }

    // 3. 创建填写说明表
    const instructionData = [
      { '填写项目': '项目名称', '填写说明': '简洁明确地描述项目名称', '是否必填': '是', '示例': '企业ERP系统开发' },
      { '填写项目': '业务背景', '填写说明': '描述项目的业务背景和目标', '是否必填': '是', '示例': '为提升企业管理效率，需开发ERP系统' },
      { '填写项目': '优先级', '填写说明': '选择需求的优先级：高/中/低', '是否必填': '是', '示例': '高' },
      { '填写项目': '模块类别', '填写说明': '选择模块类别：软件开发/系统集成/技术服务/咨询服务等', '是否必填': '是', '示例': '软件开发' },
      { '填写项目': '功能需求', '填写说明': '详细描述功能需求内容，多条用分号分隔', '是否必填': '是', '示例': '用户管理；订单管理；报表统计' },
      { '填写项目': '性能要求', '填写说明': '描述系统的性能要求', '是否必填': '否', '示例': '支持1000并发用户' },
      { '填写项目': '安全要求', '填写说明': '描述系统的安全要求', '是否必填': '否', '示例': '数据加密传输，权限控制' },
      { '填写项目': '兼容性要求', '填写说明': '描述系统的兼容性要求', '是否必填': '否', '示例': '支持Chrome、Firefox浏览器' },
      { '填写项目': '技术栈', '填写说明': '指定的技术栈要求，多个用分号分隔', '是否必填': '否', '示例': 'Java；Spring Boot；MySQL' },
      { '填写项目': '部署方式', '填写说明': '系统部署方式要求', '是否必填': '否', '示例': '云服务器部署' },
      { '填写项目': '集成要求', '填写说明': '与现有系统的集成要求，多条用分号分隔', '是否必填': '否', '示例': '与OA系统对接；与CRM系统集成' },
      { '填写项目': '代码标准', '填写说明': '代码编写标准要求', '是否必填': '否', '示例': '遵循ESLint规范' },
      { '填写项目': '交付物', '填写说明': '需要交付的成果物，多个用分号分隔', '是否必填': '否', '示例': '源代码；部署文档；用户手册' },
      { '填写项目': '预估工作量', '填写说明': '预估的工作量和单位', '是否必填': '否', '示例': '100人天' },
      { '填写项目': '预算金额', '填写说明': '该需求的预算金额（元）', '是否必填': '否', '示例': '100000' },
      { '填写项目': '供应商经验要求', '填写说明': '对供应商的经验要求', '是否必填': '否', '示例': '3年以上相关项目经验' },
      { '填写项目': '认证要求', '填写说明': '需要的认证资质，多个用顿号分隔', '是否必填': '否', '示例': 'ISO9001、CMMI3' },
      { '填写项目': '团队规模', '填写说明': '供应商团队规模要求', '是否必填': '否', '示例': '5人以上' },
      { '填写项目': '交付日期', '填写说明': '期望的交付日期', '是否必填': '否', '示例': '2024-12-31' },
      { '填写项目': '付款条件', '填写说明': '付款方式和条件', '是否必填': '否', '示例': '分期付款，验收后支付尾款' },
      { '填写项目': '质保期', '填写说明': '质保期限要求', '是否必填': '否', '示例': '1年免费维护' },
      { '填写项目': '知识产权', '填写说明': '知识产权归属说明', '是否必填': '否', '示例': '归甲方所有' },
      { '填写项目': '备注', '填写说明': '其他需要补充说明的内容', '是否必填': '否', '示例': '需提供培训服务' }
    ];
    const instructionWorksheet = XLSX.utils.json_to_sheet(instructionData);
    instructionWorksheet['!cols'] = [{ wch: 15 }, { wch: 50 }, { wch: 10 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(workbook, instructionWorksheet, '填写说明');

    // 生成Excel文件
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    console.log('[Requirement List] Excel generated successfully, size:', buffer.length);

    // 设置响应头
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=requirement-list-${Date.now()}.xlsx`);

    res.send(buffer);
  } catch (error) {
    console.error('[Requirement List] Generate error:', error);
    res.status(500).json({ message: '生成需求清单失败', error: error.message });
  }
});

/**
 * 解析上传的需求清单Excel文件
 * POST /api/requirement-list/parse
 */
router.post('/parse', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '请上传Excel文件' });
    }

    // 解析Excel文件
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });

    // 读取"需求清单"工作表
    const sheetName = workbook.SheetNames.find(name => name.includes('需求清单')) || workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    // 转换数据格式
    const parsedItems = data.map((row, index) => {
      // 解析优先级
      let priority = 'medium';
      const priorityStr = String(row['优先级'] || '').trim();
      if (priorityStr === '高' || priorityStr.toLowerCase() === 'high') {
        priority = 'high';
      } else if (priorityStr === '低' || priorityStr.toLowerCase() === 'low') {
        priority = 'low';
      }

      // 解析交付物
      const deliverablesStr = String(row['交付物'] || '');
      const deliverables = deliverablesStr ? deliverablesStr.split(/；|;|；/).filter(d => d.trim()) : [];

      // 解析认证要求
      const certificationsStr = String(row['认证要求'] || '');
      const requiredCertifications = certificationsStr ? certificationsStr.split(/、|,|，/).filter(c => c.trim()) : [];

      // 解析工作量
      let estimatedWorkload;
      let workloadUnit = '';
      const workloadStr = String(row['预估工作量'] || '').trim();
      if (workloadStr) {
        const match = workloadStr.match(/^(\d+(?:\.\d+)?)\s*(\S+)$/);
        if (match) {
          estimatedWorkload = Number(match[1]);
          workloadUnit = match[2];
        } else {
          const numMatch = workloadStr.match(/^(\d+(?:\.\d+)?)/);
          if (numMatch) {
            estimatedWorkload = Number(numMatch[1]);
          }
        }
      }

      return {
        requirementId: row['需求编号'] || `REQ-${String(index + 1).padStart(3, '0')}`,
        projectName: row['项目名称'] || '',
        businessBackground: row['业务背景'] || '',
        priority,
        moduleCategory: row['模块类别'] || '',
        functionalRequirements: row['功能需求'] || '',
        nonFunctionalRequirements: {
          performance: row['性能要求'] || '',
          security: row['安全要求'] || '',
          compatibility: row['兼容性要求'] || ''
        },
        technicalSpecs: {
          techStack: row['技术栈'] || '',
          deploymentMode: row['部署方式'] || '',
          integrationRequirements: row['集成要求'] || '',
          codeStandards: row['代码标准'] || ''
        },
        deliverables,
        estimatedWorkload,
        workloadUnit,
        budgetAmount: row['预算金额（元）'] ? Number(row['预算金额（元）']) : undefined,
        vendorQualifications: {
          minExperience: row['供应商经验要求'] || '',
          requiredCertifications,
          teamSize: row['团队规模'] ? Number(row['团队规模']) : undefined
        },
        deliveryDate: row['交付日期'] || '',
        paymentTerms: row['付款条件'] || '',
        warrantyPeriod: row['质保期'] || '',
        intellectualProperty: row['知识产权'] || '',
        additionalNotes: row['备注'] || ''
      };
    });

    // 过滤掉空数据（至少需要有项目名称或功能需求）
    const validItems = parsedItems.filter(item => item.projectName || item.functionalRequirements);

    res.json({
      success: true,
      data: {
        items: validItems,
        summary: `已解析 ${validItems.length} 项需求`,
        totalCount: data.length,
        validCount: validItems.length
      }
    });
  } catch (error) {
    console.error('[Requirement List] Parse error:', error);
    res.status(500).json({ message: '解析需求清单失败', error: error.message });
  }
});

/**
 * 获取需求清单模板（空白模板供下载）
 * GET /api/requirement-list/template
 */
router.get('/template', auth, async (req, res) => {
  try {
    // 创建空白模板
    const workbook = XLSX.utils.book_new();

    // 创建空白需求清单
    const templateData = [
      {
        '序号': 1,
        '需求编号': 'REQ-001',
        '项目名称': '',
        '业务背景': '',
        '优先级': '',
        '模块类别': '',
        '功能需求': '',
        '性能要求': '',
        '安全要求': '',
        '兼容性要求': '',
        '技术栈': '',
        '部署方式': '',
        '集成要求': '',
        '代码标准': '',
        '交付物': '',
        '预估工作量': '',
        '预算金额（元）': '',
        '供应商经验要求': '',
        '认证要求': '',
        '团队规模': '',
        '交付日期': '',
        '付款条件': '',
        '质保期': '',
        '知识产权': '',
        '备注': ''
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    worksheet['!cols'] = [
      { wch: 6 },   // 序号
      { wch: 15 },  // 需求编号
      { wch: 25 },  // 项目名称
      { wch: 35 },  // 业务背景
      { wch: 8 },   // 优先级
      { wch: 12 },  // 模块类别
      { wch: 40 },  // 功能需求
      { wch: 30 },  // 性能要求
      { wch: 30 },  // 安全要求
      { wch: 30 },  // 兼容性要求
      { wch: 25 },  // 技术栈
      { wch: 12 },  // 部署方式
      { wch: 30 },  // 集成要求
      { wch: 25 },  // 代码标准
      { wch: 35 },  // 交付物
      { wch: 15 },  // 预估工作量
      { wch: 15 },  // 预算金额
      { wch: 25 },  // 供应商经验要求
      { wch: 30 },  // 认证要求
      { wch: 10 },  // 团队规模
      { wch: 15 },  // 交付日期
      { wch: 20 },  // 付款条件
      { wch: 15 },  // 质保期
      { wch: 25 },  // 知识产权
      { wch: 30 }   // 备注
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, '需求清单');

    // 添加填写说明
    const instructionData = [
      { '填写项目': '项目名称', '填写说明': '简洁明确地描述项目名称', '是否必填': '是' },
      { '填写项目': '业务背景', '填写说明': '描述项目的业务背景和目标', '是否必填': '是' },
      { '填写项目': '优先级', '填写说明': '选择需求的优先级：高/中/低', '是否必填': '是' },
      { '填写项目': '模块类别', '填写说明': '选择模块类别：软件开发/系统集成/技术服务/咨询服务等', '是否必填': '是' },
      { '填写项目': '功能需求', '填写说明': '详细描述功能需求内容', '是否必填': '是' },
      { '填写项目': '性能要求', '填写说明': '描述系统的性能要求', '是否必填': '否' },
      { '填写项目': '安全要求', '填写说明': '描述系统的安全要求', '是否必填': '否' },
      { '填写项目': '兼容性要求', '填写说明': '描述系统的兼容性要求', '是否必填': '否' },
      { '填写项目': '技术栈', '填写说明': '指定的技术栈要求', '是否必填': '否' },
      { '填写项目': '部署方式', '填写说明': '系统部署方式要求', '是否必填': '否' },
      { '填写项目': '集成要求', '填写说明': '与现有系统的集成要求', '是否必填': '否' },
      { '填写项目': '代码标准', '填写说明': '代码编写标准要求', '是否必填': '否' },
      { '填写项目': '交付物', '填写说明': '需要交付的成果物，多个用分号分隔', '是否必填': '否' },
      { '填写项目': '预估工作量', '填写说明': '预估的工作量和单位', '是否必填': '否' },
      { '填写项目': '预算金额', '填写说明': '该需求的预算金额（元）', '是否必填': '否' },
      { '填写项目': '供应商经验要求', '填写说明': '对供应商的经验要求', '是否必填': '否' },
      { '填写项目': '认证要求', '填写说明': '需要的认证资质', '是否必填': '否' },
      { '填写项目': '团队规模', '填写说明': '供应商团队规模要求', '是否必填': '否' },
      { '填写项目': '交付日期', '填写说明': '期望的交付日期', '是否必填': '否' },
      { '填写项目': '付款条件', '填写说明': '付款方式和条件', '是否必填': '否' },
      { '填写项目': '质保期', '填写说明': '质保期限要求', '是否必填': '否' },
      { '填写项目': '知识产权', '填写说明': '知识产权归属说明', '是否必填': '否' },
      { '填写项目': '备注', '填写说明': '其他需要补充说明的内容', '是否必填': '否' }
    ];
    const instructionWorksheet = XLSX.utils.json_to_sheet(instructionData);
    instructionWorksheet['!cols'] = [{ wch: 15 }, { wch: 40 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(workbook, instructionWorksheet, '填写说明');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=requirement-list-template.xlsx');
    res.send(buffer);
  } catch (error) {
    console.error('[Requirement List] Template error:', error);
    res.status(500).json({ message: '获取模板失败' });
  }
});

/**
 * 从对话中提取需求清单并识别品类（使用大模型）
 * POST /api/requirement-list/extract-with-category
 */
router.post('/extract-with-category', auth, async (req, res) => {
  try {
    const { messages, conversation } = req.body;

    console.log('[Requirement List Extract] Starting extraction with category identification...');

    // 构建对话上下文
    const conversationContext = conversation || (
      messages ? messages.map((m) => `${m.role === 'user' ? '用户' : 'AI助手'}: ${m.content}`).join('\n\n') : ''
    );

    if (!conversationContext) {
      return res.status(400).json({ message: '请提供对话内容' });
    }

    // 获取所有启用的品类模板
    const categories = await ProcurementCategory.find({ enabled: true })
      .sort({ priority: 1 });

    if (categories.length === 0) {
      return res.status(400).json({ message: '系统暂无可用的品类模板' });
    }

    // 构建品类信息给大模型
    const categoryInfo = categories.map(cat => ({
      code: cat.code,
      name: cat.name,
      keywords: cat.keywords,
      description: cat.description,
    }));

    // 调用大模型进行需求提取和品类识别
    const SILICONFLOW_API_BASE = process.env.SILICONFLOW_API_BASE || 'https://api.siliconflow.cn/v1';
    const API_KEY = process.env.SILICONFLOW_API_KEY;
    const MODEL_NAME = process.env.SILICONFLOW_MODEL || 'Qwen/Qwen2-VL-72B-Instruct';

    // 验证API Key配置
    if (!API_KEY) {
      console.error('[Requirement List Extract] SILICONFLOW_API_KEY not configured in environment');
      return res.status(500).json({ message: 'AI服务未配置，请联系管理员' });
    }

    const systemPrompt = `你是一个专业的采购需求分析专家。请分析以下对话内容，提取出所有采购需求信息（包括软件开发、系统集成、技术服务、硬件采购、咨询服务等）。

**重要：你需要识别采购品类（procurement_category）并在返回结果中标注。**

可用的采购品类：
${categories.map(cat => `- ${cat.name}（代码：${cat.code}）：${cat.description}，关键词：${cat.keywords.join('、')}`).join('\n')}

请严格按照以下JSON格式返回需求清单：
{
  "procurement_category": {
    "code": "品类代码（如：software_development）",
    "name": "品类名称（如：软件开发）",
    "confidence": "置信度（high/medium/low）"
  },
  "items": [
    {
      "requirementId": "需求编号（自动生成）",
      "projectName": "项目名称",
      "businessBackground": "业务背景说明",
      "priority": "high/medium/low",
      "moduleCategory": "模块类别",
      "functionalRequirements": "功能需求详细描述（如果是多条，用分号；分隔）",
      "nonFunctionalRequirements": {
        "performance": "性能要求（字符串）",
        "security": "安全要求（字符串）",
        "compatibility": "兼容性要求（字符串）"
      },
      "technicalSpecs": {
        "techStack": "技术栈要求（多个技术用分号；分隔）",
        "deploymentMode": "部署方式（字符串）",
        "integrationRequirements": "集成要求（多条用分号；分隔）",
        "codeStandards": "代码标准（字符串）"
      },
      "deliverables": ["交付物1", "交付物2"],
      "estimatedWorkload": 预估工作量（数字）,
      "workloadUnit": "工作量单位（人天/人月）",
      "budgetAmount": 预算金额（数字）,
      "vendorQualifications": {
        "minExperience": "最低经验要求（字符串）",
        "requiredCertifications": ["认证1", "认证2"],
        "teamSize": 团队规模要求（数字）
      },
      "deliveryDate": "交付日期",
      "paymentTerms": "付款条件",
      "warrantyPeriod": "质保期",
      "intellectualProperty": "知识产权归属",
      "additionalNotes": "其他备注"
    }
  ],
  "projectSummary": {
    "totalBudget": 总预算（数字）,
    "overallDeadline": "整体截止日期",
    "evaluationCriteria": "评估标准（多条用分号；分隔）",
    "confidentialityRequired": 是否需要保密（true/false）
  }
}

注意事项：
1. procurement_category字段必须包含，根据对话内容选择最合适的品类
2. 优先级：high（高优先级/紧急）、medium（中等）、low（低优先级）
3. 如果某些信息在对话中没有提到，可以不填或填null
4. **所有文本字段必须是字符串，多条内容用分号；分隔，只有deliverables和requiredCertifications是数组**
5. 只返回JSON，不要有任何其他文字说明`;

    const userPrompt = `请分析以下对话，提取采购需求清单并识别采购品类：
**注意：所有文本字段用分号；分隔多条内容，不要使用数组格式！**

${conversationContext}`;

    console.log('[Requirement List Extract] Calling AI model...');
    console.log('[Requirement List Extract] Conversation length:', conversationContext.length);

    const response = await axios.post(
      `${SILICONFLOW_API_BASE}/chat/completions`,
      {
        model: MODEL_NAME,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 8000,
        response_format: { type: 'json_object' }
      },
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 90000 // 90秒超时
      }
    );

    console.log('[Requirement List Extract] AI response received');

    const content = response.data.choices[0]?.message?.content;
    if (!content) {
      console.error('[Requirement List Extract] No content in AI response');
      return res.status(500).json({ message: 'AI返回内容为空' });
    }

    // 解析JSON响应
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (parseError) {
      console.error('[Requirement List Extract] JSON parse error:', parseError);
      console.error('[Requirement List Extract] Content that failed to parse:', content);
      return res.status(500).json({ message: 'AI返回内容解析失败' });
    }

    // 验证品类信息
    let category = null;
    let matchMethod = 'ai';
    let matchStartTime = Date.now();

    if (!parsed.procurement_category || !parsed.procurement_category.code) {
      // 如果AI没有识别出品类，使用关键词匹配算法
      console.log('[Category Match] AI failed to identify category, using keyword matching');

      try {
        const keywordMatch = matchCategoryByKeywords(conversationContext, categories);

        if (keywordMatch.score > 0 && keywordMatch.category) {
          parsed.procurement_category = {
            code: keywordMatch.category.code,
            name: keywordMatch.category.name,
            confidence: keywordMatch.confidence,
          };
          matchMethod = 'keyword';
          console.log('[Category Match] Keyword match result:', {
            category: keywordMatch.category.name,
            score: keywordMatch.score,
            matchedKeywords: keywordMatch.matchDetails.matchedKeywords
          });
        } else {
          // 使用默认品类
          const defaultCategory = categories.find(c => c.code === 'general_procurement') || categories[0];
          parsed.procurement_category = {
            code: defaultCategory.code,
            name: defaultCategory.name,
            confidence: 'low',
          };
          matchMethod = 'fallback';
          console.log('[Category Match] Using default category:', defaultCategory.name);
        }
      } catch (error) {
        console.error('[Category Match] Keyword matching failed:', error);
        // 使用默认品类
        const defaultCategory = categories.find(c => c.code === 'general_procurement') || categories[0];
        parsed.procurement_category = {
          code: defaultCategory.code,
          name: defaultCategory.name,
          confidence: 'low',
        };
        matchMethod = 'fallback';
      }
    } else {
      // AI识别出品类，验证是否存在
      const matchedCategory = categories.find(c => c.code === parsed.procurement_category.code);
      if (!matchedCategory) {
        console.warn('[Category Match] AI returned invalid category code:', parsed.procurement_category.code);

        // 尝试关键词匹配作为后备
        try {
          const keywordMatch = matchCategoryByKeywords(conversationContext, categories);
          if (keywordMatch.score > 0 && keywordMatch.category) {
            parsed.procurement_category = {
              code: keywordMatch.category.code,
              name: keywordMatch.category.name,
              confidence: 'medium',
            };
            matchMethod = 'keyword';
          } else {
            const defaultCategory = categories.find(c => c.code === 'general_procurement') || categories[0];
            parsed.procurement_category = {
              code: defaultCategory.code,
              name: defaultCategory.name,
              confidence: 'low',
            };
            matchMethod = 'fallback';
          }
        } catch (error) {
          console.error('[Category Match] Keyword matching fallback failed:', error);
          const defaultCategory = categories.find(c => c.code === 'general_procurement') || categories[0];
          parsed.procurement_category = {
            code: defaultCategory.code,
            name: defaultCategory.name,
            confidence: 'low',
          };
          matchMethod = 'fallback';
        }
      } else {
        parsed.procurement_category.name = matchedCategory.name;
      }
    }

    // 获取品类模板
    category = await ProcurementCategory.findOne({
      code: parsed.procurement_category.code,
      enabled: true,
    });

    if (!category) {
      return res.status(404).json({ message: '品类模板不存在' });
    }

    // 记录品类匹配结果用于分析
    const matchDuration = Date.now() - matchStartTime;
    console.log('[Category Match] Final result:', {
      identified: parsed.procurement_category,
      matchMethod,
      duration: matchDuration,
      timestamp: new Date().toISOString()
    });

    // 处理需求项目数据
    if (!parsed.items || !Array.isArray(parsed.items) || parsed.items.length === 0) {
      return res.status(400).json({ message: '未能从对话中提取到需求清单' });
    }

    // 辅助函数：将数组或对象转换为字符串
    const convertToString = (value) => {
      if (Array.isArray(value)) return value.join('；');
      if (typeof value === 'object' && value !== null) return JSON.stringify(value);
      return String(value || '');
    };

    // 处理每个项目
    const items = parsed.items.map((item, index) => {
      return {
        requirementId: `REQ-${Date.now()}-${String(index + 1).padStart(3, '0')}`,
        projectName: item.projectName || '未命名项目',
        businessBackground: item.businessBackground || '',
        priority: (item.priority === 'high' || item.priority === 'medium' || item.priority === 'low')
          ? item.priority
          : 'medium',
        moduleCategory: item.moduleCategory || '其他',
        functionalRequirements: convertToString(item.functionalRequirements),
        nonFunctionalRequirements: {
          performance: convertToString(item.nonFunctionalRequirements?.performance || ''),
          security: convertToString(item.nonFunctionalRequirements?.security || ''),
          compatibility: convertToString(item.nonFunctionalRequirements?.compatibility || '')
        },
        technicalSpecs: {
          techStack: convertToString(item.technicalSpecs?.techStack),
          deploymentMode: convertToString(item.technicalSpecs?.deploymentMode),
          integrationRequirements: convertToString(item.technicalSpecs?.integrationRequirements),
          codeStandards: convertToString(item.technicalSpecs?.codeStandards)
        },
        deliverables: Array.isArray(item.deliverables) ? item.deliverables : [],
        estimatedWorkload: item.estimatedWorkload ? Number(item.estimatedWorkload) : undefined,
        workloadUnit: item.workloadUnit || '',
        budgetAmount: item.budgetAmount ? Number(item.budgetAmount) : undefined,
        vendorQualifications: item.vendorQualifications ? {
          minExperience: convertToString(item.vendorQualifications.minExperience),
          requiredCertifications: Array.isArray(item.vendorQualifications.requiredCertifications)
            ? item.vendorQualifications.requiredCertifications
            : [],
          teamSize: item.vendorQualifications.teamSize ? Number(item.vendorQualifications.teamSize) : undefined
        } : undefined,
        deliveryDate: item.deliveryDate || '',
        paymentTerms: item.paymentTerms || '',
        warrantyPeriod: item.warrantyPeriod || '',
        intellectualProperty: item.intellectualProperty || '',
        additionalNotes: item.additionalNotes || ''
      };
    });

    // 处理项目概要
    const projectSummary = {
      totalBudget: parsed.projectSummary?.totalBudget ? Number(parsed.projectSummary.totalBudget) : undefined,
      overallDeadline: parsed.projectSummary?.overallDeadline || '',
      evaluationCriteria: convertToString(parsed.projectSummary?.evaluationCriteria || ''),
      confidentialityRequired: parsed.projectSummary?.confidentialityRequired === true
    };

    console.log('[Requirement List Extract] Extracted', items.length, 'items for category:', category.name);

    // 返回提取结果
    res.json({
      success: true,
      data: {
        procurement_category: parsed.procurement_category,
        category,
        items,
        projectSummary,
      },
    });
  } catch (error) {
    console.error('[Requirement List Extract] Error:', error);
    if (axios.isAxiosError(error)) {
      console.error('[Requirement List Extract] API Error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
    }
    res.status(500).json({ message: '提取需求清单失败', error: error.message });
  }
});

/**
 * 根据品类模板生成需求清单Excel
 * POST /api/requirement-list/generate-with-template
 */
router.post('/generate-with-template', auth, async (req, res) => {
  try {
    const { items, projectSummary, categoryCode } = req.body;

    console.log('[Requirement List Template] Generating with category:', categoryCode);
    console.log('[Requirement List Template] Items count:', items?.length);

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: '需求清单不能为空' });
    }

    if (!categoryCode) {
      return res.status(400).json({ message: '请指定品类代码' });
    }

    // 获取品类模板
    const category = await ProcurementCategory.findOne({
      code: categoryCode,
      enabled: true,
    });

    if (!category) {
      return res.status(404).json({ message: '品类模板不存在' });
    }

    console.log('[Requirement List Template] Using template:', category.name);

    // 创建工作簿
    const workbook = XLSX.utils.book_new();

    // 辅助函数：处理各种格式转字符串
    const formatString = (value) => {
      if (value === null || value === undefined) return '';
      if (Array.isArray(value)) return value.join('；');
      if (typeof value === 'object') return JSON.stringify(value);
      return String(value);
    };

    // 根据品类模板生成主表数据
    const templateColumns = category.templateConfig?.columns || [];
    const mainData = items.map((item, index) => {
      const row = {};

      // 根据模板列定义映射数据
      templateColumns.forEach((col) => {
        const key = col.key;
        let value = '';

        // 根据字段键名获取对应值
        switch (key) {
          case '序号':
            value = index + 1;
            break;
          case '需求编号':
            value = formatString(item.requirementId) || `REQ-${String(index + 1).padStart(3, '0')}`;
            break;
          case '项目名称':
            value = formatString(item.projectName);
            break;
          case '业务背景':
            value = formatString(item.businessBackground);
            break;
          case '优先级':
            const p = String(item.priority || '').toLowerCase();
            if (p === 'high') value = '高';
            else if (p === 'low') value = '低';
            else value = '中';
            break;
          case '模块类别':
            value = formatString(item.moduleCategory);
            break;
          case '功能需求':
            value = formatString(item.functionalRequirements);
            break;
          case '性能要求':
            value = formatString(item.nonFunctionalRequirements?.performance || '');
            break;
          case '安全要求':
            value = formatString(item.nonFunctionalRequirements?.security || '');
            break;
          case '兼容性要求':
            value = formatString(item.nonFunctionalRequirements?.compatibility || '');
            break;
          case '技术栈':
            value = formatString(item.technicalSpecs?.techStack || '');
            break;
          case '部署方式':
            value = formatString(item.technicalSpecs?.deploymentMode || '');
            break;
          case '集成要求':
            value = formatString(item.technicalSpecs?.integrationRequirements || '');
            break;
          case '代码标准':
            value = formatString(item.technicalSpecs?.codeStandards || '');
            break;
          case '交付物':
            value = Array.isArray(item.deliverables) ? item.deliverables.join('；') : formatString(item.deliverables);
            break;
          case '预估工作量':
            if (item.estimatedWorkload) {
              value = item.workloadUnit ? `${item.estimatedWorkload} ${item.workloadUnit}`.trim() : formatString(item.estimatedWorkload);
            }
            break;
          case '预算金额（元）':
            value = formatString(item.budgetAmount);
            break;
          case '供应商经验要求':
            value = formatString(item.vendorQualifications?.minExperience || '');
            break;
          case '认证要求':
            value = Array.isArray(item.vendorQualifications?.requiredCertifications)
              ? item.vendorQualifications.requiredCertifications.join('、')
              : formatString(item.vendorQualifications?.requiredCertifications || '');
            break;
          case '团队规模':
            value = formatString(item.vendorQualifications?.teamSize || '');
            break;
          case '交付日期':
            value = formatString(item.deliveryDate || '');
            break;
          case '付款条件':
            value = formatString(item.paymentTerms || '');
            break;
          case '质保期':
            value = formatString(item.warrantyPeriod || '');
            break;
          case '知识产权':
            value = formatString(item.intellectualProperty || '');
            break;
          case '备注':
            value = formatString(item.additionalNotes || '');
            break;
          // 硬件采购相关字段
          case '物品名称':
            value = formatString(item.projectName);
            break;
          case '规格型号':
            value = formatString(item.technicalSpecs?.techStack || '');
            break;
          case '数量':
            value = item.estimatedWorkload || 1;
            break;
          case '单位':
            value = item.workloadUnit || '个';
            break;
          case '技术参数':
            value = formatString(item.functionalRequirements);
            break;
          case '品牌要求':
            value = formatString(item.technicalSpecs?.codeStandards || '');
            break;
          case '预算单价':
            value = formatString(item.budgetAmount);
            break;
          case '预算总价':
            value = item.budgetAmount && item.estimatedWorkload ? item.budgetAmount * item.estimatedWorkload : formatString(item.budgetAmount);
            break;
          case '交货期限':
            value = formatString(item.deliveryDate || '');
            break;
          case '售后要求':
            value = formatString(item.vendorQualifications?.minExperience || '');
            break;
          case '验收标准':
            value = formatString(item.nonFunctionalRequirements?.performance || '');
            break;
          // 咨询服务相关字段
          case '咨询项目名称':
            value = formatString(item.projectName);
            break;
          case '咨询类型':
            value = formatString(item.moduleCategory);
            break;
          case '服务内容':
            value = formatString(item.functionalRequirements);
            break;
          case '服务方式':
            value = formatString(item.technicalSpecs?.deploymentMode || '');
            break;
          case '服务周期':
            value = formatString(item.estimatedWorkload) + ' ' + formatString(item.workloadUnit || '');
            break;
          case '专家资质要求':
            value = formatString(item.vendorQualifications?.minExperience || '');
            break;
          case '交付成果':
            value = Array.isArray(item.deliverables) ? item.deliverables.join('；') : formatString(item.deliverables);
            break;
          case '开始日期':
            value = formatString(item.projectSummary?.overallDeadline || '');
            break;
          case '结束日期':
            value = formatString(item.deliveryDate || '');
            break;
          case '付款方式':
            value = formatString(item.paymentTerms || '');
            break;
          default:
            // 尝试从item中获取
            if (item[key] !== undefined) {
              value = formatString(item[key]);
            }
        }

        row[col.label] = value;
      });

      return row;
    });

    // 创建主表工作表
    const mainWorksheet = XLSX.utils.json_to_sheet(mainData);

    // 设置列宽（根据模板配置）
    mainWorksheet['!cols'] = templateColumns.map(col => ({ wch: col.width || 15 }));

    // 获取主表工作表名称
    const mainSheetName = category.templateConfig?.sheets?.find(s => s.type === 'main')?.name || '需求清单';
    XLSX.utils.book_append_sheet(workbook, mainWorksheet, mainSheetName);

    // 创建项目概要表
    if (projectSummary && category.templateConfig?.sheets?.find(s => s.type === 'summary')?.enabled) {
      const summaryData = [
        { '项目': '采购品类', '内容': category.name },
        { '项目': '需求数量', '内容': `${items.length} 项` },
      ];

      if (projectSummary.totalBudget) {
        summaryData.push({ '项目': '总预算（元）', '内容': formatString(projectSummary.totalBudget) });
      }
      if (projectSummary.overallDeadline) {
        summaryData.push({ '项目': '整体截止日期', '内容': formatString(projectSummary.overallDeadline) });
      }
      if (projectSummary.evaluationCriteria) {
        summaryData.push({ '项目': '评估标准', '内容': formatString(projectSummary.evaluationCriteria) });
      }
      summaryData.push({ '项目': '是否需要保密', '内容': projectSummary.confidentialityRequired ? '是' : '否' });
      summaryData.push({ '项目': '生成时间', '内容': new Date().toLocaleString('zh-CN') });

      const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData);
      summaryWorksheet['!cols'] = [{ wch: 20 }, { wch: 50 }];
      const summarySheetName = category.templateConfig?.sheets?.find(s => s.type === 'summary')?.name || '项目概要';
      XLSX.utils.book_append_sheet(workbook, summaryWorksheet, summarySheetName);
    }

    // 创建填写说明表
    if (category.templateConfig?.sheets?.find(s => s.type === 'instruction')?.enabled) {
      const instructionData = templateColumns.map(col => ({
        '填写项目': col.label,
        '填写说明': col.instruction || '',
        '是否必填': col.required ? '是' : '否',
        ...(col.example && { '示例': col.example }),
      }));

      const instructionWorksheet = XLSX.utils.json_to_sheet(instructionData);
      instructionWorksheet['!cols'] = [{ wch: 15 }, { wch: 40 }, { wch: 10 }, { wch: 30 }].slice(0, templateColumns[0]?.example ? 4 : 3);
      const instructionSheetName = category.templateConfig?.sheets?.find(s => s.type === 'instruction')?.name || '填写说明';
      XLSX.utils.book_append_sheet(workbook, instructionWorksheet, instructionSheetName);
    }

    // 生成Excel文件
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    console.log('[Requirement List Template] Excel generated successfully, size:', buffer.length);

    // 设置响应头
    const fileName = `${category.name}-需求清单-${Date.now()}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(fileName)}`);

    res.send(buffer);
  } catch (error) {
    console.error('[Requirement List Template] Generate error:', error);
    res.status(500).json({ message: '生成需求清单失败', error: error.message });
  }
});

/**
 * 基于关键词的品类匹配算法（作为大模型的补充）
 * @param {string} text - 待匹配的文本
 * @param {Array} categories - 品类列表
 * @returns {Object} 匹配结果
 */
function matchCategoryByKeywords(text, categories) {
  const scores = categories.map(category => {
    let score = 0;
    const lowerText = text.toLowerCase();

    // 品类名称匹配（权重：10）
    if (lowerText.includes(category.name.toLowerCase())) {
      score += 10;
    }

    // 关键词匹配（每个关键词权重：3）
    const matchedKeywords = [];
    category.keywords.forEach(keyword => {
      if (lowerText.includes(keyword.toLowerCase())) {
        score += 3;
        matchedKeywords.push(keyword);
      }
    });

    // 品类描述词匹配（权重：1）
    if (category.description) {
      const descWords = category.description.split(/\s+/);
      descWords.forEach(word => {
        if (word.length > 2 && lowerText.includes(word.toLowerCase())) {
          score += 1;
        }
      });
    }

    return {
      category,
      score,
      matchDetails: {
        nameMatch: lowerText.includes(category.name.toLowerCase()),
        matchedKeywords,
        keywordCount: matchedKeywords.length
      }
    };
  });

  // 按分数降序排序
  scores.sort((a, b) => b.score - a.score);

  // 返回最佳匹配
  const best = scores[0];

  // 根据分数确定置信度
  let confidence = 'low';
  if (best.score >= 10) {
    confidence = 'high';
  } else if (best.score >= 5) {
    confidence = 'medium';
  }

  return {
    category: best.category,
    confidence,
    score: best.score,
    matchDetails: best.matchDetails
  };
}

export default router;
