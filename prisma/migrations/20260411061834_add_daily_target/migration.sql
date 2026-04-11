-- CreateTable
CREATE TABLE "DailyTarget" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "counts" JSONB NOT NULL,
    "totalHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyTarget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyTarget_userId_idx" ON "DailyTarget"("userId");

-- CreateIndex
CREATE INDEX "DailyTarget_date_idx" ON "DailyTarget"("date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyTarget_userId_date_key" ON "DailyTarget"("userId", "date");

-- AddForeignKey
ALTER TABLE "DailyTarget" ADD CONSTRAINT "DailyTarget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
