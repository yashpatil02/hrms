import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * =====================================
 * DAILY SHIFT ATTENDANCE (BY DATE + SHIFT)
 * =====================================
 */
export const getShiftAttendanceByDateAndShift = async (req, res) => {
  try {
    const { date, shift } = req.query;

    if (!date || !shift) {
      return res.status(400).json({
        msg: "Date and shift are required",
      });
    }

    const selectedDate = new Date(date);
    selectedDate.setHours(0, 0, 0, 0);

    const records = await prisma.shiftAttendance.findMany({
      where: {
        date: selectedDate,
        shift,
      },
      include: {
        analyst: {
          select: {
            id: true,
            name: true,
            department: true,
          },
        },
      },
    });

    res.json(
      records.map((r) => ({
        analystId: r.analystId,
        status: r.status,
      }))
    );
  } catch (error) {
    console.error("Daily shift attendance error:", error);
    res.status(500).json({
      msg: "Failed to load shift attendance",
      error: error.message,
    });
  }
};

/**
 * =====================================
 * MONTHLY SHIFT ATTENDANCE MATRIX
 * =====================================
 */
export const getMonthlyShiftAttendance = async (req, res) => {
  try {
    const { month, year, department } = req.query;

    if (!month || !year) {
      return res.status(400).json({
        msg: "Month and year are required",
      });
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    endDate.setHours(23, 59, 59, 999);

    const analystWhere = {};
    if (department) {
      analystWhere.department = department;
    }

    const analysts = await prisma.analyst.findMany({
      where: analystWhere,
      include: {
        shiftAttendances: {
          where: {
            date: {
              gte: startDate,
              lte: endDate,
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const response = analysts.map((a) => {
      const attendanceMap = {};

      a.shiftAttendances.forEach((att) => {
        const day = new Date(att.date).getDate();

        const SHORT = {
          PRESENT: "P",
          ABSENT: "A",
          HALF_DAY: "H",
          PAID_LEAVE: "PL",
        };

        attendanceMap[day] = SHORT[att.status];
      });

      return {
        analystId: a.id,
        name: a.name,
        department: a.department,
        attendance: attendanceMap,
      };
    });

    res.json(response);
  } catch (error) {
    console.error("Monthly attendance error:", error);
    res.status(500).json({
      msg: "Failed to load monthly attendance",
      error: error.message,
    });
  }
};

/**
 * =====================================
 * SAVE / UPDATE SHIFT ATTENDANCE
 * =====================================
 */
export const saveShiftAttendance = async (req, res) => {
  try {
    const { date, shift, records } = req.body;
    const adminId = req.user.id;

    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    const operations = [];

    for (const r of records) {
      const existing = await prisma.shiftAttendance.findUnique({
        where: {
          analystId_date: {
            analystId: r.analystId,
            date: attendanceDate,
          },
        },
      });

      // CREATE
      if (!existing) {
        operations.push(
          prisma.shiftAttendance.create({
            data: {
              analystId: r.analystId,
              date: attendanceDate,
              shift,
              status: r.status,
            },
          })
        );

        operations.push(
          prisma.attendanceAudit.create({
            data: {
              adminId,
              analystId: r.analystId,
              date: attendanceDate,
              shift,
              newStatus: r.status,
              action: "CREATE",
            },
          })
        );
        continue;
      }

      // UPDATE
      if (existing.status !== r.status) {
        operations.push(
          prisma.shiftAttendance.update({
            where: { id: existing.id },
            data: {
              status: r.status,
              shift,
            },
          })
        );

        operations.push(
          prisma.attendanceAudit.create({
            data: {
              adminId,
              analystId: r.analystId,
              date: attendanceDate,
              shift,
              oldStatus: existing.status,
              newStatus: r.status,
              action: "UPDATE",
            },
          })
        );
      }
    }

    if (operations.length === 0) {
      return res.json({ msg: "No changes detected" });
    }

    await prisma.$transaction(operations);

    res.json({
      msg: "Attendance saved successfully",
      changedCount: operations.length,
    });
  } catch (error) {
    console.error("Audit save error:", error);
    res.status(500).json({
      msg: "Failed to save attendance",
      error: error.message,
    });
  }
};

/**
 * =====================================
 * ATTENDANCE AUDIT LOGS
 * =====================================
 */
export const getAttendanceAudit = async (req, res) => {
  try {
    const { action, fromDate, toDate, search } = req.query;

    const where = {};

    if (action && action !== "ALL") {
      where.action = action;
    }

    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = new Date(fromDate);
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    if (search) {
      where.OR = [
        {
          analyst: {
            name: { contains: search, mode: "insensitive" },
          },
        },
        {
          admin: {
            name: { contains: search, mode: "insensitive" },
          },
        },
      ];
    }

    const logs = await prisma.attendanceAudit.findMany({
      where,
      include: {
        analyst: { select: { name: true } },
        admin: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(logs);
  } catch (error) {
    console.error("Audit error:", error);
    res.status(500).json({
      msg: "Failed to fetch audit logs",
      error: error.message,
    });
  }
};
