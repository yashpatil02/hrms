-- DropForeignKey
ALTER TABLE "AnalystShiftHistory" DROP CONSTRAINT "AnalystShiftHistory_analystId_fkey";

-- AddForeignKey
ALTER TABLE "AnalystShiftHistory" ADD CONSTRAINT "AnalystShiftHistory_analystId_fkey" FOREIGN KEY ("analystId") REFERENCES "Analyst"("id") ON DELETE CASCADE ON UPDATE CASCADE;
