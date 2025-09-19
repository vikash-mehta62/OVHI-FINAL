import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Receipt, Plus, ArrowLeft } from 'lucide-react';
import BillsListSimple from './BillsListSimple';
import InvoicesList from './InvoicesList';
import CreateBillForm from './CreateBillForm';

type ViewMode = 'bills' | 'invoices' | 'create-bill' | 'view-bill' | 'view-invoice';

const BillingNavigation: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('bills');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Bills handlers
  const handleCreateNewBill = () => {
    setViewMode('create-bill');
  };

  const handleViewBill = (billId: number) => {
    setSelectedId(billId);
    setViewMode('view-bill');
  };

  const handleGenerateInvoice = (billId: number) => {
    console.log('Generate invoice for bill:', billId);
    // After generating invoice, switch to invoices view
    setViewMode('invoices');
  };

  const handleBillCreated = () => {
    setViewMode('bills');
  };

  // Invoices handlers
  const handleViewInvoice = (invoiceId: number) => {
    setSelectedId(invoiceId);
    setViewMode('view-invoice');
  };

  const handleRecordPayment = (invoiceId: number) => {
    console.log('Record payment for invoice:', invoiceId);
    // You can implement payment recording here
  };

  const handleDownloadInvoice = (invoiceId: number) => {
    console.log('Download invoice:', invoiceId);
    // You can implement PDF download here
  };

  const handleBackToMain = () => {
    setViewMode('bills');
    setSelectedId(null);
  };

  return (
    <div className="container mx-auto p-6">
      {/* Main Navigation */}
      {(viewMode === 'bills' || viewMode === 'invoices') && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900">Billing & Invoicing</h1>
          </div>
          
          {/* Tab Navigation */}
          <div className="flex gap-2 mb-6">
            <Button
              variant={viewMode === 'bills' ? 'default' : 'outline'}
              onClick={() => setViewMode('bills')}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Bills (Drafts)
            </Button>
            <Button
              variant={viewMode === 'invoices' ? 'default' : 'outline'}
              onClick={() => setViewMode('invoices')}
              className="flex items-center gap-2"
            >
              <Receipt className="h-4 w-4" />
              Invoices (Finalized)
            </Button>
          </div>
        </div>
      )}

      {/* Back Navigation for sub-views */}
      {(viewMode === 'create-bill' || viewMode === 'view-bill' || viewMode === 'view-invoice') && (
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={handleBackToMain}
            className="flex items-center gap-2 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to {viewMode.includes('bill') ? 'Bills' : 'Invoices'}
          </Button>
        </div>
      )}

      {/* Content based on view mode */}
      {viewMode === 'bills' && (
        <BillsListSimple
          onCreateNew={handleCreateNewBill}
          onViewBill={handleViewBill}
          onGenerateInvoice={handleGenerateInvoice}
        />
      )}

      {viewMode === 'invoices' && (
        <InvoicesList
          onViewInvoice={handleViewInvoice}
          onRecordPayment={handleRecordPayment}
          onDownloadInvoice={handleDownloadInvoice}
        />
      )}

      {viewMode === 'create-bill' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Create New Bill</h2>
            <p className="text-gray-600">Create a draft bill for a patient</p>
          </div>

          <Card>
            <CardContent className="p-6">
              <CreateBillForm onSuccess={handleBillCreated} />
            </CardContent>
          </Card>
        </div>
      )}

      {viewMode === 'view-bill' && selectedId && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Bill #{selectedId}</h2>
            <p className="text-gray-600">View and edit bill details</p>
          </div>

          <Card>
            <CardContent className="p-6">
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Bill details view will be implemented here</p>
                <p className="text-sm text-gray-500 mt-2">Bill ID: {selectedId}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {viewMode === 'view-invoice' && selectedId && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Invoice #{selectedId}</h2>
            <p className="text-gray-600">View invoice details and payment history</p>
          </div>

          <Card>
            <CardContent className="p-6">
              <div className="text-center py-8">
                <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Invoice details view will be implemented here</p>
                <p className="text-sm text-gray-500 mt-2">Invoice ID: {selectedId}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default BillingNavigation;