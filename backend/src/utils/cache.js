const { Redis } = require("ioredis");

let redisClient = null;

if (process.env.REDIS_URL) {
  try {
    redisClient = new Redis(process.env.REDIS_URL);
    console.log("Connected to Redis Cache Server");
  } catch (err) {
    console.error("Redis connection failed, using in-memory cache fallback:", err.message);
  }
}

// In-Memory Cache Fallback
const memoryCache = new Map();

async function get(key) {
  if (redisClient) {
    try {
      return await redisClient.get(key);
    } catch (err) {
      console.error("Redis GET failed:", err.message);
    }
  }

  // Fallback to memory cache
  const cached = memoryCache.get(key);
  if (cached) {
    if (cached.expiresAt > Date.now()) {
      return cached.value;
    }
    // Expired
    memoryCache.delete(key);
  }
  return null;
}

async function set(key, value, ttlSeconds = 3600) {
  if (redisClient) {
    try {
      await redisClient.set(key, value, "EX", ttlSeconds);
      return;
    } catch (err) {
      console.error("Redis SET failed:", err.message);
    }
  }

  // Fallback to memory cache
  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

async function del(key) {
  if (redisClient) {
    try {
      await redisClient.del(key);
      return;
    } catch (err) {
      console.error("Redis DEL failed:", err.message);
    }
  }
  memoryCache.delete(key);
}

module.exports = {
  get,
  set,
  del,
};
