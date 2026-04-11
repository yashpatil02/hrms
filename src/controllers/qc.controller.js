import prisma from "../../prisma/client.js";
import { logAudit } from "../services/audit.service.js";

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
    const {
      gameDate, gameName, gameId, sport, league, qcType,
      employees: empList,
      errors: errList,
    } = req.body;

    if (!gameDate || !gameName || !sport || !league || !qcType)
      return res.status(400).json({ msg: "gameDate, gameName, sport, league, qcType are required" });
    if (!Array.isArray(empList) || empList.length === 0)
      return res.status(400).json({ msg: "At least one employee required" });
    if (!Array.isArray(errList) || errList.length === 0)
      return res.status(400).json({ msg: "No errors to save" });

    /* ── Step 1: create session ── */
    const session = await prisma.qCSession.create({
      data: {
        managerId,
        gameDate: new Date(gameDate),
        gameName,
        gameId: gameId || null,
        sport,
        league,
        qcType,
      },
    });

    /* ── Step 2: create employee time-range records ── */
    await prisma.qCSessionEmployee.createMany({
      data: empList.map(e => ({
        sessionId:  session.id,
        employeeId: parseInt(e.employeeId),
        fromTime:   e.fromTime,
        toTime:     e.toTime,
      })),
    });

    /* ── Step 3: create error records (only assigned ones) ── */
    const assignedErrors = errList.filter(e => e.employeeId);
    if (assignedErrors.length > 0) {
      await prisma.qCError.createMany({
        data: assignedErrors.map(e => ({
          sessionId:  session.id,
          employeeId: parseInt(e.employeeId),
          timestamp:  e.timestamp,
          errorText:  e.errorText,
        })),
      });
    }

    /* ── Step 4: notify employees ── */
    const byEmp = {};
    assignedErrors.forEach(e => {
      const id = parseInt(e.employeeId);
      byEmp[id] = (byEmp[id] || 0) + 1;
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

    logAudit({
      actorId: managerId, actorName: req.user.name, actorRole: req.user.role,
      action: "QC_SESSION_CREATED", entity: "QC", entityId: session.id,
      description: `Created QC session "${gameName}" (${sport} / ${league} / ${qcType}) — ${assignedErrors.length} error(s) logged`,
      metadata: { gameName, sport, league, qcType, gameDate, errorsLogged: assignedErrors.length, employees: empList.length },
    });

    res.status(201).json({ msg: "Session created", sessionId: session.id, errorsLogged: assignedErrors.length });
  } catch (err) {
    console.error("createSession error:", err.message, err.code || "");
    res.status(500).json({ msg: err.message || "Failed to create session" });
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
    const { employeeId, sport, status, from, to, search, page = 1 } = req.query;
    const limit = 50;
    const skip  = (parseInt(page) - 1) * limit;

    const where = {};
    if (req.user.role === "MANAGER") {
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

    const [errors, total] = await Promise.all([
      prisma.qCError.findMany({
        where,
        include: {
          employee: { select: { id: true, name: true, department: true } },
          session:  { select: { id: true, gameName: true, sport: true, league: true, qcType: true, gameDate: true } },
          disputes: { where: { status: "PENDING" }, select: { id: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.qCError.count({ where }),
    ]);

    res.json({ errors, total, page: parseInt(page), pages: Math.ceil(total / limit) });
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

    /* Most common full error phrases */
    const phraseCount = {};
    errors.forEach(e => {
      const phrase = e.errorText.toLowerCase().trim();
      phraseCount[phrase] = (phraseCount[phrase] || 0) + 1;
    });
    const topErrors = Object.entries(phraseCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([phrase, count]) => ({ phrase, count }));

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

    /* Improvement suggestions based on top error phrases */
    const suggestions = topErrors.slice(0, 3).map(({ phrase }) => {
      const lp = phrase.toLowerCase();
      if (lp.includes("shot"))    return `Focus on shot detection — "${phrase}" is your most common mistake. Review shot classification rules carefully.`;
      if (lp.includes("miss"))    return `Work on accuracy — "${phrase}" errors indicate missed events. Slow down and review footage twice.`;
      if (lp.includes("goal"))    return `Goal events need extra care — "${phrase}" is high-priority. Always verify before logging.`;
      if (lp.includes("cross"))   return `Review cross event guidelines — "${phrase}" is recurring. Study the marking criteria again.`;
      if (lp.includes("corner"))  return `Double-check corner detection — "${phrase}" errors suggest criteria confusion.`;
      if (lp.includes("foul"))    return `Study foul classification — "${phrase}" is a common area. Review the rulebook.`;
      if (lp.includes("offside")) return `Review offside detection — "${phrase}" needs careful timing analysis.`;
      if (lp.includes("card"))    return `Ensure card events are logged correctly — "${phrase}" suggests a logging pattern issue.`;
      if (lp.includes("penalty")) return `Penalty events need extra verification — "${phrase}" is high-stakes.`;
      if (lp.includes("pass"))    return `Review pass event accuracy — "${phrase}" errors affect game flow tracking.`;
      return `Improve on: "${phrase}" — review this event type's guidelines with your manager.`;
    }).filter((v, i, a) => a.indexOf(v) === i).slice(0, 3);

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

    /* capture before any delete */
    const { employee, error: qcError } = dispute;

    if (action === "APPROVED") {
      /* Delete the error entirely — QCDispute cascades via FK */
      await prisma.qCError.delete({ where: { id: qcError.id } });

      await notify(
        employee.id,
        "Dispute Approved — Error Deleted",
        `Your dispute for error "${qcError.errorText}" at ${qcError.timestamp} in "${qcError.session.gameName}" was approved. The error has been permanently removed.`,
        "QC_DISPUTE_RESOLVED",
        qcError.sessionId
      );
    } else {
      /* REJECTED: keep error, mark VALID, close dispute */
      await prisma.$transaction([
        prisma.qCDispute.update({ where: { id: disputeId }, data: { status: "REJECTED" } }),
        prisma.qCError.update({ where: { id: qcError.id }, data: { status: "VALID" } }),
      ]);

      await notify(
        employee.id,
        "Dispute Rejected — Error Valid",
        `Your dispute for error "${qcError.errorText}" at ${qcError.timestamp} in "${qcError.session.gameName}" was rejected. The error remains valid.`,
        "QC_DISPUTE_RESOLVED",
        qcError.sessionId
      );
    }

    logAudit({
      actorId: req.user.id, actorName: req.user.name, actorRole: req.user.role,
      action: action === "APPROVED" ? "QC_DISPUTE_APPROVED" : "QC_DISPUTE_REJECTED",
      entity: "QC", entityId: qcError.sessionId,
      description: `${action === "APPROVED" ? "Approved" : "Rejected"} dispute for error "${qcError.errorText}" at ${qcError.timestamp} in "${qcError.session.gameName}" — ${action === "APPROVED" ? "error deleted" : "error kept valid"}`,
      targetUserId: employee.id, targetUserName: employee.name,
      metadata: { errorText: qcError.errorText, timestamp: qcError.timestamp, action },
    });

    res.json({ msg: `Dispute ${action.toLowerCase()}`, action });
  } catch (err) {
    console.error("resolveDispute:", err);
    res.status(500).json({ msg: "Failed to resolve dispute" });
  }
};
