import prisma from "../../prisma/client.js";
import bcrypt from "bcrypt";
import { createNotification } from "../utils/createNotification.js";
import { logAudit } from "../services/audit.service.js";

/* ================================
   GET ALL USERS (with stats)
================================ */
export const getUsers = async (req, res) => {
  try {
    /* MANAGER sees only their own department */
    const deptFilter = (req.user.role === "MANAGER" && req.user.department)
      ? { department: req.user.department }
      : {};

    const users = await prisma.user.findMany({
      where: deptFilter,
      orderBy: { createdAt: "desc" },
      select: {
        id:            true,
        name:          true,
        email:         true,
        role:          true,
        department:    true,
        weeklyOff:     true,
        weekoffBalance:true,
        createdAt:     true,
        _count: {
          select: {
            attendances: true,
            leaves:      true,
            documents:   true,
          },
        },
      },
    });

    /* attach last attendance date for each user */
    const now        = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd   = new Date(now.getFullYear(), now.getMonth()+1, 0, 23,59,59);

    const monthlyAttendance = await prisma.attendance.groupBy({
      by: ["userId"],
      where: {
        date: { gte: monthStart, lte: monthEnd },
        dayType: { in: ["FULL", "HALF", "WEEKOFF_PRESENT"] },
      },
      _count: { userId: true },
    });

    const attendanceMap = {};
    monthlyAttendance.forEach(a => { attendanceMap[a.userId] = a._count.userId; });

    const pendingLeaves = await prisma.leave.groupBy({
      by: ["userId"],
      where: { status: "PENDING" },
      _count: { userId: true },
    });

    const pendingMap = {};
    pendingLeaves.forEach(l => { pendingMap[l.userId] = l._count.userId; });

    const result = users.map(u => ({
      ...u,
      presentDaysThisMonth: attendanceMap[u.id] || 0,
      pendingLeaves:        pendingMap[u.id]     || 0,
      totalAttendance:      u._count.attendances,
      totalLeaves:          u._count.leaves,
      totalDocuments:       u._count.documents,
    }));

    res.json(result);
  } catch (err) {
    console.error("getUsers error:", err);
    res.status(500).json({ msg: "Failed to fetch users" });
  }
};

/* ================================
   GET SINGLE USER DETAIL
================================ */
export const getUserDetail = async (req, res) => {
  try {
    const id   = parseInt(req.params.id);
    const now  = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd   = new Date(now.getFullYear(), now.getMonth()+1, 0, 23,59,59);

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true, name: true, email: true, role: true,
        department: true, weeklyOff: true, weekoffBalance: true,
        createdAt: true,
      },
    });

    if (!user) return res.status(404).json({ msg: "User not found" });

    /* this month attendance */
    const monthAtt = await prisma.attendance.findMany({
      where: { userId: id, date: { gte: monthStart, lte: monthEnd } },
      select: { dayType: true, date: true },
      orderBy: { date: "desc" },
    });

    const presentDays = monthAtt.filter(a => ["FULL","HALF","WEEKOFF_PRESENT"].includes(a.dayType)).length;
    const absentDays  = monthAtt.filter(a => a.dayType === "ABSENT").length;
    const halfDays    = monthAtt.filter(a => a.dayType === "HALF").length;
    const leaveDays   = monthAtt.filter(a => ["PAID_LEAVE","PAID_HOLIDAY"].includes(a.dayType)).length;

    /* recent 5 leaves */
    const recentLeaves = await prisma.leave.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id:true, reason:true, fromDate:true, toDate:true, status:true, createdAt:true },
    });

    /* documents */
    const documents = await prisma.employeeDocument.findMany({
      where: { employeeId: id },
      select: { id:true, documentType:true, fileName:true, createdAt:true },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      ...user,
      thisMonth: { presentDays, absentDays, halfDays, leaveDays },
      recentLeaves,
      documents,
    });
  } catch (err) {
    console.error("getUserDetail error:", err);
    res.status(500).json({ msg: "Failed to fetch user detail" });
  }
};

/* ================================
   DELETE USER
================================ */
export const deleteUser = async (req, res) => {
  try {
    const id   = parseInt(req.params.id);
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ msg: "User not found" });
    if (user.role === "ADMIN") return res.status(403).json({ msg: "Cannot delete an admin" });

    await prisma.user.delete({ where: { id } });

    await createNotification({
      userId:      null,
      title:       `User Deleted — ${user.name}`,
      message:     `${user.name} (${user.email}) has been removed from the system.`,
      type:        "ERROR",
      entity:      "USER",
      socketEvent: "user:deleted",
    });

    logAudit({
      actorId: req.user.id, actorName: req.user.name, actorRole: req.user.role,
      action: "USER_DELETED", entity: "USER",
      description: `Deleted user ${user.name} (${user.email}) — role was ${user.role}`,
      targetUserName: user.name,
      metadata: { email: user.email, role: user.role, department: user.department },
    });

    res.json({ msg: "User deleted successfully" });
  } catch (err) {
    console.error("deleteUser error:", err);
    res.status(500).json({ msg: "Failed to delete user" });
  }
};

/* ================================
   UPDATE ROLE
================================ */
export const updateUserRole = async (req, res) => {
  try {
    const id      = parseInt(req.params.id);
    const { role } = req.body;

    if (!["ADMIN","HR","MANAGER","EMPLOYEE"].includes(role))
      return res.status(400).json({ msg: "Invalid role" });

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ msg: "User not found" });

    const updated = await prisma.user.update({ where: { id }, data: { role } });

    /* notify the user */
    await createNotification({
      userId:      id,
      title:       "Your role has been updated",
      message:     `Your account role has been changed to ${role} by Admin.`,
      type:        "INFO",
      entity:      "USER",
      entityId:    id,
      socketEvent: "notification:new",
    });

    logAudit({
      actorId: req.user.id, actorName: req.user.name, actorRole: req.user.role,
      action: "USER_ROLE_CHANGED", entity: "USER", entityId: id,
      description: `Changed ${user.name}'s role from ${user.role} → ${role}`,
      targetUserId: id, targetUserName: user.name,
      metadata: { oldRole: user.role, newRole: role },
    });

    res.json({ msg: "Role updated", user: updated });
  } catch (err) {
    console.error("updateUserRole error:", err);
    res.status(500).json({ msg: "Failed to update role" });
  }
};

/* ================================
   RESET PASSWORD
================================ */
export const resetUserPassword = async (req, res) => {
  try {
    const id          = parseInt(req.params.id);
    const { password } = req.body;

    if (!password || password.length < 6)
      return res.status(400).json({ msg: "Password must be at least 6 characters" });

    const hashed = await bcrypt.hash(password, 10);
    await prisma.user.update({ where: { id }, data: { password: hashed } });

    await createNotification({
      userId:      id,
      title:       "Password Reset",
      message:     "Your password has been reset by Admin. Please login with your new password.",
      type:        "INFO",
      entity:      "USER",
      entityId:    id,
      socketEvent: "notification:new",
    });

    res.json({ msg: "Password reset successfully" });
  } catch (err) {
    console.error("resetPassword error:", err);
    res.status(500).json({ msg: "Failed to reset password" });
  }
};

/* ================================
   UPDATE WEEKLY OFF
================================ */
export const updateWeeklyOff = async (req, res) => {
  try {
    const userId   = req.user.id;
    const { weeklyOff } = req.body;

    await prisma.user.update({ where: { id: userId }, data: { weeklyOff } });
    res.json({ msg: "Weekly off updated" });
  } catch (err) {
    res.status(500).json({ msg: "Failed to update weekly off" });
  }
};