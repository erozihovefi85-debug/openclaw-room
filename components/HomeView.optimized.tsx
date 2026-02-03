import React, { useState, useEffect, useRef } from 'react';
import { SparklesIcon, CheckIcon, GiftIcon, UserIcon, ChevronRightIcon, SearchIcon } from './Icons';
import { User } from '../types';
import UserAvatar, { AVATAR_OPTIONS } from './UserAvatar';
import { getThemeClasses, THEME_COLORS, SPACING } from '../utils/theme';

interface HomeViewProps {
  onSelectMode: (mode: 'casual' | 'standard', categoryCode?: string) => void;
  onLoginRequest: () => void;
  onGoToUserCenter?: () => void;
  user: User | null;
}

// Toast Notification Component
const Toast: React.FC<{ message: string; isVisible: boolean; onClose: () => void }> = ({ message, isVisible, onClose }) => {
    useEffect(() => {
        if (isVisible) {
            const timer = setTimeout(onClose, 2000);
            return () => clearTimeout(timer);
        }
    }, [isVisible, onClose]);

    return (
        <div className={`fixed top-24 left-1/2 transform -translate-x-1/2 z-[600] transition-all duration-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
            <div className="bg-slate-800 text-white px-6 py-3.5 rounded-full shadow-xl flex items-center gap-3">
                <SparklesIcon className="w-5 h-5 text-yellow-400" />
                {message}
            </div>
        </div>
    );
};

const CompanyLogo: React.FC<{ type: 'alibaba' | 'tencent' | 'bytedance' | 'meituan' | 'deepseek' | 'zhipu' | 'moonshot' | 'minimax'; name: string }> = ({ type }) => {
  const gradients = {
    alibaba: 'from-orange-500 to-orange-600',
    tencent: 'from-blue-500 to-blue-600',
    bytedance: 'from-pink-500 to-pink-600',
    meituan: 'from-yellow-500 to-yellow-600',
    deepseek: 'from-cyan-500 to-cyan-600',
    zhipu: 'from-green-500 to-green-600',
    moonshot: 'from-indigo-500 to-indigo-600',
    minimax: 'from-purple-500 to-purple-600',
  };

  return (
    <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${gradients[type]} flex items-center justify-center text-white font-bold text-lg shadow-md hover:shadow-lg transition-shadow hover:scale-105`}>
      {name.charAt(0)}
    </div>
  );
};

const PricingCard: React.FC<{
  title: string;
  price: string;
  period: string;
  subPrice?: string;
  isPopular?: boolean;
  features: string[];
  buttonText: string;
  onAction: () => void;
}> = ({ title, price, period, subPrice, isPopular, features, buttonText, onAction }) => {
  const themeClasses = {
    primary: 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700',
    popular: 'border-2 border-yellow-400 ring-2 ring-yellow-200',
  };

  return (
    <div className={`bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all ${isPopular ? themeClasses.popular : 'border border-slate-200'}`}>
      {isPopular && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full">
            最受欢迎
          </span>
        </div>
      )}

      <div className="mb-4">
        <h3 className="text-xl font-bold text-slate-800">{title}</h3>
      </div>

      <div className="mb-6 text-center">
        <div className="text-4xl font-black">
          {price}
          <span className="text-lg font-medium text-slate-500">{period}</span>
        </div>
        {subPrice && (
          <div className="text-sm text-emerald-600 font-medium">
            {subPrice}
          </div>
        )}
      </div>

      <ul className="space-y-3 mb-6">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-3">
            <CheckIcon className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
            <span className="text-slate-700 text-sm">{feature}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={onAction}
        className={`w-full py-3 rounded-xl font-medium transition-all ${themeClasses.primary}`}
      >
        {buttonText}
      </button>
    </div>
  );
};

const HomeView: React.FC<HomeViewProps> = ({
  onSelectMode,
  onLoginRequest,
  onGoToUserCenter,
  user
}) => {
  const [selectedMode, setSelectedMode] = useState<'casual' | 'standard'>('casual');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const procurementCategories = [
    { _id: 'office', name: '办公用品', code: 'OFFICE', description: '纸张、文具、打印机', enabled: true, priority: 1, l1Category: 'OFFICE', l2Category: 'OFFICE' },
    { _id: 'it', name: 'IT设备', code: 'IT', description: '电脑、服务器、网络设备', enabled: true, priority: 2, l1Category: 'IT', l2Category: 'HARDWARE' },
    { _id: 'mro', name: '工程材料', code: 'MRO', description: '钢材、水泥、建材', enabled: true, priority: 3, l1Category: 'INDUSTRY', l2Category: 'MRO' },
    { _id: 'service', name: '商务服务', code: 'SERVICE', description: '咨询、培训、外包', enabled: true, priority: 4, l1Category: 'SERVICE', l2Category: 'BUSINESS' },
  ];

  const handleModeSelect = (mode: 'casual' | 'standard') => {
    setSelectedMode(mode);
    const classes = getThemeClasses(mode);
    onSelectMode(mode, mode === 'casual' ? undefined : undefined);
  };

  const showToastMessage = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
  };

  return (
    <div className={`min-h-screen bg-gradient-to-b ${THEME_COLORS[selectedMode].background}`}>
      {/* Toast Notification */}
      <Toast message={toastMessage} isVisible={showToast} onClose={() => setShowToast(false)} />

      {/* Header */}
      <header className={`px-6 py-4 ${selectedMode === 'casual' ? 'bg-gradient-to-r from-pink-500 to-pink-600' : 'bg-gradient-to-r from-emerald-500 to-emerald-600'} text-white shadow-lg`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-white/20 rounded-full">
                {selectedMode === 'casual' ? (
                  <UserAvatar avatarType={user?.avatar || 'blue'} size="sm" />
                ) : (
                  <DocumentIcon className="w-6 h-6" />
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold">{selectedMode === 'casual' ? '私人买手助理' : '规范采购助手'}</h1>
                <p className="text-sm opacity-90">ProcureAI Agent</p>
              </div>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                <UserAvatar avatarType={user.avatar || 'blue'} size="md" />
                <div className="text-right">
                  <p className="font-semibold">{user.name}</p>
                  <p className="text-xs opacity-80">{user.credits || 0} 积分</p>
                </div>
              </div>
            ) : (
              <button
                onClick={onLoginRequest}
                className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-full flex items-center gap-2 transition-all"
              >
                <UserIcon className="w-5 h-5" />
                <span className="font-semibold">登录</span>
              </button>
            )}

            <button
              onClick={onGoToUserCenter}
              className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition-all"
              title="用户中心"
            >
              <ChevronRightIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-6 py-16 bg-white/50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-slate-800 mb-4">
              {selectedMode === 'casual' ? '随心所购，AI比价' : '规范采购，智能寻源'}
            </h2>
            <p className="text-lg text-slate-600">
              {selectedMode === 'casual'
                ? '让小美帮您找到全网最优价格，享受便捷购物体验'
                : '让小帅协助您完成企业采购需求，从需求澄清到供应商对接全流程支持'}
            </p>
          </div>

          {/* Mode Toggle */}
          <div className="flex justify-center gap-4 mb-12">
            <button
              onClick={() => handleModeSelect('casual')}
              className={`flex-1 p-6 rounded-2xl text-center transition-all ${
                selectedMode === 'casual'
                  ? 'ring-2 ring-pink-200 bg-pink-50 shadow-xl'
                  : 'bg-white hover:bg-slate-50 hover:shadow-md border border-slate-200'
              }`}
            >
              <div className="text-4xl mb-2">💁</div>
              <h3 className="text-lg font-bold text-slate-800">随心采购</h3>
              <p className="text-sm text-slate-500">日常购物助手</p>
            </button>

            <button
              onClick={() => handleModeSelect('standard')}
              className={`flex-1 p-6 rounded-2xl text-center transition-all ${
                selectedMode === 'standard'
                  ? 'ring-2 ring-emerald-200 bg-emerald-50 shadow-xl'
                  : 'bg-white hover:bg-slate-50 hover:shadow-md border border-slate-200'
              }`}
            >
              <div className="text-4xl mb-2">📋</div>
              <h3 className="text-lg font-bold text-slate-800">规范采购</h3>
              <p className="text-sm text-slate-500">企业采购助手</p>
            </button>
          </div>

          {/* Search Bar */}
          <div className="max-w-3xl mx-auto mb-12">
            <div className="relative">
              <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder={selectedMode === 'casual' ? '搜索商品、比价...' : '搜索供应商、产品...'}
                className="w-full pl-12 pr-4 py-3.5 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-base shadow-sm focus:outline-none"
              />
              <button className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-all">
                {selectedMode === 'casual' ? '搜索' : '智能寻源'}
              </button>
            </div>
          </div>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
              <div className="text-3xl mb-2">🔍</div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">全网比价</h3>
              <p className="text-sm text-slate-600 mb-4">
                跨平台价格对比，AI实时分析
              </p>
              <button
                onClick={() => { showToastMessage('比价功能即将上线！') }}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-all"
              >
                开始比价
              </button>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
              <div className="text-3xl mb-2">📊</div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">价格分析</h3>
              <p className="text-sm text-slate-600 mb-4">
                历史价格趋势，市场行情洞察
              </p>
              <button
                onClick={() => { showToastMessage('价格分析功能即将上线！') }}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-all"
              >
                查看分析
              </button>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
              <div className="text-3xl mb-2">⭐</div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">供应商匹配</h3>
              <p className="text-sm text-slate-600 mb-4">
                智能匹配优质供应商，多维度评估
              </p>
              <button
                onClick={() => { showToastMessage('供应商匹配功能即将上线！') }}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-all"
              >
                开始匹配
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Category Quick Start */}
      {selectedMode === 'standard' && (
        <section className="px-6 py-16 bg-white">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-800 mb-8 text-center">采购品类快速启动</h2>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {procurementCategories.map((category) => (
                <button
                  key={category._id}
                  onClick={() => {
                    setSelectedCategory(category.code);
                    onSelectMode('standard', category.code);
                  }}
                  className={`p-6 rounded-2xl border-2 transition-all text-left ${
                    selectedCategory === category.code
                        ? 'border-blue-500 ring-2 ring-blue-200 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300 hover:shadow-md bg-white'
                  }`}
                >
                  <div className="text-2xl mb-2">{category.icon}</div>
                  <h3 className="text-lg font-bold text-slate-800 mb-1">{category.name}</h3>
                  <p className="text-sm text-slate-500">{category.description}</p>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Pricing Section */}
      <section id="pricing" className="px-6 py-24 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">选择适合您的方案</h2>
            <p className="text-lg text-slate-500">解锁全部功能，享受专业采购服务</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <PricingCard
              title="Free"
              price="免费"
              period=""
              features={[
                '每月1,000积分',
                '访问个人采购助理',
                '允许3个上传分析',
                '基础采购建议'
              ]}
              buttonText="当前计划"
              onAction={() => showToastMessage('您正在使用免费版本')}
              isPopular={false}
            />

            <PricingCard
              title="PLUS"
              price="19.9"
              period="/月"
              subPrice="每月节省 20%"
              features={[
                '每月2,000积分',
                '包含所有 Free 功能',
                '解锁规范采购模式',
                '文档生成 (30篇/月)',
                '优先客户支持'
              ]}
              buttonText="升级到 PLUS"
              onAction={() => showToastMessage('支付系统即将上线')}
              isPopular={true}
            />

            <PricingCard
              title="PRO"
              price="2000"
              period="/月"
              subPrice="每月节省 100%"
              features={[
                '每月14,000积分',
                '包含所有 PLUS 功能',
                '无限次文档生成',
                '多账号团队协作',
                '专属客户经理'
              ]}
              buttonText="升级到 PRO"
              onAction={() => showToastMessage('企业版功能咨询客服')}
              isPopular={false}
            />
          </div>
        </div>
      </section>

      {/* Customer Testimonials */}
      <section className="px-6 py-16 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-800 mb-8 text-center">我们的合作伙伴</h2>
          <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-8 opacity-90">
            <CompanyLogo type="alibaba" name="Alibaba Cloud" />
            <CompanyLogo type="tencent" name="Tencent" />
            <CompanyLogo type="bytedance" name="ByteDance" />
            <CompanyLogo type="meituan" name="Meituan" />
            <CompanyLogo type="deepseek" name="DeepSeek" />
            <CompanyLogo type="zhipu" name="Zhipu AI" />
            <CompanyLogo type="moonshot" name="Moonshot AI" />
            <CompanyLogo type="minimax" name="MiniMax" />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 bg-slate-50 border-t border-slate-200">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-sm text-slate-500 mb-4">
            ProcureAI Agent v1.0 • Made with ❤️ by AI
          </p>
          <div className="flex justify-center gap-8 text-sm text-slate-600">
            <a href="#" className="hover:text-blue-500">关于我们</a>
            <a href="#" className="hover:text-blue-500">隐私政策</a>
            <a href="#" className="hover:text-blue-500">服务条款</a>
            <a href="#" className="hover:text-blue-500">联系支持</a>
          </div>
          <p className="text-xs text-slate-400 mt-4">
            © 2026 ProcureAI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

// Import missing icons
const DocumentIcon = ({ className = "w-6 h-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
  </svg>
);

export default HomeView;
