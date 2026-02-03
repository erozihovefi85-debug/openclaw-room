import React, { useState } from 'react';
import { authAPI } from '../services/api';
import { UserIcon, LockIcon, MailIcon, SparklesIcon } from './Icons';

interface LoginPageProps {
  onLogin: (user: any) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const response = await authAPI.login({
          email: formData.email,
          password: formData.password,
        });

        localStorage.setItem('procureai_token', response.data.token);
        localStorage.setItem('procureai_auth_user', JSON.stringify(response.data.user));
        onLogin(response.data.user);
      } else {
        const response = await authAPI.register({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        });

        localStorage.setItem('procureai_token', response.data.token);
        localStorage.setItem('procureai_auth_user', JSON.stringify(response.data.user));
        onLogin(response.data.user);
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || '操作失败，请检查网络连接后重试';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-50 overflow-hidden">
      {/* Animated Particle Background - Same as HomeView */}
      <div className="absolute inset-0">
        <canvas
          ref={(canvas) => {
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
          }}
          className="w-full h-full"
        />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8 animate-fadeIn">
            <div className="inline-flex items-center justify-center w-20 h-20 mb-4 relative">
              {/* Background Glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-3xl blur-xl opacity-40"></div>
              {/* Logo Icon */}
              <svg className="relative w-16 h-16" viewBox="0 0 64 64" fill="none">
                <defs>
                  <linearGradient id="logoGradientBG" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#3B82F6"/>
                    <stop offset="100%" stopColor="#10B981"/>
                  </linearGradient>
                  <linearGradient id="sparkleGradientBG" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#FCD34D"/>
                    <stop offset="100%" stopColor="#F59E0B"/>
                  </linearGradient>
                </defs>

                {/* Background Circle */}
                <circle cx="32" cy="32" r="30" fill="url(#logoGradientBG)"/>

                {/* Letter P shaped shopping bag */}
                <path d="M22 12
                         L42 12
                         L46 20
                         L46 48
                         C46 52
                         42 54
                         32 54
                         C22 54
                         18 52
                         18 48
                         L22 40
                         L34 40
                         L34 28
                         L22 28
                         Z"
                      fill="white"
                      opacity="0.95"/>

                {/* AI Sparkle */}
                <g transform="translate(44, 18)">
                  <circle r="6" fill="url(#sparkleGradientBG)"/>
                  <path d="M0 -4 L0 4 M-4 0 L4 0" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  <circle r="2" fill="white"/>
                </g>

                {/* Shopping dots */}
                <circle cx="28" cy="34" r="2" fill="url(#logoGradientBG)"/>
                <circle cx="36" cy="34" r="2" fill="url(#logoGradientBG)"/>
              </svg>
            </div>
            <h1 className="text-4xl font-extrabold mb-2 tracking-tight">
              <span className="bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">ProcureAI</span>
            </h1>
            <p className="text-slate-500 font-medium">智能采购 · 效率优先</p>
          </div>

          {/* Login Card */}
          <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-slate-100 p-8 animate-slideUp">
            {/* Tab Switch */}
            <div className="flex bg-slate-100 rounded-xl p-1 mb-6">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(true);
                  setError('');
                }}
                className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-all duration-200 ${
                  isLogin
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                登录
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsLogin(false);
                  setError('');
                }}
                className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-all duration-200 ${
                  !isLogin
                    ? 'bg-white text-emerald-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                注册
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="animate-fadeIn">
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">
                    姓名
                  </label>
                  <div className="relative">
                    <UserIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700 placeholder-slate-400"
                      placeholder="请输入您的姓名"
                      required
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">
                  邮箱
                </label>
                <div className="relative">
                  <MailIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700 placeholder-slate-400"
                    placeholder="name@company.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">
                  密码
                </label>
                <div className="relative">
                  <LockIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700 placeholder-slate-400"
                    placeholder="请输入密码（至少6位）"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm flex items-start gap-2 animate-shake">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3.5 rounded-xl font-semibold text-white transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${
                  isLogin
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
                    : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700'
                }`}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    处理中...
                  </span>
                ) : (
                  isLogin ? '立即登录' : '创建账户'
                )}
              </button>
            </form>
          </div>

          {/* Footer */}
          <div className="text-center mt-6 text-slate-400 text-sm">
            <p>登录即表示您同意我们的
              <a href="#" className="text-blue-600 hover:text-blue-700 mx-1">服务条款</a>
              和
              <a href="#" className="text-blue-600 hover:text-blue-700 mx-1">隐私政策</a>
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
        .animate-slideUp {
          animation: slideUp 0.6s ease-out;
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default LoginPage;
