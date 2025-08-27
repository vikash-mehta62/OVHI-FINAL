/**
 * Enhanced Collections Management Component
 * Advanced collections workflow with automation and analytics
 */

import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Users,
  DollarSign,
  Clock,
  AlertTriangle,
  CheckCircle,
  Phone,
  Mail,
  Calendar,
  TrendingUp,
  Filter,
  Search,
  Plus,
  Edit,
  Eye,
  FileText,
  Target
} from 'lucide-react';
import { getCollectionsWorkflowAPI, updateCollectionStatusAPI } from '@/services/operations/rcm';

interface CollectionAccount {
  id: number;
  patientId: number;
  patientName: string;
  totalBalance: string;
  aging30: string;
  aging60: string;
  aging90: string;
  aging120Plus: string;
  lastPaymentDate: string | null;
  lastStatementDate: string | null;
  collectionStatus: string;
  priority: string;
  assignedCollector: string | null;
  contactAttempts: number;
  paymentPlanActive: boolean;
  insurancePending: number;
}

interface CollectionFilters {
  status: string;
  priority: string;
  agingBucket: string;
  assignedCollector: string;
  search: string;
}

const EnhancedCollectionsManagement: React.FC = () => {
  const { token } = useSelector((state: any) => state.auth);
  const [accounts, setAccounts] = useState<CollectionAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<CollectionFilters>({
    status: 'all',
    priority: 'all',
    agingBucket: 'all',
    assignedCollector: 'all',
    search: ''
  });
  const [selectedAccount, setSelectedAccount] = useState<CollectionAccount | null>(null);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [updateData, setUpdateData] = useState({
    status: '',
    priority: '',
    assignedCollector: '',
    notes: ''
  });

  useEffect(() => {
    fetchCollectionsData();
  }, [filters]);

  const fetchCollectionsData = async () => {
    try {
      setLoading(true);
      const response = await getCollectionsWorkflowAPI(token);
      
      if (response?.success) {
        setAccounts(response.data.accounts || []);
      }
    } catch (error) {
      console.error('Error fetching collections data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedAccount) return;

    try {
      const response = await updateCollectionStatusAPI(token, selectedAccount.id, updateData);
      
      if (response?.success) {
        await fetchCollectionsData();
        setShowUpdateDialog(false);
        setSelectedAccount(null);
        setUpdateData({ status: '', priority: '', assignedCollector: '', notes: '' });
      }
    } catch (error) {
      console.error('Error updating collection status:', error);
    }
  };

  const openUpdateDialog = (account: CollectionAccount) => {
    setSelectedAccount(account);
    setUpdateData({
      status: account.collectionStatus,
      priority: account.priority,
      assignedCollector: account.assignedCollector || '',
      notes: ''
    });
    setShowUpdateDialog(true);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'follow_up':
        return 'bg-yellow-100 text-yellow-800';
      case 'payment_plan':
        return 'bg-green-100 text-green-800';
      case 'legal':
        return 'bg-red-100 text-red-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const calculateTotalBalance = (account: CollectionAccount) => {
    const aging30 = parseFloat(account.aging30.replace(/[$,]/g, '')) || 0;
    const aging60 = parseFloat(account.aging60.replace(/[$,]/g, '')) || 0;
    const aging90 = parseFloat(account.aging90.replace(/[$,]/g, '')) || 0;
    const aging120Plus = parseFloat(account.aging120Plus.replace(/[$,]/g, '')) || 0;
    return aging30 + aging60 + aging90 + aging120Plus;
  };

  const getAgingPriority = (account: CollectionAccount) => {
    const aging120Plus = parseFloat(account.aging120Plus.replace(/[$,]/g, '')) || 0;
    const aging90 = parseFloat(account.aging90.replace(/[$,]/g, '')) || 0;
    
    if (aging120Plus > 0) return 'urgent';
    if (aging90 > 0) return 'high';
    return 'medium';
  };

  const filteredAccounts = accounts.filter(account => {
    if (filters.status !== 'all' && account.collectionStatus !== filters.status) return false;
    if (filters.priority !== 'all' && account.priority !== filters.priority) return false;
    if (filters.search && !account.patientName.toLowerCase().includes(filters.search.toLowerCase())) return false;
    
    if (filters.agingBucket !== 'all') {
      const aging30 = parseFloat(account.aging30.replace(/[$,]/g, '')) || 0;
      const aging60 = parseFloat(account.aging60.replace(/[$,]/g, '')) || 0;
      const aging90 = parseFloat(account.aging90.replace(/[$,]/g, '')) || 0;
      const aging120Plus = parseFloat(account.aging120Plus.replace(/[$,]/g, '')) || 0;
      
      switch (filters.agingBucket) {
        case '0-30':
          return aging30 > 0;
        case '31-60':
          return aging60 > 0;
        case '61-90':
          return aging90 > 0;
        case '90+':
          return aging120Plus > 0;
        default:
          return true;
      }
    }
    
    return true;
  });

  const summaryStats = {
    totalAccounts: filteredAccounts.length,
    totalBalance: filteredAccounts.reduce((sum, account) => sum + calculateTotalBalance(account), 0),
    urgentAccounts: filteredAccounts.filter(account => account.priority === 'urgent').length,
    paymentPlans: filteredAccounts.filter(account => account.paymentPlanActive).length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Collections Management</h2>
          <p className="text-gray-500">Manage patient collections and follow-up activities</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Collection Activity
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Total Accounts</p>
                <p className="text-2xl font-bold">{summaryStats.totalAccounts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">Total Balance</p>
                <p className="text-2xl font-bold">
                  ${summaryStats.totalBalance.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm font-medium">Urgent Accounts</p>
                <p className="text-2xl font-bold">{summaryStats.urgentAccounts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">Payment Plans</p>
                <p className="text-2xl font-bold">{summaryStats.paymentPlans}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search patients..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="follow_up">Follow Up</SelectItem>
                  <SelectItem value="payment_plan">Payment Plan</SelectItem>
                  <SelectItem value="legal">Legal</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={filters.priority} onValueChange={(value) => setFilters(prev => ({ ...prev, priority: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Aging</Label>
              <Select value={filters.agingBucket} onValueChange={(value) => setFilters(prev => ({ ...prev, agingBucket: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Ages</SelectItem>
                  <SelectItem value="0-30">0-30 Days</SelectItem>
                  <SelectItem value="31-60">31-60 Days</SelectItem>
                  <SelectItem value="61-90">61-90 Days</SelectItem>
                  <SelectItem value="90+">90+ Days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Collector</Label>
              <Select value={filters.assignedCollector} onValueChange={(value) => setFilters(prev => ({ ...prev, assignedCollector: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Collectors</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  <SelectItem value="collector1">Collector 1</SelectItem>
                  <SelectItem value="collector2">Collector 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Collections Table */}
      <Card>
        <CardHeader>
          <CardTitle>Collection Accounts</CardTitle>
          <CardDescription>
            {filteredAccounts.length} accounts found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredAccounts.map((account) => (
              <div key={account.id} className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div>
                      <h3 className="font-medium">{account.patientName}</h3>
                      <p className="text-sm text-gray-500">Patient ID: {account.patientId}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getPriorityColor(account.priority)}>
                        {account.priority}
                      </Badge>
                      <Badge className={getStatusColor(account.collectionStatus)}>
                        {account.collectionStatus.replace('_', ' ')}
                      </Badge>
                      {account.paymentPlanActive && (
                        <Badge variant="outline">Payment Plan</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openUpdateDialog(account)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Update
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-6 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Total Balance</span>
                    <p className="font-medium">{account.totalBalance}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">0-30 Days</span>
                    <p className="font-medium">{account.aging30}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">31-60 Days</span>
                    <p className="font-medium">{account.aging60}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">61-90 Days</span>
                    <p className="font-medium">{account.aging90}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">90+ Days</span>
                    <p className="font-medium text-red-600">{account.aging120Plus}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Contact Attempts</span>
                    <p className="font-medium">{account.contactAttempts}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t">
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    {account.lastPaymentDate && (
                      <span>Last Payment: {new Date(account.lastPaymentDate).toLocaleDateString()}</span>
                    )}
                    {account.assignedCollector && (
                      <span>Assigned to: {account.assignedCollector}</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="sm">
                      <Phone className="h-4 w-4 mr-2" />
                      Call
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Mail className="h-4 w-4 mr-2" />
                      Email
                    </Button>
                    <Button variant="ghost" size="sm">
                      <FileText className="h-4 w-4 mr-2" />
                      Statement
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Update Status Dialog */}
      <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Collection Status</DialogTitle>
            <DialogDescription>
              Update the collection status and details for {selectedAccount?.patientName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={updateData.status} onValueChange={(value) => setUpdateData(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="follow_up">Follow Up</SelectItem>
                  <SelectItem value="payment_plan">Payment Plan</SelectItem>
                  <SelectItem value="legal">Legal</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={updateData.priority} onValueChange={(value) => setUpdateData(prev => ({ ...prev, priority: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Assigned Collector</Label>
              <Input
                placeholder="Enter collector name"
                value={updateData.assignedCollector}
                onChange={(e) => setUpdateData(prev => ({ ...prev, assignedCollector: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Add notes about this update..."
                value={updateData.notes}
                onChange={(e) => setUpdateData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowUpdateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateStatus}>
                Update Status
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EnhancedCollectionsManagement;