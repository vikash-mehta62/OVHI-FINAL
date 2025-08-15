import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DollarSign,
  FileText,
  MailCheck,
  Download,
  CreditCard,
  Calendar,
  Eye,
  Send,
  Printer,
  Plus
} from 'lucide-react';
import { toast } from 'sonner';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import {
  getPatientAccountSummaryAPI,
  getPatientClaimsAPI,
  getPatientPaymentsAPI,
  getPatientStatementsAPI,
  recordPatientPaymentAPI,
  generatePatientStatementAPI,
  downloadPatientStatementAPI,
  resendPatientStatementAPI
} from '@/services/operations/patientAccount';

interface PatientAccountManagerProps {
  patientId: string;
  patientName: string;
}

interface AccountSummary {
  totalCharges: number;
  totalPayments: number;
  outstandingBalance: number;
  insurancePending: number;
}

interface Claim {
  id: string;
  claimNumber: string;
  serviceDate: string;
  procedure: string;
  billedAmount: number;
  paidAmount: number;
  status: 'paid' | 'pending' | 'denied' | 'processing';
  insuranceCompany: string;
}

interface Payment {
  id: string;
  paymentNumber: string;
  date: string;
  method: string;
  amount: number;
  status: 'completed' | 'pending' | 'failed';
  appliedTo: string;
  type: 'patient' | 'insurance';
}

interface Statement {
  id: string;
  statementNumber: string;
  generatedDate: string;
  balance: number;
  status: 'sent' | 'paid' | 'overdue';
  dueDate: string;
}

const PatientAccountManager: React.FC<PatientAccountManagerProps> = ({ 
  patientId, 
  patientName 
}) => {
  const { token } = useSelector((state: RootState) => state.auth);
  const [loading, setLoading] = useState(false);
  const [accountSummary, setAccountSummary] = useState<AccountSummary>({
    totalCharges: 2450.00,
    totalPayments: 1850.00,
    outstandingBalance: 600.00,
    insurancePending: 150.00
  });

  const [claims, setClaims] = useState<Claim[]>([
    {
      id: '1',
      claimNumber: 'CLM-2024-001',
      serviceDate: '2024-01-15',
      procedure: '99213 - Office Visit',
      billedAmount: 250.00,
      paidAmount: 200.00,
      status: 'paid',
      insuranceCompany: 'Blue Cross Blue Shield'
    },
    {
      id: '2',
      claimNumber: 'CLM-2024-002',
      serviceDate: '2024-02-10',
      procedure: '99214 - Office Visit',
      billedAmount: 350.00,
      paidAmount: 0,
      status: 'pending',
      insuranceCompany: 'Aetna'
    }
  ]);

  const [payments, setPayments] = useState<Payment[]>([
    {
      id: '1',
      paymentNumber: 'PAY-2024-001',
      date: '2024-01-20',
      method: 'Credit Card',
      amount: 50.00,
      status: 'completed',
      appliedTo: 'Copay - Visit 01/15',
      type: 'patient'
    },
    {
      id: '2',
      paymentNumber: 'INS-2024-001',
      date: '2024-01-25',
      method: 'Insurance Payment',
      amount: 200.00,
      status: 'completed',
      appliedTo: 'CLM-2024-001',
      type: 'insurance'
    }
  ]);

  const [statements, setStatements] = useState<Statement[]>([
    {
      id: '1',
      statementNumber: 'STMT-2024-001',
      generatedDate: '2024-02-01',
      balance: 600.00,
      status: 'sent',
      dueDate: '2024-03-01'
    },
    {
      id: '2',
      statementNumber: 'STMT-2024-002',
      generatedDate: '2024-01-01',
      balance: 250.00,
      status: 'paid',
      dueDate: '2024-02-01'
    }
  ]);

  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showStatementDialog, setShowStatementDialog] = useState(false);

  // Load patient account data
  useEffect(() => {
    const loadAccountData = async () => {
      if (!token || !patientId) return;
      
      setLoading(true);
      try {
        // Load account summary
        const summaryResponse = await getPatientAccountSummaryAPI(patientId, token);
        if (summaryResponse?.success) {
          setAccountSummary(summaryResponse.data);
        }

        // Load claims
        const claimsResponse = await getPatientClaimsAPI(patientId, token);
        if (claimsResponse?.success) {
          setClaims(claimsResponse.data);
        }

        // Load payments
        const paymentsResponse = await getPatientPaymentsAPI(patientId, token);
        if (paymentsResponse?.success) {
          setPayments(paymentsResponse.data);
        }

        // Load statements
        const statementsResponse = await getPatientStatementsAPI(patientId, token);
        if (statementsResponse?.success) {
          setStatements(statementsResponse.data);
        }
      } catch (error) {
        console.error('Error loading account data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAccountData();
  }, [patientId, token]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'denied':
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'overdue':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleRecordPayment = async (paymentData: any) => {
    if (!token) return;
    
    try {
      const response = await recordPatientPaymentAPI({
        ...paymentData,
        patientId
      }, token);
      
      if (response?.success) {
        setShowPaymentDialog(false);
        // Reload payments data
        const paymentsResponse = await getPatientPaymentsAPI(patientId, token);
        if (paymentsResponse?.success) {
          setPayments(paymentsResponse.data);
        }
      }
    } catch (error) {
      console.error('Error recording payment:', error);
    }
  };

  const handleGenerateStatement = async (statementData: any) => {
    if (!token) return;
    
    try {
      const response = await generatePatientStatementAPI({
        ...statementData,
        patientId,
        patientName
      }, token);
      
      if (response?.success) {
        setShowStatementDialog(false);
        // Reload statements data
        const statementsResponse = await getPatientStatementsAPI(patientId, token);
        if (statementsResponse?.success) {
          setStatements(statementsResponse.data);
        }
      }
    } catch (error) {
      console.error('Error generating statement:', error);
    }
  };

  const handleDownloadStatement = async (statementId: string) => {
    if (!token) return;
    
    try {
      await downloadPatientStatementAPI(statementId, token);
    } catch (error) {
      console.error('Error downloading statement:', error);
    }
  };

  const handleResendStatement = async (statementId: string) => {
    if (!token) return;
    
    try {
      await resendPatientStatementAPI(statementId, token);
    } catch (error) {
      console.error('Error resending statement:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Account Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Account Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  ${accountSummary.totalCharges.toFixed(2)}
                </div>
                <div className="text-sm text-gray-600">Total Charges</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  ${accountSummary.totalPayments.toFixed(2)}
                </div>
                <div className="text-sm text-gray-600">Total Payments</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  ${accountSummary.outstandingBalance.toFixed(2)}
                </div>
                <div className="text-sm text-gray-600">Outstanding Balance</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  ${accountSummary.insurancePending.toFixed(2)}
                </div>
                <div className="text-sm text-gray-600">Insurance Pending</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Dialog open={showStatementDialog} onOpenChange={setShowStatementDialog}>
              <DialogTrigger asChild>
                <Button className="w-full justify-start" variant="outline">
                  <MailCheck className="h-4 w-4 mr-2" />
                  Send Patient Statement
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Generate Patient Statement</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Patient</Label>
                    <Input value={patientName} disabled />
                  </div>
                  <div>
                    <Label>Statement Date</Label>
                    <Input type="date" defaultValue={new Date().toISOString().split('T')[0]} />
                  </div>
                  <div>
                    <Label>Due Date</Label>
                    <Input type="date" />
                  </div>
                  <div>
                    <Label>Include Services From</Label>
                    <Select defaultValue="all">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Outstanding</SelectItem>
                        <SelectItem value="30days">Last 30 Days</SelectItem>
                        <SelectItem value="60days">Last 60 Days</SelectItem>
                        <SelectItem value="90days">Last 90 Days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Additional Message</Label>
                    <Textarea placeholder="Optional message to include with the statement..." />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                    onClick={() => {
                      // This would normally collect form data
                      const formData = {
                        statementDate: new Date().toISOString().split('T')[0],
                        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                        includeServices: 'all',
                        message: '',
                        sendEmail: true
                      };
                      handleGenerateStatement(formData);
                    }} 
                    className="flex-1"
                  >
                      <Send className="h-4 w-4 mr-2" />
                      Generate & Send
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        const formData = {
                          statementDate: new Date().toISOString().split('T')[0],
                          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                          includeServices: 'all',
                          message: '',
                          sendEmail: false
                        };
                        handleGenerateStatement(formData);
                      }}
                    >
                      <Printer className="h-4 w-4 mr-2" />
                      Print Only
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Button className="w-full justify-start" variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Download Account Summary
            </Button>

            <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
              <DialogTrigger asChild>
                <Button className="w-full justify-start" variant="outline">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Record Payment
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Record Payment</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Payment Amount</Label>
                    <Input type="number" step="0.01" placeholder="0.00" />
                  </div>
                  <div>
                    <Label>Payment Method</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="check">Check</SelectItem>
                        <SelectItem value="credit">Credit Card</SelectItem>
                        <SelectItem value="debit">Debit Card</SelectItem>
                        <SelectItem value="insurance">Insurance Payment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Payment Date</Label>
                    <Input type="date" defaultValue={new Date().toISOString().split('T')[0]} />
                  </div>
                  <div>
                    <Label>Notes</Label>
                    <Textarea placeholder="Payment notes..." />
                  </div>
                  <Button 
                    onClick={() => {
                      // This would normally collect form data
                      const formData = {
                        amount: 100.00, // Get from form
                        method: 'credit', // Get from form
                        date: new Date().toISOString().split('T')[0], // Get from form
                        notes: '' // Get from form
                      };
                      handleRecordPayment(formData);
                    }} 
                    className="w-full"
                  >
                    Record Payment
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Button className="w-full justify-start" variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              Create Invoice
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Claims and Payments Tabs */}
      <Tabs defaultValue="claims" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="claims">Claims</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="statements">Statements</TabsTrigger>
        </TabsList>

        <TabsContent value="claims" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Insurance Claims</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {claims.map((claim) => (
                  <div key={claim.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-semibold">{claim.claimNumber}</div>
                        <div className="text-sm text-gray-600">Service Date: {claim.serviceDate}</div>
                        <div className="text-sm text-gray-600">Insurance: {claim.insuranceCompany}</div>
                      </div>
                      <Badge className={getStatusColor(claim.status)}>
                        {claim.status.charAt(0).toUpperCase() + claim.status.slice(1)}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-gray-600">Procedure</div>
                        <div>{claim.procedure}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Billed Amount</div>
                        <div>${claim.billedAmount.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Paid Amount</div>
                        <div>${claim.paidAmount.toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {payments.map((payment) => (
                  <div key={payment.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-semibold">{payment.paymentNumber}</div>
                        <div className="text-sm text-gray-600">Date: {payment.date}</div>
                      </div>
                      <div className="flex gap-2">
                        <Badge className={getStatusColor(payment.status)}>
                          {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                        </Badge>
                        <Badge variant="outline">
                          {payment.type.charAt(0).toUpperCase() + payment.type.slice(1)}
                        </Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-gray-600">Method</div>
                        <div>{payment.method}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Amount</div>
                        <div>${payment.amount.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Applied To</div>
                        <div>{payment.appliedTo}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="statements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Patient Statements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {statements.map((statement) => (
                  <div key={statement.id} className="flex justify-between items-center p-4 border rounded-lg">
                    <div>
                      <div className="font-semibold">{statement.statementNumber}</div>
                      <div className="text-sm text-gray-600">Generated: {statement.generatedDate}</div>
                      <div className="text-sm text-gray-600">Due: {statement.dueDate}</div>
                      <div className="text-sm text-gray-600">Balance: ${statement.balance.toFixed(2)}</div>
                    </div>
                    <div className="flex gap-2 items-center">
                      <Badge className={getStatusColor(statement.status)}>
                        {statement.status.charAt(0).toUpperCase() + statement.status.slice(1)}
                      </Badge>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleDownloadStatement(statement.id)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                      {statement.status !== 'paid' && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleResendStatement(statement.id)}
                        >
                          <MailCheck className="h-4 w-4 mr-1" />
                          Resend
                        </Button>
                      )}
                    </div>
                  </div>
                ))}

                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold mb-2">Generate New Statement</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Create and send a new patient statement with current account balance and recent activity.
                  </p>
                  <Button 
                    className="w-full"
                    onClick={() => setShowStatementDialog(true)}
                  >
                    <MailCheck className="h-4 w-4 mr-2" />
                    Generate & Send Statement
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PatientAccountManager;