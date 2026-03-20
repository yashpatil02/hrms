import prisma from "../../prisma/client.js";
import { createNotification } from "../utils/createNotification.js";

/* ================================
   ADD ANALYST
================================ */
export const addAnalyst = async (req, res) => {
  try {
    const { name, department, shift } = req.body;

    const analyst = await prisma.analyst.create({
      data: { name, department, shift },
    });

    /* notify admins */
    await createNotification({
      userId:      null,
      title:       `New Analyst Added — ${name}`,
      message:     `${name} has been added to the ${department} department (${shift} shift).`,
      type:        "SUCCESS",
      entity:      "ANALYST",
      entityId:    analyst.id,
      socketEvent: "analyst:added",
    });

    res.json(analyst);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Failed to add analyst" });
  }
};

/* ================================
   GET ACTIVE ANALYSTS
================================ */
export const getAnalysts = async (req, res) => {
  try {
    const list = await prisma.analyst.findMany({
      where:   { isActive: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Failed to fetch analysts" });
  }
};

/* ================================
   GET TERMINATED ANALYSTS
================================ */
export const getTerminatedAnalysts = async (req, res) => {
  try {
    const list = await prisma.analyst.findMany({
      where:   { isActive: false },
      orderBy: { terminatedAt: "desc" },
    });
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Failed to fetch terminated analysts" });
  }
};

/* ================================
   TERMINATE ANALYST
================================ */
export const terminateAnalyst = async (req, res) => {
  try {
    if (!req.user?.id) return res.status(401).json({ msg: "Unauthorized" });

    const { reason } = req.body;
    const id         = Number(req.params.id);

    const analyst = await prisma.analyst.findUnique({ where: { id } });
    if (!analyst) return res.status(404).json({ msg: "Analyst not found" });

    await prisma.analyst.update({
      where: { id },
      data: {
        isActive:          false,
        terminatedAt:      new Date(),
        terminationReason: reason || "Not specified",
        terminatedById:    req.user.id,
        terminatedByName:  req.user.name || "Admin",
      },
    });

    /* notify admins */
    await createNotification({
      userId:      null,
      title:       `Analyst Terminated — ${analyst.name}`,
      message:     `${analyst.name} (${analyst.department}) has been terminated by ${req.user.name || "Admin"}. Reason: ${reason || "Not specified"}.`,
      type:        "ERROR",
      entity:      "ANALYST",
      entityId:    id,
      socketEvent: "analyst:terminated",
    });

    res.json({ msg: "Analyst terminated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Termination failed" });
  }
};

/* ================================
   RESTORE ANALYST
================================ */
export const restoreAnalyst = async (req, res) => {
  try {
    const id     = Number(req.params.id);
    const analyst = await prisma.analyst.findUnique({ where: { id } });
    if (!analyst) return res.status(404).json({ msg: "Analyst not found" });

    await prisma.analyst.update({
      where: { id },
      data: { isActive: true, terminatedAt: null, terminationReason: null },
    });

    /* notify admins */
    await createNotification({
      userId:      null,
      title:       `Analyst Restored — ${analyst.name}`,
      message:     `${analyst.name} (${analyst.department}) has been restored and is active again.`,
      type:        "SUCCESS",
      entity:      "ANALYST",
      entityId:    id,
      socketEvent: "analyst:restored",
    });

    res.json({ msg: "Analyst restored successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Restore failed" });
  }
};

/* ================================
   BULK SHIFT UPDATE
================================ */
export const bulkUpdateShift = async (req, res) => {
  try {
    const { analystIds, shift, month, year } = req.body;

    if (!analystIds?.length || !shift || !month || !year) {
      return res.status(400).json({ msg: "analystIds, shift, month and year are required" });
    }

    await prisma.analyst.updateMany({
      where: { id: { in: analystIds.map(Number) } },
      data:  { shift },
    });

    const historyData = analystIds.map(id => ({
      analystId: Number(id), shift, month, year,
    }));

    await prisma.analystShiftHistory.createMany({ data: historyData, skipDuplicates: true });

    /* notify admins */
    await createNotification({
      userId:      null,
      title:       `Bulk Shift Update — ${shift}`,
      message:     `${analystIds.length} analyst(s) have been moved to ${shift} shift for ${month}/${year}.`,
      type:        "INFO",
      entity:      "ANALYST",
      socketEvent: "analyst:shift_updated",
    });

    res.json({ msg: "Shift updated & history saved", count: analystIds.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Bulk shift update failed" });
  }
};

/* ================================
   SHIFT HISTORY
================================ */
export const getShiftHistory = async (req, res) => {
  try {
    const analystId = Number(req.params.id);
    const history   = await prisma.analystShiftHistory.findMany({
      where:   { analystId },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });
    res.json(history);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Failed to fetch shift history" });
  }
};