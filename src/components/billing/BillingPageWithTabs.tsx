import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Receipt, Plus, Search } from 'lucide-react';

type ActiveTab = 'bills' | 'invoices';

const BillingPageWithTabs: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('invoices'); // Start with invoices to match your current view

  // Mock data for demonstration
  const bills = [
    { id: 1, patient: "John Doe", amount: 150.00, status: "draft", date: "2024-01-15" },
    { id: 2, patient: "Jane Smith", amount: 275.00, status: "draft", date: "2024-01-14" }
  ];

  const invoices = [
    { id: 1, invoice_number: "INV-2024-0001", patient: "Alice Johnson", amount: 200.00, paid: 0.00, due: 200.00, status: "pending", date: "2024-01-10" },
    { id: 2, invoice_number: "INV-2024-0002", patient: "Bob Wilson", amount: 350.00, paid: 350.00, due: 0.00, status: "paid", date: "2024-01-08" }
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'paid': return 'bg-green-100 text-green-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const currentData = activeTab === 'bills' ? bills : invoices;
  const pendingAmount = activeTab === 'bills' 
    ? bills.filter(b => b.status === 'draft').reduce((sum, b) => sum + b.amount, 0)
    : invoices.filter(i => i.status === 'pending').reduce((sum, i) => sum + i.due, 0);
  
  const paidAmount = activeTab === 'bills' 
    ? 0 // Bills don't have paid amounts
    : invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.paid, 0);

  const overdueAmount = activeTab === 'bills' 
    ? 0 // Bills don't have overdue amounts
    : invoices.filter(i => i.status === 'overdue').reduce((sum, i) => sum + i.due, 0);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing & Invoices</h1>
          <p className="text-gray-600">Manage patient billing and invoice processing</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create Bill
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={activeTab === 'bills' ? 'default' : 'outline'}
          onClick={() => setActiveTab('bills')}
          className="flex items-center gap-2"
        >
          <FileText className="h-4 w-4" />
          Bills (Drafts)
        </Button>
        <Button
          variant={activeTab === 'invoices' ? 'default' : 'outline'}
          onClick={() => setActiveTab('invoices')}
          className="flex items-center gap-2"
        >
          <Receipt className="h-4 w-4" />
          Invoices (Finalized)
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <FileText className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">
                {activeTab === 'bills' ? 'Pending' : 'Pending'}
              </p>
              <p className="text-xl font-bold">{formatCurrency(pendingAmount)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-green-600 font-bold">$</span>
            </div>
            <div>
              <p className="text-sm text-gray-600">Paid</p>
              <p className="text-xl font-bold">{formatCurrency(paidAmount)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <span className="text-red-600 font-bold">!</span>
            </div>
            <div>
              <p className="text-sm text-gray-600">Overdue</p>
              <p className="text-xl font-bold">{formatCurrency(overdueAmount)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Receipt className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">
                Total {activeTab === 'bills' ? 'Bills' : 'Invoices'}
              </p>
              <p className="text-xl font-bold">{currentData.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
        <div className="flex gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder={`Search by patient name or ${activeTab === 'invoices' ? 'invoice number' : 'bill ID'}...`}
              className="pl-10"
            />
          </div>
          <Select defaultValue="all">
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {activeTab === 'bills' ? (
                <SelectItem value="draft">Draft</SelectItem>
              ) : (
                <>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">
            {activeTab === 'bills' ? 'Bills' : 'Invoices'}
          </h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  {activeTab === 'bills' ? 'Bill #' : 'Invoice #'}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Patient</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Amount</th>
                {activeTab === 'invoices' && (
                  <>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Paid</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Due</th>
                  </>
                )}
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Date</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentData.length === 0 ? (
                <tr>
                  <td colSpan={activeTab === 'invoices' ? 8 : 6} className="px-4 py-8 text-center text-gray-500">
                    No {activeTab} found matching your criteria
                  </td>
                </tr>
              ) : (
                currentData.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium">
                      {activeTab === 'bills' ? `#${item.id}` : (item as any).invoice_number}
                    </td>
                    <td className="px-4 py-3 text-sm">{item.patient}</td>
                    <td className="px-4 py-3 text-sm font-medium">{formatCurrency(item.amount)}</td>
                    {activeTab === 'invoices' && (
                      <>
                        <td className="px-4 py-3 text-sm">{formatCurrency((item as any).paid)}</td>
                        <td className="px-4 py-3 text-sm">{formatCurrency((item as any).due)}</td>
                      </>
                    )}
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(item.status)}`}>
                        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.date}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">View</Button>
                        {activeTab === 'bills' && item.status === 'draft' && (
                          <Button size="sm">Generate Invoice</Button>
                        )}
                        {activeTab === 'invoices' && item.status === 'pending' && (
                          <Button size="sm">Record Payment</Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BillingPageWithTabs;