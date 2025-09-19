import React, { useState } from 'react';
import BillsList from './BillsList';
import CreateBillForm from './CreateBillForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

type ViewMode = 'list' | 'create' | 'view';

const BillsPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedBillId, setSelectedBillId] = useState<number | null>(null);

  const handleCreateNew = () => {
    setViewMode('create');
  };

  const handleViewBill = (billId: number) => {
    setSelectedBillId(billId);
    setViewMode('view');
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedBillId(null);
  };

  const handleBillCreated = () => {
    setViewMode('list');
  };

  const handleGenerateInvoice = (billId: number) => {
    console.log('Invoice generated for bill:', billId);
    // You can add navigation to invoice view here
  };

  return (
    <div className="container mx-auto p-6">
      {viewMode === 'list' && (
        <BillsList
          onCreateNew={handleCreateNew}
          onViewBill={handleViewBill}
          onGenerateInvoice={handleGenerateInvoice}
        />
      )}

      {viewMode === 'create' && (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={handleBackToList}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Bills
            </Button>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Create New Bill</h2>
              <p className="text-gray-600">Create a draft bill for a patient</p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Bill Details</CardTitle>
            </CardHeader>
            <CardContent>
              <CreateBillForm onSuccess={handleBillCreated} />
            </CardContent>
          </Card>
        </div>
      )}

      {viewMode === 'view' && selectedBillId && (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={handleBackToList}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Bills
            </Button>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Bill #{selectedBillId}</h2>
              <p className="text-gray-600">View bill details</p>
            </div>
          </div>

          <Card>
            <CardContent className="p-6">
              <div className="text-center py-8">
                <p className="text-gray-600">Bill details view will be implemented here</p>
                <p className="text-sm text-gray-500 mt-2">Bill ID: {selectedBillId}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default BillsPage;