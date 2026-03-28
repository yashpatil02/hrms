import express from "express";
import bcrypt from "bcrypt";
import {
  login,
  validateInvite,
  completeInvite,
  inviteUser,
  googleInviteSignup,
  getPendingInvites,
  resendInvite,
  cancelInvite,
} from "../controllers/auth.controller.js";

import authMiddleware from "../middlewares/auth.middleware.js";
import role from "../middlewares/role.middleware.js";

const router = express.Router();

// LOGIN
router.post("/login", login);

// TEMP ROUTE
router.get("/create-admin", async (req, res) => {
  try {
    const hash = await bcrypt.hash("Admin@1912", 10);

    const user = await prisma.user.create({
      data: {
        name: "Super Admin",
        email: "admin@hrms.com",
        password: hash,
        role: "ADMIN",
      },
    });

    res.json({ msg: "Admin created", user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Error creating admin" });
  }
});

// VERIFY TOKEN
router.get("/me", authMiddleware, (req, res) => res.json({ user: req.user }));

// ADMIN → INVITE USER
router.post("/invite-user",   authMiddleware, role(["ADMIN"]), inviteUser);

// ADMIN → PENDING INVITES LIST
router.get("/invites",        authMiddleware, role(["ADMIN"]), getPendingInvites);

// ADMIN → RESEND INVITE
router.post("/invites/:id/resend", authMiddleware, role(["ADMIN"]), resendInvite);

// ADMIN → CANCEL INVITE
router.delete("/invites/:id", authMiddleware, role(["ADMIN"]), cancelInvite);

// INVITE FLOW (public)
router.get("/invite/:token",  validateInvite);
router.post("/complete-invite", completeInvite);
router.post("/google-invite", googleInviteSignup);

export default router;