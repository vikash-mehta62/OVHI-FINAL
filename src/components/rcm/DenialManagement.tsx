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

interface DenialStats {
  totalDenials: number;
  totalAmount: number;
  averageResolutionTime: number;
  resolutionRate: number;
  topDenialReasons: Array<{ reason: string; count: number; percentage: number }>;
}

const DenialManagement: React.FC = () => {
  const [denials, setDenials] = useState<DenialCase[]>([]);
  const [stats, setStats] = useState<DenialStats>({
    totalDenials: 0,
    totalAmount: 0,
    averageResolutionTime: 0,
    resolutionRate: 0,
    topDenialReasons: []
  });
  const [selectedDenial, setSelectedDenial] = useState<DenialCase | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isWorkingCase, setIsWorkingCase] = useState(false);

  // Sample data
  useEffect(() => {
    const sampleDenials: DenialCase[] = [
      {
        id: 1,
        claimId: 12345,
        claimNumber: 'CLM-2024-001',
        patientName: 'John Smith',
        denialDate: '2024-01-15',
        denialCode: 'CO-97',
        denialReason: 'Payment adjusted because the benefit for this service is included in the payment/allowance for another service/procedure',
        carcCode: 'CO-97',
        rarcCode: 'N386',
        denialCategory: 'Bundling/Unbundling',
        rootCause: 'Incorrect coding',
        denialAmount: 250.00,
        caseStatus: 'Open',
        priority: 'High',
        assignedTo: 'Sarah Johnson',
        daysOpen: 15
      },
      {
        id: 2,
        claimId: 12346,
        claimNumber: 'CLM-2024-002',
        patientName: 'Jane Doe',
        denialDate: '2024-01-16',
        denialCode: 'CO-16',
        denialReason: 'Claim/service lacks information or has submission/billing error(s)',
        carcCode: 'CO-16',
        rarcCode: 'M15',
        denialCategory: 'Missing Information',
        rootCause: 'Missing documentation',
        denialAmount: 180.00,
        caseStatus: 'In Progress',
        priority: 'Medium',
        assignedTo: 'Mike Wilson',
        daysOpen: 8
      },
      {
        id: 3,
        claimId: 12347,
        claimNumber: 'CLM-2024-003',
        patientName: 'Bob Johnson',
        denialDate: '2024-01-10',
        denialCode: 'CO-50',
        denialReason: 'These are non-covered services because this is not deemed a medical necessity',
        carcCode: 'CO-50',
        rarcCode: 'N386',
        denialCategory: 'Medical Necessity',
        rootCause: 'Lack of prior authorization',
        denialAmount: 450.00,
        caseStatus: 'Appealed',
        priority: 'High',
        assignedTo: 'Lisa Chen',
        daysOpen: 25
      },
      {
        id: 4,
        claimId: 12348,
        claimNumber: 'CLM-2024-004',
        patientName: 'Alice Brown',
        denialDate: '2024-01-18',
        denialCode: 'CO-11',
        denialReason: 'The diagnosis is inconsistent with the procedure',
        carcCode: 'CO-11',
        rarcCode: 'N517',
        denialCategory: 'Coding Error',
        rootCause: 'Incorrect diagnosis code',
        denialAmount: 320.00,
        caseStatus: 'Resolved',
        priority: 'Low',
        assignedTo: 'Tom Davis',
        daysOpen: 0
      }
    ];

    const sampleStats: DenialStats = {
      totalDenials: 156,
      totalAmount: 45680.50,
      averageResolutionTime: 12.5,
      resolutionRate: 78.5,
      topDenialReasons: [
        { reason: 'Missing Information', count: 45, percentage: 28.8 },
        { reason: 'Coding Error', count: 38, percentage: 24.4 },
        { reason: 'Medical Necessity', count: 32, percentage: 20.5 },
        { reason: 'Bundling/Unbundling', count: 25, percentage: 16.0 },
        { reason: 'Authorization', count: 16, percentage: 10.3 }
      ]
    };

    setDenials(sampleDenials);
    setStats(sampleStats);
  }, []);

  const filteredDenials = denials.filter(denial => {
    const matchesStatus = filterStatus === 'all' || denial.caseStatus.toLowerCase() === filterStatus.toLowerCase();
    const matchesPriority = filterPriority === 'all' || denial.priority.toLowerCase() === filterPriority.toLowerCase();
    const matchesSearch = searchTerm === '' || 
      denial.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      denial.claimNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      denial.denialReason.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesPriority && matchesSearch;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open': return 'bg-red-100 text-red-800';
      case 'in progress': return 'bg-blue-100 text-blue-800';
      case 'appealed': return 'bg-purple-100 text-purple-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleWorkCase = (denial: DenialCase) => {
    setSelectedDenial(denial);
    setIsWorkingCase(true);
  };

  const handleResolveCase = (denialId: number) => {
    setDenials(prev => prev.map(denial => 
      denial.id === denialId 
        ? { ...denial, caseStatus: 'Resolved', daysOpen: 0 }
        : denial
    ));
    setIsWorkingCase(false);
    setSelectedDenial(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Denial Management</h2>
          <p className="text-gray-600">Track, analyze, and resolve claim denials</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export Report
          </Button>
          <Button className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Manual Denial
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Denials</p>
                <p className="text-2xl font-bold text-red-600">{stats.totalDenials}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Denied Amount</p>
                <p className="text-2xl font-bold text-red-600">
                  ${stats.totalAmount.toLocaleString()}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Resolution</p>
                <p className="text-2xl font-bold text-blue-600">
                  {stats.averageResolutionTime} days
                </p>
              </div>
              <Clock className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Resolution Rate</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.resolutionRate}%
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="denials" className="space-y-4">
        <TabsList>
          <TabsTrigger value="denials">Active Denials</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="workflow">Workflow</TabsTrigger>
        </TabsList>

        <TabsContent value="denials" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search by patient, claim number, or reason..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in progress">In Progress</SelectItem>
                    <SelectItem value="appealed">Appealed</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterPriority} onValueChange={setFilterPriority}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Denials Table */}
          <Card>
            <CardHeader>
              <CardTitle>Denial Cases ({filteredDenials.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Claim #</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Denial Date</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Days Open</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDenials.map((denial) => (
                      <TableRow key={denial.id}>
                        <TableCell className="font-medium">{denial.claimNumber}</TableCell>
                        <TableCell>{denial.patientName}</TableCell>
                        <TableCell>{denial.denialDate}</TableCell>
                        <TableCell className="max-w-xs truncate" title={denial.denialReason}>
                          {denial.denialReason}
                        </TableCell>
                        <TableCell>${denial.denialAmount.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(denial.caseStatus)}>
                            {denial.caseStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getPriorityColor(denial.priority)}>
                            {denial.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className={denial.daysOpen > 30 ? 'text-red-600 font-bold' : ''}>
                            {denial.daysOpen}
                          </span>
                        </TableCell>
                        <TableCell>{denial.assignedTo}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleWorkCase(denial)}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="outline">
                              <Eye className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Denial Reasons */}
            <Card>
              <CardHeader>
                <CardTitle>Top Denial Reasons</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.topDenialReasons.map((reason, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{reason.reason}</span>
                          <span className="text-sm text-gray-600">{reason.count} cases</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${reason.percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Resolution Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Resolution Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600">This Month</p>
                      <p className="text-lg font-bold text-green-600">85% Resolved</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600">Avg Resolution Time</p>
                      <p className="text-lg font-bold text-blue-600">8.5 Days</p>
                    </div>
                    <Clock className="w-8 h-8 text-blue-500" />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600">Pending Appeals</p>
                      <p className="text-lg font-bold text-yellow-600">12 Cases</p>
                    </div>
                    <RefreshCw className="w-8 h-8 text-yellow-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="workflow" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Denial Workflow Management</CardTitle>
              <CardDescription>
                Configure automated workflows and escalation rules
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium">Auto-Assignment Rules</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <span className="text-sm">High Priority → Senior Staff</span>
                        <Badge variant="secondary">Active</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <span className="text-sm">Coding Errors → Coding Team</span>
                        <Badge variant="secondary">Active</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <span className="text-sm">Auth Issues → Auth Specialist</span>
                        <Badge variant="secondary">Active</Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="font-medium">Escalation Rules</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <span className="text-sm">Open > 30 days → Manager</span>
                        <Badge variant="secondary">Active</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <span className="text-sm">High Value > $500 → Director</span>
                        <Badge variant="secondary">Active</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <span className="text-sm">Multiple Appeals → Legal</span>
                        <Badge variant="secondary">Active</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Work Case Dialog */}
      <Dialog open={isWorkingCase} onOpenChange={setIsWorkingCase}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Work Denial Case</DialogTitle>
            <DialogDescription>
              {selectedDenial && `Claim ${selectedDenial.claimNumber} - ${selectedDenial.patientName}`}
            </DialogDescription>
          </DialogHeader>
          {selectedDenial && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Denial Code</Label>
                  <Input value={selectedDenial.denialCode} readOnly />
                </div>
                <div>
                  <Label>Category</Label>
                  <Input value={selectedDenial.denialCategory} readOnly />
                </div>
              </div>
              <div>
                <Label>Denial Reason</Label>
                <Textarea value={selectedDenial.denialReason} readOnly rows={3} />
              </div>
              <div>
                <Label>Resolution Notes</Label>
                <Textarea placeholder="Enter resolution notes..." rows={4} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Action Taken</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="corrected">Corrected and Resubmitted</SelectItem>
                      <SelectItem value="appealed">Filed Appeal</SelectItem>
                      <SelectItem value="documented">Added Documentation</SelectItem>
                      <SelectItem value="writeoff">Write-off</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Follow-up Date</Label>
                  <Input type="date" />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsWorkingCase(false)}>
                  Cancel
                </Button>
                <Button onClick={() => handleResolveCase(selectedDenial.id)}>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Resolve Case
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DenialManagement;

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