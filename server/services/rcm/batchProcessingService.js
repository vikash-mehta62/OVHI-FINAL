const EventEmitter = require('events');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const path = require('path');

class BatchProcessingService extends EventEmitter {
  constructor() {
    super();
    
    this.config = {
      maxConcurrentJobs: 5,
      defaultBatchSize: 100,
      maxRetries: 3,
      retryDelay: 1000,
      jobTimeout: 300000, // 5 minutes
      maxWorkers: require('os').cpus().length
    };
    
    this.activeJobs = new Map();
    this.jobQueue = [];
    this.workers = [];
    this.jobHistory = [];
    this.stats = {
      totalJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      averageProcessingTime: 0,
      totalProcessingTime: 0
    };
  }

  // Job Management
  async createJob(jobType, data, options = {}) {
    const job = {
      id: this.generateJobId(),
      type: jobType,
      data,
      status: 'queued',
      priority: options.priority || 0,
      batchSize: options.batchSize || this.config.defaultBatchSize,
      maxRetries: options.maxRetries || this.config.maxRetries,
      retries: 0,
      createdAt: new Date(),
      startedAt: null,
      completedAt: null,
      progress: 0,
      totalItems: Array.isArray(data) ? data.length : 1,
      processedItems: 0,
      errors: [],
      results: []
    };

    this.jobQueue.push(job);
    this.stats.totalJobs++;
    
    // Sort queue by priority (higher priority first)
    this.jobQueue.sort((a, b) => b.priority - a.priority);
    
    this.emit('jobCreated', job);
    
    // Start processing if workers are available
    this.processQueue();
    
    return job.id;
  }

  async processQueue() {
    if (this.jobQueue.length === 0 || this.activeJobs.size >= this.config.maxConcurrentJobs) {
      return;
    }

    const job = this.jobQueue.shift();
    if (!job) return;

    job.status = 'processing';
    job.startedAt = new Date();
    this.activeJobs.set(job.id, job);
    
    this.emit('jobStarted', job);
    
    try {
      await this.processJob(job);
    } catch (error) {
      await this.handleJobError(job, error);
    }
    
    // Continue processing queue
    setImmediate(() => this.processQueue());
  }

  async processJob(job) {
    const processor = this.getJobProcessor(job.type);
    if (!processor) {
      throw new Error(`No processor found for job type: ${job.type}`);
    }

    const startTime = Date.now();
    
    try {
      if (Array.isArray(job.data)) {
        // Batch processing
        await this.processBatchJob(job, processor);
      } else {
        // Single item processing
        const result = await processor(job.data, job);
        job.results.push(result);
        job.processedItems = 1;
      }
      
      job.status = 'completed';
      job.completedAt = new Date();
      job.progress = 100;
      
      const processingTime = Date.now() - startTime;
      this.updateStats(processingTime, true);
      
      this.emit('jobCompleted', job);
      
    } catch (error) {
      throw error;
    } finally {
      this.activeJobs.delete(job.id);
      this.jobHistory.push({ ...job });
      
      // Keep only last 1000 jobs in history
      if (this.jobHistory.length > 1000) {
        this.jobHistory = this.jobHistory.slice(-1000);
      }
    }
  }

  async processBatchJob(job, processor) {
    const batches = this.createBatches(job.data, job.batchSize);
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const batchResults = [];
      
      // Process batch items
      for (const item of batch) {
        try {
          const result = await processor(item, job);
          batchResults.push(result);
          job.processedItems++;
        } catch (error) {
          job.errors.push({
            item,
            error: error.message,
            timestamp: new Date()
          });
        }
        
        // Update progress
        job.progress = Math.round((job.processedItems / job.totalItems) * 100);
        this.emit('jobProgress', job);
      }
      
      job.results.push(...batchResults);
      
      // Allow other jobs to process between batches
      await new Promise(resolve => setImmediate(resolve));
    }
  }

  createBatches(items, batchSize) {
    const batches = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  async handleJobError(job, error) {
    job.errors.push({
      error: error.message,
      timestamp: new Date(),
      retry: job.retries
    });

    if (job.retries < job.maxRetries) {
      job.retries++;
      job.status = 'retrying';
      
      // Add delay before retry
      setTimeout(() => {
        job.status = 'queued';
        this.jobQueue.unshift(job); // Add to front of queue
        this.processQueue();
      }, this.config.retryDelay * job.retries);
      
      this.emit('jobRetry', job);
    } else {
      job.status = 'failed';
      job.completedAt = new Date();
      
      this.updateStats(0, false);
      this.activeJobs.delete(job.id);
      this.jobHistory.push({ ...job });
      
      this.emit('jobFailed', job);
    }
  }

  // Job Processors
  getJobProcessor(jobType) {
    const processors = {
      'validate_claims': this.validateClaimsProcessor.bind(this),
      'generate_reports': this.generateReportsProcessor.bind(this),
      'process_payments': this.processPaymentsProcessor.bind(this),
      'sync_external_data': this.syncExternalDataProcessor.bind(this),
      'cleanup_data': this.cleanupDataProcessor.bind(this),
      'export_data': this.exportDataProcessor.bind(this),
      'import_data': this.importDataProcessor.bind(this)
    };
    
    return processors[jobType];
  }

  async validateClaimsProcessor(claimData, job) {
    // Simulate claim validation processing
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return {
      claimId: claimData.id,
      status: 'validated',
      validationResults: {
        isValid: Math.random() > 0.1, // 90% success rate
        errors: [],
        warnings: []
      }
    };
  }

  async generateReportsProcessor(reportConfig, job) {
    // Simulate report generation
    await new Promise(resolve => setTimeout(resolve, 200));
    
    return {
      reportId: reportConfig.id,
      type: reportConfig.type,
      status: 'generated',
      fileName: `report_${Date.now()}.pdf`
    };
  }

  async processPaymentsProcessor(paymentData, job) {
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return {
      paymentId: paymentData.id,
      status: 'processed',
      amount: paymentData.amount,
      processedAt: new Date()
    };
  }

  async syncExternalDataProcessor(syncConfig, job) {
    // Simulate external data synchronization
    await new Promise(resolve => setTimeout(resolve, 200));
    
    return {
      syncId: syncConfig.id,
      recordsProcessed: Math.floor(Math.random() * 100) + 1,
      status: 'synced'
    };
  }

  async cleanupDataProcessor(cleanupConfig, job) {
    // Simulate data cleanup
    await new Promise(resolve => setTimeout(resolve, 50));
    
    return {
      cleanupId: cleanupConfig.id,
      recordsDeleted: Math.floor(Math.random() * 50),
      status: 'cleaned'
    };
  }

  async exportDataProcessor(exportConfig, job) {
    // Simulate data export
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return {
      exportId: exportConfig.id,
      fileName: `export_${Date.now()}.csv`,
      recordCount: exportConfig.recordCount || 0,
      status: 'exported'
    };
  }

  async importDataProcessor(importData, job) {
    // Simulate data import
    await new Promise(resolve => setTimeout(resolve, 150));
    
    return {
      importId: importData.id,
      recordsImported: 1,
      status: 'imported'
    };
  }

  // Job Management Methods
  getJob(jobId) {
    return this.activeJobs.get(jobId) || 
           this.jobHistory.find(job => job.id === jobId) ||
           this.jobQueue.find(job => job.id === jobId);
  }

  getActiveJobs() {
    return Array.from(this.activeJobs.values());
  }

  getQueuedJobs() {
    return [...this.jobQueue];
  }

  getJobHistory(limit = 100) {
    return this.jobHistory.slice(-limit);
  }

  async cancelJob(jobId) {
    const job = this.getJob(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    if (job.status === 'queued') {
      // Remove from queue
      const index = this.jobQueue.findIndex(j => j.id === jobId);
      if (index !== -1) {
        this.jobQueue.splice(index, 1);
        job.status = 'cancelled';
        job.completedAt = new Date();
        this.jobHistory.push(job);
        this.emit('jobCancelled', job);
        return true;
      }
    } else if (job.status === 'processing') {
      // Mark for cancellation (processor should check this)
      job.status = 'cancelling';
      this.emit('jobCancelling', job);
      return true;
    }

    return false;
  }

  // Utility Methods
  generateJobId() {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  updateStats(processingTime, success) {
    if (success) {
      this.stats.completedJobs++;
      this.stats.totalProcessingTime += processingTime;
      this.stats.averageProcessingTime = this.stats.totalProcessingTime / this.stats.completedJobs;
    } else {
      this.stats.failedJobs++;
    }
  }

  getStats() {
    return {
      ...this.stats,
      activeJobs: this.activeJobs.size,
      queuedJobs: this.jobQueue.length,
      successRate: this.stats.totalJobs > 0 
        ? (this.stats.completedJobs / this.stats.totalJobs) * 100 
        : 0
    };
  }

  // Health Check
  async healthCheck() {
    const stats = this.getStats();
    const memoryUsage = process.memoryUsage();
    
    return {
      status: 'healthy',
      stats,
      memory: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024)
      },
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
  }

  // Cleanup
  async shutdown() {
    // Wait for active jobs to complete or timeout
    const timeout = 30000; // 30 seconds
    const startTime = Date.now();
    
    while (this.activeJobs.size > 0 && (Date.now() - startTime) < timeout) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Cancel remaining jobs
    for (const job of this.activeJobs.values()) {
      job.status = 'cancelled';
      this.emit('jobCancelled', job);
    }
    
    this.activeJobs.clear();
    this.jobQueue.length = 0;
    
    this.emit('shutdown');
  }
}

module.exports = BatchProcessingService;