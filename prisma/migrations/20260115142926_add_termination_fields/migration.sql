-- AlterTable
ALTER TABLE "Analyst" ADD COLUMN     "terminatedAt" TIMESTAMP(3),
ADD COLUMN     "terminationReason" TEXT;
