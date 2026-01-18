import { RequirementListData } from '../types/workflow';

/**
 * 解析AI回复中的需求清单数据
 * 匹配格式：
 * - 报告！以下是为您生成的采购需求清单
 * - 采购需求清单
 * - 需求清单
 * - 📋 生成结构化需求清单
 * - 生成结构化需求清单
 */
export function parseRequirementListFromAI(content: string): RequirementListData | null {
  if (!content) return null;

  // 检查是否包含需求清单相关的关键词
  const keywords = [
    '报告！以下是为您生成的采购需求清单',
    '采购需求清单',
    '已为您生成需求清单',
    '以下是为您整理的需求清单',
    '📋 生成结构化需求清单',
    '生成结构化需求清单'
  ];

  const hasRequirementList = keywords.some(keyword => content.includes(keyword));
  console.log('[parseRequirementListFromAI] Content preview:', content.substring(0, 100));
  console.log('[parseRequirementListFromAI] Has keyword:', hasRequirementList);

  if (!hasRequirementList) {
    return null;
  }

  try {
    // 尝试解析Markdown表格格式
    const items = parseRequirementTable(content);
    console.log('[parseRequirementListFromAI] Table parse result:', items.length, 'items');
    if (items.length > 0) {
      const summary = extractSummary(content);
      return { items, summary };
    }

    // 尝试解析列表格式
    const listItems = parseRequirementList(content);
    console.log('[parseRequirementListFromAI] List parse result:', listItems.length, 'items');
    if (listItems.length > 0) {
      const summary = extractSummary(content);
      return { items: listItems, summary };
    }

    console.log('[parseRequirementListFromAI] No items parsed, returning null');
    return null;
  } catch (error) {
    console.error('Error parsing requirement list:', error);
    return null;
  }
}

/**
 * 解析表格格式的需求清单
 */
function parseRequirementTable(content: string): Array<{
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
}> {
  const items: Array<{
    id: string;
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    category: string;
  }> = [];

  // 匹配Markdown表格
  const tableRegex = /\|[\s\S]*?\|/g;
  const tables = content.match(tableRegex);

  if (!tables) return items;

  let isInRequirementTable = false;
  let headers: string[] = [];
  let rowCount = 0;

  for (const table of tables) {
    const rows = table.split('\n').filter(row => row.trim().startsWith('|'));

    for (const row of rows) {
      const cells = row.split('|').filter(cell => cell.trim()).map(cell => cell.trim());

      // 跳过分隔行
      if (cells.some(cell => /^[-:]+$/.test(cell))) {
        continue;
      }

      // 检查表头
      if (cells.some(cell => cell.includes('需求') || cell.includes('名称') || cell.includes('描述'))) {
        headers = cells;
        isInRequirementTable = true;
        continue;
      }

      if (isInRequirementTable && rowCount < 50) { // 限制最多50项
        const item = parseTableRow(headers, cells);
        if (item) {
          items.push(item);
        }
        rowCount++;
      }
    }

    if (items.length > 0) break;
  }

  return items;
}

/**
 * 解析表格行
 */
function parseTableRow(headers: string[], cells: string[]): {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
} | null {
  const rowData: Record<string, string> = {};

  headers.forEach((header, index) => {
    if (cells[index]) {
      rowData[header] = cells[index];
    }
  });

  const title = rowData['需求名称'] || rowData['名称'] || rowData['需求'] || '';
  const description = rowData['需求描述'] || rowData['描述'] || rowData['详情'] || '';
  const category = rowData['类别'] || rowData['分类'] || rowData['需求类别'] || '其他';
  const priorityStr = rowData['优先级'] || rowData['重要程度'] || '中';

  if (!title && !description) return null;

  let priority: 'high' | 'medium' | 'low' = 'medium';
  if (priorityStr.includes('高') || priorityStr.toLowerCase() === 'high') {
    priority = 'high';
  } else if (priorityStr.includes('低') || priorityStr.toLowerCase() === 'low') {
    priority = 'low';
  }

  return {
    id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title,
    description,
    priority,
    category
  };
}

/**
 * 解析列表格式的需求清单
 */
function parseRequirementList(content: string): Array<{
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
}> {
  const items: Array<{
    id: string;
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    category: string;
  }> = [];

  // 匹配列表项
  const lines = content.split('\n');
  let currentItem: Partial<{
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    category: string;
  }> = {};

  for (const line of lines) {
    // 匹配数字列表项
    const numberedMatch = line.match(/^\d+\.?\s+(.+)/);
    // 匹配无序列表项
    const bulletMatch = line.match(/^[-•*]\s+(.+)/);

    if (numberedMatch || bulletMatch) {
      const itemText = (numberedMatch || bulletMatch)![1];

      // 保存上一个项目
      if (currentItem.title) {
        items.push({
          id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title: currentItem.title,
          description: currentItem.description || '',
          priority: currentItem.priority || 'medium',
          category: currentItem.category || '其他'
        });
      }

      // 解析新项目
      currentItem = parseListItem(itemText);
    } else if (line.trim() && currentItem.title) {
      // 可能是描述内容
      if (line.includes('描述') || line.includes('要求')) {
        currentItem.description = (currentItem.description || '') + '\n' + line;
      }
    }
  }

  // 添加最后一个项目
  if (currentItem.title) {
    items.push({
      id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: currentItem.title,
      description: currentItem.description || '',
      priority: currentItem.priority || 'medium',
      category: currentItem.category || '其他'
    });
  }

  return items;
}

/**
 * 解析单个列表项
 */
function parseListItem(text: string): Partial<{
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
}> {
  const result: Partial<{
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    category: string;
  }> = {};

  // 提取优先级
  if (text.includes('高优先级') || text.includes('【高】')) {
    result.priority = 'high';
  } else if (text.includes('低优先级') || text.includes('【低】')) {
    result.priority = 'low';
  } else {
    result.priority = 'medium';
  }

  // 提取类别
  const categoryMatch = text.match(/【([^】]+)】/);
  if (categoryMatch) {
    result.category = categoryMatch[1];
    result.title = text.replace(/【[^】]+】/, '').trim();
  } else {
    result.category = '其他';
    result.title = text;
  }

  // 清理标题
  result.title = result.title
    .replace(/【高】【中】【低】/g, '')
    .replace(/高优先级|中优先级|低优先级/g, '')
    .trim();

  return result;
}

/**
 * 提取需求概要
 */
function extractSummary(content: string): string {
  // 尝试提取概要段落
  const summaryPatterns = [
    /(?:需求概要|总体概述|概述)[：:]\s*([^\n]+)/,
    /(?:本次需求|综合需求)[：:]\s*([^\n]+)/,
  ];

  for (const pattern of summaryPatterns) {
    const match = content.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  // 如果没有找到概要，返回空字符串
  return '';
}

/**
 * 检查内容是否包含需求清单
 */
export function containsRequirementList(content: string): boolean {
  if (!content) return false;

  const keywords = [
    '报告！以下是为您生成的采购需求清单',
    '采购需求清单',
    '已为您生成需求清单',
    '以下是为您整理的需求清单',
    '需求清单如下'
  ];

  return keywords.some(keyword => content.includes(keyword));
}
