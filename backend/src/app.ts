import "dotenv/config";

import path from "node:path";

import cors from "cors";
import express from "express";

import { httpLogger } from "./middlewares/logger.middleware";
import adminRoutes from "./routes/admin.routes";
import attractionsRoutes from "./routes/attractions.routes";
import authRoutes from "./routes/auth.routes";
import availabilityRoutes from "./routes/availability.routes";
import bookingsRoutes from "./routes/bookings.routes";
import driverRoutes from "./routes/driver.routes";
import ownerRoutes from "./routes/owner.routes";
import paymentsRoutes from "./routes/payments.routes";
import profileRoutes from "./routes/profile.routes";
import roomsRoutes from "./routes/rooms.routes";
import reviewsRoutes from "./routes/reviews.routes";
import staysRoutes from "./routes/stays.routes";
import supportRoutes from "./routes/support.routes";
import uploadRoutes from "./routes/upload.routes";
import vehiclesRoutes from "./routes/vehicles.routes";
import notificationsRoutes from "./routes/notifications.routes";
import ridesRoutes from "./routes/rides.routes";
import mediaRoutes from "./routes/media.routes";
import { errorHandler, notFoundHandler, sendSuccess } from "./utils/error.util";

const app = express();

app.disable("x-powered-by");

const resolveTrustProxyValue = (value: string): boolean | number | string => {
  const normalized = value.toLowerCase();

  if (normalized === "true") {
    return true;
  }

  if (normalized === "false") {
    return false;
  }

  const parsedNumber = Number.parseInt(value, 10);
  if (Number.isFinite(parsedNumber)) {
    return parsedNumber;
  }

  return value;
};

const trustProxySetting = process.env.TRUST_PROXY?.trim();
if (trustProxySetting) {
  app.set("trust proxy", resolveTrustProxyValue(trustProxySetting));
}

const shouldLogHttpRequests =
  process.env.LOG_HTTP_REQUESTS !== undefined
    ? String(process.env.LOG_HTTP_REQUESTS).toLowerCase() === "true"
    : process.env.NODE_ENV !== "production";

const corsOrigins = process.env.CORS_ORIGIN?.split(",")
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);

app.use(
  cors({
    origin: corsOrigins && corsOrigins.length > 0 ? corsOrigins : true,
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

if (shouldLogHttpRequests) {
  app.use(httpLogger);
}

app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

// Public media: served without auth (images, avatars, attraction photos)
app.use("/uploads/public", express.static(path.resolve(process.cwd(), "uploads", "public")));

// Legacy flat uploads: backward-compatible serving for existing URLs
// that point to /uploads/<filename> (pre-media-refactor data).
// This will be removed once the data migration is complete.

app.get("/api/v1/health", (_req, res) => {
  sendSuccess(res, "Service is healthy", {});
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/upload", uploadRoutes);
app.use("/api/v1/support", supportRoutes);
app.use("/api/v1/profile", profileRoutes);
app.use("/api/v1/stays", staysRoutes);
app.use("/api/v1/stays", roomsRoutes);
app.use("/api/v1/stays", availabilityRoutes);
app.use("/api/v1/bookings", bookingsRoutes);
app.use("/api/v1/payments", paymentsRoutes);
app.use("/api/v1/reviews", reviewsRoutes);
app.use("/api/v1/vehicles", vehiclesRoutes);
app.use("/api/v1/attractions", attractionsRoutes);
app.use("/api/v1/driver", driverRoutes);
app.use("/api/v1/owner", ownerRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/notifications", notificationsRoutes);
app.use("/api/v1/rides", ridesRoutes);
app.use("/api/v1/media", mediaRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
