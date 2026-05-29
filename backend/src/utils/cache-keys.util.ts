import { buildCacheKey, buildCachePrefix } from "./cache.util";

export const STAYS_SEARCH_CACHE_PREFIX = buildCachePrefix("search", "stays");
export const VEHICLES_SEARCH_CACHE_PREFIX = buildCachePrefix("search", "vehicles");
export const ATTRACTIONS_SEARCH_CACHE_PREFIX = buildCachePrefix("search", "attractions");

export const buildStayDetailCacheKey = (stayId: string): string => {
  return buildCachePrefix("detail", "stay", stayId);
};

export const buildVehicleDetailCacheKey = (vehicleId: string): string => {
  return buildCachePrefix("detail", "vehicle", vehicleId);
};

export const buildAttractionDetailCacheKey = (attractionId: string): string => {
  return buildCachePrefix("detail", "attraction", attractionId);
};

export const buildStaysSearchCacheKey = (payload: unknown): string => {
  return buildCacheKey(["search", "stays"], payload);
};

export const buildVehiclesSearchCacheKey = (payload: unknown): string => {
  return buildCacheKey(["search", "vehicles"], payload);
};

export const buildAttractionsSearchCacheKey = (payload: unknown): string => {
  return buildCacheKey(["search", "attractions"], payload);
};

export const buildStayAvailabilityCacheKey = (stayId: string, payload: unknown): string => {
  return buildCacheKey(["availability", "stay", stayId], payload);
};

export const buildVehicleAvailabilityCacheKey = (vehicleId: string, payload: unknown): string => {
  return buildCacheKey(["availability", "vehicle", vehicleId], payload);
};

export const buildAttractionAvailabilityCacheKey = (
  attractionId: string,
  payload: unknown,
): string => {
  return buildCacheKey(["availability", "attraction", attractionId], payload);
};

export const buildAttractionSlotsCacheKey = (attractionId: string, payload: unknown): string => {
  return buildCacheKey(["attraction-slots", attractionId], payload);
};

export const buildStayAvailabilityCachePrefix = (stayId: string): string => {
  return buildCachePrefix("availability", "stay", stayId);
};

export const buildVehicleAvailabilityCachePrefix = (vehicleId: string): string => {
  return buildCachePrefix("availability", "vehicle", vehicleId);
};

export const buildAttractionAvailabilityCachePrefix = (attractionId: string): string => {
  return buildCachePrefix("availability", "attraction", attractionId);
};

export const buildAttractionSlotsCachePrefix = (attractionId: string): string => {
  return buildCachePrefix("attraction-slots", attractionId);
};
