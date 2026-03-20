import prisma from "../../prisma/client.js";
import { createNotification } from "../utils/createNotification.js";

/* ============================================================
   HELPER
============================================================ */
const diffDays = (from, to) => {
  const ms = new Date(to) - new Date(from);
  return Math.max(1, Math.ceil(ms / (1000*60*60*24)) + 1);
};

const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" });

/* ============================================================
   APPLY LEAVE  —  POST /api/leaves
============================================================ */
export const applyLeave = async (req, res) => {
  try {
    const userId = req.user.id;
    const { fromDate, toDate, reason } = req.body;

    if (!fromDate || !toDate || !reason?.trim()) {
      return res.status(400).json({ msg: "All fields are required" });
    }

    const from = new Date(fromDate);
    const to   = new Date(toDate);
    if (from > to) return res.status(400).json({ msg: "From date cannot be after to date" });

    /* check overlapping leaves */
    const overlap = await prisma.leave.findFirst({
      where: {
        userId,
        status: { not: "REJECTED" },
        OR: [
          { fromDate: { lte: to }, toDate: { gte: from } },
        ],
      },
    });
    if (overlap) {
      return res.status(400).json({
        msg: `You already have a leave (${overlap.status}) from ${fmtDate(overlap.fromDate)} to ${fmtDate(overlap.toDate)} overlapping this range`,
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, department: true },
    });

    const leave = await prisma.leave.create({
      data: { userId, fromDate: from, toDate: to, reason: reason.trim() },
    });

    const days = diffDays(from, to);

    /* notify admins */
    await createNotification({
      userId:      null,
      title:       `Leave Request — ${user.name}`,
      message:     `${user.name} applied for leave from ${fmtDate(from)} to ${fmtDate(to)} (${days} day${days>1?"s":""}). Reason: ${reason}`,
      type:        "INFO",
      entity:      "LEAVE",
      entityId:    leave.id,
      socketEvent: "leave:new",
    });

    /* notify employee */
    await createNotification({
      userId,
      title:       "Leave Application Submitted",
      message:     `Your leave from ${fmtDate(from)} to ${fmtDate(to)} (${days} day${days>1?"s":""}) is pending approval.`,
      type:        "INFO",
      entity:      "LEAVE",
      entityId:    leave.id,
      socketEvent: "notification:new",
    });

    res.json({ msg: "Leave applied successfully", leave: { ...leave, days } });

  } catch (err) {
    console.error("applyLeave error:", err);
    res.status(500).json({ msg: "Failed to apply leave" });
  }
};

/* ============================================================
   CANCEL LEAVE  —  DELETE /api/leaves/:id
============================================================ */
export const cancelLeave = async (req, res) => {
  try {
    const userId  = req.user.id;
    const leaveId = parseInt(req.params.id);

    const leave = await prisma.leave.findUnique({ where: { id: leaveId } });
    if (!leave)              return res.status(404).json({ msg: "Leave not found" });
    if (leave.userId !== userId) return res.status(403).json({ msg: "Not your leave" });
    if (leave.status !== "PENDING")
      return res.status(400).json({ msg: `Cannot cancel a ${leave.status.toLowerCase()} leave` });

    await prisma.leave.delete({ where: { id: leaveId } });

    res.json({ msg: "Leave cancelled successfully" });
  } catch (err) {
    console.error("cancelLeave error:", err);
    res.status(500).json({ msg: "Failed to cancel leave" });
  }
};

/* ============================================================
   GET MY LEAVES  —  GET /api/leaves/my?status=&year=
============================================================ */
export const getMyLeaves = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, year } = req.query;
    const where = { userId };

    if (status && status !== "ALL") where.status = status;
    if (year) {
      where.fromDate = {
        gte: new Date(`${year}-01-01`),
        lte: new Date(`${year}-12-31`),
      };
    }

    const leaves = await prisma.leave.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    const now = new Date();
    res.json(leaves.map(l => ({
      id:           l.id,
      fromDate:     l.fromDate.toISOString().split("T")[0],
      toDate:       l.toDate.toISOString().split("T")[0],
      reason:       l.reason,
      status:       l.status,
      rejectReason: l.rejectReason,
      createdAt:    l.createdAt,
      days:         diffDays(l.fromDate, l.toDate),
      isUpcoming:   l.fromDate > now && l.status === "APPROVED",
      isPast:       l.toDate < now,
    })));

  } catch (err) {
    console.error("getMyLeaves error:", err);
    res.status(500).json({ msg: "Failed to fetch leaves" });
  }
};

/* ============================================================
   GET MY LEAVE STATS  —  GET /api/leaves/my-stats
============================================================ */
export const getMyLeaveStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const year   = new Date().getFullYear();

    const [all, pending, approved, rejected] = await Promise.all([
      prisma.leave.count({ where: { userId, fromDate: { gte: new Date(`${year}-01-01`) } } }),
      prisma.leave.count({ where: { userId, status: "PENDING" } }),
      prisma.leave.findMany({ where: { userId, status: "APPROVED", fromDate: { gte: new Date(`${year}-01-01`) } } }),
      prisma.leave.count({ where: { userId, status: "REJECTED", fromDate: { gte: new Date(`${year}-01-01`) } } }),
    ]);

    const totalApprovedDays = approved.reduce((sum, l) => sum + diffDays(l.fromDate, l.toDate), 0);
    const upcoming = approved.filter(l => l.fromDate > new Date()).length;

    res.json({
      total: all, pending, approved: approved.length,
      rejected, totalApprovedDays, upcoming,
    });

  } catch (err) {
    console.error("getMyLeaveStats error:", err);
    res.status(500).json({ msg: "Failed to fetch stats" });
  }
};

/* ============================================================
   ADMIN — GET PENDING LEAVES  —  GET /api/leaves/pending
============================================================ */
export const getPendingLeaves = async (req, res) => {
  try {
    const leaves = await prisma.leave.findMany({
      where: { status: "PENDING" },
      include: { user: { select: { id:true, name:true, email:true, department:true } } },
      orderBy: { createdAt: "asc" },
    });

    res.json(leaves.map(l => ({
      ...l,
      fromDate: l.fromDate.toISOString().split("T")[0],
      toDate:   l.toDate.toISOString().split("T")[0],
      days:     diffDays(l.fromDate, l.toDate),
    })));
  } catch (err) {
    res.status(500).json({ msg: "Failed to fetch pending leaves" });
  }
};

/* ============================================================
   ADMIN — GET ALL LEAVES  —  GET /api/leaves/admin
============================================================ */
export const getAdvancedLeaves = async (req, res) => {
  try {
    const { status, search, page=1, limit=20 } = req.query;
    const where = {};
    if (status && status!=="ALL") where.status = status;
    if (search?.trim()) {
      where.user = { OR: [
        { name:  { contains: search, mode:"insensitive" } },
        { email: { contains: search, mode:"insensitive" } },
      ]};
    }

    const [leaves, total] = await Promise.all([
      prisma.leave.findMany({
        where,
        include: { user: { select: { id:true, name:true, email:true, department:true } } },
        orderBy: { createdAt: "desc" },
        skip:  (Number(page)-1)*Number(limit),
        take:  Number(limit),
      }),
      prisma.leave.count({ where }),
    ]);

    res.json({
      data: leaves.map(l => ({
        ...l,
        fromDate: l.fromDate.toISOString().split("T")[0],
        toDate:   l.toDate.toISOString().split("T")[0],
        days:     diffDays(l.fromDate, l.toDate),
      })),
      total, page:Number(page),
      totalPages: Math.ceil(total/Number(limit)),
    });
  } catch (err) {
    res.status(500).json({ msg: "Failed to fetch leaves" });
  }
};

/* ============================================================
   APPROVE LEAVE  —  PUT /api/leaves/:id/approve
============================================================ */
export const approveLeave = async (req, res) => {
  try {
    const leave = await prisma.leave.update({
      where: { id: parseInt(req.params.id) },
      data:  { status: "APPROVED" },
      include: { user: { select: { id:true, name:true } } },
    });

    const days = diffDays(leave.fromDate, leave.toDate);

    await createNotification({
      userId:  leave.user.id,
      title:   "Leave Approved ✅",
      message: `Your leave from ${fmtDate(leave.fromDate)} to ${fmtDate(leave.toDate)} (${days} day${days>1?"s":""}) has been approved.`,
      type:        "SUCCESS",
      entity:      "LEAVE",
      entityId:    leave.id,
      socketEvent: "leave:approved",
    });

    res.json({ msg: "Leave approved" });
  } catch (err) {
    res.status(500).json({ msg: "Approval failed" });
  }
};

/* ============================================================
   REJECT LEAVE  —  PUT /api/leaves/:id/reject
============================================================ */
export const rejectLeave = async (req, res) => {
  try {
    const { rejectReason } = req.body;
    if (!rejectReason?.trim()) return res.status(400).json({ msg: "Reject reason is required" });

    const leave = await prisma.leave.update({
      where: { id: parseInt(req.params.id) },
      data:  { status: "REJECTED", rejectReason },
      include: { user: { select: { id:true, name:true } } },
    });

    await createNotification({
      userId:  leave.user.id,
      title:   "Leave Rejected ❌",
      message: `Your leave from ${fmtDate(leave.fromDate)} to ${fmtDate(leave.toDate)} was rejected. Reason: ${rejectReason}`,
      type:        "ERROR",
      entity:      "LEAVE",
      entityId:    leave.id,
      socketEvent: "leave:rejected",
    });

    res.json({ msg: "Leave rejected" });
  } catch (err) {
    res.status(500).json({ msg: "Rejection failed" });
  }
};