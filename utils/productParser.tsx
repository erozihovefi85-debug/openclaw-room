import { ProductWishlistItem } from '../types';
import ProductBookmarkButton from '../components/ProductBookmarkButton';
import React from 'react';

/**
 * 从AI响应中提取商品信息
 * 支持多种格式: Markdown列表、结构化文本、JSON等
 */
export function extractProductsFromAIResponse(
  content: string,
  userId: string,
  conversationId?: string
): ProductWishlistItem[] {
  const products: ProductWishlistItem[] = [];

  console.log('[extractProductsFromAIResponse] Starting extraction', { contentLength: content.length });

  // 尝试解析JSON格式
  const jsonProducts = tryParseJSONProducts(content, userId, conversationId);
  console.log('[extractProductsFromAIResponse] JSON products:', jsonProducts.length);
  if (jsonProducts.length > 0) {
    return jsonProducts;
  }

  // 尝试解析Markdown列表格式
  const markdownProducts = parseMarkdownProducts(content, userId, conversationId);
  console.log('[extractProductsFromAIResponse] Markdown products:', markdownProducts.length);
  if (markdownProducts.length > 0) {
    return markdownProducts;
  }

  // 尝试解析Markdown表格格式
  const tableProducts = parseTableProducts(content, userId, conversationId);
  console.log('[extractProductsFromAIResponse] Table products:', tableProducts.length);
  if (tableProducts.length > 0) {
    return tableProducts;
  }

  // 尝试解析自由文本格式
  const textProducts = parseFreeTextProducts(content, userId, conversationId);
  console.log('[extractProductsFromAIResponse] Text products:', textProducts.length);
  if (textProducts.length > 0) {
    return textProducts;
  }

  console.log('[extractProductsFromAIResponse] No products found');
  return products;
}

/**
 * 尝试从AI响应中解析JSON格式的商品信息
 */
function tryParseJSONProducts(
  content: string,
  userId: string,
  conversationId?: string
): ProductWishlistItem[] {
  const products: ProductWishlistItem[] = [];

  // 查找JSON代码块
  const jsonBlockRegex = /```(?:json)?\s*\n?([\s\S]*?)\n?```/g;
  let match = jsonBlockRegex.exec(content);

  while (match !== null) {
    try {
      const jsonData = JSON.parse(match[1]);

      // 处理数组格式
      if (Array.isArray(jsonData)) {
        for (const item of jsonData) {
          const product = createProductFromObject(item, userId, conversationId);
          if (product) {
            products.push(product);
          }
        }
      }
      // 处理单个对象格式
      else if (typeof jsonData === 'object') {
        const product = createProductFromObject(jsonData, userId, conversationId);
        if (product) {
          products.push(product);
        }
      }
    } catch (e) {
      // JSON解析失败,继续尝试下一个代码块
    }

    match = jsonBlockRegex.exec(content);
  }

  // 如果没有找到代码块,尝试直接解析整个内容
  if (products.length === 0) {
    try {
      const jsonData = JSON.parse(content);
      if (Array.isArray(jsonData)) {
        for (const item of jsonData) {
          const product = createProductFromObject(item, userId, conversationId);
          if (product) {
            products.push(product);
          }
        }
      }
    } catch (e) {
      // 忽略解析错误
    }
  }

  return products;
}

/**
 * 从对象创建商品
 */
function createProductFromObject(
  obj: any,
  userId: string,
  conversationId?: string
): ProductWishlistItem | null {
  // 必需字段检查
  if (!obj.name && !obj.title && !obj.商品名称) {
    return null;
  }

  // 提取价格
  let price = 0;
  if (typeof obj.price === 'number') {
    price = obj.price;
  } else if (typeof obj.price === 'string') {
    const priceMatch = obj.price.match(/(\d+\.?\d*)/);
    if (priceMatch) {
      price = parseFloat(priceMatch[1]);
    }
  } else if (obj.价格) {
    const priceMatch = String(obj.价格).match(/(\d+\.?\d*)/);
    if (priceMatch) {
      price = parseFloat(priceMatch[1]);
    }
  }

  // 提取购买链接
  const purchaseUrl = obj.url || obj.link || obj.purchaseUrl || obj.购买链接 || obj.链接 || '';

  if (price <= 0 && !purchaseUrl) {
    return null;
  }

  const product: ProductWishlistItem = {
    _id: '',
    userId,
    conversationId,
    name: obj.name || obj.title || obj.商品名称 || '',
    description: obj.description || obj.desc || obj.描述 || undefined,
    price,
    originalPrice: obj.originalPrice || obj.original_price || obj.原价 || undefined,
    currency: obj.currency || 'CNY',
    purchaseUrl,
    imageUrl: obj.image || obj.img || obj.imageUrl || obj.picture || obj.图片 || undefined,
    platform: obj.platform || obj.平台 || detectPlatform(purchaseUrl),
    category: obj.category || obj.cat || obj.分类 || undefined,
    brand: obj.brand || obj.品牌 || undefined,
    specifications: obj.specifications || obj.specs || obj.规格 || {},
    tags: obj.tags ? (Array.isArray(obj.tags) ? obj.tags : [obj.tags]) : [],
    notes: obj.notes || obj.note || obj.备注 || undefined,
    source: 'ai',
    rating: obj.rating || obj.score || obj.评分 || 3,
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  return product;
}

/**
 * 从Markdown列表格式解析商品
 */
function parseMarkdownProducts(
  content: string,
  userId: string,
  conversationId?: string
): ProductWishlistItem[] {
  const products: ProductWishlistItem[] = [];

  // 匹配Markdown列表项
  // 格式: - [商品名称](链接) - 价格 ¥xxx
  const listItemRegex = /^\s*[-*]\s+\[([^\]]+)\]\(([^)]+)\)(?:\s*-\s*([^#\n]+))?/gm;
  let match = listItemRegex.exec(content);

  while (match !== null) {
    const name = match[1].trim();
    const url = match[2].trim();
    const desc = match[3] ? match[3].trim() : '';

    // 从描述中提取价格
    let price = 0;
    const priceMatch = desc.match(/[¥￥$]\s*(\d+\.?\d*)/);
    if (priceMatch) {
      price = parseFloat(priceMatch[1]);
    }

    if (name && (price > 0 || url)) {
      const product: ProductWishlistItem = {
        _id: '',
        userId,
        conversationId,
        name,
        description: desc.replace(/[¥￥$]\s*(\d+\.?\d*)/, '').trim() || undefined,
        price,
        currency: 'CNY',
        purchaseUrl: url,
        platform: detectPlatform(url),
        source: 'ai',
        rating: 3,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      products.push(product);
    }

    match = listItemRegex.exec(content);
  }

  return products;
}

/**
 * 从Markdown表格格式解析商品
 */
function parseTableProducts(
  content: string,
  userId: string,
  conversationId?: string
): ProductWishlistItem[] {
  const products: ProductWishlistItem[] = [];

  console.log('[parseTableProducts] Attempting to parse tables');

  // 按行分割内容，找出所有包含表格的行
  const lines = content.split('\n');
  const tableBlocks: string[][] = [];
  let currentTable: string[] = [];

  for (const line of lines) {
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      currentTable.push(line);
    } else if (currentTable.length > 0) {
      // 表格结束
      if (currentTable.length >= 3) { // 至少需要表头、分隔符、一行数据
        tableBlocks.push(currentTable);
      }
      currentTable = [];
    }
  }

  // 处理最后一个表格
  if (currentTable.length >= 3) {
    tableBlocks.push(currentTable);
  }

  console.log('[parseTableProducts] Found tables:', tableBlocks.length);

  for (const tableLines of tableBlocks) {
    try {
      // 解析表头
      const headers = tableLines[0]
        .split('|')
        .map(h => h.trim())
        .filter(h => h);

      console.log('[parseTableProducts] Headers:', headers);

      // 查找列索引
      const nameCol = headers.findIndex(h =>
        h.includes('商品名称') || h.includes('商品') || h.includes('产品') || h.includes('名称') || h.includes('name')
      );
      const priceCol = headers.findIndex(h =>
        h.includes('价格') || h.includes('price')
      );
      const urlCol = headers.findIndex(h =>
        h.includes('立即下单') || h.includes('链接') || h.includes('url') || h.includes('link') || h.includes('购买')
      );
      const platformCol = headers.findIndex(h =>
        h.includes('平台') || h.includes('platform')
      );

      if (nameCol === -1) {
        console.log('[parseTableProducts] No name column found');
        continue;
      }

      // 解析数据行（跳过分隔行，从索引2开始）
      for (let i = 2; i < tableLines.length; i++) {
        const cells = tableLines[i]
          .split('|')
          .map(c => c.trim())
          .filter(c => c);

        if (cells.length <= nameCol) continue;

        const name = cells[nameCol]?.trim() || '';
        let price = 0;
        let url = '';
        let platform = undefined;

        // 提取价格
        if (priceCol !== -1 && cells[priceCol]) {
          const priceMatch = cells[priceCol].match(/(\d+\.?\d*)/);
          if (priceMatch) {
            price = parseFloat(priceMatch[1]);
          }
        }

        // 提取链接
        if (urlCol !== -1 && cells[urlCol]) {
          // 先尝试提取 Markdown 格式的链接 [文本](URL)
          const markdownUrlMatch = cells[urlCol].match(/\[([^\]]+)\]\(([^)]+)\)/);
          if (markdownUrlMatch) {
            url = markdownUrlMatch[2];
          } else {
            // 再尝试提取普通 URL
            const urlMatch = cells[urlCol].match(/https?:\/\/[^\s\]]+/);
            if (urlMatch) {
              url = urlMatch[0];
            }
          }
        }

        // 提取平台
        if (platformCol !== -1 && cells[platformCol]) {
          platform = cells[platformCol].trim();
        }

        // 验证数据有效性
        if (name && name.length > 1 && name !== '|' && (price > 0 || url)) {
          const product: ProductWishlistItem = {
            _id: '',
            userId,
            conversationId,
            name,
            description: cells.join(' | '),
            price,
            currency: 'CNY',
            purchaseUrl: url,
            platform: platform || (url ? detectPlatform(url) : undefined),
            source: 'ai',
            rating: 3,
            status: 'pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          console.log('[parseTableProducts] Parsed product:', product);
          products.push(product);
        }
      }
    } catch (e) {
      console.error('[parseTableProducts] Error parsing table:', e);
    }
  }

  console.log('[parseTableProducts] Found', products.length, 'products');
  return products;
}

/**
 * 从自由文本中解析商品
 */
function parseFreeTextProducts(
  content: string,
  userId: string,
  conversationId?: string
): ProductWishlistItem[] {
  const products: ProductWishlistItem[] = [];

  console.log('[parseFreeTextProducts] Content preview:', content.substring(0, 500));

  // 按行分割
  const lines = content.split('\n');

  for (const line of lines) {
    // 跳过空行
    if (!line.trim()) {
      continue;
    }

    console.log('[parseFreeTextProducts] Processing line:', line);

    // 新的解析逻辑：匹配 "- [商品名](链接) | 价格 | 其他" 格式
    const markdownLinkMatch = line.match(/^\s*[-*]\s*\[([^\]]+)\]\(([^)]+)\)\s*\|\s*(.+)?/);
    if (markdownLinkMatch) {
      const name = markdownLinkMatch[1].trim();
      const url = markdownLinkMatch[2].trim();
      const rest = markdownLinkMatch[3] || '';

      // 从剩余部分提取价格
      let price = 0;
      const priceMatch = rest.match(/[¥￥$]\s*(\d+\.?\d*)/);
      if (priceMatch) {
        price = parseFloat(priceMatch[1]);
      }

      if (name && name.length > 1 && (price > 0 || url)) {
        const product: ProductWishlistItem = {
          _id: '',
          userId,
          conversationId,
          name,
          description: rest.replace(/[¥￥$]\s*\d+\.?\d*/, '').trim() || undefined,
          price,
          currency: 'CNY',
          purchaseUrl: url,
          platform: detectPlatform(url),
          source: 'ai',
          rating: 3,
          status: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        console.log('[parseFreeTextProducts] Parsed markdown product:', product);
        products.push(product);
        continue; // 跳过后续匹配
      }
    }

    // 原有逻辑：检查是否包含商品名称和价格
    // 格式: 商品名 ¥xxx 或 商品名 ￥xxx 或 商品名 $xxx
    const productMatch = line.match(/([^¥￥$,\d]+?)[\s,]*(?:[¥￥$]\s*)?(\d+\.?\d*)?/);

    if (productMatch) {
      const name = productMatch[1].trim();
      const price = productMatch[2] ? parseFloat(productMatch[2]) : 0;

      // 提取链接
      const urlMatch = line.match(/https?:\/\/[^\s]+/);
      const url = urlMatch ? urlMatch[0] : '';

      // 过滤掉无效的商品名
      if (name && name.length > 1 && name !== '|' && (price > 0 || url)) {
        const product: ProductWishlistItem = {
          _id: '',
          userId,
          conversationId,
          name,
          description: line.trim(),
          price,
          currency: 'CNY',
          purchaseUrl: url,
          platform: url ? detectPlatform(url) : undefined,
          source: 'ai',
          rating: 3,
          status: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        console.log('[parseFreeTextProducts] Parsed text product:', product);
        products.push(product);
      }
    }
  }

  console.log('[parseFreeTextProducts] Found', products.length, 'products');
  return products;
}

/**
 * 检测平台
 */
function detectPlatform(url: string): string | undefined {
  if (!url) {
    return undefined;
  }

  const lowerUrl = url.toLowerCase();

  if (lowerUrl.includes('taobao.com') || lowerUrl.includes('淘宝')) {
    return '淘宝';
  } else if (lowerUrl.includes('tmall.com') || lowerUrl.includes('天猫')) {
    return '天猫';
  } else if (lowerUrl.includes('jd.com') || lowerUrl.includes('京东')) {
    return '京东';
  } else if (lowerUrl.includes('pinduoduo.com') || lowerUrl.includes('拼多多')) {
    return '拼多多';
  } else if (lowerUrl.includes('yangkeduo.com')) {
    return '拼多多';
  }

  return '其他';
}

/**
 * 生成商品卡片HTML
 * 用于在聊天界面中显示"加入心愿单"按钮
 */
export function generateProductCardHTML(product: ProductWishlistItem): string {
  const priceHTML = product.price > 0
    ? `<div class="product-price">¥${product.price.toLocaleString()}</div>`
    : '';

  const originalPriceHTML = product.originalPrice && product.originalPrice > product.price
    ? `<div class="product-original-price">¥${product.originalPrice.toLocaleString()}</div>`
    : '';

  const imageHTML = product.imageUrl
    ? `<img src="${product.imageUrl}" alt="${product.name}" class="product-image" />`
    : '';

  const platformHTML = product.platform
    ? `<div class="product-platform">${product.platform}</div>`
    : '';

  return `
    <div class="product-card" data-product-id="${product._id || ''}">
      ${imageHTML}
      <div class="product-info">
        <div class="product-name">${product.name}</div>
        ${platformHTML}
        <div class="product-prices">
          ${priceHTML}
          ${originalPriceHTML}
        </div>
      </div>
      <button class="add-to-wishlist-btn" data-product-name="${product.name}">
        ❤️ 加入心愿单
      </button>
    </div>
  `;
}

/**
 * 验证商品数据
 */
export function validateProductData(product: Partial<ProductWishlistItem>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!product.name || product.name.trim().length === 0) {
    errors.push('商品名称不能为空');
  }

  if (!product.purchaseUrl || product.purchaseUrl.trim().length === 0) {
    errors.push('购买链接不能为空');
  }

  if (typeof product.price !== 'number' || product.price <= 0) {
    errors.push('价格必须大于0');
  }

  if (product.purchaseUrl && !isValidURL(product.purchaseUrl)) {
    errors.push('购买链接格式不正确');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 验证URL格式
 */
function isValidURL(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * 计算折扣百分比
 */
export function calculateDiscountPercent(
  originalPrice: number,
  currentPrice: number
): number {
  if (originalPrice <= 0 || currentPrice <= 0) {
    return 0;
  }

  return Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
}

/**
 * 从消息内容中提取并渲染商品心愿单按钮
 */
export const renderProductBookmarks = (
  content: string,
  userId: string,
  conversationId?: string,
  onBookmarked?: (product: ProductWishlistItem) => void
): React.ReactNode => {
  const products = extractProductsFromAIResponse(content, userId, conversationId);

  if (products.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {products.map((product, index) => (
        <ProductBookmarkButton
          key={`${product.name}-${index}`}
          productInfo={product}
          conversationId={conversationId}
          userId={userId}
          onBookmarked={onBookmarked}
        />
      ))}
    </div>
  );
};

/**
 * 判断消息内容是否包含商品信息
 * 简化检测：只要包含商品相关关键词或价格模式即可
 */
export const containsProductInfo = (content: string): boolean => {
  const keywords = [
    '商品名称',
    '价格',
    '立即下单',
    '商品',
    '产品',
    '推荐',
    '购买',
    '¥',
    '￥',
    '链接',
    'product',
    'price',
    'buy',
  ];

  const hasKeywords = keywords.some(keyword => content.includes(keyword));

  // 检查是否有价格模式
  const hasPricePattern = /[¥￥$]\s*\d+/.test(content);

  // 检查是否包含表格格式
  const hasTablePattern = /\|[\s\S]*?\|/.test(content);

  // 简化条件：只要有关键词或价格模式或表格就返回 true
  const result = hasKeywords || hasPricePattern || hasTablePattern;

  console.log('[containsProductInfo]', {
    hasKeywords,
    hasPricePattern,
    hasTablePattern,
    result,
    contentLength: content.length,
    contentPreview: content.substring(0, 100)
  });

  return result;
};
