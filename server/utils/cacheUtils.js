/**
 * Redis Caching Utilities
 * Provides caching functionality for RCM API responses
 */

// Note: Redis client would be initialized here in a real implementation
// For now, we'll use in-memory caching as a fallback
let redisClient = null;

// In-memory cache fallback
const memoryCache = new Map();
const cacheStats = {
  hits: 0,
  misses: 0,
  sets: 0,
  deletes: 0,
  errors: 0
};

/**
 * Initialize Redis client
 * @param {Object} config - Redis configuration
 */
const initializeRedis = async (config = {}) => {
  try {
    // In a real implementation, you would initialize Redis here:
    // const redis = require('redis');
    // redisClient = redis.createClient(config);
    // await redisClient.connect();
    
    console.log('Redis caching initialized (using in-memory fallback)');
    return true;
  } catch (error) {
    console.warn('Redis initialization failed, using in-memory cache:', error.message);
    return false;
  }
};

/**
 * Generate cache key with namespace and parameters
 * @param {string} namespace - Cache namespace (e.g., 'rcm', 'dashboard')
 * @param {string} key - Base key
 * @param {Object} params - Parameters to include in key
 * @returns {string} Generated cache key
 */
const generateCacheKey = (namespace, key, params = {}) => {
  const paramString = Object.keys(params)
    .sort()
    .map(k => `${k}:${params[k]}`)
    .join('|');
  
  return `${namespace}:${key}${paramString ? `:${paramString}` : ''}`;
};

/**
 * Get data from cache
 * @param {string} key - Cache key
 * @returns {Promise<any>} Cached data or null
 */
const getFromCache = async (key) => {
  try {
    let data = null;

    if (redisClient) {
      // Redis implementation
      const cached = await redisClient.get(key);
      data = cached ? JSON.parse(cached) : null;
    } else {
      // In-memory fallback
      const cached = memoryCache.get(key);
      if (cached && cached.expiresAt > Date.now()) {
        data = cached.data;
      } else if (cached) {
        memoryCache.delete(key);
      }
    }

    if (data) {
      cacheStats.hits++;
      return {
        data,
        cached: true,
        cacheKey: key,
        retrievedAt: new Date().toISOString()
      };
    } else {
      cacheStats.misses++;
      return null;
    }

  } catch (error) {
    cacheStats.errors++;
    console.error('Cache get error:', error);
    return null;
  }
};

/**
 * Set data in cache
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 * @param {number} ttl - Time to live in seconds (default: 300 = 5 minutes)
 * @returns {Promise<boolean>} Success status
 */
const setInCache = async (key, data, ttl = 300) => {
  try {
    cacheStats.sets++;

    if (redisClient) {
      // Redis implementation
      await redisClient.setEx(key, ttl, JSON.stringify(data));
    } else {
      // In-memory fallback
      memoryCache.set(key, {
        data,
        expiresAt: Date.now() + (ttl * 1000),
        createdAt: Date.now()
      });
    }

    return true;

  } catch (error) {
    cacheStats.errors++;
    console.error('Cache set error:', error);
    return false;
  }
};

/**
 * Delete data from cache
 * @param {string} key - Cache key or pattern
 * @returns {Promise<boolean>} Success status
 */
const deleteFromCache = async (key) => {
  try {
    cacheStats.deletes++;

    if (redisClient) {
      // Redis implementation
      if (key.includes('*')) {
        // Pattern deletion
        const keys = await redisClient.keys(key);
        if (keys.length > 0) {
          await redisClient.del(keys);
        }
      } else {
        await redisClient.del(key);
      }
    } else {
      // In-memory fallback
      if (key.includes('*')) {
        // Pattern deletion
        const pattern = key.replace(/\*/g, '.*');
        const regex = new RegExp(`^${pattern}$`);
        
        for (const cacheKey of memoryCache.keys()) {
          if (regex.test(cacheKey)) {
            memoryCache.delete(cacheKey);
          }
        }
      } else {
        memoryCache.delete(key);
      }
    }

    return true;

  } catch (error) {
    cacheStats.errors++;
    console.error('Cache delete error:', error);
    return false;
  }
};

/**
 * Cache middleware for Express routes
 * @param {Object} options - Caching options
 * @returns {Function} Express middleware
 */
const cacheMiddleware = (options = {}) => {
  const {
    namespace = 'api',
    ttl = 300,
    keyGenerator = null,
    skipCache = false,
    varyBy = []
  } = options;

  return async (req, res, next) => {
    if (skipCache) {
      return next();
    }

    try {
      // Generate cache key
      let cacheKey;
      if (keyGenerator) {
        cacheKey = keyGenerator(req);
      } else {
        const params = {
          ...req.query,
          ...req.params,
          userId: req.user?.user_id
        };
        
        // Add vary-by headers
        varyBy.forEach(header => {
          if (req.headers[header]) {
            params[header] = req.headers[header];
          }
        });

        cacheKey = generateCacheKey(namespace, req.route.path, params);
      }

      // Try to get from cache
      const cached = await getFromCache(cacheKey);
      if (cached) {
        return res.json({
          success: true,
          data: cached.data,
          cached: true,
          cacheKey: cached.cacheKey,
          retrievedAt: cached.retrievedAt
        });
      }

      // Store original json method
      const originalJson = res.json;

      // Override json method to cache response
      res.json = function(data) {
        // Cache successful responses
        if (data && data.success !== false) {
          setInCache(cacheKey, data, ttl).catch(err => {
            console.error('Failed to cache response:', err);
          });
        }

        // Call original json method
        return originalJson.call(this, data);
      };

      next();

    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
};

/**
 * Cache invalidation helper
 * @param {string} namespace - Cache namespace
 * @param {Array} patterns - Patterns to invalidate
 * @returns {Promise<boolean>} Success status
 */
const invalidateCache = async (namespace, patterns = []) => {
  try {
    const invalidationPromises = patterns.map(pattern => {
      const key = `${namespace}:${pattern}`;
      return deleteFromCache(key);
    });

    await Promise.all(invalidationPromises);
    return true;

  } catch (error) {
    console.error('Cache invalidation error:', error);
    return false;
  }
};

/**
 * Get cache statistics
 * @returns {Object} Cache statistics
 */
const getCacheStats = () => {
  const totalRequests = cacheStats.hits + cacheStats.misses;
  const hitRate = totalRequests > 0 ? (cacheStats.hits / totalRequests) * 100 : 0;

  return {
    ...cacheStats,
    hitRate: Math.round(hitRate * 100) / 100,
    totalRequests,
    memoryCache: {
      size: memoryCache.size,
      keys: Array.from(memoryCache.keys()).slice(0, 10) // First 10 keys for debugging
    },
    generatedAt: new Date().toISOString()
  };
};

/**
 * Clear all cache
 * @returns {Promise<boolean>} Success status
 */
const clearAllCache = async () => {
  try {
    if (redisClient) {
      await redisClient.flushAll();
    } else {
      memoryCache.clear();
    }

    // Reset stats
    cacheStats.hits = 0;
    cacheStats.misses = 0;
    cacheStats.sets = 0;
    cacheStats.deletes = 0;
    cacheStats.errors = 0;

    return true;

  } catch (error) {
    console.error('Clear cache error:', error);
    return false;
  }
};

/**
 * Cached function wrapper
 * @param {Function} fn - Function to cache
 * @param {Object} options - Caching options
 * @returns {Function} Cached function
 */
const cached = (fn, options = {}) => {
  const {
    namespace = 'fn',
    ttl = 300,
    keyGenerator = (...args) => JSON.stringify(args)
  } = options;

  return async (...args) => {
    const cacheKey = generateCacheKey(namespace, fn.name, { args: keyGenerator(...args) });
    
    // Try cache first
    const cached = await getFromCache(cacheKey);
    if (cached) {
      return cached.data;
    }

    // Execute function
    const result = await fn(...args);
    
    // Cache result
    await setInCache(cacheKey, result, ttl);
    
    return result;
  };
};

/**
 * Response compression helper
 * @param {any} data - Data to compress
 * @returns {Object} Compressed response with metadata
 */
const compressResponse = (data) => {
  try {
    const originalSize = JSON.stringify(data).length;
    
    // In a real implementation, you might use actual compression
    // For now, we'll just add compression headers and metadata
    
    return {
      data,
      compression: {
        originalSize,
        compressedSize: originalSize, // Would be smaller with real compression
        ratio: 1.0,
        algorithm: 'none'
      },
      headers: {
        'Content-Encoding': 'identity',
        'Content-Length': originalSize
      }
    };

  } catch (error) {
    console.error('Response compression error:', error);
    return { data };
  }
};

module.exports = {
  initializeRedis,
  generateCacheKey,
  getFromCache,
  setInCache,
  deleteFromCache,
  cacheMiddleware,
  invalidateCache,
  getCacheStats,
  clearAllCache,
  cached,
  compressResponse
};