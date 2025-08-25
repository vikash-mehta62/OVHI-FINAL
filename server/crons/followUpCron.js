/**
 * Follow-up Cron Jobs
 * Handles automated processing of follow-up tasks
 */

const cron = require('node-cron');
const FollowUpService = require('../services/rcm/followUpService');

class FollowUpCron {
  constructor() {
    this.followUpService = new FollowUpService();
    this.jobs = new Map();
  }

  /**
   * Initialize all cron jobs
   */
  init() {
    console.log('Initializing follow-up cron jobs...');

    // Process overdue follow-ups every hour
    this.scheduleOverdueProcessing();

    // Send reminders twice daily (9 AM and 2 PM)
    this.scheduleReminders();

    // Generate daily follow-up reports
    this.scheduleDailyReports();

    console.log('Follow-up cron jobs initialized successfully');
  }

  /**
   * Schedule overdue follow-up processing
   * Runs every hour to check for overdue tasks
   */
  scheduleOverdueProcessing() {
    const job = cron.schedule('0 * * * *', async () => {
      try {
        console.log('Processing overdue follow-ups...');         
        const result = await this.followUpService.processOverdueFollowUps();
        
        console.log(`Overdue processing completed:`, {
          processed: result.processed_count,
          escalated: result.escalated_count,
          total_overdue: result.overdue_followups
        });

        // Log to database for audit trail
        await this.logCronExecution('overdue_processing', {
          success: true,
          processed_count: result.processed_count,
          escalated_count: result.escalated_count
        });
      } catch (error) {
        console.error('Error processing overdue follow-ups:', error);
        
        // Log error to database
        await this.logCronExecution('overdue_processing', {
          success: false,
          error: error.message
        });
      }
    }, {
      scheduled: false,
      timezone: 'America/New_York'
    });

    this.jobs.set('overdue_processing', job);
    job.start();
    console.log('Scheduled overdue processing job (hourly)');
  }

  /**
   * Schedule reminder notifications
   * Runs at 9 AM and 2 PM to send reminders
   */
  scheduleReminders() {
    // Morning reminders at 9 AM
    const morningJob = cron.schedule('0 9 * * *', async () => {
      await this.sendReminders('morning');
    }, {
      scheduled: false,
      timezone: 'America/New_York'
    });

    // Afternoon reminders at 2 PM
    const afternoonJob = cron.schedule('0 14 * * *', async () => {
      await this.sendReminders('afternoon');
    }, {
      scheduled: false,
      timezone: 'America/New_York'
    });

    this.jobs.set('morning_reminders', morningJob);
    this.jobs.set('afternoon_reminders', afternoonJob);
    
    morningJob.start();
    afternoonJob.start();
    
    console.log('Scheduled reminder jobs (9 AM and 2 PM)');
  }

  /**
   * Send reminder notifications
   * @param {string} period - 'morning' or 'afternoon'
   */
  async sendReminders(period) {
    try {
      console.log(`Sending ${period} follow-up reminders...`);
      
      const result = await this.followUpService.sendReminders();
      
      console.log(`${period} reminders completed:`, {
        sent: result.reminders_sent,
        eligible: result.total_eligible
      });

      // Log to database
      await this.logCronExecution(`${period}_reminders`, {
        success: true,
        reminders_sent: result.reminders_sent,
        total_eligible: result.total_eligible
      });
    } catch (error) {
      console.error(`Error sending ${period} reminders:`, error);
      
      await this.logCronExecution(`${period}_reminders`, {
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Schedule daily follow-up reports
   * Runs at 6 PM to generate daily summary reports
   */
  scheduleDailyReports() {
    const job = cron.schedule('0 18 * * *', async () => {
      try {
        console.log('Generating daily follow-up report...');
        
        const today = new Date().toISOString().split('T')[0];
        const stats = await this.followUpService.getFollowUpStatistics({
          dateFrom: today,
          dateTo: today
        });

        // Generate report summary
        const report = {
          date: today,
          total_followups: stats.statistics.total_followups,
          completed_today: stats.statistics.completed_count,
          overdue_count: stats.statistics.overdue_count,
          completion_rate: stats.statistics.completion_rate,
          top_types: stats.type_breakdown.slice(0, 5)
        };

        console.log('Daily follow-up report:', report);

        // In a real implementation, you would:
        // 1. Save report to database
        // 2. Send email to managers
        // 3. Update dashboard metrics
        
        await this.logCronExecution('daily_report', {
          success: true,
          report_data: report
        });
      } catch (error) {
        console.error('Error generating daily report:', error);
        
        await this.logCronExecution('daily_report', {
          success: false,
          error: error.message
        });
      }
    }, {
      scheduled: false,
      timezone: 'America/New_York'
    });

    this.jobs.set('daily_report', job);
    job.start();
    console.log('Scheduled daily report job (6 PM)');
  }

  /**
   * Schedule weekly follow-up cleanup
   * Runs every Sunday at midnight to clean up old completed tasks
   */
  scheduleWeeklyCleanup() {
    const job = cron.schedule('0 0 * * 0', async () => {
      try {
        console.log('Running weekly follow-up cleanup...');
        
        // Archive completed follow-ups older than 90 days
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 90);
        
        // In a real implementation, you would:
        // 1. Archive old completed follow-ups
        // 2. Clean up orphaned attachments
        // 3. Update statistics tables
        // 4. Optimize database indexes
        
        console.log('Weekly cleanup completed');
        
        await this.logCronExecution('weekly_cleanup', {
          success: true,
          cutoff_date: cutoffDate.toISOString()
        });
      } catch (error) {
        console.error('Error in weekly cleanup:', error);
        
        await this.logCronExecution('weekly_cleanup', {
          success: false,
          error: error.message
        });
      }
    }, {
      scheduled: false,
      timezone: 'America/New_York'
    });

    this.jobs.set('weekly_cleanup', job);
    job.start();
    console.log('Scheduled weekly cleanup job (Sunday midnight)');
  }

  /**
   * Log cron job execution for audit trail
   * @param {string} jobName - Name of the cron job
   * @param {Object} result - Execution result
   */
  async logCronExecution(jobName, result) {
    try {
      // In a real implementation, you would log to a cron_logs table
      const logEntry = {
        job_name: jobName,
        executed_at: new Date().toISOString(),
        success: result.success,
        result_data: JSON.stringify(result),
        execution_time: Date.now() // You would calculate actual execution time
      };
      
      console.log('Cron execution logged:', logEntry);
      
      // Example SQL for logging:
      // INSERT INTO cron_logs (job_name, executed_at, success, result_data, execution_time)
      // VALUES (?, ?, ?, ?, ?)
    } catch (error) {
      console.error('Error logging cron execution:', error);
    }
  }

  /**
   * Start a specific cron job
   * @param {string} jobName - Name of the job to start
   */
  startJob(jobName) {
    const job = this.jobs.get(jobName);
    if (job) {
      job.start();
      console.log(`Started cron job: ${jobName}`);
    } else {
      console.error(`Cron job not found: ${jobName}`);
    }
  }

  /**
   * Stop a specific cron job
   * @param {string} jobName - Name of the job to stop
   */
  stopJob(jobName) {
    const job = this.jobs.get(jobName);
    if (job) {
      job.stop();
      console.log(`Stopped cron job: ${jobName}`);
    } else {
      console.error(`Cron job not found: ${jobName}`);
    }
  }

  /**
   * Stop all cron jobs
   */
  stopAll() {
    console.log('Stopping all follow-up cron jobs...');
    
    for (const [jobName, job] of this.jobs) {
      job.stop();
      console.log(`Stopped: ${jobName}`);
    }
    
    console.log('All follow-up cron jobs stopped');
  }

  /**
   * Get status of all cron jobs
   * @returns {Object} Status of all jobs
   */
  getJobStatus() {
    const status = {};
    
    for (const [jobName, job] of this.jobs) {
      status[jobName] = {
        running: job.running || false,
        scheduled: job.scheduled || false
      };
    }
    
    return status;
  }

  /**
   * Manually trigger a cron job
   * @param {string} jobName - Name of the job to trigger
   */
  async triggerJob(jobName) {
    try {
      console.log(`Manually triggering job: ${jobName}`);
      
      switch (jobName) {
        case 'overdue_processing':
          const overdueResult = await this.followUpService.processOverdueFollowUps();
          console.log('Manual overdue processing result:', overdueResult);
          return overdueResult;
          
        case 'morning_reminders':
        case 'afternoon_reminders':
          const reminderResult = await this.followUpService.sendReminders();
          console.log('Manual reminder result:', reminderResult);
          return reminderResult;
          
        default:
          throw new Error(`Unknown job name: ${jobName}`);
      }
    } catch (error) {
      console.error(`Error triggering job ${jobName}:`, error);
      throw error;
    }
  }
}

// Create singleton instance
const followUpCron = new FollowUpCron();

// Graceful shutdown handling
process.on('SIGINT', () => {
  console.log('Received SIGINT, stopping follow-up cron jobs...');
  followUpCron.stopAll();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, stopping follow-up cron jobs...');
  followUpCron.stopAll();
  process.exit(0);
});

module.exports = followUpCron;