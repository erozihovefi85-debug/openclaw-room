import React, { useState, useEffect } from 'react';
import { HeartIcon, ShoppingCartIcon, ChevronDownIcon, ChevronUpIcon, LinkIcon } from './Icons';
import { ProductWishlistItem } from '../types';
import { productWishlistAPI } from '../services/api';

interface ProductBookmarkButtonProps {
  productInfo: ProductWishlistItem;
  conversationId?: string;
  userId?: string;
  onBookmarked?: (product: ProductWishlistItem) => void;
}

const ProductBookmarkButton: React.FC<ProductBookmarkButtonProps> = ({
  productInfo,
  conversationId,
  userId,
  onBookmarked,
}) => {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // 检查商品是否已在心愿单中
  useEffect(() => {
    const checkIfBookmarked = async () => {
      if (!userId) {
        console.log('[ProductBookmarkButton] No userId, skipping bookmark check');
        return;
      }

      try {
        console.log('[ProductBookmarkButton] Checking bookmark for:', productInfo.name, 'userId:', userId);
        const response = await productWishlistAPI.getAll({ page: 1, limit: 100 });
        console.log('[ProductBookmarkButton] All products:', response.data?.data?.length, 'items');

        const existingProduct = response.data?.data?.find((p: ProductWishlistItem) => {
          const match = p.name === productInfo.name && p.userId === userId;
          console.log('[ProductBookmarkButton] Comparing:', p.name, 'with', productInfo.name, 'match:', match);
          return match;
        });

        console.log('[ProductBookmarkButton] Existing product found:', !!existingProduct);
        setIsBookmarked(!!existingProduct);
      } catch (error) {
        console.error('[ProductBookmarkButton] Check bookmark status error:', error);
      }
    };

    checkIfBookmarked();
  }, [productInfo.name, userId]);

  const handleBookmark = async () => {
    if (isBookmarked || isLoading) return;

    setIsLoading(true);
    try {
      // 移除 _id 字段，让后端自动生成
      const { _id, ...productDataWithoutId } = productInfo;

      const productData = {
        ...productDataWithoutId,
        conversationId,
      };

      const response = await productWishlistAPI.create(productData);
      setIsBookmarked(true);

      if (onBookmarked) {
        onBookmarked(response.data);
      }

      // 显示成功提示
      showNotification('商品已添加到心愿单');
    } catch (error) {
      console.error('Bookmark product error:', error);
      showNotification('添加失败，请重试', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-4 py-2 rounded-lg shadow-lg text-white z-50 ${
      type === 'success' ? 'bg-pink-500' : 'bg-red-500'
    }`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
  };

  const formatPrice = (price: number) => {
    return `¥${price.toLocaleString()}`;
  };

  // 解析描述，提取标签（移除链接）
  const parseDescription = () => {
    if (!productInfo.description) return null;

    // 移除 Markdown 链接格式 [文本](URL)
    let cleanedDesc = productInfo.description.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

    // 尝试解析类似 "分类: 护肤 | 功效: 保湿" 的格式
    const pairs = cleanedDesc.split('|').map(s => s.trim());
    const tags: { key: string; value: string }[] = [];

    for (const pair of pairs) {
      const match = pair.match(/^([^:：]+)[:：]\s*(.+)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim();

        // 跳过链接相关的键
        if (key.includes('链接') || key.includes('URL') || key.includes('url')) {
          continue;
        }

        tags.push({ key, value });
      }
    }

    if (tags.length > 0) {
      return tags;
    }

    // 如果没有键值对格式，提取关键词
    const keywords = cleanedDesc
      .split(/[\s,，、|]+/)
      .filter(s => s.trim().length > 0)
      .slice(0, 5); // 最多显示5个关键词

    if (keywords.length > 0) {
      return keywords.map(kw => ({ key: '关键词', value: kw.trim() }));
    }

    return null;
  };

  const descriptionTags = parseDescription();

  return (
    <div className="my-4 border border-pink-200 rounded-lg bg-pink-50/50 overflow-hidden">
      {/* 折叠标题栏 */}
      <div className="flex items-center justify-between px-3 md:px-4 py-3">
        <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
          {productInfo.imageUrl ? (
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg overflow-hidden bg-white border border-pink-100 flex-shrink-0">
              <img
                src={productInfo.imageUrl}
                alt={productInfo.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          ) : (
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-pink-100 border border-pink-200 flex items-center justify-center flex-shrink-0">
              <span className="text-pink-600 text-base md:text-lg">🛍️</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">
              {productInfo.name}
            </p>
            <div className="flex items-center gap-1.5 md:gap-2 mt-0.5 flex-wrap">
              {productInfo.price > 0 && (
                <span className="text-xs md:text-sm font-bold text-pink-600">
                  {formatPrice(productInfo.price)}
                </span>
              )}
              {productInfo.platform && (
                <span className="px-1.5 md:px-2 py-0.5 bg-pink-100 text-pink-700 rounded text-xs font-medium">
                  {productInfo.platform}
                </span>
              )}
              {productInfo.category && (
                <span className="px-1.5 md:px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                  {productInfo.category}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 md:gap-2 shrink-0">
          {isBookmarked ? (
            <div className="flex items-center gap-1 text-pink-600 px-2 md:px-3 py-1.5 rounded-lg bg-pink-100 text-xs md:text-sm font-medium">
              <HeartIcon className="w-4 h-4 fill-current" />
              <span className="hidden sm:inline">已加入</span>
              <span className="sm:hidden">已加入</span>
            </div>
          ) : (
            <button
              onClick={handleBookmark}
              disabled={isLoading}
              className={`flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-all ${
                isLoading
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-pink-600 text-white hover:bg-pink-700 hover:shadow-md hover:-translate-y-0.5'
              }`}
            >
              <HeartIcon className="w-4 h-4" />
              <span>{isLoading ? '添加中...' : '加入心愿单'}</span>
            </button>
          )}

          {productInfo.purchaseUrl && (
            <a
              href={productInfo.purchaseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-slate-400 hover:text-pink-600 hover:bg-white rounded-lg transition-colors hidden sm:block"
              title="查看商品"
            >
              <LinkIcon className="w-4 h-4" />
            </a>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg transition-colors"
          >
            {isExpanded ? (
              <ChevronUpIcon className="w-4 h-4" />
            ) : (
              <ChevronDownIcon className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* 展开的详细信息 */}
      {isExpanded && (
        <div className="px-3 md:px-4 pb-4 space-y-3 border-t border-pink-100 pt-3">
          {/* 解析后的标签 */}
          {descriptionTags && descriptionTags.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 mb-1.5">商品信息</p>
              <div className="space-y-1.5">
                {descriptionTags.map((tag, index) => (
                  <div key={index} className="flex text-sm">
                    <span className="text-slate-500 w-16 md:w-20 flex-shrink-0 text-xs">{tag.key}：</span>
                    <span className="text-slate-700 flex-1 text-xs break-words">{tag.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 价格信息 */}
          <div className="grid grid-cols-2 gap-2 md:gap-3 text-sm">
            {productInfo.price > 0 && (
              <div>
                <span className="text-slate-500 text-xs">当前价格：</span>
                <span className="text-pink-600 font-semibold text-xs md:text-sm">{formatPrice(productInfo.price)}</span>
              </div>
            )}
            {productInfo.originalPrice && productInfo.originalPrice > productInfo.price && (
              <div>
                <span className="text-slate-500 text-xs">原价：</span>
                <span className="text-slate-400 line-through text-xs">{formatPrice(productInfo.originalPrice)}</span>
              </div>
            )}
          </div>

          {/* 品牌 */}
          {productInfo.brand && (
            <div>
              <span className="text-slate-500 text-xs">品牌：</span>
              <span className="text-sm text-slate-700">{productInfo.brand}</span>
            </div>
          )}

          {/* 分类 */}
          {productInfo.category && (
            <div>
              <span className="text-slate-500 text-xs">分类：</span>
              <span className="text-sm text-slate-700">{productInfo.category}</span>
            </div>
          )}

          {/* 规格 */}
          {productInfo.specifications && Object.keys(productInfo.specifications).length > 0 && (
            <div>
              <p className="text-xs text-slate-500 mb-1.5">规格参数</p>
              <div className="space-y-1">
                {Object.entries(productInfo.specifications).map(([key, value]) => (
                  <div key={key} className="flex text-sm">
                    <span className="text-slate-500 w-24">{key}：</span>
                    <span className="text-slate-700">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 标签 */}
          {productInfo.tags && productInfo.tags.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 mb-1.5">标签</p>
              <div className="flex flex-wrap gap-1.5">
                {productInfo.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-0.5 bg-white border border-pink-200 rounded text-xs text-pink-600"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 购买链接 */}
          {productInfo.purchaseUrl && (
            <div className="pt-2">
              <a
                href={productInfo.purchaseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors text-sm font-medium"
              >
                <ShoppingCartIcon className="w-4 h-4" />
                <span>前往购买</span>
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductBookmarkButton;
