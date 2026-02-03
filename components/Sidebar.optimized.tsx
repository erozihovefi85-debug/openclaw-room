import React from 'react';
import { Conversation, User } from '../types';
import {
  PlusIcon, MessageSquareIcon, CloseIcon, TrashIcon, SparklesIcon,
  HomeIcon, DocumentTextIcon, UserIcon, SettingsIcon,
  BarChartIcon, BuildingIcon, HeartIcon
} from './Icons';
import UserAvatar from './UserAvatar';

interface SidebarProps {
  title?: string;
  conversations: Conversation[] | undefined;
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onGoHome: () => void;
  isOpen: boolean;
  onClose: () => void;
  // User related
  user: User | null;
  onOpenUserCenter: () => void;
  onLoginRequest: () => void;
  onAdminClick: () => void;
  onSupplierFavorites?: () => void; // 供应商收藏夹入口
  onProductWishlist?: () => void; // 商品心愿单入口
  isAdmin?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
  title = "私人买手助理",
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  onGoHome,
  isOpen,
  onClose,
  user,
  onOpenUserCenter,
  onLoginRequest,
  onAdminClick,
  onSupplierFavorites,
  onProductWishlist,
  isAdmin = false
}) => {
  return (
    <>
      {/* Mobile Overlay */}
      <div 
        className={`fixed inset-0 bg-black/20 backdrop-blur-sm z-50 md:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Sidebar Content */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-30
        w-72 bg-white border-r border-slate-200 flex flex-col shadow-xl md:shadow-none
        transform transition-transform duration-300 cubic-bezier(0.4, 0, 0.2, 1)
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Header */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white shadow-sm ${title === '私人买手助理' ? 'bg-gradient-to-br from-blue-500 to-blue-600' : 'bg-gradient-to-br from-emerald-500 to-emerald-600'}`}>
              {title === '私人买手助理' ? <SparklesIcon className="w-5 h-5" /> : <DocumentTextIcon className="w-5 h-5" />}
            </div>
            <h1 className="text-lg font-bold text-slate-800 tracking-tight">
              {title}
            </h1>
          </div>
          <button 
            onClick={onClose} 
            className="btn btn-ghost md:hidden p-2"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* New Chat Action */}
        <div className="p-4">
          <button
            onClick={() => { onNew(); onClose(); }}
            className={`btn btn-primary btn-block btn-primary ${title === '私人买手助理' ? 'from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700' : 'from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700'}`}
          >
            <PlusIcon className="icon icon-left" />
            <span>新建对话</span>
          </button>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto px-3 py-2">
          <div className="flex items-center justify-between px-2 mb-2">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">历史记录</h2>

            <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">
              {Array.isArray(conversations) ? conversations.length : 0}
            </span>
          </div>

          {(!Array.isArray(conversations) || conversations.length === 0) && (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400 text-sm gap-2 opacity-60">
              <MessageSquareIcon className="w-8 h-8 stroke-1" />
              <p>暂无历史对话</p>
            </div>
          )}

          {Array.isArray(conversations) && conversations.map(conv => {
            const isActive = activeId === conv.id;
            
            return (
              <div
                  key={conv.id}
                  onClick={() => { onSelect(conv.id); onClose(); }}
                  className={`group relative flex items-center justify-between px-3 py-3 rounded-xl text-sm transition-all cursor-pointer border hover:shadow-md ${
                    isActive
                      ? 'ring-2 ring-offset-2 ring-blue-500 bg-blue-50 border-blue-100'
                      : 'text-slate-600 hover:bg-white hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <MessageSquareIcon className={`w-4 h-4 transition-colors ${isActive ? 'text-blue-500' : 'text-slate-400 group-hover:text-slate-500'}`} />
                    <span className="truncate font-medium">{conv.name || "未命名对话"}</span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(conv.id);
                    }}
                    className={`btn btn-ghost btn-sm p-1.5 rounded-lg transition-all z-10 ${
                      isActive
                        ? 'text-slate-400 hover:text-red-500'
                        : 'text-slate-300 hover:text-red-500'
                    }`}
                    title="删除会话"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-100/80 bg-slate-50 space-y-1">
          {/* 用户信息 */}
          {user ? (
            <button
              onClick={onOpenUserCenter}
              className="btn btn-secondary btn-block w-full"
            >
              <UserIcon className="icon icon-left" />
              <span>{user.name || '用户中心'}</span>
            </button>
          ) : (
            <button
              onClick={onLoginRequest}
              className="btn btn-primary btn-block w-full"
            >
              <UserIcon className="icon icon-left" />
              <span>登录</span>
            </button>
          )}
          
          {/* 返回首页 */}
          <button
            onClick={onGoHome}
            className="btn btn-ghost btn-block w-full"
          >
            <HomeIcon className="icon icon-left" />
            <span>返回首页</span>
          </button>

          {/* 分隔线 */}
          {onSupplierFavorites || onProductWishlist ? (
            <div className="h-px bg-slate-100 my-1"></div>
          ) : null}

          {/* 供应商收藏夹 */}
          {onSupplierFavorites && (
            <button
              onClick={onSupplierFavorites}
              className="btn btn-secondary btn-block w-full"
            >
              <BuildingIcon className="icon icon-left" />
              <span>供应商收藏夹</span>
            </button>
          )}

          {/* 商品心愿单 */}
          {onProductWishlist && (
            <button
              onClick={onProductWishlist}
              className={`btn btn-secondary btn-block w-full ${title === '私人买手助理' || title === '私人买手助理' ? 'from-pink-500 to-pink-600' : 'from-emerald-500 to-emerald-600'}`}
            >
              <HeartIcon className="icon icon-left" />
              <span>商品心愿单</span>
            </button>
          )}
          
          {/* 管理员入口 */}
          {isAdmin && (
            <button
              onClick={onAdminClick}
              className="btn btn-ghost btn-block w-full"
            >
              <SettingsIcon className="icon icon-left" />
              <span>管理控制台</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
