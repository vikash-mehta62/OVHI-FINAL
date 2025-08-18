import Redis from 'redis';

// Redis configuration for Patient Outreach System
const redisConfig = {
  // Main Redis instance for caching
  cache: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || null,
    db: 0, // Database 0 for general caching
    keyPrefix: 'ovhi:cache:',
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    keepAlive: 30000,
    connectTimeout: 10000,
    commandTimeout: 5000
  },

  // Redis instance for job queues
  queue: {
    host: process.env.REDIS_QUEUE_HOST || process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_QUEUE_PORT || process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_QUEUE_PASSWORD || process.env.REDIS_PASSWORD || null,
    db: 1, // Database 1 for job queues
    keyPrefix: 'ovhi:queue:',
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    keepAlive: 30000,
    connectTimeout: 10000,
    commandTimeout: 5000
  },

  // Redis instance for session storage
  session: {
    host: process.env.REDIS_SESSION_HOST || process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_SESSION_PORT || process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_SESSION_PASSWORD || process.env.REDIS_PASSWORD || null,
    db: 2, // Database 2 for sessions
    keyPrefix: 'ovhi:session:',
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    keepAlive: 30000,
    connectTimeout: 10000,
    commandTimeout: 5000
  }
};

// Cache TTL configurations (in seconds)
const cacheTTL = {
  patientPreferences: 3600, // 1 hour
  templates: 1800, // 30 minutes
  segments: 900, // 15 minutes
  providerSettings: 3600, // 1 hour
  orgSettings: 7200, // 2 hours
  segmentMembership: 86400, // 24 hours
  analytics: 300, // 5 minutes
  bestHour: 604800 // 1 week
};

// Queue configurations
const queueConfig = {
  // High priority queue for urgent communications
  urgent: {
    name: 'comm:urgent',
    concurrency: 10,
    removeOnComplete: 100,
    removeOnFail: 50,
    defaultJobOptions: {
      priority: 1,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      },
      removeOnComplete: true,
      removeOnFail: false
    }
  },

  // Standard priority queue for appointment reminders
  reminders: {
    name: 'comm:reminders',
    concurrency: 20,
    removeOnComplete: 200,
    removeOnFail: 100,
    defaultJobOptions: {
      priority: 3,
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 1000
      },
      removeOnComplete: true,
      removeOnFail: false
    }
  },

  // Low priority queue for marketing campaigns
  campaigns: {
    name: 'comm:campaigns',
    concurrency: 15,
    removeOnComplete: 500,
    removeOnFail: 200,
    defaultJobOptions: {
      priority: 5,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000
      },
      removeOnComplete: true,
      removeOnFail: false
    }
  },

  // Queue for processing inbound messages
  inbound: {
    name: 'comm:inbound',
    concurrency: 25,
    removeOnComplete: 100,
    removeOnFail: 50,
    defaultJobOptions: {
      priority: 2,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000
      },
      removeOnComplete: true,
      removeOnFail: false
    }
  },

  // Queue for webhook processing
  webhooks: {
    name: 'comm:webhooks',
    concurrency: 30,
    removeOnComplete: 200,
    removeOnFail: 100,
    defaultJobOptions: {
      priority: 2,
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 500
      },
      removeOnComplete: true,
      removeOnFail: false
    }
  },

  // Queue for analytics processing
  analytics: {
    name: 'comm:analytics',
    concurrency: 5,
    removeOnComplete: 50,
    removeOnFail: 25,
    defaultJobOptions: {
      priority: 7,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 10000
      },
      removeOnComplete: true,
      removeOnFail: false
    }
  },

  // Queue for segment evaluation
  segments: {
    name: 'comm:segments',
    concurrency: 3,
    removeOnComplete: 20,
    removeOnFail: 10,
    defaultJobOptions: {
      priority: 6,
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 30000
      },
      removeOnComplete: true,
      removeOnFail: false
    }
  }
};

// Redis client instances
let cacheClient = null;
let queueClient = null;
let sessionClient = null;

// Initialize Redis clients
const initializeRedis = async () => {
  try {
    // Initialize cache client
    cacheClient = Redis.createClient(redisConfig.cache);
    await cacheClient.connect();
    console.log('Redis cache client connected successfully');

    // Initialize queue client
    queueClient = Redis.createClient(redisConfig.queue);
    await queueClient.connect();
    console.log('Redis queue client connected successfully');

    // Initialize session client
    sessionClient = Redis.createClient(redisConfig.session);
    await sessionClient.connect();
    console.log('Redis session client connected successfully');

    // Set up error handlers
    cacheClient.on('error', (err) => {
      console.error('Redis cache client error:', err);
    });

    queueClient.on('error', (err) => {
      console.error('Redis queue client error:', err);
    });

    sessionClient.on('error', (err) => {
      console.error('Redis session client error:', err);
    });

    return { cacheClient, queueClient, sessionClient };
  } catch (error) {
    console.error('Failed to initialize Redis clients:', error);
    throw error;
  }
};

// Graceful shutdown
const closeRedis = async () => {
  try {
    if (cacheClient) {
      await cacheClient.quit();
      console.log('Redis cache client disconnected');
    }
    if (queueClient) {
      await queueClient.quit();
      console.log('Redis queue client disconnected');
    }
    if (sessionClient) {
      await sessionClient.quit();
      console.log('Redis session client disconnected');
    }
  } catch (error) {
    console.error('Error closing Redis connections:', error);
  }
};

// Cache key generators
const cacheKeys = {
  patientPrefs: (patientId) => `patient:prefs:${patientId}`,
  template: (templateId) => `template:${templateId}`,
  segment: (segmentId) => `segment:${segmentId}`,
  segmentMembers: (segmentId) => `segment:members:${segmentId}`,
  providerSettings: (providerId, orgId) => `provider:settings:${providerId}:${orgId}`,
  orgSettings: (orgId) => `org:settings:${orgId}`,
  bestHour: (patientId) => `patient:best_hour:${patientId}`,
  analytics: (type, date, ...params) => `analytics:${type}:${date}:${params.join(':')}`,
  rateLimiter: (key, window) => `rate_limit:${key}:${window}`
};

export {
  redisConfig,
  cacheTTL,
  queueConfig,
  cacheKeys,
  initializeRedis,
  closeRedis,
  getCacheClient,
  getQueueClient,
  getSessionClient
};

export function getCacheClient() {
  return cacheClient;
}

export function getQueueClient() {
  return queueClient;
}

export function getSessionClient() {
  return sessionClient;
}