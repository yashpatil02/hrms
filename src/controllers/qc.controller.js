import prisma from "../../prisma/client.js";

/* ── helper: create a notification ── */
const notify = (userId, title, message, type, entityId) =>
  prisma.notification.create({
    data: { userId, title, message, type, entityId, entity: "QC" },
  }).catch(() => {}); // never block on notification failure

/* ── helper: find managers for a dept (for employee dispute notifications) ── */
const findManagerIds = async (department) => {
  const managers = await prisma.user.findMany({
    where: { role: { in: ["MANAGER", "HR", "ADMIN"] }, ...(department ? { department } : {}) },
    select: { id: true },
  });
  return managers.map(m => m.id);
};

/* ============================================================
   CREATE SESSION   POST /api/qc/sessions
   Body: { gameDate, gameName, gameId?, sport, league, qcType,
           employees: [{employeeId, fromTime, toTime}],
           errors: [{timestamp, errorText, employeeId}] }
============================================================ */
export const createSession = async (req, res) => {
  try {
    const managerId = req.user.id;
    const { gameDate, gameName, gameId, sport, league, qcType, employees, errors } = req.body;

    if (!gameDate || !gameName || !sport || !league || !qcType)
      return res.status(400).json({ msg: "gameDate, gameName, sport, league, qcType are required" });
    if (!Array.isArray(employees) || employees.length === 0)
      return res.status(400).json({ msg: "At least one employee required" });
    if (!Array.isArray(errors) || errors.length === 0)
      return res.status(400).json({ msg: "No errors to save" });

    const session = await prisma.qCSession.create({
      data: {
        managerId,
        gameDate: new Date(gameDate),
        gameName,
        gameId:   gameId || null,
        sport,
        league,
        qcType,
        employees: {
          create: employees.map(e => ({
            employeeId: parseInt(e.employeeId),
            fromTime:   e.fromTime,
            toTime:     e.toTime,
          })),
        },
        errors: {
          create: errors
            .filter(e => e.employeeId)
            .map(e => ({
              employeeId: parseInt(e.employeeId),
              timestamp:  e.timestamp,
              errorText:  e.errorText,
            })),
        },
      },
      include: { employees: true, errors: true },
    });

    /* notify each employee about their errors */
    const byEmp = {};
    session.errors.forEach(e => {
      if (!byEmp[e.employeeId]) byEmp[e.employeeId] = 0;
      byEmp[e.employeeId]++;
    });
    await Promise.all(
      Object.entries(byEmp).map(([empId, count]) =>
        notify(
          parseInt(empId),
          "QC Errors Logged",
          `${count} error${count > 1 ? "s" : ""} were logged for you in "${gameName}" by your manager.`,
          "QC_ERROR_LOGGED",
          session.id
        )
      )
    );

    res.status(201).json({ msg: "Session created", session });
  } catch (err) {
    console.error("createSession:", err);
    res.status(500).json({ msg: "Failed to create session" });
  }
};

/* ============================================================
   GET SESSIONS   GET /api/qc/sessions
   Manager: their sessions. Admin/HR: all.
============================================================ */
export const getSessions = async (req, res) => {
  try {
    const { sport, qcType, from, to, page = 1 } = req.query;
    const limit = 20;
    const skip  = (parseInt(page) - 1) * limit;

    const where = {};
    if (req.user.role === "MANAGER") where.managerId = req.user.id;
    if (sport)   where.sport  = sport;
    if (qcType)  where.qcType = qcType;
    if (from || to) {
      where.gameDate = {};
      if (from) where.gameDate.gte = new Date(from);
      if (to)   where.gameDate.lte = new Date(to + "T23:59:59");
    }

    const [sessions, total] = await Promise.all([
      prisma.qCSession.findMany({
        where,
        include: {
          manager:   { select: { id: true, name: true } },
          employees: { include: { employee: { select: { id: true, name: true, department: true } } } },
          _count:    { select: { errors: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.qCSession.count({ where }),
    ]);

    res.json({ sessions, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error("getSessions:", err);
    res.status(500).json({ msg: "Failed to fetch sessions" });
  }
};

/* ============================================================
   GET SESSION DETAIL   GET /api/qc/sessions/:id
============================================================ */
export const getSessionDetail = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const session = await prisma.qCSession.findUnique({
      where: { id },
      include: {
        manager:   { select: { id: true, name: true } },
        employees: { include: { employee: { select: { id: true, name: true, department: true } } } },
        errors: {
          include: {
            employee: { select: { id: true, name: true } },
            disputes: { include: { employee: { select: { id: true, name: true } } }, orderBy: { createdAt: "desc" } },
          },
          orderBy: { timestamp: "asc" },
        },
      },
    });
    if (!session) return res.status(404).json({ msg: "Session not found" });
    res.json(session);
  } catch (err) {
    console.error("getSessionDetail:", err);
    res.status(500).json({ msg: "Failed to fetch session" });
  }
};

/* ============================================================
   GET ALL ERRORS   GET /api/qc/errors
   Admin / HR / Manager — filterable
============================================================ */
export const getAllErrors = async (req, res) => {
  try {
    const { employeeId, sport, status, from, to, search } = req.query;

    const where = {};
    if (req.user.role === "MANAGER") {
      /* MANAGER: only sessions they created */
      const mySessions = await prisma.qCSession.findMany({
        where: { managerId: req.user.id },
        select: { id: true },
      });
      where.sessionId = { in: mySessions.map(s => s.id) };
    }
    if (employeeId) where.employeeId = parseInt(employeeId);
    if (status)     where.status     = status;
    if (search)     where.errorText  = { contains: search, mode: "insensitive" };
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to)   where.createdAt.lte = new Date(to + "T23:59:59");
    }
    if (sport) where.session = { sport };

    const errors = await prisma.qCError.findMany({
      where,
      include: {
        employee: { select: { id: true, name: true, department: true } },
        session:  { select: { id: true, gameName: true, sport: true, league: true, qcType: true, gameDate: true } },
        disputes: { where: { status: "PENDING" }, select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    res.json(errors);
  } catch (err) {
    console.error("getAllErrors:", err);
    res.status(500).json({ msg: "Failed to fetch errors" });
  }
};

/* ============================================================
   GET MY ERRORS   GET /api/qc/my-errors
   Employee: own errors + stats
============================================================ */
export const getMyErrors = async (req, res) => {
  try {
    const employeeId = req.user.id;
    const { from, to } = req.query;

    const where = { employeeId };
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to)   where.createdAt.lte = new Date(to + "T23:59:59");
    }

    const errors = await prisma.qCError.findMany({
      where,
      include: {
        session:  { select: { gameName: true, sport: true, league: true, qcType: true, gameDate: true } },
        disputes: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
    });

    /* ── STATS ── */
    const total   = errors.length;
    const valid   = errors.filter(e => e.status === "VALID").length;
    const invalid = errors.filter(e => e.status === "INVALID").length;
    const pending = errors.filter(e => e.status === "PENDING").length;

    /* Most common error keywords */
    const wordCount = {};
    errors.forEach(e => {
      e.errorText.toLowerCase().split(/\s+/).forEach(w => {
        if (w.length > 2) wordCount[w] = (wordCount[w] || 0) + 1;
      });
    });
    const topErrors = Object.entries(wordCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word, count]) => ({ word, count }));

    /* Daily counts last 30 days */
    const now = new Date();
    const daily = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      daily[d.toISOString().split("T")[0]] = 0;
    }
    errors.forEach(e => {
      const day = e.createdAt.toISOString().split("T")[0];
      if (daily[day] !== undefined) daily[day]++;
    });

    /* Improvement suggestions based on top error words */
    const SUGGESTIONS = {
      miss:    "Work on accuracy — review footage for missed events",
      shot:    "Focus on shot detection and classification rules",
      cross:   "Review cross event marking guidelines",
      corner:  "Double-check corner detection criteria",
      foul:    "Study foul classification carefully",
      goal:    "Goal events need careful verification — high priority",
      offside: "Review offside detection rules thoroughly",
      card:    "Ensure card events are properly logged",
      penalty: "Penalty events need extra verification",
      pass:    "Review pass event accuracy standards",
    };
    const suggestions = topErrors
      .map(({ word }) => SUGGESTIONS[word] || `Review incidents involving "${word}" events`)
      .filter((v, i, a) => a.indexOf(v) === i)
      .slice(0, 3);

    res.json({
      errors,
      stats: { total, valid, invalid, pending },
      topErrors,
      daily,
      suggestions,
    });
  } catch (err) {
    console.error("getMyErrors:", err);
    res.status(500).json({ msg: "Failed to fetch errors" });
  }
};

/* ============================================================
   CREATE DISPUTE   POST /api/qc/disputes
   Employee disputes an error
   Body: { errorId, reason }
============================================================ */
export const createDispute = async (req, res) => {
  try {
    const employeeId = req.user.id;
    const { errorId, reason } = req.body;

    if (!errorId || !reason?.trim())
      return res.status(400).json({ msg: "errorId and reason are required" });

    /* verify error belongs to this employee */
    const error = await prisma.qCError.findUnique({
      where: { id: parseInt(errorId) },
      include: { session: { select: { managerId: true, gameName: true } } },
    });
    if (!error)                       return res.status(404).json({ msg: "Error not found" });
    if (error.employeeId !== employeeId) return res.status(403).json({ msg: "Not your error" });

    /* check no pending dispute already */
    const existing = await prisma.qCDispute.findFirst({
      where: { errorId: parseInt(errorId), status: "PENDING" },
    });
    if (existing) return res.status(409).json({ msg: "A dispute is already pending for this error" });

    const dispute = await prisma.qCDispute.create({
      data: { errorId: parseInt(errorId), employeeId, reason: reason.trim() },
    });

    /* notify manager */
    await notify(
      error.session.managerId,
      "QC Dispute Raised",
      `${req.user.name} has disputed an error in "${error.session.gameName}" at ${error.timestamp}. Reason: ${reason}`,
      "QC_DISPUTE",
      dispute.id
    );

    res.status(201).json({ msg: "Dispute submitted", dispute });
  } catch (err) {
    console.error("createDispute:", err);
    res.status(500).json({ msg: "Failed to submit dispute" });
  }
};

/* ============================================================
   GET PENDING DISPUTES   GET /api/qc/disputes
   Manager / HR / Admin
============================================================ */
export const getPendingDisputes = async (req, res) => {
  try {
    const where = { status: "PENDING" };

    if (req.user.role === "MANAGER") {
      /* only disputes for sessions this manager created */
      const mySessions = await prisma.qCSession.findMany({
        where: { managerId: req.user.id },
        select: { id: true },
      });
      where.error = { sessionId: { in: mySessions.map(s => s.id) } };
    }

    const disputes = await prisma.qCDispute.findMany({
      where,
      include: {
        employee: { select: { id: true, name: true, department: true } },
        error: {
          include: {
            session: { select: { gameName: true, sport: true, league: true, gameDate: true, managerId: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(disputes);
  } catch (err) {
    console.error("getPendingDisputes:", err);
    res.status(500).json({ msg: "Failed to fetch disputes" });
  }
};

/* ============================================================
   RESOLVE DISPUTE   PATCH /api/qc/disputes/:id
   Body: { action: "APPROVED" | "REJECTED" }
   APPROVED → mark error INVALID (remove from active errors)
   REJECTED → mark error VALID
============================================================ */
export const resolveDispute = async (req, res) => {
  try {
    const disputeId = parseInt(req.params.id);
    const { action } = req.body;

    if (!["APPROVED", "REJECTED"].includes(action))
      return res.status(400).json({ msg: "action must be APPROVED or REJECTED" });

    const dispute = await prisma.qCDispute.findUnique({
      where: { id: disputeId },
      include: {
        error:    { include: { session: { select: { gameName: true } } } },
        employee: { select: { id: true, name: true } },
      },
    });
    if (!dispute) return res.status(404).json({ msg: "Dispute not found" });
    if (dispute.status !== "PENDING") return res.status(409).json({ msg: "Dispute already resolved" });

    const newErrorStatus = action === "APPROVED" ? "INVALID" : "VALID";

    await prisma.$transaction([
      prisma.qCDispute.update({ where: { id: disputeId }, data: { status: action } }),
      prisma.qCError.update({ where: { id: dispute.errorId }, data: { status: newErrorStatus } }),
    ]);

    /* notify employee */
    const approved = action === "APPROVED";
    await notify(
      dispute.employee.id,
      approved ? "Dispute Approved — Error Removed" : "Dispute Rejected — Error Valid",
      approved
        ? `Your dispute for error "${dispute.error.errorText}" at ${dispute.error.timestamp} in "${dispute.error.session.gameName}" was approved. The error has been marked invalid.`
        : `Your dispute for error "${dispute.error.errorText}" at ${dispute.error.timestamp} in "${dispute.error.session.gameName}" was rejected. The error remains valid.`,
      "QC_DISPUTE_RESOLVED",
      dispute.error.sessionId
    );

    res.json({ msg: `Dispute ${action.toLowerCase()}`, action, newErrorStatus });
  } catch (err) {
    console.error("resolveDispute:", err);
    res.status(500).json({ msg: "Failed to resolve dispute" });
  }
};
