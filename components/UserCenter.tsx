
import React, { useState, useEffect } from 'react';
import { User, UserPreference } from '../types';
import {
  ChevronLeftIcon, UserIcon, ShieldCheckIcon, CreditCardIcon,
  SettingsIcon, LogOutIcon, CheckCircleIcon, ChartBarIcon,
  EditIcon, CameraIcon
} from './Icons';
import PreferenceSettings from './PreferenceSettings';
import UserAvatar, { AVATAR_OPTIONS } from './UserAvatar';
import { userPreferenceAPI, authAPI } from '../services/api';

interface UserCenterProps {
  user: User;
  onBack: () => void;
  onLogout: () => void;
  onUserUpdate?: (updatedUser: Partial<User>) => void;
}

const StatCard: React.FC<{ label: string; value: string | number; icon: React.ReactNode; color: string }> = ({ label, value, icon, color }) => (
  <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
      {icon}
    </div>
    <div>
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="text-xl font-bold text-slate-800">{value}</p>
    </div>
  </div>
);

const UserCenter: React.FC<UserCenterProps> = ({ user, onBack, onLogout, onUserUpdate }) => {
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
      // Update user profile with avatar
      const updates = {};
      if (selectedAvatar !== user.avatar) {
        updates.avatar = selectedAvatar;
      }
      if (editingUser.name && editingUser.name !== user.name) {
        updates.name = editingUser.name.trim();
      }

      const response = await authAPI.updateProfile(updates);
      if (onUserUpdate) {
        onUserUpdate({ ...user, ...response.data });
      }
      setShowProfileEdit(false);
    } catch (error) {
      console.error('Failed to save profile:', error);
    } finally {
      setSavingProfile(false);
    }
  };

  // If showing profile edit, render profile edit component
  if (showProfileEdit) {
    return (
      <div className="h-full bg-slate-50 overflow-y-auto">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center">
            <button
              onClick={() => setShowProfileEdit(false)}
              className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors mr-2"
            >
              <ChevronLeftIcon />
            </button>
            <h1 className="text-lg font-bold text-slate-800">编辑个人资料</h1>
          </div>
          <button
            onClick={handleSaveProfile}
            disabled={savingProfile}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm font-medium"
          >
            {savingProfile ? '保存中...' : '保存'}
          </button>
        </div>

        <div className="max-w-2xl mx-auto p-6 space-y-8">
          {/* Avatar Selection */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="font-semibold text-slate-800 mb-4">选择头像</h3>
            <UserAvatar
              avatarType={selectedAvatar}
              size="lg"
              editable={true}
              onSelect={(avatarType) => setSelectedAvatar(avatarType)}
            />
          </div>

          {/* Name Edit */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="font-semibold text-slate-800 mb-4">个人信息</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">用户名</label>
                <input
                  type="text"
                  value={editingUser.name || user.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="请输入用户名"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">邮箱</label>
                <input
                  type="email"
                  value={user.email}
                  disabled
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed"
                />
                <p className="text-xs text-slate-400 mt-1">邮箱地址不可修改</p>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="font-semibold text-slate-800 mb-4">预览</h3>
            <div className="flex items-center gap-4">
              <UserAvatar avatarType={selectedAvatar} size="lg" />
              <div>
                <p className="font-semibold text-slate-800">{editingUser.name || user.name}</p>
                <p className="text-sm text-slate-500">{user.email}</p>
                <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full mt-1">
                  {user.role}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If showing preferences, render preference settings component
  if (showPreferences) {
    return (
      <div className="h-full bg-slate-50 overflow-y-auto">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center sticky top-0 z-10">
          <button
            onClick={() => setShowPreferences(false)}
            className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors mr-2"
          >
            <ChevronLeftIcon />
          </button>
          <h1 className="text-lg font-bold text-slate-800">偏好设置</h1>
        </div>

        <PreferenceSettings
          preference={preference}
          onUpdate={handleUpdatePreference}
          loading={loading}
        />
      </div>
    );
  }

  return (
    <div className="h-full bg-slate-50 overflow-y-auto">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center sticky top-0 z-10">
        <button 
          onClick={onBack}
          className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors mr-2"
        >
          <ChevronLeftIcon />
        </button>
        <h1 className="text-lg font-bold text-slate-800">个人中心</h1>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-8">
        {/* Profile Card */}
        {(() => {
          const currentAvatar = user.avatar || selectedAvatar || 'blue';
          const gradientClass = AVATAR_OPTIONS.find(a => a.id === currentAvatar)?.labelColor || 'from-blue-500 to-blue-600';
          return (
            <div className={`bg-gradient-to-br ${gradientClass} rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row items-center gap-8 relative overflow-hidden`}>
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-2xl"></div>

              <div className="relative">
                 <div className="w-24 h-24 overflow-hidden">
                  <UserAvatar avatarType={currentAvatar} size="lg" />
                 </div>
                 <div className="absolute bottom-0 right-0 w-8 h-8 bg-emerald-500 border-4 border-white rounded-full flex items-center justify-center" title="在线">
                    <CheckCircleIcon className="w-4 h-4" />
                 </div>
              </div>

              <div className="text-center md:text-left space-y-2 flex-1 relative">
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                  <h2 className="text-3xl font-extrabold">{user.name}</h2>
                  <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-widest border border-white/10">
                    {user.role} MEMBER
                  </span>
                </div>
                <p className="text-white/90">{user.email}</p>
                <div className="flex flex-wrap justify-center md:justify-start gap-4 pt-2">
                  <div className="text-xs text-white/90 flex items-center gap-1.5">
                    <ShieldCheckIcon className="w-4 h-4" />
                    <span>实名认证已通过</span>
                  </div>
                  <div className="text-xs text-white/90 flex items-center gap-1.5">
                    <CreditCardIcon className="w-4 h-4" />
                    <span>会员有效期至 2025-12-31</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard 
            label="可用积分" 
            value={user.credits} 
            icon={<CreditCardIcon />} 
            color="bg-orange-50 text-orange-600"
          />
          <StatCard 
            label="处理订单" 
            value={42} 
            icon={<CheckCircleIcon />} 
            color="bg-emerald-50 text-emerald-600"
          />
          <StatCard 
            label="平均节省" 
            value="18.5%" 
            icon={<ChartBarIcon />} 
            color="bg-blue-50 text-blue-600"
          />
        </div>

        {/* Sections */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Account Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest px-1">账号设置</h3>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
               <button
                  onClick={handleOpenProfileEdit}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors border-b border-slate-50"
               >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8">
                      <UserAvatar avatarType={user.avatar || 'blue'} size="sm" />
                    </div>
                    <span className="text-sm font-medium text-slate-700">编辑个人资料</span>
                  </div>
                  <ChevronLeftIcon className="w-4 h-4 text-slate-300 rotate-180" />
               </button>
               <button className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors border-b border-slate-50">
                  <div className="flex items-center gap-3">
                    <ShieldCheckIcon className="w-5 h-5 text-slate-400" />
                    <span className="text-sm font-medium text-slate-700">安全与隐私</span>
                  </div>
                  <ChevronLeftIcon className="w-4 h-4 text-slate-300 rotate-180" />
               </button>
               <button
                  onClick={() => setShowPreferences(true)}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
               >
                  <div className="flex items-center gap-3">
                    <SettingsIcon className="w-5 h-5 text-slate-400" />
                    <span className="text-sm font-medium text-slate-700">通知偏好设置</span>
                  </div>
                  <ChevronLeftIcon className="w-4 h-4 text-slate-300 rotate-180" />
               </button>
            </div>
          </div>

          {/* More Actions */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest px-1">其他服务</h3>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
               <button className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors border-b border-slate-50">
                  <div className="flex items-center gap-3 text-orange-500">
                    <CreditCardIcon className="w-5 h-5" />
                    <span className="text-sm font-bold">升级到 PRO 版本</span>
                  </div>
                  <ChevronLeftIcon className="w-4 h-4 rotate-180" />
               </button>
               <button className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors border-b border-slate-50">
                  <div className="flex items-center gap-3">
                    <SettingsIcon className="w-5 h-5 text-slate-400" />
                    <span className="text-sm font-medium text-slate-700">查看账单历史</span>
                  </div>
                  <ChevronLeftIcon className="w-4 h-4 text-slate-300 rotate-180" />
               </button>
               <button 
                onClick={onLogout}
                className="w-full flex items-center justify-between p-4 hover:bg-red-50 transition-colors text-red-500 group"
               >
                  <div className="flex items-center gap-3">
                    <LogOutIcon className="w-5 h-5" />
                    <span className="text-sm font-bold">退出登录</span>
                  </div>
               </button>
            </div>
          </div>
        </div>

        <div className="text-center pt-8">
           <p className="text-xs text-slate-400">
             ProcureAI Agent v1.2.0 • 加入于 {user.joinDate}
           </p>
        </div>
      </div>
    </div>
  );
};

export default UserCenter;
