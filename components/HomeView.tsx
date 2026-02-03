
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { SparklesIcon, CheckIcon, GiftIcon, UserIcon, ChevronRightIcon, SearchIcon } from './Icons';
import { User } from '../types';
import UserAvatar from './UserAvatar';

interface HomeViewProps {
  onSelectMode: (mode: 'casual' | 'standard', categoryCode?: string) => void;
  onLoginRequest: () => void;
  onGoToUserCenter?: () => void;
  user: User | null;
}

interface ProcurementCategory {
  _id: string;
  name: string;
  code: string;
  description: string;
  keywords: string[];
  enabled: boolean;
  priority: number;
  l1Category?: string;
  l2Category?: string;
  l3Category?: string;
  score?: number; // 用于搜索排序
}

/**
 * Toast Notification Component
 */
const Toast: React.FC<{ message: string; isVisible: boolean; onClose: () => void }> = ({ message, isVisible, onClose }) => {
    useEffect(() => {
        if (isVisible) {
            const timer = setTimeout(onClose, 2000);
            return () => clearTimeout(timer);
        }
    }, [isVisible, onClose]);

    return (
        <div className={`fixed top-24 left-1/2 transform -translate-x-1/2 z-[100] transition-all duration-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
            <div className="bg-slate-800 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium">
                <SparklesIcon className="w-4 h-4 text-yellow-400" />
                {message}
            </div>
        </div>
    );
};

/**
 * Dynamic Particle Background
 */
const ParticleBackground: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = canvas.width = window.innerWidth;
        let height = canvas.height = window.innerHeight;

        const particles: Particle[] = [];
        const particleCount = Math.min(Math.floor(width * height / 15000), 100); 
        const connectionDistance = 120;
        const mouseDistance = 150;

        let mouseX = -1000;
        let mouseY = -1000;

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

                const dx = mouseX - this.x;
                const dy = mouseY - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < mouseDistance) {
                    const forceDirectionX = dx / distance;
                    const forceDirectionY = dy / distance;
                    const force = (mouseDistance - distance) / mouseDistance;
                    this.vx -= forceDirectionX * force * 0.05;
                    this.vy -= forceDirectionY * force * 0.05;
                }
            }

            draw() {
                if (!ctx) return;
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
            if (!ctx) return;
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

                const dx = mouseX - p.x;
                const dy = mouseY - p.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < mouseDistance) {
                     ctx.beginPath();
                     ctx.strokeStyle = `rgba(59, 130, 246, ${1 - distance / mouseDistance})`; 
                     ctx.lineWidth = 0.8;
                     ctx.moveTo(p.x, p.y);
                     ctx.lineTo(mouseX, mouseY);
                     ctx.stroke();
                }
            });

            requestAnimationFrame(animate);
        };

        animate();

        const handleResize = () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        };

        const handleMouseMove = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            mouseX = e.clientX - rect.left;
            mouseY = e.clientY - rect.top;
        };
        
        const handleMouseLeave = () => {
            mouseX = -1000;
            mouseY = -1000;
        }

        window.addEventListener('resize', handleResize);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseout', handleMouseLeave);

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseout', handleMouseLeave);
        };
    }, []);

    return <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />;
};

/**
 * Customer Logo Component
 */
const CompanyLogo: React.FC<{ name: string; type: 'alibaba' | 'tencent' | 'bytedance' | 'deepseek' | 'zhipu' | 'moonshot' | 'minimax' | 'meituan' }> = ({ name, type }) => {
    return (
        <div className="flex items-center gap-2 group cursor-default grayscale hover:grayscale-0 transition-all duration-300 opacity-60 hover:opacity-100">
             <div className="w-8 h-8 rounded flex items-center justify-center shrink-0">
                {type === 'alibaba' && <span className="font-bold text-orange-500 text-xl italic">Al</span>}
                {type === 'tencent' && <span className="font-bold text-blue-600 text-lg">T</span>}
                {type === 'bytedance' && (
                    <div className="flex space-x-0.5">
                        <div className="w-1.5 h-4 bg-cyan-400 -skew-x-12"></div>
                        <div className="w-1.5 h-5 bg-blue-500 -skew-x-12"></div>
                    </div>
                )}
                {type === 'meituan' && <div className="w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center text-xs font-bold text-black">M</div>}
                {type === 'deepseek' && <div className="w-6 h-6 bg-blue-700 text-white flex items-center justify-center font-serif font-bold text-xs rounded-tr-lg rounded-bl-lg">DS</div>}
                {type === 'zhipu' && <div className="w-6 h-6 border-2 border-purple-600 rounded-full flex items-center justify-center text-[10px] font-bold text-purple-600">GL</div>}
                {type === 'moonshot' && <div className="w-6 h-6 bg-black rounded-full flex items-center justify-center"><div className="w-2 h-2 bg-white rounded-full"></div></div>}
                {type === 'minimax' && <span className="font-bold text-red-500 text-xl">M</span>}
             </div>
             <span className="font-semibold text-slate-600 group-hover:text-slate-900 text-sm md:text-base">{name}</span>
        </div>
    );
};

/**
 * Navbar Component
 */
const Navbar: React.FC<{ onShowToast: (msg: string) => void; onLoginRequest: () => void; onGoToUserCenter?: () => void; user: User | null }> = ({ onShowToast, onLoginRequest, onGoToUserCenter, user }) => {
    return (
        <nav className="fixed top-0 left-0 right-0 z-50 h-16 bg-slate-50/80 backdrop-blur-md border-b border-slate-200/50 flex items-center justify-between px-6 transition-all">
            <div className="flex items-center gap-3">
                 {/* Logo Icon */}
                 <div className="w-9 h-9 relative">
                    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full drop-shadow-md">
                      <defs>
                        <linearGradient id="navLogoGradient" x1="0" y1="0" x2="64" y2="64">
                          <stop offset="0%" stop-color="#3B82F6"/>
                          <stop offset="100%" stop-color="#10B981"/>
                        </linearGradient>
                        <linearGradient id="navSparkleGradient" x1="0" y1="0" x2="64" y2="64">
                          <stop offset="0%" stop-color="#FCD34D"/>
                          <stop offset="100%" stop-color="#F59E0B"/>
                        </linearGradient>
                      </defs>
                      <circle cx="32" cy="32" r="30" fill="url(#navLogoGradient)"/>
                      <path d="M22 12 L42 12 L46 20 L46 48 C46 52 42 54 32 54 C22 54 18 52 18 48 L22 40 L34 40 L34 28 L22 28 Z" fill="white" opacity="0.95"/>
                      <g transform="translate(44 18)">
                        <circle r="6" fill="url(#navSparkleGradient)"/>
                        <path d="M0 -4 L0 4 M-4 0 L4 0" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                        <circle r="2" fill="white"/>
                      </g>
                      <circle cx="28" cy="34" r="2" fill="url(#navLogoGradient)"/>
                      <circle cx="36" cy="34" r="2" fill="url(#navLogoGradient)"/>
                    </svg>
                 </div>
                 {/* Brand Text */}
                 <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-emerald-600 tracking-tight">
                    ProcureAI
                 </span>
            </div>

            <div className="flex items-center gap-4">
                 <button 
                    onClick={() => onShowToast('积分系统即将上线，敬请期待！')}
                    className="flex items-center gap-1.5 text-slate-500 hover:text-blue-600 font-medium text-sm transition-colors"
                 >
                    <GiftIcon className="w-4 h-4" />
                    <span>领取积分</span>
                 </button>
                 
                 <button 
                    onClick={() => {
                        document.getElementById('pricing-section')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="hidden md:block text-slate-500 hover:text-slate-800 font-medium text-sm transition-colors"
                 >
                    价格
                 </button>

                 {user ? (
                   <button
                     onClick={onGoToUserCenter || (() => onShowToast('用户中心功能开发中'))}
                     className="flex items-center gap-2 px-2 py-1 bg-blue-50 text-blue-600 rounded-lg border border-blue-100 transition-all hover:bg-blue-100"
                   >
                      <UserAvatar avatarType={user.avatar || 'blue'} size="sm" />
                      <span className="text-xs font-bold truncate max-w-[100px]">{user.name}</span>
                   </button>
                 ) : (
                   <button 
                      onClick={onLoginRequest}
                      className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all"
                   >
                      登录
                   </button>
                 )}
            </div>
        </nav>
    );
};

/**
 * Pricing Card Component
 */
const PricingCard: React.FC<{
    title: string;
    price: string;
    period?: string;
    features: string[];
    isPopular?: boolean;
    buttonText?: string;
    subPrice?: string;
    onAction: () => void;
}> = ({ title, price, period, features, isPopular, buttonText = "当前计划", subPrice, onAction }) => {
    return (
        <div className={`relative p-8 rounded-2xl bg-white border ${isPopular ? 'border-teal-500 shadow-xl scale-105 z-10' : 'border-slate-100 shadow-lg'} flex flex-col transition-transform duration-300 hover:-translate-y-1`}>
            {isPopular && (
                <div className="absolute top-0 right-0 bg-teal-100 text-teal-700 text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl">
                    PLUS
                </div>
            )}
            
            <div className="mb-6">
                <span className="inline-block px-3 py-1 bg-slate-100 text-slate-600 text-xs font-semibold rounded-full mb-4">
                    {title}
                </span>
                <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-slate-800">{price}</span>
                    {period && <span className="text-slate-500 text-sm">{period}</span>}
                </div>
                {subPrice && <p className="text-xs text-teal-600 mt-1 font-medium">{subPrice}</p>}
                {!subPrice && <p className="text-xs text-slate-400 mt-1 h-4"> </p>}
            </div>

            <div className="flex-1 space-y-4 mb-8">
                {features.map((feat, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm text-slate-600">
                        <CheckIcon className="w-4 h-4 text-teal-500 mt-0.5 shrink-0" />
                        <span>{feat}</span>
                    </div>
                ))}
            </div>

            <button 
                onClick={onAction}
                className={`w-full py-3 rounded-xl font-semibold transition-all ${
                    isPopular 
                    ? 'bg-teal-600 text-white hover:bg-teal-700 shadow-md' 
                    : 'bg-slate-500 text-white hover:bg-slate-600'
                }`}
            >
                {buttonText}
            </button>
        </div>
    );
};

const HomeView: React.FC<HomeViewProps> = ({ onSelectMode, onLoginRequest, onGoToUserCenter, user }) => {
  const [selectedMode, setSelectedMode] = useState<'casual' | 'standard' | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<ProcurementCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [toast, setToast] = useState<{ msg: string; show: boolean }>({ msg: '', show: false });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedL1Category, setSelectedL1Category] = useState<string>('all');

  const showToast = (msg: string) => {
      setToast({ msg, show: true });
  };

  // 加载采购品类列表
  useEffect(() => {
    if (selectedMode === 'standard' && user) {
      loadCategories();
    } else if (!user) {
      setCategories([]);
      setLoadingCategories(false);
    }
  }, [selectedMode, user]);

  const loadCategories = async () => {
    if (!user) {
      setCategories([]);
      setLoadingCategories(false);
      return;
    }

    try {
      setLoadingCategories(true);
      const API_BASE_URL = (import.meta.env as any).VITE_API_URL || 'http://localhost:3001/api';
      const token = localStorage.getItem('procureai_token');

      if (!token) {
        console.warn('No auth token found');
        setCategories([]);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/procurement-categories`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        const categoriesData = Array.isArray(result.data) ? result.data : [];
        console.log('Loaded categories:', categoriesData.length, categoriesData);
        setCategories(categoriesData);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to load categories:', response.status, errorData);
        setCategories([]);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      setCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  };

  // 调试日志
  useEffect(() => {
    console.log('HomeView state:', { selectedMode, user: !!user, categoriesCount: categories.length, loadingCategories });
  }, [selectedMode, user, categories, loadingCategories]);

  // 提取一级品类列表
  const l1Categories = useMemo(() => {
    const l1Set = new Set<string>();
    categories.forEach(cat => {
      if (cat.l1Category) l1Set.add(cat.l1Category);
    });
    return ['all', ...Array.from(l1Set).sort()];
  }, [categories]);

  // 过滤和搜索品类
  const filteredCategories = useMemo(() => {
    let filtered = [...categories];

    // 按一级品类过滤
    if (selectedL1Category !== 'all') {
      filtered = filtered.filter(cat => cat.l1Category === selectedL1Category);
    }

    // 按搜索词过滤
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(cat => {
        const matchName = cat.name.toLowerCase().includes(term);
        const matchKeywords = cat.keywords?.some(kw => kw.toLowerCase().includes(term));
        const matchL1 = cat.l1Category?.toLowerCase().includes(term);
        const matchL2 = cat.l2Category?.toLowerCase().includes(term);
        const matchDescription = cat.description?.toLowerCase().includes(term);
        return matchName || matchKeywords || matchL1 || matchL2 || matchDescription;
      });
    }

    return filtered;
  }, [categories, searchTerm, selectedL1Category]);

  // 智能推荐：根据搜索词匹配度排序
  const rankedCategories = useMemo(() => {
    if (!searchTerm.trim()) return filteredCategories;

    const term = searchTerm.toLowerCase().trim();
    return filteredCategories.map(cat => {
      let score = 0;

      // 名称完全匹配
      if (cat.name.toLowerCase() === term) score += 100;
      // 名称包含匹配
      else if (cat.name.toLowerCase().includes(term)) score += 50;

      // 关键词匹配
      const keywordMatch = cat.keywords?.find(kw => kw.toLowerCase() === term);
      if (keywordMatch) score += 40;
      else if (cat.keywords?.some(kw => kw.toLowerCase().includes(term))) score += 20;

      // 描述匹配
      if (cat.description?.toLowerCase().includes(term)) score += 10;

      // 一级品类匹配
      if (cat.l1Category?.toLowerCase().includes(term)) score += 30;

      // 二级品类匹配
      if (cat.l2Category?.toLowerCase().includes(term)) score += 25;

      return { ...cat, score };
    }).sort((a, b) => b.score - a.score);
  }, [filteredCategories, searchTerm]);

  const displayCategories = searchTerm.trim() ? rankedCategories : filteredCategories;

  const handleSelectCategory = (categoryCode: string) => {
    setSelectedCategory(categoryCode);
    onSelectMode('standard', categoryCode);
  };

  return (
    <div className="relative h-screen bg-slate-50 overflow-y-scroll snap-y snap-mandatory scroll-smooth">
      <Toast message={toast.msg} isVisible={toast.show} onClose={() => setToast(p => ({ ...p, show: false }))} />
      <Navbar onShowToast={showToast} onLoginRequest={onLoginRequest} onGoToUserCenter={onGoToUserCenter} user={user} />

      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col snap-start">
          {/* 动态粒子背景 */}
          <ParticleBackground />

          {/* 主体内容 */}
          <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 text-center pt-28 pb-10">
              <div className="mb-12 animate-fadeIn">
                <h1 className="text-4xl font-extrabold text-slate-800 mb-3 tracking-tight">AI采购助手天团</h1>
                <p className="text-slate-500 text-lg md:text-xl font-light">既是小助理，亦是大专家</p>
              </div>

              <div className="w-full max-w-sm space-y-4 relative">
                {/* Casual Button */}
                <button
                  onClick={() => setSelectedMode('casual')}
                  className={`w-full p-4 rounded-xl transition-all duration-300 border shadow-sm flex items-center justify-center gap-3 backdrop-blur-sm
                    ${selectedMode === 'casual'
                      ? 'bg-blue-600/90 text-white border-blue-600 shadow-blue-200 ring-2 ring-blue-200 transform scale-105'
                      : 'bg-white/80 text-slate-700 hover:bg-white hover:text-blue-600 border-slate-200 hover:shadow-md'
                    }`}
                >
                  {/* 小美头像 - SVG */}
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-100 to-pink-200 flex items-center justify-center overflow-hidden">
                    <svg viewBox="0 0 64 64" className="w-full h-full">
                      {/* 脸部 */}
                      <circle cx="32" cy="32" r="20" fill="#FFDAB9" />
                      {/* 头发 */}
                      <path d="M12 32 Q12 12 32 12 Q52 12 52 32 Q52 24 48 20 Q44 16 40 16 Q36 16 32 16 Q28 16 24 16 Q20 16 16 20 Q12 24 12 32" fill="#4A3728" />
                      {/* 眼睛 */}
                      <ellipse cx="26" cy="30" rx="3" ry="4" fill="#333" />
                      <ellipse cx="38" cy="30" rx="3" ry="4" fill="#333" />
                      {/* 微笑 */}
                      <path d="M27 40 Q32 44 37 40" stroke="#333" strokeWidth="2" fill="none" strokeLinecap="round" />
                      {/* 腮红 */}
                      <circle cx="20" cy="36" r="3" fill="#FFB6C1" opacity="0.5" />
                      <circle cx="44" cy="36" r="3" fill="#FFB6C1" opacity="0.5" />
                    </svg>
                  </div>
                  <span className="font-semibold text-lg">买手助理小美</span>
                </button>

                {/* Standard Button */}
                <button
                  onClick={() => setSelectedMode('standard')}
                  className={`w-full p-4 rounded-xl transition-all duration-300 border shadow-sm flex items-center justify-center gap-3 backdrop-blur-sm
                    ${selectedMode === 'standard'
                      ? 'bg-emerald-600/90 text-white border-emerald-600 shadow-emerald-200 ring-2 ring-emerald-200 transform scale-105'
                      : 'bg-white/80 text-slate-700 hover:bg-white hover:text-emerald-600 border-slate-200 hover:shadow-md'
                    }`}
                >
                  {/* 小帅头像 - SVG */}
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center overflow-hidden">
                    <svg viewBox="0 0 64 64" className="w-full h-full">
                      {/* 脸部 */}
                      <circle cx="32" cy="32" r="20" fill="#FFE4C4" />
                      {/* 头发 */}
                      <path d="M10 28 Q10 10 32 10 Q54 10 54 28 L54 24 Q50 14 32 14 Q14 14 10 24 Z" fill="#2C1810" />
                      {/* 眼镜 */}
                      <rect x="20" y="28" width="10" height="8" rx="2" fill="none" stroke="#1a1a1a" strokeWidth="2" />
                      <rect x="34" y="28" width="10" height="8" rx="2" fill="none" stroke="#1a1a1a" strokeWidth="2" />
                      <line x1="30" y1="32" x2="34" y2="32" stroke="#1a1a1a" strokeWidth="2" />
                      {/* 眼睛 */}
                      <circle cx="25" cy="32" r="2" fill="#333" />
                      <circle cx="39" cy="32" r="2" fill="#333" />
                      {/* 微笑 */}
                      <path d="M28 42 Q32 45 36 42" stroke="#333" strokeWidth="2" fill="none" strokeLinecap="round" />
                      {/* 领带 */}
                      <path d="M32 52 L28 58 L32 60 L36 58 L32 52" fill="#10B981" />
                    </svg>
                  </div>
                  <span className="font-semibold text-lg">采购专家小帅</span>
                </button>
              </div>

              {/* Mode Description Area */}
              <div className={`mt-8 w-full max-w-sm bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-slate-100 transition-all duration-500 ease-in-out ${selectedMode ? 'opacity-100 translate-y-0 h-auto' : 'opacity-0 translate-y-4 h-0 overflow-hidden py-0 border-0 shadow-none'}`}>
                {selectedMode === 'casual' && (
                  <div className="text-left animate-fadeIn">
                    <h3 className="flex items-center gap-2 text-blue-600 font-bold text-lg mb-3">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-pink-100 to-pink-200 flex items-center justify-center overflow-hidden">
                        <svg viewBox="0 0 64 64" className="w-full h-full">
                          <circle cx="32" cy="32" r="20" fill="#FFDAB9" />
                          <path d="M12 32 Q12 12 32 12 Q52 12 52 32 Q52 24 48 20 Q44 16 40 16 Q36 16 32 16 Q28 16 24 16 Q20 16 16 20 Q12 24 12 32" fill="#4A3728" />
                          <ellipse cx="26" cy="30" rx="3" ry="4" fill="#333" />
                          <ellipse cx="38" cy="30" rx="3" ry="4" fill="#333" />
                          <path d="M27 40 Q32 44 37 40" stroke="#333" strokeWidth="2" fill="none" strokeLinecap="round" />
                          <circle cx="20" cy="36" r="3" fill="#FFB6C1" opacity="0.5" />
                          <circle cx="44" cy="36" r="3" fill="#FFB6C1" opacity="0.5" />
                        </svg>
                      </div>
                      买手助理小美
                    </h3>
                    <p className="text-slate-600 mb-4 text-sm leading-relaxed">
                      您的私人买手，根据您关注的商品/服务，汇总小红书/视频号/抖音/快手等各个社交媒体渠道的测评分享、KOL带货信息，以及天猫、淘宝、1688、咸鱼、PDD、JD、微店等电商的价格信息，帮您轻松完成购买决策。
                    </p>
                    <ul className="space-y-2 text-slate-500 text-sm mb-6">
                      <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>个性化推荐，发现好物</li>
                      <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>智能比价，性价比优选</li>
                    </ul>
                    <button 
                      onClick={() => onSelectMode('casual')}
                      className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                    >
                      与助理小美对话
                    </button>
                  </div>
                )}

                {selectedMode === 'standard' && (
                  <div className="text-left animate-fadeIn">
                    {!selectedCategory ? (
                      <>
                        <h3 className="flex items-center gap-2 text-emerald-600 font-bold text-lg mb-3">
                          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center overflow-hidden">
                            <svg viewBox="0 0 64 64" className="w-full h-full">
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
                          采购专家小帅
                        </h3>
                        <p className="text-slate-600 mb-4 text-sm leading-relaxed">
                          请选择您的采购品类，系统将根据品类提供专业的企业级采购需求调研、供应商寻源及资质审查：
                        </p>

                        {/* 搜索和筛选区域 */}
                        <div className="mb-4 space-y-3">
                          {/* 搜索框 */}
                          <div className="relative">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                              type="text"
                              placeholder="搜索品类（如：服务器、装修、咨询）..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                            />
                          </div>

                          {/* 一级品类筛选 */}
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => setSelectedL1Category('all')}
                              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
                                selectedL1Category === 'all'
                                  ? 'bg-emerald-600 text-white shadow-md'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              全部 ({categories.length})
                            </button>
                            {l1Categories.slice(1).map(l1 => (
                              <button
                                key={l1}
                                onClick={() => setSelectedL1Category(l1)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
                                  selectedL1Category === l1
                                    ? 'bg-emerald-600 text-white shadow-md'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                {l1} ({categories.filter(c => c.l1Category === l1).length})
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* 搜索结果提示 */}
                        {searchTerm && (
                          <div className="mb-3 text-xs text-slate-500">
                            找到 <span className="font-semibold text-emerald-600">{displayCategories.length}</span> 个相关品类
                            {displayCategories.length > 0 && (displayCategories[0] as any).score > 0 && '（按相关度排序）'}
                          </div>
                        )}

                        {loadingCategories ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                          </div>
                        ) : displayCategories.length === 0 ? (
                          <div className="text-center py-8 text-slate-400">
                            <SearchIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p className="text-sm">未找到匹配的品类</p>
                            <p className="text-xs mt-1">请尝试其他关键词</p>
                          </div>
                        ) : (
                          <div className="space-y-2 mb-6 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                            {displayCategories.map((category) => (
                              <button
                                key={category._id}
                                onClick={() => handleSelectCategory(category.code)}
                                className="w-full p-3 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-lg transition-all text-left group"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <div className="font-medium text-slate-700 group-hover:text-emerald-700 truncate">{category.name}</div>
                                      {/* 搜索匹配度指示器 */}
                                      {searchTerm && (category as any).score > 0 && (
                                        <span className="flex-shrink-0 px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded">
                                          {(category as any).score > 80 ? '精准' : (category as any).score > 40 ? '相关' : '可能'}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-xs text-slate-500 truncate">{category.description}</div>
                                    {/* 显示关键词标签 */}
                                    {category.keywords && category.keywords.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-1.5">
                                        {category.keywords.slice(0, 3).map((kw, idx) => (
                                          <span key={idx} className="px-1.5 py-0.5 bg-slate-100 text-slate-400 text-xs rounded">
                                            {kw}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  <ChevronRightIcon className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 flex-shrink-0 ml-2" />
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <h3 className="flex items-center gap-2 text-emerald-600 font-bold text-lg mb-3">
                          <CheckIcon className="w-5 h-5" />
                          已选择品类
                        </h3>
                        <p className="text-slate-600 mb-4 text-sm">
                          系统将根据所选品类的模板为您生成专业的采购需求清单
                        </p>
                        <div className="bg-emerald-50 p-3 rounded-lg mb-4">
                          <div className="text-sm font-medium text-emerald-700">
                            {categories.find(c => c.code === selectedCategory)?.name}
                          </div>
                        </div>
                        <button
                          onClick={() => setSelectedCategory(null)}
                          className="text-sm text-slate-500 hover:text-emerald-600 underline"
                        >
                          重新选择品类
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
          </div>
          
           {/* 客户墙 - Fixed at bottom of hero section */}
           <div className="relative z-10 bg-white/60 backdrop-blur-sm border-t border-slate-200">
              <div className="max-w-6xl mx-auto px-6 py-8">
                  <h4 className="text-center text-slate-400 text-sm font-semibold uppercase tracking-widest mb-8">
                      我们的合作伙伴
                  </h4>
                  <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-8 opacity-90">
                      <CompanyLogo type="alibaba" name="Alibaba Cloud" />
                      <CompanyLogo type="tencent" name="Tencent" />
                      <CompanyLogo type="bytedance" name="ByteDance" />
                      <CompanyLogo type="meituan" name="Meituan" />
                      
                      <div className="hidden md:block w-px h-8 bg-slate-300 mx-2"></div>

                      <CompanyLogo type="deepseek" name="DeepSeek" />
                      <CompanyLogo type="zhipu" name="Zhipu AI" />
                      <CompanyLogo type="moonshot" name="Moonshot AI" />
                      <CompanyLogo type="minimax" name="MiniMax" />
                  </div>
              </div>
          </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing-section" className="relative z-10 bg-slate-50 py-24 px-6 min-h-screen snap-start flex items-center justify-center">
          <div className="max-w-6xl mx-auto w-full">
              <div className="text-center mb-16">
                  <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">订阅计划与价格</h2>
                  <p className="text-slate-500">选择适合您团队的采购智能化方案</p>
              </div>

              <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto items-center">
                  <PricingCard 
                      title="Free"
                      price="免费"
                      features={[
                          "注册获得100积分",
                          "访问个人采购助理",
                          "允许3个上传分析",
                          "基础采购建议"
                      ]}
                      buttonText="当前计划"
                      onAction={() => showToast('免费计划已包含在您的账户中')}
                  />
                  <PricingCard 
                      title="PLUS"
                      price="19.9元"
                      period="/月"
                      subPrice="每月节省 20"
                      isPopular={true}
                      features={[
                          "每月2,000积分",
                          "包含所有 Free 功能",
                          "解锁规范采购模式",
                          "文档生成 (30篇/月)",
                          "优先客户支持"
                      ]}
                      buttonText="升级到 PLUS"
                      onAction={() => showToast('支付系统即将上线')}
                  />
                  <PricingCard 
                      title="PRO"
                      price="2000"
                      period="/月"
                      subPrice="每月节省 100"
                      features={[
                          "每月14,000积分",
                          "包含所有 PLUS 功能",
                          "无限次文档生成",
                          "多账号团队协作",
                          "专属客户经理"
                      ]}
                      buttonText="升级到 PRO"
                      onAction={() => showToast('支付系统即将上线')}
                  />
              </div>
          </div>
      </section>
    </div>
  );
};

export default HomeView;
