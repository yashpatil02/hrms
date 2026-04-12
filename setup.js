/**
 * setup.js — runs before server starts on Render.
 * All statements use IF NOT EXISTS / ADD COLUMN IF NOT EXISTS so they are
 * safe to run on every startup. No early-return guard — every section
 * always executes so new columns added later are never skipped.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function runSetup() {
  try {
    console.log("⚙️  Running DB setup...");

    /* ── 1. QC enums (idempotent via DO block) ── */
    const enumSQL = [
      `DO $$ BEGIN CREATE TYPE "QCSport" AS ENUM ('SOCCER','ICE_HOCKEY','FIELD_HOCKEY','HANDBALL','BASKETBALL'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
      `DO $$ BEGIN CREATE TYPE "QCType" AS ENUM ('REVIEW','DEEP'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
      `DO $$ BEGIN CREATE TYPE "QCErrorStatus" AS ENUM ('PENDING','VALID','INVALID'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
      `DO $$ BEGIN CREATE TYPE "QCDisputeStatus" AS ENUM ('PENDING','APPROVED','REJECTED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    ];
    for (const sql of enumSQL) await prisma.$executeRawUnsafe(sql);

    /* ── 2. QC tables ── */
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

    /* ── 3. ManagementAudit table ── */
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

    /* ── 4. All ALTER TABLE (always run — idempotent) ── */
    const alterSQL = [
      // DailyTarget columns
      `ALTER TABLE "DailyTarget" ADD COLUMN IF NOT EXISTS "overtime" JSONB`,
      `ALTER TABLE "DailyTarget" ADD COLUMN IF NOT EXISTS "overtimeHours" DOUBLE PRECISION NOT NULL DEFAULT 0`,

      // User — overtime
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "overtimeRatePerHour" DOUBLE PRECISION NOT NULL DEFAULT 0`,

      // User — personal details
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "dateOfBirth" TIMESTAMP(3)`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "gender" TEXT`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bloodGroup" TEXT`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "address" TEXT`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "city" TEXT`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "state" TEXT`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "pincode" TEXT`,

      // User — emergency contact
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emergencyName" TEXT`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emergencyPhone" TEXT`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emergencyRel" TEXT`,

      // User — bank details
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bankName" TEXT`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bankAccount" TEXT`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bankIFSC" TEXT`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bankHolder" TEXT`,

      // User — employment extras
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "employeeCode" TEXT`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "panNumber" TEXT`,
    ];
    for (const sql of alterSQL) await prisma.$executeRawUnsafe(sql);

    /* ── 5. Indexes (all idempotent with IF NOT EXISTS) ── */
    const indexes = [
      // QC
      `CREATE INDEX IF NOT EXISTS "QCSession_managerId_idx"          ON "QCSession"("managerId")`,
      `CREATE INDEX IF NOT EXISTS "QCSession_gameDate_idx"           ON "QCSession"("gameDate")`,
      `CREATE INDEX IF NOT EXISTS "QCSession_sport_idx"              ON "QCSession"("sport")`,
      `CREATE INDEX IF NOT EXISTS "QCSessionEmployee_sessionId_idx"  ON "QCSessionEmployee"("sessionId")`,
      `CREATE INDEX IF NOT EXISTS "QCSessionEmployee_employeeId_idx" ON "QCSessionEmployee"("employeeId")`,
      `CREATE INDEX IF NOT EXISTS "QCError_sessionId_idx"            ON "QCError"("sessionId")`,
      `CREATE INDEX IF NOT EXISTS "QCError_employeeId_idx"           ON "QCError"("employeeId")`,
      `CREATE INDEX IF NOT EXISTS "QCError_status_idx"               ON "QCError"("status")`,
      `CREATE INDEX IF NOT EXISTS "QCError_createdAt_idx"            ON "QCError"("createdAt")`,
      `CREATE INDEX IF NOT EXISTS "QCDispute_errorId_idx"            ON "QCDispute"("errorId")`,
      `CREATE INDEX IF NOT EXISTS "QCDispute_employeeId_idx"         ON "QCDispute"("employeeId")`,
      `CREATE INDEX IF NOT EXISTS "QCDispute_status_idx"             ON "QCDispute"("status")`,
      // ManagementAudit
      `CREATE INDEX IF NOT EXISTS "ManagementAudit_actorId_idx"      ON "ManagementAudit"("actorId")`,
      `CREATE INDEX IF NOT EXISTS "ManagementAudit_action_idx"       ON "ManagementAudit"("action")`,
      `CREATE INDEX IF NOT EXISTS "ManagementAudit_entity_idx"       ON "ManagementAudit"("entity")`,
      `CREATE INDEX IF NOT EXISTS "ManagementAudit_createdAt_idx"    ON "ManagementAudit"("createdAt")`,
      `CREATE INDEX IF NOT EXISTS "ManagementAudit_targetUserId_idx" ON "ManagementAudit"("targetUserId")`,
      // High-traffic tables
      `CREATE INDEX IF NOT EXISTS "Attendance_userId_idx"            ON "Attendance"("userId")`,
      `CREATE INDEX IF NOT EXISTS "Attendance_userId_date_idx"       ON "Attendance"("userId", "date")`,
      `CREATE INDEX IF NOT EXISTS "ShiftAttendance_analystId_idx"    ON "ShiftAttendance"("analystId")`,
      `CREATE INDEX IF NOT EXISTS "Payroll_userId_idx"               ON "Payroll"("userId")`,
      `CREATE INDEX IF NOT EXISTS "Notification_userId_read_idx"     ON "Notification"("userId", "isRead")`,
    ];
    for (const sql of indexes) await prisma.$executeRawUnsafe(sql);

    console.log("✅ DB setup complete.");
  } catch (err) {
    console.error("❌ setup.js error:", err.message);
    process.exit(1); // fail fast so Render doesn't start a broken server
  } finally {
    await prisma.$disconnect();
  }
}

await runSetup();
