import React, { useState, useEffect, useRef, useMemo } from 'react';
import { SendIcon, ChevronLeftIcon, ChevronRightIcon, ClockIcon, TrashIcon, PlusIcon, RobotIcon, SparklesIcon } from './Icons';
import { User, Conversation, Message, LoadingState, AppMode } from '../types';
import { conversationAPI } from '../services/api';
import { getThemeClasses, THEME_COLORS, SPACING, SHADOWS } from '../utils/theme';
import UserAvatar from './UserAvatar';

interface ChatHomeViewProps {
  user: User | null;
  onSelectMode: (mode: 'casual' | 'standard') => void;
  onGoToUserCenter?: () => void;
  mode?: AppMode;
}

const ChatHomeView: React.FC<ChatHomeViewProps> = ({
  user,
  onSelectMode,
  onGoToUserCenter,
  mode = 'casual'
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showNewChat, setShowNewChat] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showWishlist, setShowWishlist] = useState(false);

  // 主题样式
  const themeClasses = getThemeClasses(mode);

  // Load conversations
  useEffect(() => {
    const loadConversations = async () => {
      try {
        const response = await conversationAPI.getAll();
        setConversations(response.data.data || []);
      } catch (error) {
        console.error('Failed to load conversations:', error);
      }
    };

    loadConversations();
  }, []);

  // Create new conversation
  const handleNewChat = () => {
    const newConversation = {
      id: Date.now().toString(),
      name: '新对话',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    setConversations(prev => [newConversation, ...prev]);
    setActiveId(newConversation.id);
    setShowNewChat(false);
  };

  // Delete conversation
  const handleDeleteConversation = async (id: string) => {
    if (!confirm('确定要删除这个对话吗？')) return;

    try {
      await conversationAPI.delete(id);
      setConversations(prev => prev.filter(c => c.id !== id));
      if (activeId === id) {
        setActiveId(null);
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  // Select conversation
  const handleSelectConversation = (id: string) => {
    setActiveId(id);
  };

  // Toggle selection
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Delete selected
  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;

    if (!confirm(`确定要删除 ${selectedIds.size} 个对话吗？`)) return;

    try {
      for (const id of selectedIds) {
        await conversationAPI.delete(id);
      }
      setConversations(prev => prev.filter(c => !selectedIds.has(c.id)));
      setActiveId(null);
      setSelectedIds(new Set());
    } catch (error) {
      console.error('Failed to delete conversations:', error);
    }
  };

  // Format time
  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}天前`;
    if (hours > 0) return `${hours}小时前`;
    if (minutes > 0) return `${minutes}分钟前`;
    return '刚刚';
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-slate-50 via-white to-slate-50 relative">
      {/* Dynamic Particle Background */}
      <ParticleBackground />

      {/* Mode Toggle */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-white/80 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <button
              onClick={() => onSelectMode('casual')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${mode === 'casual' ? 'bg-pink-50 ring-2 ring-pink-200' : 'bg-transparent hover:bg-slate-50'}`}
            >
              <SparklesIcon className={`w-5 h-5 ${mode === 'casual' ? 'text-pink-500' : 'text-slate-400'}`} />
              <span className={`font-medium ${mode === 'casual' ? 'text-pink-700' : 'text-slate-600'}`}>
                随心采购
              </span>
            </button>

            <button
              onClick={() => onSelectMode('standard')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${mode === 'standard' ? 'bg-emerald-50 ring-2 ring-emerald-200' : 'bg-transparent hover:bg-slate-50'}`}
            >
              <DocumentIcon className={`w-5 h-5 ${mode === 'standard' ? 'text-emerald-500' : 'text-slate-400'}`} />
              <span className={`font-medium ${mode === 'standard' ? 'text-emerald-700' : 'text-slate-600'}`}>
                规范采购
              </span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onGoToUserCenter}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-50 transition-all"
            >
              <UserAvatar avatarType={user?.avatar || 'blue'} size="sm" />
              <span className="text-sm font-medium">{user?.name || '登录'}</span>
            </button>

            {user && (
              <button
                onClick={() => setShowNewChat(true)}
                className={`${THEME_COLORS[mode].primary[100]} text-white px-3 py-1.5 rounded-lg font-medium transition-all hover:shadow-md flex items-center gap-2`}
              >
                <PlusIcon className="w-4 h-4" />
                <span>新建对话</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Header - Sidebar + Main Content */}
      <div className="flex flex-1 overflow-hidden pt-16">
        {/* Sidebar */}
        <aside className={`w-80 bg-white border-r border-slate-200 flex flex-col shadow-xl transition-transform duration-300 ${showFavorites || showWishlist ? '-translate-x-full' : 'translate-x-0'}`}>
          {/* Header */}
          <div className={`h-14 px-4 flex items-center border-b ${THEME_COLORS[mode].secondary}`}>
            <h2 className={`text-lg font-bold ${themeClasses.textPrimary}`}>
              {mode === 'casual' ? '💁 聊天' : '📋 对话'}
            </h2>
          </div>

          {/* New Chat Button */}
          <div className="p-4">
            <button
              onClick={handleNewChat}
              className={`${THEME_COLORS[mode].primary} text-white w-full py-2.5 rounded-xl font-medium transition-all hover:shadow-md hover:scale-105 active:scale-105 flex items-center justify-center gap-2`}
            >
              <PlusIcon className="w-5 h-5" />
              <span>新建对话</span>
            </button>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto px-3 py-2">
            {conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400 text-sm gap-2 opacity-60">
                <RobotIcon className="w-10 h-10 stroke-1" />
                <p>开始新的对话吧</p>
              </div>
            ) : (
              <>
                {/* Selection Mode Toggle */}
                {selectedIds.size > 0 && (
                  <div className="mb-3 flex items-center justify-between px-2">
                    <span className="text-xs font-medium text-slate-500">
                      已选择 {selectedIds.size} 个
                    </span>
                    <button
                      onClick={() => setSelectedIds(new Set())}
                      className="text-xs text-slate-400 hover:text-slate-600 underline"
                    >
                      取消
                    </button>
                  </div>
                )}

                {selectedIds.size > 0 && (
                  <button
                    onClick={handleDeleteSelected}
                    className={`w-full py-1.5 rounded-lg text-sm font-medium transition-all border ${THEME_COLORS.mode === 'error' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-slate-100 text-slate-700 border-slate-200'} hover:bg-red-100 hover:border-red-300`}
                  >
                    删除 {selectedIds.size} 个对话
                  </button>
                )}

                {/* Conversations */}
                <div className="space-y-1">
                  {conversations.map((conv) => {
                    const isActive = activeId === conv.id;
                    const isSelected = selectedIds.has(conv.id);

                    return (
                      <div
                        key={conv.id}
                        onClick={() => {
                          if (!isSelected) {
                            handleSelectConversation(conv.id);
                          } else {
                            toggleSelection(conv.id);
                          }
                        }}
                        className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all cursor-pointer border ${
                          isActive
                            ? `ring-2 ${THEME_COLORS[mode].primary} ${THEME_COLORS[mode].primary[50]} ${THEME_COLORS[mode].primary[100]}`
                            : isSelected
                              ? 'ring-2 ring-blue-300 bg-blue-50'
                              : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex items-center gap-3 overflow-hidden min-w-0 flex-1">
                          <span className="truncate font-medium text-slate-700">
                            {conv.name || '未命名对话'}
                          </span>
                          <span className={`text-xs ${themeClasses.textMuted} shrink-0`}>
                            {formatTime(conv.updatedAt)}
                          </span>
                        </div>

                        {/* Checkbox for selection mode */}
                        {selectedIds.size > 0 && (
                          <div onClick={(e) => e.stopPropagation()} className={`flex-shrink-0 ${isSelected ? 'text-blue-600' : 'text-slate-300'}`}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              readOnly
                              className="w-4 h-4"
                            />
                          </div>
                        )}

                        {/* Delete button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteConversation(conv.id);
                          }}
                          className={`flex-shrink-0 p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100 ${
                            isSelected ? 'invisible' : 'text-slate-300 hover:text-red-500 hover:bg-red-50'
                          }`}
                          title="删除"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Sidebar Footer */}
          <div className="p-3 border-t border-slate-200 bg-slate-50 space-y-1">
            <button
              onClick={() => setShowFavorites(true)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all border ${
                showFavorites
                  ? `${THEME_COLORS[mode].primary} text-white`
                  : 'bg-white hover:bg-slate-50 border-slate-200'
              }`}
            >
              <span>⭐ 供应商收藏夹</span>
            </button>

            <button
              onClick={() => setShowWishlist(true)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all border ${
                showWishlist
                  ? `${THEME_COLORS.mode === 'pink' ? 'text-pink-600' : 'text-emerald-600'}`
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <span>💝 心愿单</span>
            </button>
          </div>
        </aside>

        {/* Main Chat Area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Welcome Hero */}
          {!activeId && (
            <div className="flex-1 flex items-center justify-center px-8">
              <div className={`max-w-2xl text-center p-8 rounded-3xl ${THEME_COLORS[mode].primary[50]} ${THEME_COLORS[mode].primary[100]} bg-opacity-20 ${SHADOWS.xl}`}>
                <RobotIcon className={`w-16 h-16 ${THEME_COLORS[mode].primary[600]} mb-4`} />
                <h2 className={`text-3xl font-bold mb-3 ${themeClasses.textPrimary}`}>
                  {mode === 'casual' ? '今天想买点什么？' : '有采购需求需要协助吗？'}
                </h2>
                <p className={`text-lg ${themeClasses.textSecondary} mb-6`}>
                  {mode === 'casual'
                    ? '让小美帮您找到全网最优价格'
                    : '让小帅协助您完成企业采购全流程'}
                </p>
                <button
                  onClick={handleNewChat}
                  className={`${THEME_COLORS[mode].primary} text-white px-6 py-3 rounded-xl font-semibold transition-all hover:shadow-lg hover:scale-105 flex items-center justify-center gap-2 ${SHADOWS.md}`}
                >
                  <PlusIcon className="w-5 h-5" />
                  <span>开始新对话</span>
                </button>
              </div>
            </div>
          )}

          {/* Selected Actions */}
          {selectedIds.size > 0 && (
            <div className="px-6 py-3 bg-white/50 backdrop-blur-sm border-b border-slate-200 flex items-center gap-4">
              <span className="text-sm font-medium text-slate-600">
                已选择 {selectedIds.size} 个对话
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-white border border-slate-200 hover:bg-slate-50"
                >
                  取消选择
                </button>
                <button
                  onClick={handleDeleteSelected}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${THEME_COLORS.mode === 'error' ? 'bg-red-500 text-white' : 'bg-slate-700 text-white'}`}
                >
                  删除
                </button>
              </div>
            </div>
          )}

          {/* Active Chat Placeholder */}
          {activeId && (
            <div className="flex-1 flex items-center justify-center px-8">
              <div className="text-center">
                <RobotIcon className={`w-12 h-12 ${THEME_COLORS[mode].primary[400]} mb-4 animate-pulse`} />
                <p className={`${themeClasses.textSecondary} animate-pulse`}>
                  等待响应...
                </p>
              </div>
            </div>
          )}
        </main>

        {/* Favorites Modal */}
        {showFavorites && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
              <div className="flex items-center justify-between p-6 border-b border-slate-200">
                <h2 className={`text-xl font-bold ${themeClasses.textPrimary}`}>
                  供应商收藏夹
                </h2>
                <button
                  onClick={() => setShowFavorites(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-all"
                >
                  <span className="text-2xl">&times;</span>
                </button>
              </div>

              <div className="p-8">
                <div className="flex flex-col items-center justify-center py-16 text-slate-400 text-sm gap-2">
                  <span>⭐</span>
                  <p>收藏夹功能开发中...</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Wishlist Modal */}
        {showWishlist && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
              <div className="flex items-center justify-between p-6 border-b border-slate-200">
                <h2 className={`text-xl font-bold ${themeClasses.textPrimary}`}>
                  💝 商品心愿单
                </h2>
                <button
                  onClick={() => setShowWishlist(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-all"
                >
                  <span className="text-2xl">&times;</span>
                </button>
              </div>

              <div className="p-8">
                <div className="flex flex-col items-center justify-center py-16 text-slate-400 text-sm gap-2">
                  <span>💝</span>
                  <p>心愿单功能开发中...</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ChatHomeView;
