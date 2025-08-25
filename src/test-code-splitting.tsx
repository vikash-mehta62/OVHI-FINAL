/**
 * Code Splitting Test Suite
 * Tests the effectiveness of code splitting and lazy loading implementation
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

// Import bundle analyzer
import { useBundleAnalyzer } from '@/utils/bundleAnalyzer';

// Import lazy components for testing
import {
  LazyRCMDashboard,
  LazyKPICards,
  LazyChartsSection,
  LazyRevenueChart,
  LazyClaimsStatusChart,
  LazyDataTable,
  LazyVirtualizedTable,
  preloadComponents,
  bundleInfo,
  ChartLoadingFallback,
  DashboardLoadingFallback
} from '@/components/rcm/LazyComponents';

interface TestResult {
  component: string;
  loadTime: number;
  bundleSize: number;
  cached: boolean;
  status: 'success' | 'error' | 'loading';
  error?: string;
}

interface PerformanceMetrics {
  initialBundleSize: number;
  totalBundlesLoaded: number;
  averageLoadTime: number;
  cacheHitRate: number;
  memoryUsage: number;
}

const CodeSplittingTestSuite: React.FC = () => {
  const { stats, getBundle, clear, generateReport } = useBundleAnalyzer();
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [currentTest, setCurrentTest] = useState<string>('');
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [loadedComponents, setLoadedComponents] = useState<Set<string>>(new Set());

  // Test components configuration
  const testComponents = [
    {
      name: 'RCM Dashboard',
      component: LazyRCMDashboard,
      expectedBundle: 'rcm-dashboard',
      category: 'dashboard'
    },
    {
      name: 'KPI Cards',
      component: LazyKPICards,
      expectedBundle: 'rcm-dashboard',
      category: 'dashboard'
    },
    {
      name: 'Charts Section',
      component: LazyChartsSection,
      expectedBundle: 'rcm-charts',
      category: 'charts'
    },
    {
      name: 'Revenue Chart',
      component: LazyRevenueChart,
      expectedBundle: 'rcm-charts',
      category: 'charts'
    },
    {
      name: 'Claims Status Chart',
      component: LazyClaimsStatusChart,
      expectedBundle: 'rcm-charts',
      category: 'charts'
    },
    {
      name: 'Data Table',
      component: LazyDataTable,
      expectedBundle: 'rcm-shared',
      category: 'shared'
    },
    {
      name: 'Virtualized Table',
      component: LazyVirtualizedTable,
      expectedBundle: 'rcm-shared',
      category: 'shared'
    }
  ];

  // Test individual component loading
  const testComponentLoading = async (testComponent: typeof testComponents[0]) => {
    const startTime = performance.now();
    const startMemory = (performance as any).memory?.usedJSHeapSize || 0;

    try {
      setCurrentTest(`Loading ${testComponent.name}...`);
      
      // Dynamically import the component
      const module = await import(`@/components/rcm/LazyComponents`);
      const Component = module[testComponent.component.name as keyof typeof module] as React.ComponentType;
      
      const endTime = performance.now();
      const loadTime = endTime - startTime;
      const endMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryIncrease = endMemory - startMemory;

      // Get bundle information
      const bundle = getBundle(testComponent.expectedBundle);
      
      const result: TestResult = {
        component: testComponent.name,
        loadTime,
        bundleSize: bundle?.size || 0,
        cached: bundle?.cached || false,
        status: 'success'
      };

      setTestResults(prev => [...prev, result]);
      setLoadedComponents(prev => new Set([...prev, testComponent.name]));

      return result;
    } catch (error) {
      const endTime = performance.now();
      const loadTime = endTime - startTime;

      const result: TestResult = {
        component: testComponent.name,
        loadTime,
        bundleSize: 0,
        cached: false,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      setTestResults(prev => [...prev, result]);
      return result;
    }
  };

  // Test preloading functionality
  const testPreloading = async () => {
    setCurrentTest('Testing preloading...');
    
    const preloadTests = [
      { name: 'Dashboard Preload', fn: preloadComponents.dashboard },
      { name: 'Charts Preload', fn: preloadComponents.charts },
      { name: 'Management Preload', fn: preloadComponents.management }
    ];

    for (const test of preloadTests) {
      const startTime = performance.now();
      
      try {
        await test.fn();
        const endTime = performance.now();
        const loadTime = endTime - startTime;

        setTestResults(prev => [...prev, {
          component: test.name,
          loadTime,
          bundleSize: 0,
          cached: true,
          status: 'success'
        }]);
      } catch (error) {
        setTestResults(prev => [...prev, {
          component: test.name,
          loadTime: 0,
          bundleSize: 0,
          cached: false,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        }]);
      }
    }
  };

  // Test bundle size optimization
  const testBundleSizes = () => {
    setCurrentTest('Analyzing bundle sizes...');
    
    const bundleSizeTests = Object.entries(bundleInfo).map(([category, info]) => ({
      component: `${category} Bundle`,
      loadTime: 0,
      bundleSize: parseInt(info.estimatedSize.replace('KB', '')) * 1024,
      cached: false,
      status: 'success' as const
    }));

    setTestResults(prev => [...prev, ...bundleSizeTests]);
  };

  // Calculate performance metrics
  const calculatePerformanceMetrics = (): PerformanceMetrics => {
    const successfulTests = testResults.filter(result => result.status === 'success');
    const totalBundleSize = successfulTests.reduce((sum, result) => sum + result.bundleSize, 0);
    const averageLoadTime = successfulTests.length > 0 
      ? successfulTests.reduce((sum, result) => sum + result.loadTime, 0) / successfulTests.length 
      : 0;
    const cachedTests = successfulTests.filter(result => result.cached);
    const cacheHitRate = successfulTests.length > 0 ? (cachedTests.length / successfulTests.length) * 100 : 0;
    const memoryUsage = (performance as any).memory?.usedJSHeapSize || 0;

    return {
      initialBundleSize: totalBundleSize,
      totalBundlesLoaded: stats.totalBundles,
      averageLoadTime,
      cacheHitRate,
      memoryUsage
    };
  };

  // Run all tests
  const runAllTests = async () => {
    setTestResults([]);
    setLoadedComponents(new Set());
    clear();

    // Test individual components
    for (const testComponent of testComponents) {
      await testComponentLoading(testComponent);
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Test preloading
    await testPreloading();

    // Test bundle sizes
    testBundleSizes();

    // Calculate final metrics
    const metrics = calculatePerformanceMetrics();
    setPerformanceMetrics(metrics);

    setCurrentTest('Tests completed');
  };

  // Clear all test results
  const clearResults = () => {
    setTestResults([]);
    setLoadedComponents(new Set());
    setPerformanceMetrics(null);
    setCurrentTest('');
    clear();
  };

  // Get performance grade
  const getPerformanceGrade = (loadTime: number): string => {
    if (loadTime < 50) return 'A+';
    if (loadTime < 100) return 'A';
    if (loadTime < 200) return 'B';
    if (loadTime < 500) return 'C';
    return 'D';
  };

  // Format bytes
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Table columns for test results
  const testResultColumns = [
    {
      key: 'component',
      title: 'Component',
      dataIndex: 'component',
      width: '30%'
    },
    {
      key: 'loadTime',
      title: 'Load Time',
      dataIndex: 'loadTime',
      width: '15%',
      render: (value: number) => `${value.toFixed(2)}ms`
    },
    {
      key: 'bundleSize',
      title: 'Bundle Size',
      dataIndex: 'bundleSize',
      width: '15%',
      render: (value: number) => formatBytes(value)
    },
    {
      key: 'cached',
      title: 'Cached',
      dataIndex: 'cached',
      width: '10%',
      render: (value: boolean) => (
        <Badge variant={value ? 'default' : 'secondary'}>
          {value ? 'Yes' : 'No'}
        </Badge>
      )
    },
    {
      key: 'status',
      title: 'Status',
      dataIndex: 'status',
      width: '15%',
      render: (status: string, record: TestResult) => (
        <div className="flex items-center space-x-2">
          <Badge 
            variant={
              status === 'success' ? 'default' : 
              status === 'error' ? 'destructive' : 
              'secondary'
            }
          >
            {status.toUpperCase()}
          </Badge>
          {status === 'success' && (
            <Badge variant="outline">
              {getPerformanceGrade(record.loadTime)}
            </Badge>
          )}
        </div>
      )
    },
    {
      key: 'error',
      title: 'Error',
      dataIndex: 'error',
      width: '15%',
      render: (error: string) => error ? (
        <span className="text-red-600 text-xs truncate" title={error}>
          {error}
        </span>
      ) : null
    }
  ];

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Code Splitting Test Suite</CardTitle>
          <p className="text-sm text-muted-foreground">
            Test suite for validating code splitting and lazy loading effectiveness
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4 mb-6">
            <Button 
              onClick={runAllTests} 
              disabled={currentTest !== '' && currentTest !== 'Tests completed'}
            >
              Run All Tests
            </Button>
            <Button variant="outline" onClick={clearResults}>
              Clear Results
            </Button>
            <Button variant="outline" onClick={() => console.log(generateReport())}>
              Generate Report
            </Button>
          </div>

          {currentTest && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium">Current Test: {currentTest}</p>
            </div>
          )}

          {performanceMetrics && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Bundle Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-xs">
                    <div>Total Bundles: {performanceMetrics.totalBundlesLoaded}</div>
                    <div>Initial Size: {formatBytes(performanceMetrics.initialBundleSize)}</div>
                    <div>Avg Load Time: {performanceMetrics.averageLoadTime.toFixed(1)}ms</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Cache Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-xs">
                    <div>Hit Rate: {performanceMetrics.cacheHitRate.toFixed(1)}%</div>
                    <Progress value={performanceMetrics.cacheHitRate} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Memory Usage</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-xs">
                    <div>Current: {formatBytes(performanceMetrics.memoryUsage)}</div>
                    <div>Components Loaded: {loadedComponents.size}</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>

      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    {testResultColumns.map(column => (
                      <th 
                        key={column.key}
                        className="border border-gray-300 px-4 py-2 text-left text-sm font-medium"
                        style={{ width: column.width }}
                      >
                        {column.title}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {testResults.map((result, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      {testResultColumns.map(column => (
                        <td key={column.key} className="border border-gray-300 px-4 py-2 text-sm">
                          {column.render 
                            ? column.render(result[column.dataIndex as keyof TestResult] as any, result)
                            : result[column.dataIndex as keyof TestResult]
                          }
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Bundle Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(bundleInfo).map(([category, info]) => (
              <Card key={category}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm capitalize">{category}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-xs">
                    <div>Components: {info.components.length}</div>
                    <div>Est. Size: {info.estimatedSize}</div>
                    <div className="text-gray-500">
                      {info.components.join(', ')}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CodeSplittingTestSuite;