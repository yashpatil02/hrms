-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'HALF_DAY', 'PAID_LEAVE');

-- CreateTable
CREATE TABLE "ShiftAttendance" (
    "id" SERIAL NOT NULL,
    "analystId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "shift" "Shift" NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShiftAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShiftAttendance_analystId_date_key" ON "ShiftAttendance"("analystId", "date");

-- AddForeignKey
ALTER TABLE "ShiftAttendance" ADD CONSTRAINT "ShiftAttendance_analystId_fkey" FOREIGN KEY ("analystId") REFERENCES "Analyst"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
