import express from "express";
import {
  login,
  validateInvite,
  completeInvite,
  inviteUser,
  googleInviteSignup,
} from "../controllers/auth.controller.js";

import authMiddleware from "../middlewares/auth.middleware.js";
import role from "../middlewares/role.middleware.js";

const router = express.Router();

// LOGIN
router.post("/login", login);

// VERIFY TOKEN
router.get("/me", authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

// ADMIN → INVITE USER
router.post(
  "/invite-user",
  authMiddleware,
  role(["ADMIN"]),
  inviteUser
);

// INVITE FLOW
router.get("/invite/:token", validateInvite);
router.post("/complete-invite", completeInvite);
router.post("/google-invite", googleInviteSignup);

export default router;
