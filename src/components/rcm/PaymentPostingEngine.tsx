import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  DollarSign,
  Upload,
  CheckCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  Download,
  FileText,
  Bot,
  TrendingUp,
  Calculator,
  CreditCard,
  Eye
} from 'lucide-react';

interface PaymentPosting {
  id: string;
  eraNumber: string;
  payerName: string;
  checkNumber: string;
  checkDate: string;
  totalAmount: number;
  claimsCount: number;
  status: 'pending' | 'processing' | 'posted' | 'exception';
  autoPosted: boolean;
  exceptions?: string[];
}

interface PaymentDetail {
  claimId: string;
  patientName: string;
  serviceDate: string;
  chargedAmount: number;
  paidAmount: number;
  adjustmentAmount: number;
  status: 'posted' | 'exception' | 'pending';
  adjustmentReason?: string;
}

const PaymentPostingEngine: React.FC = () => {
  const [payments, setPayments] = useState<PaymentPosting[]>([]);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetail[]>([]);
  const [processing, setProcessing] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  const [autoPostingEnabled, setAutoPostingEnabled] = useState(true);
  const [stats, setStats] = useState({
    totalPosted: 0,
    autoPostedPercentage: 0,
    exceptionsCount: 0,
    averagePostingTime: 0
  });

  // Sample data
  useEffect(() => {
    const samplePayments: PaymentPosting[] = [
      {
        id: 'ERA001',
        eraNumber: 'ERA-2024-001',
        payerName: 'Blue Cross Blue Shield',
        checkNumber: 'CHK123456',
        checkDate: '2024-01-15',
        totalAmount: 15420.50,
        claimsCount: 25,
        status: 'posted',
        autoPosted: true
      },
      {
        id: 'ERA002',
        eraNumber: 'ERA-2024-002',
        payerName: 'Aetna',
        checkNumber: 'CHK789012',
        checkDate: '2024-01-16',
        totalAmount: 8750.25,
        claimsCount: 18,
        status: 'processing',
        autoPosted: false
      },
      {
        id: 'ERA003',
        eraNumber: 'ERA-2024-003',
        payerName: 'Medicare',
        checkNumber: 'CHK345678',
        checkDate: '2024-01-17',
        totalAmount: 12300.75,
        claimsCount: 32,
        status: 'exception',
        autoPosted: false,
        exceptions: ['Claim not found', 'Amount mismatch', 'Duplicate payment']
      }
    ];

    const sampleDetails: PaymentDetail[] = [
      {
        claimId: 'CLM001',
        patientName: 'John Smith',
        serviceDate: '2024-01-10',
        chargedAmount: 250.00,
        paidAmount: 200.00,
        adjustmentAmount: 50.00,
        status: 'posted',
        adjustmentReason: 'Contractual adjustment'
      },
      {
        claimId: 'CLM002',
        patientName: 'Jane Doe',
        serviceDate: '2024-01-11',
        chargedAmount: 180.00,
        paidAmount: 180.00,
        adjustmentAmount: 0.00,
        status: 'posted'
      },
      {
        claimId: 'CLM003',
        patientName: 'Bob Johnson',
        serviceDate: '2024-01-12',
        chargedAmount: 320.00,
        paidAmount: 0.00,
        adjustmentAmount: 0.00,
        status: 'exception'
      }
    ];

    setPayments(samplePayments);
    setPaymentDetails(sampleDetails);
    setStats({
      totalPosted: 156750.25,
      autoPostedPercentage: 85,
      exceptionsCount: 12,
      averagePostingTime: 2.5
    });
  }, []);

  const handleAutoPost = async (paymentId: string) => {
    setProcessing(true);
    try {
      // Simulate auto-posting process
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      setPayments(prev => prev.map(payment => 
        payment.id === paymentId 
          ? { ...payment, status: 'posted', autoPosted: true }
          : payment
      ));
      
      toast.success('Payment posted successfully');
    } catch (error) {
      toast.error('Failed to post payment');
    } finally {
      setProcessing(false);
    }
  };

  const handleManualPost = (paymentId: string) => {
    setSelectedPayment(paymentId);
    // Open manual posting modal (implementation would go here)
    toast.info('Manual posting interface opened');
  };

  const handleBulkPost = async () => {
    setProcessing(true);
    try {
      const pendingPayments = payments.filter(p => p.status === 'pending');
      
      // Simulate bulk posting
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      setPayments(prev => prev.map(payment => 
        payment.status === 'pending' 
          ? { ...payment, status: 'posted', autoPosted: true }
          : payment
      ));
      
      toast.success(`${pendingPayments.length} payments posted successfully`);
    } catch (error) {
      toast.error('Bulk posting failed');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'posted': return 'bg-green-100 text-green-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'exception': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'posted': return <CheckCircle className="w-4 h-4" />;
      case 'processing': return <Clock className="w-4 h-4" />;
      case 'exception': return <AlertTriangle className="w-4 h-4" />;
      case 'pending': return <RefreshCw className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Payment Posting Engine</h2>
          <p className="text-gray-600">Automated ERA processing and payment posting</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={handleBulkPost}
            disabled={processing}
            className="flex items-center gap-2"
          >
            {processing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Bot className="w-4 h-4" />
            )}
            Bulk Auto-Post
          </Button>
          <Button variant="outline" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Upload ERA
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Posted</p>
                <p className="text-2xl font-bold text-green-600">
                  ${stats.totalPosted.toLocaleString()}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Auto-Posted</p>
                <p className="text-2xl font-bold text-blue-600">
                  {stats.autoPostedPercentage}%
                </p>
              </div>
              <Bot className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Exceptions</p>
                <p className="text-2xl font-bold text-red-600">
                  {stats.exceptionsCount}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Time</p>
                <p className="text-2xl font-bold text-purple-600">
                  {stats.averagePostingTime}min
                </p>
              </div>
              <Clock className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Auto-Posting Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            Auto-Posting Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
            <div>
              <h4 className="font-medium">Intelligent Auto-Posting</h4>
              <p className="text-sm text-gray-600">
                Automatically post payments when confidence score is above 95%
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant={autoPostingEnabled ? "default" : "secondary"}>
                {autoPostingEnabled ? "Enabled" : "Disabled"}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoPostingEnabled(!autoPostingEnabled)}
              >
                {autoPostingEnabled ? "Disable" : "Enable"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            ERA Processing Queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {payments.map((payment) => (
              <div key={payment.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Badge className={getStatusColor(payment.status)}>
                      {getStatusIcon(payment.status)}
                      <span className="ml-1 capitalize">{payment.status}</span>
                    </Badge>
                    <div>
                      <h4 className="font-medium">{payment.eraNumber}</h4>
                      <p className="text-sm text-gray-600">{payment.payerName}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">
                      ${payment.totalAmount.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-600">
                      {payment.claimsCount} claims
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                  <div>
                    <span className="text-gray-600">Check #:</span>
                    <span className="ml-1 font-medium">{payment.checkNumber}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Date:</span>
                    <span className="ml-1 font-medium">{payment.checkDate}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Auto-Posted:</span>
                    <span className="ml-1 font-medium">
                      {payment.autoPosted ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Claims:</span>
                    <span className="ml-1 font-medium">{payment.claimsCount}</span>
                  </div>
                </div>

                {payment.exceptions && payment.exceptions.length > 0 && (
                  <div className="mb-3">
                    <p className="text-sm font-medium text-red-600 mb-1">Exceptions:</p>
                    <div className="flex flex-wrap gap-1">
                      {payment.exceptions.map((exception, index) => (
                        <Badge key={index} variant="destructive" className="text-xs">
                          {exception}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {payment.status === 'processing' && (
                      <Progress value={65} className="w-32" />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {payment.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleAutoPost(payment.id)}
                          disabled={processing}
                          className="flex items-center gap-1"
                        >
                          <Bot className="w-3 h-3" />
                          Auto-Post
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleManualPost(payment.id)}
                        >
                          Manual Post
                        </Button>
                      </>
                    )}
                    {payment.status === 'exception' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleManualPost(payment.id)}
                      >
                        Resolve
                      </Button>
                    )}
                    <Button size="sm" variant="ghost">
                      <Eye className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="ghost">
                      <Download className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Payment Details */}
      {selectedPayment && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Payment Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Claim ID</th>
                    <th className="text-left p-2">Patient</th>
                    <th className="text-left p-2">Service Date</th>
                    <th className="text-right p-2">Charged</th>
                    <th className="text-right p-2">Paid</th>
                    <th className="text-right p-2">Adjustment</th>
                    <th className="text-center p-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentDetails.map((detail, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="p-2 font-medium">{detail.claimId}</td>
                      <td className="p-2">{detail.patientName}</td>
                      <td className="p-2">{detail.serviceDate}</td>
                      <td className="p-2 text-right">${detail.chargedAmount.toFixed(2)}</td>
                      <td className="p-2 text-right">${detail.paidAmount.toFixed(2)}</td>
                      <td className="p-2 text-right">${detail.adjustmentAmount.toFixed(2)}</td>
                      <td className="p-2 text-center">
                        <Badge className={getStatusColor(detail.status)}>
                          {detail.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// export default PaymentPostingEngine;

 

export default PaymentPostingEngine;