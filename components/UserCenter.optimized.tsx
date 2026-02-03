import React, { useState, useEffect } from 'react';
import { User, UserPreference } from '../types';
import {
  ChevronLeftIcon, UserIcon, ShieldCheckIcon, CreditCardIcon,
  SettingsIcon, LogOutIcon, CheckCircleIcon, ChartBarIcon,
  EditIcon, CameraIcon
} from './Icons';
import UserAvatar, { AVATAR_OPTIONS } from './UserAvatar';
import PreferenceSettings from './PreferenceSettings';
import { userPreferenceAPI, authAPI } from '../services/api';

interface UserCenterProps {
  user: User;
  onBack: () => void;
  onLogout: () => void;
  onUserUpdate?: (updatedUser: Partial<User>) => void;
}

// 统一使用CSS变量的类名
const CLASSES = {
  card: 'bg-white p-4 rounded-2xl border border-slate-100 shadow-sm',
  statCard: 'bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4',
  statValue: 'text-2xl font-bold text-slate-800',
  statLabel: 'text-xs font-medium text-slate-400 uppercase tracking-wider',
  
  // 状态颜色
  bgSuccess: 'bg-emerald-50 text-emerald-600',
  bgInfo: 'bg-blue-50 text-blue-600',
  bgWarning: 'bg-orange-50 text-orange-600',
  
  // 边框和悬停
  border: 'border border-slate-200',
  borderHover: 'hover:bg-slate-50 hover:border-slate-300',
  borderHoverError: 'hover:bg-red-50 hover:border-red-200',
  
  // 文本颜色
  textPrimary: 'text-slate-800',
  textSecondary: 'text-slate-600',
  textMuted: 'text-slate-400',
  textError: 'text-red-600',
  
  // 按钮
  btn: 'px-4 py-2.5 rounded-lg text-sm font-medium transition-all border-2 flex items-center justify-between',
  btnPrimary: 'text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700',
  btnGhost: 'text-slate-600 hover:bg-slate-50 border border-transparent',
  btnError: 'text-red-600 hover:bg-red-50 hover:border-red-200 border-transparent',
  btnIcon: 'w-5 h-5',
  btnIconLeft: 'w-5 h-5 mr-2',
  btnIconRight: 'w-5 h-4 ml-2',
  
  // 标题
  title: 'text-sm font-bold text-slate-400 uppercase tracking-wider',
};

const StatCard: React.FC<{ label: string; value: string | number; icon: React.ReactNode; iconBg: string; iconText: string }> = ({ 
  label, value, icon, iconBg, iconText
}) => (
  <div className={CLASSES.statCard}>
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-sm ${iconBg}`}>
      {icon}
    </div>
    <div>
      <p className={CLASSES.statLabel}>{label}</p>
      <p className={CLASSES.statValue}>{value}</p>
    </div>
  </div>
);

const UserCenter: React.FC<UserCenterProps> = ({
  user,
  onBack,
  onLogout,
  onUserUpdate
}) => {
  const [showPreferences, setShowPreferences] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [preference, setPreference] = useState<UserPreference | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<User>>({});
  const [savingProfile, setSavingProfile] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(user.avatar || 'blue');

  // Load user preferences
  useEffect(() => {
    if (showPreferences && !preference) {
      loadPreferences();
    }
  }, [showPreferences]);

  const loadPreferences = async () => {
    setLoading(true);
    try {
      const response = await userPreferenceAPI.getAll();
      setPreference(response.data.data);
    } catch (error) {
      console.error('Failed to load preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePreference = async (updates: Partial<UserPreference>) => {
    try {
      const response = await userPreferenceAPI.update(updates);
      setPreference(response.data.data);
    } catch (error) {
      console.error('Failed to update preferences:', error);
      throw error;
    }
  };

  const handleOpenProfileEdit = () => {
    setEditingUser(user);
    setSelectedAvatar(user.avatar || 'blue');
    setShowProfileEdit(true);
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const updates = {};
      if (selectedAvatar !== user.avatar) {
        updates.avatar = selectedAvatar;
      }
      if (editingUser.name && editingUser.name !== user.name) {
        updates.name = editingUser.name.trim();
      }

      const response = await authAPI.updateProfile(updates);
      if (onUserUpdate) {
        onUserUpdate({ ...user, ...response.data.data });
      }
      setShowProfileEdit(false);
    } catch (error) {
      console.error('Failed to save profile:', error);
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-slate-50 via-white to-slate-50">
      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between border-b border-slate-200 bg-white">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className={CLASSES.btnGhost}>
            <ChevronLeftIcon className={CLASSES.btnIcon} />
            <span>返回</span>
          </button>
          <h1 className="text-xl font-bold text-slate-800">用户中心</h1>
        </div>
        <button onClick={onLogout} className={`${CLASSES.btn} ${CLASSES.btnError}`}>
          <LogOutIcon className={CLASSES.btnIconLeft} />
          <span>退出登录</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* User Info Card */}
        <div className={CLASSES.card}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-800">个人信息</h2>
          </div>

          {!showProfileEdit && (
            <button onClick={handleOpenProfileEdit} className={CLASSES.btnGhost}>
              <EditIcon className={CLASSES.btnIcon} />
              <span>编辑</span>
            </button>
          )}

          {showProfileEdit && (
            <div className="flex gap-2">
              <button
                onClick={() => setShowProfileEdit(false)}
                className={CLASSES.btnGhost}
              >
                取消
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className={CLASSES.btnPrimary}
              >
                {savingProfile ? '保存中...' : '保存'}
              </button>
            </div>
          )}

          {showProfileEdit && (
            <div className="mt-4 space-y-4">
              {/* 头像选择 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">选择头像</label>
                <div className="flex gap-2">
                  {AVATAR_OPTIONS.map((avatar, index) => {
                    const isSelected = selectedAvatar === avatar.value;
                    return (
                      <button
                        key={index}
                        onClick={() => setSelectedAvatar(avatar.value)}
                        className={`w-12 h-12 rounded-full border-2 ${
                          isSelected
                            ? 'border-blue-500 ring-2 ring-blue-200 bg-blue-50'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        {avatar.component}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 昵称输入 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">昵称</label>
                <input
                  type="text"
                  value={editingUser.name || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="输入昵称"
                  maxLength={20}
                />
              </div>
            </div>
          )}

          {/* 用户详情 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-slate-400 mb-1">用户名</p>
              <p className="text-base font-medium text-slate-800">{user.name}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400 mb-1">邮箱</p>
              <p className="text-base font-medium text-slate-800">{user.email}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400 mb-1">加入时间</p>
              <p className="text-base font-medium text-slate-800">
                {new Date(user.joinDate).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-400 mb-1">积分</p>
              <p className="text-base font-medium text-slate-800">{user.credits}</p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <StatCard 
            label="可用积分" 
            value={user.credits} 
            icon={<CreditCardIcon />} 
            iconBg="bg-orange-50 text-orange-600"
            iconText="text-white"
          />
          <StatCard 
            label="处理订单" 
            value="42" 
            icon={<CheckCircleIcon />} 
            iconBg="bg-emerald-50 text-emerald-600"
            iconText="text-white"
          />
          <StatCard 
            label="平均节省" 
            value="18.5%" 
            icon={<ChartBarIcon />} 
            iconBg="bg-blue-50 text-blue-600"
            iconText="text-white"
          />
        </div>

        {/* Sections */}
        <div className="grid md:grid-cols-2 gap-4 mt-6">
          {/* Account Settings */}
          <div className="space-y-4">
            <h3 className={CLASSES.title}>账号设置</h3>
            <div className={CLASSES.card}>
              <div className={`flex items-center justify-between p-4 ${CLASSES.borderHover}`}>
                <div className="flex items-center gap-3">
                  <UserAvatar avatarType={user.avatar || 'blue'} size="sm" />
                  <span className={CLASSES.textPrimary}>编辑个人资料</span>
                </div>
                <ChevronLeftIcon className={`${CLASSES.btnIcon} rotate-180`} />
              </div>
              <div className={`flex items-center justify-between p-4 ${CLASSES.borderHover}`}>
                <div className="flex items-center gap-3">
                  <ShieldCheckIcon className={CLASSES.btnIcon} />
                  <span className={CLASSES.textPrimary}>安全与隐私</span>
                </div>
                <ChevronLeftIcon className={`${CLASSES.btnIcon} rotate-180`} />
              </div>
              <div className={`flex items-center justify-between p-4 ${CLASSES.borderHover}`}>
                <div className="flex items-center gap-3">
                  <SettingsIcon className={CLASSES.btnIcon} />
                  <span className={CLASSES.textPrimary}>通知偏好设置</span>
                </div>
                <ChevronLeftIcon className={`${CLASSES.btnIcon} rotate-180`} />
              </div>
            </div>
          </div>

          {/* More Actions */}
          <div className="space-y-4">
            <h3 className={CLASSES.title}>其他服务</h3>
            <div className={CLASSES.card}>
              <div className={`flex items-center justify-between p-4 ${CLASSES.borderHover} ${CLASSES.bgWarning}`}>
                <div className="flex items-center gap-3">
                  <CreditCardIcon className={CLASSES.btnIcon} />
                  <span className="font-bold text-slate-800">升级到 PRO 版本</span>
                </div>
                <ChevronLeftIcon className={`${CLASSES.btnIcon} rotate-180`} />
              </div>
              <div className={`flex items-center justify-between p-4 ${CLASSES.borderHover}`}>
                <div className="flex items-center gap-3">
                  <SettingsIcon className={CLASSES.btnIcon} />
                  <span className={CLASSES.textPrimary}>查看账单历史</span>
                </div>
                <ChevronLeftIcon className={`${CLASSES.btnIcon} rotate-180`} />
              </div>
            </div>
          </div>
        </div>

        {/* 偏好设置模态框 */}
        {showPreferences && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-800">通知偏好设置</h2>
                <button onClick={() => setShowPreferences(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                  <span className="text-2xl">&times;</span>
                </button>
              </div>
              <PreferenceSettings
                preference={preference}
                onUpdate={handleUpdatePreference}
                onClose={() => setShowPreferences(false)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center px-6 py-4 border-t border-slate-200 bg-white">
        <p className="text-xs text-slate-400">
          ProcureAI Agent v1.0 • 加入于 {new Date(user.joinDate).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
};

export default UserCenter;
