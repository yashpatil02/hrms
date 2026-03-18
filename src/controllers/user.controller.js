import prisma from "../../prisma/client.js";

// =========================
// GET USERS (ADMIN / HR)
// =========================
export const getUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        weeklyOff: true,
      },
    });

    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Failed to fetch users" });
  }
};

// =========================
// DELETE USER (ADMIN ONLY)
// =========================
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.user.delete({
      where: { id },
    });

    res.json({ msg: "User deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Failed to delete user" });
  }
};

// =========================
// UPDATE WEEKLY OFF (EMPLOYEE)
// =========================
export const updateWeeklyOff = async (req, res) => {
  try {
    const userId = req.user.id;
    const { weeklyOff } = req.body;

    if (!weeklyOff) {
      return res.status(400).json({ msg: "weeklyOff required" });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { weeklyOff },
    });

    res.json({
      msg: "Weekly off updated",
      weeklyOff: user.weeklyOff,
    });
  } catch (err) {
    res.status(500).json({ msg: "Failed to update weekly off" });
  }
};