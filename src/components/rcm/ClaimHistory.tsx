import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import {
  History,
  Clock,
  User,
  FileText,
  Download,
  Filter,
  Search,
  ChevronDown,
  ChevronRight,
  Calendar,
  Activity,
  Eye,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { formatDate } from '@/utils/rcmFormatters';

interface HistoryEntry {
  id: number;
  claim_id: number;
  action_type: string;
  field_name?: string;
  old_value?: string;
  new_value?: string;
  user_id: number;
  timestamp: string;
  ip_address?: string;
  user_agent?: string;
  notes?: string;
  metadata?: any;
  user_name: string;
  user_email: string;
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
  className?: string;
}

const ClaimHistory: React.FC<ClaimHistoryProps> = ({ claimId, className = '' }) => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [summary, setSummary] = useState<HistorySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedEntries, setExpandedEntries] = useState<Set<number>>(new Set());
  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null);
  
  // Filters
  const [filters, setFilters] = useState({
    actionType: '',
    userId: '',
    dateFrom: '',
    dateTo: '',
    search: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEntries, setTotalEntries] = useState(0);
  const itemsPerPage = 20;

  // Fetch claim history
  const fetchHistory = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: itemsPerPage.toString(),
        ...(filters.actionType && { actionType: filters.actionType }),
        ...(filters.userId && { userId: filters.userId }),
        ...(filters.dateFrom && { dateFrom: filters.dateFrom }),
        ...(filters.dateTo && { dateTo: filters.dateTo }),
        ...(filters.search && { search: filters.search })
      });

      const response = await fetch(`/api/v1/rcm/claims/${claimId}/history?${queryParams}`, {
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
        setSummary(data.data.summary);
        setCurrentPage(page);
        setTotalPages(data.data.pagination?.totalPages || 1);
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

  // Export history
  const exportHistory = async (format: 'json' | 'csv' = 'json') => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const queryParams = new URLSearchParams({
        format,
        ...(filters.dateFrom && { dateFrom: filters.dateFrom }),
        ...(filters.dateTo && { dateTo: filters.dateTo })
      });

      const response = await fetch(`/api/v1/rcm/claims/${claimId}/history/export?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to export history');
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `claim-${claimId}-history.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    }
  };

  // Toggle entry expansion
  const toggleEntry = (entryId: number) => {
    const newExpanded = new Set(expandedEntries);
    if (newExpanded.has(entryId)) {
      newExpanded.delete(entryId);
    } else {
      newExpanded.add(entryId);
    }
    setExpandedEntries(newExpanded);
  };

  // Apply filters
  const applyFilters = () => {
    setCurrentPage(1);
    fetchHistory(1);
  };

  // Clear filters
  const clearFilters = () => {
    setFilters({
      actionType: '',
      userId: '',
      dateFrom: '',
      dateTo: '',
      search: ''
    });
    setCurrentPage(1);
    fetchHistory(1);
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
      case 'created': return <FileText className="h-4 w-4" />;
      case 'updated': return <Activity className="h-4 w-4" />;
      case 'submitted': return <ExternalLink className="h-4 w-4" />;
      case 'validated': return <Eye className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  // Initial load
  useEffect(() => {
    fetchHistory();
  }, [claimId]);

  if (loading && history.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Claim History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading history...</span>
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
            <History className="h-5 w-5" />
            Claim History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button 
            onClick={() => fetchHistory()} 
            className="mt-4"
            variant="outline"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Claim History
            {totalEntries > 0 && (
              <Badge variant="secondary" className="ml-2">
                {totalEntries} entries
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportHistory('json')}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchHistory(currentPage)}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="text-center p-3 bg-blue-50 rounded">
              <div className="text-2xl font-bold text-blue-600">{summary.total_entries}</div>
              <div className="text-sm text-blue-600">Total Entries</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded">
              <div className="text-2xl font-bold text-green-600">{summary.unique_users}</div>
              <div className="text-sm text-green-600">Users</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded">
              <div className="text-sm font-bold text-purple-600">
                {summary.first_entry ? formatDate(summary.first_entry) : 'N/A'}
              </div>
              <div className="text-sm text-purple-600">First Entry</div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded">
              <div className="text-sm font-bold text-orange-600">
                {summary.last_entry ? formatDate(summary.last_entry) : 'N/A'}
              </div>
              <div className="text-sm text-orange-600">Last Entry</div>
            </div>
          </div>
        )}

        {/* Filters */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Action Type</label>
                <Select value={filters.actionType} onValueChange={(value) => 
                  setFilters(prev => ({ ...prev, actionType: value }))
                }>
                  <SelectTrigger>
                    <SelectValue placeholder="All actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All actions</SelectItem>
                    <SelectItem value="created">Created</SelectItem>
                    <SelectItem value="updated">Updated</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="denied">Denied</SelectItem>
                    <SelectItem value="validated">Validated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Date From</label>
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Date To</label>
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search in notes, user names, or changes..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={applyFilters} size="sm">
                Apply Filters
              </Button>
              <Button onClick={clearFilters} variant="outline" size="sm">
                Clear Filters
              </Button>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {history.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No history entries found</p>
            {Object.values(filters).some(f => f) && (
              <Button onClick={clearFilters} variant="outline" className="mt-2">
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Timeline */}
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>
              
              {history.map((entry, index) => (
                <div key={entry.id} className="relative flex items-start space-x-4 pb-6">
                  {/* Timeline dot */}
                  <div className={`relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-4 border-white shadow-sm ${getActionTypeColor(entry.action_type)}`}>
                    {getActionTypeIcon(entry.action_type)}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="bg-white border rounded-lg p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge className={getActionTypeColor(entry.action_type)}>
                            {entry.formatted_action}
                          </Badge>
                          <span className="text-sm text-gray-500">
                            {formatDate(entry.timestamp)}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleEntry(entry.id)}
                        >
                          {expandedEntries.has(entry.id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      
                      <div className="space-y-2">
                        <p className="text-sm font-medium">{entry.change_summary}</p>
                        
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {entry.user_name}
                          </span>
                          {entry.ip_address && (
                            <span>IP: {entry.ip_address}</span>
                          )}
                        </div>
                        
                        {entry.notes && (
                          <p className="text-sm text-gray-600 italic">
                            "{entry.notes}"
                          </p>
                        )}
                      </div>
                      
                      {/* Expanded details */}
                      {expandedEntries.has(entry.id) && (
                        <div className="mt-4 pt-4 border-t space-y-3">
                          {entry.field_name && (
                            <div>
                              <span className="text-xs font-medium text-gray-500">Field Changed:</span>
                              <span className="ml-2 text-sm">{entry.field_name}</span>
                            </div>
                          )}
                          
                          {entry.old_value && entry.new_value && (
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <span className="text-xs font-medium text-red-600">Previous Value:</span>
                                <div className="mt-1 p-2 bg-red-50 rounded text-sm">
                                  {entry.old_value}
                                </div>
                              </div>
                              <div>
                                <span className="text-xs font-medium text-green-600">New Value:</span>
                                <div className="mt-1 p-2 bg-green-50 rounded text-sm">
                                  {entry.new_value}
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {entry.metadata && (
                            <div>
                              <span className="text-xs font-medium text-gray-500">Additional Details:</span>
                              <pre className="mt-1 p-2 bg-gray-50 rounded text-xs overflow-x-auto">
                                {JSON.stringify(entry.metadata, null, 2)}
                              </pre>
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>Entry ID: {entry.id}</span>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => setSelectedEntry(entry)}
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  View Details
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>History Entry Details</DialogTitle>
                                  <DialogDescription>
                                    Complete information for this history entry
                                  </DialogDescription>
                                </DialogHeader>
                                {selectedEntry && (
                                  <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                      <div>
                                        <span className="font-medium">Action:</span>
                                        <div>{selectedEntry.formatted_action}</div>
                                      </div>
                                      <div>
                                        <span className="font-medium">Timestamp:</span>
                                        <div>{formatDate(selectedEntry.timestamp)}</div>
                                      </div>
                                      <div>
                                        <span className="font-medium">User:</span>
                                        <div>{selectedEntry.user_name} ({selectedEntry.user_email})</div>
                                      </div>
                                      <div>
                                        <span className="font-medium">IP Address:</span>
                                        <div>{selectedEntry.ip_address || 'N/A'}</div>
                                      </div>
                                    </div>
                                    
                                    {selectedEntry.user_agent && (
                                      <div>
                                        <span className="font-medium text-sm">User Agent:</span>
                                        <div className="text-xs text-gray-600 mt-1 p-2 bg-gray-50 rounded">
                                          {selectedEntry.user_agent}
                                        </div>
                                      </div>
                                    )}
                                    
                                    {selectedEntry.metadata && (
                                      <div>
                                        <span className="font-medium text-sm">Metadata:</span>
                                        <pre className="text-xs text-gray-600 mt-1 p-2 bg-gray-50 rounded overflow-x-auto">
                                          {JSON.stringify(selectedEntry.metadata, null, 2)}
                                        </pre>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-sm text-gray-500">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalEntries)} of {totalEntries} entries
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchHistory(currentPage - 1)}
                    disabled={currentPage <= 1 || loading}
                  >
                    Previous
                  </Button>
                  <span className="text-sm">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchHistory(currentPage + 1)}
                    disabled={currentPage >= totalPages || loading}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ClaimHistory;