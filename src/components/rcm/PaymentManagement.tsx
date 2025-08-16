import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { 
  DollarSign, 
  FileText, 
  Upload, 
  Download, 
  CheckCircle, 
  AlertCircle,
  Clock,
  RefreshCw,
  Search,
  Filter,
  Eye,
  Edit,
  Plus,
  CreditCard,
  Building,
  Calendar,
  TrendingUp
} from 'lucide-react';
import { formatCurrency } from '@/utils/billingUtils';

interface ERAFile {
  id: number;
  fileName: string;
  payerName: string;
  checkNumber: string;
  checkDate: string;
  checkAmount: number;
  totalClaims: number;
  processedClaims: number;
  unmatchedClaims: number;
  processingStatus: string;
  uploadDate: string;
}

interface Payment {
  id: number;
  paymentType: string;
  payerName: string;
  claimNumber: string;
  patientName: string;
  paymentAmount: number;
  paymentDate: string;
  paymentMethod: string;
  checkNumber: string;
  referenceNumber: string;
  postingStatus: string;
}

interface Reconciliation {
  id: number;
  eraFileId: number;
  fileName: string;
  totalLines: number;
  matchedLines: number;
  unmatchedLines: number;
  unmatchedAmount: number;
  reconciliationDate: string;
  status: string;
}

const PaymentManagement: React.FC = () => {
  const [eraFiles, setEraFiles] = useState<ERAFile[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [reconciliations, setReconciliations] = useState<Reconciliation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    fetchERAFiles();
    fetchPayments();
    fetchReconciliations();
  }, []);

  const fetchERAFiles = async () => {
    try {
      const response = await fetch('/api/v1/rcm/era-files', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setEraFiles(data.data);
      } else {
        // Mock data for development
        setEraFiles(getMockERAFiles());
      }
    } catch (error) {
      console.error('Failed to fetch ERA files:', error);
      setEraFiles(getMockERAFiles());
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async () => {
    try {
      const response = await fetch('/api/v1/rcm/payments', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPayments(data.data);
      } else {
        // Mock data for development
        setPayments(getMockPayments());
      }
    } catch (error) {
      console.error('Failed to fetch payments:', error);
      setPayments(getMockPayments());
    }
  };

  const fetchReconciliations = async () => {
    try {
      const response = await fetch('/api/v1/rcm/reconciliations', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setReconciliations(data.data);
      } else {
        // Mock data for development
        setReconciliations(getMockReconciliations());
      }
    } catch (error) {
      console.error('Failed to fetch reconciliations:', error);
      setReconciliations(getMockReconciliations());
    }
  };

  const getMockERAFiles = (): ERAFile[] => [
    {
      id: 1,
      fileName: 'ERA_BCBS_20240115.835',
      payerName: 'Blue Cross Blue Shield',
      checkNumber: 'CHK001234',
      checkDate: '2024-01-15',
      checkAmount: 15750.00,
      totalClaims: 25,
      processedClaims: 23,
      unmatchedClaims: 2,
      processingStatus: 'completed',
      uploadDate: '2024-01-16'
    },
    {
      id: 2,
      fileName: 'ERA_MEDICARE_20240114.835',
      payerName: 'Medicare',
      checkNumber: 'MED567890',
      checkDate: '2024-01-14',
      checkAmount: 8920.50,
      totalClaims: 18,
      processedClaims: 15,
      unmatchedClaims: 3,
      processingStatus: 'processing',
      uploadDate: '2024-01-15'
    },
    {
      id: 3,
      fileName: 'ERA_AETNA_20240113.835',
      payerName: 'Aetna',
      checkNumber: 'AET445566',
      checkDate: '2024-01-13',
      checkAmount: 12300.75,
      totalClaims: 20,
      processedClaims: 20,
      unmatchedClaims: 0,
      processingStatus: 'completed',
      uploadDate: '2024-01-14'
    }
  ];

  const getMockPayments = (): Payment[] => [
    {
      id: 1,
      paymentType: 'insurance',
      payerName: 'Blue Cross Blue Shield',
      claimNumber: 'CLM-2024-001',
      patientName: 'John Smith',
      paymentAmount: 250.00,
      paymentDate: '2024-01-15',
      paymentMethod: 'eft',
      checkNumber: 'CHK001234',
      referenceNumber: 'REF123456',
      postingStatus: 'posted'
    },
    {
      id: 2,
      paymentType: 'insurance',
      payerName: 'Medicare',
      claimNumber: 'CLM-2024-002',
      patientName: 'Mary Davis',
      paymentAmount: 180.50,
      paymentDate: '2024-01-14',
      paymentMethod: 'check',
      checkNumber: 'MED567890',
      referenceNumber: 'REF789012',
      postingStatus: 'posted'
    },
    {
      id: 3,
      paymentType: 'patient',
      payerName: 'Self Pay',
      claimNumber: 'CLM-2024-003',
      patientName: 'Robert Brown',
      paymentAmount: 75.00,
      paymentDate: '2024-01-13',
      paymentMethod: 'credit_card',
      checkNumber: '',
      referenceNumber: 'CC345678',
      postingStatus: 'pending'
    }
  ];

  const getMockReconciliations = (): Reconciliation[] => [
    {
      id: 1,
      eraFileId: 1,
      fileName: 'ERA_BCBS_20240115.835',
      totalLines: 25,
      matchedLines: 23,
      unmatchedLines: 2,
      unmatchedAmount: 450.00,
      reconciliationDate: '2024-01-16',
      status: 'completed'
    },
    {
      id: 2,
      eraFileId: 2,
      fileName: 'ERA_MEDICARE_20240114.835',
      totalLines: 18,
      matchedLines: 15,
      unmatchedLines: 3,
      unmatchedAmount: 320.50,
      reconciliationDate: '2024-01-15',
      status: 'pending'
    }
  ];

  const uploadERAFile = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('eraFile', selectedFile);

    try {
      const response = await fetch('/api/v1/rcm/era-files/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (response.ok) {
        fetchERAFiles();
        setShowUploadDialog(false);
        setSelectedFile(null);
      }
    } catch (error) {
      console.error('Failed to upload ERA file:', error);
    }
  };

  const processERAFile = async (fileId: number) => {
    try {
      const response = await fetch(`/api/v1/rcm/era-files/${fileId}/process`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        fetchERAFiles();
        fetchPayments();
      }
    } catch (error) {
      console.error('Failed to process ERA file:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      processing: { color: 'bg-blue-100 text-blue-800', label: 'Processing' },
      completed: { color: 'bg-green-100 text-green-800', label: 'Completed' },
      error: { color: 'bg-red-100 text-red-800', label: 'Error' },
      posted: { color: 'bg-green-100 text-green-800', label: 'Posted' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const paymentStats = {
    totalPayments: payments.reduce((sum, p) => sum + p.paymentAmount, 0),
    postedPayments: payments.filter(p => p.postingStatus === 'posted').length,
    pendingPayments: payments.filter(p => p.postingStatus === 'pending').length,
    totalERAFiles: eraFiles.length,
    processedFiles: eraFiles.filter(f => f.processingStatus === 'completed').length,
    unmatchedAmount: reconciliations.reduce((sum, r) => sum + r.unmatchedAmount, 0)
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
          <h2 className="text-2xl font-bold">Payment Management</h2>
          <p className="text-muted-foreground">
            ERA processing, payment posting, and reconciliation
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={() => setShowUploadDialog(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload ERA
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={() => fetchERAFiles()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(paymentStats.totalPayments)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Posted</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{paymentStats.postedPayments}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{paymentStats.pendingPayments}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ERA Files</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{paymentStats.totalERAFiles}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processed</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{paymentStats.processedFiles}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unmatched</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(paymentStats.unmatchedAmount)}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="era-files" className="space-y-4">
        <TabsList>
          <TabsTrigger value="era-files">ERA Files</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="reconciliation">Reconciliation</TabsTrigger>
          <TabsTrigger value="manual-posting">Manual Posting</TabsTrigger>
        </TabsList>

        <TabsContent value="era-files" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>ERA Files</CardTitle>
              <CardDescription>Electronic Remittance Advice files processing status</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File Name</TableHead>
                    <TableHead>Payer</TableHead>
                    <TableHead>Check #</TableHead>
                    <TableHead>Check Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Claims</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eraFiles.map((file) => (
                    <TableRow key={file.id}>
                      <TableCell className="font-medium">{file.fileName}</TableCell>
                      <TableCell>{file.payerName}</TableCell>
                      <TableCell>{file.checkNumber}</TableCell>
                      <TableCell>{file.checkDate}</TableCell>
                      <TableCell>{formatCurrency(file.checkAmount)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {file.processedClaims}/{file.totalClaims}
                          {file.unmatchedClaims > 0 && (
                            <span className="text-red-600 ml-1">
                              ({file.unmatchedClaims} unmatched)
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="w-20">
                          <Progress 
                            value={(file.processedClaims / file.totalClaims) * 100} 
                            className="h-2"
                          />
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(file.processingStatus)}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => processERAFile(file.id)}
                            disabled={file.processingStatus === 'processing'}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
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

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment Postings</CardTitle>
              <CardDescription>Insurance and patient payments</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Payer</TableHead>
                    <TableHead>Claim #</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <Badge variant={payment.paymentType === 'insurance' ? 'default' : 'secondary'}>
                          {payment.paymentType}
                        </Badge>
                      </TableCell>
                      <TableCell>{payment.payerName}</TableCell>
                      <TableCell>{payment.claimNumber}</TableCell>
                      <TableCell>{payment.patientName}</TableCell>
                      <TableCell>{formatCurrency(payment.paymentAmount)}</TableCell>
                      <TableCell>{payment.paymentDate}</TableCell>
                      <TableCell className="capitalize">{payment.paymentMethod.replace('_', ' ')}</TableCell>
                      <TableCell>{payment.referenceNumber || payment.checkNumber}</TableCell>
                      <TableCell>{getStatusBadge(payment.postingStatus)}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
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

        <TabsContent value="reconciliation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Reconciliation Reports</CardTitle>
              <CardDescription>ERA file matching and unmatched items</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File Name</TableHead>
                    <TableHead>Total Lines</TableHead>
                    <TableHead>Matched</TableHead>
                    <TableHead>Unmatched</TableHead>
                    <TableHead>Unmatched Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reconciliations.map((recon) => (
                    <TableRow key={recon.id}>
                      <TableCell className="font-medium">{recon.fileName}</TableCell>
                      <TableCell>{recon.totalLines}</TableCell>
                      <TableCell className="text-green-600">{recon.matchedLines}</TableCell>
                      <TableCell className="text-red-600">{recon.unmatchedLines}</TableCell>
                      <TableCell className="text-red-600">{formatCurrency(recon.unmatchedAmount)}</TableCell>
                      <TableCell>{recon.reconciliationDate}</TableCell>
                      <TableCell>{getStatusBadge(recon.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
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

        <TabsContent value="manual-posting" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Manual Payment Posting</CardTitle>
              <CardDescription>Post payments manually when ERA matching fails</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label>Claim Number</Label>
                    <Input placeholder="Enter claim number" />
                  </div>
                  <div>
                    <Label>Payment Amount</Label>
                    <Input type="number" placeholder="0.00" />
                  </div>
                  <div>
                    <Label>Payment Date</Label>
                    <Input type="date" />
                  </div>
                  <div>
                    <Label>Payment Method</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="check">Check</SelectItem>
                        <SelectItem value="eft">EFT</SelectItem>
                        <SelectItem value="credit_card">Credit Card</SelectItem>
                        <SelectItem value="cash">Cash</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label>Payer</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payer" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bcbs">Blue Cross Blue Shield</SelectItem>
                        <SelectItem value="medicare">Medicare</SelectItem>
                        <SelectItem value="aetna">Aetna</SelectItem>
                        <SelectItem value="self_pay">Self Pay</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Check/Reference Number</Label>
                    <Input placeholder="Enter reference number" />
                  </div>
                  <div>
                    <Label>Adjustment Amount</Label>
                    <Input type="number" placeholder="0.00" />
                  </div>
                  <div>
                    <Label>Notes</Label>
                    <Input placeholder="Optional notes" />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end mt-6">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Post Payment
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ERA Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload ERA File</DialogTitle>
            <DialogDescription>
              Upload an Electronic Remittance Advice (835) file for processing
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>ERA File (.835)</Label>
              <Input
                type="file"
                accept=".835,.txt"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
            </div>
            
            {selectedFile && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4" />
                  <span className="text-sm font-medium">{selectedFile.name}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Size: {(selectedFile.size / 1024).toFixed(1)} KB
                </div>
              </div>
            )}
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
                Cancel
              </Button>
              <Button onClick={uploadERAFile} disabled={!selectedFile}>
                <Upload className="h-4 w-4 mr-2" />
                Upload & Process
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentManagement;