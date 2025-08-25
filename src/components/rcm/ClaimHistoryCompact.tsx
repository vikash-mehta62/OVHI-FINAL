import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  History,
  Clock,
  User,
  FileText,
  Activity,
  ExternalLink,
  Eye,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { formatDate } from '@/utils/rcmFormatters';

interface HistoryEntry {
  id: number;
  action_type: string;
  timestamp: string;
  user_name: string;
  formatted_action: string;
  change_summary: string;
  notes?: string;
}

interface ClaimHistoryCompactProps {
  claimId: number;
  maxEntries?: number;
  showViewAll?: boolean;
  onViewAll?: () => void;
  className?: string;
}

const ClaimHistoryCompact: React.FC<ClaimHistoryCompactProps> = ({
  claimId,
  maxEntries = 5,
  showViewAll = true,
  onViewAll,
  className = ''
}) => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalEntries, setTotalEntries] = useState(0);

  // Fetch recent history
  const fetchRecentHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`/api/v1/rcm/claims/${claimId}/history?page=1&limit=${maxEntries}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch claim history');
      }

      const data = await response.json();
      
      if (data.success) {
        setHistory(data.data.history);
        setTotalEntries(data.data.pagination?.total || 0);
      } else {
        throw new Error(data.message || 'Failed to fetch claim history');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Get action type color
  const getActionTypeColor = (actionType: string) => {
    switch (actionType) {
      case 'created': return 'bg-blue-100 text-blue-800';
      case 'updated': return 'bg-yellow-100 text-yellow-800';
      case 'submitted': return 'bg-green-100 text-green-800';
      case 'paid': return 'bg-emerald-100 text-emerald-800';
      case 'denied': return 'bg-red-100 text-red-800';
      case 'appealed': return 'bg-purple-100 text-purple-800';
      case 'validated': return 'bg-indigo-100 text-indigo-800';
      case 'form_generated': return 'bg-cyan-100 text-cyan-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get action type icon
  const getActionTypeIcon = (actionType: string) => {
    switch (actionType) {
      case 'created': return <FileText className="h-3 w-3" />;
      case 'updated': return <Activity className="h-3 w-3" />;
      case 'submitted': return <ExternalLink className="h-3 w-3" />;
      case 'validated': return <Eye className="h-3 w-3" />;
      default: return <Clock className="h-3 w-3" />;
    }
  };

  // Initial load
  useEffect(() => {
    fetchRecentHistory();
  }, [claimId]);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" />
            Recent Activity
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
            <History className="h-4 w-4" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-sm text-red-600 mb-2">{error}</p>
            <Button 
              onClick={fetchRecentHistory} 
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
            <History className="h-4 w-4" />
            Recent Activity
            {totalEntries > 0 && (
              <Badge variant="secondary" className="text-xs">
                {totalEntries}
              </Badge>
            )}
          </CardTitle>
          {showViewAll && totalEntries > maxEntries && (
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
      </CardHeader>

      <CardContent>
        {history.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No activity yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((entry, index) => (
              <div key={entry.id} className="flex items-start space-x-3 pb-3 border-b border-gray-100 last:border-b-0 last:pb-0">
                {/* Icon */}
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${getActionTypeColor(entry.action_type)}`}>
                  {getActionTypeIcon(entry.action_type)}
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge 
                      className={`text-xs ${getActionTypeColor(entry.action_type)}`}
                      variant="secondary"
                    >
                      {entry.formatted_action}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {formatDate(entry.timestamp)}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-900 mb-1">
                    {entry.change_summary}
                  </p>
                  
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <User className="h-3 w-3" />
                    <span>{entry.user_name}</span>
                  </div>
                  
                  {entry.notes && (
                    <p className="text-xs text-gray-600 italic mt-1 truncate">
                      "{entry.notes}"
                    </p>
                  )}
                </div>
              </div>
            ))}
            
            {totalEntries > maxEntries && (
              <div className="text-center pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onViewAll}
                  className="text-xs text-muted-foreground"
                >
                  View {totalEntries - maxEntries} more entries
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

export default ClaimHistoryCompact;