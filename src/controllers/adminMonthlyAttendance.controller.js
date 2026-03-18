const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.getMonthlyAttendanceSummary = async (req, res) => {
  try {
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({
        msg: "Month and year are required",
      });
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    // Fetch attendance with user info
    const attendance = await prisma.attendance.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Total days in month
    const totalDaysInMonth = new Date(year, month, 0).getDate();

    const summaryMap = {};

    attendance.forEach((record) => {
      const userId = record.user.id;

      if (!summaryMap[userId]) {
        summaryMap[userId] = {
          userId,
          name: record.user.name,
          email: record.user.email,
          presentDays: 0,
          fullDays: 0,
          halfDays: 0,
          absentDays: totalDaysInMonth,
        };
      }

      summaryMap[userId].presentDays += 1;

      if (record.dayType === "FULL") {
        summaryMap[userId].fullDays += 1;
      } else if (record.dayType === "HALF") {
        summaryMap[userId].halfDays += 1;
      }

      summaryMap[userId].absentDays -= 1;
    });

    res.json(Object.values(summaryMap));
  } catch (error) {
    res.status(500).json({
      msg: "Failed to generate monthly summary",
      error: error.message,
    });
  }
};
