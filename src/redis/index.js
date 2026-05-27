const Redis = require('ioredis');

let client = null;

function getRedis() {
  if (!client) {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    client = new Redis(url, {
      lazyConnect: true,
      enableOfflineQueue: false,
      retryStrategy: (times) => {
        if (times > 3) return null;   // stop retrying after 3 attempts
        return Math.min(times * 200, 1000);
      },
    });

    client.on('connect',  () => console.log('[Redis] Connected'));
    client.on('error',    (err) => console.error('[Redis] Error:', err.message));
    client.on('close',    () => console.warn('[Redis] Connection closed'));
  }
  return client;
}

// Safe wrapper — returns null if Redis is unavailable
async function safeGet(key) {
  try {
    return await getRedis().get(key);
  } catch {
    return null;
  }
}

async function safeSet(key, value, ttlSeconds) {
  try {
    if (ttlSeconds) {
      await getRedis().set(key, value, 'EX', ttlSeconds);
    } else {
      await getRedis().set(key, value);
    }
  } catch {
    // ignore
  }
}

async function safeDel(key) {
  try {
    await getRedis().del(key);
  } catch {
    // ignore
  }
}

async function safeIncr(key, ttlSeconds) {
  try {
    const val = await getRedis().incr(key);
    if (val === 1 && ttlSeconds) {
      await getRedis().expire(key, ttlSeconds);
    }
    return val;
  } catch {
    return null;
  }
}

module.exports = { getRedis, safeGet, safeSet, safeDel, safeIncr };
