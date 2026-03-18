/*
  Warnings:

  - A unique constraint covering the columns `[userId,date]` on the table `Attendance` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `date` to the `Attendance` table without a default value. This is not possible if the table is not empty.
  - Added the required column `dayType` to the `Attendance` table without a default value. This is not possible if the table is not empty.
  - Made the column `checkOut` on table `Attendance` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "DayType" AS ENUM ('FULL', 'HALF');

-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "date" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "dayType" "DayType" NOT NULL,
ALTER COLUMN "checkIn" SET DATA TYPE TEXT,
ALTER COLUMN "checkOut" SET NOT NULL,
ALTER COLUMN "checkOut" SET DATA TYPE TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_userId_date_key" ON "Attendance"("userId", "date");
