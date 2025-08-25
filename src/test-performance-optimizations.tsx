/**
 * Performance Optimization Test Component
 * Tests various performance optimizations implemented in RCM components
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Import optimized components
import RCMDashboard from './components/rcm/RCMDashboard';
import KPICards from './components/rcm/dashboard/KPICards';
import ChartsSection from './components/rcm/dashboard/ChartsSection';
import DataTable from './components/rcm/shared/DataTable';
import VirtualizedTable from './components/rcm/shared/VirtualizedTable';

// Import performance hooks
import { 
  usePerformanceMonitor, 
  useOperationTimer, 
  useRenderTracker,
  useMemoryLeakDetector 
} from './hooks/usePerformanceMonitor';

// Mock data generators
const generateMockKPIs = () => ({
  totalRevenue: Math.random() * 1000000,
  collectionRate: Math.random() * 100,
  denialRate: Math.random() * 20,
  daysInAR: Math.floor(Math.random() * 60) + 10
});

const generateMockDashboardData = () => ({
  kpis: generateMockKPIs(),
  trends: {
    monthlyRevenue: Array.from({ length: 12 }, (_, i) => ({
      month: `Month ${i + 1}`,
      revenue: Math.random() * 100000,
      collections: Math.random() * 80000
    }))
  }
});

const generateMockTableData = (count: number) => 
  Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    patientName: `Patient ${i + 1}`,
    claimAmount: Math.random() * 10000,
    status: ['pending', 'approved', 'denied'][Math.floor(Math.random() * 3)],
    date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    daysInAR: Math.floor(Math.random() * 120)
  }));

const PerformanceTestSuite: React.FC = () => {
  // Performance monitoring
  const { metrics, resetMetrics } = usePerformanceMonitor({ 
    componentName: 'PerformanceTestSuite',
    enableMemoryTracking: true,
    logToConsole: true
  });
  
  const { timeOperation, operations, clearOperations } = useOperationTimer();
  const renderInfo = useRenderTracker('PerformanceTestSuite');
  const memoryStats = useMemoryLeakDetector('PerformanceTestSuite');

  // Test state
  const [testResults, setTestResults] = useState<any[]>([]);
  const [currentTest, setCurrentTest] = useState<string>('');
  const [kpiData, setKpiData] = useState(generateMockKPIs());
  const [dashboardData, setDashboardData] = useState(generateMockDashboardData());
  const [tableData, setTableData] = useState(generateMockTableData(100));
  const [largeTableData, setLargeTableData] = useState(generateMockTableData(1000));

  // Test functions
  const runKPIPerformanceTest = async () => {
    setCurrentTest('KPI Cards Performance Test');
    
    const result = await timeOperation('kpi-render-test', async () => {
      // Simulate multiple rapid updates
      for (let i = 0; i < 10; i++) {
        setKpiData(generateMockKPIs());
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    });

    setTestResults(prev => [...prev, {
      test: 'KPI Cards Rapid Updates',
      duration: result,
      status: result < 100 ? 'pass' : 'warning'
    }]);
  };

  const runTablePerformanceTest = async () => {
    setCurrentTest('Table Performance Test');
    
    const smallTableResult = await timeOperation('small-table-render', async () => {
      setTableData(generateMockTableData(100));
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    const largeTableResult = await timeOperation('large-table-render', async () => {
      setLargeTableData(generateMockTableData(5000));
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    setTestResults(prev => [...prev, 
      {
        test: 'Small Table (100 rows)',
        duration: smallTableResult,
        status: smallTableResult < 50 ? 'pass' : 'warning'
      },
      {
        test: 'Large Table (5000 rows)',
        duration: largeTableResult,
        status: largeTableResult < 200 ? 'pass' : 'warning'
      }
    ]);
  };

  const runDashboardPerformanceTest = async () => {
    setCurrentTest('Dashboard Performance Test');
    
    const result = await timeOperation('dashboard-update', async () => {
      setDashboardData(generateMockDashboardData());
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    setTestResults(prev => [...prev, {
      test: 'Dashboard Full Update',
      duration: result,
      status: result < 200 ? 'pass' : 'warning'
    }]);
  };

  const runMemoryLeakTest = async () => {
    setCurrentTest('Memory Leak Test');
    
    const initialMemory = memoryStats.current;
    
    // Simulate heavy operations
    for (let i = 0; i < 50; i++) {
      setTableData(generateMockTableData(1000));
      setKpiData(generateMockKPIs());
      await new Promise(resolve => setTimeout(resolve, 20));
    }

    const finalMemory = memoryStats.current;
    const memoryIncrease = finalMemory - initialMemory;

    setTestResults(prev => [...prev, {
      test: 'Memory Leak Detection',
      duration: memoryIncrease,
      status: memoryIncrease < 5 * 1024 * 1024 ? 'pass' : 'fail', // 5MB threshold
      unit: 'bytes'
    }]);
  };

  const runAllTests = async () => {
    setTestResults([]);
    clearOperations();
    resetMetrics();
    
    await runKPIPerformanceTest();
    await runTablePerformanceTest();
    await runDashboardPerformanceTest();
    await runMemoryLeakTest();
    
    setCurrentTest('Tests Complete');
  };

  const clearResults = () => {
    setTestResults([]);
    clearOperations();
    resetMetrics();
    setCurrentTest('');
  };

  // Table columns for test results
  const testResultColumns = [
    {
      key: 'test',
      title: 'Test Name',
      dataIndex: 'test',
      width: '40%'
    },
    {
      key: 'duration',
      title: 'Duration',
      dataIndex: 'duration',
      width: '20%',
      render: (value: number, record: any) => (
        <span>
          {value.toFixed(2)} {record.unit || 'ms'}
        </span>
      )
    },
    {
      key: 'status',
      title: 'Status',
      dataIndex: 'status',
      width: '20%',
      render: (status: string) => (
        <Badge 
          variant={
            status === 'pass' ? 'default' : 
            status === 'warning' ? 'secondary' : 
            'destructive'
          }
        >
          {status.toUpperCase()}
        </Badge>
      )
    }
  ];

  const sampleTableColumns = [
    {
      key: 'id',
      title: 'ID',
      dataIndex: 'id',
      width: '10%'
    },
    {
      key: 'patientName',
      title: 'Patient Name',
      dataIndex: 'patientName',
      width: '25%'
    },
    {
      key: 'claimAmount',
      title: 'Claim Amount',
      dataIndex: 'claimAmount',
      width: '20%',
      render: (value: number) => `$${value.toFixed(2)}`
    },
    {
      key: 'status',
      title: 'Status',
      dataIndex: 'status',
      width: '15%',
      render: (status: string) => (
        <Badge variant={status === 'approved' ? 'default' : status === 'pending' ? 'secondary' : 'destructive'}>
          {status}
        </Badge>
      )
    },
    {
      key: 'daysInAR',
      title: 'Days in A/R',
      dataIndex: 'daysInAR',
      width: '15%'
    }
  ];

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>RCM Performance Test Suite</CardTitle>
          <p className="text-sm text-muted-foreground">
            Test suite for validating performance optimizations in RCM components
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4 mb-6">
            <Button onClick={runAllTests} disabled={currentTest !== '' && currentTest !== 'Tests Complete'}>
              Run All Tests
            </Button>
            <Button variant="outline" onClick={clearResults}>
              Clear Results
            </Button>
          </div>

          {currentTest && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium">Current Test: {currentTest}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Component Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-xs">
                  <div>Renders: {renderInfo.count}</div>
                  <div>Avg Render Time: {metrics.averageRenderTime.toFixed(1)}ms</div>
                  <div>Last Render: {metrics.lastRenderTime.toFixed(1)}ms</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Memory Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-xs">
                  <div>Current: {(memoryStats.current / 1024 / 1024).toFixed(1)}MB</div>
                  <div>Peak: {(memoryStats.peak / 1024 / 1024).toFixed(1)}MB</div>
                  <div>Leak Detected: {memoryStats.leakDetected ? 'Yes' : 'No'}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Operation Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-xs">
                  <div>Operations: {Object.keys(operations).length}</div>
                  <div>
                    Avg Duration: {
                      Object.keys(operations).length > 0 
                        ? (Object.values(operations).reduce((a, b) => a + b, 0) / Object.keys(operations).length).toFixed(1)
                        : 0
                    }ms
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {testResults.length > 0 && (
        <DataTable
          title="Test Results"
          columns={testResultColumns}
          data={testResults}
          className="mb-6"
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Optimized KPI Cards</CardTitle>
          </CardHeader>
          <CardContent>
            <KPICards kpis={kpiData} />
            <Button 
              className="mt-4" 
              variant="outline" 
              onClick={() => setKpiData(generateMockKPIs())}
            >
              Update KPIs
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Regular Table (100 rows)</h4>
                <DataTable
                  columns={sampleTableColumns}
                  data={tableData.slice(0, 10)}
                  maxHeight="200px"
                />
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Virtualized Table (1000+ rows)</h4>
                <VirtualizedTable
                  columns={sampleTableColumns}
                  data={largeTableData}
                  height={200}
                  itemHeight={40}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PerformanceTestSuite;