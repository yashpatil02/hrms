import { PrismaClient } from "@prisma/client";
import { createNotification } from "../utils/createNotification.js";

// const prisma = new PrismaClient({
//   datasourceUrl: process.env.DATABASE_URL,
// });

const prisma = new PrismaClient();
/* =========================
   APPLY LEAVE (EMPLOYEE)
========================= */
/* APPLY LEAVE */
export const applyLeave = async (req, res) => {
  const { reason, fromDate, toDate } = req.body;

  const leave = await prisma.leave.create({
    data: {
      userId: req.user.id,
      reason,
      fromDate: new Date(fromDate),
      toDate: new Date(toDate),
    },
  });

  await createNotification({
    title: "New Leave Request",
    message: `${req.user.name} applied for leave`,
    type: "INFO",
    entity: "LEAVE",
    entityId: leave.id,
    socketEvent: "leave:new",
  });

  res.json(leave);
};
/* =========================
   MY LEAVES (EMPLOYEE)
========================= */
export const getMyLeaves = async (req, res) => {
  try {
    const leaves = await prisma.leave.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
    });

    res.json(leaves);
  } catch (error) {
    console.error("My Leaves Error:", error);
    res.status(500).json({ msg: "Failed to fetch leaves" });
  }
};

/* =========================
   PENDING LEAVES (ADMIN)
========================= */
export const getPendingLeaves = async (req, res) => {
  try {
    const leaves = await prisma.leave.findMany({
      where: { status: "PENDING" },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    res.json(leaves);
  } catch (error) {
    console.error("Pending Leaves Error:", error);
    res.status(500).json({ msg: "Failed to fetch pending leaves" });
  }
};

/* =========================
   APPROVE LEAVE (ADMIN)
========================= */
export const approveLeave = async (req, res) => {
  try {
    const leaveId = Number(req.params.id);

    const leave = await prisma.leave.findUnique({
      where: { id: leaveId },
    });

    if (!leave || leave.status !== "PENDING") {
      return res.status(400).json({
        msg: "Leave already processed or not found",
      });
    }

    const updated = await prisma.leave.update({
      where: { id: leaveId },
      data: {
        status: "APPROVED",
        rejectReason: null,
      },
    });

    /* 🔔 EMPLOYEE NOTIFICATION */
    await createNotification({
      userId: updated.userId,
      title: "Leave Approved",
      message: "Your leave request has been approved",
      type: "SUCCESS",
      entity: "LEAVE",
      entityId: updated.id,
      socketEvent: "leave:approved",
    });

    res.json({
      msg: "Leave approved successfully",
      leave: updated,
    });
  } catch (error) {
    console.error("Approve Leave Error:", error);
    res.status(500).json({ msg: "Failed to approve leave" });
  }
};

/* =========================
   REJECT LEAVE (ADMIN)
========================= */
export const rejectLeave = async (req, res) => {
  try {
    const leaveId = Number(req.params.id);
    const { rejectReason } = req.body;

    if (!rejectReason) {
      return res.status(400).json({
        msg: "Reject reason is required",
      });
    }

    const leave = await prisma.leave.findUnique({
      where: { id: leaveId },
    });

    if (!leave || leave.status !== "PENDING") {
      return res.status(400).json({
        msg: "Leave already processed or not found",
      });
    }

    const updated = await prisma.leave.update({
      where: { id: leaveId },
      data: {
        status: "REJECTED",
        rejectReason,
      },
    });

    /* 🔔 EMPLOYEE NOTIFICATION WITH REASON */
    await createNotification({
      userId: updated.userId,
      title: "Leave Rejected",
      message: rejectReason,
      type: "ERROR",
      entity: "LEAVE",
      entityId: updated.id,
      socketEvent: "leave:rejected",
    });

    res.json({
      msg: "Leave rejected successfully",
      leave: updated,
    });
  } catch (error) {
    console.error("Reject Leave Error:", error);
    res.status(500).json({ msg: "Failed to reject leave" });
  }
};

/* =========================
   ADVANCED LEAVES (ADMIN)
========================= */
export const getAdvancedLeaves = async (req, res) => {
  try {
    const { status, fromDate, toDate, employeeId, month } = req.query;
    const where = {};

    if (status) where.status = status;
    if (employeeId) where.userId = Number(employeeId);

    if (fromDate || toDate) {
      where.fromDate = {};
      if (fromDate) where.fromDate.gte = new Date(fromDate);
      if (toDate) where.fromDate.lte = new Date(toDate);
    }

    if (month) {
      const [year, m] = month.split("-").map(Number);
      where.fromDate = {
        gte: new Date(year, m - 1, 1),
        lte: new Date(year, m, 0),
      };
    }

    const leaves = await prisma.leave.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(leaves);
  } catch (error) {
    console.error("Advanced Leaves Error:", error);
    res.status(500).json({ msg: "Failed to fetch leaves" });
  }
};
