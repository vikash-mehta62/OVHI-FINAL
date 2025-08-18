import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Search, Plus, Filter, Download, RefreshCw, Calendar,
  Clock, User, Building, Phone, Mail, FileText,
  AlertCircle, CheckCircle, XCircle, Eye, Edit,
  Send, Archive, MoreHorizontal
} from 'lucide-react';
import { toast } from 'sonner';
import { referralService, type Referral, type ReferralFilters } from '@/services/referralService';
import { specialistService } from '@/services/specialistService';
import { ReferralCreationDialog } from './ReferralCreationDialog';
import { ReferralDetailsDialog } from './ReferralDetailsDialog';
import { ReferralCard } from './shared/ReferralCard';
import { StatusBadge } from './shared/StatusBadge';
import { UrgencyIndicator } from './shared/UrgencyIndicator';

interface ReferralDashboardProps {
  initialTab?: 'new' | 'incoming' | 'outgoing' | 'completed';
  viewMode?: 'details' | 'edit' | 'list';
  providerId?: string;
  patientId?: string;
  onReferralSelect?: (referral: Referral) => void;
}

export const ReferralDashboard: React.FC<ReferralDashboardProps> = ({
  initialTab = 'incoming',
  viewMode = 'list',
  providerId: propProviderId,
  patientId,
  onReferralSelect
}) => {
  const { id: routeId } = useParams<{ id?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get providerId from props or use the current user's ID if not provided
  const [providerId] = useState(propProviderId || 'current-user-id'); // Replace with actual auth context
  
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'new' | 'incoming' | 'outgoing' | 'completed'>(initialTab);
  const [filters, setFilters] = useState<ReferralFilters>({});
  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [currentViewMode, setCurrentViewMode] = useState<'list' | 'details' | 'edit'>(viewMode);
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 20,
    offset: 0,
  });

  // Sync with URL
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tab = searchParams.get('tab') as ReferralDashboardProps['initialTab'];
    if (tab && ['new', 'incoming', 'outgoing', 'completed'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [location.search]);

  // Handle view mode changes based on URL
  useEffect(() => {
    if (routeId) {
      if (location.pathname.endsWith('/edit')) {
        setCurrentViewMode('edit');
        // Load referral data for editing
        loadReferralDetails(routeId);
      } else {
        setCurrentViewMode('details');
        // Load referral data for viewing
        loadReferralDetails(routeId);
      }
    } else {
      setCurrentViewMode('list');
      loadReferrals();
    }
  }, [routeId, location.pathname]);

  const loadReferralDetails = async (referralId: string) => {
    try {
      const referral = await referralService.getReferralById(referralId);
      setSelectedReferral(referral);
      setShowDetailsDialog(true);
    } catch (error) {
      console.error('Error loading referral details:', error);
      toast.error('Failed to load referral details');
    }
  };

  const handleTabChange = (tab: string) => {
    navigate(`?tab=${tab}`);
  };

  const handleReferralClick = (referral: Referral) => {
    navigate(`/provider/referrals/${referral.id}`);
    setSelectedReferral(referral);
    onReferralSelect?.(referral);
  };

  const handleEditReferral = (referral: Referral) => {
    navigate(`/provider/referrals/${referral.id}/edit`);
  };

  const handleBackToList = () => {
    navigate('/provider/referrals');
  };

  // Load referrals
  const loadReferrals = async (newFilters?: ReferralFilters, newPagination?: any) => {
    try {
      setLoading(true);
      
      const currentFilters = { ...filters, ...newFilters };
      const currentPagination = { 
        limit: pagination.limit,
        offset: pagination.offset,
        ...newPagination 
      };

      // Add tab-based filtering
      if (activeTab !== 'all') {
        currentFilters.status = [activeTab];
      }

      // Add search term
      if (searchTerm) {
        currentFilters.searchTerm = searchTerm;
      }

      // Add patient filter if provided
      if (patientId) {
        currentFilters.patientId = patientId;
      }

      const response = await referralService.getReferralsByProvider(
        providerId,
        currentFilters,
        currentPagination
      );

      if (response.success && response.referrals) {
        setReferrals(response.referrals);
        if (response.pagination) {
          setPagination(response.pagination);
        }
      }
    } catch (error) {
      console.error('Error loading referrals:', error);
      toast.error('Failed to load referrals');
    } finally {
      setLoading(false);
    }
  };

  // Load statistics
  const loadStatistics = async () => {
    try {
      const stats = await referralService.getReferralStatistics(providerId);
      // setStatistics(stats);
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  // Initial load
  useEffect(() => {
    loadReferrals();
    loadStatistics();
  }, [providerId, patientId, activeTab]);

  // Search handler
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setPagination(prev => ({ ...prev, offset: 0, currentPage: 1 }));
    loadReferrals({ searchTerm: value }, { offset: 0 });
  };

  // Filter handlers
  const handleFilterChange = (newFilters: Partial<ReferralFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    setPagination(prev => ({ ...prev, offset: 0, currentPage: 1 }));
    loadReferrals(updatedFilters, { offset: 0 });
  };

  // Pagination handlers
  const handlePageChange = (page: number) => {
    const newOffset = (page - 1) * pagination.limit;
    setPagination(prev => ({ ...prev, offset: newOffset, currentPage: page }));
    loadReferrals({}, { offset: newOffset });
  };

  // Referral action handlers
  const handleStatusUpdate = async (referralId: string, newStatus: string, notes?: string) => {
    try {
      await referralService.updateReferralStatus(referralId, newStatus, notes);
      toast.success('Referral status updated successfully');
      loadReferrals();
      loadStatistics();
    } catch (error) {
      console.error('Error updating referral status:', error);
      toast.error('Failed to update referral status');
    }
  };

  const handleCreateReferral = () => {
    setShowCreateDialog(true);
  };

  const handleReferralCreated = (newReferral: Referral) => {
    setReferrals(prev => [newReferral, ...prev]);
    setShowCreateDialog(false);
    loadStatistics();
    toast.success('Referral created successfully');
  };

  if (currentViewMode === 'details' && selectedReferral) {
    return (
      <div className="container mx-auto p-6">
        <Button variant="outline" onClick={handleBackToList} className="mb-4">
          &larr; Back to Referrals
        </Button>
        <ReferralDetails 
          referral={selectedReferral} 
          onEdit={() => handleEditReferral(selectedReferral)}
        />
      </div>
    );
  }

  if (currentViewMode === 'edit' && selectedReferral) {
    return (
      <div className="container mx-auto p-6">
        <Button variant="outline" onClick={handleBackToList} className="mb-4">
          &larr; Back to Referrals
        </Button>
        <ReferralEditForm 
          referral={selectedReferral}
          onSave={handleSaveReferral}
          onCancel={handleBackToList}
        />
      </div>
    );
  }

  // Default list view
  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Referral Management</h1>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" /> New Referral
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid grid-cols-4 w-full max-w-md mb-6">
          <TabsTrigger value="incoming">Incoming</TabsTrigger>
          <TabsTrigger value="outgoing">Outgoing</TabsTrigger>
          <TabsTrigger value="new">New</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeTab} className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : referrals.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No referrals found</h3>
                <p className="text-gray-500 text-center mb-4">
                  {searchTerm || Object.keys(filters).length > 0
                    ? 'Try adjusting your search or filters'
                    : 'Get started by creating your first referral'
                  }
                </p>
                {!searchTerm && Object.keys(filters).length === 0 && (
                  <Button onClick={handleCreateReferral}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Referral
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Referrals List */}
              <div className="grid gap-4">
                {referrals.map((referral) => (
                  <ReferralCard
                    key={referral.id}
                    referral={referral}
                    onClick={() => handleReferralClick(referral)}
                    onStatusUpdate={handleStatusUpdate}
                  />
                ))}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    Showing {pagination.offset + 1} to {Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total} referrals
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.currentPage - 1)}
                      disabled={pagination.currentPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm">
                      Page {pagination.currentPage} of {pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.currentPage + 1)}
                      disabled={pagination.currentPage === pagination.totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search referrals by patient name, specialist, or reason..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="mt-4 p-4 border rounded-lg bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="specialty-filter">Specialty</Label>
                  <Select
                    value={filters.specialty?.[0] || ''}
                    onValueChange={(value) => 
                      handleFilterChange({ specialty: value ? [value] : undefined })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All specialties" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All specialties</SelectItem>
                      <SelectItem value="Cardiology">Cardiology</SelectItem>
                      <SelectItem value="Dermatology">Dermatology</SelectItem>
                      <SelectItem value="Endocrinology">Endocrinology</SelectItem>
                      <SelectItem value="Orthopedics">Orthopedics</SelectItem>
                      <SelectItem value="Neurology">Neurology</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="urgency-filter">Urgency</Label>
                  <Select
                    value={filters.urgency?.[0] || ''}
                    onValueChange={(value) => 
                      handleFilterChange({ urgency: value ? [value] : undefined })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All urgency levels" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All urgency levels</SelectItem>
                      <SelectItem value="routine">Routine</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="stat">STAT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="start-date">Start Date</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={filters.startDate || ''}
                    onChange={(e) => handleFilterChange({ startDate: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="end-date">End Date</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={filters.endDate || ''}
                    onChange={(e) => handleFilterChange({ endDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end mt-4 space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setFilters({});
                    loadReferrals({});
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <ReferralCreationDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        providerId={providerId}
        patientId={patientId}
        onReferralCreated={handleReferralCreated}
      />

      <ReferralDetailsDialog
        open={showDetailsDialog}
        onOpenChange={setShowDetailsDialog}
        referral={selectedReferral}
        onStatusUpdate={handleStatusUpdate}
        onReferralUpdated={() => {
          loadReferrals();
          loadStatistics();
        }}
      />
    </div>
  );
};