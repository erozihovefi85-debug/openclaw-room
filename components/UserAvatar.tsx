import React from 'react';
import { CheckIcon } from './Icons';

export const AVATAR_OPTIONS = [
  // 蓝色系 - 专业风格
  { id: 'blue', name: '专业蓝', labelColor: 'from-blue-400 to-blue-500', skinTone: '#FFE8D6', hairColor: '#1E3A5F', accentColor: '#3B82F6' },
  { id: 'blue-light', name: '商务蓝', labelColor: 'from-blue-300 to-blue-400', skinTone: '#FFE8D6', hairColor: '#2C4A6E', accentColor: '#60A5FA' },
  { id: 'indigo', name: '沉稳紫', labelColor: 'from-indigo-400 to-indigo-500', skinTone: '#FFE8D6', hairColor: '#372B5E', accentColor: '#818CF8' },

  // 粉色系 - 温暖风格（类似小美）
  { id: 'pink', name: '温暖粉', labelColor: 'from-pink-300 to-pink-400', skinTone: '#FFE8DC', hairColor: '#5C4033', accentColor: '#F472B6' },
  { id: 'rose', name: '浪漫玫', labelColor: 'from-rose-300 to-rose-400', skinTone: '#FFE8DC', hairColor: '#6B4423', accentColor: '#FB7185' },
  { id: 'peach', name: '清新桃', labelColor: 'from-orange-200 to-orange-300', skinTone: '#FFE8DC', hairColor: '#8B5A2B', accentColor: '#FB923C' },

  // 绿色系 - 稳重风格（类似小帅）
  { id: 'emerald', name: '稳重翠', labelColor: 'from-emerald-400 to-emerald-500', skinTone: '#FFE4D6', hairColor: '#1F3A2F', accentColor: '#34D399' },
  { id: 'teal', name: '清新青', labelColor: 'from-teal-300 to-teal-400', skinTone: '#FFE4D6', hairColor: '#2A4A3F', accentColor: '#5EEAD4' },
  { id: 'green', name: '活力绿', labelColor: 'from-green-400 to-green-500', skinTone: '#FFE4D6', hairColor: '#234A32', accentColor: '#4ADE80' },

  // 暖色系 - 活力风格
  { id: 'orange', name: '活力橙', labelColor: 'from-orange-400 to-orange-500', skinTone: '#FFE8D6', hairColor: '#5C3D2E', accentColor: '#FB923C' },
  { id: 'amber', name: '阳光黄', labelColor: 'from-amber-300 to-amber-400', skinTone: '#FFE8D6', hairColor: '#6B4E35', accentColor: '#FCD34D' },
  { id: 'red', name: '热情红', labelColor: 'from-red-400 to-red-500', skinTone: '#FFE8D6', hairColor: '#4A2C2A', accentColor: '#F87171' },
];

interface UserAvatarProps {
  avatarType?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  editable?: boolean;
  onSelect?: (avatarType: string) => void;
  className?: string;
}

// 精致的 SVG 头像渲染器
const DetailedAvatar: React.FC<{
  type: string;
  size: string;
}> = ({ type, size }) => {
  const config = AVATAR_OPTIONS.find(a => a.id === type) || AVATAR_OPTIONS[0];
  const { skinTone, hairColor, accentColor } = config;

  return (
    <svg viewBox="0 0 64 64" className="w-full h-full drop-shadow-sm">
      <defs>
        <linearGradient id={`skin-gradient-${type}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={skinTone} stopOpacity="1" />
          <stop offset="100%" stopColor={skinTone} stopOpacity="0.9" />
        </linearGradient>
        <linearGradient id={`hair-gradient-${type}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={hairColor} stopOpacity="1" />
          <stop offset="100%" stopColor={hairColor} stopOpacity="0.85" />
        </linearGradient>
        <filter id={`soft-shadow-${type}`}>
          <feDropShadow dx="0" dy="1" stdDeviation="0.5" floodOpacity="0.2" />
        </filter>
      </defs>

      {/* 背景光晕 */}
      <circle cx="32" cy="32" r="28" fill={accentColor} opacity="0.1" />

      {/* 头发后层 */}
      <ellipse cx="32" cy="18" rx="22" ry="12" fill={`url(#hair-gradient-${type})`} />

      {/* 脸部 */}
      <ellipse cx="32" cy="35" rx="18" ry="20" fill={`url(#skin-gradient-${type})`} filter={`url(#soft-shadow-${type})`} />

      {/* 刘海 */}
      <path
        d="M14 28 Q14 14 32 14 Q50 14 50 28 Q48 20 44 18 Q40 16 36 16 Q32 16 28 16 Q24 16 20 18 Q16 20 14 28"
        fill={`url(#hair-gradient-${type})`}
        opacity="0.95"
      />

      {/* 眉毛 */}
      <path d="M22 25 Q25 24 28 25" stroke={hairColor} strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <path d="M36 25 Q39 24 42 25" stroke={hairColor} strokeWidth="1.2" fill="none" strokeLinecap="round" />

      {/* 眼睛 - 精致设计 */}
      <ellipse cx="25" cy="30" rx="3.5" ry="4" fill="white" opacity="0.3" />
      <ellipse cx="39" cy="30" rx="3.5" ry="4" fill="white" opacity="0.3" />
      <circle cx="25" cy="30" r="2.5" fill="#1a1a1a" />
      <circle cx="39" cy="30" r="2.5" fill="#1a1a1a" />
      {/* 眼睛高光 */}
      <circle cx="26" cy="29" r="0.8" fill="white" opacity="0.9" />
      <circle cx="40" cy="29" r="0.8" fill="white" opacity="0.9" />

      {/* 眼镜装饰 - 只在某些风格显示 */}
      {(type === 'blue' || type === 'blue-light' || type === 'indigo' || type === 'emerald' || type === 'teal' || type === 'green') && (
        <>
          <rect x="20" y="27" width="10" height="7" rx="1.5" fill="none" stroke={hairColor} strokeWidth="1.5" opacity="0.6" />
          <rect x="34" y="27" width="10" height="7" rx="1.5" fill="none" stroke={hairColor} strokeWidth="1.5" opacity="0.6" />
          <line x1="30" y1="30.5" x2="34" y2="30.5" stroke={hairColor} strokeWidth="1.5" opacity="0.6" />
        </>
      )}

      {/* 鼻子 */}
      <path d="M32 35 L32 38" stroke={hairColor} strokeWidth="1" opacity="0.3" strokeLinecap="round" />
      <circle cx="30" cy="39" r="1.5" fill={skinTone} opacity="0.6" />
      <circle cx="34" cy="39" r="1.5" fill={skinTone} opacity="0.6" />

      {/* 自然微笑 */}
      <path
        d="M26 44 Q32 48 38 44"
        stroke="#D4A574"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        opacity="0.8"
      />

      {/* 腮红 - 温暖风格更明显 */}
      <ellipse cx="20" cy="38" rx="4" ry="2.5" fill={accentColor} opacity="0.15" />
      <ellipse cx="44" cy="38" rx="4" ry="2.5" fill={accentColor} opacity="0.15" />

      {/* 发饰/配饰 */}
      <circle cx="14" cy="22" r="2" fill={accentColor} opacity="0.6" />
      <circle cx="50" cy="22" r="2" fill={accentColor} opacity="0.6" />
    </svg>
  );
};

const UserAvatar: React.FC<UserAvatarProps> = ({
  avatarType = 'blue',
  size = 'lg',
  editable = false,
  onSelect,
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-20 h-20',
    xl: 'w-28 h-28'
  };

  const [selectedAvatar, setSelectedAvatar] = React.useState(avatarType);

  const config = AVATAR_OPTIONS.find(a => a.id === selectedAvatar) || AVATAR_OPTIONS[0];

  return (
    <div className={`relative ${className}`}>
      {!editable ? (
        // 显示模式 - 单个头像
        <div className={`${sizeClasses[size]} rounded-full flex items-center justify-center overflow-hidden shadow-lg ring-2 ring-white/50 bg-gradient-to-br ${config.labelColor} transition-transform hover:scale-105`}>
          <DetailedAvatar type={selectedAvatar} size={size} />
        </div>
      ) : (
        // 编辑模式 - 网格选择
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">选择你的头像</p>
            {selectedAvatar && (
              <span className="text-xs text-slate-500">已选择: {config.name}</span>
            )}
          </div>
          <div className="grid grid-cols-4 gap-3">
            {AVATAR_OPTIONS.map((option) => {
              const isSelected = selectedAvatar === option.id;
              return (
                <button
                  key={option.id}
                  onClick={() => {
                    setSelectedAvatar(option.id);
                    if (onSelect) onSelect(option.id);
                  }}
                  className={`relative group transition-all duration-200 ${isSelected ? 'scale-110' : 'hover:scale-105'}`}
                >
                  <div
                    className={`w-14 h-14 rounded-full flex items-center justify-center overflow-hidden shadow-md border-2 transition-all duration-200 ${
                      isSelected
                        ? `border-current ${option.labelColor.replace('from-', 'text-').replace(' to-', ' ')} ring-2 ring-offset-2 ring-blue-400`
                        : 'border-transparent hover:border-slate-200'
                    } bg-gradient-to-br ${option.labelColor}`}
                  >
                    <DetailedAvatar type={option.id} size="md" />
                  </div>

                  {/* 选中标记 */}
                  {isSelected && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full border-2 border-white shadow-md flex items-center justify-center z-10">
                      <CheckIcon className="w-3 h-3 text-white" />
                    </div>
                  )}

                  {/* 悬浮提示 */}
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-slate-800 text-white text-xs px-2 py-1 rounded shadow-lg pointer-events-none">
                    {option.name}
                  </div>
                </button>
              );
            })}
          </div>

          {/* 当前选中预览 */}
          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
              <DetailedAvatar type={selectedAvatar} size="lg" />
            </div>
            <div>
              <p className="font-semibold text-slate-800">{config.name}</p>
              <p className="text-xs text-slate-500">点击上方头像更换样式</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserAvatar;
