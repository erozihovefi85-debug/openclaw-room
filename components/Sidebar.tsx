
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
        className={`fixed inset-0 bg-black/20 backdrop-blur-sm z-20 md:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
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
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-sm ${title === '私人买手助理' ? 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-blue-200' : 'bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-emerald-200'}`}>
              {title === '私人买手助理' ? <SparklesIcon className="w-5 h-5" /> : <DocumentTextIcon className="w-5 h-5" />}
            </div>
            <h1 className="text-lg font-bold text-slate-800 tracking-tight">
              {title}
            </h1>
          </div>
          <button 
            onClick={onClose} 
            className="md:hidden p-2 -mr-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* New Chat Action */}
        <div className="p-4">
          <button
            onClick={() => { onNew(); onClose(); }}
            className={`w-full group flex items-center justify-center gap-2 text-white px-4 py-3.5 rounded-xl transition-all shadow-md hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 ${
              title === '私人买手助理'
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
                : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700'
            }`}
          >
            <PlusIcon className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
            <span className="font-semibold text-sm">新建对话</span>
          </button>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto px-3 py-2">
          <div className="flex items-center justify-between px-2 mb-2">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">历史记录</h2>
            <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">{Array.isArray(conversations) ? conversations.length : 0}</span>
          </div>

          <div className="space-y-1">
            {(!Array.isArray(conversations) || conversations.length === 0) && (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400 text-sm gap-2 opacity-60">
                <MessageSquareIcon className="w-8 h-8 stroke-1" />
                <p>暂无历史对话</p>
              </div>
            )}

            {Array.isArray(conversations) && conversations.map(conv => {
              const isActive = activeId === conv.id;
              const activeBg = title === '私人买手助理' ? 'bg-blue-50 border-blue-100' : 'bg-emerald-50 border-emerald-100';
              const activeText = title === '私人买手助理' ? 'text-blue-700' : 'text-emerald-700';
              const activeIcon = title === '私人买手助理' ? 'text-blue-500' : 'text-emerald-500';

              return (
                <div
                  key={conv.id}
                  onClick={() => { onSelect(conv.id); onClose(); }}
                  className={`
                    group relative flex items-center justify-between px-3 py-3 rounded-xl text-sm transition-all cursor-pointer border
                    ${isActive
                      ? `${activeBg} ${activeText} shadow-md scale-[1.02]`
                      : 'text-slate-600 hover:bg-white hover:text-slate-900 hover:border-slate-200 hover:shadow-sm hover:scale-[1.01]'
                    }
                  `}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <MessageSquareIcon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? activeIcon : 'text-slate-400 group-hover:text-slate-500'}`} />
                    <span className="truncate font-medium">{conv.name || "未命名对话"}</span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(conv.id);
                    }}
                    className={`
                      p-1.5 rounded-lg transition-all z-10 opacity-0 group-hover:opacity-100
                      ${isActive ? 'opacity-100' : ''}
                      ${isActive
                        ? 'text-slate-400 hover:text-red-500 hover:bg-white shadow-sm'
                        : 'text-slate-300 hover:text-red-500 hover:bg-white hover:shadow-sm'
                      }
                    `}
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
        <div className="p-3 border-t border-slate-100/80 bg-gradient-to-b from-white to-slate-50/80 space-y-1">
            <button
              onClick={onGoHome}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 hover:bg-white hover:text-blue-600 hover:shadow-md transition-all border border-transparent hover:border-slate-200 group"
            >
              <HomeIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span className="font-medium text-sm">返回首页</span>
            </button>

            {onSupplierFavorites && (
              <button
                onClick={onSupplierFavorites}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-emerald-600 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-white hover:shadow-md transition-all border border-transparent hover:border-emerald-200 group"
              >
                <BuildingIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="font-medium text-sm">供应商收藏夹</span>
              </button>
            )}

            {(title === '私家买手助理' || title === '私人买手助理') && onProductWishlist && (
              <button
                onClick={onProductWishlist}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-pink-600 hover:bg-gradient-to-r hover:from-pink-50 hover:to-white hover:shadow-md transition-all border border-transparent hover:border-pink-200 group"
              >
                <HeartIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="font-medium text-sm">商品心愿单</span>
              </button>
            )}

            {isAdmin && (
             <button
               onClick={onAdminClick}
               className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-purple-600 hover:bg-gradient-to-r hover:from-purple-50 hover:to-white hover:shadow-md transition-all border border-transparent hover:border-purple-200 group"
             >
               <BarChartIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
               <span className="font-medium text-sm">管理后台</span>
             </button>
           )}

            {/* User Profile Section */}
           {user ? (
             <div
               onClick={onOpenUserCenter}
               className="w-full group flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white hover:shadow-md transition-all cursor-pointer border border-transparent hover:border-slate-200"
             >
                <div className="w-10 h-10 shrink-0">
                  <UserAvatar avatarType={user.avatar || 'blue'} size="md" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">{user.name}</p>
                  <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                </div>
                <div className="p-1.5 text-slate-300 group-hover:text-slate-500 group-hover:bg-slate-100 rounded-lg transition-all">
                  <SettingsIcon className="w-4 h-4" />
                </div>
             </div>
           ) : (
             <button
               onClick={onLoginRequest}
               className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-blue-600 hover:bg-gradient-to-r hover:from-blue-50 hover:to-white hover:shadow-md transition-all font-semibold text-sm border border-transparent hover:border-blue-200"
             >
               <UserIcon className="w-5 h-5" />
               <span>登录账号</span>
             </button>
           )}

           <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 pt-2 opacity-60">
             <span>Powered by</span>
             <span className="font-semibold text-slate-500">安正咨询</span>
           </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
