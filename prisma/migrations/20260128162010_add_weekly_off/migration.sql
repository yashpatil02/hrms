-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DayType" ADD VALUE 'ABSENT';
ALTER TYPE "DayType" ADD VALUE 'WEEKOFF';
ALTER TYPE "DayType" ADD VALUE 'WEEKOFF_PRESENT';
ALTER TYPE "DayType" ADD VALUE 'PENDING_WEEKOFF';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "weeklyOff" TEXT;
