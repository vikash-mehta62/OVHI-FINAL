import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  AlertTriangle, 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle,
  Plus,
  Search,
  Filter,
  Download,
  RefreshCw,
  Eye,
  Edit,
  Send,
  Calendar,
  DollarSign,
  User,
  Building
} from 'lucide-react';

interface DenialCase {
  id: number;
  claimId: number;
  claimNumber: string;
  patientName: string;
  denialDate: string;
  denialCode: string;
  denialReason: string;
  carcCode: string;
  rarcCode: string;
  denialCategory: string;
  rootCause: string;
  denialAmount: number;
  caseStatus: string;
  priority: string;
  assignedTo: string;
  daysOpen: number;
}

interface AppealTask {
  id: number;
  denialCaseId: number;
  appealLevel: string;
  appealType: string;
  dueDate: string;
  appealStatus: string;
  assignedTo: string;
  daysUntilDue: number;
}

const DenialManagement: React.FC = () => {
  const [denialCases, setDenialCases] = useState<DenialCase[]>([]);
  const [appealTasks, setAppealTasks] = useState<AppealTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selectedCase, setSelectedCase] = useState<DenialCase | null>(null);
  const [showAppealDialog, setShowAppealDialog] = useState(false);

  useEffect(() => {
    fetchDenialCases();
    fetchAppealTasks();
  }, []);

  const fetchDenialCases = async () => {
    try {
      const response = await fetch('/api/v1/rcm/denials', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setDenialCases(data.data);
      } else {
        // Mock data for development
        setDenialCases(getMockDenialCases());
      }
    } catch (error) {
      console.error('Failed to fetch denial cases:', error);
      setDenialCases(getMockDenialCases());
    } finally {
      setLoading(false);
    }
  };

  const fetchAppealTasks = async () => {
    try {
      const response = await fetch('/api/v1/rcm/appeals', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAppealTasks(data.data);
      } else {
        // Mock data for development
        setAppealTasks(getMockAppealTasks());
      }
    } catch (error) {
      console.error('Failed to fetch appeal tasks:', error);
      setAppealTasks(getMockAppealTasks());
    }
  };

  const getMockDenialCases = (): DenialCase[] => [
    {
      id: 1,
      claimId: 1001,
      claimNumber: 'CLM-2024-001',
      patientName: 'John Smith',
      denialDate: '2024-01-15',
      denialCode: 'CO-16',
      denialReason: 'Claim/service lacks information or has submission/billing error',
      carcCode: 'CO',
      rarcCode: '16',
      denialCategory: 'coding',
      rootCause: 'Missing modifier',
      denialAmount: 250.00,
      caseStatus: 'new',
      priority: 'high',
      assignedTo: 'Sarah Johnson',
      daysOpen: 5
    },
    {
      id: 2,
      claimId: 1002,
      claimNumber: 'CLM-2024-002',
      patientName: 'Mary Davis',
      denialDate: '2024-01-10',
      denialCode: 'PR-1',
      denialReason: 'Deductible amount',
      carcCode: 'PR',
      rarcCode: '1',
      denialCategory: 'eligibility',
      rootCause: 'Patient deductible not met',
      denialAmount: 150.00,
      caseStatus: 'under_review',
      priority: 'medium',
      assignedTo: 'Mike Wilson',
      daysOpen: 10
    },
    {
      id: 3,
      claimId: 1003,
      claimNumber: 'CLM-2024-003',
      patientName: 'Robert Brown',
      denialDate: '2024-01-08',
      denialCode: 'CO-197',
      denialReason: 'Precertification/authorization/notification absent',
      carcCode: 'CO',
      rarcCode: '197',
      denialCategory: 'authorization',
      rootCause: 'Missing prior authorization',
      denialAmount: 500.00,
      caseStatus: 'appealing',
      priority: 'urgent',
      assignedTo: 'Lisa Chen',
      daysOpen: 12
    }
  ];

  const getMockAppealTasks = (): AppealTask[] => [
    {
      id: 1,
      denialCaseId: 3,
      appealLevel: 'first',
      appealType: 'reconsideration',
      dueDate: '2024-02-15',
      appealStatus: 'in_progress',
      assignedTo: 'Lisa Chen',
      daysUntilDue: 15
    },
    {
      id: 2,
      denialCaseId: 1,
      appealLevel: 'first',
      appealType: 'redetermination',
      dueDate: '2024-02-20',
      appealStatus: 'pending',
      assignedTo: 'Sarah Johnson',
      daysUntilDue: 20
    }
  ];

  const createAppealTask = async (denialCaseId: number, appealData: any) => {
    try {
      const response = await fetch('/api/v1/rcm/appeals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          denialCaseId,
          ...appealData
        })
      });

      if (response.ok) {
        fetchAppealTasks();
        setShowAppealDialog(false);
      }
    } catch (error) {
      console.error('Failed to create appeal task:', error);
    }
  };

  const updateCaseStatus = async (caseId: number, status: string) => {
    try {
      const response = await fetch(`/api/v1/rcm/denials/${caseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ caseStatus: status })
      });

      if (response.ok) {
        fetchDenialCases();
      }
    } catch (error) {
      console.error('Failed to update case status:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      new: { color: 'bg-blue-100 text-blue-800', label: 'New' },
      under_review: { color: 'bg-yellow-100 text-yellow-800', label: 'Under Review' },
      appealing: { color: 'bg-purple-100 text-purple-800', label: 'Appealing' },
      resolved: { color: 'bg-green-100 text-green-800', label: 'Resolved' },
      written_off: { color: 'bg-gray-100 text-gray-800', label: 'Written Off' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.new;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      low: { color: 'bg-green-100 text-green-800', label: 'Low' },
      medium: { color: 'bg-yellow-100 text-yellow-800', label: 'Medium' },
      high: { color: 'bg-orange-100 text-orange-800', label: 'High' },
      urgent: { color: 'bg-red-100 text-red-800', label: 'Urgent' }
    };

    const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.medium;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const filteredCases = denialCases.filter(denialCase => {
    const matchesSearch = denialCase.claimNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         denialCase.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         denialCase.denialReason.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || denialCase.caseStatus === statusFilter;
    const matchesPriority = priorityFilter === 'all' || denialCase.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const denialStats = {
    totalCases: denialCases.length,
    newCases: denialCases.filter(c => c.caseStatus === 'new').length,
    inProgress: denialCases.filter(c => c.caseStatus === 'under_review' || c.caseStatus === 'appealing').length,
    resolved: denialCases.filter(c => c.caseStatus === 'resolved').length,
    totalAmount: denialCases.reduce((sum, c) => sum + c.denialAmount, 0),
    avgDaysOpen: denialCases.reduce((sum, c) => sum + c.daysOpen, 0) / denialCases.length || 0
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Denial Management</h2>
          <p className="text-muted-foreground">
            Track and manage claim denials with automated appeal workflows
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={() => fetchDenialCases()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cases</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{denialStats.totalCases}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Cases</CardTitle>
            <AlertTriangle className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{denialStats.newCases}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{denialStats.inProgress}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{denialStats.resolved}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${denialStats.totalAmount.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Days Open</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{denialStats.avgDaysOpen.toFixed(0)}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="cases" className="space-y-4">
        <TabsList>
          <TabsTrigger value="cases">Denial Cases</TabsTrigger>
          <TabsTrigger value="appeals">Appeal Tasks</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="cases" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-64">
                  <Label htmlFor="search">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Search by claim number, patient name, or reason..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="status-filter">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="under_review">Under Review</SelectItem>
                      <SelectItem value="appealing">Appealing</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="written_off">Written Off</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="priority-filter">Priority</Label>
                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Denial Cases Table */}
          <Card>
            <CardHeader>
              <CardTitle>Denial Cases ({filteredCases.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Claim #</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Denial Date</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Days Open</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCases.map((denialCase) => (
                    <TableRow key={denialCase.id}>
                      <TableCell className="font-medium">{denialCase.claimNumber}</TableCell>
                      <TableCell>{denialCase.patientName}</TableCell>
                      <TableCell>{denialCase.denialDate}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{denialCase.denialCode}</Badge>
                      </TableCell>
                      <TableCell className="capitalize">{denialCase.denialCategory}</TableCell>
                      <TableCell>${denialCase.denialAmount.toFixed(2)}</TableCell>
                      <TableCell>{getStatusBadge(denialCase.caseStatus)}</TableCell>
                      <TableCell>{getPriorityBadge(denialCase.priority)}</TableCell>
                      <TableCell>
                        <span className={denialCase.daysOpen > 30 ? 'text-red-600 font-medium' : ''}>
                          {denialCase.daysOpen}
                        </span>
                      </TableCell>
                      <TableCell>{denialCase.assignedTo}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedCase(denialCase)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedCase(denialCase);
                              setShowAppealDialog(true);
                            }}
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appeals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Appeal Tasks</CardTitle>
              <CardDescription>Track appeal submissions and deadlines</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Case ID</TableHead>
                    <TableHead>Appeal Level</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Days Until Due</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appealTasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell>{task.denialCaseId}</TableCell>
                      <TableCell className="capitalize">{task.appealLevel}</TableCell>
                      <TableCell className="capitalize">{task.appealType}</TableCell>
                      <TableCell>{task.dueDate}</TableCell>
                      <TableCell>
                        <Badge variant={task.appealStatus === 'submitted' ? 'default' : 'secondary'}>
                          {task.appealStatus.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>{task.assignedTo}</TableCell>
                      <TableCell>
                        <span className={task.daysUntilDue <= 7 ? 'text-red-600 font-medium' : ''}>
                          {task.daysUntilDue}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Denial Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {['authorization', 'coding', 'eligibility', 'documentation', 'timely_filing'].map(category => {
                    const count = denialCases.filter(c => c.denialCategory === category).length;
                    const percentage = (count / denialCases.length * 100).toFixed(1);
                    return (
                      <div key={category} className="flex items-center justify-between">
                        <span className="capitalize">{category.replace('_', ' ')}</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-muted-foreground">{count}</span>
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">{percentage}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resolution Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Average Resolution Time</span>
                    <span className="font-medium">15.2 days</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Appeal Success Rate</span>
                    <span className="font-medium text-green-600">68%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Recovery Amount</span>
                    <span className="font-medium">$12,450</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cases &gt; 30 Days</span>
                    <span className="font-medium text-red-600">3</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Appeal Creation Dialog */}
      <Dialog open={showAppealDialog} onOpenChange={setShowAppealDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Appeal Task</DialogTitle>
            <DialogDescription>
              Create a new appeal task for denial case {selectedCase?.claimNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Appeal Level</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="first">First Level</SelectItem>
                    <SelectItem value="second">Second Level</SelectItem>
                    <SelectItem value="third">Third Level</SelectItem>
                    <SelectItem value="external">External Review</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Appeal Type</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reconsideration">Reconsideration</SelectItem>
                    <SelectItem value="redetermination">Redetermination</SelectItem>
                    <SelectItem value="hearing">Hearing</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label>Due Date</Label>
              <Input type="date" />
            </div>
            
            <div>
              <Label>Assigned To</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sarah">Sarah Johnson</SelectItem>
                  <SelectItem value="mike">Mike Wilson</SelectItem>
                  <SelectItem value="lisa">Lisa Chen</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Notes</Label>
              <Textarea placeholder="Add any additional notes or instructions..." />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowAppealDialog(false)}>
                Cancel
              </Button>
              <Button onClick={() => setShowAppealDialog(false)}>
                Create Appeal Task
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DenialManagement;