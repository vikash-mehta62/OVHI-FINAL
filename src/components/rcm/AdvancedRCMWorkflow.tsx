import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Bot,
  FileText,
  CreditCard,
  BarChart3,
  Filter,
  Search,
  Download,
  Upload,
  Settings,
  Activity,
  Target,
  Zap,
  Brain,
  Eye,
  Users,
  Calendar,
  MessageSquare,
  Bell,
  Shield,
  Database,
  Workflow,
  LineChart,
  PieChart,
  TrendingUp as TrendingUpIcon,
  Cpu,
  Globe,
  Lock,
  Unlock,
  Play,
  Pause,
  Stop,
  SkipForward,
  Rewind,
  FastForward,
  RotateCcw,
  Save,
  Share,
  Copy,
  Edit,
  Trash2,
  Plus,
  Minus,
  X,
  Check,
  Info,
  HelpCircle,
  ExternalLink,
  Mail,
  Phone,
  MapPin,
  User,
  Building,
  CreditCard as CreditCardIcon,
  Banknote,
  Receipt,
  Calculator,
  Clipboard,
  ClipboardCheck,
  FileCheck,
  FilePlus,
  FileX,
  Folder,
  FolderOpen,
  Archive,
  Bookmark,
  Tag,
  Tags,
  Star,
  Heart,
  ThumbsUp,
  ThumbsDown,
  Flag,
  Lightbulb,
  Sparkles,
  Rocket,
  Award,
  Trophy,
  Medal,
  Crown,
  Gem,
  Diamond,
  Hexagon,
  Circle,
  Square,
  Triangle,
  Octagon,
  Pentagon
} from 'lucide-react';

interface RCMMetrics {
  netCollectionRate: number;
  daysInAR: number;
  firstPassRate: number;
  denialRate: number;
  totalRevenue: number;
  totalCollected: number;
  outstandingAR: number;
  claimsSubmitted: number;
  claimsPaid: number;
  claimsDenied: number;
  paymentsPosted: number;
  autoPostedRate: number;
}

interface ClaimSummary {
  id: string;
  claimNumber: string;
  patientName: string;
  payerName: string;
  serviceDate: string;
  totalCharges: number;
  totalPaid: number;
  status: string;
  daysOutstanding: number;
  priority: string;
}

interface PaymentSummary {
  id: string;
  paymentNumber: string;
  payerName: string;
  checkNumber: string;
  checkDate: string;
  totalAmount: number;
  status: string;
  autoPosted: boolean;
  lineItemCount: number;
}

interface DenialSummary {
  id: string;
  claimNumber: string;
  patientName: string;
  denialCode: string;
  denialReason: string;
  amount: number;
  denialDate: string;
  category: string;
  priority: string;
  status: string;
  autoCorrection?: string;
}

const AdvancedRCMWorkflow: React.FC = () => {
  const [metrics, setMetrics] = useState<RCMMetrics | null>(null);
  const [claims, setClaims] = useState<ClaimSummary[]>([]);
  const [payments, setPayments] = useState<PaymentSummary[]>([]);
  const [denials, setDenials] = useState<DenialSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // API base URL
  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

  // Fetch RCM metrics
  const fetchMetrics = useCallback(async () => {
    try {
      const [claimsResponse, paymentsResponse, denialsResponse] = await Promise.all([
        fetch(`${API_BASE}/claims/status-counts`),
        fetch(`${API_BASE}/payments/posting-stats`),
        fetch(`${API_BASE}/denials/stats`)
      ]);

      const claimsData = await claimsResponse.json();
      const paymentsData = await paymentsResponse.json();
      const denialsData = await denialsResponse.json();

      // Calculate metrics from API responses
      const totalCharges = claimsData.data.reduce((sum: number, item: any) => sum + item.total_charges, 0);
      const totalPaid = claimsData.data.reduce((sum: number, item: any) => sum + item.total_paid, 0);
      const totalClaims = claimsData.data.reduce((sum: number, item: any) => sum + item.count, 0);
      const deniedClaims = claimsData.data.find((item: any) => item.status === 'denied')?.count || 0;
      const paidClaims = claimsData.data.find((item: any) => item.status === 'paid')?.count || 0;

      setMetrics({
        netCollectionRate: totalCharges > 0 ? (totalPaid / totalCharges) * 100 : 0,
        daysInAR: 23, // This would come from aging report
        firstPassRate: totalClaims > 0 ? ((totalClaims - deniedClaims) / totalClaims) * 100 : 0,
        denialRate: totalClaims > 0 ? (deniedClaims / totalClaims) * 100 : 0,
        totalRevenue: totalCharges,
        totalCollected: totalPaid,
        outstandingAR: totalCharges - totalPaid,
        claimsSubmitted: totalClaims,
        claimsPaid: paidClaims,
        claimsDenied: deniedClaims,
        paymentsPosted: paymentsData.data.reduce((sum: number, item: any) => sum + item.count, 0),
        autoPostedRate: 85 // This would be calculated from payment data
      });
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
      toast.error('Failed to load RCM metrics');
    }
  }, [API_BASE]);

  // Fetch claims data
  const fetchClaims = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/claims?limit=20`);
      const data = await response.json();
      
      if (data.success) {
        setClaims(data.data.map((claim: any) => ({
          id: claim.id,
          claimNumber: claim.claim_number,
          patientName: `${claim.patient_first_name} ${claim.patient_last_name}`,
          payerName: claim.payer_name,
          serviceDate: claim.service_date,
          totalCharges: claim.total_charges,
          totalPaid: claim.total_paid,
          status: claim.status,
          daysOutstanding: claim.days_outstanding || 0,
          priority: claim.priority
        })));
      }
    } catch (error) {
      console.error('Failed to fetch claims:', error);
      toast.error('Failed to load claims data');
    }
  }, [API_BASE]);

  // Fetch payments data
  const fetchPayments = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/payments?limit=20`);
      const data = await response.json();
      
      if (data.success) {
        setPayments(data.data.map((payment: any) => ({
          id: payment.id,
          paymentNumber: payment.payment_number,
          payerName: payment.payer_name,
          checkNumber: payment.check_number,
          checkDate: payment.check_date,
          totalAmount: payment.total_amount,
          status: payment.status,
          autoPosted: payment.auto_posted,
          lineItemCount: payment.line_item_count || 0
        })));
      }
    } catch (error) {
      console.error('Failed to fetch payments:', error);
      toast.error('Failed to load payments data');
    }
  }, [API_BASE]);

  // Fetch denials data
  const fetchDenials = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/denials?limit=20`);
      const data = await response.json();
      
      if (data.success) {
        setDenials(data.data.map((denial: any) => ({
          id: denial.id,
          claimNumber: denial.claim_number,
          patientName: denial.patient_name,
          denialCode: denial.denial_code,
          denialReason: denial.denial_reason,
          amount: denial.total_charges,
          denialDate: denial.denial_date,
          category: denial.category,
          priority: denial.priority,
          status: denial.status,
          autoCorrection: denial.auto_correction_suggestion
        })));
      }
    } catch (error) {
      console.error('Failed to fetch denials:', error);
      toast.error('Failed to load denials data');
    }
  }, [API_BASE]);

  // Load all data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchMetrics(),
        fetchClaims(),
        fetchPayments(),
        fetchDenials()
      ]);
    } finally {
      setLoading(false);
    }
  }, [fetchMetrics, fetchClaims, fetchPayments, fetchDenials]);

  // Auto-post payment
  const handleAutoPost = async (paymentId: string) => {
    try {
      const response = await fetch(`${API_BASE}/payments/${paymentId}/auto-post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success('Payment auto-posted successfully');
        fetchPayments();
        fetchMetrics();
      } else {
        toast.error(data.message || 'Auto-posting failed');
      }
    } catch (error) {
      toast.error('Auto-posting failed');
    }
  };

  // Generate auto-correction for denial
  const handleAutoCorrection = async (denialId: string) => {
    try {
      const response = await fetch(`${API_BASE}/denials/${denialId}/auto-correction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success('Auto-correction generated');
        fetchDenials();
      } else {
        toast.error(data.message || 'Auto-correction failed');
      }
    } catch (error) {
      toast.error('Auto-correction failed');
    }
  };

  // Initial data load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter functions
  const filteredClaims = claims.filter(claim => {
    const matchesSearch = claim.claimNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         claim.patientName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || claim.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = payment.paymentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.payerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredDenials = denials.filter(denial => {
    const matchesSearch = denial.claimNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         denial.patientName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || denial.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
      case 'posted':
      case 'resolved':
        return 'bg-green-500';
      case 'denied':
      case 'exception':
        return 'bg-red-500';
      case 'processing':
      case 'in_progress':
        return 'bg-blue-500';
      case 'submitted':
      case 'pending':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
      case 'stat':
        return 'bg-red-100 text-red-800';
      case 'urgent':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Advanced RCM Workflow</h1>
          <p className="text-muted-foreground">Comprehensive revenue cycle management dashboard</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* KPI Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Net Collection Rate</p>
                  <p className="text-2xl font-bold">{metrics.netCollectionRate.toFixed(1)}%</p>
                  <div className="flex items-center gap-1 text-sm text-green-600">
                    <TrendingUp className="h-3 w-3" />
                    +2.3%
                  </div>
                </div>
                <Target className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Days in A/R</p>
                  <p className="text-2xl font-bold">{metrics.daysInAR}</p>
                  <div className="flex items-center gap-1 text-sm text-green-600">
                    <TrendingDown className="h-3 w-3" />
                    -5.2%
                  </div>
                </div>
                <Clock className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">First Pass Rate</p>
                  <p className="text-2xl font-bold">{metrics.firstPassRate.toFixed(1)}%</p>
                  <div className="flex items-center gap-1 text-sm text-green-600">
                    <TrendingUp className="h-3 w-3" />
                    +1.8%
                  </div>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Denial Rate</p>
                  <p className="text-2xl font-bold">{metrics.denialRate.toFixed(1)}%</p>
                  <div className="flex items-center gap-1 text-sm text-green-600">
                    <TrendingDown className="h-3 w-3" />
                    -0.8%
                  </div>
                </div>
                <AlertTriangle className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="claims">Claims</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="denials">Denials</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          {/* Revenue Overview */}
          {metrics && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Revenue Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>Total Revenue</span>
                      <span className="font-bold">${metrics.totalRevenue.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Total Collected</span>
                      <span className="font-bold text-green-600">${metrics.totalCollected.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Outstanding A/R</span>
                      <span className="font-bold text-orange-600">${metrics.outstandingAR.toLocaleString()}</span>
                    </div>
                    <Progress 
                      value={metrics.totalRevenue > 0 ? (metrics.totalCollected / metrics.totalRevenue) * 100 : 0} 
                      className="w-full" 
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Quick Stats
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Claims Submitted</span>
                      <Badge variant="secondary">{metrics.claimsSubmitted}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Claims Paid</span>
                      <Badge className="bg-green-500">{metrics.claimsPaid}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Claims Denied</span>
                      <Badge className="bg-red-500">{metrics.claimsDenied}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Auto-Posted Rate</span>
                      <Badge variant="outline">{metrics.autoPostedRate}%</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="claims" className="space-y-4">
          {/* Claims Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Claims Management
              </CardTitle>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  <Input
                    placeholder="Search claims..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64"
                  />
                </div>
                <select 
                  value={statusFilter} 
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border rounded-md px-3 py-2"
                >
                  <option value="all">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="submitted">Submitted</option>
                  <option value="processing">Processing</option>
                  <option value="paid">Paid</option>
                  <option value="denied">Denied</option>
                </select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredClaims.map((claim) => (
                  <div key={claim.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{claim.claimNumber}</Badge>
                        <span className="font-medium">{claim.patientName}</span>
                        <Badge className={getStatusColor(claim.status)}>
                          {claim.status}
                        </Badge>
                        {claim.priority !== 'normal' && (
                          <Badge variant="outline" className={getPriorityColor(claim.priority)}>
                            {claim.priority}
                          </Badge>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">${claim.totalCharges.toFixed(2)}</p>
                        <p className="text-sm text-muted-foreground">{claim.daysOutstanding} days</p>
                      </div>
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      {claim.payerName} • Service: {new Date(claim.serviceDate).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          {/* Payment Processing */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Processing
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button size="sm">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload ERA
                </Button>
                <Button size="sm" variant="outline">
                  <Bot className="h-4 w-4 mr-2" />
                  Auto-Post All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredPayments.map((payment) => (
                  <div key={payment.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{payment.paymentNumber}</Badge>
                        <span className="font-medium">{payment.payerName}</span>
                        <Badge className={getStatusColor(payment.status)}>
                          {payment.status}
                        </Badge>
                        {payment.autoPosted && (
                          <Badge variant="secondary">
                            <Bot className="h-3 w-3 mr-1" />
                            Auto-Posted
                          </Badge>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">${payment.totalAmount.toFixed(2)}</p>
                        <p className="text-sm text-muted-foreground">{payment.lineItemCount} items</p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        Check: {payment.checkNumber} • Date: {new Date(payment.checkDate).toLocaleDateString()}
                      </div>
                      {payment.status === 'pending' && (
                        <Button 
                          size="sm" 
                          onClick={() => handleAutoPost(payment.id)}
                        >
                          <Zap className="h-4 w-4 mr-2" />
                          Auto-Post
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="denials" className="space-y-4">
          {/* Denial Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                AI-Powered Denial Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredDenials.map((denial) => (
                  <div key={denial.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{denial.claimNumber}</Badge>
                        <span className="font-medium">{denial.patientName}</span>
                        <Badge className={getPriorityColor(denial.priority)}>
                          {denial.priority}
                        </Badge>
                        <Badge className={getStatusColor(denial.status)}>
                          {denial.status}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">${denial.amount.toFixed(2)}</p>
                        <p className="text-sm text-muted-foreground">{denial.denialDate}</p>
                      </div>
                    </div>

                    <div className="bg-muted p-3 rounded-md">
                      <p className="text-sm">
                        <span className="font-medium">{denial.denialCode}:</span> {denial.denialReason}
                      </p>
                    </div>

                    {denial.autoCorrection && (
                      <div className="bg-blue-50 p-3 rounded-md border-l-4 border-blue-500">
                        <div className="flex items-center gap-2 mb-2">
                          <Zap className="h-4 w-4 text-blue-600" />
                          <span className="font-medium text-blue-800">Auto-Correction</span>
                        </div>
                        <p className="text-sm text-blue-700">{denial.autoCorrection}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => handleAutoCorrection(denial.id)}
                        disabled={denial.status !== 'new'}
                      >
                        <Bot className="h-4 w-4 mr-2" />
                        Auto-Correct
                      </Button>
                      <Button size="sm" variant="outline">
                        <FileText className="h-4 w-4 mr-2" />
                        Generate Appeal
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdvancedRCMWorkflow;