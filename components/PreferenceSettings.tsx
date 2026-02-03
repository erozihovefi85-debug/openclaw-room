import React, { useState } from 'react';
import {
  UserPreference,
  ProcurementCategory,
  QualityPriorityType,
  ReplyStyleType,
  AIVoiceType
} from '../types';

interface PreferenceSettingsProps {
  preference: UserPreference | null;
  onUpdate: (updates: Partial<UserPreference>) => void;
  loading?: boolean;
}

const PreferenceSettings: React.FC<PreferenceSettingsProps> = ({
  preference,
  onUpdate,
  loading = false
}) => {
  const [activeTab, setActiveTab] = useState<'procurement' | 'chat' | 'feature'>('procurement');
  const [saving, setSaving] = useState(false);

  const handleUpdate = async (updates: Partial<UserPreference>) => {
    setSaving(true);
    try {
      await onUpdate(updates);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-1/3 mb-6"></div>
          <div className="h-4 bg-slate-200 rounded w-full mb-4"></div>
          <div className="h-4 bg-slate-200 rounded w-2/3 mb-4"></div>
          <div className="h-4 bg-slate-200 rounded w-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">个人偏好设置</h1>
        {preference && (
          <div className="text-sm text-slate-500">
            版本 {preference.version || 1}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 mb-6">
        <nav className="flex gap-6">
          {[
            { id: 'procurement', label: '采购偏好', icon: '🛒' },
            { id: 'chat', label: '对话风格', icon: '💬' },
            { id: 'feature', label: '功能设置', icon: '⚙' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3 border-b-2 font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'procurement' && (
        <ProcurementPreferencesPanel
          preference={preference}
          onUpdate={handleUpdate}
        />
      )}

      {activeTab === 'chat' && (
        <ChatPreferencesPanel
          preference={preference}
          onUpdate={handleUpdate}
        />
      )}

      {activeTab === 'feature' && (
        <FeaturePreferencesPanel
          preference={preference}
          onUpdate={handleUpdate}
        />
      )}

      {/* Saving indicator */}
      {saving && (
        <div className="fixed bottom-4 right-4 bg-slate-800 text-white px-4 py-2 rounded-lg shadow-lg">
          保存中...
        </div>
      )}
    </div>
  );
};

// ==================== Procurement Preferences Panel ====================

const ProcurementPreferencesPanel = ({ preference, onUpdate }) => {
  return (
    <div className="space-y-6">
      {/* Quality vs Price Priority */}
      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <h3 className="font-semibold mb-4 text-slate-800">质量与价格优先级</h3>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600">质量优先</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={preference?.procurementPreferences?.qualityPriority?.weight || 0.5}
            onChange={(e) => onUpdate({
              procurementPreferences: {
                ...preference?.procurementPreferences,
                qualityPriority: {
                  type: e.target.value < 0.33 ? 'price' :
                        e.target.value > 0.66 ? 'quality' : 'balanced',
                  weight: parseFloat(e.target.value)
                }
              }
            })}
            className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-sm text-slate-600">价格优先</span>
        </div>
        <div className="mt-3 p-3 bg-blue-50 rounded text-sm text-blue-700">
          当前策略：
          {preference?.procurementPreferences?.qualityPriority?.type === 'quality' && ' 质量优先（推荐优质产品/服务）'}
          {preference?.procurementPreferences?.qualityPriority?.type === 'price' && ' 价格优先（推荐高性价比方案）'}
          {preference?.procurementPreferences?.qualityPriority?.type === 'balanced' && ' 均衡推荐（综合考虑质量与价格）'}
        </div>
      </div>

      {/* Default Category */}
      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <h3 className="font-semibold mb-4 text-slate-800">默认采购品类</h3>
        <select
          value={preference?.procurementPreferences?.defaultCategory || ''}
          onChange={(e) => onUpdate({
            procurementPreferences: {
              ...preference?.procurementPreferences,
              defaultCategory: e.target.value
            }
          })}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">自动识别</option>
          <option value="software_development">软件开发</option>
          <option value="hardware_procurement">硬件采购</option>
          <option value="consulting_service">咨询服务</option>
          <option value="system_integration">系统集成</option>
          <option value="general_procurement">通用采购</option>
        </select>
        <p className="mt-2 text-sm text-slate-500">
          AI将优先使用此品类进行需求识别
        </p>
      </div>

      {/* Price Range */}
      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <h3 className="font-semibold mb-4 text-slate-800">价格区间偏好</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-600 mb-1">最低价格</label>
            <input
              type="number"
              placeholder="0"
              value={preference?.procurementPreferences?.preferredPriceRange?.min || ''}
              onChange={(e) => onUpdate({
                procurementPreferences: {
                  ...preference?.procurementPreferences,
                  preferredPriceRange: {
                    ...preference?.procurementPreferences?.preferredPriceRange,
                    min: parseFloat(e.target.value) || 0
                  }
                }
              })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">最高价格</label>
            <input
              type="number"
              placeholder="不限"
              value={preference?.procurementPreferences?.preferredPriceRange?.max === Number.MAX_SAFE_INTEGER ? '' : preference?.procurementPreferences?.preferredPriceRange?.max}
              onChange={(e) => onUpdate({
                procurementPreferences: {
                  ...preference?.procurementPreferences,
                  preferredPriceRange: {
                    ...preference?.procurementPreferences?.preferredPriceRange,
                    max: e.target.value ? parseFloat(e.target.value) : Number.MAX_SAFE_INTEGER
                  }
                }
              })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Delivery Location */}
      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <h3 className="font-semibold mb-4 text-slate-800">收货地点</h3>
        <input
          type="text"
          placeholder="例如：北京市朝阳区"
          value={preference?.procurementPreferences?.deliveryLocation || ''}
          onChange={(e) => onUpdate({
            procurementPreferences: {
              ...preference?.procurementPreferences,
              deliveryLocation: e.target.value
            }
          })}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg"
        />
        <p className="mt-2 text-sm text-slate-500">
          AI将自动补充此信息到采购需求中
        </p>
      </div>

      {/* Payment Terms */}
      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <h3 className="font-semibold mb-4 text-slate-800">偏好付款方式</h3>
        <input
          type="text"
          placeholder="例如：验收后30天付款"
          value={preference?.procurementPreferences?.paymentTerms || ''}
          onChange={(e) => onUpdate({
            procurementPreferences: {
              ...preference?.procurementPreferences,
              paymentTerms: e.target.value
            }
          })}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg"
        />
      </div>
    </div>
  );
};

// ==================== Chat Preferences Panel ====================

const ChatPreferencesPanel = ({ preference, onUpdate }) => {
  return (
    <div className="space-y-6">
      {/* Reply Style */}
      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <h3 className="font-semibold mb-4 text-slate-800">AI回复风格</h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            { id: 'concise', label: '简洁', desc: '直接明了，快速获取信息' },
            { id: 'detailed', label: '详细', desc: '深入分析，提供完整建议' },
            { id: 'professional', label: '专业', desc: '结构严谨，适合工作场景' }
          ].map(style => (
            <button
              key={style.id}
              onClick={() => onUpdate({
                chatPreferences: {
                  ...preference?.chatPreferences,
                  replyStyle: { type: style.id }
                }
              })}
              className={`p-4 rounded-lg border-2 transition-all ${
                preference?.chatPreferences?.replyStyle?.type === style.id
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="font-medium mb-1 text-slate-800">{style.label}</div>
              <div className="text-sm text-slate-500">{style.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* AI Voice */}
      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <h3 className="font-semibold mb-4 text-slate-800">AI人设选择</h3>
        <div className="space-y-3">
          {[
            { id: 'xiaomei', label: '小美', desc: '贴心购物助手，擅长商品推荐和比价' },
            { id: 'xiaoshuai', label: '小帅', desc: '专业寻源专家，专注于企业采购' }
          ].map(voice => (
            <label
              key={voice.id}
              className={`flex items-center p-4 rounded-lg border-2 cursor-pointer ${
                preference?.chatPreferences?.voice === voice.id
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <input
                type="radio"
                name="ai-voice"
                value={voice.id}
                checked={preference?.chatPreferences?.voice === voice.id}
                onChange={() => onUpdate({
                  chatPreferences: {
                    ...preference?.chatPreferences,
                    voice: voice.id
                  }
                })}
                className="mr-3"
              />
              <div>
                <div className="font-medium text-slate-800">{voice.label}</div>
                <div className="text-sm text-slate-500">{voice.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Enable Stream */}
      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <h3 className="font-semibold text-slate-800">流式输出</h3>
            <p className="text-sm text-slate-500">实时显示AI回复内容</p>
          </div>
          <input
            type="checkbox"
            checked={preference?.chatPreferences?.enableStream !== false}
            onChange={(e) => onUpdate({
              chatPreferences: {
                ...preference?.chatPreferences,
                enableStream: e.target.checked
              }
            })}
            className="w-5 h-5 rounded"
          />
        </label>
      </div>
    </div>
  );
};

// ==================== Feature Preferences Panel ====================

const FeaturePreferencesPanel = ({ preference, onUpdate }) => {
  return (
    <div className="space-y-6">
      {/* Auto Save Wishlist */}
      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <h3 className="font-semibold text-slate-800">自动加入心愿单</h3>
            <p className="text-sm text-slate-500">将推荐商品自动加入心愿单</p>
          </div>
          <input
            type="checkbox"
            checked={preference?.featurePreferences?.autoSaveWishlist || false}
            onChange={(e) => onUpdate({
              featurePreferences: {
                ...preference?.featurePreferences,
                autoSaveWishlist: e.target.checked
              }
            })}
            className="w-5 h-5 rounded"
          />
        </label>
      </div>

      {/* Show Price Comparison */}
      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <h3 className="font-semibold text-slate-800">显示价格对比</h3>
            <p className="text-sm text-slate-500">在商品推荐时显示价格对比</p>
          </div>
          <input
            type="checkbox"
            checked={preference?.featurePreferences?.showPriceComparison !== false}
            onChange={(e) => onUpdate({
              featurePreferences: {
                ...preference?.featurePreferences,
                showPriceComparison: e.target.checked
              }
            })}
            className="w-5 h-5 rounded"
          />
        </label>
      </div>

      {/* Enable Notifications */}
      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <h3 className="font-semibold text-slate-800">启用通知</h3>
            <p className="text-sm text-slate-500">接收重要更新和提醒</p>
          </div>
          <input
            type="checkbox"
            checked={preference?.featurePreferences?.enableNotifications !== false}
            onChange={(e) => onUpdate({
              featurePreferences: {
                ...preference?.featurePreferences,
                enableNotifications: e.target.checked
              }
            })}
            className="w-5 h-5 rounded"
          />
        </label>
      </div>

      {/* Dark Mode */}
      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <h3 className="font-semibold text-slate-800">深色模式</h3>
            <p className="text-sm text-slate-500">使用深色主题</p>
          </div>
          <input
            type="checkbox"
            checked={preference?.featurePreferences?.darkMode || false}
            onChange={(e) => onUpdate({
              featurePreferences: {
                ...preference?.featurePreferences,
                darkMode: e.target.checked
              }
            })}
            className="w-5 h-5 rounded"
          />
        </label>
      </div>
    </div>
  );
};

export default PreferenceSettings;
