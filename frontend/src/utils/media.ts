/**
 * Media URL utilities for building image/file URLs from backend paths.
 *
 * The backend stores relative paths like:
 *   /uploads/public/stays/cm1abc123-beach-villa/pool-view-a82f91.jpg
 *
 * This utility builds the full URL for rendering in the frontend.
 */

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

/**
 * Build a full media URL from a relative path stored in the database.
 *
 * @example
 * buildMediaUrl("/uploads/public/stays/cm1abc123-beach-villa/pool-view.jpg")
 * // → "http://localhost:4000/uploads/public/stays/cm1abc123-beach-villa/pool-view.jpg"
 */
export const buildMediaUrl = (path: string): string => {
  if (!path) return "";

  // Already a full URL (e.g., external CDN or legacy absolute URL)
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  // Ensure path starts with /
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${BACKEND_URL}${normalizedPath}`;
};

/**
 * Build a media URL for a legacy flat upload (pre-migration).
 * These files are served from /uploads/<filename> directly.
 */
export const buildLegacyMediaUrl = (filename: string): string => {
  if (!filename) return "";
  if (filename.startsWith("http")) return filename;
  return `${BACKEND_URL}/uploads/${filename}`;
};
