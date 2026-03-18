import { io } from "../../server.js";

export const notifyUser = (userId, event, data) => {
  io.to(`user_${userId}`).emit(event, data);
};

export const notifyAdmins = (event, data) => {
  io.to("admins").emit(event, data);
};

