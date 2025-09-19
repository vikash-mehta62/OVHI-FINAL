import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Eye, FileText, Plus, Calendar, User, DollarSign } from 'lucide-react';
import billingService from '@/services/billingService';
import { toast } from 'sonner';

interface BillItem {
    id: number;
    bill_id: number;
    service_id: number;
    quantity: number;
    unit_price: number;
    service_name: string;
    service_code: string;
}

interface Bill {
    id: number;
    patient_id: number;
    status: string;
    total_amount: number;
    patient_name: string;
    physician_name?: string;
    created_at: string;
    items: BillItem[];
}

interface BillsListProps {
    onCreateNew?: () => void;
    onViewBill?: (billId: number) => void;
    onGenerateInvoice?: (billId: number) => void;
}

const BillsList: React.FC<BillsListProps> = ({ onCreateNew, onViewBill, onGenerateInvoice }) => {
    const [bills, setBills] = useState<Bill[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedBill, setExpandedBill] = useState<number | null>(null);

    useEffect(() => {
        loadBills();
    }, []);

    const loadBills = async () => {
        try {
            setLoading(true);
            const billsData = await billingService.getAllBills();
            setBills(billsData);
        } catch (error) {
            console.error('Error loading bills:', error);
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

    const getStatusColor = (status: string) => {
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

    const toggleBillExpansion = (billId: number) => {
        setExpandedBill(expandedBill === billId ? null : billId);
    };

    const handleGenerateInvoice = async (billId: number) => {
        try {
            await billingService.generateInvoice(billId);
            toast.success('Invoice generated successfully');
            loadBills(); // Reload to update status
            onGenerateInvoice?.(billId);
        } catch (error) {
            console.error('Error generating invoice:', error);
            toast.error('Failed to generate invoice');
        }
    };

    if (loading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center py-8">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading bills...</p>
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

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <FileText className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Total Bills</p>
                                <p className="text-2xl font-bold">{bills.length}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-yellow-100 rounded-lg">
                                <Calendar className="h-5 w-5 text-yellow-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Draft Bills</p>
                                <p className="text-2xl font-bold">
                                    {bills.filter(bill => bill.status === 'draft').length}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <DollarSign className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Total Amount</p>
                                <p className="text-2xl font-bold">
                                    {formatCurrency(bills.reduce((sum, bill) => sum + bill.total_amount, 0))}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Bills Table */}
            <Card>
                <CardHeader>
                    <CardTitle>All Bills</CardTitle>
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
                                <div key={bill.id} className="border rounded-lg overflow-hidden">
                                    {/* Bill Header */}
                                    <div
                                        className="p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                                        onClick={() => toggleBillExpansion(bill.id)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div>
                                                    <h3 className="font-semibold text-lg">Bill #{bill.id}</h3>
                                                    <div className="flex items-center gap-4 text-sm text-gray-600">
                                                        <span className="flex items-center gap-1">
                                                            <User className="h-4 w-4" />
                                                            {bill.patient_name}
                                                        </span>
                                                        {bill.physician_name && (
                                                            <span>Dr. {bill.physician_name}</span>
                                                        )}
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="h-4 w-4" />
                                                            {formatDate(bill.created_at)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4">
                                                <Badge className={getStatusColor(bill.status)}>
                                                    {bill.status.charAt(0).toUpperCase() + bill.status.slice(1)}
                                                </Badge>
                                                <div className="text-right">
                                                    <p className="text-lg font-bold">{formatCurrency(bill.total_amount)}</p>
                                                    <p className="text-sm text-gray-600">{bill.items.length} item(s)</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    {onViewBill && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onViewBill(bill.id);
                                                            }}
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                    {bill.status === 'draft' && (
                                                        <Button
                                                            size="sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleGenerateInvoice(bill.id);
                                                            }}
                                                        >
                                                            <FileText className="h-4 w-4 mr-1" />
                                                            Generate Invoice
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Bill Items (Expandable) */}
                                    {expandedBill === bill.id && (
                                        <div className="p-4 border-t">
                                            <h4 className="font-medium mb-3">Bill Items</h4>
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Service</TableHead>
                                                        <TableHead>Code</TableHead>
                                                        <TableHead className="text-center">Quantity</TableHead>
                                                        <TableHead className="text-right">Unit Price</TableHead>
                                                        <TableHead className="text-right">Total</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {bill.items.map((item) => (
                                                        <TableRow key={item.id}>
                                                            <TableCell className="font-medium">{item.service_name}</TableCell>
                                                            <TableCell className="text-gray-600">{item.service_code}</TableCell>
                                                            <TableCell className="text-center">{item.quantity}</TableCell>
                                                            <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                                                            <TableCell className="text-right font-medium">
                                                                {formatCurrency(item.unit_price * item.quantity)}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default BillsList;