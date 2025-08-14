import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  FileText, 
  Download, 
  Mail, 
  Send, 
  Eye, 
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import EnhancedPatientStatement from '@/components/billing/EnhancedPatientStatement';
import { toast } from 'sonner';

interface StatementSummary {
  id: string;
  statementDate: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status: 'paid' | 'partial' | 'pending' | 'overdue';
  sentMethod?: 'email' | 'mail' | 'fax';
  sentDate?: string;
}

interface PatientStatementManagerProps {
  patientId: string;
  patientName: string;
}

const PatientStatementManager: React.FC<PatientStatementManagerProps> = ({
  patientId,
  patientName
}) => {
  const [selectedStatement, setSelectedStatement] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Mock data - replace with actual API calls
  const statements: StatementSummary[] = [
    {
      id: 'STMT-2024-001',
      statementDate: '2024-01-15',
      dueDate: '2024-02-15',
      totalAmount: 450.00,
      paidAmount: 450.00,
      balanceAmount: 0.00,
      status: 'paid',
      sentMethod: 'email',
      sentDate: '2024-01-15'
    },
    {
      id: 'STMT-2024-002',
      statementDate: '2024-02-15',
      dueDate: '2024-03-15',
      totalAmount: 325.00,
      paidAmount: 125.00,
      balanceAmount: 200.00,
      status: 'partial',
      sentMethod: 'mail',
      sentDate: '2024-02-15'
    },
    {
      id: 'STMT-2024-003',
      statementDate: '2024-03-15',
      dueDate: '2024-04-15',
      totalAmount: 275.00,
      paidAmount: 0.00,
      balanceAmount: 275.00,
      status: 'overdue',
      sentMethod: 'email',
      sentDate: '2024-03-15'
    }
  ];

  const mockStatementData = {
    statementId: 'STMT-2024-003',
    statementDate: '2024-03-15',
    dueDate: '2024-04-15',
    patientInfo: {
      name: patientName,
      address: '123 Main Street',
      city: 'Anytown',
      state: 'CA',
      zipCode: '90210',
      phone: '(555) 123-4567',
      accountNumber: 'PAT-001'
    },
    practiceInfo: {
      name: 'Primary Care Associates',
      address: '456 Medical Center Drive',
      city: 'Anytown',
      state: 'CA',
      zipCode: '90211',
      phone: '(555) 987-6543',
      taxId: '12-3456789'
    },
    items: [
      {
        id: '1',
        date: '2024-03-01',
        description: 'Office Visit - Established Patient',
        cptCode: '99213',
        charges: 150.00,
        insurancePayment: 120.00,
        adjustments: 5.00,
        patientBalance: 25.00,
        status: 'pending' as const
      },
      {
        id: '2',
        date: '2024-03-01',
        description: 'Laboratory - Comprehensive Metabolic Panel',
        cptCode: '80053',
        charges: 75.00,
        insurancePayment: 60.00,
        adjustments: 0.00,
        patientBalance: 15.00,
        status: 'pending' as const
      },
      {
        id: '3',
        date: '2024-03-15',
        description: 'Telehealth Consultation',
        cptCode: '99214',
        charges: 200.00,
        insurancePayment: 160.00,
        adjustments: 5.00,
        patientBalance: 35.00,
        status: 'pending' as const
      }
    ],
    paymentHistory: [
      {
        id: '1',
        date: '2024-02-20',
        amount: 125.00,
        method: 'Credit Card',
        reference: 'CC-789123'
      }
    ],
    summary: {
      totalCharges: 425.00,
      totalInsurancePayments: 340.00,
      totalAdjustments: 10.00,
      previousBalance: 200.00,
      currentBalance: 275.00,
      minimumPayment: 50.00
    },
    paymentOptions: {
      online: true,
      phone: true,
      mail: true,
      paymentPlan: true
    },
    messages: [
      'Your account is past due. Please remit payment immediately to avoid collection action.',
      'Payment plans are available. Call our billing department to arrange.'
    ]
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'partial':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'overdue':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      paid: 'bg-green-100 text-green-800 border-green-200',
      partial: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      pending: 'bg-blue-100 text-blue-800 border-blue-200',
      overdue: 'bg-red-100 text-red-800 border-red-200'
    };
    
    return (
      <Badge className={variants[status as keyof typeof variants]}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  const handleGenerateStatement = async () => {
    setIsGenerating(true);
    // Simulate API call
    setTimeout(() => {
      setIsGenerating(false);
      toast.success('New statement generated successfully');
    }, 2000);
  };

  const handleSendStatement = (statementId: string, method: 'email' | 'mail' | 'fax') => {
    toast.success(`Statement ${statementId} sent via ${method}`);
  };

  const handleDownloadStatement = (statementId: string) => {
    toast.success(`Statement ${statementId} downloaded`);
  };

  const totalBalance = statements.reduce((sum, stmt) => sum + stmt.balanceAmount, 0);
  const overdueCount = statements.filter(stmt => stmt.status === 'overdue').length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Balance</p>
                <p className="text-2xl font-bold">{formatCurrency(totalBalance)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Statements</p>
                <p className="text-2xl font-bold">{statements.length}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Overdue Statements</p>
                <p className="text-2xl font-bold text-red-600">{overdueCount}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Patient Statements
            </CardTitle>
            <Button onClick={handleGenerateStatement} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Generate New Statement
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {statements.map((statement) => (
              <div key={statement.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {getStatusIcon(statement.status)}
                    <div>
                      <p className="font-semibold">{statement.id}</p>
                      <p className="text-sm text-muted-foreground">
                        Statement Date: {formatDate(statement.statementDate)} | 
                        Due: {formatDate(statement.dueDate)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(statement.totalAmount)}</p>
                      <p className="text-sm text-muted-foreground">
                        Balance: {formatCurrency(statement.balanceAmount)}
                      </p>
                    </div>
                    {getStatusBadge(statement.status)}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    {statement.sentDate && (
                      <span>
                        Sent via {statement.sentMethod} on {formatDate(statement.sentDate)}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex space-x-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Patient Statement - {statement.id}</DialogTitle>
                        </DialogHeader>
                        <EnhancedPatientStatement
                          statementData={mockStatementData}
                          onSendStatement={(method) => handleSendStatement(statement.id, method)}
                          onDownload={() => handleDownloadStatement(statement.id)}
                          onPrint={() => window.print()}
                        />
                      </DialogContent>
                    </Dialog>

                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDownloadStatement(statement.id)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>

                    <Button 
                      size="sm"
                      onClick={() => handleSendStatement(statement.id, 'email')}
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Send
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PatientStatementManager;