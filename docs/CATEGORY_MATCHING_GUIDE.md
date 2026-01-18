# 采购品类智能匹配方案

## 1. 当前实现机制

### 1.1 双重匹配策略

```
用户对话 → 大模型分析 → 返回品类代码
                    ↓
            后端验证品类是否存在
                    ↓
        [存在] 使用该品类模板
        [不存在] 使用默认品类（通用采购）
```

### 1.2 核心代码位置
- **需求提取API**: `backend/src/routes/requirementList.js:445-640`
- **品类模型**: `backend/src/models/ProcurementCategory.js`
- **品类路由**: `backend/src/routes/procurementCategories.js`

## 2. 部署到云服务器的配置

### 2.1 环境变量配置 (.env)

```bash
# 硅基流动API配置（用于AI品类识别）
SILICONFLOW_API_BASE=https://api.siliconflow.cn/v1
SILICONFLOW_API_KEY=your_api_key_here
SILICONFLOW_MODEL=Qwen/Qwen3-VL-235B-A22B-Instruct

# 备用API配置（可选）
OPENAI_API_BASE=https://api.openai.com/v1
OPENAI_API_KEY=your_openai_key_here
OPENAI_MODEL=gpt-4

# 品类匹配配置
DEFAULT_CATEGORY_CODE=general_procurement
CATEGORY_MATCH_CONFIDENCE_THRESHOLD=0.7
ENABLE_CATEGORY_MATCH_LOGGING=true
```

### 2.2 关键代码优化

#### 问题1: API Key硬编码
**当前代码** (requirementList.js:478):
```javascript
const API_KEY = process.env.SILICONFLOW_API_KEY || 'sk-ffioccjhezmyrktocarqngvazbeakqyygbwmhlppqirliknv';
```

**优化建议**:
```javascript
const API_KEY = process.env.SILICONFLOW_API_KEY;
if (!API_KEY) {
  console.error('[Requirement List Extract] SILICONFLOW_API_KEY not configured');
  return res.status(500).json({ message: 'AI服务未配置' });
}
```

#### 问题2: 增加品类匹配日志
**建议添加** (在requirementList.js:610后):
```javascript
// 记录品类匹配结果用于分析
console.log('[Category Match] Result:', {
  identified: parsed.procurement_category,
  matched: !!matchedCategory,
  fallback: !matchedCategory,
  timestamp: new Date().toISOString()
});
```

## 3. 品类匹配优化策略

### 3.1 三层匹配机制

```
第一层：大模型语义分析
   ↓ (如果置信度低或失败)
第二层：关键词权重匹配
   ↓ (如果匹配分数低)
第三层：默认品类回退
```

### 3.2 关键词匹配算法示例

```javascript
/**
 * 基于关键词的品类匹配算法（作为大模型的补充）
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
    category.keywords.forEach(keyword => {
      if (lowerText.includes(keyword.toLowerCase())) {
        score += 3;
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
        matchedKeywords: category.keywords.filter(kw =>
          lowerText.includes(kw.toLowerCase())
        )
      }
    };
  });

  // 按分数降序排序
  scores.sort((a, b) => b.score - a.score);

  // 返回最佳匹配
  const best = scores[0];
  return {
    category: best.category,
    confidence: best.score > 0 ? 'medium' : 'low',
    score: best.score,
    details: best.matchDetails
  };
}
```

## 4. 品类模板管理建议

### 4.1 品类设计原则

1. **互斥性**: 不同品类之间应该有明显区分
2. **完整性**: 覆盖所有常见的采购场景
3. **可扩展**: 易于添加新品类
4. **关键词准确**: 每个品类设置3-10个精准关键词

### 4.2 品类配置示例

```javascript
{
  name: "软件开发",
  code: "software_development",
  description: "包括各类应用系统、平台、APP、小程序等软件开发项目",
  keywords: [
    "软件", "开发", "系统", "平台", "APP", "网站", "小程序",
    "ERP", "CRM", "OA", "代码", "编程", "前端", "后端",
    "全栈", "移动应用", "Web应用"
  ],
  identificationPrompt: "识别软件开发类项目，关注技术栈、部署方式、集成需求等特征",
  priority: 1  // 优先级数字越小越优先
}
```

### 4.3 品类测试用例

创建测试脚本验证品类匹配准确度：

```javascript
const testCases = [
  {
    text: "我们需要开发一个企业ERP系统",
    expectedCategory: "software_development",
    reason: "包含'开发'、'系统'、'ERP'关键词"
  },
  {
    text: "采购10台服务器用于搭建集群",
    expectedCategory: "hardware_procurement",
    reason: "包含'服务器'、'采购'关键词"
  },
  {
    text: "需要管理咨询服务来优化流程",
    expectedCategory: "consulting_service",
    reason: "包含'咨询'、'服务'关键词"
  }
];
```

## 5. 监控和优化

### 5.1 日志记录

记录每次品类匹配的结果：
```javascript
{
  timestamp: "2026-01-18T15:30:00Z",
  conversationId: "conv_123",
  userInput: "我们需要开发一个ERP系统",
  aiIdentified: { code: "software_development", confidence: "high" },
  finalCategory: "software_development",
  matchMethod: "ai", // ai | keyword | fallback
  processingTime: 1250 // ms
}
```

### 5.2 准确度监控

- 统计AI识别的准确率
- 跟踪fallback触发频率
- 分析常见错误案例

### 5.3 持续优化

1. **定期Review**: 每月Review品类匹配日志
2. **关键词调优**: 根据错误案例调整关键词
3. **Prompt优化**: 根据实际情况优化AI提示词
4. **A/B测试**: 测试不同的匹配策略

## 6. 部署检查清单

### 6.1 配置检查

- [ ] 环境变量已正确配置
- [ ] API Key已设置并验证有效
- [ ] 数据库已初始化品类模板
- [ ] 默认品类已设置

### 6.2 功能测试

- [ ] 测试每个品类的识别准确度
- [ ] 测试边界情况（模糊需求）
- [ ] 测试fallback机制
- [ ] 测试性能（响应时间）

### 6.3 监控设置

- [ ] 配置品类匹配日志
- [ ] 设置错误告警
- [ ] 配置性能监控

## 7. 常见问题和解决方案

### Q1: 大模型识别失败率高
**A**:
- 检查API调用是否正常
- 增加关键词匹配作为补充
- 优化系统提示词

### Q2: 新品类无法识别
**A**:
- 确保新品类的keywords设置准确
- 降低priority值使其优先匹配
- 考虑使用更具体的描述

### Q3: 模糊需求分类错误
**A**:
- 增加更多示例数据
- 使用confidence阈值，低置信度时人工确认
- 考虑混合品类（一个需求对应多个品类）

## 8. 总结

当前系统的品类匹配机制已经相当完善，部署到云服务器时主要需要注意：

1. **配置管理**: 使用环境变量管理敏感信息
2. **监控日志**: 记录匹配结果以便优化
3. **容错机制**: 已有的三层保障确保系统稳定
4. **持续优化**: 根据实际使用情况调整品类和关键词

系统已经可以很好地部署到云服务器上，只需完成环境变量配置和功能测试即可。
