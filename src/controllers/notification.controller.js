import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const getMyNotifications = async (req, res) => {
  const userId = req.user.id;
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 10);
  const skip = (page - 1) * limit;

  const where = {
    OR: [{ userId }, { userId: null }],
  };

  if (req.query.type) where.type = req.query.type;
  if (req.query.unread === "true") where.isRead = false;

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
    page,
    totalPages: Math.ceil(total / limit),
    total,
  });
};

export const markAsRead = async (req, res) => {
  await prisma.notification.update({
    where: { id: Number(req.params.id) },
    data: { isRead: true },
  });
  res.json({ success: true });
};

export const markAllRead = async (req, res) => {
  await prisma.notification.updateMany({
    where: {
      OR: [{ userId: req.user.id }, { userId: null }],
      isRead: false,
    },
    data: { isRead: true },
  });
  res.json({ success: true });
};
