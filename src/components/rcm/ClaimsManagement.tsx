import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  Search,
  Filter,
  Eye,
  Edit,
  CreditCard,
  FileText,
  Calendar,
  DollarSign,
  User,
  Building,
  RefreshCw,
  Download,
  CheckCircle,
  AlertTriangle,
  Clock,
  Send,
  Plus,
  Trash2,
  ExternalLink,
  Activity,
  Target,
  TrendingUp
} from 'lucide-react';

interface Claim {
  id: string;
  claimNumber: string;
  patientName: string;
  patientId: string;
  providerId: string;
  providerName: string;
  serviceDate: string;
  submissionDate: string;
  status: 'draft' | 'submitted' | 'accepted' | 'rejected' | 'paid' | 'denied' | 'appealed';
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  payerName: string;
  diagnosisCodes: string[];
  procedureCodes: string[];
  validationScore: number;
  lastUpdated: string;
  daysInProcess: number;
  priority: 'low' | 'medium' | 'high';
}

interface ClaimStats {
  totalClaims: number;
  submittedClaims: number;
  paidClaims: number;
  deniedClaims: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  averageProcessingTime: number;
  cleanClaimRate: number;
}

const ClaimsManagement: React.FC = () => {
  const { token } = useSelector((state: any) => state.auth);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [stats, setStats] = useState<ClaimStats>({
    totalClaims: 0,
    submittedClaims: 0,
    paidClaims: 0,
    deniedClaims: 0,
    totalAmount: 0,
    paidAmount: 0,
    pendingAmount: 0,
    averageProcessingTime: 0,
    cleanClaimRate: 0
  });
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPayer, setFilterPayer] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showClaimDetails, setShowClaimDetails] = useState(false);

  // Sample data
  useEffect(() => {
    const sampleClaims: Claim[] = [
      {
        id: '1',
        claimNumber: 'CLM-2024-001',
        patientName: 'John Smith',
        patientId: 'PAT001',
        providerId: 'PRV001',
        providerName: 'Dr. Sarah Johnson',
        serviceDate: '2024-01-15',
        submissionDate: '2024-01-16',
        status: 'submitted',
        totalAmount: 450.00,
        paidAmount: 0.00,
        balanceAmount: 450.00,
        payerName: 'Blue Cross Blue Shield',
        diagnosisCodes: ['Z00.00', 'I10'],
        procedureCodes: ['99213', '93000'],
        validationScore: 95,
        lastUpdated: '2024-01-16',
        daysInProcess: 5,
        priority: 'medium'
      },
      {
        id: '2',
        claimNumber: 'CLM-2024-002',
        patientName: 'Jane Doe',
        patientId: 'PAT002',
        providerId: 'PRV002',
        providerName: 'Dr. Mike Wilson',
        serviceDate: '2024-01-14',
        submissionDate: '2024-01-15',
        status: 'paid',
        totalAmount: 280.00,
        paidAmount: 224.00,
        balanceAmount: 56.00,
        payerName: 'Aetna',
        diagnosisCodes: ['M79.3'],
        procedureCodes: ['99214'],
        validationScore: 98,
        lastUpdated: '2024-01-18',
        daysInProcess: 0,
        priority: 'low'
      },
      {
        id: '3',
        claimNumber: 'CLM-2024-003',
        patientName: 'Bob Johnson',
        patientId: 'PAT003',
        providerId: 'PRV001',
        providerName: 'Dr. Sarah Johnson',
        serviceDate: '2024-01-12',
        submissionDate: '2024-01-13',
        status: 'denied',
        totalAmount: 650.00,
        paidAmount: 0.00,
        balanceAmount: 650.00,
        payerName: 'Medicare',
        diagnosisCodes: ['E11.9', 'I10'],
        procedureCodes: ['99215', '90834'],
        validationScore: 78,
        lastUpdated: '2024-01-17',
        daysInProcess: 8,
        priority: 'high'
      },
      {
        id: '4',
        claimNumber: 'CLM-2024-004',
        patientName: 'Alice Brown',
        patientId: 'PAT004',
        providerId: 'PRV003',
        providerName: 'Dr. Lisa Chen',
        serviceDate: '2024-01-18',
        submissionDate: '2024-01-19',
        status: 'accepted',
        totalAmount: 320.00,
        paidAmount: 0.00,
        balanceAmount: 320.00,
        payerName: 'Cigna',
        diagnosisCodes: ['R06.02'],
        procedureCodes: ['99203'],
        validationScore: 92,
        lastUpdated: '2024-01-19',
        daysInProcess: 2,
        priority: 'medium'
      }
    ];

    const sampleStats: ClaimStats = {
      totalClaims: 156,
      submittedClaims: 89,
      paidClaims: 45,
      deniedClaims: 12,
      totalAmount: 125680.50,
      paidAmount: 98450.25,
      pendingAmount: 27230.25,
      averageProcessingTime: 8.5,
      cleanClaimRate: 92.3
    };

    setClaims(sampleClaims);
    setStats(sampleStats);
  }, []);

  const filteredClaims = claims.filter(claim => {
    const matchesStatus = filterStatus === 'all' || claim.status === filterStatus;
    const matchesPayer = filterPayer === 'all' || claim.payerName.toLowerCase().includes(filterPayer.toLowerCase());
    const matchesSearch = searchTerm === '' || 
      claim.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.claimNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.payerName.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesPayer && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'paid': return 'bg-emerald-100 text-emerald-800';
      case 'denied': return 'bg-red-100 text-red-800';
      case 'appealed': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <Edit className="w-4 h-4" />;
      case 'submitted': return <Send className="w-4 h-4" />;
      case 'accepted': return <CheckCircle className="w-4 h-4" />;
      case 'rejected': return <AlertTriangle className="w-4 h-4" />;
      case 'paid': return <DollarSign className="w-4 h-4" />;
      case 'denied': return <AlertTriangle className="w-4 h-4" />;
      case 'appealed': return <RefreshCw className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const handleViewClaim = (claim: Claim) => {
    setSelectedClaim(claim);
    setShowClaimDetails(true);
  };

  const handleSubmitClaim = async (claimId: string) => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setClaims(prev => prev.map(claim => 
        claim.id === claimId 
          ? { ...claim, status: 'submitted', submissionDate: new Date().toISOString().split('T')[0] }
          : claim
      ));
      
      toast.success('Claim submitted successfully');
    } catch (error) {
      toast.error('Failed to submit claim');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkSubmit = async () => {
    const draftClaims = filteredClaims.filter(claim => claim.status === 'draft');
    
    if (draftClaims.length === 0) {
      toast.info('No draft claims to submit');
      return;
    }

    setIsLoading(true);
    try {
      // Simulate bulk submission
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      setClaims(prev => prev.map(claim => 
        claim.status === 'draft' 
          ? { ...claim, status: 'submitted', submissionDate: new Date().toISOString().split('T')[0] }
          : claim
      ));
      
      toast.success(`${draftClaims.length} claims submitted successfully`);
    } catch (error) {
      toast.error('Failed to submit claims');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Claims Management</h2>
          <p className="text-gray-600">Manage and track insurance claims throughout their lifecycle</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={handleBulkSubmit}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Bulk Submit
          </Button>
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Claim
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Claims</p>
                <p className="text-2xl font-bold text-blue-600">{stats.totalClaims}</p>
                <p className="text-xs text-gray-500">This month</p>
              </div>
              <FileText className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Amount</p>
                <p className="text-2xl font-bold text-green-600">
                  ${stats.totalAmount.toLocaleString()}
                </p>
                <p className="text-xs text-green-600">+12.5% vs last month</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Clean Claim Rate</p>
                <p className="text-2xl font-bold text-purple-600">{stats.cleanClaimRate}%</p>
                <p className="text-xs text-purple-600">Industry: 85%</p>
              </div>
              <Target className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Processing</p>
                <p className="text-2xl font-bold text-orange-600">{stats.averageProcessingTime} days</p>
                <p className="text-xs text-orange-600">Target: 7 days</p>
              </div>
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="claims" className="space-y-4">
        <TabsList>
          <TabsTrigger value="claims">All Claims</TabsTrigger>
          <TabsTrigger value="pending">Pending Review</TabsTrigger>
          <TabsTrigger value="denied">Denied Claims</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="claims" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search by patient, claim number, or payer..."
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
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="denied">Denied</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterPayer} onValueChange={setFilterPayer}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Payer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Payers</SelectItem>
                    <SelectItem value="blue cross">Blue Cross</SelectItem>
                    <SelectItem value="aetna">Aetna</SelectItem>
                    <SelectItem value="medicare">Medicare</SelectItem>
                    <SelectItem value="cigna">Cigna</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Claims Table */}
          <Card>
            <CardHeader>
              <CardTitle>Claims ({filteredClaims.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Claim #</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Service Date</TableHead>
                      <TableHead>Payer</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Days</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClaims.map((claim) => (
                      <TableRow key={claim.id}>
                        <TableCell className="font-medium">{claim.claimNumber}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{claim.patientName}</p>
                            <p className="text-sm text-gray-500">{claim.patientId}</p>
                          </div>
                        </TableCell>
                        <TableCell>{claim.providerName}</TableCell>
                        <TableCell>{claim.serviceDate}</TableCell>
                        <TableCell>{claim.payerName}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">${claim.totalAmount.toFixed(2)}</p>
                            {claim.paidAmount > 0 && (
                              <p className="text-sm text-green-600">
                                Paid: ${claim.paidAmount.toFixed(2)}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(claim.status)}>
                            {getStatusIcon(claim.status)}
                            <span className="ml-1 capitalize">{claim.status}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getPriorityColor(claim.priority)}>
                            {claim.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className={claim.daysInProcess > 14 ? 'text-red-600 font-bold' : ''}>
                            {claim.daysInProcess}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewClaim(claim)}
                            >
                              <Eye className="w-3 h-3" />
                            </Button>
                            {claim.status === 'draft' && (
                              <Button
                                size="sm"
                                onClick={() => handleSubmitClaim(claim.id)}
                                disabled={isLoading}
                              >
                                <Send className="w-3 h-3" />
                              </Button>
                            )}
                            <Button size="sm" variant="outline">
                              <Edit className="w-3 h-3" />
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

        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Claims Pending Review</CardTitle>
              <CardDescription>
                Claims that require manual review before submission
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredClaims.filter(claim => claim.validationScore < 90).map((claim) => (
                  <div key={claim.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium">{claim.claimNumber}</h4>
                        <p className="text-sm text-gray-600">{claim.patientName} - {claim.payerName}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">${claim.totalAmount.toFixed(2)}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">Validation Score:</span>
                          <Badge variant={claim.validationScore >= 85 ? "default" : "destructive"}>
                            {claim.validationScore}%
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <Progress value={claim.validationScore} className="mb-3" />
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        Issues: Missing documentation, Code validation needed
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline">
                          Review
                        </Button>
                        <Button size="sm">
                          Approve
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="denied" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Denied Claims</CardTitle>
              <CardDescription>
                Claims that have been denied and require action
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredClaims.filter(claim => claim.status === 'denied').map((claim) => (
                  <div key={claim.id} className="border border-red-200 rounded-lg p-4 bg-red-50">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-red-900">{claim.claimNumber}</h4>
                        <p className="text-sm text-red-700">{claim.patientName} - {claim.payerName}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-red-900">${claim.totalAmount.toFixed(2)}</p>
                        <p className="text-sm text-red-600">{claim.daysInProcess} days since denial</p>
                      </div>
                    </div>
                    <Alert className="mb-3">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Denial Reason: Medical necessity not established. Prior authorization required.
                      </AlertDescription>
                    </Alert>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-red-700">
                        Action Required: Submit additional documentation
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline">
                          Appeal
                        </Button>
                        <Button size="sm">
                          Resubmit
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Claim Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { status: 'Submitted', count: 89, percentage: 57, color: 'bg-blue-500' },
                    { status: 'Paid', count: 45, percentage: 29, color: 'bg-green-500' },
                    { status: 'Denied', count: 12, percentage: 8, color: 'bg-red-500' },
                    { status: 'Draft', count: 10, percentage: 6, color: 'bg-gray-500' }
                  ].map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                        <span className="text-sm font-medium">{item.status}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-600">{item.count} claims</span>
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${item.color}`}
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-8">{item.percentage}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600">First Pass Rate</p>
                      <p className="text-lg font-bold text-blue-600">92.3%</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-blue-500" />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600">Collection Rate</p>
                      <p className="text-lg font-bold text-green-600">96.8%</p>
                    </div>
                    <Target className="w-8 h-8 text-green-500" />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600">Avg Days to Payment</p>
                      <p className="text-lg font-bold text-orange-600">18.5 days</p>
                    </div>
                    <Clock className="w-8 h-8 text-orange-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Claim Details Dialog */}
      <Dialog open={showClaimDetails} onOpenChange={setShowClaimDetails}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Claim Details</DialogTitle>
            <DialogDescription>
              {selectedClaim && `${selectedClaim.claimNumber} - ${selectedClaim.patientName}`}
            </DialogDescription>
          </DialogHeader>
          {selectedClaim && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Patient Information</h4>
                  <div className="space-y-1 text-sm">
                    <p><strong>Name:</strong> {selectedClaim.patientName}</p>
                    <p><strong>ID:</strong> {selectedClaim.patientId}</p>
                    <p><strong>Service Date:</strong> {selectedClaim.serviceDate}</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Provider Information</h4>
                  <div className="space-y-1 text-sm">
                    <p><strong>Provider:</strong> {selectedClaim.providerName}</p>
                    <p><strong>ID:</strong> {selectedClaim.providerId}</p>
                    <p><strong>Payer:</strong> {selectedClaim.payerName}</p>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Diagnosis Codes</h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedClaim.diagnosisCodes.map((code, index) => (
                      <Badge key={index} variant="outline">{code}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Procedure Codes</h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedClaim.procedureCodes.map((code, index) => (
                      <Badge key={index} variant="outline">{code}</Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600">Total Amount</p>
                  <p className="text-lg font-bold text-blue-600">
                    ${selectedClaim.totalAmount.toFixed(2)}
                  </p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600">Paid Amount</p>
                  <p className="text-lg font-bold text-green-600">
                    ${selectedClaim.paidAmount.toFixed(2)}
                  </p>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <p className="text-sm text-gray-600">Balance</p>
                  <p className="text-lg font-bold text-orange-600">
                    ${selectedClaim.balanceAmount.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowClaimDetails(false)}>
                  Close
                </Button>
                <Button>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Full Details
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClaimsManagement;
  XCircle,
  Clock,
  AlertTriangle,
  Plus,
  History
} from 'lucide-react';
import { 
  getClaimsStatusAPI, 
  getClaimDetailsAPI, 
  updateClaimStatusAPI,
  createClaimAPI,
  updateClaimAPI
} from '@/services/operations/rcm';
import PaymentForm from '@/components/payments/PaymentForm';
import ClaimForm from './ClaimForm';
import ClaimHistory from './ClaimHistory';
import { formatCurrency, formatDate } from '@/utils/rcmFormatters';

interface Claim {
  claim_id: number;
  patient_id: number;
  patient_name: string;
  service_date: string;
  submission_date: string;
  status: number;
  status_text: string;
  procedure_code: string;
  total_amount: number;
  paid_amount: number;
  claim_md_tracking_id: string;
  payer_name: string;
  processing_days: number;
  priority: string;
}

const ClaimsManagement: React.FC = () => {
  const { token } = useSelector((state: any) => state.auth);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClaim, setSelectedClaim] = useState<any>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [editingClaim, setEditingClaim] = useState<any>(null);
  const [claimFormLoading, setClaimFormLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyClaimId, setHistoryClaimId] = useState<number | null>(null);
  const [filters, setFilters] = useState({
    status: 'all',
    search: '',
    priority: 'all',
    page: 1,
    limit: 10
  });
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0
  });

  const fetchClaims = async () => {
    try {
      setLoading(true);
      const response = await getClaimsStatusAPI(token, filters);
      if (response.success) {
        setClaims(response.data);
        setPagination(response.pagination);
      }
    } catch (error) {
      console.error('Error fetching claims:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClaimDetails = async (claimId: number) => {
    try {
      const response = await getClaimDetailsAPI(token, claimId);
      if (response.success) {
        setSelectedClaim(response.data);
      }
    } catch (error) {
      console.error('Error fetching claim details:', error);
    }
  };

  const handleStatusUpdate = async (claimId: number, newStatus: number) => {
    try {
      const response = await updateClaimStatusAPI(token, claimId, { status: newStatus });
      if (response.success) {
        fetchClaims(); // Refresh the list
      }
    } catch (error) {
      console.error('Error updating claim status:', error);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, [filters]);

  const getStatusBadge = (status: number, statusText: string) => {
    const statusConfig = {
      0: { color: 'bg-gray-500', text: 'Draft' },
      1: { color: 'bg-yellow-500', text: 'Submitted' },
      2: { color: 'bg-green-500', text: 'Paid' },
      3: { color: 'bg-red-500', text: 'Denied' },
      4: { color: 'bg-blue-500', text: 'Appealed' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || { color: 'bg-gray-500', text: statusText };
    
    return (
      <Badge className={`${config.color} text-white`}>
        {config.text}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string, days: number) => {
    if (days > 30) {
      return <Badge className="bg-red-500 text-white">Urgent</Badge>;
    } else if (days > 14) {
      return <Badge className="bg-yellow-500 text-white">Normal</Badge>;
    }
    return <Badge className="bg-green-500 text-white">Recent</Badge>;
  };

  const handlePaymentSuccess = (paymentData: any) => {
    setShowPaymentForm(false);
    setSelectedClaim(null);
    fetchClaims(); // Refresh claims list
    // Show success message
  };

  // Handle create new claim
  const handleCreateClaim = () => {
    setEditingClaim(null);
    setShowClaimForm(true);
  };

  // Handle edit claim
  const handleEditClaim = (claim: Claim) => {
    setEditingClaim(claim);
    setShowClaimForm(true);
  };

  // Handle claim form submit
  const handleClaimFormSubmit = async (claimData: any) => {
    try {
      setClaimFormLoading(true);
      
      let response;
      if (editingClaim) {
        // Update existing claim
        response = await updateClaimAPI(token, editingClaim.claim_id, claimData);
      } else {
        // Create new claim
        response = await createClaimAPI(token, claimData);
      }

      if (response) {
        setShowClaimForm(false);
        setEditingClaim(null);
        fetchClaims(); // Refresh claims list
      } else {
        throw new Error('Failed to save claim');
      }
    } catch (error) {
      console.error('Error saving claim:', error);
      throw error; // Re-throw to let ClaimForm handle the error display
    } finally {
      setClaimFormLoading(false);
    }
  };

  // Handle claim form cancel
  const handleClaimFormCancel = () => {
    setShowClaimForm(false);
    setEditingClaim(null);
  };

  // Handle view history
  const handleViewHistory = (claimId: number) => {
    setHistoryClaimId(claimId);
    setShowHistory(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Claims Management</h2>
          <p className="text-muted-foreground">
            Track and manage insurance claims and patient payments
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={handleCreateClaim}>
            <Plus className="h-4 w-4 mr-2" />
            New Claim
          </Button>
          <Button variant="outline" size="sm" onClick={fetchClaims}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by patient name, claim ID, or tracking ID..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
                  className="pl-10"
                />
              </div>
            </div>
            <Select
              value={filters.status}
              onValueChange={(value) => setFilters({ ...filters, status: value, page: 1 })}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="0">Draft</SelectItem>
                <SelectItem value="1">Submitted</SelectItem>
                <SelectItem value="2">Paid</SelectItem>
                <SelectItem value="3">Denied</SelectItem>
                <SelectItem value="4">Appealed</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.priority}
              onValueChange={(value) => setFilters({ ...filters, priority: value, page: 1 })}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="recent">Recent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Claims Table */}
      <Card>
        <CardHeader>
          <CardTitle>Claims List</CardTitle>
          <CardDescription>
            {pagination.total} total claims found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading claims...</span>
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Service Date</TableHead>
                    <TableHead>Procedure</TableHead>
                    <TableHead>Payer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {claims.map((claim) => (
                    <TableRow key={claim.claim_id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{claim.patient_name}</div>
                          <div className="text-sm text-muted-foreground">
                            ID: {claim.patient_id}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                          {formatDate(claim.service_date)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{claim.procedure_code}</div>
                          <div className="text-sm text-muted-foreground">
                            {claim.processing_days} days
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Building className="h-4 w-4 mr-2 text-gray-400" />
                          {claim.payer_name || 'Self Pay'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{formatCurrency(claim.total_amount)}</div>
                          {claim.paid_amount > 0 && (
                            <div className="text-sm text-green-600">
                              Paid: {formatCurrency(claim.paid_amount)}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(claim.status, claim.status_text)}
                      </TableCell>
                      <TableCell>
                        {getPriorityBadge(claim.priority, claim.processing_days)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => fetchClaimDetails(claim.claim_id)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl">
                              <DialogHeader>
                                <DialogTitle>Claim Details</DialogTitle>
                                <DialogDescription>
                                  Detailed information for claim #{claim.claim_id}
                                </DialogDescription>
                              </DialogHeader>
                              {selectedClaim && (
                                <ClaimDetailsView 
                                  claim={selectedClaim} 
                                  onStatusUpdate={handleStatusUpdate}
                                  onPaymentRequest={() => {
                                    setShowPaymentForm(true);
                                  }}
                                />
                              )}
                            </DialogContent>
                          </Dialog>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditClaim(claim)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewHistory(claim.claim_id)}
                          >
                            <History className="h-4 w-4" />
                          </Button>
                          
                          {(claim.status === 1 || claim.status === 3) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedClaim(claim);
                                setShowPaymentForm(true);
                              }}
                            >
                              <CreditCard className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Showing {((filters.page - 1) * filters.limit) + 1} to {Math.min(filters.page * filters.limit, pagination.total)} of {pagination.total} claims
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Form Dialog */}
      <Dialog open={showPaymentForm} onOpenChange={setShowPaymentForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Payment</DialogTitle>
            <DialogDescription>
              Process payment for {selectedClaim?.patient_name}
            </DialogDescription>
          </DialogHeader>
          {selectedClaim && (
            <PaymentForm
              patientId={selectedClaim.patient_id}
              billingId={selectedClaim.claim_id}
              amount={selectedClaim.total_amount - (selectedClaim.paid_amount || 0)}
              description={`Payment for ${selectedClaim.procedure_code} - ${selectedClaim.patient_name}`}
              onSuccess={handlePaymentSuccess}
              onCancel={() => setShowPaymentForm(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Claim Form Dialog */}
      <Dialog open={showClaimForm} onOpenChange={setShowClaimForm}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingClaim ? 'Edit Claim' : 'Create New Claim'}
            </DialogTitle>
            <DialogDescription>
              {editingClaim 
                ? `Editing claim #${editingClaim.claim_id}` 
                : 'Enter claim information to create a new claim'
              }
            </DialogDescription>
          </DialogHeader>
          <ClaimForm
            claim={editingClaim}
            onSubmit={handleClaimFormSubmit}
            onCancel={handleClaimFormCancel}
            loading={claimFormLoading}
          />
        </DialogContent>
      </Dialog>

      {/* Claim History Dialog */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Claim History
            </DialogTitle>
            <DialogDescription>
              Complete audit trail for claim #{historyClaimId}
            </DialogDescription>
          </DialogHeader>
          {historyClaimId && (
            <ClaimHistory
              claimId={historyClaimId}
              onClose={() => setShowHistory(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};// ClaiPaymentGatewaySettingsm Details View Component
interface ClaimDetailsViewProps {
  claim: any;
  onStatusUpdate: (claimId: number, status: number) => void;
  onPaymentRequest: () => void;
}

const ClaimDetailsView: React.FC<ClaimDetailsViewProps> = ({ 
  claim, 
  onStatusUpdate, 
  onPaymentRequest 
}) => {
  const [newStatus, setNewStatus] = useState(claim.claim.status);

  return (
    <div className="space-y-6">
      {/* Claim Summary */}
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Claim Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Claim ID:</span>
              <span className="font-medium">{claim.claim.claim_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tracking ID:</span>
              <span className="font-medium">{claim.claim.claim_md_tracking_id || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Service Date:</span>
              <span className="font-medium">{formatDate(claim.claim.service_date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Submission Date:</span>
              <span className="font-medium">{formatDate(claim.claim.submission_date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Processing Days:</span>
              <span className="font-medium">{claim.claim.processing_days} days</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Patient Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name:</span>
              <span className="font-medium">{claim.claim.patient_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Patient ID:</span>
              <span className="font-medium">{claim.claim.patient_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">DOB:</span>
              <span className="font-medium">{claim.claim.dob ? formatDate(claim.claim.dob) : 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Phone:</span>
              <span className="font-medium">{claim.claim.phone || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email:</span>
              <span className="font-medium">{claim.claim.email || 'N/A'}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Financial Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(claim.claim.total_amount)}
              </div>
              <div className="text-sm text-muted-foreground">Total Amount</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(claim.claim.paid_amount || 0)}
              </div>
              <div className="text-sm text-muted-foreground">Paid Amount</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(claim.claim.total_amount - (claim.claim.paid_amount || 0))}
              </div>
              <div className="text-sm text-muted-foreground">Outstanding</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Procedure and Insurance */}
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Procedure Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">CPT Code:</span>
              <span className="font-medium">{claim.claim.procedure_code}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Description:</span>
              <span className="font-medium">{claim.claim.procedure_description}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Units:</span>
              <span className="font-medium">{claim.claim.code_units}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Unit Price:</span>
              <span className="font-medium">{formatCurrency(claim.claim.unit_price)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Insurance Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payer:</span>
              <span className="font-medium">{claim.claim.payer_name || 'Self Pay'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Policy Number:</span>
              <span className="font-medium">{claim.claim.policy_number || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Group Number:</span>
              <span className="font-medium">{claim.claim.group_number || 'N/A'}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Diagnoses */}
      {claim.diagnoses && claim.diagnoses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Diagnoses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {claim.diagnoses.map((diagnosis: any, index: number) => (
                <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="font-medium">{diagnosis.diagnosis_code}</span>
                  <span className="text-sm text-muted-foreground">{diagnosis.diagnosis_description}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Claim History */}
      {claim.history && claim.history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Claim History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {claim.history.map((entry: any, index: number) => (
                <div key={index} className="flex items-start space-x-3 p-3 border rounded">
                  <div className="flex-shrink-0">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{entry.action}</div>
                        <div className="text-sm text-muted-foreground">{entry.notes}</div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(entry.date)} - {entry.user}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-between items-center pt-4 border-t">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">Update Status:</span>
            <Select value={newStatus.toString()} onValueChange={(value) => setNewStatus(parseInt(value))}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Draft</SelectItem>
                <SelectItem value="1">Submitted</SelectItem>
                <SelectItem value="2">Paid</SelectItem>
                <SelectItem value="3">Denied</SelectItem>
                <SelectItem value="4">Appealed</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={() => onStatusUpdate(claim.claim.claim_id, newStatus)}
              disabled={newStatus === claim.claim.status}
            >
              Update
            </Button>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {claim.claim.total_amount > (claim.claim.paid_amount || 0) && (
            <Button onClick={onPaymentRequest}>
              <CreditCard className="h-4 w-4 mr-2" />
              Process Payment
            </Button>
          )}
        </div>
      </div>

      {/* Recommendations */}
      {claim.recommendations && claim.recommendations.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <div className="font-medium">Recommendations:</div>
              {claim.recommendations.map((rec: string, index: number) => (
                <div key={index} className="text-sm">• {rec}</div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default ClaimsManagement;