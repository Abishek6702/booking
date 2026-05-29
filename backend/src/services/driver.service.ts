import { prisma } from "../config/prisma";
import { ApiError } from "../utils/error.util";
import { invalidateCacheByPrefixes } from "../utils/cache.util";
import { VEHICLES_SEARCH_CACHE_PREFIX } from "../utils/cache-keys.util";
import { getLogger } from "../utils/logger.util";

const driverLogger = getLogger("services.driver");

export interface DriverStatusResult {
  isOnline: boolean;
}

/**
 * Fetch the authenticated driver's online/offline state.
 * Returns `false` if the user record is missing the field (legacy rows).
 */
export const getDriverStatus = async (driverId: string): Promise<DriverStatusResult> => {
  const user = await prisma.user.findUnique({
    where: { id: driverId },
    select: { isDriverOnline: true },
  });

  if (!user) {
    throw new ApiError(404, "Driver not found");
  }

  return { isOnline: user.isDriverOnline ?? false };
};

/**
 * Toggle the authenticated driver's online/offline state.
 *
 * When a driver goes offline their vehicles are immediately hidden from
 * customer search results (the `searchVehicles` query filters on
 * `driver.isDriverOnline`). The vehicle search cache is invalidated so
 * customers see the change on their next request rather than waiting for
 * the cache TTL to expire.
 */
export const setDriverStatus = async (
  driverId: string,
  isOnline: boolean,
): Promise<DriverStatusResult> => {
  const updated = await prisma.user.update({
    where: { id: driverId },
    data: { isDriverOnline: isOnline },
    select: { isDriverOnline: true },
  });

  await invalidateCacheByPrefixes([VEHICLES_SEARCH_CACHE_PREFIX]);

  driverLogger.info(
    { driverId, isOnline: updated.isDriverOnline },
    "Driver online status changed",
  );

  return { isOnline: updated.isDriverOnline ?? false };
};
