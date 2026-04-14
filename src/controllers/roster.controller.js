import prisma from "../../prisma/client.js";

const VALID_SHIFTS = ["MORNING", "AFTERNOON", "GENERAL", "EVENING", "NIGHT"];

/* ─────────────────────────────────────────
   HELPER — build date range for a month
───────────────────────────────────────── */
function monthRange(monthStr) {
  // monthStr = "2026-04"
  const [y, m] = monthStr.split("-").map(Number);
  const start = new Date(y, m - 1, 1);
  const end   = new Date(y, m, 1); // exclusive
  return { start, end };
}

/* ─────────────────────────────────────────
   GET /api/roster?month=YYYY-MM&department=
   Manager/HR/Admin — full roster for month
───────────────────────────────────────── */
export const getMonthlyRoster = async (req, res) => {
  try {
    const { month, department } = req.query;
    if (!month || !/^\d{4}-\d{2}$/.test(month))
      return res.status(400).json({ msg: "month param required (YYYY-MM)" });

    const { start, end } = monthRange(month);

    // Fetch all roster entries for the month
    const entries = await prisma.shiftRoster.findMany({
      where: { date: { gte: start, lt: end } },
      include: {
        user: { select: { id: true, name: true, department: true, designation: true, avatar: true } },
      },
      orderBy: [{ date: "asc" }, { userId: "asc" }],
    });

    // Fetch all active employees (for the grid)
    const userWhere = { role: { not: "ADMIN" } };
    if (department) userWhere.department = department;

    const users = await prisma.user.findMany({
      where: userWhere,
      select: { id: true, name: true, department: true, designation: true, avatar: true },
      orderBy: [{ department: "asc" }, { name: "asc" }],
    });

    res.json({ entries, users });
  } catch (err) {
    console.error("getMonthlyRoster:", err);
    res.status(500).json({ msg: "Failed to fetch roster" });
  }
};

/* ─────────────────────────────────────────
   POST /api/roster
   Manager assigns shift to employee
   Body: { userId, date, shift, note? }
───────────────────────────────────────── */
export const assignShift = async (req, res) => {
  try {
    const { userId, date, shift, note } = req.body;
    if (!userId || !date || !shift)
      return res.status(400).json({ msg: "userId, date, shift required" });
    if (!VALID_SHIFTS.includes(shift))
      return res.status(400).json({ msg: "Invalid shift value" });

    const dateObj = new Date(date);
    dateObj.setHours(0, 0, 0, 0);

    // Upsert — if same userId+date already exists, update the shift
    const entry = await prisma.shiftRoster.upsert({
      where: { userId_date: { userId: Number(userId), date: dateObj } },
      create: {
        userId:      Number(userId),
        date:        dateObj,
        shift,
        note:        note || null,
        createdById: req.user.id,
      },
      update: {
        shift,
        note:        note || null,
        createdById: req.user.id,
      },
      include: {
        user: { select: { id: true, name: true, department: true, designation: true, avatar: true } },
      },
    });

    res.json({ msg: "Shift assigned", entry });
  } catch (err) {
    console.error("assignShift:", err);
    res.status(500).json({ msg: "Failed to assign shift" });
  }
};

/* ─────────────────────────────────────────
   DELETE /api/roster/:id
   Manager removes a shift assignment
───────────────────────────────────────── */
export const removeShift = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.shiftRoster.delete({ where: { id } });
    res.json({ msg: "Shift removed" });
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ msg: "Entry not found" });
    console.error("removeShift:", err);
    res.status(500).json({ msg: "Failed to remove shift" });
  }
};

/* ─────────────────────────────────────────
   GET /api/roster/my?month=YYYY-MM
   Employee — own schedule
───────────────────────────────────────── */
export const getMySchedule = async (req, res) => {
  try {
    const { month } = req.query;
    if (!month || !/^\d{4}-\d{2}$/.test(month))
      return res.status(400).json({ msg: "month param required (YYYY-MM)" });

    const { start, end } = monthRange(month);

    const entries = await prisma.shiftRoster.findMany({
      where: { userId: req.user.id, date: { gte: start, lt: end } },
      orderBy: { date: "asc" },
    });

    res.json({ entries });
  } catch (err) {
    console.error("getMySchedule:", err);
    res.status(500).json({ msg: "Failed to fetch schedule" });
  }
};

/* ─────────────────────────────────────────
   POST /api/roster/swap
   Employee requests a shift swap
   Body: { myRosterId, targetRosterId, reason? }
───────────────────────────────────────── */
export const requestSwap = async (req, res) => {
  try {
    const { myRosterId, targetRosterId, reason } = req.body;
    if (!myRosterId || !targetRosterId)
      return res.status(400).json({ msg: "myRosterId and targetRosterId required" });

    // Validate both roster entries exist
    const [myEntry, targetEntry] = await Promise.all([
      prisma.shiftRoster.findUnique({ where: { id: Number(myRosterId) } }),
      prisma.shiftRoster.findUnique({ where: { id: Number(targetRosterId) } }),
    ]);

    if (!myEntry)     return res.status(404).json({ msg: "Your shift not found" });
    if (!targetEntry) return res.status(404).json({ msg: "Target shift not found" });
    if (myEntry.userId !== req.user.id)
      return res.status(403).json({ msg: "You can only swap your own shifts" });
    if (targetEntry.userId === req.user.id)
      return res.status(400).json({ msg: "Cannot swap with yourself" });

    // Check no pending swap already exists for same pair
    const existing = await prisma.shiftSwapRequest.findFirst({
      where: {
        requesterRosterId: Number(myRosterId),
        targetRosterId:    Number(targetRosterId),
        status:            "PENDING",
      },
    });
    if (existing) return res.status(409).json({ msg: "A pending swap request already exists" });

    const swap = await prisma.shiftSwapRequest.create({
      data: {
        requesterId:       req.user.id,
        targetId:          targetEntry.userId,
        requesterRosterId: Number(myRosterId),
        targetRosterId:    Number(targetRosterId),
        reason:            reason || null,
        status:            "PENDING",
      },
      include: {
        requester:       { select: { id: true, name: true } },
        target:          { select: { id: true, name: true } },
        requesterRoster: true,
        targetRoster:    true,
      },
    });

    res.status(201).json({ msg: "Swap request sent", swap });
  } catch (err) {
    console.error("requestSwap:", err);
    res.status(500).json({ msg: "Failed to create swap request" });
  }
};

/* ─────────────────────────────────────────
   GET /api/roster/swap?month=YYYY-MM
   Employee: own requests. Manager: all.
───────────────────────────────────────── */
export const getSwapRequests = async (req, res) => {
  try {
    const { month } = req.query;
    const isManager = ["ADMIN", "HR", "MANAGER"].includes(req.user.role);

    const where = {};
    if (!isManager) {
      where.OR = [
        { requesterId: req.user.id },
        { targetId:    req.user.id },
      ];
    }
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const { start, end } = monthRange(month);
      where.createdAt = { gte: start, lt: end };
    }

    const swaps = await prisma.shiftSwapRequest.findMany({
      where,
      include: {
        requester:       { select: { id: true, name: true, department: true } },
        target:          { select: { id: true, name: true, department: true } },
        requesterRoster: true,
        targetRoster:    true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ swaps });
  } catch (err) {
    console.error("getSwapRequests:", err);
    res.status(500).json({ msg: "Failed to fetch swap requests" });
  }
};

/* ─────────────────────────────────────────
   PATCH /api/roster/swap/:id/respond
   Target employee accepts or rejects
   Body: { accept: true | false }
───────────────────────────────────────── */
export const respondToSwap = async (req, res) => {
  try {
    const id     = parseInt(req.params.id);
    const { accept } = req.body;

    const swap = await prisma.shiftSwapRequest.findUnique({ where: { id } });
    if (!swap)                         return res.status(404).json({ msg: "Swap request not found" });
    if (swap.targetId !== req.user.id) return res.status(403).json({ msg: "Not your swap request to respond" });
    if (swap.status !== "PENDING")     return res.status(400).json({ msg: "Swap already responded" });

    const updated = await prisma.shiftSwapRequest.update({
      where: { id },
      data: {
        status:     accept ? "ACCEPTED" : "REJECTED",
        resolvedAt: accept ? null : new Date(),
      },
    });

    res.json({ msg: accept ? "Swap accepted — awaiting manager approval" : "Swap rejected", swap: updated });
  } catch (err) {
    console.error("respondToSwap:", err);
    res.status(500).json({ msg: "Failed to respond to swap" });
  }
};

/* ─────────────────────────────────────────
   PATCH /api/roster/swap/:id/resolve
   Manager approves or rejects swap
   Body: { approve: true | false }
───────────────────────────────────────── */
export const resolveSwap = async (req, res) => {
  try {
    const id      = parseInt(req.params.id);
    const { approve } = req.body;

    const swap = await prisma.shiftSwapRequest.findUnique({
      where: { id },
      include: { requesterRoster: true, targetRoster: true },
    });
    if (!swap)                     return res.status(404).json({ msg: "Swap request not found" });
    if (swap.status !== "ACCEPTED") return res.status(400).json({ msg: "Swap must be accepted by target employee first" });

    if (approve) {
      // Execute the swap — update both roster entries
      await prisma.$transaction([
        prisma.shiftRoster.update({
          where: { id: swap.requesterRosterId },
          data:  { userId: swap.targetId, createdById: req.user.id },
        }),
        prisma.shiftRoster.update({
          where: { id: swap.targetRosterId },
          data:  { userId: swap.requesterId, createdById: req.user.id },
        }),
        prisma.shiftSwapRequest.update({
          where: { id },
          data:  { status: "APPROVED", resolvedAt: new Date(), resolvedById: req.user.id },
        }),
      ]);
      return res.json({ msg: "Swap approved and executed" });
    } else {
      await prisma.shiftSwapRequest.update({
        where: { id },
        data:  { status: "REJECTED", resolvedAt: new Date(), resolvedById: req.user.id },
      });
      return res.json({ msg: "Swap rejected by manager" });
    }
  } catch (err) {
    console.error("resolveSwap:", err);
    res.status(500).json({ msg: "Failed to resolve swap" });
  }
};
