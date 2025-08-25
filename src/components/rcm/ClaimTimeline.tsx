import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Timeline,
  FileText,
  Send,
  DollarSign,
  XCircle,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  RefreshCw,
  Calendar
} from 'lucide-react';
import { formatDate } from '@/utils/rcmFormatters';

interface TimelineEvent {
  id: number;
  action_type: string;
  timestamp: string;
  formatted_action: string;
  change_summary: string;
  user_name: string;
  status?: string;
  amount?: number;
  notes?: string;
}

interface ClaimTimelineProps {
  claimId: number;
  className?: string;
}

const ClaimTimeline: React.FC<ClaimTimelineProps> = ({ claimId, className = '' }) => {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch timeline events
  const fetchTimeline = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Fetch key lifecycle events
      const response = await fetch(`/api/v1/rcm/claims/${claimId}/history?actionType=created,submitted,paid,denied,appealed&limit=50`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch timeline');
      }

      const data = await response.json();
      
      if (data.success) {
        setEvents(data.data.history);
      } else {
        throw new Error(data.message || 'Failed to fetch timeline');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Get event icon and color
  const getEventStyle = (actionType: string) => {
    switch (actionType) {
      case 'created':
        return {
          icon: <FileText className="h-5 w-5" />,
          color: 'bg-blue-500 text-white',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200'
        };
      case 'submitted':
        return {
          icon: <Send className="h-5 w-5" />,
          color: 'bg-green-500 text-white',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200'
        };
      case 'paid':
        return {
          icon: <DollarSign className="h-5 w-5" />,
          color: 'bg-emerald-500 text-white',
          bgColor: 'bg-emerald-50',
          borderColor: 'border-emerald-200'
        };
      case 'denied':
        return {
          icon: <XCircle className="h-5 w-5" />,
          color: 'bg-red-500 text-white',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200'
        };
      case 'appealed':
        return {
          icon: <AlertTriangle className="h-5 w-5" />,
          color: 'bg-purple-500 text-white',
          bgColor: 'bg-purple-50',
          borderColor: 'border-purple-200'
        };
      case 'validated':
        return {
          icon: <CheckCircle className="h-5 w-5" />,
          color: 'bg-indigo-500 text-white',
          bgColor: 'bg-indigo-50',
          borderColor: 'border-indigo-200'
        };
      default:
        return {
          icon: <Clock className="h-5 w-5" />,
          color: 'bg-gray-500 text-white',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200'
        };
    }
  };

  // Get status badge
  const getStatusBadge = (actionType: string) => {
    switch (actionType) {
      case 'created':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Draft</Badge>;
      case 'submitted':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Submitted</Badge>;
      case 'paid':
        return <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">Paid</Badge>;
      case 'denied':
        return <Badge variant="destructive">Denied</Badge>;
      case 'appealed':
        return <Badge variant="secondary" className="bg-purple-100 text-purple-800">Appealed</Badge>;
      default:
        return null;
    }
  };

  // Calculate days between events
  const getDaysBetween = (current: string, previous?: string) => {
    if (!previous) return null;
    
    const currentDate = new Date(current);
    const previousDate = new Date(previous);
    const diffTime = Math.abs(currentDate.getTime() - previousDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  useEffect(() => {
    fetchTimeline();
  }, [claimId]);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timeline className="h-5 w-5" />
            Claim Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading timeline...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timeline className="h-5 w-5" />
            Claim Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={fetchTimeline} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Timeline className="h-5 w-5" />
          Claim Timeline
          {events.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {events.length} events
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent>
        {events.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Timeline className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No timeline events found</p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200"></div>
            
            {events.map((event, index) => {
              const style = getEventStyle(event.action_type);
              const daysBetween = index > 0 ? getDaysBetween(event.timestamp, events[index - 1]?.timestamp) : null;
              
              return (
                <div key={event.id} className="relative flex items-start space-x-6 pb-8 last:pb-0">
                  {/* Timeline dot */}
                  <div className={`relative z-10 flex items-center justify-center w-16 h-16 rounded-full border-4 border-white shadow-lg ${style.color}`}>
                    {style.icon}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0 pt-2">
                    <div className={`p-4 rounded-lg border ${style.bgColor} ${style.borderColor}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">
                            {event.formatted_action}
                          </h3>
                          {getStatusBadge(event.action_type)}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDate(event.timestamp)}
                        </div>
                      </div>
                      
                      <p className="text-gray-700 mb-2">
                        {event.change_summary}
                      </p>
                      
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <span>By {event.user_name}</span>
                        {daysBetween && (
                          <span className="text-xs bg-white px-2 py-1 rounded border">
                            {daysBetween} day{daysBetween !== 1 ? 's' : ''} later
                          </span>
                        )}
                      </div>
                      
                      {event.notes && (
                        <div className="mt-2 p-2 bg-white rounded border text-sm italic">
                          "{event.notes}"
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            
            {/* Future milestones */}
            <div className="relative flex items-start space-x-6 opacity-50">
              <div className="relative z-10 flex items-center justify-center w-16 h-16 rounded-full border-4 border-white shadow-lg bg-gray-300 text-gray-600">
                <Clock className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0 pt-2">
                <div className="p-4 rounded-lg border bg-gray-50 border-gray-200">
                  <h3 className="font-semibold text-gray-600 mb-2">
                    Next Steps
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Waiting for next action or status update...
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ClaimTimeline;