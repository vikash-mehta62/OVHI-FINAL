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