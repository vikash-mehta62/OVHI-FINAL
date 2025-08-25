import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CalendarDays,
  Clock,
  Plus,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  RefreshCw,
  Bell
} from 'lucide-react';
import { formatDate } from '@/utils/rcmFormatters';

interface FollowUp {
  id: number;
  title: string;
  followup_type: string;
  scheduled_date: string;
  due_date?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'overdue';
  assigned_user_name: string;
}

interface FollowUpWidgetProps {
  claimId?: number;
  userId?: number;
  maxItems?: number;
  showAddButton?: boolean;
  onViewAll?: () => void;
  onAddFollowUp?: () => void;
  className?: string;
}

const FollowUpWidget: React.FC<FollowUpWidgetProps> = ({
  claimId,
  userId,
  maxItems = 5,
  showAddButton = true,
  onViewAll,
  onAddFollowUp,
  className = ''
}) => {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  // Fetch recent follow-ups
  const fetchFollowUps = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const queryParams = new URLSearchParams({
        limit: maxItems.toString(),
        ...(claimId && { claimId: claimId.toString() }),
        ...(userId && { assignedUser: userId.toString() }),
        status: 'pending,in_progress,overdue'
      });

      const endpoint = claimId 
        ? `/api/v1/rcm/claims/${claimId}/followups`
        : `/api/v1/rcm/followups`;

      const response = await fetch(`${endpoint}?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch follow-ups');
      }

      const data = await response.json();
      
      if (data.success) {
        setFollowUps(data.data.followups || []);
        setTotalCount(data.data.total || 0);
      } else {
        throw new Error(data.message || 'Failed to fetch follow-ups');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Complete follow-up
  const completeFollowUp = async (followUpId: number) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`/api/v1/rcm/followups/${followUpId}/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ outcome: 'Completed via widget' })
      });

      if (response.ok) {
        await fetchFollowUps();
      }
    } catch (error) {
      console.error('Error completing follow-up:', error);
    }
  };

  // Get priority color
  const getPriorityColor = (priority: FollowUp['priority']) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-white';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  // Get status color
  const getStatusColor = (status: FollowUp['status']) => {
    switch (status) {
      case 'overdue': return 'text-red-600';
      case 'in_progress': return 'text-blue-600';
      default: return 'text-yellow-600';
    }
  };

  // Get status icon
  const getStatusIcon = (status: FollowUp['status']) => {
    switch (status) {
      case 'overdue': return <AlertCircle className="h-3 w-3" />;
      case 'in_progress': return <Clock className="h-3 w-3" />;
      default: return <CalendarDays className="h-3 w-3" />;
    }
  };

  // Check if follow-up is due soon
  const isDueSoon = (followUp: FollowUp) => {
    if (!followUp.due_date) return false;
    const dueDate = new Date(followUp.due_date);
    const now = new Date();
    const diffHours = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return diffHours <= 24 && diffHours > 0;
  };

  useEffect(() => {
    fetchFollowUps();
  }, [claimId, userId]);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Upcoming Follow-ups
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Upcoming Follow-ups
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-sm text-red-600 mb-2">{error}</p>
            <Button 
              onClick={fetchFollowUps} 
              size="sm"
              variant="outline"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Upcoming Follow-ups
            {totalCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {totalCount}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-1">
            {showAddButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onAddFollowUp}
                className="text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            )}
            {totalCount > maxItems && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onViewAll}
                className="text-xs"
              >
                View All
                <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {followUps.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No upcoming follow-ups</p>
            {showAddButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onAddFollowUp}
                className="mt-2 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Schedule your first follow-up
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {followUps.map((followUp) => (
              <div key={followUp.id} className="flex items-start space-x-3 pb-3 border-b border-gray-100 last:border-b-0 last:pb-0">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${getStatusColor(followUp.status)}`}>
                  {getStatusIcon(followUp.status)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium truncate">
                      {followUp.title}
                    </span>
                    <Badge 
                      className={`text-xs ${getPriorityColor(followUp.priority)}`}
                    >
                      {followUp.priority}
                    </Badge>
                    {isDueSoon(followUp) && (
                      <Bell className="h-3 w-3 text-orange-500" title="Due soon" />
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3 text-xs text-gray-500 mb-1">
                    <span>Scheduled: {formatDate(followUp.scheduled_date)}</span>
                    {followUp.due_date && (
                      <span>Due: {formatDate(followUp.due_date)}</span>
                    )}
                  </div>
                  
                  <div className="text-xs text-gray-600">
                    Assigned to: {followUp.assigned_user_name}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {followUp.status === 'pending' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => completeFollowUp(followUp.id)}
                      className="h-6 w-6 p-0 text-green-600 hover:text-green-700"
                      title="Mark as complete"
                    >
                      <CheckCircle className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            
            {totalCount > maxItems && (
              <div className="text-center pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onViewAll}
                  className="text-xs text-muted-foreground"
                >
                  View {totalCount - maxItems} more follow-ups
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FollowUpWidget;