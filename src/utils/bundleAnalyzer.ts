/**
 * Bundle Analyzer Utility
 * Provides runtime bundle analysis and code splitting monitoring
 */

interface BundleInfo {
  name: string;
  size: number;
  loadTime: number;
  cached: boolean;
  error?: string;
}

interface BundleStats {
  totalBundles: number;
  totalSize: number;
  averageLoadTime: number;
  cacheHitRate: number;
  errorRate: number;
  bundles: BundleInfo[];
}

class BundleAnalyzer {
  private bundles: Map<string, BundleInfo> = new Map();
  private loadStartTimes: Map<string, number> = new Map();
  private observers: Set<(stats: BundleStats) => void> = new Set();

  constructor() {
    this.setupPerformanceObserver();
    this.setupResourceObserver();
  }

  /**
   * Setup performance observer for bundle loading
   */
  private setupPerformanceObserver() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation' || entry.entryType === 'resource') {
            this.processPerformanceEntry(entry as PerformanceResourceTiming);
          }
        }
      });

      observer.observe({ entryTypes: ['navigation', 'resource'] });
    }
  }

  /**
   * Setup resource observer for dynamic imports
   */
  private setupResourceObserver() {
    // Override dynamic import to track bundle loading
    const originalImport = window.eval('import');
    
    if (originalImport) {
      window.eval(`
        window.__originalImport = import;
        window.import = function(specifier) {
          window.bundleAnalyzer?.trackBundleStart(specifier);
          return window.__originalImport(specifier)
            .then(module => {
              window.bundleAnalyzer?.trackBundleSuccess(specifier, module);
              return module;
            })
            .catch(error => {
              window.bundleAnalyzer?.trackBundleError(specifier, error);
              throw error;
            });
        };
      `);
    }

    // Make analyzer available globally
    (window as any).bundleAnalyzer = this;
  }

  /**
   * Process performance entry
   */
  private processPerformanceEntry(entry: PerformanceResourceTiming) {
    const url = entry.name;
    
    // Check if this is a JavaScript bundle
    if (url.includes('.js') && (url.includes('chunk') || url.includes('lazy'))) {
      const bundleName = this.extractBundleName(url);
      const size = entry.transferSize || entry.encodedBodySize || 0;
      const loadTime = entry.responseEnd - entry.requestStart;
      const cached = entry.transferSize === 0 && entry.encodedBodySize > 0;

      this.bundles.set(bundleName, {
        name: bundleName,
        size,
        loadTime,
        cached
      });

      this.notifyObservers();
    }
  }

  /**
   * Extract bundle name from URL
   */
  private extractBundleName(url: string): string {
    const parts = url.split('/');
    const filename = parts[parts.length - 1];
    return filename.split('.')[0] || 'unknown';
  }

  /**
   * Track bundle loading start
   */
  trackBundleStart(specifier: string) {
    const bundleName = this.extractBundleName(specifier);
    this.loadStartTimes.set(bundleName, performance.now());
  }

  /**
   * Track successful bundle loading
   */
  trackBundleSuccess(specifier: string, module: any) {
    const bundleName = this.extractBundleName(specifier);
    const startTime = this.loadStartTimes.get(bundleName);
    
    if (startTime) {
      const loadTime = performance.now() - startTime;
      const existingBundle = this.bundles.get(bundleName);
      
      this.bundles.set(bundleName, {
        name: bundleName,
        size: existingBundle?.size || 0,
        loadTime,
        cached: loadTime < 10 // Assume cached if very fast
      });

      this.loadStartTimes.delete(bundleName);
      this.notifyObservers();
    }
  }

  /**
   * Track bundle loading error
   */
  trackBundleError(specifier: string, error: Error) {
    const bundleName = this.extractBundleName(specifier);
    const startTime = this.loadStartTimes.get(bundleName);
    
    if (startTime) {
      const loadTime = performance.now() - startTime;
      
      this.bundles.set(bundleName, {
        name: bundleName,
        size: 0,
        loadTime,
        cached: false,
        error: error.message
      });

      this.loadStartTimes.delete(bundleName);
      this.notifyObservers();
    }
  }

  /**
   * Get bundle statistics
   */
  getStats(): BundleStats {
    const bundles = Array.from(this.bundles.values());
    const totalBundles = bundles.length;
    const totalSize = bundles.reduce((sum, bundle) => sum + bundle.size, 0);
    const averageLoadTime = totalBundles > 0 
      ? bundles.reduce((sum, bundle) => sum + bundle.loadTime, 0) / totalBundles 
      : 0;
    const cachedBundles = bundles.filter(bundle => bundle.cached).length;
    const cacheHitRate = totalBundles > 0 ? (cachedBundles / totalBundles) * 100 : 0;
    const errorBundles = bundles.filter(bundle => bundle.error).length;
    const errorRate = totalBundles > 0 ? (errorBundles / totalBundles) * 100 : 0;

    return {
      totalBundles,
      totalSize,
      averageLoadTime,
      cacheHitRate,
      errorRate,
      bundles: bundles.sort((a, b) => b.size - a.size)
    };
  }

  /**
   * Get bundle by name
   */
  getBundle(name: string): BundleInfo | undefined {
    return this.bundles.get(name);
  }

  /**
   * Subscribe to bundle stats updates
   */
  subscribe(callback: (stats: BundleStats) => void) {
    this.observers.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.observers.delete(callback);
    };
  }

  /**
   * Notify observers of stats changes
   */
  private notifyObservers() {
    const stats = this.getStats();
    this.observers.forEach(callback => callback(stats));
  }

  /**
   * Clear all bundle data
   */
  clear() {
    this.bundles.clear();
    this.loadStartTimes.clear();
    this.notifyObservers();
  }

  /**
   * Export stats as JSON
   */
  exportStats(): string {
    return JSON.stringify(this.getStats(), null, 2);
  }

  /**
   * Generate bundle report
   */
  generateReport(): string {
    const stats = this.getStats();
    
    let report = `Bundle Analysis Report\n`;
    report += `========================\n\n`;
    report += `Total Bundles: ${stats.totalBundles}\n`;
    report += `Total Size: ${this.formatBytes(stats.totalSize)}\n`;
    report += `Average Load Time: ${stats.averageLoadTime.toFixed(2)}ms\n`;
    report += `Cache Hit Rate: ${stats.cacheHitRate.toFixed(1)}%\n`;
    report += `Error Rate: ${stats.errorRate.toFixed(1)}%\n\n`;
    
    report += `Bundle Details:\n`;
    report += `---------------\n`;
    
    stats.bundles.forEach(bundle => {
      report += `${bundle.name}:\n`;
      report += `  Size: ${this.formatBytes(bundle.size)}\n`;
      report += `  Load Time: ${bundle.loadTime.toFixed(2)}ms\n`;
      report += `  Cached: ${bundle.cached ? 'Yes' : 'No'}\n`;
      if (bundle.error) {
        report += `  Error: ${bundle.error}\n`;
      }
      report += `\n`;
    });

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
export const bundleAnalyzer = new BundleAnalyzer();

// React hook for using bundle analyzer
export const useBundleAnalyzer = () => {
  const [stats, setStats] = React.useState<BundleStats>(bundleAnalyzer.getStats());

  React.useEffect(() => {
    const unsubscribe = bundleAnalyzer.subscribe(setStats);
    return unsubscribe;
  }, []);

  return {
    stats,
    getBundle: bundleAnalyzer.getBundle.bind(bundleAnalyzer),
    clear: bundleAnalyzer.clear.bind(bundleAnalyzer),
    exportStats: bundleAnalyzer.exportStats.bind(bundleAnalyzer),
    generateReport: bundleAnalyzer.generateReport.bind(bundleAnalyzer)
  };
};

// Development helper
if (process.env.NODE_ENV === 'development') {
  (window as any).bundleAnalyzer = bundleAnalyzer;
  
  // Log bundle stats every 10 seconds in development
  setInterval(() => {
    const stats = bundleAnalyzer.getStats();
    if (stats.totalBundles > 0) {
      console.group('📦 Bundle Stats');
      console.log(`Total Bundles: ${stats.totalBundles}`);
      console.log(`Total Size: ${bundleAnalyzer['formatBytes'](stats.totalSize)}`);
      console.log(`Average Load Time: ${stats.averageLoadTime.toFixed(2)}ms`);
      console.log(`Cache Hit Rate: ${stats.cacheHitRate.toFixed(1)}%`);
      console.groupEnd();
    }
  }, 10000);
}

export default bundleAnalyzer;