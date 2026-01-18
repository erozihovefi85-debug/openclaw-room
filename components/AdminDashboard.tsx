import React, { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';
import {
  HomeIcon, UsersIcon, ChatIcon, SearchIcon, BarChartIcon,
  LogOutIcon, TrendingUpIcon, ActivityIcon, FileTextIcon, SettingsIcon
} from './Icons';
import CategoryTemplates from './CategoryTemplates';
import { BACKEND_API_URL } from '../config';

interface AdminDashboardProps {
  onLogout: () => void;
  onBackHome?: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout, onBackHome }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [statsRes, usersRes, convsRes, activityRes] = await Promise.all([
        adminAPI.getStats().catch(e => ({ data: null })),
        adminAPI.getUsers({ limit: 20 }).catch(e => ({ data: { users: [] } })),
        adminAPI.getConversations({ limit: 20 }).catch(e => ({ data: { conversations: [] } })),
        adminAPI.getActivity({ limit: 50 }).catch(e => ({ data: { activities: [] } })),
      ]);

      setStats(statsRes.data);
      setUsers(Array.isArray(usersRes.data?.users) ? usersRes.data.users : []);
      setConversations(Array.isArray(convsRes.data?.conversations) ? convsRes.data.conversations : []);
      setActivity(Array.isArray(activityRes.data?.activities) ? activityRes.data.activities : []);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setError('加载数据失败，请稍后重试');
      // Ensure arrays are never undefined
      setUsers([]);
      setConversations([]);
      setActivity([]);
    } finally {
      setLoading(false);
    }
  };

  const StatCard: React.FC<{ icon: React.ReactNode; title: string; value: number; color: string }> = ({ icon, title, value, color }) => (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
          <p className="text-3xl font-bold text-slate-800">{value.toLocaleString()}</p>
        </div>
        <div className={`p-3 rounded-lg ${color}`}>{icon}</div>
      </div>
    </div>
  );

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('zh-CN');
  };

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6 border-b border-slate-100">
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <BarChartIcon className="w-6 h-6 text-blue-600" />
            管理后台
          </h1>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {[
            { id: 'dashboard', label: '仪表板', icon: <HomeIcon className="w-5 h-5" /> },
            { id: 'users', label: '用户管理', icon: <UsersIcon className="w-5 h-5" /> },
            { id: 'conversations', label: '会话管理', icon: <ChatIcon className="w-5 h-5" /> },
            { id: 'analytics', label: '数据分析', icon: <TrendingUpIcon className="w-5 h-5" /> },
            { id: 'activity', label: '活动日志', icon: <ActivityIcon className="w-5 h-5" /> },
            { id: 'templates', label: '品类模板', icon: <SettingsIcon className="w-5 h-5" /> },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeTab === item.id
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100 space-y-2">
          {onBackHome && (
            <button
              onClick={onBackHome}
              className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
            >
              <HomeIcon className="w-5 h-5" />
              返回首页
            </button>
          )}
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
          >
            <LogOutIcon className="w-5 h-5" />
            退出登录
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
          <h2 className="text-xl font-bold text-slate-800">
            {activeTab === 'dashboard' && '仪表板'}
            {activeTab === 'users' && '用户管理'}
            {activeTab === 'conversations' && '会话管理'}
            {activeTab === 'analytics' && '数据分析'}
            {activeTab === 'activity' && '活动日志'}
            {activeTab === 'templates' && '采购品类模板管理'}
          </h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-medium">A</span>
              </div>
              <span>管理员</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-slate-400">加载中...</div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64">
              <div className="text-red-500 mb-4">{error}</div>
              <button
                onClick={loadData}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                重新加载
              </button>
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <div className="space-y-6">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard
                      icon={<UsersIcon className="w-6 h-6" />}
                      title="总用户数"
                      value={stats?.totalUsers || 0}
                      color="bg-blue-100 text-blue-600"
                    />
                    <StatCard
                      icon={<ActivityIcon className="w-6 h-6" />}
                      title="活跃用户"
                      value={stats?.activeUsers || 0}
                      color="bg-green-100 text-green-600"
                    />
                    <StatCard
                      icon={<ChatIcon className="w-6 h-6" />}
                      title="总会话数"
                      value={stats?.totalConversations || 0}
                      color="bg-purple-100 text-purple-600"
                    />
                    <StatCard
                      icon={<FileTextIcon className="w-6 h-6" />}
                      title="消息总数"
                      value={stats?.totalMessages || 0}
                      color="bg-orange-100 text-orange-600"
                    />
                  </div>

                  {/* Charts Section */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                      <h3 className="font-bold text-slate-800 mb-4">用户角色分布</h3>
                      <div className="space-y-3">
                        {Object.entries(stats?.usersByRole || {}).map(([role, count]) => (
                          <div key={role} className="flex items-center justify-between">
                            <span className="text-sm text-slate-600">{role}</span>
                            <span className="font-medium text-slate-800">{count as number}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                      <h3 className="font-bold text-slate-800 mb-4">会话模式分布</h3>
                      <div className="space-y-3">
                        {Object.entries(stats?.conversationsByMode || {}).map(([mode, count]) => (
                          <div key={mode} className="flex items-center justify-between">
                            <span className="text-sm text-slate-600">{mode}</span>
                            <span className="font-medium text-slate-800">{count as number}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'users' && (
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
                  <div className="p-6 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-slate-800">用户列表</h3>
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            placeholder="搜索用户..."
                            className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">用户</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">角色</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">积分</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">注册时间</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {Array.isArray(users) && users.map((user) => (
                        <tr key={user._id} className="hover:bg-slate-50">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-blue-600 text-sm font-medium">
                                  {user.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium text-slate-800">{user.name}</p>
                                <p className="text-sm text-slate-500">{user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 text-xs font-medium rounded ${
                              user.role === 'ADMIN' ? 'bg-red-100 text-red-600' :
                              user.role === 'PRO' ? 'bg-purple-100 text-purple-600' :
                              user.role === 'PLUS' ? 'bg-blue-100 text-blue-600' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-600">{user.credits}</td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {formatDate(user.createdAt)}
                          </td>
                          <td className="px-6 py-4">
                            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                              管理
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!Array.isArray(users) || users.length === 0 ? (
                    <div className="p-12 text-center">
                      <UsersIcon className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                      <p className="text-slate-500">暂无用户</p>
                    </div>
                  ) : null}
                </div>
              )}

              {activeTab === 'conversations' && (
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
                  <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-bold text-slate-800">会话列表</h3>
                    <button
                      onClick={loadData}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      刷新数据
                    </button>
                  </div>

                  {!Array.isArray(conversations) || conversations.length === 0 ? (
                    <div className="p-12 text-center">
                      <ChatIcon className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                      <p className="text-slate-500">暂无会话记录</p>
                      <p className="text-sm text-slate-400 mt-2">会话将在用户开始聊天后自动显示</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">用户</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">会话名称</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">模式</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">标签</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">创建时间</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">更新时间</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {Array.isArray(conversations) && conversations.map((conv) => (
                            <tr key={conv._id} className="hover:bg-slate-50">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                    <span className="text-blue-600 text-sm font-medium">
                                      {conv.userId?.name?.charAt(0).toUpperCase() || 'U'}
                                    </span>
                                  </div>
                                  <div>
                                    <p className="font-medium text-slate-800">{conv.userId?.name || 'Unknown'}</p>
                                    <p className="text-sm text-slate-500">{conv.userId?.email || ''}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="max-w-xs">
                                  <p className="font-medium text-slate-800 truncate">{conv.name || 'New Conversation'}</p>
                                  <p className="text-xs text-slate-400">{conv.difyConversationId ? '已同步' : '未同步'}</p>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-2 py-1 text-xs font-medium rounded ${
                                  conv.mode === 'casual' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
                                }`}>
                                  {conv.mode === 'casual' ? '买手助理小美' : '企业寻源数字监理'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-slate-600">
                                {conv.tab ? (
                                  <span className="px-2 py-1 text-xs bg-slate-100 rounded">{conv.tab}</span>
                                ) : '-'}
                              </td>
                              <td className="px-6 py-4 text-sm text-slate-600">
                                {formatDate(conv.createdAt)}
                              </td>
                              <td className="px-6 py-4 text-sm text-slate-600">
                                {formatDate(conv.updatedAt)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'activity' && (
                <div className="space-y-4">
                  {!Array.isArray(activity) || activity.length === 0 ? (
                    <div className="p-12 text-center">
                      <ActivityIcon className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                      <p className="text-slate-500">暂无活动记录</p>
                    </div>
                  ) : (
                    activity.map((item, index) => (
                      <div key={index} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                        <div className="flex items-start gap-4">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            item.type === 'conversation' ? 'bg-purple-100 text-purple-600' :
                            item.type === 'message' ? 'bg-blue-100 text-blue-600' :
                            'bg-green-100 text-green-600'
                          }`}>
                            {item.type === 'conversation' && <ChatIcon className="w-5 h-5" />}
                            {item.type === 'message' && <FileTextIcon className="w-5 h-5" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-slate-800">{item.data.userId?.name || 'User'}</span>
                                <span className="text-sm text-slate-400">{formatDate(item.timestamp)}</span>
                              </div>
                              <span className={`px-2 py-1 text-xs font-medium rounded ${
                                item.type === 'conversation' ? 'bg-purple-100 text-purple-600' :
                                item.type === 'message' ? 'bg-blue-100 text-blue-600' :
                                'bg-green-100 text-green-600'
                              }`}>
                                {item.type}
                              </span>
                            </div>
                            <p className="text-sm text-slate-600 mt-1">
                              {item.type === 'conversation' && `创建了会话: ${item.data.name}`}
                              {item.type === 'message' && `发送了消息`}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'analytics' && (
                <div className="text-center py-12 text-slate-400">
                  <BarChartIcon className="w-16 h-16 mx-auto mb-4" />
                  <p>数据分析功能开发中...</p>
                </div>
              )}

              {activeTab === 'templates' && (
                <CategoryTemplates API_BASE_URL={BACKEND_API_URL} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
