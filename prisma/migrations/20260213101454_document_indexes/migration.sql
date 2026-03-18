-- CreateIndex
CREATE INDEX "EmployeeDocument_employeeId_idx" ON "EmployeeDocument"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeDocument_uploadedBy_idx" ON "EmployeeDocument"("uploadedBy");

-- CreateIndex
CREATE INDEX "EmployeeDocument_createdAt_idx" ON "EmployeeDocument"("createdAt");
