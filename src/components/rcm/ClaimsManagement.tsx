import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
  MoreHorizontal,
  Eye,
  Edit,
  RefreshCw,
  Download,
  Upload,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
  Phone,
  Mail
} from 'lucide-react';
import { getClaimsStatusAPI, updateClaimStatusAPI, bulkClaimStatusUpdateAPI, getClaimDetailsAPI } from '@/services/operations/rcm';

interface Claim {
  claim_id: string;
  patient_name: string;
  service_date: string;
  submission_date: string;
  status: number;
  status_text: string;
  procedure_code: string;
  total_amount: number;
  paid_amount: number;
  claim_md_tracking_id?: string;
  payer_name?: string;
  processing_days: number;
  priority: string;
}

interface ClaimDetails {
  claim: any;
  history: any[];
  diagnoses: any[];
  recommendations: any[];
}

const ClaimsManagement: React.FC = () => {
  const { token } = useSelector((state: any) => state.auth);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClaims, setSelectedClaims] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedClaim, setSelectedClaim] = useState<ClaimDetails | null>(null);
  const [showClaimDetails, setShowClaimDetails] = useState(false);

  const fetchClaims = async () => {
    try {
      setLoading(true);
      const response = await getClaimsStatusAPI(token, {
        page: currentPage,
        limit: 20,
        status: statusFilter,
        search: searchTerm,
        priority: priorityFilter
      });
      
      if (response.success) {
        setClaims(response.data);
        setTotalPages(response.pagination.totalPages);
      }
    } catch (error) {
      console.error('Error fetching claims:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimSelection = (claimId: string, checked: boolean) => {
    if (checked) {
      setSelectedClaims([...selectedClaims, claimId]);
    } else {
      setSelectedClaims(selectedClaims.filter(id => id !== claimId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedClaims(claims.map(claim => claim.claim_id));
    } else {
      setSelectedClaims([]);
    }
  };

  const handleStatusUpdate = async (claimId: string, newStatus: number) => {
    try {
      const response = await updateClaimStatusAPI(token, claimId, {
        status: newStatus,
        notes: `Status updated to ${getStatusText(newStatus)}`
      });
      
      if (response.success) {
        fetchClaims();
      }
    } catch (error) {
      console.error('Error updating claim status:', error);
    }
  };

  const handleBulkStatusUpdate = async (newStatus: number) => {
    if (selectedClaims.length === 0) return;
    
    try {
      const response = await bulkClaimStatusUpdateAPI(token, {
        claimIds: selectedClaims,
        status: newStatus
      });
      
      if (response.success) {
        setSelectedClaims([]);
        fetchClaims();
      }
    } catch (error) {
      console.error('Error bulk updating claims:', error);
    }
  };

  const handleViewClaimDetails = async (claimId: string) => {
    try {
      const response = await getClaimDetailsAPI(token, claimId);
      if (response.success) {
        setSelectedClaim(response.data);
        setShowClaimDetails(true);
      }
    } catch (error) {
      console.error('Error fetching claim details:', error);
    }
  };

  const getStatusBadge = (status: number, statusText: string) => {
    const statusConfig = {
      0: { color: 'bg-gray-100 text-gray-800', icon: <FileText className="h-3 w-3" /> },
      1: { color: 'bg-blue-100 text-blue-800', icon: <Clock className="h-3 w-3" /> },
      2: { color: 'bg-green-100 text-green-800', icon: <CheckCircle className="h-3 w-3" /> },
      3: { color: 'bg-red-100 text-red-800', icon: <XCircle className="h-3 w-3" /> },
      4: { color: 'bg-yellow-100 text-yellow-800', icon: <RefreshCw className="h-3 w-3" /> }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig[0];
    
    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        {config.icon}
        {statusText}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string, processingDays: number) => {
    if (processingDays > 30) {
      return <Badge className="bg-red-100 text-red-800">Urgent</Badge>;
    } else if (processingDays > 14) {
      return <Badge className="bg-yellow-100 text-yellow-800">High</Badge>;
    }
    return <Badge className="bg-green-100 text-green-800">Normal</Badge>;
  };

  const getStatusText = (status: number) => {
    const statusMap = {
      0: 'Draft',
      1: 'Submitted',
      2: 'Paid',
      3: 'Denied',
      4: 'Appealed'
    };
    return statusMap[status as keyof typeof statusMap] || 'Unknown';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  useEffect(() => {
    fetchClaims();
  }, [currentPage, statusFilter, searchTerm, priorityFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Claims Management</h1>
          <p className="text-muted-foreground">
            Track and manage claim submissions and status updates
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Import Claims
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by patient name, claim ID, or tracking ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
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
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchClaims}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedClaims.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {selectedClaims.length} claim(s) selected
              </span>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkStatusUpdate(1)}
                >
                  Mark as Submitted
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkStatusUpdate(2)}
                >
                  Mark as Paid
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkStatusUpdate(3)}
                >
                  Mark as Denied
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Claims Table */}
      <Card>
        <CardHeader>
          <CardTitle>Claims List</CardTitle>
          <CardDescription>
            Manage and track all claim submissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading claims...</span>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedClaims.length === claims.length && claims.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Service Date</TableHead>
                    <TableHead>Procedure</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Payer</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {claims.map((claim) => (
                    <TableRow key={claim.claim_id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedClaims.includes(claim.claim_id)}
                          onCheckedChange={(checked) => 
                            handleClaimSelection(claim.claim_id, checked as boolean)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{claim.patient_name}</div>
                          <div className="text-sm text-muted-foreground">
                            ID: {claim.claim_id}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(claim.service_date)}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{claim.procedure_code}</div>
                          {claim.claim_md_tracking_id && (
                            <div className="text-sm text-muted-foreground">
                              {claim.claim_md_tracking_id}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {formatCurrency(claim.total_amount)}
                          </div>
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
                        <span className={claim.processing_days > 30 ? 'text-red-600 font-medium' : ''}>
                          {claim.processing_days}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{claim.payer_name || 'Self Pay'}</span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => handleViewClaimDetails(claim.claim_id)}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleStatusUpdate(claim.claim_id, 1)}
                            >
                              Mark as Submitted
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleStatusUpdate(claim.claim_id, 2)}
                            >
                              Mark as Paid
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleStatusUpdate(claim.claim_id, 3)}
                            >
                              Mark as Denied
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleStatusUpdate(claim.claim_id, 4)}
                            >
                              Mark as Appealed
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {claims.length} of {totalPages * 20} claims
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Claim Details Dialog */}
      <Dialog open={showClaimDetails} onOpenChange={setShowClaimDetails}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Claim Details</DialogTitle>
            <DialogDescription>
              Detailed information about the selected claim
            </DialogDescription>
          </DialogHeader>
          
          {selectedClaim && (
            <div className="space-y-6">
              {/* Claim Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Claim Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Claim ID:</span>
                      <span className="font-medium">{selectedClaim.claim.claim_id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Patient:</span>
                      <span className="font-medium">{selectedClaim.claim.patient_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Service Date:</span>
                      <span>{formatDate(selectedClaim.claim.service_date)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Procedure:</span>
                      <span>{selectedClaim.claim.procedure_code}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Amount:</span>
                      <span className="font-medium">
                        {formatCurrency(selectedClaim.claim.total_amount)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      {getStatusBadge(selectedClaim.claim.status, selectedClaim.claim.status_text)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Patient Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">DOB:</span>
                      <span>{formatDate(selectedClaim.claim.dob)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Phone:</span>
                      <span>{selectedClaim.claim.phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email:</span>
                      <span>{selectedClaim.claim.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Payer:</span>
                      <span>{selectedClaim.claim.payer_name || 'Self Pay'}</span>
                    </div>
                    {selectedClaim.claim.policy_number && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Policy #:</span>
                        <span>{selectedClaim.claim.policy_number}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Claim History */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Claim History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {selectedClaim.history.map((event, index) => (
                      <div key={index} className="flex items-start space-x-3 pb-3 border-b last:border-b-0">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{event.action}</p>
                              <p className="text-sm text-muted-foreground">{event.notes}</p>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {formatDate(event.date)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Recommendations */}
              {selectedClaim.recommendations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {selectedClaim.recommendations.map((rec, index) => (
                        <div key={index} className="flex items-start space-x-3">
                          <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                          <div>
                            <p className="font-medium">{rec.type}</p>
                            <p className="text-sm text-muted-foreground">{rec.message}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2">
                <Button variant="outline">
                  <Phone className="h-4 w-4 mr-2" />
                  Contact Patient
                </Button>
                <Button variant="outline">
                  <Mail className="h-4 w-4 mr-2" />
                  Send Statement
                </Button>
                <Button>
                  <Edit className="h-4 w-4 mr-2" />
                  Update Status
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