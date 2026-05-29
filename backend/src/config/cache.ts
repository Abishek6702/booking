import { createClient } from "redis";

import { getLogger, serializeError } from "../utils/logger.util";

const cacheLogger = getLogger("config.cache");

type CacheEntry = {
  value: string;
  expiresAt: number | null;
};

const memoryStore = new Map<string, CacheEntry>();

const cacheNamespace = process.env.CACHE_KEY_PREFIX?.trim() || "tm";
const redisUrl = process.env.REDIS_URL?.trim();
const redisScanBatchSize = Number.parseInt(process.env.CACHE_SCAN_BATCH_SIZE ?? "500", 10);

let redisClient: ReturnType<typeof createClient> | null = null;
let redisReady = false;

const resolveRedisBatchSize = (): number => {
  if (!Number.isFinite(redisScanBatchSize) || redisScanBatchSize <= 0) {
    return 500;
  }

  return redisScanBatchSize;
};

const deleteExpiredMemoryEntryIfNeeded = (key: string, entry: CacheEntry): boolean => {
  if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
    memoryStore.delete(key);
    return true;
  }

  return false;
};

const connectRedisClient = async (): Promise<void> => {
  if (!redisUrl) {
    return;
  }

  if (redisClient) {
    return;
  }

  const client = createClient({ url: redisUrl });

  client.on("error", (error) => {
    redisReady = false;
    cacheLogger.warn(
      {
        event: "cache_redis_error",
        error: serializeError(error),
      },
      "Redis client error",
    );
  });

  try {
    await client.connect();
    redisClient = client;
    redisReady = true;

    cacheLogger.info(
      {
        event: "cache_redis_connected",
      },
      "Redis cache connected",
    );
  } catch (error) {
    redisClient = null;
    redisReady = false;

    cacheLogger.warn(
      {
        event: "cache_redis_connect_failed",
        error: serializeError(error),
      },
      "Redis unavailable, using in-memory cache fallback",
    );
  }
};

export const initializeCache = async (): Promise<void> => {
  await connectRedisClient();

  if (!redisClient) {
    cacheLogger.info(
      {
        event: "cache_memory_fallback",
      },
      "Using in-memory cache backend",
    );
  }
};

export const shutdownCache = async (): Promise<void> => {
  if (!redisClient) {
    return;
  }

  try {
    await redisClient.quit();
    cacheLogger.info(
      {
        event: "cache_redis_disconnected",
      },
      "Redis cache disconnected",
    );
  } catch (error) {
    cacheLogger.warn(
      {
        event: "cache_redis_disconnect_failed",
        error: serializeError(error),
      },
      "Failed to disconnect Redis cache client cleanly",
    );
  } finally {
    redisClient = null;
    redisReady = false;
  }
};

const tryRedisGet = async (key: string): Promise<string | null> => {
  if (!redisClient || !redisReady) {
    return null;
  }

  try {
    return await redisClient.get(key);
  } catch (error) {
    redisReady = false;
    cacheLogger.warn(
      {
        event: "cache_redis_get_failed",
        key,
        error: serializeError(error),
      },
      "Redis get failed, falling back to memory cache",
    );

    return null;
  }
};

const tryRedisSet = async (key: string, value: string, ttlSeconds: number): Promise<boolean> => {
  if (!redisClient || !redisReady) {
    return false;
  }

  try {
    await redisClient.set(key, value, {
      EX: ttlSeconds,
    });
    return true;
  } catch (error) {
    redisReady = false;
    cacheLogger.warn(
      {
        event: "cache_redis_set_failed",
        key,
        error: serializeError(error),
      },
      "Redis set failed, falling back to memory cache",
    );

    return false;
  }
};

const tryRedisDeleteByPrefix = async (prefix: string): Promise<number> => {
  if (!redisClient || !redisReady) {
    return 0;
  }

  const scanCount = resolveRedisBatchSize();
  let cursor = "0";
  let totalDeleted = 0;

  try {
    do {
      const scanResult = await redisClient.scan(cursor, {
        MATCH: `${prefix}*`,
        COUNT: scanCount,
      });

      cursor = scanResult.cursor;
      const keys = scanResult.keys;

      if (keys.length > 0) {
        const deletedCount = await redisClient.del(keys);
        totalDeleted += deletedCount;
      }
    } while (cursor !== "0");

    return totalDeleted;
  } catch (error) {
    redisReady = false;
    cacheLogger.warn(
      {
        event: "cache_redis_prefix_delete_failed",
        prefix,
        error: serializeError(error),
      },
      "Redis prefix invalidation failed, using memory fallback",
    );

    return 0;
  }
};

const memoryGet = (key: string): string | null => {
  const entry = memoryStore.get(key);
  if (!entry) {
    return null;
  }

  if (deleteExpiredMemoryEntryIfNeeded(key, entry)) {
    return null;
  }

  return entry.value;
};

const memorySet = (key: string, value: string, ttlSeconds: number): void => {
  const expiresAt = Date.now() + ttlSeconds * 1000;
  memoryStore.set(key, {
    value,
    expiresAt,
  });
};

const memoryDeleteByPrefix = (prefix: string): number => {
  let deleted = 0;

  for (const key of memoryStore.keys()) {
    if (key.startsWith(prefix)) {
      memoryStore.delete(key);
      deleted += 1;
    }
  }

  return deleted;
};

export const getCacheNamespace = (): string => {
  return cacheNamespace;
};

export const getFromCacheStore = async (key: string): Promise<string | null> => {
  const fromRedis = await tryRedisGet(key);
  if (fromRedis !== null) {
    return fromRedis;
  }

  return memoryGet(key);
};

export const setInCacheStore = async (key: string, value: string, ttlSeconds: number): Promise<void> => {
  const normalizedTtlSeconds = Math.max(1, Math.floor(ttlSeconds));
  const persistedToRedis = await tryRedisSet(key, value, normalizedTtlSeconds);

  if (!persistedToRedis) {
    memorySet(key, value, normalizedTtlSeconds);
  }
};

export const deleteByPrefixInCacheStore = async (prefix: string): Promise<number> => {
  const redisDeleted = await tryRedisDeleteByPrefix(prefix);
  const memoryDeleted = memoryDeleteByPrefix(prefix);

  return redisDeleted + memoryDeleted;
};
