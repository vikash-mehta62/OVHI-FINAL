const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const {
  getUnreadNotifications,
  getAllNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getNotificationCount
} = require('../services/notifications/inAppNotificationService');

/**
 * GET /api/v1/notifications/unread
 * Get all unread in-app notifications for the authenticated user
 */
router.get('/unread', verifyToken, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const notifications = await getUnreadNotifications(userId);
    
    res.json({
      success: true,
      data: notifications
    });
  } catch (error) {
    console.error('Error fetching unread notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unread notifications'
    });
  }
});

/**
 * GET /api/v1/notifications
 * Get all in-app notifications with pagination
 * Query params: limit, offset, unreadOnly
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    const unreadOnly = req.query.unreadOnly === 'true';
    
    const notifications = await getAllNotifications(userId, limit, offset, unreadOnly);
    const counts = await getNotificationCount(userId);
    
    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          limit,
          offset,
          total: unreadOnly ? counts.unread : counts.total
        },
        counts
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications'
    });
  }
});

/**
 * PUT /api/v1/notifications/:id/read
 * Mark a specific notification as read
 */
router.put('/:id/read', verifyToken, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const notificationId = req.params.id;
    
    const success = await markNotificationAsRead(notificationId, userId);
    
    if (success) {
      res.json({
        success: true,
        message: 'Notification marked as read'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read'
    });
  }
});

/**
 * PUT /api/v1/notifications/read-all
 * Mark all notifications as read
 */
router.put('/read-all', verifyToken, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const count = await markAllNotificationsAsRead(userId);
    
    res.json({
      success: true,
      message: `${count} notification(s) marked as read`
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read'
    });
  }
});

/**
 * DELETE /api/v1/notifications/:id
 * Delete a specific notification
 */
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const notificationId = req.params.id;
    
    const success = await deleteNotification(notificationId, userId);
    
    if (success) {
      res.json({
        success: true,
        message: 'Notification deleted'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification'
    });
  }
});

/**
 * GET /api/v1/notifications/count
 * Get notification counts
 */
router.get('/count', verifyToken, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const counts = await getNotificationCount(userId);
    
    res.json({
      success: true,
      data: counts
    });
  } catch (error) {
    console.error('Error fetching notification count:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification count'
    });
  }
});

module.exports = router;
