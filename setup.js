/**
 * setup.js — runs before server starts on Render.
 * All statements use IF NOT EXISTS / ADD COLUMN IF NOT EXISTS so they are
 * safe to run on every startup. No early-return guard — every section
 * always executes so new columns added later are never skipped.
 */
import { PrismaClient } from "@prisma/client";

// Use DIRECT_URL (non-pooled) for DDL statements so ALTER TABLE / CREATE TABLE
// execute reliably. PgBouncer's pooled connection (DATABASE_URL) can silently
// drop session-level DDL in transaction mode.
const prisma = new PrismaClient({
  datasources: {
    db: { url: process.env.DIRECT_URL || process.env.DATABASE_URL },
  },
});

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

    /* ── 5. ShiftRoster + ShiftSwapRequest tables ── */
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "SwapStatus" AS ENUM ('PENDING','ACCEPTED','REJECTED','APPROVED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ShiftRoster" (
        "id"          SERIAL PRIMARY KEY,
        "userId"      INTEGER NOT NULL,
        "date"        TIMESTAMP(3) NOT NULL,
        "shift"       "Shift" NOT NULL,
        "note"        TEXT,
        "createdById" INTEGER NOT NULL,
        "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "ShiftRoster_userId_fkey"      FOREIGN KEY ("userId")      REFERENCES "User"("id") ON DELETE CASCADE,
        CONSTRAINT "ShiftRoster_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id"),
        CONSTRAINT "ShiftRoster_userId_date_key"  UNIQUE ("userId", "date")
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ShiftSwapRequest" (
        "id"                SERIAL PRIMARY KEY,
        "requesterId"       INTEGER NOT NULL,
        "targetId"          INTEGER NOT NULL,
        "requesterRosterId" INTEGER NOT NULL,
        "targetRosterId"    INTEGER NOT NULL,
        "reason"            TEXT,
        "status"            "SwapStatus" NOT NULL DEFAULT 'PENDING',
        "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "resolvedAt"        TIMESTAMP(3),
        "resolvedById"      INTEGER,
        CONSTRAINT "ShiftSwapRequest_requesterId_fkey"       FOREIGN KEY ("requesterId")       REFERENCES "User"("id"),
        CONSTRAINT "ShiftSwapRequest_targetId_fkey"          FOREIGN KEY ("targetId")          REFERENCES "User"("id"),
        CONSTRAINT "ShiftSwapRequest_requesterRosterId_fkey" FOREIGN KEY ("requesterRosterId") REFERENCES "ShiftRoster"("id"),
        CONSTRAINT "ShiftSwapRequest_targetRosterId_fkey"    FOREIGN KEY ("targetRosterId")    REFERENCES "ShiftRoster"("id")
      )
    `);

    /* ── 6. MonthlyShiftSchedule table ── */
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "MonthlyShiftSchedule" (
        "id"          SERIAL PRIMARY KEY,
        "userId"      INTEGER NOT NULL,
        "year"        INTEGER NOT NULL,
        "month"       INTEGER NOT NULL,
        "shift"       "Shift" NOT NULL,
        "note"        TEXT,
        "createdById" INTEGER NOT NULL,
        "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "MonthlyShiftSchedule_userId_fkey"      FOREIGN KEY ("userId")      REFERENCES "User"("id") ON DELETE CASCADE,
        CONSTRAINT "MonthlyShiftSchedule_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id"),
        CONSTRAINT "MonthlyShiftSchedule_userId_year_month_key" UNIQUE ("userId", "year", "month")
      )
    `);

    /* ── 7. ATS Tables ── */
    const atsEnums = [
      `DO $$ BEGIN CREATE TYPE "JobStatus"             AS ENUM ('DRAFT','OPEN','CLOSED');               EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
      `DO $$ BEGIN CREATE TYPE "JobType"               AS ENUM ('FULL_TIME','PART_TIME','CONTRACT','INTERNSHIP'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
      `DO $$ BEGIN CREATE TYPE "CandidateStage"        AS ENUM ('APPLIED','SCREENING','INTERVIEW','OFFER','HIRED','REJECTED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
      `DO $$ BEGIN CREATE TYPE "FeedbackRecommendation" AS ENUM ('HIRE','REJECT','HOLD');               EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    ];
    for (const sql of atsEnums) await prisma.$executeRawUnsafe(sql);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "JobPosting" (
        "id"           SERIAL PRIMARY KEY,
        "title"        TEXT NOT NULL,
        "department"   TEXT,
        "description"  TEXT NOT NULL,
        "requirements" TEXT,
        "location"     TEXT,
        "type"         "JobType"   NOT NULL DEFAULT 'FULL_TIME',
        "status"       "JobStatus" NOT NULL DEFAULT 'OPEN',
        "salaryMin"    DOUBLE PRECISION,
        "salaryMax"    DOUBLE PRECISION,
        "closingDate"  TIMESTAMP(3),
        "createdById"  INTEGER NOT NULL,
        "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("createdById") REFERENCES "User"("id")
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Candidate" (
        "id"           SERIAL PRIMARY KEY,
        "name"         TEXT NOT NULL,
        "email"        TEXT NOT NULL,
        "phone"        TEXT,
        "resumeUrl"    TEXT,
        "jobId"        INTEGER NOT NULL,
        "stage"        "CandidateStage" NOT NULL DEFAULT 'APPLIED',
        "notes"        TEXT,
        "offerSalary"  DOUBLE PRECISION,
        "joiningDate"  TIMESTAMP(3),
        "offerContent" TEXT,
        "addedById"    INTEGER NOT NULL,
        "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("jobId")     REFERENCES "JobPosting"("id") ON DELETE CASCADE,
        FOREIGN KEY ("addedById") REFERENCES "User"("id")
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "CandidateStageHistory" (
        "id"          SERIAL PRIMARY KEY,
        "candidateId" INTEGER NOT NULL,
        "fromStage"   "CandidateStage",
        "toStage"     "CandidateStage" NOT NULL,
        "notes"       TEXT,
        "changedById" INTEGER NOT NULL,
        "changedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE,
        FOREIGN KEY ("changedById") REFERENCES "User"("id")
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "InterviewFeedback" (
        "id"             SERIAL PRIMARY KEY,
        "candidateId"    INTEGER NOT NULL,
        "interviewerId"  INTEGER NOT NULL,
        "round"          TEXT NOT NULL,
        "rating"         INTEGER NOT NULL,
        "strengths"      TEXT,
        "weaknesses"     TEXT,
        "recommendation" "FeedbackRecommendation" NOT NULL,
        "notes"          TEXT,
        "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("candidateId")   REFERENCES "Candidate"("id") ON DELETE CASCADE,
        FOREIGN KEY ("interviewerId") REFERENCES "User"("id")
      )
    `);

    /* ── 8. LMS Tables ── */
    const lmsEnums = [
      `DO $$ BEGIN CREATE TYPE "TrainingStatus"  AS ENUM ('DRAFT','PUBLISHED');                              EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
      `DO $$ BEGIN CREATE TYPE "AssignmentStatus" AS ENUM ('PENDING','IN_PROGRESS','COMPLETED','EXPIRED');   EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    ];
    for (const sql of lmsEnums) await prisma.$executeRawUnsafe(sql);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Training" (
        "id"           SERIAL PRIMARY KEY,
        "title"        TEXT NOT NULL,
        "description"  TEXT,
        "category"     TEXT,
        "duration"     INTEGER NOT NULL DEFAULT 0,
        "content"      TEXT NOT NULL DEFAULT '',
        "passingScore" INTEGER NOT NULL DEFAULT 70,
        "status"       "TrainingStatus" NOT NULL DEFAULT 'DRAFT',
        "createdById"  INTEGER NOT NULL,
        "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("createdById") REFERENCES "User"("id")
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "TrainingAssignment" (
        "id"           SERIAL PRIMARY KEY,
        "trainingId"   INTEGER NOT NULL,
        "userId"       INTEGER NOT NULL,
        "assignedById" INTEGER NOT NULL,
        "dueDate"      TIMESTAMP(3),
        "status"       "AssignmentStatus" NOT NULL DEFAULT 'PENDING',
        "progress"     INTEGER NOT NULL DEFAULT 0,
        "startedAt"    TIMESTAMP(3),
        "completedAt"  TIMESTAMP(3),
        "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "TrainingAssignment_trainingId_userId_key" UNIQUE ("trainingId","userId"),
        FOREIGN KEY ("trainingId")   REFERENCES "Training"("id") ON DELETE CASCADE,
        FOREIGN KEY ("userId")       REFERENCES "User"("id"),
        FOREIGN KEY ("assignedById") REFERENCES "User"("id")
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "QuizQuestion" (
        "id"            SERIAL PRIMARY KEY,
        "trainingId"    INTEGER NOT NULL,
        "question"      TEXT NOT NULL,
        "options"       TEXT NOT NULL,
        "correctAnswer" INTEGER NOT NULL,
        "points"        INTEGER NOT NULL DEFAULT 1,
        "order"         INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY ("trainingId") REFERENCES "Training"("id") ON DELETE CASCADE
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "QuizAttempt" (
        "id"           SERIAL PRIMARY KEY,
        "assignmentId" INTEGER NOT NULL,
        "userId"       INTEGER NOT NULL,
        "answers"      TEXT NOT NULL,
        "score"        INTEGER NOT NULL,
        "passed"       BOOLEAN NOT NULL,
        "attemptNo"    INTEGER NOT NULL DEFAULT 1,
        "attemptedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("assignmentId") REFERENCES "TrainingAssignment"("id") ON DELETE CASCADE,
        FOREIGN KEY ("userId")       REFERENCES "User"("id")
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "TrainingCertificate" (
        "id"            SERIAL PRIMARY KEY,
        "assignmentId"  INTEGER NOT NULL UNIQUE,
        "userId"        INTEGER NOT NULL,
        "trainingId"    INTEGER NOT NULL,
        "certificateNo" TEXT NOT NULL UNIQUE,
        "issuedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("assignmentId") REFERENCES "TrainingAssignment"("id") ON DELETE CASCADE,
        FOREIGN KEY ("userId")       REFERENCES "User"("id"),
        FOREIGN KEY ("trainingId")   REFERENCES "Training"("id")
      )
    `);

    /* ── 9. Indexes (all idempotent with IF NOT EXISTS) ── */
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
      // ShiftRoster
      `CREATE INDEX IF NOT EXISTS "ShiftRoster_date_idx"             ON "ShiftRoster"("date")`,
      `CREATE INDEX IF NOT EXISTS "ShiftRoster_userId_idx"           ON "ShiftRoster"("userId")`,
      `CREATE INDEX IF NOT EXISTS "ShiftRoster_shift_idx"            ON "ShiftRoster"("shift")`,
      // ShiftSwapRequest
      `CREATE INDEX IF NOT EXISTS "ShiftSwapRequest_requesterId_idx" ON "ShiftSwapRequest"("requesterId")`,
      `CREATE INDEX IF NOT EXISTS "ShiftSwapRequest_targetId_idx"    ON "ShiftSwapRequest"("targetId")`,
      `CREATE INDEX IF NOT EXISTS "ShiftSwapRequest_status_idx"      ON "ShiftSwapRequest"("status")`,
      // MonthlyShiftSchedule
      `CREATE INDEX IF NOT EXISTS "MonthlyShiftSchedule_year_month_idx" ON "MonthlyShiftSchedule"("year", "month")`,
      `CREATE INDEX IF NOT EXISTS "MonthlyShiftSchedule_userId_idx"     ON "MonthlyShiftSchedule"("userId")`,
      // ATS
      `CREATE INDEX IF NOT EXISTS "JobPosting_status_idx"        ON "JobPosting"("status")`,
      `CREATE INDEX IF NOT EXISTS "JobPosting_department_idx"    ON "JobPosting"("department")`,
      `CREATE INDEX IF NOT EXISTS "Candidate_jobId_idx"          ON "Candidate"("jobId")`,
      `CREATE INDEX IF NOT EXISTS "Candidate_stage_idx"          ON "Candidate"("stage")`,
      `CREATE INDEX IF NOT EXISTS "CandidateStageHistory_candidateId_idx" ON "CandidateStageHistory"("candidateId")`,
      `CREATE INDEX IF NOT EXISTS "InterviewFeedback_candidateId_idx"     ON "InterviewFeedback"("candidateId")`,
      // LMS
      `CREATE INDEX IF NOT EXISTS "Training_status_idx"                   ON "Training"("status")`,
      `CREATE INDEX IF NOT EXISTS "TrainingAssignment_userId_idx"         ON "TrainingAssignment"("userId")`,
      `CREATE INDEX IF NOT EXISTS "TrainingAssignment_status_idx"         ON "TrainingAssignment"("status")`,
      `CREATE INDEX IF NOT EXISTS "QuizQuestion_trainingId_idx"           ON "QuizQuestion"("trainingId")`,
      `CREATE INDEX IF NOT EXISTS "QuizAttempt_assignmentId_idx"          ON "QuizAttempt"("assignmentId")`,
      `CREATE INDEX IF NOT EXISTS "TrainingCertificate_userId_idx"        ON "TrainingCertificate"("userId")`,
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
