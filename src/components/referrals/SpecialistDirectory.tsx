import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Search, Filter, MapPin, Phone, Mail, Globe, Star,
  User, Building, Clock, Award, Shield, Plus, Edit,
  Eye, MoreHorizontal, Calendar, TrendingUp, Users,
  CheckCircle, XCircle, AlertCircle, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { specialistService, type Specialist, type SpecialistFilters } from '@/services/specialistService';

interface SpecialistDirectoryProps {
  onSpecialistSelect?: (specialist: Specialist) => void;
  selectionMode?: boolean;
  providerId?: string;
}

interface SpecialistProfile extends Specialist {
  performance_metrics?: {
    referrals_received: number;
    referrals_completed: number;
    average_response_time: number;
    patient_satisfaction_trend: number;
    completion_rate: number;
  };
  network_status?: {
    is_in_network: boolean;
    contract_status: 'active' | 'pending' | 'expired';
    last_updated: string;
  };
}

export const SpecialistDirectory: React.FC<SpecialistDirectoryProps> = ({
  onSpecialistSelect,
  selectionMode = false,
  providerId
}) => {
  const [specialists, setSpecialists] = useState<SpecialistProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [filters, setFilters] = useState<SpecialistFilters>({});
  const [selectedSpecialist, setSelectedSpecialist] = useState<SpecialistProfile | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'rating' | 'distance' | 'availability'>('name');
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 20,
    offset: 0,
    totalPages: 0,
    currentPage: 1
  });

  const specialties = [
    'Cardiology', 'Dermatology', 'Endocrinology', 'Gastroenterology',
    'Hematology/Oncology', 'Nephrology', 'Neurology', 'Orthopedics',
    'Pulmonology', 'Rheumatology', 'Urology', 'Mental Health',
    'Physical Therapy', 'Radiology', 'Surgery', 'Ophthalmology',
    'ENT', 'Pediatrics', 'Obstetrics/Gynecology'
  ];

  // Load specialists
  const loadSpecialists = async (newFilters?: SpecialistFilters, newPagination?: any) => {
    try {
      setLoading(true);
      
      const currentFilters = { ...filters, ...newFilters };
      const currentPagination = { 
        limit: pagination.limit,
        offset: pagination.offset,
        ...newPagination 
      };

      // Add search term
      if (searchTerm) {
        currentFilters.query = searchTerm;
      }

      // Add tab-based filtering
      if (activeTab !== 'all') {
        switch (activeTab) {
          case 'network':
            currentFilters.inNetwork = true;
            break;
          case 'accepting':
            currentFilters.acceptingPatients = true;
            break;
          case 'high-rated':
            currentFilters.minRating = 4.5;
            break;
        }
      }

      const response = await specialistService.searchSpecialists(
        currentFilters,
        currentPagination,
        sortBy
      );

      if (response.success && response.specialists) {
        // Enhance with mock performance data
        const enhancedSpecialists = response.specialists.map(specialist => ({
          ...specialist,
          performance_metrics: {
            referrals_received: Math.floor(Math.random() * 100) + 20,
            referrals_completed: Math.floor(Math.random() * 80) + 15,
            average_response_time: Math.floor(Math.random() * 48) + 2,
            patient_satisfaction_trend: (Math.random() - 0.5) * 0.5,
            completion_rate: Math.random() * 0.3 + 0.7
          },
          network_status: {
            is_in_network: Math.random() > 0.3,
            contract_status: Math.random() > 0.8 ? 'pending' : 'active' as const,
            last_updated: new Date().toISOString().split('T')[0]
          }
        }));

        setSpecialists(enhancedSpecialists);
        if (response.pagination) {
          setPagination(response.pagination);
        }
      }
    } catch (error) {
      console.error('Error loading specialists:', error);
      toast.error('Failed to load specialists');
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadSpecialists();
  }, [activeTab, sortBy]);

  // Search handler
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setPagination(prev => ({ ...prev, offset: 0, currentPage: 1 }));
    loadSpecialists({ query: value }, { offset: 0 });
  };

  // Filter handlers
  const handleFilterChange = (newFilters: Partial<SpecialistFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    setPagination(prev => ({ ...prev, offset: 0, currentPage: 1 }));
    loadSpecialists(updatedFilters, { offset: 0 });
  };

  // Specialist action handlers
  const handleSpecialistClick = (specialist: SpecialistProfile) => {
    if (selectionMode && onSpecialistSelect) {
      onSpecialistSelect(specialist);
    } else {
      setSelectedSpecialist(specialist);
      setShowProfileDialog(true);
    }
  };

  const handleAddToNetwork = async (specialistId: string) => {
    try {
      await specialistService.addToNetwork(specialistId);
      toast.success('Specialist added to network');
      loadSpecialists();
    } catch (error) {
      console.error('Error adding specialist to network:', error);
      toast.error('Failed to add specialist to network');
    }
  };

  const handleUpdateStatus = async (specialistId: string, status: string) => {
    try {
      await specialistService.updateNetworkStatus(specialistId, status);
      toast.success('Network status updated');
      loadSpecialists();
    } catch (error) {
      console.error('Error updating network status:', error);
      toast.error('Failed to update network status');
    }
  };

  // Get status counts for tabs
  const getStatusCount = (status: string) => {
    switch (status) {
      case 'all':
        return specialists.length;
      case 'network':
        return specialists.filter(s => s.network_status?.is_in_network).length;
      case 'accepting':
        return specialists.filter(s => s.accepts_new_patients).length;
      case 'high-rated':
        return specialists.filter(s => s.patient_satisfaction_score && s.patient_satisfaction_score >= 4.5).length;
      default:
        return 0;
    }
  };

  const renderSpecialistCard = (specialist: SpecialistProfile) => (
    <Card 
      key={specialist.id}
      className={`cursor-pointer transition-all hover:shadow-md ${
        selectionMode ? 'hover:border-blue-500' : ''
      }`}
      onClick={() => handleSpecialistClick(specialist)}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-lg">{specialist.name}</h3>
                {specialist.title && (
                  <Badge variant="secondary" className="text-xs">
                    {specialist.title}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-600">{specialist.specialty}</p>
            </div>
            
            <div className="flex items-center space-x-2">
              {specialist.patient_satisfaction_score && (
                <div className="flex items-center">
                  <Star className="h-4 w-4 text-yellow-500 mr-1" />
                  <span className="text-sm font-medium">
                    {specialist.patient_satisfaction_score.toFixed(1)}
                  </span>
                </div>
              )}
              {specialist.network_status?.is_in_network && (
                <Badge variant="default" className="text-xs">
                  In Network
                </Badge>
              )}
            </div>
          </div>

          {/* Practice Info */}
          {specialist.practice_name && (
            <div className="flex items-center text-sm text-gray-600">
              <Building className="h-4 w-4 mr-2" />
              {specialist.practice_name}
            </div>
          )}

          <div className="flex items-center text-sm text-gray-600">
            <MapPin className="h-4 w-4 mr-2" />
            {specialist.address ? `${specialist.address}, ` : ''}{specialist.city}, {specialist.state}
          </div>

          {/* Contact Info */}
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            {specialist.phone && (
              <div className="flex items-center">
                <Phone className="h-3 w-3 mr-1" />
                {specialist.phone}
              </div>
            )}
            {specialist.email && (
              <div className="flex items-center">
                <Mail className="h-3 w-3 mr-1" />
                {specialist.email}
              </div>
            )}
          </div>

          {/* Status Indicators */}
          <div className="flex flex-wrap gap-2">
            {specialist.accepts_new_patients && (
              <Badge variant="outline" className="text-xs text-green-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                Accepting Patients
              </Badge>
            )}
            {specialist.board_certified && (
              <Badge variant="outline" className="text-xs">
                <Award className="h-3 w-3 mr-1" />
                Board Certified
              </Badge>
            )}
            {specialist.telehealth_available && (
              <Badge variant="outline" className="text-xs">
                Telehealth Available
              </Badge>
            )}
            {specialist.average_wait_time && (
              <Badge variant="outline" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                {specialist.average_wait_time} days
              </Badge>
            )}
          </div>

          {/* Performance Metrics */}
          {specialist.performance_metrics && (
            <div className="grid grid-cols-2 gap-2 pt-2 border-t text-xs">
              <div>
                <span className="text-gray-500">Completion Rate:</span>
                <span className="ml-1 font-medium">
                  {(specialist.performance_metrics.completion_rate * 100).toFixed(0)}%
                </span>
              </div>
              <div>
                <span className="text-gray-500">Avg Response:</span>
                <span className="ml-1 font-medium">
                  {specialist.performance_metrics.average_response_time}h
                </span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const renderSpecialistList = (specialist: SpecialistProfile) => (
    <Card 
      key={specialist.id}
      className={`cursor-pointer transition-all hover:shadow-sm ${
        selectionMode ? 'hover:border-blue-500' : ''
      }`}
      onClick={() => handleSpecialistClick(specialist)}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 flex-1">
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold">{specialist.name}</h3>
                {specialist.title && (
                  <Badge variant="secondary" className="text-xs">
                    {specialist.title}
                  </Badge>
                )}
                {specialist.network_status?.is_in_network && (
                  <Badge variant="default" className="text-xs">
                    In Network
                  </Badge>
                )}
              </div>
              <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                <span>{specialist.specialty}</span>
                {specialist.practice_name && (
                  <>
                    <span>•</span>
                    <span>{specialist.practice_name}</span>
                  </>
                )}
                <span>•</span>
                <span>{specialist.city}, {specialist.state}</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-6 text-sm">
              {specialist.patient_satisfaction_score && (
                <div className="flex items-center">
                  <Star className="h-4 w-4 text-yellow-500 mr-1" />
                  <span>{specialist.patient_satisfaction_score.toFixed(1)}</span>
                </div>
              )}
              
              {specialist.performance_metrics && (
                <div className="text-center">
                  <div className="font-medium">
                    {(specialist.performance_metrics.completion_rate * 100).toFixed(0)}%
                  </div>
                  <div className="text-xs text-gray-500">Completion</div>
                </div>
              )}
              
              {specialist.average_wait_time && (
                <div className="text-center">
                  <div className="font-medium">{specialist.average_wait_time}</div>
                  <div className="text-xs text-gray-500">Days</div>
                </div>
              )}
              
              <div className="flex flex-col space-y-1">
                {specialist.accepts_new_patients && (
                  <Badge variant="outline" className="text-xs text-green-600">
                    Accepting
                  </Badge>
                )}
                {specialist.telehealth_available && (
                  <Badge variant="outline" className="text-xs">
                    Telehealth
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Specialist Directory</h1>
          <p className="text-muted-foreground">
            Find and manage specialist network relationships
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => loadSpecialists()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Specialist
          </Button>
        </div>
      </div>

      {/* Search and Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between space-x-4">
            <div className="flex items-center space-x-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search specialists by name, specialty, or location..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="rating">Rating</SelectItem>
                  <SelectItem value="distance">Distance</SelectItem>
                  <SelectItem value="availability">Availability</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
              
              <div className="flex border rounded">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  Grid
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  List
                </Button>
              </div>
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="mt-4 p-4 border rounded-lg bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label>Specialty</Label>
                  <Select
                    value={filters.specialty || ''}
                    onValueChange={(value) => 
                      handleFilterChange({ specialty: value || undefined })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All specialties" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All specialties</SelectItem>
                      {specialties.map((specialty) => (
                        <SelectItem key={specialty} value={specialty}>
                          {specialty}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Location</Label>
                  <Input
                    placeholder="City, State"
                    value={filters.location || ''}
                    onChange={(e) => handleFilterChange({ location: e.target.value || undefined })}
                  />
                </div>

                <div>
                  <Label>Min Rating</Label>
                  <Select
                    value={filters.minRating?.toString() || ''}
                    onValueChange={(value) => 
                      handleFilterChange({ minRating: value ? parseFloat(value) : undefined })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any rating" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any rating</SelectItem>
                      <SelectItem value="4.5">4.5+ stars</SelectItem>
                      <SelectItem value="4.0">4.0+ stars</SelectItem>
                      <SelectItem value="3.5">3.5+ stars</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Distance</Label>
                  <Select
                    value={filters.maxDistance?.toString() || ''}
                    onValueChange={(value) => 
                      handleFilterChange({ maxDistance: value ? parseInt(value) : undefined })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any distance" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any distance</SelectItem>
                      <SelectItem value="5">Within 5 miles</SelectItem>
                      <SelectItem value="10">Within 10 miles</SelectItem>
                      <SelectItem value="25">Within 25 miles</SelectItem>
                      <SelectItem value="50">Within 50 miles</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-4 mt-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="accepting-patients"
                    checked={filters.acceptingPatients || false}
                    onCheckedChange={(checked) => 
                      handleFilterChange({ acceptingPatients: checked || undefined })
                    }
                  />
                  <Label htmlFor="accepting-patients">Accepting new patients</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="telehealth"
                    checked={filters.telehealthAvailable || false}
                    onCheckedChange={(checked) => 
                      handleFilterChange({ telehealthAvailable: checked || undefined })
                    }
                  />
                  <Label htmlFor="telehealth">Telehealth available</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="board-certified"
                    checked={filters.boardCertified || false}
                    onCheckedChange={(checked) => 
                      handleFilterChange({ boardCertified: checked || undefined })
                    }
                  />
                  <Label htmlFor="board-certified">Board certified</Label>
                </div>
              </div>

              <div className="flex justify-end mt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setFilters({});
                    loadSpecialists({});
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">
            All ({getStatusCount('all')})
          </TabsTrigger>
          <TabsTrigger value="network">
            In Network ({getStatusCount('network')})
          </TabsTrigger>
          <TabsTrigger value="accepting">
            Accepting ({getStatusCount('accepting')})
          </TabsTrigger>
          <TabsTrigger value="high-rated">
            High Rated ({getStatusCount('high-rated')})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : specialists.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <User className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No specialists found</h3>
                <p className="text-gray-500 text-center mb-4">
                  {searchTerm || Object.keys(filters).length > 0
                    ? 'Try adjusting your search or filters'
                    : 'Get started by adding specialists to your network'
                  }
                </p>
                {!searchTerm && Object.keys(filters).length === 0 && (
                  <Button onClick={() => setShowAddDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Specialist
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Specialists Grid/List */}
              <div className={viewMode === 'grid' 
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' 
                : 'space-y-2'
              }>
                {specialists.map((specialist) => 
                  viewMode === 'grid' 
                    ? renderSpecialistCard(specialist)
                    : renderSpecialistList(specialist)
                )}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    Showing {pagination.offset + 1} to {Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total} specialists
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newPage = pagination.currentPage - 1;
                        const newOffset = (newPage - 1) * pagination.limit;
                        setPagination(prev => ({ ...prev, offset: newOffset, currentPage: newPage }));
                        loadSpecialists({}, { offset: newOffset });
                      }}
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
                      onClick={() => {
                        const newPage = pagination.currentPage + 1;
                        const newOffset = (newPage - 1) * pagination.limit;
                        setPagination(prev => ({ ...prev, offset: newOffset, currentPage: newPage }));
                        loadSpecialists({}, { offset: newOffset });
                      }}
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

      {/* Specialist Profile Dialog */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Specialist Profile</DialogTitle>
          </DialogHeader>
          
          {selectedSpecialist && (
            <div className="space-y-6">
              {/* Basic Info */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl">{selectedSpecialist.name}</CardTitle>
                      <p className="text-gray-600">{selectedSpecialist.specialty}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {selectedSpecialist.patient_satisfaction_score && (
                        <div className="flex items-center">
                          <Star className="h-5 w-5 text-yellow-500 mr-1" />
                          <span className="font-medium">
                            {selectedSpecialist.patient_satisfaction_score.toFixed(1)}
                          </span>
                        </div>
                      )}
                      {selectedSpecialist.network_status?.is_in_network ? (
                        <Badge variant="default">In Network</Badge>
                      ) : (
                        <Button 
                          size="sm" 
                          onClick={() => handleAddToNetwork(selectedSpecialist.id)}
                        >
                          Add to Network
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Practice</Label>
                      <p>{selectedSpecialist.practice_name || 'Not specified'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Location</Label>
                      <p>{selectedSpecialist.city}, {selectedSpecialist.state}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Phone</Label>
                      <p>{selectedSpecialist.phone || 'Not available'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Email</Label>
                      <p>{selectedSpecialist.email || 'Not available'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Performance Metrics */}
              {selectedSpecialist.performance_metrics && (
                <Card>
                  <CardHeader>
                    <CardTitle>Performance Metrics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {selectedSpecialist.performance_metrics.referrals_received}
                        </div>
                        <div className="text-sm text-gray-600">Referrals Received</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {(selectedSpecialist.performance_metrics.completion_rate * 100).toFixed(0)}%
                        </div>
                        <div className="text-sm text-gray-600">Completion Rate</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">
                          {selectedSpecialist.performance_metrics.average_response_time}h
                        </div>
                        <div className="text-sm text-gray-600">Avg Response Time</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {selectedSpecialist.performance_metrics.patient_satisfaction_trend > 0 ? '+' : ''}
                          {(selectedSpecialist.performance_metrics.patient_satisfaction_trend * 100).toFixed(1)}%
                        </div>
                        <div className="text-sm text-gray-600">Satisfaction Trend</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};