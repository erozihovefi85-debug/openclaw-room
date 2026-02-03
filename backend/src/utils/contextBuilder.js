/**
 * 上下文构建工具
 * 将用户偏好转换为 Dify 可用的上下文信息
 */

/**
 * 构建系统提示词上下文
 * @param {Object} preference - 用户偏好对象
 * @param {string} contextId - 当前场景ID
 * @returns {string} 格式化的上下文字符串
 */
export function buildSystemContext(preference, contextId = '') {
  if (!preference) {
    return '';
  }

  const { procurementPreferences, chatPreferences } = preference;
  let context = '';

  // 采购偏好上下文
  if (procurementPreferences) {
    const hasProcurementPrefs =
      procurementPreferences.defaultCategory ||
      procurementPreferences.qualityPriority?.type ||
      procurementPreferences.paymentTerms ||
      procurementPreferences.deliveryLocation;

    if (hasProcurementPrefs) {
      context += '\n【用户采购偏好】\n';

      if (procurementPreferences.defaultCategory) {
        const categoryNames = {
          'software_development': '软件开发',
          'hardware_procurement': '硬件采购',
          'consulting_service': '咨询服务',
          'system_integration': '系统集成',
          'general_procurement': '通用采购'
        };
        context += `- 默认品类：${categoryNames[procurementPreferences.defaultCategory] || procurementPreferences.defaultCategory}\n`;
      }

      if (procurementPreferences.qualityPriority) {
        const { type, weight } = procurementPreferences.qualityPriority;
        const priorityText = {
          'quality': '质量优先（推荐优质产品/服务）',
          'price': '价格优先（推荐高性价比方案）',
          'balanced': '均衡推荐（综合考虑质量与价格）'
        };
        context += `- 采购策略：${priorityText[type]}\n`;
      }

      if (procurementPreferences.paymentTerms) {
        context += `- 偏好付款方式：${procurementPreferences.paymentTerms}\n`;
      }

      if (procurementPreferences.deliveryLocation) {
        context += `- 收货地点：${procurementPreferences.deliveryLocation}\n`;
      }
    }
  }

  // 对话风格偏好
  if (chatPreferences) {
    context += '\n【对话风格偏好】\n';

    const styleNames = {
      'concise': '简洁直接',
      'detailed': '详细分析',
      'professional': '专业严谨'
    };
    context += `- 回复风格：${styleNames[chatPreferences.replyStyle?.type] || '专业严谨'}\n`;

    context += `- 语言：${chatPreferences.language || '简体中文'}\n`;

    const voiceNames = {
      'xiaomei': '小美（贴心购物助手）',
      'xiaoshuai': '小帅（专业寻源专家）'
    };
    context += `- AI人设：${voiceNames[chatPreferences.voice] || '小帅'}\n`;
  }

  return context;
}

/**
 * 增强用户查询，自动补充偏好信息
 * @param {string} query - 用户原始查询
 * @param {Object} preference - 用户偏好对象
 * @returns {string} 增强后的查询
 */
export function enhanceQueryWithPreferences(query, preference) {
  if (!preference || !query) {
    return query;
  }

  const { procurementPreferences } = preference;
  let enhanced = query;

  // 智能补充用户未明确提到的信息

  // 补充收货地址
  if (procurementPreferences?.deliveryLocation) {
    const hasLocationKeyword =
      query.includes('收货') ||
      query.includes('地址') ||
      query.includes('配送') ||
      query.includes('送到');

    if (!hasLocationKeyword) {
      enhanced += `\n（补充信息：收货地址 - ${procurementPreferences.deliveryLocation}）`;
    }
  }

  // 补充预算参考
  if (procurementPreferences?.preferredPriceRange) {
    const { min, max } = procurementPreferences.preferredPriceRange;
    const hasPriceKeyword =
      query.includes('预算') ||
      query.includes('价格') ||
      query.includes('多少钱') ||
      query.includes('费用');

    if (!hasPriceKeyword && min > 0 && max < Number.MAX_SAFE_INTEGER) {
      enhanced += `\n（预算参考：${min.toLocaleString()} - ${max.toLocaleString()} 元）`;
    }
  }

  // 补充付款方式
  if (procurementPreferences?.paymentTerms) {
    const hasPaymentKeyword =
      query.includes('付款') ||
      query.includes('结算') ||
      query.includes('支付');

    if (!hasPaymentKeyword) {
      enhanced += `\n（偏好付款方式：${procurementPreferences.paymentTerms}）`;
    }
  }

  return enhanced;
}

/**
 * 构建Dify inputs参数
 * @param {Object} preference - 用户偏好对象
 * @param {string} contextId - 当前场景ID
 * @returns {Object} Dify inputs对象
 */
export function buildDifyInputs(preference, contextId = '') {
  const inputs = {};

  if (!preference) {
    return inputs;
  }

  const { procurementPreferences, chatPreferences } = preference;

  // 采购偏好inputs
  if (procurementPreferences) {
    if (procurementPreferences.defaultCategory) {
      inputs.user_default_category = procurementPreferences.defaultCategory;
    }
    if (procurementPreferences.qualityPriority?.type) {
      inputs.user_quality_priority = procurementPreferences.qualityPriority.type;
    }
    if (procurementPreferences.paymentTerms) {
      inputs.user_payment_terms = procurementPreferences.paymentTerms;
    }
  }

  // 对话偏好inputs
  if (chatPreferences) {
    if (chatPreferences.replyStyle?.type) {
      inputs.user_reply_style = chatPreferences.replyStyle.type;
    }
    if (chatPreferences.voice) {
      inputs.user_voice = chatPreferences.voice;
    }
  }

  return inputs;
}

/**
 * 从消息历史中提取品类信息
 * @param {Array} messages - 消息历史
 * @returns {string|null} 品类代码
 */
export function extractCategoryFromMessages(messages) {
  if (!messages || messages.length === 0) {
    return null;
  }

  // 查找最近的品类提及
  const categoryKeywords = {
    'software_development': ['软件', '开发', '系统', '平台', 'app', '应用'],
    'hardware_procurement': ['硬件', '设备', '服务器', '电脑', '采购', '机器'],
    'consulting_service': ['咨询', '顾问', '培训', '服务'],
    'system_integration': ['集成', '对接', '接口', '系统对接'],
    'general_procurement': ['采购', '买', '订购']
  };

  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    const content = message.content?.toLowerCase() || '';

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(kw => content.includes(kw))) {
        return category;
      }
    }
  }

  return null;
}
