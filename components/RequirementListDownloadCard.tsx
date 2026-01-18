import React, { useState } from 'react';
import { FileTextIcon, DownloadIcon, ChevronDownIcon, ChevronUpIcon, CheckIcon } from './Icons';
import { requirementListAPI } from '../services/api';

interface RequirementListDownloadCardProps {
  requirementListData: {
    items: Array<{
      id: string;
      title: string;
      description: string;
      priority: 'high' | 'medium' | 'low';
      category: string;
      specifications?: string;
      quantity?: number;
      unit?: string;
      budget?: number;
      deadline?: string;
      notes?: string;
    }>;
    summary: string;
  };
  userId?: string;
  conversationId?: string;
}

const RequirementListDownloadCard: React.FC<RequirementListDownloadCardProps> = ({
  requirementListData,
  userId,
  conversationId,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadComplete, setDownloadComplete] = useState(false);

  const handleDownload = async () => {
    if (!userId) {
      showNotification('请先登录', 'error');
      return;
    }

    setIsDownloading(true);
    try {
      const response = await requirementListAPI.generate({
        items: requirementListData.items,
        summary: requirementListData.summary,
      });

      // 获取文件名
      const contentDisposition = response.headers['content-disposition'];
      let fileName = `requirement-list-${Date.now()}.xlsx`;
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (fileNameMatch) {
          fileName = fileNameMatch[1];
        }
      }

      // 下载文件
      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setDownloadComplete(true);
      showNotification('下载成功！填写完成后可上传进行深度寻源');

      setTimeout(() => {
        setDownloadComplete(false);
      }, 3000);
    } catch (error) {
      console.error('Download requirement list error:', error);
      showNotification('下载失败，请重试', 'error');
    } finally {
      setIsDownloading(false);
    }
  };

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-4 py-2 rounded-lg shadow-lg text-white z-50 ${
      type === 'success' ? 'bg-green-500' : 'bg-red-500'
    }`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-700 border-green-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high':
        return '高';
      case 'medium':
        return '中';
      case 'low':
        return '低';
      default:
        return '中';
    }
  };

  // 按类别分组
  const groupedItems = requirementListData.items.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, typeof requirementListData.items>);

  return (
    <div className="my-4 border border-blue-200 rounded-lg bg-blue-50/50 overflow-hidden">
      {/* 折叠标题栏 */}
      <div className="flex items-center justify-between px-3 md:px-4 py-3">
        <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-blue-100 border border-blue-200 flex items-center justify-center flex-shrink-0">
            <FileTextIcon className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800">
              采购需求清单
            </p>
            <div className="flex items-center gap-1.5 md:gap-2 mt-0.5 flex-wrap">
              <span className="text-xs md:text-sm text-blue-600 font-medium">
                共 {requirementListData.items.length} 项需求
              </span>
              {Object.keys(groupedItems).length > 0 && (
                <span className="px-1.5 md:px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                  {Object.keys(groupedItems).length} 个类别
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 md:gap-2 shrink-0">
          {downloadComplete ? (
            <div className="flex items-center gap-1 text-green-600 px-2 md:px-3 py-1.5 rounded-lg bg-green-100 text-xs md:text-sm font-medium">
              <CheckIcon className="w-4 h-4" />
              <span className="hidden sm:inline">已下载</span>
            </div>
          ) : (
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className={`flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-all ${
                isDownloading
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md hover:-translate-y-0.5'
              }`}
            >
              <DownloadIcon className="w-4 h-4" />
              <span>{isDownloading ? '生成中...' : '下载Excel'}</span>
            </button>
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
        <div className="px-3 md:px-4 pb-4 space-y-3 border-t border-blue-100 pt-3">
          {/* 需求概要 */}
          {requirementListData.summary && (
            <div>
              <p className="text-xs text-slate-500 mb-1.5">需求概要</p>
              <p className="text-sm text-slate-700">{requirementListData.summary}</p>
            </div>
          )}

          {/* 按类别展示需求 */}
          {Object.entries(groupedItems).map(([category, items]) => (
            <div key={category} className="bg-white rounded-lg border border-blue-100 p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-semibold text-blue-700">{category}</span>
                <span className="text-xs text-slate-500">({items.length} 项)</span>
              </div>
              <div className="space-y-2">
                {items.map((item, index) => (
                  <div key={item.id || index} className="flex items-start gap-2 text-sm border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full border shrink-0 ${getPriorityColor(item.priority)}`}>
                      {getPriorityLabel(item.priority)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 truncate">{item.title}</p>
                      <p className="text-xs text-slate-600 line-clamp-2">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* 提示信息 */}
          <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
            <p className="font-medium mb-1">填写说明：</p>
            <ul className="space-y-1 ml-4 list-disc">
              <li>下载Excel文件后，请填写完整的需求信息</li>
              <li>带 * 的字段为必填项</li>
              <li>填写完成后，将文件上传即可开始深度寻源</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequirementListDownloadCard;
