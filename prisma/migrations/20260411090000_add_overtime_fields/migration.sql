-- Add overtime tracking fields to DailyTarget
ALTER TABLE "DailyTarget" ADD COLUMN "overtime" JSONB;
ALTER TABLE "DailyTarget" ADD COLUMN "overtimeHours" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Add overtime hourly rate to User
ALTER TABLE "User" ADD COLUMN "overtimeRatePerHour" DOUBLE PRECISION NOT NULL DEFAULT 0;
