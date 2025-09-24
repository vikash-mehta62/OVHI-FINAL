import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Calendar, DollarSign, FileText, Edit, Plus, Trash2, Save, X } from 'lucide-react';
import billingService from '@/services/billingService';
import { toast } from 'sonner';

interface Bill {
  id: number;
  patient_id: number;
  patient_name: string;
  status: string;
  total_amount: number;
  amount_paid: number;
  amount_due: number;
  created_at: string;
  physician_name?: string;
  items: Array<{
    id: number;
    bill_id: number;
    service_id: number;
    service_name: string;
    service_code: string;
    quantity: number;
    unit_price: number;
  }>;
}

interface BillDetailsDialogProps {
  bill: Bill | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBillUpdated: () => void;
}

interface Service {
  service_id: number;
  name: string;
  cpt_codes: string;
  price: number;
}

const BillDetailsDialog: React.FC<BillDetailsDialogProps> = ({
  bill,
  open,
  onOpenChange,
  onBillUpdated
}) => {
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [editedItems, setEditedItems] = useState<Bill['items']>([]);
  const [availableServices, setAvailableServices] = useState<Service[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const loadServices = async () => {
    try {
      setIsLoadingServices(true);
      const services = await billingService.getServices();
      setAvailableServices(services);
    } catch (error) {
      console.error('Error loading services:', error);
      toast.error('Failed to load services');
    } finally {
      setIsLoadingServices(false);
    }
  };

  useEffect(() => {
    if (bill && open) {
      setEditedItems([...bill.items]);
      loadServices();
    }
  }, [bill, open]);

  // Debug logging
  useEffect(() => {
    if (isEditing && bill) {
      console.log('Edited items:', editedItems);
      const calculatedTotal = editedItems.reduce((sum, item) =>
        sum + (item.quantity * item.unit_price), 0
      );
      console.log('Calculated total:', calculatedTotal);
    }
  }, [editedItems, isEditing, bill]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'finalized':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleStatusChange = async () => {
    if (!newStatus || newStatus === bill.status) {
      toast.error('Please select a different status');
      return;
    }

    try {
      setIsUpdatingStatus(true);

      // Call API to update bill status
      await billingService.updateBillStatus(bill.id, newStatus);

      toast.success('Bill status updated successfully');
      onBillUpdated();
      setNewStatus('');
    } catch (error) {
      console.error('Error updating bill status:', error);
      toast.error('Failed to update bill status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const calculateLineTotal = (quantity: number, unitPrice: number) => {
    return quantity * unitPrice;
  };

  const totalAmount = bill ? (isEditing ? editedItems : bill.items).reduce((sum, item) =>
    sum + calculateLineTotal(item.quantity, item.unit_price), 0
  ) : 0;

  const handleEditToggle = () => {
    if (isEditing) {
      // Cancel editing - reset to original items
      setEditedItems([...bill.items]);
    }
    setIsEditing(!isEditing);
  };

  const handleItemQuantityChange = (itemId: number, newQuantity: number) => {
    setEditedItems(prev =>
      prev.map(item =>
        item.id === itemId
          ? { ...item, quantity: Math.max(1, newQuantity) }
          : item
      )
    );
  };

  const handleRemoveItem = (itemId: number) => {
    setEditedItems(prev => prev.filter(item => item.id !== itemId));
  };

  const handleAddService = () => {
    if (availableServices.length === 0) return;

    const firstService = availableServices[0];
    const newItem = {
      id: Date.now(), // Temporary ID for new items
      bill_id: bill.id,
      service_id: firstService.service_id,
      service_name: firstService.name,
      service_code: firstService.cpt_codes,
      quantity: 1,
      unit_price: firstService.price
    };

    setEditedItems(prev => [...prev, newItem]);
  };

  const handleServiceChange = (itemId: number, serviceId: number) => {
    const selectedService = availableServices.find(s => s.service_id === serviceId);
    if (!selectedService) return;

    setEditedItems(prev =>
      prev.map(item =>
        item.id === itemId
          ? {
            ...item,
            service_id: selectedService.service_id,
            service_name: selectedService.name,
            service_code: selectedService.cpt_codes,
            unit_price: selectedService.price
          }
          : item
      )
    );
  };

  const handleSaveChanges = async () => {
    try {
      setIsSaving(true);

      // Calculate the new total
      const newTotal = editedItems.reduce((sum, item) => 
        sum + (item.quantity * item.unit_price), 0
      );

      // Prepare the data for API call
      const billData = {
        bill_id: bill.id,
        items: editedItems.map(item => ({
          service_id: item.service_id,
          quantity: item.quantity,
          unit_price: item.unit_price
        }))
      };

      console.log('Saving bill items:', billData);
      console.log('New calculated total:', newTotal);
      
      await billingService.updateBillItems(billData);

      // Update the bill object with new total and items
      const updatedBill = {
        ...bill,
        total_amount: newTotal,
        items: editedItems
      };

      toast.success(`Bill updated successfully! New total: ${formatCurrency(newTotal)}`);
      setIsEditing(false);

      // Refresh the parent data
      onBillUpdated();
      
      // Keep dialog open to show updated total
      setTimeout(() => {
        onOpenChange(false);
      }, 2000);
      
    } catch (error) {
      console.error('Error updating bill:', error);
      toast.error('Failed to update bill');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Bill Details - #{bill?.id || 'Loading...'}
          </DialogTitle>
        </DialogHeader>

        {!bill ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (

          <div className="space-y-6">
            {/* Bill Header Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Patient Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <p className="text-sm text-gray-600">Patient Name</p>
                    <p className="font-medium">{bill.patient_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Patient ID</p>
                    <p className="font-medium">#{bill.patient_id}</p>
                  </div>
                  {bill.physician_name && (
                    <div>
                      <p className="text-sm text-gray-600">Physician</p>
                      <p className="font-medium">{bill.physician_name}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Bill Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <p className="text-sm text-gray-600">Bill ID</p>
                    <p className="font-medium">#{bill.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Created Date</p>
                    <p className="font-medium">{formatDate(bill.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <Badge className={getStatusColor(bill.status)}>
                      {bill.status ? bill.status.charAt(0).toUpperCase() + bill.status.slice(1) : 'Unknown'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Status Update Section */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Edit className="h-4 w-4" />
                  Update Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Select new status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Pending</SelectItem>
                      <SelectItem value="1">Approved</SelectItem>
                      <SelectItem value="3">Partially Paid</SelectItem>
                      <SelectItem value="4">Paid</SelectItem>
                      <SelectItem value="5">Cancelled / Voided</SelectItem>

                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleStatusChange}
                    disabled={isUpdatingStatus || !newStatus}
                    size="sm"
                  >
                    {isUpdatingStatus ? 'Updating...' : 'Update Status'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Bill Items */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Services & Items
                  </div>
                  <div className="flex gap-2">
                    {!isEditing ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleEditToggle}
                        disabled={bill.status === 'finalized'}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit Items
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleEditToggle}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSaveChanges}
                          disabled={isSaving}
                        >
                          <Save className="h-4 w-4 mr-1" />
                          {isSaving ? 'Saving...' : 'Save Changes'}
                        </Button>
                      </div>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 text-sm font-medium">Service</th>
                        <th className="text-left p-2 text-sm font-medium">Code</th>
                        <th className="text-right p-2 text-sm font-medium">Qty</th>
                        <th className="text-right p-2 text-sm font-medium">Unit Price</th>
                        <th className="text-right p-2 text-sm font-medium">Total</th>
                        {isEditing && <th className="text-center p-2 text-sm font-medium">Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {(isEditing ? editedItems : bill.items).map((item) => (
                        <tr key={item.id} className="border-b">
                          <td className="p-2">
                            {isEditing ? (
                              <Select
                                value={item.service_id.toString()}
                                onValueChange={(value) => handleServiceChange(item.id, parseInt(value))}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableServices.map((service) => (
                                    <SelectItem key={service.service_id} value={service.service_id.toString()}>
                                      {service.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <div>
                                <p className="font-medium">{item.service_name}</p>
                              </div>
                            )}
                          </td>
                          <td className="p-2 text-sm text-gray-600">{item.service_code}</td>
                          <td className="p-2 text-right">
                            {isEditing ? (
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => handleItemQuantityChange(item.id, parseInt(e.target.value) || 1)}
                                className="w-20 text-right"
                              />
                            ) : (
                              item.quantity
                            )}
                          </td>
                          <td className="p-2 text-right">{formatCurrency(item.unit_price)}</td>
                          <td className="p-2 text-right font-medium">
                            {formatCurrency(calculateLineTotal(item.quantity, item.unit_price))}
                          </td>
                          {isEditing && (
                            <td className="p-2 text-center">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRemoveItem(item.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {isEditing && (
                  <div className="mt-4">
                    <Button
                      onClick={handleAddService}
                      variant="outline"
                      size="sm"
                      disabled={isLoadingServices}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Service
                    </Button>
                  </div>
                )}

                <Separator className="my-4" />

                {/* Total Section */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Subtotal:</span>
                    <span className="font-medium">{formatCurrency(totalAmount)}</span>
                  </div>
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total Amount:</span>
                    <span className="text-blue-600">{formatCurrency(bill.total_amount || totalAmount)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              {bill.status === 'draft' && (
                <Button onClick={() => {
                  // Handle generate invoice
                  toast.info('Generate invoice functionality will be implemented');
                }}>
                  Generate Invoice
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BillDetailsDialog;