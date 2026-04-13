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

    const data = {};
    if (name?.trim())              data.name        = name.trim();
    if (phone !== undefined)       data.phone       = phone?.trim() || null;
    if (designation !== undefined) data.designation = designation?.trim() || null;
    if (avatar !== undefined)      data.avatar      = avatar || null;

    // Extended fields — only set if the column is expected to exist (after setup.js runs)
    if (dateOfBirth !== undefined)    data.dateOfBirth    = dateOfBirth ? new Date(dateOfBirth) : null;
    if (gender !== undefined)         data.gender         = gender || null;
    if (bloodGroup !== undefined)     data.bloodGroup     = bloodGroup || null;
    if (address !== undefined)        data.address        = address || null;
    if (city !== undefined)           data.city           = city || null;
    if (state !== undefined)          data.state          = state || null;
    if (pincode !== undefined)        data.pincode        = pincode || null;
    if (emergencyName !== undefined)  data.emergencyName  = emergencyName || null;
    if (emergencyPhone !== undefined) data.emergencyPhone = emergencyPhone || null;
    if (emergencyRel !== undefined)   data.emergencyRel   = emergencyRel || null;
    if (bankName !== undefined)       data.bankName       = bankName || null;
    if (bankAccount !== undefined)    data.bankAccount    = bankAccount || null;
    if (bankIFSC !== undefined)       data.bankIFSC       = bankIFSC || null;
    if (bankHolder !== undefined)     data.bankHolder     = bankHolder || null;

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
  } catch (err) {
    console.error("updateMyProfile:", err);
    res.status(500).json({ message: "Failed to update profile" });
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
