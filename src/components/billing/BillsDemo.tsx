import React from 'react';
import BillsListSimple from './BillsListSimple';

const BillsDemo: React.FC = () => {
  const handleCreateNew = () => {
    console.log('Create new bill clicked');
    alert('Create new bill functionality');
  };

  const handleViewBill = (billId: number) => {
    console.log('View bill clicked:', billId);
    alert(`View bill ${billId} functionality`);
  };

  const handleGenerateInvoice = (billId: number) => {
    console.log('Generate invoice clicked:', billId);
    alert(`Generate invoice for bill ${billId} functionality`);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Bills Management Demo</h1>
        <p className="text-gray-600">This is a demo of the Bills List component with mock data</p>
      </div>
      
      <BillsListSimple
        onCreateNew={handleCreateNew}
        onViewBill={handleViewBill}
        onGenerateInvoice={handleGenerateInvoice}
      />
    </div>
  );
};

export default BillsDemo;