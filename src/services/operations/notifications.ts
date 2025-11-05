import { apiConnector } from '../apiConnector';

const BASE_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:8000/api/v1';

export interface Notification {
  id: number;
  notification_type: string;
  title: string;
  message: string;
  sent_at: string;
  read_at?: string;
  metadata?: {
    appointment_id?: string;
    action_url?: string;
    event_type?: string;
    [key: string]: any;
  };
}

export interface NotificationCounts {
  total: number;
  unread: number;
}

/**
 * Get unread in-app notifications
 */
export const getUnreadNotificationsAPI = async (token: string): Promise<Notification[]> => {
  try {
    const response = await apiConnector(
      'GET',
      `${BASE_URL}/notifications/unread`,
      null,
      { Authorization: `Bearer ${token}` }
    );

    if (response?.data?.success) {
      return response.data.data;
    }
    return [];
  } catch (error) {
    console.error('GET_UNREAD_NOTIFICATIONS_API ERROR:', error);
    return [];
  }
};

/**
 * Get all notifications with pagination
 */
export const getAllNotificationsAPI = async (
  token: string,
  limit: number = 20,
  offset: number = 0,
  unreadOnly: boolean = false
): Promise<{ notifications: Notification[]; counts: NotificationCounts; total: number }> => {
  try {
    const response = await apiConnector(
      'GET',
      `${BASE_URL}/notifications?limit=${limit}&offset=${offset}&unreadOnly=${unreadOnly}`,
      null,
      { Authorization: `Bearer ${token}` }
    );

    if (response?.data?.success) {
      return {
        notifications: response.data.data.notifications,
        counts: response.data.data.counts,
        total: response.data.data.pagination.total
      };
    }
    return { notifications: [], counts: { total: 0, unread: 0 }, total: 0 };
  } catch (error) {
    console.error('GET_ALL_NOTIFICATIONS_API ERROR:', error);
    return { notifications: [], counts: { total: 0, unread: 0 }, total: 0 };
  }
};

/**
 * Mark a notification as read
 */
export const markNotificationAsReadAPI = async (
  token: string,
  notificationId: number
): Promise<boolean> => {
  try {
    const response = await apiConnector(
      'PUT',
      `${BASE_URL}/notifications/${notificationId}/read`,
      null,
      { Authorization: `Bearer ${token}` }
    );

    return response?.data?.success || false;
  } catch (error) {
    console.error('MARK_NOTIFICATION_AS_READ_API ERROR:', error);
    return false;
  }
};

/**
 * Mark all notifications as read
 */
export const markAllNotificationsAsReadAPI = async (token: string): Promise<boolean> => {
  try {
    const response = await apiConnector(
      'PUT',
      `${BASE_URL}/notifications/read-all`,
      null,
      { Authorization: `Bearer ${token}` }
    );

    return response?.data?.success || false;
  } catch (error) {
    console.error('MARK_ALL_NOTIFICATIONS_AS_READ_API ERROR:', error);
    return false;
  }
};

/**
 * Delete a notification
 */
export const deleteNotificationAPI = async (
  token: string,
  notificationId: number
): Promise<boolean> => {
  try {
    const response = await apiConnector(
      'DELETE',
      `${BASE_URL}/notifications/${notificationId}`,
      null,
      { Authorization: `Bearer ${token}` }
    );

    return response?.data?.success || false;
  } catch (error) {
    console.error('DELETE_NOTIFICATION_API ERROR:', error);
    return false;
  }
};
