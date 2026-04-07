import express from "express";
import {
  login,
  validateInvite,
  completeInvite,
  inviteUser,
  googleInviteSignup,
  getPendingInvites,
  resendInvite,
  cancelInvite,
  forgotPassword,
  resetPassword,
} from "../controllers/auth.controller.js";

import authMiddleware from "../middlewares/auth.middleware.js";
import role from "../middlewares/role.middleware.js";

const router = express.Router();

// LOGIN
router.post("/login", login);

// VERIFY TOKEN
router.get("/me", authMiddleware, (req, res) => res.json({ user: req.user }));

// FORGOT / RESET PASSWORD (public)
router.post("/forgot-password", forgotPassword);
router.post("/reset-password",  resetPassword);

// ADMIN → INVITE USER
router.post("/invite-user",        authMiddleware, role(["ADMIN"]), inviteUser);
router.get("/invites",             authMiddleware, role(["ADMIN"]), getPendingInvites);
router.post("/invites/:id/resend", authMiddleware, role(["ADMIN"]), resendInvite);
router.delete("/invites/:id",      authMiddleware, role(["ADMIN"]), cancelInvite);

// INVITE FLOW (public)
router.get("/invite/:token",    validateInvite);
router.post("/complete-invite", completeInvite);
router.post("/google-invite",   googleInviteSignup);

export default router;
