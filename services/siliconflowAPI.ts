import axios from 'axios';

const SILICONFLOW_API_BASE = 'https://api.siliconflow.cn/v1';
const API_KEY = 'sk-ffioccjhezmyrktocarqngvazbeakqyygbwmhlppqirliknv';
const MODEL_NAME = 'Qwen/Qwen3-VL-235B-A22B-Instruct';

/**
 * 从对话历史中提取需求清单
 * 使用硅基流动的大模型分析完整对话内容
 */
export async function extractRequirementListFromConversation(
  messages: Array<{ role: string; content: string }>
): Promise<{
  items: Array<{
    requirementId: string;
    projectName: string;
    businessBackground: string;
    priority: 'high' | 'medium' | 'low';
    moduleCategory: string;
    functionalRequirements: string;
    nonFunctionalRequirements: {
      performance: string;
      security: string;
      compatibility: string;
    };
    technicalSpecs: {
      techStack: string;
      deploymentMode: string;
      integrationRequirements: string;
      codeStandards: string;
    };
    deliverables: string[];
    estimatedWorkload?: number;
    workloadUnit?: string;
    budgetAmount?: number;
    vendorQualifications?: {
      minExperience?: string;
      requiredCertifications?: string[];
      teamSize?: number;
    };
    deliveryDate?: string;
    paymentTerms?: string;
    warrantyPeriod?: string;
    intellectualProperty?: string;
    additionalNotes?: string;
  }>;
  projectSummary: {
    totalBudget?: number;
    overallDeadline?: string;
    evaluationCriteria?: string;
    confidentialityRequired?: boolean;
  };
} | null> {
  try {
    // 构建对话上下文
    const conversationContext = messages
      .map(msg => `${msg.role === 'user' ? '用户' : 'AI助手'}: ${msg.content}`)
      .join('\n\n');

    const systemPrompt = `你是一个专业的采购需求分析专家。请分析以下对话内容，提取出所有采购需求信息（包括软件开发、系统集成、技术服务等）。

**重要：所有字段必须是字符串格式，不要使用数组！**

请严格按照以下JSON格式返回需求清单：
{
  "items": [
    {
      "requirementId": "需求编号（自动生成）",
      "projectName": "项目名称",
      "businessBackground": "业务背景说明",
      "priority": "high/medium/low",
      "moduleCategory": "模块类别（如：软件开发、系统集成、技术服务、咨询服务等）",
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
1. 优先级：high（高优先级/紧急）、medium（中等）、low（低优先级）
2. 模块类别包括：软件开发、系统集成、技术服务、咨询服务、硬件采购等
3. 如果某些信息在对话中没有提到，可以不填或填null
4. **所有文本字段必须是字符串，多条内容用分号；分隔，只有deliverables和requiredCertifications是数组**
5. 只返回JSON，不要有任何其他文字说明

示例：
- functionalRequirements: "需求1；需求2；需求3"（字符串，用分号分隔）
- techStack: "Java；Spring Boot；MySQL；Redis"（字符串，用分号分隔）
- evaluationCriteria: "标准1；标准2；标准3"（字符串，用分号分隔）`;

    const userPrompt = `请分析以下对话，提取采购需求清单（包括软件、服务、项目等）：
**注意：所有文本字段用分号；分隔多条内容，不要使用数组格式！**

${conversationContext}`;

    console.log('[SiliconFlow API] Sending request to extract requirements...');
    console.log('[SiliconFlow API] Conversation length:', messages.length, 'messages');

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

    console.log('[SiliconFlow API] Response received:', response.status);
    console.log('[SiliconFlow API] Full response:', JSON.stringify(response.data, null, 2));

    const content = response.data.choices[0]?.message?.content;
    if (!content) {
      console.error('[SiliconFlow API] No content in response');
      console.error('[SiliconFlow API] Response structure:', JSON.stringify(response.data, null, 2));
      return null;
    }

    console.log('[SiliconFlow API] Raw content length:', content.length);
    console.log('[SiliconFlow API] Content preview (first 1000 chars):', content.substring(0, 1000));

    // 解析JSON响应
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (parseError) {
      console.error('[SiliconFlow API] JSON parse error:', parseError);
      console.error('[SiliconFlow API] Content that failed to parse:', content);
      return null;
    }

    console.log('[SiliconFlow API] Parsed JSON keys:', Object.keys(parsed));
    console.log('[SiliconFlow API] Parsed JSON:', JSON.stringify(parsed, null, 2));

    // 验证数据结构 - 更宽松的验证
    if (!parsed.items || !Array.isArray(parsed.items)) {
      console.error('[SiliconFlow API] Invalid response structure: missing items array');
      console.error('[SiliconFlow API] Available keys:', Object.keys(parsed));
      // 尝试创建一个默认结构
      if (parsed.items && typeof parsed.items === 'object') {
        console.log('[SiliconFlow API] items is object, attempting to convert to array');
        parsed.items = [parsed.items];
      } else {
        return null;
      }
    }

    console.log('[SiliconFlow API] Items count:', parsed.items.length);

    // 辅助函数：将数组或对象转换为字符串
    const convertToString = (value: any): string => {
      if (Array.isArray(value)) return value.join('；');
      if (typeof value === 'object' && value !== null) return JSON.stringify(value);
      return String(value || '');
    };

    // 为每个项目添加ID，并确保所有字段都存在
    const items = parsed.items.map((item: any, index: number) => {
      return {
        requirementId: `REQ-${Date.now()}-${String(index + 1).padStart(3, '0')}`,
        projectName: item.projectName || '未命名项目',
        businessBackground: item.businessBackground || '',
        priority: (item.priority === 'high' || item.priority === 'medium' || item.priority === 'low')
          ? item.priority
          : 'medium' as const,
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

    console.log('[SiliconFlow API] Final data structure:', JSON.stringify({ items, projectSummary }, null, 2));
    console.log('[SiliconFlow API] Successfully extracted', items.length, 'requirement items');

    return {
      items,
      projectSummary
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('[SiliconFlow API] Request failed:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
    } else {
      console.error('[SiliconFlow API] Error:', error);
    }
    return null;
  }
}

/**
 * 生成需求清单Excel（通过后端）
 */
export async function generateRequirementListExcel(
  requirementListData: {
    items: Array<{
      requirementId: string;
      projectName: string;
      businessBackground: string;
      priority: 'high' | 'medium' | 'low';
      moduleCategory: string;
      functionalRequirements: string;
      nonFunctionalRequirements: {
        performance: string;
        security: string;
        compatibility: string;
      };
      technicalSpecs: {
        techStack: string;
        deploymentMode: string;
        integrationRequirements: string;
        codeStandards: string;
      };
      deliverables: string[];
      estimatedWorkload?: number;
      workloadUnit?: string;
      budgetAmount?: number;
      vendorQualifications?: {
        minExperience?: string;
        requiredCertifications?: string[];
        teamSize?: number;
      };
      deliveryDate?: string;
      paymentTerms?: string;
      warrantyPeriod?: string;
      intellectualProperty?: string;
      additionalNotes?: string;
    }>;
    projectSummary: {
      totalBudget?: number;
      overallDeadline?: string;
      evaluationCriteria?: string;
      confidentialityRequired?: boolean;
    };
  },
  userId: string
): Promise<Blob> {
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
  const token = localStorage.getItem('procureai_token');

  console.log('[generateRequirementListExcel] Sending data to backend:', JSON.stringify(requirementListData, null, 2));

  const response = await axios.post(
    `${API_BASE_URL}/requirement-list/generate`,
    requirementListData,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      responseType: 'blob',
    }
  );

  console.log('[generateRequirementListExcel] Response status:', response.status);
  console.log('[generateRequirementListExcel] Blob size:', response.data.size);

  return response.data;
}

/**
 * 从对话中提取需求清单并识别采购品类（通过后端AI）
 */
export async function extractRequirementListWithCategory(
  messages: Array<{ role: string; content: string }>
): Promise<{
  procurement_category: {
    code: string;
    name: string;
    confidence: string;
  };
  category: any;
  items: Array<{
    requirementId: string;
    projectName: string;
    businessBackground: string;
    priority: 'high' | 'medium' | 'low';
    moduleCategory: string;
    functionalRequirements: string;
    nonFunctionalRequirements: {
      performance: string;
      security: string;
      compatibility: string;
    };
    technicalSpecs: {
      techStack: string;
      deploymentMode: string;
      integrationRequirements: string;
      codeStandards: string;
    };
    deliverables: string[];
    estimatedWorkload?: number;
    workloadUnit?: string;
    budgetAmount?: number;
    vendorQualifications?: {
      minExperience?: string;
      requiredCertifications?: string[];
      teamSize?: number;
    };
    deliveryDate?: string;
    paymentTerms?: string;
    warrantyPeriod?: string;
    intellectualProperty?: string;
    additionalNotes?: string;
  }>;
  projectSummary: {
    totalBudget?: number;
    overallDeadline?: string;
    evaluationCriteria?: string;
    confidentialityRequired?: boolean;
  };
} | null> {
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
  const token = localStorage.getItem('procureai_token');

  try {
    console.log('[extractRequirementListWithCategory] Sending request to backend...');

    const response = await axios.post(
      `${API_BASE_URL}/requirement-list/extract-with-category`,
      { messages },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 120000, // 2分钟超时
      }
    );

    console.log('[extractRequirementListWithCategory] Response received:', response.status);

    if (!response.data.success) {
      console.error('[extractRequirementListWithCategory] API returned error:', response.data.message);
      return null;
    }

    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('[extractRequirementListWithCategory] Request failed:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
    } else {
      console.error('[extractRequirementListWithCategory] Error:', error);
    }
    return null;
  }
}

/**
 * 根据品类模板生成需求清单Excel
 */
export async function generateRequirementListExcelWithTemplate(
  requirementListData: {
    items: Array<{
      requirementId: string;
      projectName: string;
      businessBackground: string;
      priority: 'high' | 'medium' | 'low';
      moduleCategory: string;
      functionalRequirements: string;
      nonFunctionalRequirements: {
        performance: string;
        security: string;
        compatibility: string;
      };
      technicalSpecs: {
        techStack: string;
        deploymentMode: string;
        integrationRequirements: string;
        codeStandards: string;
      };
      deliverables: string[];
      estimatedWorkload?: number;
      workloadUnit?: string;
      budgetAmount?: number;
      vendorQualifications?: {
        minExperience?: string;
        requiredCertifications?: string[];
        teamSize?: number;
      };
      deliveryDate?: string;
      paymentTerms?: string;
      warrantyPeriod?: string;
      intellectualProperty?: string;
      additionalNotes?: string;
    }>;
    projectSummary: {
      totalBudget?: number;
      overallDeadline?: string;
      evaluationCriteria?: string;
      confidentialityRequired?: boolean;
    };
  },
  categoryCode: string
): Promise<Blob> {
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
  const token = localStorage.getItem('procureai_token');

  console.log('[generateRequirementListExcelWithTemplate] Generating with category:', categoryCode);

  const response = await axios.post(
    `${API_BASE_URL}/requirement-list/generate-with-template`,
    { ...requirementListData, categoryCode },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      responseType: 'blob',
    }
  );

  console.log('[generateRequirementListExcelWithTemplate] Excel generated successfully');

  return response.data;
}
