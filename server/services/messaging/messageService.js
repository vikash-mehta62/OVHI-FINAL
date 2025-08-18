const pool = require('../../config/db');
const { getIO } = require('../../socketIO/socket');

class MessageService {
  /**
   * Get conversations for a user with unread counts
   */
  async getUserConversations(userId) {
    let connection;
    try {
      connection = await pool.getConnection();
      
      const [conversations] = await connection.query(`
        SELECT 
          tc.id as conversation_id,
          tc.user1_id,
          tc.user2_id,
          tc.last_message_at,
          tc.created_at,
          CASE 
            WHEN tc.user1_id = ? THEN u2.firstname
            ELSE u1.firstname
          END as other_user_firstname,
          CASE 
            WHEN tc.user1_id = ? THEN u2.lastname
            ELSE u1.lastname
          END as other_user_lastname,
          CASE 
            WHEN tc.user1_id = ? THEN tc.user2_id
            ELSE tc.user1_id
          END as other_user_id,
          (SELECT COUNT(*) 
           FROM team_messages tm 
           WHERE tm.conversation_id = tc.id 
           AND tm.receiver_id = ? 
           AND tm.is_read = FALSE) as unread_count,
          (SELECT tm.message 
           FROM team_messages tm 
           WHERE tm.conversation_id = tc.id 
           ORDER BY tm.created_at DESC 
           LIMIT 1) as last_message
        FROM team_conversations tc
        LEFT JOIN users u1 ON tc.user1_id = u1.user_id
        LEFT JOIN users u2 ON tc.user2_id = u2.user_id
        WHERE tc.user1_id = ? OR tc.user2_id = ?
        ORDER BY tc.last_message_at DESC, tc.created_at DESC
      `, [userId, userId, userId, userId, userId, userId]);
      
      return conversations;
    } catch (error) {
      console.error('Error getting user conversations:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Get messages for a conversation with pagination
   */
  async getConversationMessages(conversationId, userId, limit = 50, offset = 0) {
    let connection;
    try {
      connection = await pool.getConnection();
      
      // Verify user is part of conversation
      const [conversationCheck] = await connection.query(`
        SELECT id FROM team_conversations 
        WHERE id = ? AND (user1_id = ? OR user2_id = ?)
      `, [conversationId, userId, userId]);
      
      if (conversationCheck.length === 0) {
        throw new Error('Conversation not found or access denied');
      }
      
      const [messages] = await connection.query(`
        SELECT 
          tm.id,
          tm.conversation_id,
          tm.sender_id,
          tm.receiver_id,
          tm.message,
          tm.message_type,
          tm.is_read,
          tm.read_at,
          tm.created_at,
          u.firstname as sender_firstname,
          u.lastname as sender_lastname
        FROM team_messages tm
        LEFT JOIN users u ON tm.sender_id = u.user_id
        WHERE tm.conversation_id = ?
        ORDER BY tm.created_at DESC
        LIMIT ? OFFSET ?
      `, [conversationId, limit, offset]);
      
      return messages.reverse(); // Return in chronological order
    } catch (error) {
      console.error('Error getting conversation messages:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(conversationId, userId) {
    let connection;
    try {
      connection = await pool.getConnection();
      
      const [result] = await connection.query(`
        UPDATE team_messages 
        SET is_read = TRUE, read_at = NOW()
        WHERE conversation_id = ? 
        AND receiver_id = ? 
        AND is_read = FALSE
      `, [conversationId, userId]);
      
      return result.affectedRows;
    } catch (error) {
      console.error('Error marking messages as read:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Send a message
   */
  async sendMessage(senderId, receiverId, message, messageType = 'text') {
    let connection;
    try {
      connection = await pool.getConnection();
      
      // Find or create conversation
      const conversationId = await this.findOrCreateConversation(senderId, receiverId);
      
      // Insert message
      const [result] = await connection.query(`
        INSERT INTO team_messages (conversation_id, sender_id, receiver_id, message, message_type, created_at)
        VALUES (?, ?, ?, ?, ?, NOW())
      `, [conversationId, senderId, receiverId, message, messageType]);
      
      // Get the complete message data
      const [messageData] = await connection.query(`
        SELECT 
          tm.*,
          u.firstname as sender_firstname,
          u.lastname as sender_lastname
        FROM team_messages tm
        LEFT JOIN users u ON tm.sender_id = u.user_id
        WHERE tm.id = ?
      `, [result.insertId]);
      
      // Emit to Socket.IO
      const io = getIO();
      io.to(`user_${receiverId}`).emit('receiveMessage', messageData[0]);
      
      return messageData[0];
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Find or create conversation between two users
   */
  async findOrCreateConversation(user1Id, user2Id) {
    let connection;
    try {
      connection = await pool.getConnection();
      
      // Check if conversation exists (order-agnostic)
      const [rows] = await connection.query(`
        SELECT id FROM team_conversations 
        WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)
      `, [user1Id, user2Id, user2Id, user1Id]);
      
      if (rows.length > 0) {
        return rows[0].id;
      }
      
      // Create new conversation
      const [result] = await connection.query(`
        INSERT INTO team_conversations (user1_id, user2_id, created_at)
        VALUES (?, ?, NOW())
      `, [Math.min(user1Id, user2Id), Math.max(user1Id, user2Id)]);
      
      return result.insertId;
    } catch (error) {
      console.error('Error with conversation:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Search messages
   */
  async searchMessages(userId, searchTerm, limit = 20) {
    let connection;
    try {
      connection = await pool.getConnection();
      
      const [messages] = await connection.query(`
        SELECT 
          tm.id,
          tm.conversation_id,
          tm.sender_id,
          tm.receiver_id,
          tm.message,
          tm.created_at,
          u.firstname as sender_firstname,
          u.lastname as sender_lastname,
          CASE 
            WHEN tc.user1_id = ? THEN u2.firstname
            ELSE u1.firstname
          END as other_user_firstname,
          CASE 
            WHEN tc.user1_id = ? THEN u2.lastname
            ELSE u1.lastname
          END as other_user_lastname
        FROM team_messages tm
        LEFT JOIN team_conversations tc ON tm.conversation_id = tc.id
        LEFT JOIN users u ON tm.sender_id = u.user_id
        LEFT JOIN users u1 ON tc.user1_id = u1.user_id
        LEFT JOIN users u2 ON tc.user2_id = u2.user_id
        WHERE (tc.user1_id = ? OR tc.user2_id = ?)
        AND tm.message LIKE ?
        ORDER BY tm.created_at DESC
        LIMIT ?
      `, [userId, userId, userId, userId, `%${searchTerm}%`, limit]);
      
      return messages;
    } catch (error) {
      console.error('Error searching messages:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Get unread message count for user
   */
  async getUnreadCount(userId) {
    let connection;
    try {
      connection = await pool.getConnection();
      
      const [result] = await connection.query(`
        SELECT COUNT(*) as unread_count
        FROM team_messages tm
        WHERE tm.receiver_id = ? AND tm.is_read = FALSE
      `, [userId]);
      
      return result[0].unread_count;
    } catch (error) {
      console.error('Error getting unread count:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Delete a message (soft delete)
   */
  async deleteMessage(messageId, userId) {
    let connection;
    try {
      connection = await pool.getConnection();
      
      // Verify user owns the message
      const [messageCheck] = await connection.query(`
        SELECT id FROM team_messages 
        WHERE id = ? AND sender_id = ?
      `, [messageId, userId]);
      
      if (messageCheck.length === 0) {
        throw new Error('Message not found or access denied');
      }
      
      const [result] = await connection.query(`
        UPDATE team_messages 
        SET message = '[Message deleted]', message_type = 'system'
        WHERE id = ? AND sender_id = ?
      `, [messageId, userId]);
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }
}

module.exports = new MessageService();