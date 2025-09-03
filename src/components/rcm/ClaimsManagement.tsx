import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  TrendingUp,
  RotateCcw,
  MessageSquare,
  UserX,
  X,
  MoreHorizontal,
  ArrowRight
} from 'lucide-react';
import { 
  correctAndResubmitClaimAPI,
  fileAppealAPI,
  transferToPatientAPI,
  addClaimCommentAPI,
  voidClaimAPI,
  getDetailedClaimAPI
} from '@/services/operations/rcm';

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

interface ClaimComment {
  id: string;
  userId: string;
  userName: string;
  comment: string;
  commentType: 'general' | 'correction' | 'appeal' | 'transfer' | 'void';
  createdAt: string;
  userRole: string;
}

interface ClaimHistoryEvent {
  id: string;
  action: string;
  description: string;
  performedBy: string;
  performedByRole: string;
  timestamp: string;
  oldStatus?: string;
  newStatus?: string;
  details?: any;
}

interface ClaimAppeal {
  id: string;
  appealReason: string;
  appealDate: string;
  status: 'pending' | 'approved' | 'denied' | 'withdrawn';
  appealAmount: number;
  decisionDate?: string;
  decisionReason?: string;
  createdBy: string;
}

interface ClaimPayment {
  id: string;
  paymentAmount: number;
  paymentDate: string;
  paymentMethod: string;
  checkNumber?: string;
  adjustmentAmount?: number;
  adjustmentReason?: string;
  postedBy: string;
}

interface DetailedClaim extends Claim {
  comments: ClaimComment[];
  history: ClaimHistoryEvent[];
  appeals: ClaimAppeal[];
  payments: ClaimPayment[];
  attachments: any[];
  patientInfo: {
    dateOfBirth: string;
    address: string;
    phone: string;
    insuranceInfo: {
      primary: string;
      secondary?: string;
      memberId: string;
      groupNumber: string;
    };
  };
  providerInfo: {
    npi: string;
    taxId: string;
    address: string;
    phone: string;
  };
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
  const { token } = useSelector((state: RootState) => state.auth);
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
  const [detailedClaim, setDetailedClaim] = useState<DetailedClaim | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPayer, setFilterPayer] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showClaimDetails, setShowClaimDetails] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showCorrectDialog, setShowCorrectDialog] = useState(false);
  const [showAppealDialog, setShowAppealDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showCommentDialog, setShowCommentDialog] = useState(false);
  const [showVoidDialog, setShowVoidDialog] = useState(false);
  const [actionClaim, setActionClaim] = useState<Claim | null>(null);
  const [correctionReason, setCorrectionReason] = useState('');
  const [appealReason, setAppealReason] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [comment, setComment] = useState('');
  const [voidReason, setVoidReason] = useState('');

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

  const handleViewClaim = async (claim: Claim) => {
    setSelectedClaim(claim);
    setShowClaimDetails(true);
    setLoadingDetails(true);
    
    try {
      // Fetch detailed claim data from API
      const result = await getDetailedClaimAPI(token, claim.id);
      
      if (result?.success) {
        setDetailedClaim(result.data);
      } else {
        // Fallback to mock data if API fails
        const mockDetailedClaim: DetailedClaim = {
        ...claim,
        comments: [
          {
            id: '1',
            userId: '1',
            userName: 'Dr. Sarah Johnson',
            comment: 'Initial claim review completed. All documentation appears complete.',
            commentType: 'general',
            createdAt: '2024-01-16T10:30:00Z',
            userRole: 'Provider'
          },
          {
            id: '2',
            userId: '2',
            userName: 'Jane Smith',
            comment: 'Verified patient eligibility and benefits. Coverage confirmed.',
            commentType: 'general',
            createdAt: '2024-01-16T11:15:00Z',
            userRole: 'Billing Specialist'
          },
          {
            id: '3',
            userId: '3',
            userName: 'Mike Wilson',
            comment: 'Claim submitted to payer electronically. Confirmation received.',
            commentType: 'general',
            createdAt: '2024-01-16T14:20:00Z',
            userRole: 'Claims Manager'
          }
        ],
        history: [
          {
            id: '1',
            action: 'created',
            description: 'Claim created from encounter',
            performedBy: 'Dr. Sarah Johnson',
            performedByRole: 'Provider',
            timestamp: '2024-01-15T16:45:00Z'
          },
          {
            id: '2',
            action: 'validated',
            description: 'Claim validation completed with score 95%',
            performedBy: 'System',
            performedByRole: 'Automated',
            timestamp: '2024-01-15T16:46:00Z'
          },
          {
            id: '3',
            action: 'reviewed',
            description: 'Manual review completed by billing team',
            performedBy: 'Jane Smith',
            performedByRole: 'Billing Specialist',
            timestamp: '2024-01-16T09:30:00Z'
          },
          {
            id: '4',
            action: 'submitted',
            description: 'Claim submitted to Blue Cross Blue Shield',
            performedBy: 'Mike Wilson',
            performedByRole: 'Claims Manager',
            timestamp: '2024-01-16T14:20:00Z',
            oldStatus: 'draft',
            newStatus: 'submitted'
          }
        ],
        appeals: claim.status === 'appealed' ? [
          {
            id: '1',
            appealReason: 'Medical necessity clearly documented in patient records',
            appealDate: '2024-01-18',
            status: 'pending',
            appealAmount: claim.totalAmount,
            createdBy: 'Dr. Sarah Johnson'
          }
        ] : [],
        payments: claim.status === 'paid' ? [
          {
            id: '1',
            paymentAmount: claim.paidAmount,
            paymentDate: '2024-01-20',
            paymentMethod: 'Electronic',
            checkNumber: 'EFT123456',
            postedBy: 'Jane Smith'
          }
        ] : [],
        attachments: [
          { id: '1', name: 'Medical Records.pdf', size: '2.4 MB', uploadedAt: '2024-01-15T16:45:00Z' },
          { id: '2', name: 'Lab Results.pdf', size: '1.1 MB', uploadedAt: '2024-01-15T16:46:00Z' }
        ],
        patientInfo: {
          dateOfBirth: '1985-03-15',
          address: '123 Main St, Anytown, ST 12345',
          phone: '(555) 123-4567',
          insuranceInfo: {
            primary: 'Blue Cross Blue Shield',
            memberId: 'BC123456789',
            groupNumber: 'GRP001'
          }
        },
        providerInfo: {
          npi: '1234567890',
          taxId: '12-3456789',
          address: '456 Medical Center Dr, Healthcare City, ST 12345',
          phone: '(555) 987-6543'
        }
      };
      
        setDetailedClaim(mockDetailedClaim);
      }
    } catch (error) {
      console.error('Failed to fetch claim details:', error);
      toast.error('Failed to load claim details');
    } finally {
      setLoadingDetails(false);
    }
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

  // Claim Action Handlers
  const handleCorrectAndResubmit = async () => {
    if (!actionClaim || !correctionReason.trim()) {
      toast.error('Please provide a correction reason');
      return;
    }

    setIsLoading(true);
    try {
      const result = await correctAndResubmitClaimAPI(token, actionClaim.id, correctionReason);
      
      if (result?.success) {
        setClaims(prev => prev.map(claim => 
          claim.id === actionClaim.id 
            ? { 
                ...claim, 
                status: 'submitted', 
                lastUpdated: new Date().toISOString().split('T')[0],
                daysInProcess: 0
              }
            : claim
        ));
        
        setShowCorrectDialog(false);
        setCorrectionReason('');
        setActionClaim(null);
      }
    } catch (error) {
      console.error('Failed to correct and resubmit claim:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileAppeal = async () => {
    if (!actionClaim || !appealReason.trim()) {
      toast.error('Please provide an appeal reason');
      return;
    }

    setIsLoading(true);
    try {
      const result = await fileAppealAPI(token, actionClaim.id, appealReason);
      
      if (result?.success) {
        setClaims(prev => prev.map(claim => 
          claim.id === actionClaim.id 
            ? { 
                ...claim, 
                status: 'appealed', 
                lastUpdated: new Date().toISOString().split('T')[0],
                priority: 'high'
              }
            : claim
        ));
        
        setShowAppealDialog(false);
        setAppealReason('');
        setActionClaim(null);
      }
    } catch (error) {
      console.error('Failed to file appeal:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTransferToPatient = async () => {
    if (!actionClaim || !transferReason.trim()) {
      toast.error('Please provide a transfer reason');
      return;
    }

    setIsLoading(true);
    try {
      const result = await transferToPatientAPI(token, actionClaim.id, transferReason);
      
      if (result?.success) {
        setClaims(prev => prev.map(claim => 
          claim.id === actionClaim.id 
            ? { 
                ...claim, 
                status: 'rejected', 
                lastUpdated: new Date().toISOString().split('T')[0],
                balanceAmount: claim.totalAmount // Transfer full amount to patient
              }
            : claim
        ));
        
        setShowTransferDialog(false);
        setTransferReason('');
        setActionClaim(null);
      }
    } catch (error) {
      console.error('Failed to transfer claim to patient:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!actionClaim || !comment.trim()) {
      toast.error('Please provide a comment');
      return;
    }

    setIsLoading(true);
    try {
      const result = await addClaimCommentAPI(token, actionClaim.id, comment);
      
      if (result?.success) {
        setClaims(prev => prev.map(claim => 
          claim.id === actionClaim.id 
            ? { 
                ...claim, 
                lastUpdated: new Date().toISOString().split('T')[0]
              }
            : claim
        ));
        
        setShowCommentDialog(false);
        setComment('');
        setActionClaim(null);
      }
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoidClaim = async () => {
    if (!actionClaim || !voidReason.trim()) {
      toast.error('Please provide a void reason');
      return;
    }

    setIsLoading(true);
    try {
      const result = await voidClaimAPI(token, actionClaim.id, voidReason);
      
      if (result?.success) {
        setClaims(prev => prev.filter(claim => claim.id !== actionClaim.id));
        
        setShowVoidDialog(false);
        setVoidReason('');
        setActionClaim(null);
      }
    } catch (error) {
      console.error('Failed to void claim:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const openActionDialog = (claim: Claim, action: string) => {
    setActionClaim(claim);
    switch (action) {
      case 'correct':
        setShowCorrectDialog(true);
        break;
      case 'appeal':
        setShowAppealDialog(true);
        break;
      case 'transfer':
        setShowTransferDialog(true);
        break;
      case 'comment':
        setShowCommentDialog(true);
        break;
      case 'void':
        setShowVoidDialog(true);
        break;
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
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="sm" variant="outline">
                                  <MoreHorizontal className="w-3 h-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Claim Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => openActionDialog(claim, 'correct')}>
                                  <RotateCcw className="w-4 h-4 mr-2" />
                                  Correct & Resubmit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openActionDialog(claim, 'appeal')}>
                                  <FileText className="w-4 h-4 mr-2" />
                                  File Appeal
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openActionDialog(claim, 'transfer')}>
                                  <UserX className="w-4 h-4 mr-2" />
                                  Transfer to Patient
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openActionDialog(claim, 'comment')}>
                                  <MessageSquare className="w-4 h-4 mr-2" />
                                  Add Comment
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => openActionDialog(claim, 'void')}
                                  className="text-red-600"
                                >
                                  <X className="w-4 h-4 mr-2" />
                                  Void Claim
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
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

      {/* Enhanced Claim Details Dialog */}
      <Dialog open={showClaimDetails} onOpenChange={setShowClaimDetails}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Claim Details
            </DialogTitle>
            <DialogDescription>
              {selectedClaim && `${selectedClaim.claimNumber} - ${selectedClaim.patientName}`}
            </DialogDescription>
          </DialogHeader>
          
          {loadingDetails ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading claim details...</span>
            </div>
          ) : detailedClaim ? (
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
                <TabsTrigger value="comments">Comments</TabsTrigger>
                <TabsTrigger value="payments">Payments</TabsTrigger>
                <TabsTrigger value="appeals">Appeals</TabsTrigger>
                <TabsTrigger value="attachments">Attachments</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Patient Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Patient Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="font-medium text-gray-600">Name</p>
                          <p>{detailedClaim.patientName}</p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-600">Patient ID</p>
                          <p>{detailedClaim.patientId}</p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-600">Date of Birth</p>
                          <p>{detailedClaim.patientInfo.dateOfBirth}</p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-600">Phone</p>
                          <p>{detailedClaim.patientInfo.phone}</p>
                        </div>
                      </div>
                      <div>
                        <p className="font-medium text-gray-600">Address</p>
                        <p className="text-sm">{detailedClaim.patientInfo.address}</p>
                      </div>
                      <div>
                        <p className="font-medium text-gray-600">Primary Insurance</p>
                        <p className="text-sm">{detailedClaim.patientInfo.insuranceInfo.primary}</p>
                        <p className="text-xs text-gray-500">Member ID: {detailedClaim.patientInfo.insuranceInfo.memberId}</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Provider Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        Provider Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="font-medium text-gray-600">Provider</p>
                          <p>{detailedClaim.providerName}</p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-600">NPI</p>
                          <p>{detailedClaim.providerInfo.npi}</p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-600">Tax ID</p>
                          <p>{detailedClaim.providerInfo.taxId}</p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-600">Phone</p>
                          <p>{detailedClaim.providerInfo.phone}</p>
                        </div>
                      </div>
                      <div>
                        <p className="font-medium text-gray-600">Address</p>
                        <p className="text-sm">{detailedClaim.providerInfo.address}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Claim Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Claim Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-gray-600">Total Amount</p>
                        <p className="text-2xl font-bold text-blue-600">
                          ${detailedClaim.totalAmount.toFixed(2)}
                        </p>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <p className="text-sm text-gray-600">Paid Amount</p>
                        <p className="text-2xl font-bold text-green-600">
                          ${detailedClaim.paidAmount.toFixed(2)}
                        </p>
                      </div>
                      <div className="text-center p-4 bg-orange-50 rounded-lg">
                        <p className="text-sm text-gray-600">Balance</p>
                        <p className="text-2xl font-bold text-orange-600">
                          ${detailedClaim.balanceAmount.toFixed(2)}
                        </p>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <p className="text-sm text-gray-600">Days in Process</p>
                        <p className="text-2xl font-bold text-purple-600">
                          {detailedClaim.daysInProcess}
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium mb-3">Status & Priority</h4>
                        <div className="flex items-center gap-4">
                          <Badge className={getStatusColor(detailedClaim.status)}>
                            {getStatusIcon(detailedClaim.status)}
                            <span className="ml-1 capitalize">{detailedClaim.status}</span>
                          </Badge>
                          <Badge className={getPriorityColor(detailedClaim.priority)}>
                            {detailedClaim.priority} Priority
                          </Badge>
                        </div>
                        <div className="mt-3">
                          <p className="text-sm text-gray-600">Validation Score</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Progress value={detailedClaim.validationScore} className="flex-1" />
                            <span className="text-sm font-medium">{detailedClaim.validationScore}%</span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-3">Codes</h4>
                        <div className="space-y-2">
                          <div>
                            <p className="text-sm text-gray-600">Diagnosis Codes</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {detailedClaim.diagnosisCodes.map((code, index) => (
                                <Badge key={index} variant="outline" className="text-xs">{code}</Badge>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Procedure Codes</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {detailedClaim.procedureCodes.map((code, index) => (
                                <Badge key={index} variant="outline" className="text-xs">{code}</Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* History Tab */}
              <TabsContent value="history" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Claim Timeline
                    </CardTitle>
                    <CardDescription>
                      Complete history of all actions performed on this claim
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {detailedClaim.history.map((event, index) => (
                        <div key={event.id} className="flex items-start gap-4 pb-4 border-b last:border-b-0">
                          <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <Activity className="h-4 w-4 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-medium capitalize">{event.action}</h4>
                              <span className="text-xs text-gray-500">
                                {new Date(event.timestamp).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                              <span>By: {event.performedBy} ({event.performedByRole})</span>
                              {event.oldStatus && event.newStatus && (
                                <span>
                                  Status: {event.oldStatus} → {event.newStatus}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Comments Tab */}
              <TabsContent value="comments" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Comments & Notes
                    </CardTitle>
                    <CardDescription>
                      All comments and notes added to this claim
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {detailedClaim.comments.map((comment) => (
                        <div key={comment.id} className="p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{comment.userName}</span>
                              <Badge variant="outline" className="text-xs">
                                {comment.userRole}
                              </Badge>
                              <Badge 
                                variant={comment.commentType === 'general' ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {comment.commentType}
                              </Badge>
                            </div>
                            <span className="text-xs text-gray-500">
                              {new Date(comment.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">{comment.comment}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Payments Tab */}
              <TabsContent value="payments" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Payment History
                    </CardTitle>
                    <CardDescription>
                      All payments and adjustments for this claim
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {detailedClaim.payments.length > 0 ? (
                      <div className="space-y-4">
                        {detailedClaim.payments.map((payment) => (
                          <div key={payment.id} className="p-4 border rounded-lg">
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="font-medium text-gray-600">Payment Amount</p>
                                <p className="text-lg font-bold text-green-600">
                                  ${payment.paymentAmount.toFixed(2)}
                                </p>
                              </div>
                              <div>
                                <p className="font-medium text-gray-600">Payment Date</p>
                                <p>{payment.paymentDate}</p>
                              </div>
                              <div>
                                <p className="font-medium text-gray-600">Method</p>
                                <p>{payment.paymentMethod}</p>
                              </div>
                              <div>
                                <p className="font-medium text-gray-600">Posted By</p>
                                <p>{payment.postedBy}</p>
                              </div>
                            </div>
                            {payment.checkNumber && (
                              <div className="mt-2 text-sm text-gray-600">
                                Check/Reference: {payment.checkNumber}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No payments recorded for this claim</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Appeals Tab */}
              <TabsContent value="appeals" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Appeals
                    </CardTitle>
                    <CardDescription>
                      Appeal history and status for this claim
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {detailedClaim.appeals.length > 0 ? (
                      <div className="space-y-4">
                        {detailedClaim.appeals.map((appeal) => (
                          <div key={appeal.id} className="p-4 border rounded-lg">
                            <div className="flex items-center justify-between mb-3">
                              <Badge className={
                                appeal.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                appeal.status === 'approved' ? 'bg-green-100 text-green-800' :
                                appeal.status === 'denied' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }>
                                {appeal.status}
                              </Badge>
                              <span className="text-sm text-gray-500">
                                Filed: {appeal.appealDate}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 mb-3">{appeal.appealReason}</p>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="font-medium text-gray-600">Appeal Amount</p>
                                <p>${appeal.appealAmount.toFixed(2)}</p>
                              </div>
                              <div>
                                <p className="font-medium text-gray-600">Created By</p>
                                <p>{appeal.createdBy}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No appeals filed for this claim</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Attachments Tab */}
              <TabsContent value="attachments" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Attachments
                    </CardTitle>
                    <CardDescription>
                      Documents and files attached to this claim
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {detailedClaim.attachments.length > 0 ? (
                      <div className="space-y-3">
                        {detailedClaim.attachments.map((attachment) => (
                          <div key={attachment.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <FileText className="h-5 w-5 text-gray-400" />
                              <div>
                                <p className="font-medium text-sm">{attachment.name}</p>
                                <p className="text-xs text-gray-500">
                                  {attachment.size} • Uploaded {new Date(attachment.uploadedAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <Button size="sm" variant="outline">
                              <Download className="h-4 w-4 mr-1" />
                              Download
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No attachments for this claim</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : null}
          
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowClaimDetails(false)}>
              Close
            </Button>
            <Button>
              <ExternalLink className="w-4 h-4 mr-2" />
              Print Details
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Correct & Resubmit Dialog */}
      <Dialog open={showCorrectDialog} onOpenChange={setShowCorrectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Correct & Resubmit Claim</DialogTitle>
            <DialogDescription>
              {actionClaim && `${actionClaim.claimNumber} - ${actionClaim.patientName}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="correctionReason">Correction Reason</Label>
              <Textarea
                id="correctionReason"
                placeholder="Describe the corrections made to this claim..."
                value={correctionReason}
                onChange={(e) => setCorrectionReason(e.target.value)}
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCorrectDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCorrectAndResubmit} disabled={isLoading}>
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RotateCcw className="w-4 h-4 mr-2" />
                )}
                Correct & Resubmit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* File Appeal Dialog */}
      <Dialog open={showAppealDialog} onOpenChange={setShowAppealDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>File Appeal</DialogTitle>
            <DialogDescription>
              {actionClaim && `${actionClaim.claimNumber} - ${actionClaim.patientName}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="appealReason">Appeal Reason</Label>
              <Textarea
                id="appealReason"
                placeholder="Provide detailed justification for this appeal..."
                value={appealReason}
                onChange={(e) => setAppealReason(e.target.value)}
                rows={4}
              />
            </div>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Appeals typically take 30-60 days to process. Ensure all supporting documentation is attached.
              </AlertDescription>
            </Alert>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAppealDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleFileAppeal} disabled={isLoading}>
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4 mr-2" />
                )}
                File Appeal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transfer to Patient Dialog */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer to Patient Responsibility</DialogTitle>
            <DialogDescription>
              {actionClaim && `${actionClaim.claimNumber} - ${actionClaim.patientName}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="transferReason">Transfer Reason</Label>
              <Textarea
                id="transferReason"
                placeholder="Explain why this claim is being transferred to patient responsibility..."
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
                rows={4}
              />
            </div>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This action will transfer the full claim amount to patient responsibility and generate a patient statement.
              </AlertDescription>
            </Alert>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowTransferDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleTransferToPatient} disabled={isLoading} variant="destructive">
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <UserX className="w-4 h-4 mr-2" />
                )}
                Transfer to Patient
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Comment Dialog */}
      <Dialog open={showCommentDialog} onOpenChange={setShowCommentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Comment</DialogTitle>
            <DialogDescription>
              {actionClaim && `${actionClaim.claimNumber} - ${actionClaim.patientName}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="comment">Comment</Label>
              <Textarea
                id="comment"
                placeholder="Add your comment or notes about this claim..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCommentDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddComment} disabled={isLoading}>
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <MessageSquare className="w-4 h-4 mr-2" />
                )}
                Add Comment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Void Claim Dialog */}
      <Dialog open={showVoidDialog} onOpenChange={setShowVoidDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Void Claim</DialogTitle>
            <DialogDescription>
              {actionClaim && `${actionClaim.claimNumber} - ${actionClaim.patientName}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="voidReason">Void Reason</Label>
              <Textarea
                id="voidReason"
                placeholder="Provide reason for voiding this claim..."
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                rows={4}
              />
            </div>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Warning: This action cannot be undone. The claim will be permanently removed from the system.
              </AlertDescription>
            </Alert>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowVoidDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleVoidClaim} disabled={isLoading} variant="destructive">
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <X className="w-4 h-4 mr-2" />
                )}
                Void Claim
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClaimsManagement;
//   XCircle,
//   Clock,
//   AlertTriangle,
//   Plus,
//   History
// } from 'lucide-react';
// import { 
//   getClaimsStatusAPI, 
//   getClaimDetailsAPI, 
//   updateClaimStatusAPI,
//   createClaimAPI,
//   updateClaimAPI
// } from '@/services/operations/rcm';
// import PaymentForm from '@/components/payments/PaymentForm';
// import ClaimForm from './ClaimForm';
// import ClaimHistory from './ClaimHistory';
// import { formatCurrency, formatDate } from '@/utils/rcmFormatters';

// interface Claim {
//   claim_id: number;
//   patient_id: number;
//   patient_name: string;
//   service_date: string;
//   submission_date: string;
//   status: number;
//   status_text: string;
//   procedure_code: string;
//   total_amount: number;
//   paid_amount: number;
//   claim_md_tracking_id: string;
//   payer_name: string;
//   processing_days: number;
//   priority: string;
// }

// const ClaimsManagement: React.FC = () => {
//   const { token } = useSelector((state: RootState) => state.auth);
//   const [claims, setClaims] = useState<Claim[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [selectedClaim, setSelectedClaim] = useState<any>(null);
//   const [showPaymentForm, setShowPaymentForm] = useState(false);
//   const [showClaimForm, setShowClaimForm] = useState(false);
//   const [editingClaim, setEditingClaim] = useState<any>(null);
//   const [claimFormLoading, setClaimFormLoading] = useState(false);
//   const [showHistory, setShowHistory] = useState(false);
//   const [historyClaimId, setHistoryClaimId] = useState<number | null>(null);
//   const [filters, setFilters] = useState({
//     status: 'all',
//     search: '',
//     priority: 'all',
//     page: 1,
//     limit: 10
//   });
//   const [pagination, setPagination] = useState({
//     total: 0,
//     totalPages: 0
//   });

//   const fetchClaims = async () => {
//     try {
//       setLoading(true);
//       const response = await getClaimsStatusAPI(token, filters);
//       if (response.success) {
//         setClaims(response.data);
//         setPagination(response.pagination);
//       }
//     } catch (error) {
//       console.error('Error fetching claims:', error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const fetchClaimDetails = async (claimId: number) => {
//     try {
//       const response = await getClaimDetailsAPI(token, claimId);
//       if (response.success) {
//         setSelectedClaim(response.data);
//       }
//     } catch (error) {
//       console.error('Error fetching claim details:', error);
//     }
//   };

//   const handleStatusUpdate = async (claimId: number, newStatus: number) => {
//     try {
//       const response = await updateClaimStatusAPI(token, claimId, { status: newStatus });
//       if (response.success) {
//         fetchClaims(); // Refresh the list
//       }
//     } catch (error) {
//       console.error('Error updating claim status:', error);
//     }
//   };

//   useEffect(() => {
//     fetchClaims();
//   }, [filters]);

//   const getStatusBadge = (status: number, statusText: string) => {
//     const statusConfig = {
//       0: { color: 'bg-gray-500', text: 'Draft' },
//       1: { color: 'bg-yellow-500', text: 'Submitted' },
//       2: { color: 'bg-green-500', text: 'Paid' },
//       3: { color: 'bg-red-500', text: 'Denied' },
//       4: { color: 'bg-blue-500', text: 'Appealed' }
//     };
    
//     const config = statusConfig[status as keyof typeof statusConfig] || { color: 'bg-gray-500', text: statusText };
    
//     return (
//       <Badge className={`${config.color} text-white`}>
//         {config.text}
//       </Badge>
//     );
//   };

//   const getPriorityBadge = (priority: string, days: number) => {
//     if (days > 30) {
//       return <Badge className="bg-red-500 text-white">Urgent</Badge>;
//     } else if (days > 14) {
//       return <Badge className="bg-yellow-500 text-white">Normal</Badge>;
//     }
//     return <Badge className="bg-green-500 text-white">Recent</Badge>;
//   };

//   const handlePaymentSuccess = (paymentData: any) => {
//     setShowPaymentForm(false);
//     setSelectedClaim(null);
//     fetchClaims(); // Refresh claims list
//     // Show success message
//   };

//   // Handle create new claim
//   const handleCreateClaim = () => {
//     setEditingClaim(null);
//     setShowClaimForm(true);
//   };

//   // Handle edit claim
//   const handleEditClaim = (claim: Claim) => {
//     setEditingClaim(claim);
//     setShowClaimForm(true);
//   };

//   // Handle claim form submit
//   const handleClaimFormSubmit = async (claimData: any) => {
//     try {
//       setClaimFormLoading(true);
      
//       let response;
//       if (editingClaim) {
//         // Update existing claim
//         response = await updateClaimAPI(token, editingClaim.claim_id, claimData);
//       } else {
//         // Create new claim
//         response = await createClaimAPI(token, claimData);
//       }

//       if (response) {
//         setShowClaimForm(false);
//         setEditingClaim(null);
//         fetchClaims(); // Refresh claims list
//       } else {
//         throw new Error('Failed to save claim');
//       }
//     } catch (error) {
//       console.error('Error saving claim:', error);
//       throw error; // Re-throw to let ClaimForm handle the error display
//     } finally {
//       setClaimFormLoading(false);
//     }
//   };

//   // Handle claim form cancel
//   const handleClaimFormCancel = () => {
//     setShowClaimForm(false);
//     setEditingClaim(null);
//   };

//   // Handle view history
//   const handleViewHistory = (claimId: number) => {
//     setHistoryClaimId(claimId);
//     setShowHistory(true);
//   };

//   return (
//     <div className="space-y-6">
//       {/* Header */}
//       <div className="flex justify-between items-center">
//         <div>
//           <h2 className="text-2xl font-bold">Claims Management</h2>
//           <p className="text-muted-foreground">
//             Track and manage insurance claims and patient payments
//           </p>
//         </div>
//         <div className="flex items-center space-x-2">
//           <Button onClick={handleCreateClaim}>
//             <Plus className="h-4 w-4 mr-2" />
//             New Claim
//           </Button>
//           <Button variant="outline" size="sm" onClick={fetchClaims}>
//             <RefreshCw className="h-4 w-4 mr-2" />
//             Refresh
//           </Button>
//           <Button variant="outline" size="sm">
//             <Download className="h-4 w-4 mr-2" />
//             Export
//           </Button>
//         </div>
//       </div>

//       {/* Filters */}
//       <Card>
//         <CardContent className="p-4">
//           <div className="flex flex-wrap gap-4">
//             <div className="flex-1 min-w-64">
//               <div className="relative">
//                 <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
//                 <Input
//                   placeholder="Search by patient name, claim ID, or tracking ID..."
//                   value={filters.search}
//                   onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
//                   className="pl-10"
//                 />
//               </div>
//             </div>
//             <Select
//               value={filters.status}
//               onValueChange={(value) => setFilters({ ...filters, status: value, page: 1 })}
//             >
//               <SelectTrigger className="w-40">
//                 <SelectValue placeholder="Status" />
//               </SelectTrigger>
//               <SelectContent>
//                 <SelectItem value="all">All Status</SelectItem>
//                 <SelectItem value="0">Draft</SelectItem>
//                 <SelectItem value="1">Submitted</SelectItem>
//                 <SelectItem value="2">Paid</SelectItem>
//                 <SelectItem value="3">Denied</SelectItem>
//                 <SelectItem value="4">Appealed</SelectItem>
//               </SelectContent>
//             </Select>
//             <Select
//               value={filters.priority}
//               onValueChange={(value) => setFilters({ ...filters, priority: value, page: 1 })}
//             >
//               <SelectTrigger className="w-40">
//                 <SelectValue placeholder="Priority" />
//               </SelectTrigger>
//               <SelectContent>
//                 <SelectItem value="all">All Priority</SelectItem>
//                 <SelectItem value="urgent">Urgent</SelectItem>
//                 <SelectItem value="normal">Normal</SelectItem>
//                 <SelectItem value="recent">Recent</SelectItem>
//               </SelectContent>
//             </Select>
//           </div>
//         </CardContent>
//       </Card>

//       {/* Claims Table */}
//       <Card>
//         <CardHeader>
//           <CardTitle>Claims List</CardTitle>
//           <CardDescription>
//             {pagination.total} total claims found
//           </CardDescription>
//         </CardHeader>
//         <CardContent>
//           {loading ? (
//             <div className="flex items-center justify-center py-8">
//               <RefreshCw className="h-8 w-8 animate-spin" />
//               <span className="ml-2">Loading claims...</span>
//             </div>
//           ) : (
//             <div className="space-y-4">
//               <Table>
//                 <TableHeader>
//                   <TableRow>
//                     <TableHead>Patient</TableHead>
//                     <TableHead>Service Date</TableHead>
//                     <TableHead>Procedure</TableHead>
//                     <TableHead>Payer</TableHead>
//                     <TableHead>Amount</TableHead>
//                     <TableHead>Status</TableHead>
//                     <TableHead>Priority</TableHead>
//                     <TableHead>Actions</TableHead>
//                   </TableRow>
//                 </TableHeader>
//                 <TableBody>
//                   {claims.map((claim) => (
//                     <TableRow key={claim.claim_id}>
//                       <TableCell>
//                         <div>
//                           <div className="font-medium">{claim.patient_name}</div>
//                           <div className="text-sm text-muted-foreground">
//                             ID: {claim.patient_id}
//                           </div>
//                         </div>
//                       </TableCell>
//                       <TableCell>
//                         <div className="flex items-center">
//                           <Calendar className="h-4 w-4 mr-2 text-gray-400" />
//                           {formatDate(claim.service_date)}
//                         </div>
//                       </TableCell>
//                       <TableCell>
//                         <div>
//                           <div className="font-medium">{claim.procedure_code}</div>
//                           <div className="text-sm text-muted-foreground">
//                             {claim.processing_days} days
//                           </div>
//                         </div>
//                       </TableCell>
//                       <TableCell>
//                         <div className="flex items-center">
//                           <Building className="h-4 w-4 mr-2 text-gray-400" />
//                           {claim.payer_name || 'Self Pay'}
//                         </div>
//                       </TableCell>
//                       <TableCell>
//                         <div>
//                           <div className="font-medium">{formatCurrency(claim.total_amount)}</div>
//                           {claim.paid_amount > 0 && (
//                             <div className="text-sm text-green-600">
//                               Paid: {formatCurrency(claim.paid_amount)}
//                             </div>
//                           )}
//                         </div>
//                       </TableCell>
//                       <TableCell>
//                         {getStatusBadge(claim.status, claim.status_text)}
//                       </TableCell>
//                       <TableCell>
//                         {getPriorityBadge(claim.priority, claim.processing_days)}
//                       </TableCell>
//                       <TableCell>
//                         <div className="flex items-center space-x-2">
//                           <Dialog>
//                             <DialogTrigger asChild>
//                               <Button
//                                 variant="outline"
//                                 size="sm"
//                                 onClick={() => fetchClaimDetails(claim.claim_id)}
//                               >
//                                 <Eye className="h-4 w-4" />
//                               </Button>
//                             </DialogTrigger>
//                             <DialogContent className="max-w-4xl">
//                               <DialogHeader>
//                                 <DialogTitle>Claim Details</DialogTitle>
//                                 <DialogDescription>
//                                   Detailed information for claim #{claim.claim_id}
//                                 </DialogDescription>
//                               </DialogHeader>
//                               {selectedClaim && (
//                                 <ClaimDetailsView 
//                                   claim={selectedClaim} 
//                                   onStatusUpdate={handleStatusUpdate}
//                                   onPaymentRequest={() => {
//                                     setShowPaymentForm(true);
//                                   }}
//                                 />
//                               )}
//                             </DialogContent>
//                           </Dialog>
                          
//                           <Button
//                             variant="outline"
//                             size="sm"
//                             onClick={() => handleEditClaim(claim)}
//                           >
//                             <Edit className="h-4 w-4" />
//                           </Button>
                          
//                           <Button
//                             variant="outline"
//                             size="sm"
//                             onClick={() => handleViewHistory(claim.claim_id)}
//                           >
//                             <History className="h-4 w-4" />
//                           </Button>
                          
//                           {(claim.status === 1 || claim.status === 3) && (
//                             <Button
//                               variant="outline"
//                               size="sm"
//                               onClick={() => {
//                                 setSelectedClaim(claim);
//                                 setShowPaymentForm(true);
//                               }}
//                             >
//                               <CreditCard className="h-4 w-4" />
//                             </Button>
//                           )}
//                         </div>
//                       </TableCell>
//                     </TableRow>
//                   ))}
//                 </TableBody>
//               </Table>

//               {/* Pagination */}
//               <div className="flex items-center justify-between">
//                 <div className="text-sm text-muted-foreground">
//                   Showing {((filters.page - 1) * filters.limit) + 1} to {Math.min(filters.page * filters.limit, pagination.total)} of {pagination.total} claims
//                 </div>
//                 <div className="flex items-center space-x-2">
//                   <Button
//                     variant="outline"
//                     size="sm"
//                     disabled={filters.page === 1}
//                     onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
//                   >
//                     Previous
//                   </Button>
//                   <span className="text-sm">
//                     Page {filters.page} of {pagination.totalPages}
//                   </span>
//                   <Button
//                     variant="outline"
//                     size="sm"
//                     disabled={filters.page === pagination.totalPages}
//                     onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
//                   >
//                     Next
//                   </Button>
//                 </div>
//               </div>
//             </div>
//           )}
//         </CardContent>
//       </Card>

//       {/* Payment Form Dialog */}
//       <Dialog open={showPaymentForm} onOpenChange={setShowPaymentForm}>
//         <DialogContent>
//           <DialogHeader>
//             <DialogTitle>Process Payment</DialogTitle>
//             <DialogDescription>
//               Process payment for {selectedClaim?.patient_name}
//             </DialogDescription>
//           </DialogHeader>
//           {selectedClaim && (
//             <PaymentForm
//               patientId={selectedClaim.patient_id}
//               billingId={selectedClaim.claim_id}
//               amount={selectedClaim.total_amount - (selectedClaim.paid_amount || 0)}
//               description={`Payment for ${selectedClaim.procedure_code} - ${selectedClaim.patient_name}`}
//               onSuccess={handlePaymentSuccess}
//               onCancel={() => setShowPaymentForm(false)}
//             />
//           )}
//         </DialogContent>
//       </Dialog>

//       {/* Claim Form Dialog */}
//       <Dialog open={showClaimForm} onOpenChange={setShowClaimForm}>
//         <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
//           <DialogHeader>
//             <DialogTitle>
//               {editingClaim ? 'Edit Claim' : 'Create New Claim'}
//             </DialogTitle>
//             <DialogDescription>
//               {editingClaim 
//                 ? `Editing claim #${editingClaim.claim_id}` 
//                 : 'Enter claim information to create a new claim'
//               }
//             </DialogDescription>
//           </DialogHeader>
//           <ClaimForm
//             claim={editingClaim}
//             onSubmit={handleClaimFormSubmit}
//             onCancel={handleClaimFormCancel}
//             loading={claimFormLoading}
//           />
//         </DialogContent>
//       </Dialog>

//       {/* Claim History Dialog */}
//       <Dialog open={showHistory} onOpenChange={setShowHistory}>
//         <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
//           <DialogHeader>
//             <DialogTitle>
//               Claim History
//             </DialogTitle>
//             <DialogDescription>
//               Complete audit trail for claim #{historyClaimId}
//             </DialogDescription>
//           </DialogHeader>
//           {historyClaimId && (
//             <ClaimHistory
//               claimId={historyClaimId}
//               onClose={() => setShowHistory(false)}
//             />
//           )}
//         </DialogContent>
//       </Dialog>
//     </div>
//   );
// };// ClaiPaymentGatewaySettingsm Details View Component
// interface ClaimDetailsViewProps {
//   claim: any;
//   onStatusUpdate: (claimId: number, status: number) => void;
//   onPaymentRequest: () => void;
// }

// const ClaimDetailsView: React.FC<ClaimDetailsViewProps> = ({ 
//   claim, 
//   onStatusUpdate, 
//   onPaymentRequest 
// }) => {
//   const [newStatus, setNewStatus] = useState(claim.claim.status);

//   return (
//     <div className="space-y-6">
//       {/* Claim Summary */}
//       <div className="grid grid-cols-2 gap-6">
//         <Card>
//           <CardHeader>
//             <CardTitle className="text-lg">Claim Information</CardTitle>
//           </CardHeader>
//           <CardContent className="space-y-3">
//             <div className="flex justify-between">
//               <span className="text-muted-foreground">Claim ID:</span>
//               <span className="font-medium">{claim.claim.claim_id}</span>
//             </div>
//             <div className="flex justify-between">
//               <span className="text-muted-foreground">Tracking ID:</span>
//               <span className="font-medium">{claim.claim.claim_md_tracking_id || 'N/A'}</span>
//             </div>
//             <div className="flex justify-between">
//               <span className="text-muted-foreground">Service Date:</span>
//               <span className="font-medium">{formatDate(claim.claim.service_date)}</span>
//             </div>
//             <div className="flex justify-between">
//               <span className="text-muted-foreground">Submission Date:</span>
//               <span className="font-medium">{formatDate(claim.claim.submission_date)}</span>
//             </div>
//             <div className="flex justify-between">
//               <span className="text-muted-foreground">Processing Days:</span>
//               <span className="font-medium">{claim.claim.processing_days} days</span>
//             </div>
//           </CardContent>
//         </Card>

//         <Card>
//           <CardHeader>
//             <CardTitle className="text-lg">Patient Information</CardTitle>
//           </CardHeader>
//           <CardContent className="space-y-3">
//             <div className="flex justify-between">
//               <span className="text-muted-foreground">Name:</span>
//               <span className="font-medium">{claim.claim.patient_name}</span>
//             </div>
//             <div className="flex justify-between">
//               <span className="text-muted-foreground">Patient ID:</span>
//               <span className="font-medium">{claim.claim.patient_id}</span>
//             </div>
//             <div className="flex justify-between">
//               <span className="text-muted-foreground">DOB:</span>
//               <span className="font-medium">{claim.claim.dob ? formatDate(claim.claim.dob) : 'N/A'}</span>
//             </div>
//             <div className="flex justify-between">
//               <span className="text-muted-foreground">Phone:</span>
//               <span className="font-medium">{claim.claim.phone || 'N/A'}</span>
//             </div>
//             <div className="flex justify-between">
//               <span className="text-muted-foreground">Email:</span>
//               <span className="font-medium">{claim.claim.email || 'N/A'}</span>
//             </div>
//           </CardContent>
//         </Card>
//       </div>

//       {/* Financial Information */}
//       <Card>
//         <CardHeader>
//           <CardTitle className="text-lg">Financial Details</CardTitle>
//         </CardHeader>
//         <CardContent>
//           <div className="grid grid-cols-3 gap-6">
//             <div className="text-center">
//               <div className="text-2xl font-bold text-blue-600">
//                 {formatCurrency(claim.claim.total_amount)}
//               </div>
//               <div className="text-sm text-muted-foreground">Total Amount</div>
//             </div>
//             <div className="text-center">
//               <div className="text-2xl font-bold text-green-600">
//                 {formatCurrency(claim.claim.paid_amount || 0)}
//               </div>
//               <div className="text-sm text-muted-foreground">Paid Amount</div>
//             </div>
//             <div className="text-center">
//               <div className="text-2xl font-bold text-orange-600">
//                 {formatCurrency(claim.claim.total_amount - (claim.claim.paid_amount || 0))}
//               </div>
//               <div className="text-sm text-muted-foreground">Outstanding</div>
//             </div>
//           </div>
//         </CardContent>
//       </Card>

//       {/* Procedure and Insurance */}
//       <div className="grid grid-cols-2 gap-6">
//         <Card>
//           <CardHeader>
//             <CardTitle className="text-lg">Procedure Details</CardTitle>
//           </CardHeader>
//           <CardContent className="space-y-3">
//             <div className="flex justify-between">
//               <span className="text-muted-foreground">CPT Code:</span>
//               <span className="font-medium">{claim.claim.procedure_code}</span>
//             </div>
//             <div className="flex justify-between">
//               <span className="text-muted-foreground">Description:</span>
//               <span className="font-medium">{claim.claim.procedure_description}</span>
//             </div>
//             <div className="flex justify-between">
//               <span className="text-muted-foreground">Units:</span>
//               <span className="font-medium">{claim.claim.code_units}</span>
//             </div>
//             <div className="flex justify-between">
//               <span className="text-muted-foreground">Unit Price:</span>
//               <span className="font-medium">{formatCurrency(claim.claim.unit_price)}</span>
//             </div>
//           </CardContent>
//         </Card>

//         <Card>
//           <CardHeader>
//             <CardTitle className="text-lg">Insurance Information</CardTitle>
//           </CardHeader>
//           <CardContent className="space-y-3">
//             <div className="flex justify-between">
//               <span className="text-muted-foreground">Payer:</span>
//               <span className="font-medium">{claim.claim.payer_name || 'Self Pay'}</span>
//             </div>
//             <div className="flex justify-between">
//               <span className="text-muted-foreground">Policy Number:</span>
//               <span className="font-medium">{claim.claim.policy_number || 'N/A'}</span>
//             </div>
//             <div className="flex justify-between">
//               <span className="text-muted-foreground">Group Number:</span>
//               <span className="font-medium">{claim.claim.group_number || 'N/A'}</span>
//             </div>
//           </CardContent>
//         </Card>
//       </div>

//       {/* Diagnoses */}
//       {claim.diagnoses && claim.diagnoses.length > 0 && (
//         <Card>
//           <CardHeader>
//             <CardTitle className="text-lg">Diagnoses</CardTitle>
//           </CardHeader>
//           <CardContent>
//             <div className="space-y-2">
//               {claim.diagnoses.map((diagnosis: any, index: number) => (
//                 <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
//                   <span className="font-medium">{diagnosis.diagnosis_code}</span>
//                   <span className="text-sm text-muted-foreground">{diagnosis.diagnosis_description}</span>
//                 </div>
//               ))}
//             </div>
//           </CardContent>
//         </Card>
//       )}

//       {/* Claim History */}
//       {claim.history && claim.history.length > 0 && (
//         <Card>
//           <CardHeader>
//             <CardTitle className="text-lg">Claim History</CardTitle>
//           </CardHeader>
//           <CardContent>
//             <div className="space-y-3">
//               {claim.history.map((entry: any, index: number) => (
//                 <div key={index} className="flex items-start space-x-3 p-3 border rounded">
//                   <div className="flex-shrink-0">
//                     <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
//                   </div>
//                   <div className="flex-1">
//                     <div className="flex justify-between items-start">
//                       <div>
//                         <div className="font-medium">{entry.action}</div>
//                         <div className="text-sm text-muted-foreground">{entry.notes}</div>
//                       </div>
//                       <div className="text-sm text-muted-foreground">
//                         {formatDate(entry.date)} - {entry.user}
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           </CardContent>
//         </Card>
//       )}

//       {/* Actions */}
//       <div className="flex justify-between items-center pt-4 border-t">
//         <div className="flex items-center space-x-4">
//           <div className="flex items-center space-x-2">
//             <span className="text-sm font-medium">Update Status:</span>
//             <Select value={newStatus.toString()} onValueChange={(value) => setNewStatus(parseInt(value))}>
//               <SelectTrigger className="w-32">
//                 <SelectValue />
//               </SelectTrigger>
//               <SelectContent>
//                 <SelectItem value="0">Draft</SelectItem>
//                 <SelectItem value="1">Submitted</SelectItem>
//                 <SelectItem value="2">Paid</SelectItem>
//                 <SelectItem value="3">Denied</SelectItem>
//                 <SelectItem value="4">Appealed</SelectItem>
//               </SelectContent>
//             </Select>
//             <Button
//               size="sm"
//               onClick={() => onStatusUpdate(claim.claim.claim_id, newStatus)}
//               disabled={newStatus === claim.claim.status}
//             >
//               Update
//             </Button>
//           </div>
//         </div>
        
//         <div className="flex items-center space-x-2">
//           {claim.claim.total_amount > (claim.claim.paid_amount || 0) && (
//             <Button onClick={onPaymentRequest}>
//               <CreditCard className="h-4 w-4 mr-2" />
//               Process Payment
//             </Button>
//           )}
//         </div>
//       </div>

//       {/* Recommendations */}
//       {claim.recommendations && claim.recommendations.length > 0 && (
//         <Alert>
//           <AlertTriangle className="h-4 w-4" />
//           <AlertDescription>
//             <div className="space-y-1">
//               <div className="font-medium">Recommendations:</div>
//               {claim.recommendations.map((rec: string, index: number) => (
//                 <div key={index} className="text-sm">• {rec}</div>
//               ))}
//             </div>
//           </AlertDescription>
//         </Alert>
//       )}
//     </div>
//   );
// };

// export default ClaimsManagement;