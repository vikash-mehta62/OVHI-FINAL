import React, { useState, useEffect, useRef } from 'react';
import { Bell, CheckCheck, Trash2, Calendar, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { formatDistanceToNow } from 'date-fns';
import {
  getAllNotificationsAPI,
  markNotificationAsReadAPI,
  markAllNotificationsAsReadAPI,
  deleteNotificationAPI,
  Notification
} from '@/services/operations/notifications';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

const NotificationsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();
  const { token } = useSelector((state: any) => state.auth);
  const pageSize = 20;
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchNotifications = async (unreadOnly: boolean = false, offset: number = 0) => {
    if (!token) return;

    try {
      setIsLoading(true);
      const data = await getAllNotificationsAPI(token, pageSize, offset, unreadOnly);
      setNotifications(data.notifications);
      setTotalCount(data.total);
      setUnreadCount(data.counts.unread);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const unreadOnly = activeTab === 'unread';
    fetchNotifications(unreadOnly, page * pageSize);

    // Auto-refresh every 15 seconds when on notifications page
    pollingIntervalRef.current = setInterval(() => {
      fetchNotifications(unreadOnly, page * pageSize);
    }, 15000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [activeTab, page, token]);

  const handleTabChange = (value: string) => {
    setActiveTab(value as 'all' | 'unread');
    setPage(0);
  };

  const handleMarkAsRead = async (notificationId: number) => {
    if (!token) return;

    const success = await markNotificationAsReadAPI(token, notificationId);
    if (success) {
      fetchNotifications(activeTab === 'unread', page * pageSize);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!token) return;

    const success = await markAllNotificationsAsReadAPI(token);
    if (success) {
      fetchNotifications(activeTab === 'unread', page * pageSize);
    }
  };

  const handleDelete = async (notificationId: number) => {
    if (!token) return;

    const success = await deleteNotificationAPI(token, notificationId);
    if (success) {
      fetchNotifications(activeTab === 'unread', page * pageSize);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if unread
    if (!notification.read_at && token) {
      await markNotificationAsReadAPI(token, notification.id);
    }

    // Navigate if action URL exists
    if (notification.metadata?.action_url) {
      navigate(notification.metadata.action_url);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'appointment_scheduled':
        return <Calendar className="h-5 w-5 text-green-500" />;
      case 'appointment_rescheduled':
        return <Calendar className="h-5 w-5 text-blue-500" />;
      case 'appointment_cancelled':
        return <Calendar className="h-5 w-5 text-red-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-muted-foreground mt-1">
            Stay updated with your appointment alerts
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => fetchNotifications(activeTab === 'unread', page * pageSize)} 
            variant="outline" 
            size="sm"
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {unreadCount > 0 && (
            <Button onClick={handleMarkAllAsRead} variant="outline" size="sm">
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark all as read
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
          <TabsTrigger value="all">
            All
            {totalCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {totalCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="unread">
            Unread
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {isLoading ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">Loading notifications...</p>
              </CardContent>
            </Card>
          ) : notifications.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Bell className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No notifications</h3>
                <p className="text-muted-foreground">
                  {activeTab === 'unread'
                    ? "You're all caught up!"
                    : 'No notifications to display'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <Card
                    key={notification.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      !notification.read_at ? 'border-l-4 border-l-primary bg-accent/50' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 mt-1">
                          {getNotificationIcon(notification.notification_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="font-semibold text-base">
                                {notification.title}
                              </h3>
                              {!notification.read_at && (
                                <Badge variant="secondary" className="mt-1">
                                  New
                                </Badge>
                              )}
                            </div>
                            <div className="flex gap-2">
                              {!notification.read_at && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMarkAsRead(notification.id);
                                  }}
                                >
                                  <CheckCheck className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(notification.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {formatDistanceToNow(new Date(notification.sent_at), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {page + 1} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NotificationsPage;
