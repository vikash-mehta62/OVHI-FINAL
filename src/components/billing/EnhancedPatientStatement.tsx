import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, 
  Download, 
  Mail, 
  Send, 
  Printer, 
  Calendar,
  DollarSign,
  CreditCard,
  AlertCircle,
  Phone,
  MapPin
} from 'lucide-react';
import { toast } from 'sonner';

interface StatementItem {
  id: string;
  date: string;
  description: string;
  cptCode?: string;
  charges: number;
  insurancePayment: number;
  adjustments: number;
  patientBalance: number;
  status: 'paid' | 'pending' | 'overdue';
}

interface PaymentHistory {
  id: string;
  date: string;
  amount: number;
  method: string;
  reference: string;
}

interface PatientStatementData {
  statementId: string;
  statementDate: string;
  dueDate: string;
  patientInfo: {
    name: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    phone: string;
    accountNumber: string;
  };
  practiceInfo: {
    name: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    phone: string;
    taxId: string;
  };
  items: StatementItem[];
  paymentHistory: PaymentHistory[];
  summary: {
    totalCharges: number;
    totalInsurancePayments: number;
    totalAdjustments: number;
    previousBalance: number;
    currentBalance: number;
    minimumPayment: number;
  };
  paymentOptions: {
    online: boolean;
    phone: boolean;
    mail: boolean;
    paymentPlan: boolean;
  };
  messages: string[];
}

interface EnhancedPatientStatementProps {
  statementData: PatientStatementData;
  onSendStatement?: (method: 'email' | 'mail' | 'fax') => void;
  onPrint?: () => void;
  onDownload?: () => void;
}

const EnhancedPatientStatement: React.FC<EnhancedPatientStatementProps> = ({
  statementData,
  onSendStatement,
  onPrint,
  onDownload
}) => {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

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

  const getStatusBadge = (status: string) => {
    const variants = {
      paid: 'bg-green-100 text-green-800 border-green-200',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      overdue: 'bg-red-100 text-red-800 border-red-200'
    };
    
    return (
      <Badge className={variants[status as keyof typeof variants]}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  const handleSendStatement = (method: 'email' | 'mail' | 'fax') => {
    if (onSendStatement) {
      onSendStatement(method);
    } else {
      toast.success(`Statement sent via ${method}`);
    }
  };

  const isOverdue = new Date(statementData.dueDate) < new Date();

  return (
    <div className="max-w-4xl mx-auto space-y-6 print:space-y-4">
      {/* Header Actions - Hidden in print */}
      <div className="flex justify-between items-center print:hidden">
        <div>
          <h1 className="text-2xl font-bold">Patient Statement</h1>
          <p className="text-muted-foreground">Statement #{statementData.statementId}</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={onPrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" onClick={onDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
          <Button onClick={() => handleSendStatement('email')}>
            <Mail className="h-4 w-4 mr-2" />
            Send via Email
          </Button>
        </div>
      </div>

      {/* Statement Header */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Practice Information */}
            <div>
              <h2 className="text-lg font-bold mb-3">{statementData.practiceInfo.name}</h2>
              <div className="space-y-1 text-sm">
                <p>{statementData.practiceInfo.address}</p>
                <p>{statementData.practiceInfo.city}, {statementData.practiceInfo.state} {statementData.practiceInfo.zipCode}</p>
                <div className="flex items-center mt-2">
                  <Phone className="h-4 w-4 mr-2" />
                  <span>{statementData.practiceInfo.phone}</span>
                </div>
                <p className="text-muted-foreground">Tax ID: {statementData.practiceInfo.taxId}</p>
              </div>
            </div>

            {/* Patient Information */}
            <div>
              <h3 className="font-semibold mb-3">Bill To:</h3>
              <div className="space-y-1 text-sm">
                <p className="font-medium">{statementData.patientInfo.name}</p>
                <p>{statementData.patientInfo.address}</p>
                <p>{statementData.patientInfo.city}, {statementData.patientInfo.state} {statementData.patientInfo.zipCode}</p>
                <div className="flex items-center mt-2">
                  <Phone className="h-4 w-4 mr-2" />
                  <span>{statementData.patientInfo.phone}</span>
                </div>
                <p className="text-muted-foreground">Account: {statementData.patientInfo.accountNumber}</p>
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Statement Details */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Statement Date</p>
              <p className="font-semibold">{formatDate(statementData.statementDate)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Due Date</p>
              <p className={`font-semibold ${isOverdue ? 'text-red-600' : ''}`}>
                {formatDate(statementData.dueDate)}
                {isOverdue && <AlertCircle className="h-4 w-4 inline ml-1" />}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current Balance</p>
              <p className="text-xl font-bold text-primary">
                {formatCurrency(statementData.summary.currentBalance)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Minimum Payment</p>
              <p className="text-lg font-semibold text-green-600">
                {formatCurrency(statementData.summary.minimumPayment)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <DollarSign className="h-5 w-5 mr-2" />
            Account Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-3 border rounded-lg">
              <p className="text-sm text-muted-foreground">Previous Balance</p>
              <p className="text-lg font-semibold">{formatCurrency(statementData.summary.previousBalance)}</p>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <p className="text-sm text-muted-foreground">Total Charges</p>
              <p className="text-lg font-semibold">{formatCurrency(statementData.summary.totalCharges)}</p>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <p className="text-sm text-muted-foreground">Insurance Payments</p>
              <p className="text-lg font-semibold text-green-600">
                -{formatCurrency(statementData.summary.totalInsurancePayments)}
              </p>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <p className="text-sm text-muted-foreground">Adjustments</p>
              <p className="text-lg font-semibold text-blue-600">
                -{formatCurrency(statementData.summary.totalAdjustments)}
              </p>
            </div>
            <div className="text-center p-3 border rounded-lg bg-primary/5">
              <p className="text-sm text-muted-foreground">Current Balance</p>
              <p className="text-xl font-bold text-primary">
                {formatCurrency(statementData.summary.currentBalance)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Service Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Service Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Date</th>
                  <th className="text-left py-2">Description</th>
                  <th className="text-left py-2">CPT Code</th>
                  <th className="text-right py-2">Charges</th>
                  <th className="text-right py-2">Insurance</th>
                  <th className="text-right py-2">Adjustments</th>
                  <th className="text-right py-2">Balance</th>
                  <th className="text-center py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {statementData.items.map((item) => (
                  <tr key={item.id} className="border-b">
                    <td className="py-3 text-sm">{formatDate(item.date)}</td>
                    <td className="py-3 text-sm">{item.description}</td>
                    <td className="py-3 text-sm font-mono">{item.cptCode || '-'}</td>
                    <td className="py-3 text-sm text-right">{formatCurrency(item.charges)}</td>
                    <td className="py-3 text-sm text-right text-green-600">
                      -{formatCurrency(item.insurancePayment)}
                    </td>
                    <td className="py-3 text-sm text-right text-blue-600">
                      -{formatCurrency(item.adjustments)}
                    </td>
                    <td className="py-3 text-sm text-right font-semibold">
                      {formatCurrency(item.patientBalance)}
                    </td>
                    <td className="py-3 text-center">
                      {getStatusBadge(item.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Payment History */}
      {statementData.paymentHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CreditCard className="h-5 w-5 mr-2" />
              Recent Payment History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {statementData.paymentHistory.map((payment) => (
                <div key={payment.id} className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{formatDate(payment.date)}</p>
                    <p className="text-sm text-muted-foreground">
                      {payment.method} - Ref: {payment.reference}
                    </p>
                  </div>
                  <p className="font-semibold text-green-600">
                    {formatCurrency(payment.amount)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Options */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Options</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3">How to Pay</h4>
              <div className="space-y-2">
                {statementData.paymentOptions.online && (
                  <div className="flex items-center">
                    <CreditCard className="h-4 w-4 mr-2 text-blue-500" />
                    <span className="text-sm">Online at our patient portal</span>
                  </div>
                )}
                {statementData.paymentOptions.phone && (
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 mr-2 text-green-500" />
                    <span className="text-sm">Call {statementData.practiceInfo.phone}</span>
                  </div>
                )}
                {statementData.paymentOptions.mail && (
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-2 text-orange-500" />
                    <span className="text-sm">Mail check to practice address</span>
                  </div>
                )}
                {statementData.paymentOptions.paymentPlan && (
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-purple-500" />
                    <span className="text-sm">Payment plan available - call to arrange</span>
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3">Important Messages</h4>
              <div className="space-y-2">
                {statementData.messages.map((message, index) => (
                  <div key={index} className="p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                    {message}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-center text-sm text-muted-foreground border-t pt-4">
        <p>Thank you for choosing {statementData.practiceInfo.name} for your healthcare needs.</p>
        <p>If you have questions about this statement, please call {statementData.practiceInfo.phone}</p>
      </div>
    </div>
  );
};

export default EnhancedPatientStatement;