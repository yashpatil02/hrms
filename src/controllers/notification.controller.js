import prisma from "../../prisma/client.js";

/* ================================
   GET MY NOTIFICATIONS (paginated)
================================ */
export const getMyNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const role   = req.user.role;
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(100, parseInt(req.query.limit) || 20);
    const skip   = (page - 1) * limit;

    /* admins see their own + global (userId=null) notifications */
    const where = (role === "ADMIN" || role === "HR")
      ? { OR: [{ userId }, { userId: null }] }
      : { userId };

    const [data, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where }),
    ]);

    res.json({
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      unreadCount: data.filter(n => !n.isRead).length,
    });
  } catch (err) {
    console.error("getMyNotifications error:", err);
    res.status(500).json({ msg: "Failed to fetch notifications" });
  }
};

/* ================================
   MARK SINGLE AS READ
================================ */
export const markAsRead = async (req, res) => {
  try {
    const id     = parseInt(req.params.id);
    const userId = req.user.id;

    await prisma.notification.updateMany({
      where: {
        id,
        OR: [{ userId }, { userId: null }],
      },
      data: { isRead: true },
    });

    res.json({ msg: "Marked as read" });
  } catch (err) {
    console.error("markAsRead error:", err);
    res.status(500).json({ msg: "Failed to mark as read" });
  }
};

/* ================================
   MARK ALL AS READ
================================ */
export const markAllRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const role   = req.user.role;

    const where = (role === "ADMIN" || role === "HR")
      ? { OR: [{ userId }, { userId: null }], isRead: false }
      : { userId, isRead: false };

    await prisma.notification.updateMany({
      where,
      data: { isRead: true },
    });

    res.json({ msg: "All marked as read" });
  } catch (err) {
    console.error("markAllRead error:", err);
    res.status(500).json({ msg: "Failed to mark all as read" });
  }
};

/* ================================
   DELETE SINGLE NOTIFICATION  ✅
================================ */
export const deleteNotification = async (req, res) => {
  try {
    const id     = parseInt(req.params.id);
    const userId = req.user.id;
    const role   = req.user.role;

    /* user can only delete their own or global notifications */
    const where = (role === "ADMIN" || role === "HR")
      ? { id, OR: [{ userId }, { userId: null }] }
      : { id, userId };

    const deleted = await prisma.notification.deleteMany({ where });

    if (deleted.count === 0) {
      return res.status(404).json({ msg: "Notification not found" });
    }

    res.json({ msg: "Notification deleted" });
  } catch (err) {
    console.error("deleteNotification error:", err);
    res.status(500).json({ msg: "Failed to delete notification" });
  }
};

/* ================================
   DELETE ALL NOTIFICATIONS  ✅
================================ */
export const deleteAllNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const role   = req.user.role;

    const where = (role === "ADMIN" || role === "HR")
      ? { OR: [{ userId }, { userId: null }] }
      : { userId };

    await prisma.notification.deleteMany({ where });

    res.json({ msg: "All notifications deleted" });
  } catch (err) {
    console.error("deleteAllNotifications error:", err);
    res.status(500).json({ msg: "Failed to delete notifications" });
  }
};