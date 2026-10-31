const { createClient } = require("redis");

const cacheTtlSeconds = Number(process.env.REDIS_CACHE_TTL_SECONDS || 60);
const redisUrl = process.env.REDIS_URL;
let client;
let connectionPromise;
let unavailableUntil = 0;
let unavailableWarningShown = false;

function getClient() {
  if (!client) {
    client = createClient({ url: redisUrl });
    client.on("error", (error) => {
      const detail = error?.message || error?.code || String(error);
      console.error(`Redis error (${redisUrl}): ${detail}`);
    });
  }
  return client;
}

async function connectRedis() {
  if (process.env.REDIS_DISABLED === "true" || !redisUrl) {
    if (!unavailableWarningShown && process.env.REDIS_DISABLED !== "true") {
      console.warn("Redis cache disabled: REDIS_URL is not configured.");
      unavailableWarningShown = true;
    }
    return false;
  }
  if (Date.now() < unavailableUntil) return false;
  const redis = getClient();
  if (redis.isOpen) return true;
  connectionPromise ||= redis.connect().catch((error) => {
    connectionPromise = undefined;
    unavailableUntil = Date.now() + 30_000;
    const detail = error?.message || error?.code || String(error);
    console.error(`Redis unavailable at ${redisUrl}; continuing without cache: ${detail}`);
    return false;
  });
  return connectionPromise;
}

async function getCached(key) {
  if (!(await connectRedis())) return null;
  try {
    const value = await getClient().get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error("Redis read failed; using MongoDB:", error.message);
    return null;
  }
}

async function setCached(key, value, ttlSeconds = cacheTtlSeconds) {
  if (!(await connectRedis())) return;
  try {
    await getClient().set(key, JSON.stringify(value), { EX: ttlSeconds });
  } catch (error) {
    console.error("Redis write failed:", error.message);
  }
}

async function invalidateCache(...keys) {
  if (!(await connectRedis()) || !keys.length) return;
  try {
    await getClient().del(keys);
  } catch (error) {
    console.error("Redis invalidation failed:", error.message);
  }
}

async function disconnectRedis() {
  if (client?.isOpen) await client.quit();
}

module.exports = { connectRedis, getCached, setCached, invalidateCache, disconnectRedis };
