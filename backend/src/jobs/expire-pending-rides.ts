import { expirePendingRideRequests } from "../services/ride-lifecycle.service";
import { getLogger } from "../utils/logger.util";

const jobLogger = getLogger("jobs.expire-pending-rides");

/**
 * Runs periodically to expire PENDING ride requests older than 24 hours.
 * Call this from server startup with setInterval.
 */
export const runExpirePendingRidesJob = async (): Promise<void> => {
  try {
    const count = await expirePendingRideRequests();
    if (count > 0) {
      jobLogger.info(`Expired ${count} pending ride requests`);
    }
  } catch (error) {
    jobLogger.error({ error }, "Failed to expire pending ride requests");
  }
};

/**
 * Start the background expiry job.
 * Runs every 5 minutes.
 */
export const startExpirePendingRidesScheduler = (): NodeJS.Timeout => {
  const INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
  jobLogger.info("Starting pending ride expiry scheduler (every 5 min)");

  // Run once immediately
  runExpirePendingRidesJob();

  return setInterval(runExpirePendingRidesJob, INTERVAL_MS);
};
