const express = require('express');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { getAllUsers, findUserById, updateUserSettings } = require('../data/users');

const router = express.Router();

// Get all users (admin only)
router.get('/', authenticateToken, requirePermission('manage_users'), async (req, res) => {
  try {
    const users = await getAllUsers();
    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to retrieve users' });
  }
});

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await findUserById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        permissions: user.permissions,
        createdAt: user.createdAt,
        settings: user.settings
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to retrieve profile' });
  }
});

// Update user settings
router.put('/settings', authenticateToken, async (req, res) => {
  try {
    const { defaultQuality, notifications } = req.body;

    const settings = {};
    if (defaultQuality !== undefined) settings.defaultQuality = defaultQuality;
    if (notifications !== undefined) settings.notifications = notifications;

    const updatedUser = await updateUserSettings(req.user.userId, settings);

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'Settings updated successfully',
      settings: updatedUser.settings
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

module.exports = router;
