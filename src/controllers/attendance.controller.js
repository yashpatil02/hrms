import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const WEEK_DAYS = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];

export const markAttendance = async (req, res) => {
  try {
    const userId = req.user.id;
    const { date, checkIn, checkOut, dayType } = req.body;

    if (!date) {
      return res.status(400).json({ msg: "date required" });
    }

    /* ===== SAFE DATE (NO TZ ISSUE) ===== */
    const [year, month, day] = date.split("-").map(Number);
    const attendanceDate = new Date(year, month - 1, day);
    attendanceDate.setHours(0, 0, 0, 0);

    /* ===== USER INFO ===== */
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        weeklyOff: true,
        weekoffBalance: true,
      },
    });

    const dayName = WEEK_DAYS[attendanceDate.getDay()];
    const isWeeklyOff = user.weeklyOff === dayName;

    /* ===== EXISTING ATTENDANCE ===== */
    const existing = await prisma.attendance.findUnique({
      where: {
        userId_date: {
          userId,
          date: attendanceDate,
        },
      },
    });

    let finalDayType = dayType || "FULL";
    let weekoffBalanceChange = 0;

    /* ===== AUTO WEEKOFF ===== */
    if (isWeeklyOff && !dayType) {
      finalDayType = "WEEKOFF";
    }

    /* ===== WEEKOFF + PRESENT ===== */
    if (isWeeklyOff && dayType === "FULL") {
      finalDayType = "WEEKOFF_PRESENT";
      weekoffBalanceChange = 1;
    }

    /* ===== SAVE DATA ===== */
    const data = {
      checkIn: checkIn || null,
      checkOut: checkOut || null,
      dayType: finalDayType,
    };

    let attendance;
    if (existing) {
      attendance = await prisma.attendance.update({
        where: { id: existing.id },
        data,
      });
    } else {
      attendance = await prisma.attendance.create({
        data: {
          userId,
          date: attendanceDate,
          ...data,
        },
      });
    }

    /* ===== UPDATE WEEKOFF BALANCE ===== */
    if (weekoffBalanceChange > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          weekoffBalance: {
            increment: weekoffBalanceChange,
          },
        },
      });
    }

    res.json({
      msg: "Attendance saved successfully",
      attendance,
      weekoffBalanceChange,
    });
  } catch (error) {
    console.error("Attendance Error:", error);
    res.status(500).json({
      msg: "Attendance failed",
      error: error.message,
    });
  }
};

export const getMyAttendanceHistory = async (req, res) => {
  try {
    const history = await prisma.attendance.findMany({
      where: { userId: req.user.id },
      orderBy: { date: "desc" },
    });

    res.json(history);
  } catch (error) {
    res.status(500).json({
      msg: "Failed to fetch history",
      error: error.message,
    });
  }
};
