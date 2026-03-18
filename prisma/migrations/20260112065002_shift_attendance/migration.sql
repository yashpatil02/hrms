-- CreateEnum
CREATE TYPE "ShiftType" AS ENUM ('MORNING', 'AFTERNOON', 'GENERAL', 'EVENING', 'NIGHT');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'HALF_DAY', 'PAID_LEAVE', 'PAID_HOLIDAY');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "shift" "ShiftType";
