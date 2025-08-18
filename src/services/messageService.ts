import { apiConnector } from './apiConnector';

const BASE_URL = '/api/v1/messages';

export interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  receiver_id: number;
  message: string;
  message_type: 'text' | 'image' | 'file' | 'system';
  is_read: boolean;
  read_at?: string;
  created_at: string;
  sender_firstname?: string;
  sender_lastname?: string;
  isMe?: boolean;
}

export interface Conversation {
  conversation_id: number;
  user1_id: number;
  user2_id: number;
  other_user_id: number;
  other_user_firstname: string;
  other_user_lastname: string;
  last_message_at: string;
  created_at: string;
  unread_count: number;
  last_message: string;
}

export interface SendMessageRequest {
  receiverId: number;
  message: string;
  messageType?: 'text' | 'image' | 'file' | 'system';
}

class MessageService {
  /**
   * Get user conversations
   */
  async getConversations(): Promise<{ success: boolean; conversations: Conversation[] }> {
    try {
      const response = await apiConnector('GET', `${BASE_URL}/conversations`);
      return response.data;
    } catch (error) {
      console.error('Error getting conversations:', error);
      throw error;
    }
  }

  /**
   * Get messages for a conversation
   */
  async getConversationMessages(
    conversationId: number,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ success: boolean; messages: Message[] }> {
    try {
      const response = await apiConnector(
        'GET',
        `${BASE_URL}/conversation/${conversationId}?limit=${limit}&offset=${offset}`
      );
      return response.data;
    } catch (error) {
      console.error('Error getting conversation messages:', error);
      throw error;
    }
  }

  /**
   * Send a message
   */
  async sendMessage(messageData: SendMessageRequest): Promise<{ success: boolean; data: Message }> {
    try {
      const response = await apiConnector('POST', `${BASE_URL}/send`, messageData);
      return response.data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Search messages
   */
  async searchMessages(
    searchTerm: string,
    limit: number = 20
  ): Promise<{ success: boolean; messages: Message[] }> {
    try {
      const response = await apiConnector(
        'GET',
        `${BASE_URL}/search?q=${encodeURIComponent(searchTerm)}&limit=${limit}`
      );
      return response.data;
    } catch (error) {
      console.error('Error searching messages:', error);
      throw error;
    }
  }

  /**
   * Get unread message count
   */
  async getUnreadCount(): Promise<{ success: boolean; unreadCount: number }> {
    try {
      const response = await apiConnector('GET', `${BASE_URL}/unread-count`);
      return response.data;
    } catch (error) {
      console.error('Error getting unread count:', error);
      throw error;
    }
  }

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(conversationId: number): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiConnector('PUT', `${BASE_URL}/mark-read/${conversationId}`);
      return response.data;
    } catch (error) {
      console.error('Error marking messages as read:', error);
      throw error;
    }
  }

  /**
   * Delete a message
   */
  async deleteMessage(messageId: number): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiConnector('DELETE', `${BASE_URL}/delete/${messageId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }

  /**
   * Format message for display
   */
  formatMessage(message: Message, currentUserId: number): Message {
    return {
      ...message,
      isMe: message.sender_id === currentUserId,
    };
  }

  /**
   * Format conversation for display
   */
  formatConversation(conversation: Conversation): Conversation & {
    name: string;
    avatar?: string;
    time: string;
    online: boolean;
  } {
    const name = `${conversation.other_user_firstname} ${conversation.other_user_lastname}`;
    const time = this.formatTime(conversation.last_message_at);
    
    return {
      ...conversation,
      name,
      time,
      online: false, // This would need real-time status tracking
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
    };
  }

  /**
   * Format timestamp for display
   */
  private formatTime(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d ago`;
    
    return date.toLocaleDateString();
  }

  /**
   * Validate message before sending
   */
  validateMessage(message: string): { isValid: boolean; error?: string } {
    if (!message || !message.trim()) {
      return { isValid: false, error: 'Message cannot be empty' };
    }
    
    if (message.length > 5000) {
      return { isValid: false, error: 'Message is too long (max 5000 characters)' };
    }
    
    return { isValid: true };
  }

  /**
   * Get conversation display name
   */
  getConversationDisplayName(conversation: Conversation): string {
    return `${conversation.other_user_firstname} ${conversation.other_user_lastname}`;
  }

  /**
   * Check if user is online (placeholder for future implementation)
   */
  isUserOnline(userId: number): boolean {
    // This would integrate with Socket.IO presence tracking
    return false;
  }
}

export const messageService = new MessageService();
export default messageService;