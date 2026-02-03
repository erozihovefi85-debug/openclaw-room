import express from 'express';
import { auth } from '../middleware/auth.js';
import UserPreference from '../models/UserPreference.js';

const router = express.Router();

/**
 * 获取用户偏好
 * GET /api/user-preferences
 */
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.userId;

    let preference = await UserPreference.findOne({ userId });

    // 如果用户首次使用，返回默认偏好
    if (!preference) {
      preference = {
        userId,
        procurementPreferences: {
          defaultCategory: '',
          preferredSuppliers: [],
          preferredPriceRange: { min: 0, max: Number.MAX_SAFE_INTEGER },
          deliveryLocation: '',
          qualityPriority: { type: 'balanced', weight: 0.5 },
          paymentTerms: ''
        },
        chatPreferences: {
          replyStyle: { type: 'professional' },
          language: 'zh-CN',
          voice: 'xiaoshuai',
          enableStream: true
        },
        featurePreferences: {
          autoSaveWishlist: false,
          showPriceComparison: true,
          enableNotifications: true,
          darkMode: false
        },
        learningData: {
          satisfiedQueries: [],
          dissatisfiedQueries: [],
          categoryFrequency: {},
          supplierFrequency: {}
        },
        version: 1
      };
    }

    res.json({ success: true, data: preference });
  } catch (error) {
    console.error('[User Preferences] Get error:', error);
    res.status(500).json({ message: '获取用户偏好失败', error: error.message });
  }
});

/**
 * 创建或更新用户偏好
 * POST /api/user-preferences
 */
router.post('/', auth, async (req, res) => {
  try {
    const userId = req.userId;
    const updates = req.body;

    // 验证数据结构
    if (updates.procurementPreferences) {
      if (updates.procurementPreferences.preferredPriceRange) {
        const { min, max } = updates.procurementPreferences.preferredPriceRange;
        if (typeof min !== 'number' || typeof max !== 'number') {
          return res.status(400).json({ message: '价格区间必须是数字' });
        }
      }
    }

    // 查找现有偏好
    let preference = await UserPreference.findOne({ userId });

    if (preference) {
      // 更新现有偏好
      Object.assign(preference, updates);
      preference.version += 1;
      await preference.save();
    } else {
      // 创建新偏好
      preference = await UserPreference.create({
        userId,
        ...updates,
        version: 1
      });
    }

    res.json({ success: true, data: preference });
  } catch (error) {
    console.error('[User Preferences] Create/Update error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: '用户偏好已存在，请使用PATCH更新' });
    }
    res.status(500).json({ message: '保存用户偏好失败', error: error.message });
  }
});

/**
 * 部分更新用户偏好
 * PATCH /api/user-preferences
 */
router.patch('/', auth, async (req, res) => {
  try {
    const userId = req.userId;
    const updates = req.body;

    let preference = await UserPreference.findOne({ userId });

    if (!preference) {
      // 如果不存在，创建新的
      preference = await UserPreference.create({
        userId,
        ...updates,
        version: 1
      });
    } else {
      // 深度合并更新
      const mergedPreference = deepMerge(preference, updates);
      mergedPreference.version += 1;
      // 使用 findOneAndUpdate 或者直接更新字段
      await UserPreference.updateOne(
        { userId },
        { $set: mergedPreference }
      );
      preference = mergedPreference;
    }

    res.json({ success: true, data: preference });
  } catch (error) {
    console.error('[User Preferences] Patch error:', error);
    res.status(500).json({ message: '更新用户偏好失败', error: error.message });
  }
});

/**
 * 更新特定字段
 * PATCH /api/user-preferences/:field
 */
router.patch('/:field', auth, async (req, res) => {
  try {
    const userId = req.userId;
    const { field } = req.params;
    const value = req.body.value;

    // 允许更新的字段路径
    const allowedFields = [
      'procurementPreferences.defaultCategory',
      'procurementPreferences.qualityPriority',
      'procurementPreferences.deliveryLocation',
      'procurementPreferences.paymentTerms',
      'chatPreferences.replyStyle.type',
      'chatPreferences.voice',
      'chatPreferences.language',
      'featurePreferences.autoSaveWishlist',
      'featurePreferences.showPriceComparison',
      'featurePreferences.darkMode'
    ];

    if (!allowedFields.includes(field)) {
      return res.status(400).json({ message: '不支持更新此字段' });
    }

    const preference = await UserPreference.findOne({ userId });

    if (!preference) {
      return res.status(404).json({ message: '用户偏好不存在，请先创建' });
    }

    // 设置字段值
    const keys = field.split('.');
    let obj = preference;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!obj[keys[i]]) obj[keys[i]] = {};
      obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = value;

    preference.version += 1;
    await preference.save();

    res.json({ success: true, data: preference });
  } catch (error) {
    console.error('[User Preferences] Field patch error:', error);
    res.status(500).json({ message: '更新字段失败', error: error.message });
  }
});

/**
 * 重置用户偏好为默认值
 * DELETE /api/user-preferences/reset
 */
router.delete('/reset', auth, async (req, res) => {
  try {
    const userId = req.userId;

    await UserPreference.deleteOne({ userId });

    const defaultPreference = {
      userId,
      procurementPreferences: {
        defaultCategory: '',
        preferredSuppliers: [],
        preferredPriceRange: { min: 0, max: Number.MAX_SAFE_INTEGER },
        deliveryLocation: '',
        qualityPriority: { type: 'balanced', weight: 0.5 },
        paymentTerms: ''
      },
      chatPreferences: {
        replyStyle: { type: 'professional' },
        language: 'zh-CN',
        voice: 'xiaoshuai',
        enableStream: true
      },
      featurePreferences: {
        autoSaveWishlist: false,
        showPriceComparison: true,
        enableNotifications: true,
        darkMode: false
      },
      learningData: {
        satisfiedQueries: [],
        dissatisfiedQueries: [],
        categoryFrequency: {},
        supplierFrequency: {}
      },
      version: 1
    };

    res.json({ success: true, message: '已重置为默认偏好', data: defaultPreference });
  } catch (error) {
    console.error('[User Preferences] Reset error:', error);
    res.status(500).json({ message: '重置失败', error: error.message });
  }
});

/**
 * 深度合并对象的辅助函数
 */
function deepMerge(target, source) {
  const result = { ...target };

  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }

  return result;
}

export default router;
