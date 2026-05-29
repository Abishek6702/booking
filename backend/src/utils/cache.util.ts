import crypto from "node:crypto";

import {
  deleteByPrefixInCacheStore,
  getCacheNamespace,
  getFromCacheStore,
  setInCacheStore,
} from "../config/cache";
import { getLogger, serializeError } from "./logger.util";

const cacheLogger = getLogger("cache.util");
const inFlightLoads = new Map<string, Promise<unknown>>();

const parseTtlSeconds = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? "", 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
};

export const CACHE_TTL_SECONDS = {
  search: parseTtlSeconds(process.env.CACHE_TTL_SEARCH_SECONDS, 60),
  detail: parseTtlSeconds(process.env.CACHE_TTL_DETAIL_SECONDS, 300),
  availability: parseTtlSeconds(process.env.CACHE_TTL_AVAILABILITY_SECONDS, 30),
  attractionSlots: parseTtlSeconds(process.env.CACHE_TTL_ATTRACTION_SLOTS_SECONDS, 30),
} as const;

const stableSerialize = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b),
    );

    return `{${entries
      .map(([key, nestedValue]) => `${JSON.stringify(key)}:${stableSerialize(nestedValue)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
};

const hashPayload = (payload: unknown): string => {
  return crypto.createHash("sha1").update(stableSerialize(payload)).digest("hex");
};

const normalizeKeyParts = (parts: string[]): string[] => {
  return parts
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.replace(/\s+/g, "-"));
};

export const buildCachePrefix = (...parts: string[]): string => {
  const normalizedParts = normalizeKeyParts(parts);
  return [getCacheNamespace(), ...normalizedParts].join(":");
};

export const buildCacheKey = (parts: string[], payload: unknown): string => {
  return `${buildCachePrefix(...parts)}:${hashPayload(payload)}`;
};

export const withReadThroughCache = async <T>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>,
): Promise<T> => {
  const cachedValue = await getFromCacheStore(key);

  if (cachedValue !== null) {
    cacheLogger.debug(
      {
        event: "cache_hit",
        key,
      },
      "Cache hit",
    );

    return JSON.parse(cachedValue) as T;
  }

  const inFlightPromise = inFlightLoads.get(key);
  if (inFlightPromise) {
    cacheLogger.debug(
      {
        event: "cache_wait_in_flight",
        key,
      },
      "Awaiting in-flight cache load",
    );

    return (await inFlightPromise) as T;
  }

  const loadPromise = (async () => {
    const value = await loader();

    if (value !== null && value !== undefined) {
      await setInCacheStore(key, JSON.stringify(value), ttlSeconds);
    }

    cacheLogger.debug(
      {
        event: "cache_miss_populated",
        key,
      },
      "Cache miss populated",
    );

    return value;
  })();

  inFlightLoads.set(key, loadPromise);

  try {
    return await loadPromise;
  } finally {
    inFlightLoads.delete(key);
  }
};

export const invalidateCacheByPrefix = async (prefix: string): Promise<number> => {
  try {
    const deleted = await deleteByPrefixInCacheStore(prefix);

    cacheLogger.info(
      {
        event: "cache_invalidated_prefix",
        prefix,
        deleted,
      },
      "Cache invalidated by prefix",
    );

    return deleted;
  } catch (error) {
    cacheLogger.warn(
      {
        event: "cache_invalidation_failed",
        prefix,
        error: serializeError(error),
      },
      "Cache invalidation failed",
    );

    return 0;
  }
};

export const invalidateCacheByPrefixes = async (prefixes: string[]): Promise<void> => {
  for (const prefix of prefixes) {
    await invalidateCacheByPrefix(prefix);
  }
};
