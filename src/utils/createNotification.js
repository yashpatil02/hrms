import { PrismaClient } from "@prisma/client";
import { io } from "../../server.js";

const prisma = new PrismaClient();

export const createNotification = async ({
  userId = null,
  title,
  message,
  type = "INFO",
  entity = null,
  entityId = null,
  socketEvent,
}) => {
  const notification = await prisma.notification.create({
    data: {
      userId,
      title,
      message,
      type,
      entity,
      entityId,
    },
  });

  if (socketEvent) {
    if (userId) {
      io.to(`user_${userId}`).emit(socketEvent, notification);
    } else {
      io.to("admins").emit(socketEvent, notification);
    }
  }

  return notification;
};
