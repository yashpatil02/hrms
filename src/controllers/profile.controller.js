import prisma from "../../prisma/client.js";
import bcrypt from "bcrypt";

// GET /api/profile/me
export const getMyProfile = async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true, name: true, email: true, role: true,
      phone: true, department: true, designation: true,
      joinDate: true, avatar: true, weeklyOff: true,
      weekoffBalance: true, createdAt: true,
      _count: { select: { attendances: true, leaves: true, documents: true } },
    },
  });
  res.json(user);
};

// PUT /api/profile/me
export const updateMyProfile = async (req, res) => {
  const { name, phone, designation, avatar } = req.body;

  const data = {};
  if (name?.trim())        data.name        = name.trim();
  if (phone !== undefined) data.phone       = phone?.trim() || null;
  if (designation !== undefined) data.designation = designation?.trim() || null;
  if (avatar !== undefined)      data.avatar      = avatar || null;

  const user = await prisma.user.update({
    where: { id: req.user.id },
    data,
    select: {
      id: true, name: true, email: true, role: true,
      phone: true, department: true, designation: true,
      joinDate: true, avatar: true, weeklyOff: true,
    },
  });

  res.json({ message: "Profile updated", user });
};

// PUT /api/profile/change-password
export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword)
    return res.status(400).json({ message: "currentPassword and newPassword are required" });
  if (newPassword.length < 6)
    return res.status(400).json({ message: "New password must be at least 6 characters" });

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) return res.status(400).json({ message: "Current password is incorrect" });

  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: req.user.id }, data: { password: hashed } });

  res.json({ message: "Password changed successfully" });
};
