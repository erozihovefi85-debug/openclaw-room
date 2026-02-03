// 颜色配置 - 统一管理所有颜色
export const THEME_COLORS = {
  // 品牌色
  blue: {
    50: '#eff6ff',    // light
    100: '#60a5fa',  // primary
    500: '#3b82f6',  // dark
    600: '#2563eb',  // darker
  },
  
  emerald: {
    50: '#a7f3d0',
    100: '#10b981',
    500: '#059669',
    600: '#047857',
  },
  
  pink: {
    50: '#f9a8d4',
    100: '#ec4899',
    500: '#be185d',
    600: '#db2777',
  },
  
  purple: {
    50: '#c4b5fd',
    100: '#8b5cf6',
    500: '#6366f1',
    600: '#4c51bf',
  },
  
  // 语义色
  success: {
    50: '#d1fae5',
    100: '#10b981',
    500: '#059669',
  },
  
  error: {
    50: '#fee2e2',
    100: '#ef4444',
    500: '#dc2626',
  },
  
  warning: {
    50: '#fef3c7',
    100: '#f59e0b',
    500: '#d97706',
  },
  
  info: {
    50: '#dbeafe',
    100: '#3b82f6',
    500: '#2563eb',
  },
  
  // 中性色
  slate: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },
  
  white: '#ffffff',
  black: '#000000',
};

// 模式主题
export const MODE_THEMES = {
  casual: {
    primary: THEME_COLORS.pink,
    secondary: THEME_COLORS.pink[50],
    accent: THEME_COLORS.emerald,
    background: 'from-pink-50 to-white',
  },
  
  standard: {
    primary: THEME_COLORS.emerald,
    secondary: THEME_COLORS.emerald[50],
    accent: THEME_COLORS.blue,
    background: 'from-emerald-50 to-white',
  },
};

// 阴影配置
export const SHADOWS = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.15)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
  inner: 'inset 0 1px 2px 0 rgba(0, 0, 0, 0.1)',
};

// 圆角配置
export const RADIUS = {
  sm: '6px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '20px',
  full: '9999px',
};

// 间距配置
export const SPACING = {
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
};

// 工具函数：获取主题相关的样式类
export const getThemeClasses = (mode: 'casual' | 'standard') => {
  const theme = MODE_THEMES[mode];
  return {
    primary: theme.primary[100],
    primaryHover: theme.primary[500],
    secondary: theme.secondary,
    accent: theme.accent[100],
    bgGradient: `bg-gradient-to-br ${theme.background}`,
    text: 'text-slate-800',
  };
};

// 工具函数：获取颜色变量
export const getColorClass = (colorName: keyof typeof THEME_COLORS, shade: 50 | 100 | 500 | 600 = 500) => {
  return `bg-${colorName}-${shade} text-${colorName}-${Math.max(shade - 100, 50)}`;
};
