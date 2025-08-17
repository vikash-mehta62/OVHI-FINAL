const express = require('express');
const router = express.Router();
const messageService = require('../services/messaging/messageService');
const { authenticateToken } = require('../middleware/auth');

/**
 * @swagger
 * /api/v1/messages/conversations:
 *   get:
 *     summary: Get user conversations
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of conversations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 conversations:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.get('/conversations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const conversations = await messageService.getUserConversations(userId);
    
    res.json({
      success: true,
      conversations
    });
  } catch (error) {
    console.error('Error getting conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get conversations',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/messages/conversation/{conversationId}:
 *   get:
 *     summary: Get messages for a conversation
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: List of messages
 */
router.get('/conversation/:conversationId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { conversationId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    const messages = await messageService.getConversationMessages(
      conversationId, 
      userId, 
      parseInt(limit), 
      parseInt(offset)
    );
    
    // Mark messages as read
    await messageService.markMessagesAsRead(conversationId, userId);
    
    res.json({
      success: true,
      messages
    });
  } catch (error) {
    console.error('Error getting conversation messages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get messages',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/messages/send:
 *   post:
 *     summary: Send a message
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - receiverId
 *               - message
 *             properties:
 *               receiverId:
 *                 type: integer
 *               message:
 *                 type: string
 *               messageType:
 *                 type: string
 *                 enum: [text, image, file, system]
 *                 default: text
 *     responses:
 *       201:
 *         description: Message sent successfully
 */
router.post('/send', authenticateToken, async (req, res) => {
  try {
    const senderId = req.user.user_id;
    const { receiverId, message, messageType = 'text' } = req.body;
    
    if (!receiverId || !message?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Receiver ID and message are required'
      });
    }
    
    const messageData = await messageService.sendMessage(
      senderId, 
      receiverId, 
      message.trim(), 
      messageType
    );
    
    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: messageData
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/messages/search:
 *   get:
 *     summary: Search messages
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Search results
 */
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { q: searchTerm, limit = 20 } = req.query;
    
    if (!searchTerm?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Search term is required'
      });
    }
    
    const messages = await messageService.searchMessages(
      userId, 
      searchTerm.trim(), 
      parseInt(limit)
    );
    
    res.json({
      success: true,
      messages
    });
  } catch (error) {
    console.error('Error searching messages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search messages',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/messages/unread-count:
 *   get:
 *     summary: Get unread message count
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread count
 */
router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const unreadCount = await messageService.getUnreadCount(userId);
    
    res.json({
      success: true,
      unreadCount
    });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get unread count',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/messages/mark-read/{conversationId}:
 *   put:
 *     summary: Mark messages as read
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Messages marked as read
 */
router.put('/mark-read/:conversationId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { conversationId } = req.params;
    
    const affectedRows = await messageService.markMessagesAsRead(conversationId, userId);
    
    res.json({
      success: true,
      message: `${affectedRows} messages marked as read`
    });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark messages as read',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/messages/delete/{messageId}:
 *   delete:
 *     summary: Delete a message
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Message deleted successfully
 */
router.delete('/delete/:messageId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { messageId } = req.params;
    
    const deleted = await messageService.deleteMessage(messageId, userId);
    
    if (deleted) {
      res.json({
        success: true,
        message: 'Message deleted successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Message not found or access denied'
      });
    }
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete message',
      error: error.message
    });
  }
});

module.exports = router;