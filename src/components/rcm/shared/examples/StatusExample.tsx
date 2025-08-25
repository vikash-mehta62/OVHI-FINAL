import React from 'react';
import { StatusBadge, DataTable, columnRenderers } from '@/components/rcm/shared';
import { CLAIM_STATUSES, COLLECTION_STATUSES } from '@/components/rcm/shared';

const StatusExample: React.FC = () => {
  const sampleClaims = [
    {
      id: '1',
      claimNumber: 'CLM-2024-001',
      patientName: 'John Doe',
      amount: 1250.00,
      status: 'paid',
      serviceDate: '2024-01-15',
      daysInAR: 12
    },
    {
      id: '2', 
      claimNumber: 'CLM-2024-002',
      patientName: 'Jane Smith',
      amount: 850.50,
      status: 'pending',
      serviceDate: '2024-01-18',
      daysInAR: 25
    },
    {
      id: '3',
      claimNumber: 'CLM-2024-003', 
      patientName: 'Bob Johnson',
      amount: 2100.75,
      status: 'denied',
      serviceDate: '2024-01-10',
      daysInAR: 45
    },
    {
      id: '4',
      claimNumber: 'CLM-2024-004',
      patientName: 'Alice Brown',
      amount: 675.25,
      status: 'processing',
      serviceDate: '2024-01-22',
      daysInAR: 8
    }
  ];

  const claimsColumns = [
    {
      key: 'claimNumber',
      title: 'Claim Number',
      dataIndex: 'claimNumber',
      width: '150px'
    },
    {
      key: 'patientName',
      title: 'Patient',
      dataIndex: 'patientName'
    },
    {
      key: 'amount',
      title: 'Amount',
      dataIndex: 'amount',
      align: 'right' as const,
      render: (value: number) => columnRenderers.currency(value)
    },
    {
      key: 'status',
      title: 'Status',
      dataIndex: 'status',
      render: (value: string) => <StatusBadge status={value as any} />
    },
    {
      key: 'serviceDate',
      title: 'Service Date',
      dataIndex: 'serviceDate',
      render: (value: string) => columnRenderers.date(value)
    },
    {
      key: 'daysInAR',
      title: 'Days in A/R',
      dataIndex: 'daysInAR',
      align: 'center' as const,
      render: (value: number) => (
        <span className={value > 30 ? 'text-red-600 font-semibold' : 'text-gray-600'}>
          {value} days
        </span>
      )
    }
  ];

  return (
    <div className="space-y-8 p-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Status Badge Examples</h2>
        
        {/* Status Badge Variants */}
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-3">Claim Statuses</h3>
            <div className="flex flex-wrap gap-3">
              {CLAIM_STATUSES.map((status) => (
                <StatusBadge key={status} status={status} />
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3">Collection Statuses</h3>
            <div className="flex flex-wrap gap-3">
              {COLLECTION_STATUSES.map((status) => (
                <StatusBadge key={status} status={status as any} />
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3">Size Variants</h3>
            <div className="flex items-center gap-4">
              <StatusBadge status="paid" size="sm" />
              <StatusBadge status="paid" size="md" />
              <StatusBadge status="paid" size="lg" />
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3">Style Variants</h3>
            <div className="flex items-center gap-4">
              <StatusBadge status="paid" variant="default" />
              <StatusBadge status="paid" variant="outline" />
              <StatusBadge status="paid" variant="secondary" />
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3">With/Without Icons</h3>
            <div className="flex items-center gap-4">
              <StatusBadge status="paid" showIcon={true} />
              <StatusBadge status="paid" showIcon={false} />
            </div>
          </div>
        </div>

        {/* Data Table Example */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4">Status Badges in Data Table</h3>
          <DataTable
            columns={claimsColumns}
            data={sampleClaims}
            title="Sample Claims"
            description="Example of status badges used in a data table"
            striped={true}
            hoverable={true}
          />
        </div>
      </div>
    </div>
  );
};

export default StatusExample;