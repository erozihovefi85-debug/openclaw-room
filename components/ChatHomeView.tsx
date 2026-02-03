import React, { useState, useEffect } from 'react';
import { SendIcon, ChevronLeftIcon, ChevronRightIcon, ClockIcon, TrashIcon } from './Icons';
import { User, Conversation } from '../types';
import { conversationAPI } from '../services/api';
import UserAvatar from './UserAvatar';

interface ChatHomeViewProps {
  user: User | null;
  onSelectMode: (mode: 'casual' | 'standard', categoryCode?: string, initialMessage?: string, conversationId?: string) => void;
  onGoToUserCenter?: () => void;
}

/**
 * Dynamic Particle Background
 */
const ParticleBackground: React.FC = () => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    const particles: any[] = [];
    const particleCount = Math.min(Math.floor(width * height / 15000), 100);
    const connectionDistance = 120;

    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;

      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.size = Math.random() * 2 + 1;
        const colors = ['rgba(148, 163, 184, ', 'rgba(59, 130, 246, ', 'rgba(16, 185, 129, '];
        this.color = colors[Math.floor(Math.random() * colors.length)];
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color + '0.5)';
        ctx.fill();
      }
    }

    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p, index) => {
        p.update();
        p.draw();

        for (let j = index + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < connectionDistance) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(203, 213, 225, ${1 - distance / connectionDistance})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      });

      requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />;
};

const ChatHomeView: React.FC<ChatHomeViewProps> = ({ user, onSelectMode, onGoToUserCenter }) => {
  const [activeMode, setActiveMode] = useState<'casual' | 'standard'>('casual');
  const [activeCategory, setActiveCategory] = useState('产品科普');
  const [inputValue, setInputValue] = useState('');
  const [sliderOpen, setSliderOpen] = useState(false);
  const [historySidebarOpen, setHistorySidebarOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);

  const casualCategories = ['产品科普', '质检', '测评', '价格'];
  const standardCategories = ['采购方案咨询', '采购需求生成', '供应商寻源', '供应商收藏'];

  const currentCategories = activeMode === 'casual' ? casualCategories : standardCategories;

  // Load conversations based on current mode
  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [activeMode, user]);

  const loadConversations = async () => {
    if (!user) {
      setConversations([]);
      return;
    }

    try {
      setLoadingConversations(true);
      const contextId = activeMode === 'casual' ? 'casual_main' : 'standard_keyword';
      const response = await conversationAPI.getAll({ user: user.id, contextId });
      setConversations(response.data || []);
    } catch (error) {
      console.error('Failed to load conversations:', error);
      setConversations([]);
    } finally {
      setLoadingConversations(false);
    }
  };

  const handleSelectConversation = (conversation: Conversation) => {
    onSelectMode(activeMode, undefined, undefined, conversation.id);
    setHistorySidebarOpen(false);
  };

  const handleSend = () => {
    if (!inputValue.trim()) return;

    const messageToSend = inputValue.trim();
    setInputValue('');
    onSelectMode(activeMode, undefined, messageToSend);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="relative h-screen bg-slate-50 overflow-hidden flex flex-col">
      {/* Particle Background */}
      <ParticleBackground />

      {/* Header */}
      <header className="relative z-50 h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/50 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          {/* History Toggle Button */}
          <button
            onClick={() => setHistorySidebarOpen(true)}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors group relative"
            title="历史会话"
          >
            <ClockIcon className="w-5 h-5 text-slate-500 group-hover:text-slate-700" />
            {conversations.length > 0 && !historySidebarOpen && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {conversations.length}
              </span>
            )}
          </button>

          {/* Logo */}
          <div className="w-9 h-9 relative">
            <svg viewBox="0 0 64 64" fill="none" className="w-full h-full drop-shadow-md">
              <defs>
                <linearGradient id="navLogoGradient4" x1="0" y1="0" x2="64" y2="64">
                  <stop offset="0%" stopColor="#3B82F6"/>
                  <stop offset="100%" stopColor="#10B981"/>
                </linearGradient>
                <linearGradient id="navSparkleGradient4" x1="0" y1="0" x2="64" y2="64">
                  <stop offset="0%" stopColor="#FCD34D"/>
                  <stop offset="100%" stopColor="#F59E0B"/>
                </linearGradient>
              </defs>
              <circle cx="32" cy="32" r="30" fill="url(#navLogoGradient4)"/>
              <path d="M22 12 L42 12 L46 20 L46 48 C46 52 42 54 32 54 C22 54 18 52 18 48 L22 40 L34 40 L34 28 L22 28 Z" fill="white" opacity="0.95"/>
              <g transform="translate(44 18)">
                <circle r="6" fill="url(#navSparkleGradient4)"/>
                <path d="M0 -4 L0 4 M-4 0 L4 0" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                <circle r="2" fill="white"/>
              </g>
              <circle cx="28" cy="34" r="2" fill="url(#navLogoGradient4)"/>
              <circle cx="36" cy="34" r="2" fill="url(#navLogoGradient4)"/>
            </svg>
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-emerald-600 tracking-tight">
            ProcureAI
          </span>
        </div>

        <div className="flex items-center gap-4">
          {user && onGoToUserCenter && (
            <button
              onClick={onGoToUserCenter}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-all"
            >
              <UserAvatar avatarType={user.avatar || 'blue'} size="sm" className="w-7 h-7" />
              <span>{user.name}</span>
            </button>
          )}
        </div>
      </header>

      {/* Left History Sidebar */}
      <div
        className={`fixed left-0 top-16 bottom-0 z-40 bg-white/95 backdrop-blur-md border-r border-slate-200 shadow-lg transition-transform duration-300 ${
          historySidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ width: '320px' }}
      >
        {/* Toggle Button */}
        <button
          onClick={() => setHistorySidebarOpen(false)}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full bg-white border-l border-y border-slate-200 rounded-r-lg px-1 py-6 hover:bg-slate-50 transition-colors shadow-sm"
        >
          <ChevronLeftIcon className="w-5 h-5 text-slate-400" />
        </button>

        {/* Sidebar Content */}
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className={`p-4 border-b border-slate-100 ${
            activeMode === 'casual' ? 'bg-gradient-to-r from-blue-50 to-pink-50' : 'bg-gradient-to-r from-emerald-50 to-teal-50'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <ClockIcon className="w-5 h-5 text-slate-500" />
              <h3 className="font-semibold text-slate-700">历史会话</h3>
            </div>
            <p className={`text-xs ${
              activeMode === 'casual' ? 'text-blue-600' : 'text-emerald-600'
            }`}>
              {activeMode === 'casual' ? '小美的对话记录' : '小帅的对话记录'}
            </p>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {loadingConversations ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-400"></div>
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <ClockIcon className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">暂无历史会话</p>
                <p className="text-xs mt-1">开始对话后记录将显示在这里</p>
              </div>
            ) : (
              conversations.slice().reverse().map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv)}
                  className="w-full p-3 bg-slate-50 hover:bg-slate-100 rounded-lg transition-all text-left group border border-slate-100 hover:border-slate-200"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-700 truncate mb-1">
                        {conv.name || '新对话'}
                      </div>
                      <div className="text-xs text-slate-400">
                        {new Date(conv.updated_at).toLocaleDateString('zh-CN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                    <ChevronRightIcon className="w-4 h-4 text-slate-300 group-hover:text-slate-500 flex-shrink-0 mt-1" />
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Overlay when sidebar is open */}
      {historySidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30"
          onClick={() => setHistorySidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-4xl">
          {/* Section Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-800 mb-2">
              {activeMode === 'casual' ? '产品咨询助手' : '专业采购助手'}
            </h1>
            <p className="text-slate-500">
              {activeMode === 'casual'
                ? '智能产品科普、质量检测、测评分析、价格对比'
                : '企业级采购方案、需求生成、供应商寻源与管理'}
            </p>
          </div>

          {/* Category Tabs */}
          <div className="mb-6">
            <div className="flex items-center justify-center gap-3 flex-wrap">
              {currentCategories.map((category, index) => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 shadow-sm ${
                    activeCategory === category
                      ? activeMode === 'casual'
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-200/50 scale-105'
                        : 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-200/50 scale-105'
                      : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/80 hover:border-slate-300 hover:shadow-md'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Chat Input Card */}
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-slate-200/60 overflow-hidden transition-all duration-300 hover:shadow-3xl hover:border-blue-200/50">
            {/* Assistant Info Bar */}
            <div className="px-6 py-4 border-b border-slate-100/80 bg-gradient-to-r from-slate-50 via-white to-slate-50">
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ring-2 ring-white transition-all duration-300 hover:scale-105 ${
                  activeMode === 'casual'
                    ? 'bg-gradient-to-br from-pink-100 via-pink-200 to-pink-100'
                    : 'bg-gradient-to-br from-emerald-100 via-emerald-200 to-emerald-100'
                }`}>
                  {activeMode === 'casual' ? (
                    <svg viewBox="0 0 64 64" className="w-8 h-8">
                      <circle cx="32" cy="32" r="20" fill="#FFDAB9" />
                      <path d="M12 32 Q12 12 32 12 Q52 12 52 32 Q52 24 48 20 Q44 16 40 16 Q36 16 32 16 Q28 16 24 16 Q20 16 16 20 Q12 24 12 32" fill="#4A3728" />
                      <ellipse cx="26" cy="30" rx="3" ry="4" fill="#333" />
                      <ellipse cx="38" cy="30" rx="3" ry="4" fill="#333" />
                      <path d="M27 40 Q32 44 37 40" stroke="#333" strokeWidth="2" fill="none" strokeLinecap="round" />
                      <circle cx="20" cy="36" r="3" fill="#FFB6C1" opacity="0.5" />
                      <circle cx="44" cy="36" r="3" fill="#FFB6C1" opacity="0.5" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 64 64" className="w-8 h-8">
                      <circle cx="32" cy="32" r="20" fill="#FFE4C4" />
                      <path d="M10 28 Q10 10 32 10 Q54 10 54 28 L54 24 Q50 14 32 14 Q14 14 10 24 Z" fill="#2C1810" />
                      <rect x="20" y="28" width="10" height="8" rx="2" fill="none" stroke="#1a1a1a" strokeWidth="2" />
                      <rect x="34" y="28" width="10" height="8" rx="2" fill="none" stroke="#1a1a1a" strokeWidth="2" />
                      <line x1="30" y1="32" x2="34" y2="32" stroke="#1a1a1a" strokeWidth="2" />
                      <circle cx="25" cy="32" r="2" fill="#333" />
                      <circle cx="39" cy="32" r="2" fill="#333" />
                      <path d="M28 42 Q32 45 36 42" stroke="#333" strokeWidth="2" fill="none" strokeLinecap="round" />
                      <path d="M32 52 L28 58 L32 60 L36 58 L32 52" fill="#10B981" />
                    </svg>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className={`font-bold text-lg ${
                      activeMode === 'casual' ? 'text-blue-600' : 'text-emerald-600'
                    }`}>
                      {activeMode === 'casual' ? '小美' : '小帅'}
                    </h3>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      activeMode === 'casual' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'
                    }`}>
                      在线
                    </span>
                  </div>
                  <p className="text-slate-500 text-sm mt-1">
                    {activeCategory} · 专业服务
                  </p>
                </div>

                {/* Current Category Badge */}
                <div className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  activeMode === 'casual' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                }`}>
                  {activeCategory}
                </div>
              </div>
            </div>

            {/* Input Area */}
            <div className="p-6 bg-gradient-to-br from-slate-50/50 to-white">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={activeMode === 'casual'
                  ? '请描述您想了解的产品，例如：我想了解家用咖啡机的品牌、价格和用户评价...'
                  : '请描述您的采购需求，例如：我需要采购50台笔记本电脑，预算1万每台，用于AI开发...'
                }
                className="w-full px-5 py-4 bg-white border border-slate-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400/80 focus:bg-white transition-all resize-none text-sm leading-relaxed shadow-inner hover:border-slate-300"
                rows={5}
              />
              <div className="flex items-center justify-between mt-5">
                <div className="text-xs text-slate-400 flex items-center gap-1.5">
                  <kbd className="px-2 py-1 bg-slate-100 rounded text-[10px] font-medium border border-slate-200">Enter</kbd>
                  <span>发送</span>
                  <kbd className="px-2 py-1 bg-slate-100 rounded text-[10px] font-medium border border-slate-200 ml-1">Shift + Enter</kbd>
                  <span>换行</span>
                </div>
                <button
                  onClick={handleSend}
                  disabled={!inputValue.trim()}
                  className={`px-8 py-3.5 rounded-xl font-semibold text-white transition-all flex items-center gap-2.5 shadow-lg ${
                    inputValue.trim()
                      ? activeMode === 'casual'
                        ? 'bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0'
                        : 'bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0'
                      : 'bg-gradient-to-br from-slate-200 to-slate-300 cursor-not-allowed opacity-70'
                  }`}
                >
                  <SendIcon className="w-4 h-4" />
                  开始对话
                </button>
              </div>
            </div>
          </div>

          {/* Quick Suggestions */}
          <div className="mt-10">
            <p className="text-center text-slate-400 text-sm mb-5 font-medium">💡 常用查询</p>
            <div className="flex flex-wrap gap-3 justify-center">
              {activeMode === 'casual' ? (
                <>
                  <button
                    onClick={() => setInputValue('最近有什么好的咖啡机推荐？预算5000以内，家用全自动')}
                    className="group px-5 py-3 bg-white hover:bg-gradient-to-br hover:from-blue-50 hover:to-blue-100 text-slate-600 text-sm rounded-xl border border-slate-200 transition-all duration-200 shadow-sm hover:shadow-md hover:border-blue-300 hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-base">☕</span>
                      <span>咖啡机推荐</span>
                    </span>
                  </button>
                  <button
                    onClick={() => setInputValue('电动车哪个牌子性价比高？续航和安全性怎么样')}
                    className="group px-5 py-3 bg-white hover:bg-gradient-to-br hover:from-blue-50 hover:to-blue-100 text-slate-600 text-sm rounded-xl border border-slate-200 transition-all duration-200 shadow-sm hover:shadow-md hover:border-blue-300 hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-base">🛵</span>
                      <span>电动车选购</span>
                    </span>
                  </button>
                  <button
                    onClick={() => setInputValue('空气炸锅和烤箱哪个更实用？请对比一下优缺点')}
                    className="group px-5 py-3 bg-white hover:bg-gradient-to-br hover:from-blue-50 hover:to-blue-100 text-slate-600 text-sm rounded-xl border border-slate-200 transition-all duration-200 shadow-sm hover:shadow-md hover:border-blue-300 hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-base">🍳</span>
                      <span>厨房电器对比</span>
                    </span>
                  </button>
                  <button
                    onClick={() => setInputValue('请推荐几款性价比高的扫地机器人，预算2000左右')}
                    className="group px-5 py-3 bg-white hover:bg-gradient-to-br hover:from-blue-50 hover:to-blue-100 text-slate-600 text-sm rounded-xl border border-slate-200 transition-all duration-200 shadow-sm hover:shadow-md hover:border-blue-300 hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-base">🤖</span>
                      <span>扫地机器人</span>
                    </span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setInputValue('我需要采购50台笔记本电脑，用于AI开发，关注CPU和内存，预算1万每台')}
                    className="group px-5 py-3 bg-white hover:bg-gradient-to-br hover:from-emerald-50 hover:to-emerald-100 text-slate-600 text-sm rounded-xl border border-slate-200 transition-all duration-200 shadow-sm hover:shadow-md hover:border-emerald-300 hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-base">💻</span>
                      <span>电脑采购</span>
                    </span>
                  </button>
                  <button
                    onClick={() => setInputValue('办公室装修项目，预算50万，需要寻找靠谱的装修公司和材料供应商')}
                    className="group px-5 py-3 bg-white hover:bg-gradient-to-br hover:from-emerald-50 hover:to-emerald-100 text-slate-600 text-sm rounded-xl border border-slate-200 transition-all duration-200 shadow-sm hover:shadow-md hover:border-emerald-300 hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-base">🏢</span>
                      <span>装修采购</span>
                    </span>
                  </button>
                  <button
                    onClick={() => setInputValue('寻找IT设备供应商，需要提供服务器、网络设备、存储设备等')}
                    className="group px-5 py-3 bg-white hover:bg-gradient-to-br hover:from-emerald-50 hover:to-emerald-100 text-slate-600 text-sm rounded-xl border border-slate-200 transition-all duration-200 shadow-sm hover:shadow-md hover:border-emerald-300 hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-base">🔧</span>
                      <span>供应商寻源</span>
                    </span>
                  </button>
                  <button
                    onClick={() => setInputValue('需要办公家具采购方案，包括办公桌椅、会议桌、文件柜等，100人规模')}
                    className="group px-5 py-3 bg-white hover:bg-gradient-to-br hover:from-emerald-50 hover:to-emerald-100 text-slate-600 text-sm rounded-xl border border-slate-200 transition-all duration-200 shadow-sm hover:shadow-md hover:border-emerald-300 hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-base">🪑</span>
                      <span>办公家具</span>
                    </span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right Side Floating Mode Switcher */}
      <div
        className="fixed right-0 top-1/2 -translate-y-1/2 z-40"
        onMouseEnter={() => setSliderOpen(true)}
        onMouseLeave={() => setSliderOpen(false)}
      >
        <div className={`relative bg-white rounded-l-2xl shadow-xl border border-slate-200 transition-all duration-300 ${
          sliderOpen ? 'pr-4 pl-6' : 'pr-0 pl-0'
        }`}>
          {/* Toggle Button */}
          <button className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full bg-white border-l-0 border border-slate-200 rounded-l-xl px-2 py-8 hover:bg-slate-50 transition-colors">
            {sliderOpen ? (
              <ChevronRightIcon className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronLeftIcon className="w-5 h-5 text-slate-400" />
            )}
          </button>

          {/* Mode Options */}
          <div className="py-6 space-y-4">
            {sliderOpen ? (
              <>
                {/* 小美 Option */}
                <button
                  onClick={() => {
                    setActiveMode('casual');
                    setActiveCategory('产品科普');
                  }}
                  className={`w-64 p-4 rounded-xl transition-all text-left ${
                    activeMode === 'casual'
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-100 to-pink-200 flex items-center justify-center">
                      <svg viewBox="0 0 64 64" className="w-6 h-6">
                        <circle cx="32" cy="32" r="20" fill="#FFDAB9" />
                        <path d="M12 32 Q12 12 32 12 Q52 12 52 32 Q52 24 48 20 Q44 16 40 16 Q36 16 32 16 Q28 16 24 16 Q20 16 16 20 Q12 24 12 32" fill="#4A3728" />
                        <ellipse cx="26" cy="30" rx="3" ry="4" fill="#333" />
                        <ellipse cx="38" cy="30" rx="3" ry="4" fill="#333" />
                        <path d="M27 40 Q32 44 37 40" stroke="#333" strokeWidth="2" fill="none" strokeLinecap="round" />
                        <circle cx="20" cy="36" r="3" fill="#FFB6C1" opacity="0.5" />
                        <circle cx="44" cy="36" r="3" fill="#FFB6C1" opacity="0.5" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-bold">买手助理小美</div>
                      <div className={`text-xs ${activeMode === 'casual' ? 'text-blue-100' : 'text-slate-400'}`}>
                        产品科普 · 质检 · 测评 · 价格
                      </div>
                    </div>
                  </div>
                  <p className={`text-xs ${activeMode === 'casual' ? 'text-blue-100' : 'text-slate-500'}`}>
                    您的私人买手，汇总全网产品信息、测评与价格
                  </p>
                </button>

                {/* 小帅 Option */}
                <button
                  onClick={() => {
                    setActiveMode('standard');
                    setActiveCategory('采购方案咨询');
                  }}
                  className={`w-64 p-4 rounded-xl transition-all text-left ${
                    activeMode === 'standard'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center">
                      <svg viewBox="0 0 64 64" className="w-6 h-6">
                        <circle cx="32" cy="32" r="20" fill="#FFE4C4" />
                        <path d="M10 28 Q10 10 32 10 Q54 10 54 28 L54 24 Q50 14 32 14 Q14 14 10 24 Z" fill="#2C1810" />
                        <rect x="20" y="28" width="10" height="8" rx="2" fill="none" stroke="#1a1a1a" strokeWidth="2" />
                        <rect x="34" y="28" width="10" height="8" rx="2" fill="none" stroke="#1a1a1a" strokeWidth="2" />
                        <line x1="30" y1="32" x2="34" y2="32" stroke="#1a1a1a" strokeWidth="2" />
                        <circle cx="25" cy="32" r="2" fill="#333" />
                        <circle cx="39" cy="32" r="2" fill="#333" />
                        <path d="M28 42 Q32 45 36 42" stroke="#333" strokeWidth="2" fill="none" strokeLinecap="round" />
                        <path d="M32 52 L28 58 L32 60 L36 58 L32 52" fill="#10B981" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-bold">采购专家小帅</div>
                      <div className={`text-xs ${activeMode === 'standard' ? 'text-emerald-100' : 'text-slate-400'}`}>
                        采购方案 · 需求生成 · 供应商寻源
                      </div>
                    </div>
                  </div>
                  <p className={`text-xs ${activeMode === 'standard' ? 'text-emerald-100' : 'text-slate-500'}`}>
                    企业级采购服务，提供专业方案与供应商管理
                  </p>
                </button>
              </>
            ) : (
              <div className="py-8">
                <div className="w-2 h-16 rounded-full bg-gradient-to-b from-blue-500 to-emerald-500"></div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 py-4 text-center">
        <p className="text-slate-400 text-sm">© 2026 ProcureAI · 智能采购 · 效率优先</p>
      </footer>
    </div>
  );
};

export default ChatHomeView;
