/**
 * Media Migration Script — Strongly-Typed Relational Tables
 *
 * Migrates existing String[] image/document URLs into the new dedicated
 * relational tables (StayImage, VehicleImage, AttractionImage, UserAvatar,
 * UserDocument, TicketAttachment).
 *
 * Safe to run multiple times (idempotent — checks for existing records).
 *
 * Usage:
 *   npx tsx scripts/migrate-media.ts
 *
 * What it does:
 *   1. Reads Stay.images[], Vehicle.images[], Attraction.images[],
 *      User.avatarUrl, User.documents[], Ticket.attachments[]
 *   2. For each URL, extracts the filename
 *   3. Copies the file from flat /uploads/ to structured
 *      /uploads/public|private/<entity>/<entityId-slug>/
 *   4. Creates the appropriate relational record with the FULL relative path
 *
 * What it does NOT do:
 *   - Delete old files (run cleanup separately after verification)
 *   - Remove old String[] fields (do that in a follow-up schema migration)
 *   - Break existing functionality (old URLs still work via express.static)
 *   - Rename files (original filenames are preserved as-is)
 *
 * Rollback:
 *   - Old flat files are NEVER deleted (copy-only)
 *   - Old String[] fields remain untouched
 *   - To rollback: delete relational records + remove structured folders
 */

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";

// ────────────────────────────────────────────────────────────────────────────
// Database connection
// ────────────────────────────────────────────────────────────────────────────

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
// Note: The `as any` is required here because this script lives outside the
// main tsconfig include path. At runtime, tsx resolves all Prisma model
// accessors correctly. The generated client DOES include StayImage, VehicleImage,
// etc. — this is purely a TS language server scope issue for standalone scripts.
const prisma = new PrismaClient({ adapter } as any) as any;

// ────────────────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────────────────

const UPLOADS_ROOT = path.resolve(process.cwd(), "uploads");

// ────────────────────────────────────────────────────────────────────────────
// Utility: buildEntityFolderName
//
// Produces a stable, human-readable folder name from entity ID + name.
// Format: <entityId>-<slugified-name>
// Example: cm1abc123-beach-villa
//
// Rules:
//   - Always starts with the full entity ID (stable, unique)
//   - Followed by a slugified version of the entity name (readable)
//   - If no name is provided, falls back to just the ID
//   - Once created, the folder is NEVER renamed
//   - URL-safe, lowercase, no special characters
//   - Trimmed to prevent excessively long paths
// ────────────────────────────────────────────────────────────────────────────

const slugify = (input: string): string =>
  input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "file";

/**
 * Must produce IDENTICAL output to media.service.ts buildEntityFolderName.
 * The slug portion is capped at 30 chars for filesystem safety.
 */
const buildEntityFolderName = (entityId: string, entityName?: string | null): string => {
  if (!entityName || entityName.trim().length === 0) {
    return entityId;
  }
  const nameSlug = slugify(entityName).slice(0, 30);
  return `${entityId}-${nameSlug}`;
};

// ────────────────────────────────────────────────────────────────────────────
// Utility: extract filename from a URL or path
// ────────────────────────────────────────────────────────────────────────────

const extractFilename = (url: string): string | null => {
  try {
    if (url.startsWith("http")) {
      const parsed = new URL(url);
      const segments = parsed.pathname.split("/");
      return decodeURIComponent(segments[segments.length - 1] ?? "");
    }
    return path.basename(url);
  } catch {
    return null;
  }
};

// ────────────────────────────────────────────────────────────────────────────
// Utility: MIME type detection
// ────────────────────────────────────────────────────────────────────────────

const getMimeType = (filename: string): string => {
  const ext = path.extname(filename).toLowerCase();
  const map: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".pdf": "application/pdf",
  };
  return map[ext] ?? "application/octet-stream";
};

// ────────────────────────────────────────────────────────────────────────────
// Utility: safe file copy (never moves, never overwrites)
// ────────────────────────────────────────────────────────────────────────────

const copyFileIfExists = (source: string, dest: string): boolean => {
  if (!fs.existsSync(source)) return false;
  if (fs.existsSync(dest)) return true; // already copied — idempotent
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(source, dest);
  return true;
};

const getFileSize = (filePath: string): number => {
  try {
    return fs.statSync(filePath).size;
  } catch {
    return 0;
  }
};

// ────────────────────────────────────────────────────────────────────────────
// Migration stats & reporting
// ────────────────────────────────────────────────────────────────────────────

interface Stats {
  migrated: number;
  skipped: number;
  errors: number;
  missingFiles: string[];
}

const createStats = (): Stats => ({
  migrated: 0,
  skipped: 0,
  errors: 0,
  missingFiles: [],
});

// ────────────────────────────────────────────────────────────────────────────
// Main migration
// ────────────────────────────────────────────────────────────────────────────

const main = async () => {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  TravelMate Media Migration (Structured Folders)");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`  Uploads root: ${UPLOADS_ROOT}`);
  console.log(`  Timestamp:    ${new Date().toISOString()}`);
  console.log("");

  // ── 1. Stay Images ─────────────────────────────────────────────────────
  console.log("[1/6] Migrating Stay images...");
  const stays = await prisma.stay.findMany({
    where: { images: { isEmpty: false } },
    select: { id: true, title: true, images: true, ownerId: true },
  });
  const stayStats = createStats();

  for (const stay of stays) {
    const folderName = buildEntityFolderName(stay.id, stay.title);

    for (let i = 0; i < stay.images.length; i++) {
      const filename = extractFilename(stay.images[i]!);
      if (!filename) {
        stayStats.errors++;
        continue;
      }

      // Idempotency: skip if record already exists
      const existing = await prisma.stayImage.findFirst({
        where: { stayId: stay.id, filename },
      });
      if (existing) {
        stayStats.skipped++;
        continue;
      }

      const destDir = path.join(UPLOADS_ROOT, "public", "stays", folderName);
      const destPath = path.join(destDir, filename);
      const sourcePath = path.join(UPLOADS_ROOT, filename);

      const copied = copyFileIfExists(sourcePath, destPath);
      if (!copied) {
        stayStats.missingFiles.push(sourcePath);
      }

      // Store FULL relative path in DB
      const relativePath = `/uploads/public/stays/${folderName}/${filename}`;

      try {
        await prisma.stayImage.create({
          data: {
            stayId: stay.id,
            path: relativePath,
            filename,
            mimeType: getMimeType(filename),
            size: getFileSize(destPath) || getFileSize(sourcePath),
            isCover: i === 0,
            sortOrder: i,
            uploadedById: stay.ownerId,
          },
        });
        stayStats.migrated++;
      } catch (e) {
        stayStats.errors++;
        console.error(`  Error migrating stay image: ${filename}`, e);
      }
    }
  }
  console.log(`  ✓ ${stayStats.migrated} migrated, ${stayStats.skipped} skipped, ${stayStats.errors} errors`);
  if (stayStats.missingFiles.length > 0) {
    console.log(`  ⚠ ${stayStats.missingFiles.length} source files not found (records created with path anyway)`);
  }
  console.log("");

  // ── 2. Vehicle Images ──────────────────────────────────────────────────
  console.log("[2/6] Migrating Vehicle images...");
  const vehicles = await prisma.vehicle.findMany({
    where: { images: { isEmpty: false } },
    select: { id: true, brand: true, model: true, title: true, images: true, driverId: true },
  });
  const vehicleStats = createStats();

  for (const vehicle of vehicles) {
    // Use title if available, otherwise combine brand + model
    const vehicleName = vehicle.title || `${vehicle.brand} ${vehicle.model}`.trim();
    const folderName = buildEntityFolderName(vehicle.id, vehicleName);

    for (let i = 0; i < vehicle.images.length; i++) {
      const filename = extractFilename(vehicle.images[i]!);
      if (!filename) {
        vehicleStats.errors++;
        continue;
      }

      const existing = await prisma.vehicleImage.findFirst({
        where: { vehicleId: vehicle.id, filename },
      });
      if (existing) {
        vehicleStats.skipped++;
        continue;
      }

      const destDir = path.join(UPLOADS_ROOT, "public", "vehicles", folderName);
      const destPath = path.join(destDir, filename);
      const sourcePath = path.join(UPLOADS_ROOT, filename);

      const copied = copyFileIfExists(sourcePath, destPath);
      if (!copied) {
        vehicleStats.missingFiles.push(sourcePath);
      }

      const relativePath = `/uploads/public/vehicles/${folderName}/${filename}`;

      try {
        await prisma.vehicleImage.create({
          data: {
            vehicleId: vehicle.id,
            path: relativePath,
            filename,
            mimeType: getMimeType(filename),
            size: getFileSize(destPath) || getFileSize(sourcePath),
            isCover: i === 0,
            sortOrder: i,
            uploadedById: vehicle.driverId,
          },
        });
        vehicleStats.migrated++;
      } catch (e) {
        vehicleStats.errors++;
        console.error(`  Error migrating vehicle image: ${filename}`, e);
      }
    }
  }
  console.log(`  ✓ ${vehicleStats.migrated} migrated, ${vehicleStats.skipped} skipped, ${vehicleStats.errors} errors`);
  if (vehicleStats.missingFiles.length > 0) {
    console.log(`  ⚠ ${vehicleStats.missingFiles.length} source files not found`);
  }
  console.log("");

  // ── 3. Attraction Images ───────────────────────────────────────────────
  console.log("[3/6] Migrating Attraction images...");
  const attractions = await prisma.attraction.findMany({
    where: { images: { isEmpty: false } },
    select: { id: true, title: true, images: true },
  });
  const attractionStats = createStats();

  for (const attraction of attractions) {
    const folderName = buildEntityFolderName(attraction.id, attraction.title);

    for (let i = 0; i < attraction.images.length; i++) {
      const filename = extractFilename(attraction.images[i]!);
      if (!filename) {
        attractionStats.errors++;
        continue;
      }

      const existing = await prisma.attractionImage.findFirst({
        where: { attractionId: attraction.id, filename },
      });
      if (existing) {
        attractionStats.skipped++;
        continue;
      }

      const destDir = path.join(UPLOADS_ROOT, "public", "attractions", folderName);
      const destPath = path.join(destDir, filename);
      const sourcePath = path.join(UPLOADS_ROOT, filename);

      const copied = copyFileIfExists(sourcePath, destPath);
      if (!copied) {
        attractionStats.missingFiles.push(sourcePath);
      }

      const relativePath = `/uploads/public/attractions/${folderName}/${filename}`;

      try {
        await prisma.attractionImage.create({
          data: {
            attractionId: attraction.id,
            path: relativePath,
            filename,
            mimeType: getMimeType(filename),
            size: getFileSize(destPath) || getFileSize(sourcePath),
            isCover: i === 0,
            sortOrder: i,
          },
        });
        attractionStats.migrated++;
      } catch (e) {
        attractionStats.errors++;
        console.error(`  Error migrating attraction image: ${filename}`, e);
      }
    }
  }
  console.log(`  ✓ ${attractionStats.migrated} migrated, ${attractionStats.skipped} skipped, ${attractionStats.errors} errors`);
  if (attractionStats.missingFiles.length > 0) {
    console.log(`  ⚠ ${attractionStats.missingFiles.length} source files not found`);
  }
  console.log("");

  // ── 4. User Avatars ────────────────────────────────────────────────────
  console.log("[4/6] Migrating User avatars...");
  const usersWithAvatar = await prisma.user.findMany({
    where: { avatarUrl: { not: null } },
    select: { id: true, name: true, avatarUrl: true },
  });
  const avatarStats = createStats();

  for (const user of usersWithAvatar) {
    if (!user.avatarUrl) continue;

    const filename = extractFilename(user.avatarUrl);
    if (!filename) {
      avatarStats.errors++;
      continue;
    }

    const existing = await prisma.userAvatar.findUnique({ where: { userId: user.id } });
    if (existing) {
      avatarStats.skipped++;
      continue;
    }

    const folderName = buildEntityFolderName(user.id, user.name);
    const destDir = path.join(UPLOADS_ROOT, "public", "users", folderName);
    const destPath = path.join(destDir, filename);
    const sourcePath = path.join(UPLOADS_ROOT, filename);

    const copied = copyFileIfExists(sourcePath, destPath);
    if (!copied) {
      avatarStats.missingFiles.push(sourcePath);
    }

    const relativePath = `/uploads/public/users/${folderName}/${filename}`;

    try {
      await prisma.userAvatar.create({
        data: {
          userId: user.id,
          path: relativePath,
          filename,
          mimeType: getMimeType(filename),
          size: getFileSize(destPath) || getFileSize(sourcePath),
          uploadedById: user.id,
        },
      });
      avatarStats.migrated++;
    } catch (e) {
      avatarStats.errors++;
      console.error(`  Error migrating user avatar: ${filename}`, e);
    }
  }
  console.log(`  ✓ ${avatarStats.migrated} migrated, ${avatarStats.skipped} skipped, ${avatarStats.errors} errors`);
  if (avatarStats.missingFiles.length > 0) {
    console.log(`  ⚠ ${avatarStats.missingFiles.length} source files not found`);
  }
  console.log("");

  // ── 5. User Documents (private) ───────────────────────────────────────
  console.log("[5/6] Migrating User documents...");
  const usersWithDocs = await prisma.user.findMany({
    where: { documents: { isEmpty: false } },
    select: { id: true, name: true, documents: true },
  });
  const docStats = createStats();

  for (const user of usersWithDocs) {
    const folderName = buildEntityFolderName(user.id, user.name);

    for (let i = 0; i < user.documents.length; i++) {
      const filename = extractFilename(user.documents[i]!);
      if (!filename) {
        docStats.errors++;
        continue;
      }

      const existing = await prisma.userDocument.findFirst({
        where: { userId: user.id, filename },
      });
      if (existing) {
        docStats.skipped++;
        continue;
      }

      const destDir = path.join(UPLOADS_ROOT, "private", "users", folderName);
      const destPath = path.join(destDir, filename);
      const sourcePath = path.join(UPLOADS_ROOT, filename);

      const copied = copyFileIfExists(sourcePath, destPath);
      if (!copied) {
        docStats.missingFiles.push(sourcePath);
      }

      const relativePath = `/uploads/private/users/${folderName}/${filename}`;

      try {
        await prisma.userDocument.create({
          data: {
            userId: user.id,
            path: relativePath,
            filename,
            mimeType: getMimeType(filename),
            size: getFileSize(destPath) || getFileSize(sourcePath),
            sortOrder: i,
            uploadedById: user.id,
          },
        });
        docStats.migrated++;
      } catch (e) {
        docStats.errors++;
        console.error(`  Error migrating user document: ${filename}`, e);
      }
    }
  }
  console.log(`  ✓ ${docStats.migrated} migrated, ${docStats.skipped} skipped, ${docStats.errors} errors`);
  if (docStats.missingFiles.length > 0) {
    console.log(`  ⚠ ${docStats.missingFiles.length} source files not found`);
  }
  console.log("");

  // ── 6. Ticket Attachments (private) ────────────────────────────────────
  console.log("[6/6] Migrating Ticket attachments...");
  const tickets = await prisma.ticket.findMany({
    where: { attachments: { isEmpty: false } },
    select: { id: true, subject: true, attachments: true, userId: true },
  });
  const ticketStats = createStats();

  for (const ticket of tickets) {
    // Tickets use just the ID for folder name (no slug needed for private/support files)
    const folderName = ticket.id;

    for (let i = 0; i < ticket.attachments.length; i++) {
      const filename = extractFilename(ticket.attachments[i]!);
      if (!filename) {
        ticketStats.errors++;
        continue;
      }

      const existing = await prisma.ticketAttachment.findFirst({
        where: { ticketId: ticket.id, filename },
      });
      if (existing) {
        ticketStats.skipped++;
        continue;
      }

      const destDir = path.join(UPLOADS_ROOT, "private", "tickets", folderName);
      const destPath = path.join(destDir, filename);
      const sourcePath = path.join(UPLOADS_ROOT, filename);

      const copied = copyFileIfExists(sourcePath, destPath);
      if (!copied) {
        ticketStats.missingFiles.push(sourcePath);
      }

      const relativePath = `/uploads/private/tickets/${folderName}/${filename}`;

      try {
        await prisma.ticketAttachment.create({
          data: {
            ticketId: ticket.id,
            path: relativePath,
            filename,
            mimeType: getMimeType(filename),
            size: getFileSize(destPath) || getFileSize(sourcePath),
            sortOrder: i,
            uploadedById: ticket.userId,
          },
        });
        ticketStats.migrated++;
      } catch (e) {
        ticketStats.errors++;
        console.error(`  Error migrating ticket attachment: ${filename}`, e);
      }
    }
  }
  console.log(`  ✓ ${ticketStats.migrated} migrated, ${ticketStats.skipped} skipped, ${ticketStats.errors} errors`);
  if (ticketStats.missingFiles.length > 0) {
    console.log(`  ⚠ ${ticketStats.missingFiles.length} source files not found`);
  }
  console.log("");

  // ── Summary ────────────────────────────────────────────────────────────
  const allStats = [
    { name: "StayImage", ...stayStats },
    { name: "VehicleImage", ...vehicleStats },
    { name: "AttractionImage", ...attractionStats },
    { name: "UserAvatar", ...avatarStats },
    { name: "UserDocument", ...docStats },
    { name: "TicketAttachment", ...ticketStats },
  ];

  console.log("═══════════════════════════════════════════════════════════");
  console.log("  Migration Summary");
  console.log("═══════════════════════════════════════════════════════════");
  for (const s of allStats) {
    console.log(
      `  ${s.name.padEnd(20)} migrated=${s.migrated} skipped=${s.skipped} errors=${s.errors} missing=${s.missingFiles.length}`,
    );
  }

  const totalMigrated = allStats.reduce((sum, s) => sum + s.migrated, 0);
  const totalErrors = allStats.reduce((sum, s) => sum + s.errors, 0);
  const totalMissing = allStats.reduce((sum, s) => sum + s.missingFiles.length, 0);

  console.log("");
  console.log(`  Total migrated: ${totalMigrated}`);
  console.log(`  Total errors:   ${totalErrors}`);
  console.log(`  Total missing:  ${totalMissing}`);

  if (totalErrors === 0 && totalMissing === 0) {
    console.log("\n  ✅ Migration completed successfully!");
  } else if (totalErrors === 0) {
    console.log("\n  ⚠️  Migration completed. Some source files were missing (records created with paths anyway).");
  } else {
    console.log(`\n  ❌ Completed with ${totalErrors} errors. Review logs above.`);
  }

  // ── Write migration report to disk ─────────────────────────────────────
  const report = {
    timestamp: new Date().toISOString(),
    uploadsRoot: UPLOADS_ROOT,
    results: allStats.map((s) => ({
      entity: s.name,
      migrated: s.migrated,
      skipped: s.skipped,
      errors: s.errors,
      missingFiles: s.missingFiles,
    })),
    totals: { migrated: totalMigrated, errors: totalErrors, missingFiles: totalMissing },
  };

  const reportPath = path.join(process.cwd(), "migration-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf-8");
  console.log(`\n  📄 Report written to: ${reportPath}`);

  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("  IMPORTANT: Old flat uploads are preserved.");
  console.log("  Run cleanup ONLY after verifying all paths resolve correctly.");
  console.log("═══════════════════════════════════════════════════════════\n");

  await prisma.$disconnect();
  await pool.end();
};

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
