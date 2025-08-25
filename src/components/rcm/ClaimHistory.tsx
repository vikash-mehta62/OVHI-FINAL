import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  History,
  Clock,
  User,
  FileText,
  Download,
  Filter,
  Search,
  Eye,
  Calendar,
  Activity,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  RefreshCw,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { formatDate } from '@/utils/rcmFormatters';
import { toast } from '@/hooks/use-toast';

interface HistoryEntry {
  id: number;
  claim_id: number;
  action_type: string;
  field_name?: string;
  old_value?: string;
  new_value?: string;
  user_id: number;
  user_name: string;
  user_email: string;
  timestamp: string;
  ip_address?: string;
  notes?: string;
  metadata?: any;
  formatted_action: string;
  change_summary: string;
}

interface HistorySummary {
  total_entries: number;
  unique_users: number;
  first_entry: string;
  last_entry: string;
  action_breakdown: Array<{
    action_type: string;
    count: number;
    formatted_action: string;
  }>;
}

interface ClaimHistoryProps {
  claimId: number;
  onClose?: () => void;
}

const ClaimHistory: React.FC<ClaimHistoryProps> = ({ claimId, onClose }) => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [summary, setSummary] = useState<HistorySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null);
  const [expandedEntries, setExpandedEntries] = useState<Set<number>>(new Set());
  const [filters, setFilters] = useState({
    actionType: 'all',
    userId: 'all',
    search: '',
    dateFrom: '',
    dateTo: '',
    page: 1,
    limit: 50
  });
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
    currentPage: 1
  });

  // Fetch claim history
  const fetchHistory = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') {
          queryParams.append(key, value.toString());
        }
      });

      const response = await fetch(`/api/v1/rcm/claims/${claimId}/history?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setHistory(data.data.history || []);
        setSummary(data.data.summary);
        setPagination(data.data.pagination || { total: 0, totalPages: 0, currentPage: 1 });
      } else {
        throw new Error('Failed to fetch claim history');
      }
    } catch (error) {
      console.error('Error fetching claim history:', error);
      toast({
        title: "Error",
        description: "Failed to load claim history",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Export history
  const exportHistory = async (format: 'json' | 'csv' = 'json') => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/v1/rcm/claims/${claimId}/history/export?format=${format}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `claim-${claimId}-history.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast({
          title: "Success",
          description: "History exported successfully"
        });
      } else {
        throw new Error('Failed to export history');
      }
    } catch (error) {
      console.error('Error exporting history:', error);
      toast({
        title: "Error",
        description: "Failed to export history",
        variant: "destructive"
      });
    }
  };

  // Toggle entry expansion
  const toggleEntryExpansion = (entryId: number) => {
    const newExpanded = new Set(expandedEntries);
    if (newExpanded.has(entryId)) {
      newExpanded.delete(entryId);
    } else {
      newExpanded.add(entryId);
    }
    setExpandedEntries(newExpanded);
  };

  // Get action icon
  const getActionIcon = (actionType: string) => {
    const iconMap: { [key: string]: React.ReactNode } = {
      'created': <CheckCircle className="h-4 w-4 text-green-600" />,
      'updated': <FileText className="h-4 w-4 text-blue-600" />,
      'submitted': <Activity className="h-4 w-4 text-purple-600" />,
      'resubmitted': <RefreshCw className="h-4 w-4 text-purple-600" />,
      'paid': <CheckCircle className="h-4 w-4 text-green-600" />,
      'denied': <XCircle className="h-4 w-4 text-red-600" />,
      'appealed': <AlertTriangle className="h-4 w-4 text-yellow-600" />,
      'status_changed': <Activity className="h-4 w-4 text-blue-600" />,
      'validated': <CheckCircle className="h-4 w-4 text-green-600" />,
      'form_generated': <FileText className="h-4 w-4 text-indigo-600" />,
      'comment_added': <FileText className="h-4 w-4 text-gray-600" />,
      'followup_scheduled': <Calendar className="h-4 w-4 text-orange-600" />
    };

    return iconMap[actionType] || <Info className="h-4 w-4 text-gray-600" />;
  };

  // Get action color
  const getActionColor = (actionType: string) => {
    const colorMap: { [key: string]: string } = {
      'created': 'bg-green-100 text-green-800',
      'updated': 'bg-blue-100 text-blue-800',
      'submitted': 'bg-purple-100 text-purple-800',
      'resubmitted': 'bg-purple-100 text-purple-800',
      'paid': 'bg-green-100 text-green-800',
      'denied': 'bg-red-100 text-red-800',
      'appealed': 'bg-yellow-100 text-yellow-800',
      'status_changed': 'bg-blue-100 text-blue-800',
      'validated': 'bg-green-100 text-green-800',
      'form_generated': 'bg-indigo-100 text-indigo-800',
      'comment_added': 'bg-gray-100 text-gray-800',
      'followup_scheduled': 'bg-orange-100 text-orange-800'
    };

    return colorMap[actionType] || 'bg-gray-100 text-gray-800';
  };

  useEffect(() => {
    fetchHistory();
  }, [claimId, filters]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        <span>Loading claim history...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <History className="h-6 w-6" />
            Claim History
          </h2>
          <p className="text-muted-foreground">
            Complete audit trail for claim #{claimId}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => exportHistory('csv')}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportHistory('json')}>
            <Download className="h-4 w-4 mr-2" />
            Export JSON
          </Button>
          <Button variant="outline" size="sm" onClick={fetchHistory}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-600" />
                <div>
                  <div className="text-2xl font-bold">{summary.total_entries}</div>
                  <div className="text-sm text-muted-foreground">Total Entries</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-green-600" />
                <div>
                  <div className="text-2xl font-bold">{summary.unique_users}</div>
                  <div className="text-sm text-muted-foreground">Unique Users</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-purple-600" />
                <div>
                  <div className="text-sm font-medium">First Entry</div>
                  <div className="text-xs text-muted-foreground">{summary.first_entry}</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-600" />
                <div>
                  <div className="text-sm font-medium">Last Entry</div>
                  <div className="text-xs text-muted-foreground">{summary.last_entry}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search history entries..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
                  className="pl-10"
                />
              </div>
            </div>
            <Select
              value={filters.actionType}
              onValueChange={(value) => setFilters({ ...filters, actionType: value, page: 1 })}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Action Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="created">Created</SelectItem>
                <SelectItem value="updated">Updated</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="denied">Denied</SelectItem>
                <SelectItem value="status_changed">Status Changed</SelectItem>
                <SelectItem value="form_generated">Form Generated</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              placeholder="From Date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value, page: 1 })}
              className="w-40"
            />
            <Input
              type="date"
              placeholder="To Date"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value, page: 1 })}
              className="w-40"
            />
          </div>
        </CardContent>
      </Card>

      {/* History Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>History Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No history entries found
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((entry, index) => (
                <div key={entry.id} className="relative">
                  {/* Timeline line */}
                  {index < history.length - 1 && (
                    <div className="absolute left-6 top-12 w-0.5 h-8 bg-gray-200"></div>
                  )}
                  
                  <div className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50">
                    {/* Action icon */}
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center">
                      {getActionIcon(entry.action_type)}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className={getActionColor(entry.action_type)}>
                            {entry.formatted_action}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            by {entry.user_name}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {entry.timestamp}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleEntryExpansion(entry.id)}
                          >
                            {expandedEntries.has(entry.id) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedEntry(entry)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>History Entry Details</DialogTitle>
                                <DialogDescription>
                                  Detailed information for this history entry
                                </DialogDescription>
                              </DialogHeader>
                              {selectedEntry && (
                                <HistoryEntryDetails entry={selectedEntry} />
                              )}
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                      
                      <div className="mt-2">
                        <p className="text-sm">{entry.change_summary}</p>
                        {entry.notes && entry.notes !== entry.change_summary && (
                          <p className="text-sm text-muted-foreground mt-1">{entry.notes}</p>
                        )}
                      </div>

                      {/* Expanded details */}
                      {expandedEntries.has(entry.id) && (
                        <div className="mt-4 p-3 bg-gray-50 rounded border">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            {entry.field_name && (
                              <div>
                                <span className="font-medium">Field:</span> {entry.field_name}
                              </div>
                            )}
                            {entry.old_value && (
                              <div>
                                <span className="font-medium">Old Value:</span> {entry.old_value}
                              </div>
                            )}
                            {entry.new_value && (
                              <div>
                                <span className="font-medium">New Value:</span> {entry.new_value}
                              </div>
                            )}
                            {entry.ip_address && (
                              <div>
                                <span className="font-medium">IP Address:</span> {entry.ip_address}
                              </div>
                            )}
                            <div>
                              <span className="font-medium">User Email:</span> {entry.user_email}
                            </div>
                            <div>
                              <span className="font-medium">Entry ID:</span> {entry.id}
                            </div>
                          </div>
                          {entry.metadata && (
                            <div className="mt-3">
                              <span className="font-medium">Metadata:</span>
                              <pre className="mt-1 text-xs bg-white p-2 rounded border overflow-auto">
                                {JSON.stringify(entry.metadata, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-muted-foreground">
                Showing {((filters.page - 1) * filters.limit) + 1} to {Math.min(filters.page * filters.limit, pagination.total)} of {pagination.total} entries
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={filters.page === 1}
                  onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                >
                  Previous
                </Button>
                <span className="text-sm">
                  Page {filters.page} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={filters.page === pagination.totalPages}
                  onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Summary */}
      {summary && summary.action_breakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Action Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {summary.action_breakdown.map((action) => (
                <div key={action.action_type} className="text-center p-3 border rounded">
                  <div className="text-2xl font-bold">{action.count}</div>
                  <div className="text-sm text-muted-foreground">{action.formatted_action}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// History Entry Details Component
interface HistoryEntryDetailsProps {
  entry: HistoryEntry;
}

const HistoryEntryDetails: React.FC<HistoryEntryDetailsProps> = ({ entry }) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Action Type:</label>
          <p>{entry.formatted_action}</p>
        </div>
        <div>
          <label className="text-sm font-medium">Timestamp:</label>
          <p>{entry.timestamp}</p>
        </div>
        <div>
          <label className="text-sm font-medium">User:</label>
          <p>{entry.user_name} ({entry.user_email})</p>
        </div>
        <div>
          <label className="text-sm font-medium">Entry ID:</label>
          <p>{entry.id}</p>
        </div>
      </div>

      {entry.field_name && (
        <div>
          <label className="text-sm font-medium">Field Changed:</label>
          <p>{entry.field_name}</p>
        </div>
      )}

      {(entry.old_value || entry.new_value) && (
        <div className="grid grid-cols-2 gap-4">
          {entry.old_value && (
            <div>
              <label className="text-sm font-medium">Old Value:</label>
              <p className="p-2 bg-red-50 border rounded">{entry.old_value}</p>
            </div>
          )}
          {entry.new_value && (
            <div>
              <label className="text-sm font-medium">New Value:</label>
              <p className="p-2 bg-green-50 border rounded">{entry.new_value}</p>
            </div>
          )}
        </div>
      )}

      {entry.notes && (
        <div>
          <label className="text-sm font-medium">Notes:</label>
          <p className="p-2 bg-gray-50 border rounded">{entry.notes}</p>
        </div>
      )}

      {entry.ip_address && (
        <div>
          <label className="text-sm font-medium">IP Address:</label>
          <p>{entry.ip_address}</p>
        </div>
      )}

      {entry.metadata && (
        <div>
          <label className="text-sm font-medium">Metadata:</label>
          <pre className="p-2 bg-gray-50 border rounded text-xs overflow-auto max-h-40">
            {JSON.stringify(entry.metadata, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default ClaimHistory;