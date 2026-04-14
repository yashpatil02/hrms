-- New Employee Profile Fields (personal, emergency, bank, employment)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "dateOfBirth"    TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "gender"         TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bloodGroup"     TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "address"        TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "city"           TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "state"          TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "pincode"        TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emergencyName"  TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emergencyPhone" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emergencyRel"   TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bankName"       TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bankAccount"    TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bankIFSC"       TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bankHolder"     TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "employeeCode"   TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "panNumber"      TEXT;

-- ManagementAudit table
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
    CONSTRAINT "ManagementAudit_actorId_fkey"
        FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "ManagementAudit_actorId_idx"      ON "ManagementAudit"("actorId");
CREATE INDEX IF NOT EXISTS "ManagementAudit_action_idx"       ON "ManagementAudit"("action");
CREATE INDEX IF NOT EXISTS "ManagementAudit_entity_idx"       ON "ManagementAudit"("entity");
CREATE INDEX IF NOT EXISTS "ManagementAudit_createdAt_idx"    ON "ManagementAudit"("createdAt");
CREATE INDEX IF NOT EXISTS "ManagementAudit_targetUserId_idx" ON "ManagementAudit"("targetUserId");
