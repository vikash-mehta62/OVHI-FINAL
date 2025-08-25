/**
 * Performance Monitoring Hook
 * Provides performance monitoring capabilities for React components
 */

import { useEffect, useRef, useState, useCallback } from 'react';

interface PerformanceMetrics {
  renderTime: number;
  renderCount: number;
  averageRenderTime: number;
  lastRenderTime: number;
  memoryUsage?: number;
  componentName?: string;
}

interface UsePerformanceMonitorOptions {
  componentName?: string;
  enableMemoryTracking?: boolean;
  logToConsole?: boolean;
  threshold?: number; // Log warning if render time exceeds threshold (ms)
}

export const usePerformanceMonitor = (options: UsePerformanceMonitorOptions = {}) => {
  const {
    componentName = 'Unknown Component',
    enableMemoryTracking = false,
    logToConsole = process.env.NODE_ENV === 'development',
    threshold = 16 // 16ms for 60fps
  } = options;

  const renderStartTime = useRef<number>(0);
  const renderCount = useRef<number>(0);
  const totalRenderTime = useRef<number>(0);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    renderCount: 0,
    averageRenderTime: 0,
    lastRenderTime: 0,
    componentName
  });

  // Start performance measurement
  const startMeasurement = useCallback(() => {
    renderStartTime.current = performance.now();
  }, []);

  // End performance measurement
  const endMeasurement = useCallback(() => {
    const endTime = performance.now();
    const renderTime = endTime - renderStartTime.current;
    
    renderCount.current += 1;
    totalRenderTime.current += renderTime;
    
    const averageRenderTime = totalRenderTime.current / renderCount.current;
    
    const newMetrics: PerformanceMetrics = {
      renderTime,
      renderCount: renderCount.current,
      averageRenderTime,
      lastRenderTime: renderTime,
      componentName
    };

    // Add memory usage if enabled
    if (enableMemoryTracking && 'memory' in performance) {
      newMetrics.memoryUsage = (performance as any).memory.usedJSHeapSize;
    }

    setMetrics(newMetrics);

    // Log performance warnings
    if (logToConsole) {
      if (renderTime > threshold) {
        console.warn(
          `🐌 Slow render detected in ${componentName}:`,
          `${renderTime.toFixed(2)}ms (threshold: ${threshold}ms)`
        );
      }

      if (renderCount.current % 100 === 0) {
        console.log(
          `📊 Performance stats for ${componentName}:`,
          `Average: ${averageRenderTime.toFixed(2)}ms,`,
          `Renders: ${renderCount.current}`
        );
      }
    }
  }, [componentName, enableMemoryTracking, logToConsole, threshold]);

  // Measure render performance
  useEffect(() => {
    startMeasurement();
    return () => {
      endMeasurement();
    };
  });

  // Reset metrics
  const resetMetrics = useCallback(() => {
    renderCount.current = 0;
    totalRenderTime.current = 0;
    setMetrics({
      renderTime: 0,
      renderCount: 0,
      averageRenderTime: 0,
      lastRenderTime: 0,
      componentName
    });
  }, [componentName]);

  // Get performance summary
  const getPerformanceSummary = useCallback(() => {
    return {
      ...metrics,
      isPerformant: metrics.averageRenderTime <= threshold,
      performanceGrade: getPerformanceGrade(metrics.averageRenderTime, threshold)
    };
  }, [metrics, threshold]);

  return {
    metrics,
    resetMetrics,
    getPerformanceSummary,
    startMeasurement,
    endMeasurement
  };
};

// Helper function to get performance grade
const getPerformanceGrade = (averageTime: number, threshold: number): string => {
  const ratio = averageTime / threshold;
  
  if (ratio <= 0.5) return 'A+';
  if (ratio <= 0.75) return 'A';
  if (ratio <= 1.0) return 'B';
  if (ratio <= 1.5) return 'C';
  if (ratio <= 2.0) return 'D';
  return 'F';
};

/**
 * Hook for measuring specific operations
 */
export const useOperationTimer = () => {
  const [operations, setOperations] = useState<Record<string, number>>({});

  const timeOperation = useCallback(async <T>(
    operationName: string,
    operation: () => Promise<T> | T
  ): Promise<T> => {
    const startTime = performance.now();
    
    try {
      const result = await operation();
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      setOperations(prev => ({
        ...prev,
        [operationName]: duration
      }));
      
      return result;
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      setOperations(prev => ({
        ...prev,
        [`${operationName}_failed`]: duration
      }));
      
      throw error;
    }
  }, []);

  const getOperationStats = useCallback(() => {
    return Object.entries(operations).map(([name, duration]) => ({
      name,
      duration,
      grade: getPerformanceGrade(duration, 100) // 100ms threshold for operations
    }));
  }, [operations]);

  const clearOperations = useCallback(() => {
    setOperations({});
  }, []);

  return {
    timeOperation,
    operations,
    getOperationStats,
    clearOperations
  };
};

/**
 * Hook for monitoring component re-renders
 */
export const useRenderTracker = (componentName: string, props?: any) => {
  const renderCount = useRef(0);
  const prevProps = useRef(props);
  const [renderInfo, setRenderInfo] = useState({
    count: 0,
    changedProps: [] as string[]
  });

  useEffect(() => {
    renderCount.current += 1;
    
    let changedProps: string[] = [];
    
    if (props && prevProps.current) {
      changedProps = Object.keys(props).filter(
        key => props[key] !== prevProps.current[key]
      );
    }
    
    setRenderInfo({
      count: renderCount.current,
      changedProps
    });
    
    if (process.env.NODE_ENV === 'development' && changedProps.length > 0) {
      console.log(
        `🔄 ${componentName} re-rendered (#${renderCount.current})`,
        'Changed props:', changedProps
      );
    }
    
    prevProps.current = props;
  });

  return renderInfo;
};

/**
 * Hook for detecting memory leaks
 */
export const useMemoryLeakDetector = (componentName: string) => {
  const [memoryStats, setMemoryStats] = useState<{
    initial: number;
    current: number;
    peak: number;
    leakDetected: boolean;
  }>({
    initial: 0,
    current: 0,
    peak: 0,
    leakDetected: false
  });

  useEffect(() => {
    if (!('memory' in performance)) {
      return;
    }

    const memory = (performance as any).memory;
    const initialMemory = memory.usedJSHeapSize;
    
    setMemoryStats(prev => ({
      ...prev,
      initial: initialMemory,
      current: initialMemory
    }));

    const interval = setInterval(() => {
      const currentMemory = memory.usedJSHeapSize;
      const memoryIncrease = currentMemory - initialMemory;
      const leakThreshold = 10 * 1024 * 1024; // 10MB
      
      setMemoryStats(prev => ({
        initial: prev.initial,
        current: currentMemory,
        peak: Math.max(prev.peak, currentMemory),
        leakDetected: memoryIncrease > leakThreshold
      }));

      if (memoryIncrease > leakThreshold) {
        console.warn(
          `🚨 Potential memory leak detected in ${componentName}:`,
          `${(memoryIncrease / 1024 / 1024).toFixed(2)}MB increase`
        );
      }
    }, 5000); // Check every 5 seconds

    return () => {
      clearInterval(interval);
    };
  }, [componentName]);

  return memoryStats;
};