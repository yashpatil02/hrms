import prisma from "../../prisma/client.js";
import { io } from "../../server.js";

/**
 * createNotification
 * ------------------
 * Central utility — call this from ANY controller to
 * persist + emit a real-time notification.
 *
 * @param {object} opts
 * @param {number|null} opts.userId      — null = send to ALL admins room
 * @param {string}      opts.title
 * @param {string}      opts.message
 * @param {string}      opts.type        — INFO | SUCCESS | ERROR | WARNING
 * @param {string|null} opts.entity      — LEAVE | ATTENDANCE | ANALYST | DOCUMENT | USER | SYSTEM
 * @param {number|null} opts.entityId
 * @param {string|null} opts.socketEvent — socket event name to emit
 */
export const createNotification = async ({
  userId      = null,
  title,
  message,
  type        = "INFO",
  entity      = null,
  entityId    = null,
  socketEvent = null,
}) => {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
        entity,
        entityId: entityId ? Number(entityId) : null,
      },
    });

    /* emit real-time via socket */
    if (socketEvent && io) {
      if (userId) {
        io.to(`user_${userId}`).emit(socketEvent, notification);
      } else {
        io.to("admins").emit(socketEvent, notification);
      }
    }

    return notification;
  } catch (err) {
    /* never crash the caller — just log */
    console.error("createNotification error:", err.message);
    return null;
  }
};