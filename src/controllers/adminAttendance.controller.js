import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * ADMIN – Date-wise Attendance Report
 * Query params:
 *  - date (YYYY-MM-DD) [optional]
 */
export const getAttendanceReport = async (req, res) => {
  try {
    const { date } = req.query;
    let whereCondition = {};

    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);

      const end = new Date(date);
      end.setHours(23, 59, 59, 999);

      whereCondition.date = {
        gte: start,
        lte: end,
      };
    }

    const report = await prisma.attendance.findMany({
      where: whereCondition,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        date: "desc",
      },
    });

    res.json(report);
  } catch (error) {
    res.status(500).json({
      msg: "Failed to fetch attendance report",
      error: error.message,
    });
  }
};
