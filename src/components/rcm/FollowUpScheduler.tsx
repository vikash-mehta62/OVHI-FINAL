import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
  Calendar,
  Clock,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  AlertCircle,
  User,
  Filter,
  Search,
  RefreshCw,
  Bell,
  CalendarDays,
  Target,
  Flag
} from 'lucide-react';
import { formatDate } from '@/utils/rcmFormatters';

interface FollowUp {
  id: number;
  claim_id: number;
  assigned_user_id: number;
  created_by: number;
  followup_type: string;
  title: string;
  description?: string;
  scheduled_date: string;
  due_date?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'overdue';
  outcome?: string;
  next_followup_date?: string;
  reminder_sent: boolean;
  escalation_level: number;
  estimated_minutes?: number;
  actual_minutes?: number;
  tags?: string[];
  assigned_user_name: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

interface FollowUpSchedulerProps {
  claimId?: number;
  userId?: number;
  view?: 'calendar' | 'list' | 'kanban';
  className?: string;
}con
st FollowUpScheduler: React.FC<FollowUpSchedulerProps> = ({
  claimId,
  userId,
  view = 'calendar',
  className = ''
}) => {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState(view);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingFollowUp, setEditingFollowUp] = useState<FollowUp | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    followup_type: 'payment_inquiry',
    scheduled_date: '',
    due_date: '',
    priority: 'medium' as FollowUp['priority'],
    assigned_user_id: userId || 0,
    estimated_minutes: 30,
    tags: [] as string[]
  });

  // Filters
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    type: '',
    assignedUser: '',
    search: '',
    dateFrom: '',
    dateTo: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  // Available users for assignment
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);

  // Follow-up types
  const followUpTypes = [
    { value: 'payment_inquiry', label: 'Payment Inquiry', icon: '💰' },
    { value: 'denial_appeal', label: 'Denial Appeal', icon: '⚖️' },
    { value: 'prior_auth', label: 'Prior Authorization', icon: '📋' },
    { value: 'patient_contact', label: 'Patient Contact', icon: '📞' },
    { value: 'insurance_verification', label: 'Insurance Verification', icon: '🔍' },
    { value: 'medical_records', label: 'Medical Records', icon: '📄' },
    { value: 'corrected_claim', label: 'Corrected Claim', icon: '✏️' },
    { value: 'timely_filing', label: 'Timely Filing', icon: '⏰' },
    { value: 'collections', label: 'Collections', icon: '💳' },
    { value: 'write_off_review', label: 'Write-off Review', icon: '📊' }
  ];

  // Fetch follow-ups
  const fetchFollowUps = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const queryParams = new URLSearchParams({
        ...(claimId && { claimId: claimId.toString() }),
        ...(userId && { assignedUser: userId.toString() }),
        ...(filters.status && { status: filters.status }),
        ...(filters.priority && { priority: filters.priority }),
        ...(filters.type && { type: filters.type }),
        ...(filters.assignedUser && { assignedUser: filters.assignedUser }),
        ...(filters.search && { search: filters.search }),
        ...(filters.dateFrom && { dateFrom: filters.dateFrom }),
        ...(filters.dateTo && { dateTo: filters.dateTo })
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
      } else {
        throw new Error(data.message || 'Failed to fetch follow-ups');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Fetch available users
  const fetchAvailableUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/v1/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableUsers(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };  /
/ Create or update follow-up
  const saveFollowUp = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const payload = {
        ...formData,
        claim_id: claimId,
        tags: formData.tags.length > 0 ? formData.tags : undefined
      };

      const url = editingFollowUp 
        ? `/api/v1/rcm/followups/${editingFollowUp.id}`
        : `/api/v1/rcm/followups`;

      const method = editingFollowUp ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Failed to save follow-up');
      }

      const data = await response.json();
      
      if (data.success) {
        setShowCreateDialog(false);
        setEditingFollowUp(null);
        resetForm();
        await fetchFollowUps();
      } else {
        throw new Error(data.message || 'Failed to save follow-up');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save follow-up');
    }
  };

  // Delete follow-up
  const deleteFollowUp = async (followUpId: number) => {
    if (!confirm('Are you sure you want to delete this follow-up?')) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`/api/v1/rcm/followups/${followUpId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete follow-up');
      }

      await fetchFollowUps();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete follow-up');
    }
  };

  // Complete follow-up
  const completeFollowUp = async (followUpId: number, outcome: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`/api/v1/rcm/followups/${followUpId}/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ outcome })
      });

      if (!response.ok) {
        throw new Error('Failed to complete follow-up');
      }

      await fetchFollowUps();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete follow-up');
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      followup_type: 'payment_inquiry',
      scheduled_date: '',
      due_date: '',
      priority: 'medium',
      assigned_user_id: userId || 0,
      estimated_minutes: 30,
      tags: []
    });
  };

  // Open edit dialog
  const openEditDialog = (followUp: FollowUp) => {
    setEditingFollowUp(followUp);
    setFormData({
      title: followUp.title,
      description: followUp.description || '',
      followup_type: followUp.followup_type,
      scheduled_date: followUp.scheduled_date.split('T')[0],
      due_date: followUp.due_date ? followUp.due_date.split('T')[0] : '',
      priority: followUp.priority,
      assigned_user_id: followUp.assigned_user_id,
      estimated_minutes: followUp.estimated_minutes || 30,
      tags: followUp.tags || []
    });
    setShowCreateDialog(true);
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
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  // Get status icon
  const getStatusIcon = (status: FollowUp['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'overdue': return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'in_progress': return <Clock className="h-4 w-4 text-blue-600" />;
      default: return <Calendar className="h-4 w-4 text-yellow-600" />;
    }
  };

  useEffect(() => {
    fetchFollowUps();
    fetchAvailableUsers();
  }, [claimId, userId, filters]);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Follow-up Scheduler
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading follow-ups...</span>
          </div>
        </CardContent>
      </Card>
    );
  }  re
turn (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Follow-up Scheduler
            {followUps.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {followUps.length}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex items-center border rounded-lg">
              <Button
                variant={currentView === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCurrentView('list')}
              >
                List
              </Button>
              <Button
                variant={currentView === 'calendar' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCurrentView('calendar')}
              >
                Calendar
              </Button>
              <Button
                variant={currentView === 'kanban' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCurrentView('kanban')}
              >
                Kanban
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={() => {
                  setEditingFollowUp(null);
                  resetForm();
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Schedule Follow-up
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingFollowUp ? 'Edit Follow-up' : 'Schedule New Follow-up'}
                  </DialogTitle>
                  <DialogDescription>
                    Create a follow-up task to track important claim activities
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Title *</label>
                      <Input
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Follow-up title"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Type *</label>
                      <Select 
                        value={formData.followup_type} 
                        onValueChange={(value) => setFormData(prev => ({ ...prev, followup_type: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {followUpTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.icon} {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Description</label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Detailed description of the follow-up task"
                      className="min-h-[80px]"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Scheduled Date *</label>
                      <Input
                        type="date"
                        value={formData.scheduled_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, scheduled_date: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Due Date</label>
                      <Input
                        type="date"
                        value={formData.due_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Priority</label>
                      <Select 
                        value={formData.priority} 
                        onValueChange={(value: FollowUp['priority']) => setFormData(prev => ({ ...prev, priority: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Assign To</label>
                      <Select 
                        value={formData.assigned_user_id.toString()} 
                        onValueChange={(value) => setFormData(prev => ({ ...prev, assigned_user_id: parseInt(value) }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select user" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableUsers.map((user) => (
                            <SelectItem key={user.id} value={user.id.toString()}>
                              {user.first_name} {user.last_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Estimated Time (minutes)</label>
                      <Input
                        type="number"
                        value={formData.estimated_minutes}
                        onChange={(e) => setFormData(prev => ({ ...prev, estimated_minutes: parseInt(e.target.value) || 30 }))}
                        min="5"
                        max="480"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setShowCreateDialog(false);
                        setEditingFollowUp(null);
                        resetForm();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button onClick={saveFollowUp} disabled={!formData.title || !formData.scheduled_date}>
                      {editingFollowUp ? 'Update' : 'Schedule'} Follow-up
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Select value={filters.status} onValueChange={(value) => 
                setFilters(prev => ({ ...prev, status: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={filters.priority} onValueChange={(value) => 
                setFilters(prev => ({ ...prev, priority: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="All priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All priorities</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.type} onValueChange={(value) => 
                setFilters(prev => ({ ...prev, type: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All types</SelectItem>
                  {followUpTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search follow-ups..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        )}
      </CardHeader>   
   <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700">
            {error}
          </div>
        )}

        {followUps.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CalendarDays className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No follow-ups scheduled</p>
            <p className="text-sm">Schedule your first follow-up to get started</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* List View */}
            {currentView === 'list' && (
              <div className="space-y-3">
                {followUps.map((followUp) => (
                  <div key={followUp.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-medium">{followUp.title}</h3>
                          <Badge className={`text-xs ${getPriorityColor(followUp.priority)}`}>
                            {followUp.priority}
                          </Badge>
                          <Badge className={`text-xs ${getStatusColor(followUp.status)}`}>
                            {getStatusIcon(followUp.status)}
                            <span className="ml-1">{followUp.status}</span>
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {followUpTypes.find(t => t.value === followUp.followup_type)?.icon}
                            {followUpTypes.find(t => t.value === followUp.followup_type)?.label}
                          </span>
                        </div>
                        
                        {followUp.description && (
                          <p className="text-sm text-gray-600 mb-2">{followUp.description}</p>
                        )}
                        
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>Scheduled: {formatDate(followUp.scheduled_date)}</span>
                          </div>
                          {followUp.due_date && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>Due: {formatDate(followUp.due_date)}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span>Assigned: {followUp.assigned_user_name}</span>
                          </div>
                          {followUp.estimated_minutes && (
                            <div className="flex items-center gap-1">
                              <Target className="h-3 w-3" />
                              <span>{followUp.estimated_minutes}min</span>
                            </div>
                          )}
                        </div>

                        {followUp.tags && followUp.tags.length > 0 && (
                          <div className="flex items-center gap-2 mt-2">
                            {followUp.tags.map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {followUp.status === 'pending' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => completeFollowUp(followUp.id, 'Completed via scheduler')}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Complete
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditDialog(followUp)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteFollowUp(followUp.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Calendar View */}
            {currentView === 'calendar' && (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Calendar view coming soon</p>
                <p className="text-sm">Full calendar integration will be available in the next update</p>
              </div>
            )}

            {/* Kanban View */}
            {currentView === 'kanban' && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {['pending', 'in_progress', 'completed', 'overdue'].map((status) => (
                  <div key={status} className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium mb-3 capitalize flex items-center gap-2">
                      {getStatusIcon(status as FollowUp['status'])}
                      {status.replace('_', ' ')}
                      <Badge variant="secondary" className="text-xs">
                        {followUps.filter(f => f.status === status).length}
                      </Badge>
                    </h3>
                    <div className="space-y-2">
                      {followUps
                        .filter(f => f.status === status)
                        .map((followUp) => (
                          <div key={followUp.id} className="bg-white border rounded p-3 text-sm">
                            <div className="font-medium mb-1">{followUp.title}</div>
                            <div className="text-xs text-gray-500 mb-2">
                              {formatDate(followUp.scheduled_date)}
                            </div>
                            <div className="flex items-center justify-between">
                              <Badge className={`text-xs ${getPriorityColor(followUp.priority)}`}>
                                {followUp.priority}
                              </Badge>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => openEditDialog(followUp)}
                                  className="h-6 w-6 p-0"
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                {followUp.status === 'pending' && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => completeFollowUp(followUp.id, 'Completed')}
                                    className="h-6 w-6 p-0 text-green-600"
                                  >
                                    <CheckCircle className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FollowUpScheduler;