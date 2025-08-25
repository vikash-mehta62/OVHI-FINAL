import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Search, 
  Filter, 
  Download, 
  Eye, 
  RefreshCw,
  Calendar,
  User,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';

interface AuditEntry {
  id: string;
  timestamp: string;
  integrationId: string;
  integrationName: string;
  action: string;
  actionType: 'configuration' | 'connection' | 'transaction' | 'error' | 'health_check';
  userId: string;
  userName: string;
  ipAddress: string;
  userAgent: string;
  details: Record<string, any>;
  status: 'success' | 'failure' | 'warning';
  duration?: number;
  errorMessage?: string;
}

interface AuditFilters {
  integrationId: string;
  actionType: string;
  status: string;
  dateFrom: string;
  dateTo: string;
  userId: string;
  search: string;
}

const IntegrationAuditTrail: React.FC = () => {
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);
  const [filters, setFilters] = useState<AuditFilters>({
    integrationId: 'all',
    actionType: 'all',
    status: 'all',
    dateFrom: '',
    dateTo: '',
    userId: 'all',
    search: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0
  });

  useEffect(() => {
    fetchAuditEntries();
  }, [filters, pagination.page]);

  const fetchAuditEntries = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value && value !== 'all')
        )
      });

      const response = await fetch(`/api/v1/rcm/integrations/audit?${queryParams}`);
      const data = await response.json();

      setAuditEntries(data.entries || []);
      setPagination(prev => ({
        ...prev,
        total: data.total || 0
      }));
    } catch (error) {
      console.error('Error fetching audit entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportAuditLog = async () => {
    try {
      const queryParams = new URLSearchParams({
        format: 'csv',
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value && value !== 'all')
        )
      });

      const response = await fetch(`/api/v1/rcm/integrations/audit/export?${queryParams}`);
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `integration-audit-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting audit log:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failure':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActionTypeIcon = (actionType: string) => {
    switch (actionType) {
      case 'configuration':
        return <Settings className="h-4 w-4 text-blue-500" />;
      case 'connection':
        return <Activity className="h-4 w-4 text-green-500" />;
      case 'transaction':
        return <RefreshCw className="h-4 w-4 text-purple-500" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'health_check':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatDuration = (duration?: number) => {
    if (!duration) return 'N/A';
    if (duration < 1000) return `${duration}ms`;
    return `${(duration / 1000).toFixed(2)}s`;
  };

  const resetFilters = () => {
    setFilters({
      integrationId: 'all',
      actionType: 'all',
      status: 'all',
      dateFrom: '',
      dateTo: '',
      userId: 'all',
      search: ''
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Audit Trail Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Integration</label>
              <Select 
                value={filters.integrationId} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, integrationId: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Integrations</SelectItem>
                  {/* Integration options would be populated from API */}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Action Type</label>
              <Select 
                value={filters.actionType} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, actionType: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="configuration">Configuration</SelectItem>
                  <SelectItem value="connection">Connection</SelectItem>
                  <SelectItem value="transaction">Transaction</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="health_check">Health Check</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select 
                value={filters.status} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="failure">Failure</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Date From</label>
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Date To</label>
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search actions..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4">
            <Button variant="outline" onClick={resetFilters}>
              Clear Filters
            </Button>
            
            <div className="flex space-x-2">
              <Button variant="outline" onClick={exportAuditLog}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              
              <Button variant="outline" onClick={fetchAuditEntries}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Entries Table */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Entries</CardTitle>
          <CardDescription>
            Showing {auditEntries.length} of {pagination.total} entries
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCw className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Integration</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">
                            {new Date(entry.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <span className="font-medium">{entry.integrationName}</span>
                      </TableCell>
                      
                      <TableCell>
                        <span className="text-sm">{entry.action}</span>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getActionTypeIcon(entry.actionType)}
                          <Badge variant="outline">
                            {entry.actionType.replace('_', ' ')}
                          </Badge>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">{entry.userName}</span>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(entry.status)}
                          <Badge 
                            variant={
                              entry.status === 'success' ? 'default' : 
                              entry.status === 'failure' ? 'destructive' : 'secondary'
                            }
                          >
                            {entry.status}
                          </Badge>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">{formatDuration(entry.duration)}</span>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setSelectedEntry(entry)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Audit Entry Details</DialogTitle>
                              <DialogDescription>
                                Detailed information about this audit entry
                              </DialogDescription>
                            </DialogHeader>
                            
                            {selectedEntry && (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="text-sm font-medium text-gray-500">Timestamp</label>
                                    <p className="text-sm">{new Date(selectedEntry.timestamp).toLocaleString()}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-gray-500">Integration</label>
                                    <p className="text-sm">{selectedEntry.integrationName}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-gray-500">Action</label>
                                    <p className="text-sm">{selectedEntry.action}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-gray-500">Action Type</label>
                                    <p className="text-sm">{selectedEntry.actionType.replace('_', ' ')}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-gray-500">User</label>
                                    <p className="text-sm">{selectedEntry.userName} ({selectedEntry.userId})</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-gray-500">Status</label>
                                    <div className="flex items-center space-x-2">
                                      {getStatusIcon(selectedEntry.status)}
                                      <span className="text-sm">{selectedEntry.status}</span>
                                    </div>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-gray-500">IP Address</label>
                                    <p className="text-sm">{selectedEntry.ipAddress}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-gray-500">Duration</label>
                                    <p className="text-sm">{formatDuration(selectedEntry.duration)}</p>
                                  </div>
                                </div>
                                
                                {selectedEntry.errorMessage && (
                                  <div>
                                    <label className="text-sm font-medium text-gray-500">Error Message</label>
                                    <p className="text-sm text-red-600 bg-red-50 p-2 rounded">
                                      {selectedEntry.errorMessage}
                                    </p>
                                  </div>
                                )}
                                
                                <div>
                                  <label className="text-sm font-medium text-gray-500">User Agent</label>
                                  <p className="text-sm text-gray-600 break-all">{selectedEntry.userAgent}</p>
                                </div>
                                
                                <div>
                                  <label className="text-sm font-medium text-gray-500">Details</label>
                                  <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto max-h-40">
                                    {JSON.stringify(selectedEntry.details, null, 2)}
                                  </pre>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} entries
                </p>
                
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                    disabled={pagination.page === 1}
                  >
                    Previous
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page * pagination.limit >= pagination.total}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default IntegrationAuditTrail;