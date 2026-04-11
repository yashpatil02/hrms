-- QC Sport enum
CREATE TYPE "QCSport" AS ENUM ('SOCCER', 'ICE_HOCKEY', 'FIELD_HOCKEY', 'HANDBALL', 'BASKETBALL');

-- QC Type enum
CREATE TYPE "QCType" AS ENUM ('REVIEW', 'DEEP');

-- QC Error Status enum
CREATE TYPE "QCErrorStatus" AS ENUM ('PENDING', 'VALID', 'INVALID');

-- QC Dispute Status enum
CREATE TYPE "QCDisputeStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- QCSession table
CREATE TABLE "QCSession" (
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
);
CREATE INDEX "QCSession_managerId_idx" ON "QCSession"("managerId");
CREATE INDEX "QCSession_gameDate_idx"  ON "QCSession"("gameDate");
CREATE INDEX "QCSession_sport_idx"     ON "QCSession"("sport");

-- QCSessionEmployee table
CREATE TABLE "QCSessionEmployee" (
    "id"         SERIAL PRIMARY KEY,
    "sessionId"  INTEGER NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "fromTime"   TEXT NOT NULL,
    "toTime"     TEXT NOT NULL,
    FOREIGN KEY ("sessionId")  REFERENCES "QCSession"("id") ON DELETE CASCADE,
    FOREIGN KEY ("employeeId") REFERENCES "User"("id")
);
CREATE INDEX "QCSessionEmployee_sessionId_idx"  ON "QCSessionEmployee"("sessionId");
CREATE INDEX "QCSessionEmployee_employeeId_idx" ON "QCSessionEmployee"("employeeId");

-- QCError table
CREATE TABLE "QCError" (
    "id"         SERIAL PRIMARY KEY,
    "sessionId"  INTEGER NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "timestamp"  TEXT NOT NULL,
    "errorText"  TEXT NOT NULL,
    "status"     "QCErrorStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("sessionId")  REFERENCES "QCSession"("id") ON DELETE CASCADE,
    FOREIGN KEY ("employeeId") REFERENCES "User"("id")
);
CREATE INDEX "QCError_sessionId_idx"  ON "QCError"("sessionId");
CREATE INDEX "QCError_employeeId_idx" ON "QCError"("employeeId");
CREATE INDEX "QCError_status_idx"     ON "QCError"("status");
CREATE INDEX "QCError_createdAt_idx"  ON "QCError"("createdAt");

-- QCDispute table
CREATE TABLE "QCDispute" (
    "id"         SERIAL PRIMARY KEY,
    "errorId"    INTEGER NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "reason"     TEXT NOT NULL,
    "status"     "QCDisputeStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("errorId")    REFERENCES "QCError"("id") ON DELETE CASCADE,
    FOREIGN KEY ("employeeId") REFERENCES "User"("id")
);
CREATE INDEX "QCDispute_errorId_idx"    ON "QCDispute"("errorId");
CREATE INDEX "QCDispute_employeeId_idx" ON "QCDispute"("employeeId");
CREATE INDEX "QCDispute_status_idx"     ON "QCDispute"("status");
