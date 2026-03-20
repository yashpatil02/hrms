import prisma from "../../prisma/client.js";
import bcrypt from "bcrypt";
import jwt    from "jsonwebtoken";

/* ============================================================
   HELPERS
============================================================ */
const generateToken = (user) =>
  jwt.sign(
    { id:user.id, role:user.role, name:user.name, email:user.email },
    process.env.JWT_SECRET,
    { expiresIn:"1d" }
  );

/* ============================================================
   GET MY PROFILE   GET /api/settings/profile
============================================================ */
export const getProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id:true, name:true, email:true, role:true,
        phone:true, department:true, designation:true,
        joinDate:true, weeklyOff:true, weekoffBalance:true,
        createdAt:true,
      },
    });
    if (!user) return res.status(404).json({ msg:"User not found" });
    res.json(user);
  } catch (err) {
    console.error("getProfile error:", err);
    res.status(500).json({ msg:"Failed to fetch profile" });
  }
};

/* ============================================================
   UPDATE PROFILE   PUT /api/settings/profile
============================================================ */
export const updateProfile = async (req, res) => {
  try {
    const { name, phone, department, designation, joinDate } = req.body;

    if (!name?.trim()) return res.status(400).json({ msg:"Name is required" });

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        name:        name.trim(),
        phone:       phone?.trim()       || null,
        department:  department?.trim()  || null,
        designation: designation?.trim() || null,
        joinDate:    joinDate ? new Date(joinDate) : null,
      },
      select: {
        id:true, name:true, email:true, role:true,
        phone:true, department:true, designation:true,
        joinDate:true,
      },
    });

    /* Re-issue token so localStorage name updates */
    const token = generateToken(updated);

    res.json({ msg:"Profile updated successfully", user:updated, token });
  } catch (err) {
    console.error("updateProfile error:", err);
    res.status(500).json({ msg:"Failed to update profile" });
  }
};

/* ============================================================
   CHANGE PASSWORD   PUT /api/settings/password
============================================================ */
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword)
      return res.status(400).json({ msg:"All fields are required" });

    if (newPassword.length < 6)
      return res.status(400).json({ msg:"Password must be at least 6 characters" });

    if (newPassword !== confirmPassword)
      return res.status(400).json({ msg:"New passwords do not match" });

    const user = await prisma.user.findUnique({ where:{ id:req.user.id } });
    if (!user) return res.status(404).json({ msg:"User not found" });

    if (user.password === "GOOGLE_AUTH")
      return res.status(400).json({ msg:"Google account — password change not allowed" });

    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) return res.status(400).json({ msg:"Current password is incorrect" });

    if (await bcrypt.compare(newPassword, user.password))
      return res.status(400).json({ msg:"New password must be different from current" });

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where:{ id:req.user.id }, data:{ password:hashed } });

    res.json({ msg:"Password changed successfully" });
  } catch (err) {
    console.error("changePassword error:", err);
    res.status(500).json({ msg:"Failed to change password" });
  }
};

/* ============================================================
   UPDATE WEEKLY OFF   PUT /api/settings/weekly-off
============================================================ */
export const updateWeeklyOff = async (req, res) => {
  try {
    const { weeklyOff } = req.body;
    const DAYS = ["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY","SUNDAY"];
    if (!DAYS.includes(weeklyOff))
      return res.status(400).json({ msg:"Invalid day selected" });

    await prisma.user.update({ where:{ id:req.user.id }, data:{ weeklyOff } });
    res.json({ msg:"Weekly off updated successfully", weeklyOff });
  } catch (err) {
    res.status(500).json({ msg:"Failed to update weekly off" });
  }
};

/* ============================================================
   GET SYSTEM SETTINGS   GET /api/settings/system
   ADMIN only
============================================================ */
export const getSystemSettings = async (req, res) => {
  try {
    const rows = await prisma.systemSettings.findMany({ orderBy:{ key:"asc" } });
    const settings = {};
    rows.forEach(r => { settings[r.key] = r.value; });
    res.json(settings);
  } catch (err) {
    console.error("getSystemSettings error:", err);
    res.status(500).json({ msg:"Failed to fetch system settings" });
  }
};

/* ============================================================
   UPDATE SYSTEM SETTINGS   PUT /api/settings/system
   ADMIN only
============================================================ */
export const updateSystemSettings = async (req, res) => {
  try {
    const updates = req.body; // { key: value, key2: value2 }
    if (!updates || typeof updates !== "object")
      return res.status(400).json({ msg:"Invalid data" });

    const ops = Object.entries(updates).map(([key, value]) =>
      prisma.systemSettings.upsert({
        where:  { key },
        create: { key, value: String(value) },
        update: { value: String(value) },
      })
    );
    await Promise.all(ops);
    res.json({ msg:"Settings saved successfully" });
  } catch (err) {
    console.error("updateSystemSettings error:", err);
    res.status(500).json({ msg:"Failed to save settings" });
  }
};

/* ============================================================
   GET ACCOUNT STATS   GET /api/settings/account-stats
============================================================ */
export const getAccountStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const now    = new Date();
    const yr     = now.getFullYear();

    const [totalAtt, thisMonth, totalLeaves, pendingLeaves, totalDocs] = await Promise.all([
      prisma.attendance.count({ where:{ userId } }),
      prisma.attendance.count({
        where:{
          userId,
          date:{ gte: new Date(yr, now.getMonth(), 1) },
        },
      }),
      prisma.leave.count({ where:{ userId } }),
      prisma.leave.count({ where:{ userId, status:"PENDING" } }),
      prisma.employeeDocument.count({ where:{ employeeId: userId } }),
    ]);

    /* month present rate */
    const monthAtt = await prisma.attendance.findMany({
      where:{
        userId,
        date:{
          gte: new Date(yr, now.getMonth(), 1),
          lte: new Date(yr, now.getMonth()+1, 0, 23,59,59),
        },
      },
      select:{ dayType:true },
    });
    const present  = monthAtt.filter(a=>["FULL","HALF","WEEKOFF_PRESENT"].includes(a.dayType)).length;
    const rate     = thisMonth>0 ? Math.round((present/thisMonth)*100) : 0;

    res.json({ totalAtt, thisMonth, present, rate, totalLeaves, pendingLeaves, totalDocs });
  } catch (err) {
    res.status(500).json({ msg:"Failed to fetch account stats" });
  }
};

/* ============================================================
   CLEAR MY NOTIFICATIONS   DELETE /api/settings/notifications/clear
============================================================ */
export const clearMyNotifications = async (req, res) => {
  try {
    await prisma.notification.deleteMany({ where:{ userId: req.user.id } });
    res.json({ msg:"All notifications cleared" });
  } catch (err) {
    res.status(500).json({ msg:"Failed to clear notifications" });
  }
};

/* ============================================================
   ADMIN — CLEAR ALL NOTIFICATIONS   DELETE /api/settings/notifications/clear-all
============================================================ */
export const clearAllNotifications = async (req, res) => {
  try {
    await prisma.notification.deleteMany({});
    res.json({ msg:"All notifications cleared" });
  } catch (err) {
    res.status(500).json({ msg:"Failed to clear all notifications" });
  }
};

/* ============================================================
   ADMIN — GET SYSTEM STATS   GET /api/settings/stats
============================================================ */
export const getAdminStats = async (req, res) => {
  try {
    const [users, analysts, documents, notifications, invites] = await Promise.all([
      prisma.user.count(),
      prisma.analyst.count({ where:{ isActive:true } }),
      prisma.employeeDocument.count(),
      prisma.notification.count({ where:{ isRead:false } }),
      prisma.userInvite.count({ where:{ used:false, expiresAt:{ gt:new Date() } } }),
    ]);
    res.json({ users, analysts, documents, notifications, invites });
  } catch (err) {
    res.status(500).json({ msg:"Failed to fetch admin stats" });
  }
};