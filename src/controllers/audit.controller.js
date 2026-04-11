import prisma from "../../prisma/client.js";

/* ============================================================
   GET MANAGEMENT AUDIT TRAIL   GET /api/audit
   Admin / HR only — full trail with filters + pagination
============================================================ */
export const getManagementAudit = async (req, res) => {
  try {
    const { actorId, action, entity, from, to, search, page = 1 } = req.query;
    const limit = 50;
    const skip  = (parseInt(page) - 1) * limit;

    const where = {};
    if (actorId) where.actorId = parseInt(actorId);
    if (action)  where.action  = action;
    if (entity)  where.entity  = entity;
    if (search)  where.description = { contains: search, mode: "insensitive" };
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to)   where.createdAt.lte = new Date(to + "T23:59:59");
    }

    const [logs, total] = await Promise.all([
      prisma.managementAudit.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.managementAudit.count({ where }),
    ]);

    res.json({ logs, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error("getManagementAudit:", err);
    res.status(500).json({ msg: "Failed to fetch audit trail" });
  }
};

/* Distinct actors for filter dropdown */
export const getAuditActors = async (req, res) => {
  try {
    const actors = await prisma.managementAudit.findMany({
      select: { actorId: true, actorName: true, actorRole: true },
      distinct: ["actorId"],
      orderBy: { actorName: "asc" },
    });
    res.json(actors);
  } catch (err) {
    res.status(500).json({ msg: "Failed to fetch actors" });
  }
};
