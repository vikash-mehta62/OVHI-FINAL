/**
 * Bundle Optimizer
 * Intelligent bundle loading optimization based on user behavior and network conditions
 */

import { bundleAnalyzer } from './bundleAnalyzer';

interface NetworkInfo {
  effectiveType: '2g' | '3g' | '4g' | 'slow-2g';
  downlink: number;
  rtt: number;
  saveData: boolean;
}

interface UserBehavior {
  visitedRoutes: Set<string>;
  routeFrequency: Map<string, number>;
  sessionDuration: number;
  interactionCount: number;
  lastActivity: number;
}

interface OptimizationStrategy {
  preloadThreshold: number;
  maxConcurrentLoads: number;
  priorityRoutes: string[];
  deferredRoutes: string[];
  cacheStrategy: 'aggressive' | 'conservative' | 'adaptive';
}

class BundleOptimizer {
  private networkInfo: NetworkInfo | null = null;
  private userBehavior: UserBehavior;
  private strategy: OptimizationStrategy;
  private loadQueue: Array<{ priority: number; loader: () => Promise<any> }> = [];
  private activeLoads = 0;
  private observers: Set<(strategy: OptimizationStrategy) => void> = new Set();

  constructor() {
    this.userBehavior = {
      visitedRoutes: new Set(),
      routeFrequency: new Map(),
      sessionDuration: 0,
      interactionCount: 0,
      lastActivity: Date.now()
    };

    this.strategy = this.getDefaultStrategy();
    this.initializeNetworkMonitoring();
    this.initializeBehaviorTracking();
    this.startOptimizationLoop();
  }

  /**
   * Get default optimization strategy
   */
  private getDefaultStrategy(): OptimizationStrategy {
    return {
      preloadThreshold: 0.7,
      maxConcurrentLoads: 3,
      priorityRoutes: ['/rcm/dashboard'],
      deferredRoutes: ['/rcm/statements', '/rcm/eligibility'],
      cacheStrategy: 'adaptive'
    };
  }

  /**
   * Initialize network condition monitoring
   */
  private initializeNetworkMonitoring() {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      
      this.networkInfo = {
        effectiveType: connection.effectiveType || '4g',
        downlink: connection.downlink || 10,
        rtt: connection.rtt || 100,
        saveData: connection.saveData || false
      };

      connection.addEventListener('change', () => {
        this.networkInfo = {
          effectiveType: connection.effectiveType || '4g',
          downlink: connection.downlink || 10,
          rtt: connection.rtt || 100,
          saveData: connection.saveData || false
        };
        
        this.updateStrategy();
      });
    }
  }

  /**
   * Initialize user behavior tracking
   */
  private initializeBehaviorTracking() {
    // Track route changes
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = (...args) => {
      this.trackRouteVisit(args[2] as string);
      return originalPushState.apply(history, args);
    };

    history.replaceState = (...args) => {
      this.trackRouteVisit(args[2] as string);
      return originalReplaceState.apply(history, args);
    };

    window.addEventListener('popstate', () => {
      this.trackRouteVisit(window.location.pathname);
    });

    // Track user interactions
    ['click', 'scroll', 'keydown', 'mousemove'].forEach(event => {
      document.addEventListener(event, this.trackInteraction.bind(this), { passive: true });
    });

    // Track session duration
    setInterval(() => {
      this.userBehavior.sessionDuration += 1000;
    }, 1000);
  }

  /**
   * Track route visits
   */
  private trackRouteVisit(route: string) {
    this.userBehavior.visitedRoutes.add(route);
    const frequency = this.userBehavior.routeFrequency.get(route) || 0;
    this.userBehavior.routeFrequency.set(route, frequency + 1);
    this.updateStrategy();
  }

  /**
   * Track user interactions
   */
  private trackInteraction() {
    this.userBehavior.interactionCount++;
    this.userBehavior.lastActivity = Date.now();
  }

  /**
   * Update optimization strategy based on conditions
   */
  private updateStrategy() {
    const newStrategy = { ...this.strategy };

    // Adjust based on network conditions
    if (this.networkInfo) {
      if (this.networkInfo.saveData || this.networkInfo.effectiveType === 'slow-2g') {
        newStrategy.preloadThreshold = 0.9;
        newStrategy.maxConcurrentLoads = 1;
        newStrategy.cacheStrategy = 'conservative';
      } else if (this.networkInfo.effectiveType === '2g') {
        newStrategy.preloadThreshold = 0.8;
        newStrategy.maxConcurrentLoads = 2;
        newStrategy.cacheStrategy = 'conservative';
      } else if (this.networkInfo.effectiveType === '4g' && this.networkInfo.downlink > 5) {
        newStrategy.preloadThreshold = 0.5;
        newStrategy.maxConcurrentLoads = 4;
        newStrategy.cacheStrategy = 'aggressive';
      }
    }

    // Adjust based on user behavior
    const frequentRoutes = Array.from(this.userBehavior.routeFrequency.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([route]) => route);

    newStrategy.priorityRoutes = [...new Set([...newStrategy.priorityRoutes, ...frequentRoutes])];

    // Adjust based on session activity
    const isActiveUser = this.userBehavior.interactionCount > 10 && 
                        Date.now() - this.userBehavior.lastActivity < 30000;

    if (isActiveUser) {
      newStrategy.preloadThreshold *= 0.8; // More aggressive preloading for active users
    }

    this.strategy = newStrategy;
    this.notifyObservers();
  }

  /**
   * Start optimization loop
   */
  private startOptimizationLoop() {
    setInterval(() => {
      this.processLoadQueue();
      this.optimizeCache();
    }, 1000);
  }

  /**
   * Process load queue based on strategy
   */
  private processLoadQueue() {
    while (this.loadQueue.length > 0 && this.activeLoads < this.strategy.maxConcurrentLoads) {
      const item = this.loadQueue.shift();
      if (item) {
        this.activeLoads++;
        item.loader()
          .finally(() => {
            this.activeLoads--;
          });
      }
    }
  }

  /**
   * Optimize cache based on strategy
   */
  private optimizeCache() {
    const stats = bundleAnalyzer.getStats();
    
    if (this.strategy.cacheStrategy === 'conservative' && stats.totalSize > 5 * 1024 * 1024) {
      // Clear cache if over 5MB in conservative mode
      this.clearLeastUsedCache();
    } else if (this.strategy.cacheStrategy === 'aggressive') {
      // Preload frequently used components
      this.preloadFrequentComponents();
    }
  }

  /**
   * Clear least used cache entries
   */
  private clearLeastUsedCache() {
    // Implementation would clear least recently used cache entries
    console.log('Clearing least used cache entries');
  }

  /**
   * Preload frequently used components
   */
  private preloadFrequentComponents() {
    const frequentRoutes = Array.from(this.userBehavior.routeFrequency.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([route]) => route);

    // Implementation would preload components for frequent routes
    console.log('Preloading components for frequent routes:', frequentRoutes);
  }

  /**
   * Add component to load queue
   */
  addToLoadQueue(loader: () => Promise<any>, priority: number = 0) {
    this.loadQueue.push({ priority, loader });
    this.loadQueue.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get current optimization strategy
   */
  getStrategy(): OptimizationStrategy {
    return { ...this.strategy };
  }

  /**
   * Get network information
   */
  getNetworkInfo(): NetworkInfo | null {
    return this.networkInfo ? { ...this.networkInfo } : null;
  }

  /**
   * Get user behavior data
   */
  getUserBehavior(): UserBehavior {
    return {
      visitedRoutes: new Set(this.userBehavior.visitedRoutes),
      routeFrequency: new Map(this.userBehavior.routeFrequency),
      sessionDuration: this.userBehavior.sessionDuration,
      interactionCount: this.userBehavior.interactionCount,
      lastActivity: this.userBehavior.lastActivity
    };
  }

  /**
   * Should preload component based on current strategy
   */
  shouldPreload(route: string, probability: number = 0.5): boolean {
    // Check if route is in priority list
    if (this.strategy.priorityRoutes.includes(route)) {
      return true;
    }

    // Check if route is deferred
    if (this.strategy.deferredRoutes.includes(route)) {
      return false;
    }

    // Check against threshold
    return probability >= this.strategy.preloadThreshold;
  }

  /**
   * Get recommended chunk size based on network conditions
   */
  getRecommendedChunkSize(): number {
    if (!this.networkInfo) return 250000; // 250KB default

    if (this.networkInfo.saveData || this.networkInfo.effectiveType === 'slow-2g') {
      return 50000; // 50KB for slow connections
    } else if (this.networkInfo.effectiveType === '2g') {
      return 100000; // 100KB for 2G
    } else if (this.networkInfo.effectiveType === '3g') {
      return 200000; // 200KB for 3G
    } else {
      return 500000; // 500KB for 4G+
    }
  }

  /**
   * Get loading priority for route
   */
  getLoadingPriority(route: string): number {
    const frequency = this.userBehavior.routeFrequency.get(route) || 0;
    const isPriority = this.strategy.priorityRoutes.includes(route);
    const isDeferred = this.strategy.deferredRoutes.includes(route);

    if (isPriority) return 10 + frequency;
    if (isDeferred) return 1;
    return 5 + frequency;
  }

  /**
   * Subscribe to strategy updates
   */
  subscribe(callback: (strategy: OptimizationStrategy) => void) {
    this.observers.add(callback);
    return () => this.observers.delete(callback);
  }

  /**
   * Notify observers of strategy changes
   */
  private notifyObservers() {
    this.observers.forEach(callback => callback(this.strategy));
  }

  /**
   * Generate optimization report
   */
  generateReport(): string {
    const networkInfo = this.getNetworkInfo();
    const userBehavior = this.getUserBehavior();
    const strategy = this.getStrategy();

    let report = `Bundle Optimization Report\n`;
    report += `==========================\n\n`;

    // Network Information
    report += `Network Conditions:\n`;
    if (networkInfo) {
      report += `  Connection Type: ${networkInfo.effectiveType}\n`;
      report += `  Downlink: ${networkInfo.downlink} Mbps\n`;
      report += `  RTT: ${networkInfo.rtt}ms\n`;
      report += `  Save Data: ${networkInfo.saveData ? 'Yes' : 'No'}\n`;
    } else {
      report += `  Network API not supported\n`;
    }
    report += `\n`;

    // User Behavior
    report += `User Behavior:\n`;
    report += `  Session Duration: ${Math.round(userBehavior.sessionDuration / 1000)}s\n`;
    report += `  Interactions: ${userBehavior.interactionCount}\n`;
    report += `  Visited Routes: ${userBehavior.visitedRoutes.size}\n`;
    report += `  Most Frequent Routes:\n`;
    
    const topRoutes = Array.from(userBehavior.routeFrequency.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);
    
    topRoutes.forEach(([route, frequency]) => {
      report += `    ${route}: ${frequency} visits\n`;
    });
    report += `\n`;

    // Current Strategy
    report += `Optimization Strategy:\n`;
    report += `  Preload Threshold: ${strategy.preloadThreshold}\n`;
    report += `  Max Concurrent Loads: ${strategy.maxConcurrentLoads}\n`;
    report += `  Cache Strategy: ${strategy.cacheStrategy}\n`;
    report += `  Priority Routes: ${strategy.priorityRoutes.join(', ')}\n`;
    report += `  Deferred Routes: ${strategy.deferredRoutes.join(', ')}\n`;
    report += `  Recommended Chunk Size: ${this.formatBytes(this.getRecommendedChunkSize())}\n`;

    return report;
  }

  /**
   * Format bytes to human readable format
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Create global instance
export const bundleOptimizer = new BundleOptimizer();

// React hook for using bundle optimizer
export const useBundleOptimizer = () => {
  const [strategy, setStrategy] = React.useState<OptimizationStrategy>(bundleOptimizer.getStrategy());

  React.useEffect(() => {
    const unsubscribe = bundleOptimizer.subscribe(setStrategy);
    return unsubscribe;
  }, []);

  return {
    strategy,
    networkInfo: bundleOptimizer.getNetworkInfo(),
    userBehavior: bundleOptimizer.getUserBehavior(),
    shouldPreload: bundleOptimizer.shouldPreload.bind(bundleOptimizer),
    getLoadingPriority: bundleOptimizer.getLoadingPriority.bind(bundleOptimizer),
    getRecommendedChunkSize: bundleOptimizer.getRecommendedChunkSize.bind(bundleOptimizer),
    addToLoadQueue: bundleOptimizer.addToLoadQueue.bind(bundleOptimizer),
    generateReport: bundleOptimizer.generateReport.bind(bundleOptimizer)
  };
};

// Development helper
if (process.env.NODE_ENV === 'development') {
  (window as any).bundleOptimizer = bundleOptimizer;
}

export default bundleOptimizer;