import prisma from "../../prisma/client.js";
import bcrypt from "bcrypt";

// GET /api/profile/me
export const getMyProfile = async (req, res) => {
  try {
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

    if (!user) return res.status(404).json({ message: "User not found" });

    // Extended fields — added via ALTER TABLE, may not exist in older DBs
    let extendedFields = {};
    try {
      const ext = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          dateOfBirth: true, gender: true, bloodGroup: true,
          address: true, city: true, state: true, pincode: true,
          emergencyName: true, emergencyPhone: true, emergencyRel: true,
          bankName: true, bankAccount: true, bankIFSC: true, bankHolder: true,
          employeeCode: true, panNumber: true,
        },
      });
      if (ext) extendedFields = ext;
    } catch (e) {
      console.warn("getMyProfile: extended fields not available:", e.message);
    }

    res.json({ ...user, ...extendedFields });
  } catch (err) {
    console.error("getMyProfile:", err);
    res.status(500).json({ message: "Failed to fetch profile" });
  }
};

// PUT /api/profile/me
export const updateMyProfile = async (req, res) => {
  try {
    const {
      name, phone, designation, avatar,
      dateOfBirth, gender, bloodGroup,
      address, city, state, pincode,
      emergencyName, emergencyPhone, emergencyRel,
      bankName, bankAccount, bankIFSC, bankHolder,
    } = req.body;

    // Base fields — existed in original schema, always safe
    const baseData = {};
    if (name?.trim())              baseData.name        = name.trim();
    if (phone !== undefined)       baseData.phone       = phone?.trim() || null;
    if (designation !== undefined) baseData.designation = designation?.trim() || null;
    if (avatar !== undefined)      baseData.avatar      = avatar || null;

    // Extended fields — added via ALTER TABLE, may not exist in older DBs
    const extData = {};
    if (dateOfBirth !== undefined)    extData.dateOfBirth    = dateOfBirth ? new Date(dateOfBirth) : null;
    if (gender !== undefined)         extData.gender         = gender || null;
    if (bloodGroup !== undefined)     extData.bloodGroup     = bloodGroup || null;
    if (address !== undefined)        extData.address        = address || null;
    if (city !== undefined)           extData.city           = city || null;
    if (state !== undefined)          extData.state          = state || null;
    if (pincode !== undefined)        extData.pincode        = pincode || null;
    if (emergencyName !== undefined)  extData.emergencyName  = emergencyName || null;
    if (emergencyPhone !== undefined) extData.emergencyPhone = emergencyPhone || null;
    if (emergencyRel !== undefined)   extData.emergencyRel   = emergencyRel || null;
    if (bankName !== undefined)       extData.bankName       = bankName || null;
    if (bankAccount !== undefined)    extData.bankAccount    = bankAccount || null;
    if (bankIFSC !== undefined)       extData.bankIFSC       = bankIFSC || null;
    if (bankHolder !== undefined)     extData.bankHolder     = bankHolder || null;

    const safeSelect = {
      id: true, name: true, email: true, role: true,
      phone: true, department: true, designation: true,
      joinDate: true, avatar: true, weeklyOff: true,
    };

    // Update base fields via Prisma ORM (columns always exist)
    let user;
    if (Object.keys(baseData).length > 0) {
      user = await prisma.user.update({ where: { id: req.user.id }, data: baseData, select: safeSelect });
    } else {
      user = await prisma.user.findUnique({ where: { id: req.user.id }, select: safeSelect });
    }

    // Update extended fields via raw SQL — bypasses Prisma schema validation entirely
    if (Object.keys(extData).length > 0) {
      try {
        const entries = Object.entries(extData);
        const setParts = entries.map(([k], i) => `"${k}" = $${i + 1}`).join(", ");
        const vals = [...entries.map(([, v]) => v), req.user.id];
        await prisma.$executeRawUnsafe(
          `UPDATE "User" SET ${setParts} WHERE "id" = $${vals.length}`,
          ...vals
        );
      } catch (e) {
        console.warn("updateMyProfile: extended fields skipped (columns may not exist yet):", e.message);
      }
    }

    res.json({ message: "Profile updated", user });
  } catch (err) {
    console.error("updateMyProfile:", err.message);
    res.status(500).json({ message: err.message || "Failed to update profile" });
  }
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
