import { createHash } from "node:crypto";

import { ApiError } from "../utils/error.util";
import { getLogger } from "../utils/logger.util";

const mapsLogger = getLogger("services.maps");

export interface TripMetrics {
  distanceKm: number;
  durationHours: number;
}

// ────────────────────────────────────────────────────────────────────────────
// Safe location logging helpers
//
// We never log raw user-entered addresses or precise coordinates because both
// are PII (location data is an identifier under most privacy regimes — GDPR,
// CCPA, India DPDPA — and "pickup address" can include unit numbers,
// neighbourhoods, or descriptors that uniquely identify a user).
//
// What we CAN safely log:
//   - a stable hash of the address so we can correlate repeated requests
//     without revealing the address itself
//   - the address length (signal for malformed input without leaking content)
//   - the city/region if it has been parsed out elsewhere
//   - distance/duration buckets
// ────────────────────────────────────────────────────────────────────────────

/**
 * Produces a short, deterministic, non-reversible token for a free-form
 * address string so we can correlate logs across requests without leaking
 * the address. 8 hex chars is plenty of entropy for log correlation.
 */
const hashAddress = (address: string): string => {
  if (!address) return "empty";
  return createHash("sha256").update(address.trim().toLowerCase()).digest("hex").slice(0, 8);
};

/**
 * Bucket a distance into a coarse range so debugging benefits from order-of-
 * magnitude info without revealing the exact ride distance.
 */
const bucketDistanceKm = (distanceKm: number): string => {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) return "invalid";
  if (distanceKm < 5) return "<5km";
  if (distanceKm < 15) return "5-15km";
  if (distanceKm < 30) return "15-30km";
  if (distanceKm < 60) return "30-60km";
  if (distanceKm < 100) return "60-100km";
  return ">=100km";
};

interface SafeTripMetadata {
  pickupHash: string;
  dropoffHash: string;
  pickupLength: number;
  dropoffLength: number;
}

const buildSafeTripMetadata = (pickup: string, dropoff: string): SafeTripMetadata => ({
  pickupHash: hashAddress(pickup),
  dropoffHash: hashAddress(dropoff),
  pickupLength: pickup?.length ?? 0,
  dropoffLength: dropoff?.length ?? 0,
});

// ────────────────────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────────────────────

/**
 * Calculates trip metrics (distance and duration) between two locations.
 * In production, this should call the Google Maps Distance Matrix API.
 * For now, it uses a deterministic mock implementation.
 *
 * IMPORTANT: this function logs ONLY safe metadata (address hashes,
 * lengths, distance buckets). Raw pickup/dropoff strings and any future
 * coordinates are never logged.
 */
export const calculateTripMetrics = async (
  pickup: string,
  dropoff: string,
): Promise<TripMetrics> => {
  const mapsProvider = process.env.MAPS_PROVIDER?.trim().toLowerCase() ?? "";

  if (process.env.NODE_ENV === "production" && !mapsProvider) {
    throw new ApiError(503, "Maps provider is not configured");
  }

  if (mapsProvider && mapsProvider !== "test") {
    throw new ApiError(501, "Configured maps provider is not implemented");
  }

  const safeMeta = buildSafeTripMetadata(pickup, dropoff);

  mapsLogger.debug(safeMeta, "Calculating trip metrics");

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Deterministic mock: distance is length of strings combined / 2
  // duration is distance / 40 km/h
  const distanceKm = Math.max(5, (pickup.length + dropoff.length) / 2);
  const durationHours = distanceKm / 40;

  const metrics: TripMetrics = {
    distanceKm: parseFloat(distanceKm.toFixed(2)),
    durationHours: parseFloat(durationHours.toFixed(2)),
  };

  mapsLogger.info(
    {
      ...safeMeta,
      distanceBucket: bucketDistanceKm(metrics.distanceKm),
    },
    "Trip metrics calculated",
  );

  return metrics;
};
