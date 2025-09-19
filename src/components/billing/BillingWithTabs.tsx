import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Receipt, Plus, DollarSign } from 'lucide-react';
import BillsListSimple from './BillsListSimple';
import InvoicesList from './InvoicesList';
import CreateBillForm from './CreateBillForm';

type ActiveTab = 'bills' | 'invoices';
type ViewMode = 'list' | 'create';

const BillingWithTabs: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('bills');
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const handleCreateBill = () => {
    setActiveTab('bills');
    setViewMode('create');
  };

  const handleBillCreated = () => {
    setViewMode('list');
    setActiveTab('bills');
  };

  const handleGenerateInvoice = (billId: number) => {
    console.log('Generated invoice for bill:', billId);
    // Switch to invoices tab after generating invoice
    setActiveTab('invoices');
    setViewMode('list');
  };

  const handleViewBill = (billId: number) => {
    console.log('View bill:', billId);
  };

  const handleViewInvoice = (invoiceId: number) => {
    console.log('View invoice:', invoiceId);
  };

  const handleRecordPayment = (invoiceId: number) => {
    console.log('Record payment for invoice:', invoiceId);
  };

  const handleDownloadInvoice = (invoiceId: number) => {
    console.log('Download invoice:', invoiceId);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing & Invoices</h1>
          <p className="text-gray-600">Manage patient billing and invoice processing</p>
        </div>
        <Button onClick={handleCreateBill} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create Bill
        </Button>
      </div>

      {/* Show Create Bill Form */}
      {viewMode === 'create' && (
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="outline"
              onClick={() => setViewMode('list')}
            >
              ← Back to {activeTab === 'bills' ? 'Bills' : 'Invoices'}
            </Button>
            <h2 className="text-xl font-semibold">Create New Bill</h2>
          </div>
          
          <Card>
            <CardContent className="p-6">
              <CreateBillForm onSuccess={handleBillCreated} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Show Tabs and Content */}
      {viewMode === 'list' && (
        <>
          {/* Tab Navigation */}
          <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
            <Button
              variant={activeTab === 'bills' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('bills')}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Bills (Drafts)
            </Button>
            <Button
              variant={activeTab === 'invoices' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('invoices')}
              className="flex items-center gap-2"
            >
              <Receipt className="h-4 w-4" />
              Invoices (Finalized)
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <FileText className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">
                      {activeTab === 'bills' ? 'Pending' : 'Pending'}
                    </p>
                    <p className="text-2xl font-bold">$0.00</p>
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
                    <p className="text-sm text-gray-600">Paid</p>
                    <p className="text-2xl font-bold">$0.00</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <DollarSign className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Overdue</p>
                    <p className="text-2xl font-bold">$0.00</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Receipt className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">
                      Total {activeTab === 'bills' ? 'Bills' : 'Invoices'}
                    </p>
                    <p className="text-2xl font-bold">0</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tab Content */}
          {activeTab === 'bills' && (
            <div>
              <BillsListSimple
                onCreateNew={handleCreateBill}
                onViewBill={handleViewBill}
                onGenerateInvoice={handleGenerateInvoice}
              />
            </div>
          )}

          {activeTab === 'invoices' && (
            <div>
              <InvoicesList
                onViewInvoice={handleViewInvoice}
                onRecordPayment={handleRecordPayment}
                onDownloadInvoice={handleDownloadInvoice}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default BillingWithTabs;