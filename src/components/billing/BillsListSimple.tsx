import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, FileText, Eye } from 'lucide-react';
import billingService from '@/services/billingService';
import { toast } from 'sonner';

interface BillsListSimpleProps {
  onCreateNew?: () => void;
  onViewBill?: (billId: number) => void;
  onGenerateInvoice?: (billId: number) => void;
}

const BillsListSimple: React.FC<BillsListSimpleProps> = ({ 
  onCreateNew, 
  onViewBill, 
  onGenerateInvoice 
}) => {
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBills();
  }, []);

  const loadBills = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // For testing, let's use mock data first
      const mockBills = [
        {
          id: 1,
          patient_id: 12,
          status: "draft",
          total_amount: 150.00,
          patient_name: "John Doe",
          physician_name: "Dr. Smith",
          created_at: new Date().toISOString(),
          items: [
            {
              id: 1,
              bill_id: 1,
              service_id: 5,
              quantity: 1,
              unit_price: 150.00,
              service_name: "Office Visit",
              service_code: "99213"
            }
          ]
        },
        {
          id: 2,
          patient_id: 13,
          status: "finalized",
          total_amount: 275.00,
          patient_name: "Jane Smith",
          physician_name: "Dr. Johnson",
          created_at: new Date().toISOString(),
          items: [
            {
              id: 2,
              bill_id: 2,
              service_id: 6,
              quantity: 1,
              unit_price: 200.00,
              service_name: "Consultation",
              service_code: "99214"
            },
            {
              id: 3,
              bill_id: 2,
              service_id: 7,
              quantity: 1,
              unit_price: 75.00,
              service_name: "Lab Test",
              service_code: "80053"
            }
          ]
        }
      ];

      // Try to load from API, fallback to mock data
      try {
        const billsData = await billingService.getAllBills();
        setBills(billsData);
      } catch (apiError) {
        console.warn('API call failed, using mock data:', apiError);
        setBills(mockBills);
      }
    } catch (error) {
      console.error('Error loading bills:', error);
      setError('Failed to load bills');
      toast.error('Failed to load bills');
    } finally {
      setLoading(false);
    }
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
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'draft':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'finalized':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading bills...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={loadBills}>Try Again</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Bills Management</h2>
          <p className="text-gray-600">Manage draft bills and generate invoices</p>
        </div>
        {onCreateNew && (
          <Button onClick={onCreateNew} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create New Bill
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{bills.length}</p>
              <p className="text-sm text-gray-600">Total Bills</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">
                {bills.filter(bill => bill.status === 'draft').length}
              </p>
              <p className="text-sm text-gray-600">Draft Bills</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(bills.reduce((sum, bill) => sum + bill.total_amount, 0))}
              </p>
              <p className="text-sm text-gray-600">Total Amount</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bills List */}
      <Card>
        <CardHeader>
          <CardTitle>All Bills ({bills.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {bills.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No bills found</h3>
              <p className="text-gray-600 mb-4">Get started by creating your first bill</p>
              {onCreateNew && (
                <Button onClick={onCreateNew}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Bill
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {bills.map((bill) => (
                <div key={bill.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <h3 className="font-semibold text-lg">Bill #{bill.id}</h3>
                        <Badge className={getStatusBadgeClass(bill.status)}>
                          {bill.status.charAt(0).toUpperCase() + bill.status.slice(1)}
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-1">
                        <p><strong>Patient:</strong> {bill.patient_name}</p>
                        {bill.physician_name && (
                          <p><strong>Physician:</strong> {bill.physician_name}</p>
                        )}
                        <p><strong>Created:</strong> {formatDate(bill.created_at)}</p>
                        <p><strong>Items:</strong> {bill.items.length} service(s)</p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-600 mb-2">
                        {formatCurrency(bill.total_amount)}
                      </p>
                      
                      <div className="flex gap-2">
                        {onViewBill && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onViewBill(bill.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        
                        {bill.status === 'draft' && onGenerateInvoice && (
                          <Button
                            size="sm"
                            onClick={() => onGenerateInvoice(bill.id)}
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            Invoice
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bill Items Preview */}
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="font-medium mb-2">Services:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      {bill.items.map((item: any) => (
                        <div key={item.id} className="flex justify-between bg-gray-50 p-2 rounded">
                          <span>{item.service_name} ({item.service_code})</span>
                          <span className="font-medium">
                            {item.quantity} × {formatCurrency(item.unit_price)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BillsListSimple;