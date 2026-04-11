/**
 * setup.js — runs before server starts on Render.
 * Ensures QC tables exist in the DB without relying on prisma migrate.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function ensureQCTables() {
  try {
    // Check if QCSession table already exists
    const result = await prisma.$queryRaw`
      SELECT to_regclass('public."QCSession"') AS exists
    `;
    if (result[0]?.exists) {
      console.log("✅ QC tables already exist, skipping setup.");
      return;
    }

    console.log("⚙️  QC tables missing — creating now...");

    // Create enums (ignore if already exists)
    const enumSQL = [
      `DO $$ BEGIN CREATE TYPE "QCSport" AS ENUM ('SOCCER','ICE_HOCKEY','FIELD_HOCKEY','HANDBALL','BASKETBALL'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
      `DO $$ BEGIN CREATE TYPE "QCType" AS ENUM ('REVIEW','DEEP'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
      `DO $$ BEGIN CREATE TYPE "QCErrorStatus" AS ENUM ('PENDING','VALID','INVALID'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
      `DO $$ BEGIN CREATE TYPE "QCDisputeStatus" AS ENUM ('PENDING','APPROVED','REJECTED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    ];

    for (const sql of enumSQL) {
      await prisma.$executeRawUnsafe(sql);
    }

    // Create tables
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "QCSession" (
        "id"        SERIAL PRIMARY KEY,
        "managerId" INTEGER NOT NULL,
        "gameDate"  TIMESTAMP(3) NOT NULL,
        "gameName"  TEXT NOT NULL,
        "gameId"    TEXT,
        "sport"     "QCSport" NOT NULL,
        "league"    TEXT NOT NULL,
        "qcType"    "QCType" NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("managerId") REFERENCES "User"("id")
      )
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "QCSessionEmployee" (
        "id"         SERIAL PRIMARY KEY,
        "sessionId"  INTEGER NOT NULL,
        "employeeId" INTEGER NOT NULL,
        "fromTime"   TEXT NOT NULL,
        "toTime"     TEXT NOT NULL,
        FOREIGN KEY ("sessionId")  REFERENCES "QCSession"("id") ON DELETE CASCADE,
        FOREIGN KEY ("employeeId") REFERENCES "User"("id")
      )
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "QCError" (
        "id"         SERIAL PRIMARY KEY,
        "sessionId"  INTEGER NOT NULL,
        "employeeId" INTEGER NOT NULL,
        "timestamp"  TEXT NOT NULL,
        "errorText"  TEXT NOT NULL,
        "status"     "QCErrorStatus" NOT NULL DEFAULT 'PENDING',
        "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("sessionId")  REFERENCES "QCSession"("id") ON DELETE CASCADE,
        FOREIGN KEY ("employeeId") REFERENCES "User"("id")
      )
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "QCDispute" (
        "id"         SERIAL PRIMARY KEY,
        "errorId"    INTEGER NOT NULL,
        "employeeId" INTEGER NOT NULL,
        "reason"     TEXT NOT NULL,
        "status"     "QCDisputeStatus" NOT NULL DEFAULT 'PENDING',
        "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("errorId")    REFERENCES "QCError"("id") ON DELETE CASCADE,
        FOREIGN KEY ("employeeId") REFERENCES "User"("id")
      )
    `);

    // Create indexes
    const indexes = [
      `CREATE INDEX IF NOT EXISTS "QCSession_managerId_idx" ON "QCSession"("managerId")`,
      `CREATE INDEX IF NOT EXISTS "QCSession_gameDate_idx"  ON "QCSession"("gameDate")`,
      `CREATE INDEX IF NOT EXISTS "QCSession_sport_idx"     ON "QCSession"("sport")`,
      `CREATE INDEX IF NOT EXISTS "QCSessionEmployee_sessionId_idx"  ON "QCSessionEmployee"("sessionId")`,
      `CREATE INDEX IF NOT EXISTS "QCSessionEmployee_employeeId_idx" ON "QCSessionEmployee"("employeeId")`,
      `CREATE INDEX IF NOT EXISTS "QCError_sessionId_idx"  ON "QCError"("sessionId")`,
      `CREATE INDEX IF NOT EXISTS "QCError_employeeId_idx" ON "QCError"("employeeId")`,
      `CREATE INDEX IF NOT EXISTS "QCError_status_idx"     ON "QCError"("status")`,
      `CREATE INDEX IF NOT EXISTS "QCError_createdAt_idx"  ON "QCError"("createdAt")`,
      `CREATE INDEX IF NOT EXISTS "QCDispute_errorId_idx"    ON "QCDispute"("errorId")`,
      `CREATE INDEX IF NOT EXISTS "QCDispute_employeeId_idx" ON "QCDispute"("employeeId")`,
      `CREATE INDEX IF NOT EXISTS "QCDispute_status_idx"     ON "QCDispute"("status")`,
    ];

    for (const sql of indexes) {
      await prisma.$executeRawUnsafe(sql);
    }

    // Missing indexes on high-traffic tables
    const extraIndexes = [
      `CREATE INDEX IF NOT EXISTS "Attendance_userId_idx"        ON "Attendance"("userId")`,
      `CREATE INDEX IF NOT EXISTS "Attendance_userId_date_idx"   ON "Attendance"("userId", "date")`,
      `CREATE INDEX IF NOT EXISTS "ShiftAttendance_analystId_idx" ON "ShiftAttendance"("analystId")`,
      `CREATE INDEX IF NOT EXISTS "Payroll_userId_idx"           ON "Payroll"("userId")`,
      `CREATE INDEX IF NOT EXISTS "Notification_userId_read_idx" ON "Notification"("userId", "isRead")`,
    ];
    for (const sql of extraIndexes) {
      await prisma.$executeRawUnsafe(sql);
    }

    // Also ensure overtime columns exist on DailyTarget and User
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "DailyTarget" ADD COLUMN IF NOT EXISTS "overtime" JSONB
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "DailyTarget" ADD COLUMN IF NOT EXISTS "overtimeHours" DOUBLE PRECISION NOT NULL DEFAULT 0
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "overtimeRatePerHour" DOUBLE PRECISION NOT NULL DEFAULT 0
    `);

    // Management Audit Trail table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ManagementAudit" (
        "id"             SERIAL PRIMARY KEY,
        "actorId"        INTEGER NOT NULL,
        "actorName"      TEXT NOT NULL,
        "actorRole"      TEXT NOT NULL,
        "action"         TEXT NOT NULL,
        "entity"         TEXT NOT NULL,
        "entityId"       INTEGER,
        "description"    TEXT NOT NULL,
        "targetUserId"   INTEGER,
        "targetUserName" TEXT,
        "metadata"       JSONB,
        "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE
      )
    `);
    const auditIndexes = [
      `CREATE INDEX IF NOT EXISTS "ManagementAudit_actorId_idx"      ON "ManagementAudit"("actorId")`,
      `CREATE INDEX IF NOT EXISTS "ManagementAudit_action_idx"       ON "ManagementAudit"("action")`,
      `CREATE INDEX IF NOT EXISTS "ManagementAudit_entity_idx"       ON "ManagementAudit"("entity")`,
      `CREATE INDEX IF NOT EXISTS "ManagementAudit_createdAt_idx"    ON "ManagementAudit"("createdAt")`,
      `CREATE INDEX IF NOT EXISTS "ManagementAudit_targetUserId_idx" ON "ManagementAudit"("targetUserId")`,
    ];
    for (const sql of auditIndexes) {
      await prisma.$executeRawUnsafe(sql);
    }

    console.log("✅ QC tables and ManagementAudit table created successfully.");
  } catch (err) {
    console.error("❌ setup.js error:", err.message);
    // Don't exit — let server start anyway; Prisma will surface errors per-request
  } finally {
    await prisma.$disconnect();
  }
}

await ensureQCTables();
