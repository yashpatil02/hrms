-- CreateIndex
CREATE INDEX "Analyst_shift_idx" ON "Analyst"("shift");

-- CreateIndex
CREATE INDEX "Analyst_isActive_idx" ON "Analyst"("isActive");

-- CreateIndex
CREATE INDEX "Analyst_shift_isActive_idx" ON "Analyst"("shift", "isActive");

-- CreateIndex
CREATE INDEX "Attendance_date_idx" ON "Attendance"("date");

-- CreateIndex
CREATE INDEX "Attendance_dayType_idx" ON "Attendance"("dayType");

-- CreateIndex
CREATE INDEX "Leave_userId_idx" ON "Leave"("userId");

-- CreateIndex
CREATE INDEX "Leave_status_idx" ON "Leave"("status");

-- CreateIndex
CREATE INDEX "Leave_createdAt_idx" ON "Leave"("createdAt");

-- CreateIndex
CREATE INDEX "Leave_userId_status_idx" ON "Leave"("userId", "status");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_isRead_idx" ON "Notification"("isRead");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "ShiftAttendance_date_idx" ON "ShiftAttendance"("date");

-- CreateIndex
CREATE INDEX "ShiftAttendance_shift_idx" ON "ShiftAttendance"("shift");

-- CreateIndex
CREATE INDEX "ShiftAttendance_date_shift_idx" ON "ShiftAttendance"("date", "shift");
