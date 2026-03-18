-- CreateTable
CREATE TABLE "AnalystShiftHistory" (
    "id" SERIAL NOT NULL,
    "analystId" INTEGER NOT NULL,
    "shift" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalystShiftHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnalystShiftHistory_analystId_month_year_idx" ON "AnalystShiftHistory"("analystId", "month", "year");

-- AddForeignKey
ALTER TABLE "AnalystShiftHistory" ADD CONSTRAINT "AnalystShiftHistory_analystId_fkey" FOREIGN KEY ("analystId") REFERENCES "Analyst"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
