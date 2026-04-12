import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import prisma from "../../prisma/client.js";
import { sendInviteEmail, sendPasswordResetEmail } from "../utils/mailer.js";
import { OAuth2Client } from "google-auth-library";
import { createNotification } from "../utils/createNotification.js";

const googleClient  = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const hashPassword  = async (p) => bcrypt.hash(p, 12);
const generateToken = (user) =>
  jwt.sign({ id: user.id, role: user.role, name: user.name, email: user.email },
    process.env.JWT_SECRET, { expiresIn: "1d" });
const sanitizeUser  = (user) => { const { password: _, ...safe } = user; return safe; };

/* password must be 8+ chars, 1 uppercase, 1 lowercase, 1 number */
const validatePassword = (p) => {
  if (!p || p.length < 8)          return "Password must be at least 8 characters";
  if (!/[A-Z]/.test(p))            return "Password must contain at least one uppercase letter";
  if (!/[a-z]/.test(p))            return "Password must contain at least one lowercase letter";
  if (!/[0-9]/.test(p))            return "Password must contain at least one number";
  return null;
};

/* ================================
   LOGIN
================================ */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ msg: "Email and password required" });

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: {
        id: true, name: true, email: true, password: true,
        role: true, department: true, weeklyOff: true,
        weekoffBalance: true, phone: true, designation: true,
        joinDate: true, avatar: true,
      },
    });
    if (!user) return res.status(401).json({ msg: "Invalid email or password" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ msg: "Invalid email or password" });

    res.json({ token: generateToken(user), user: sanitizeUser(user) });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ msg: "Login failed" });
  }
};

/* ================================
   VALIDATE INVITE
================================ */
export const validateInvite = async (req, res) => {
  try {
    const invite = await prisma.userInvite.findUnique({ where: { token: req.params.token } });
    if (!invite || invite.used || invite.expiresAt < new Date())
      return res.status(400).json({ msg: "Invalid or expired invite" });
    res.json({ name: invite.name, email: invite.email, role: invite.role, department: invite.department });
  } catch (err) {
    res.status(500).json({ msg: "Invite validation failed" });
  }
};

/* ================================
   COMPLETE INVITE (password)
================================ */
export const completeInvite = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ msg: "Token and password required" });
    const pwdErr = validatePassword(password);
    if (pwdErr) return res.status(400).json({ msg: pwdErr });

    const invite = await prisma.userInvite.findUnique({ where: { token } });
    if (!invite || invite.used || invite.expiresAt < new Date())
      return res.status(400).json({ msg: "Invite invalid or expired" });

    if (await prisma.user.findUnique({ where: { email: invite.email } }))
      return res.status(400).json({ msg: "User already registered" });

    const user = await prisma.user.create({
      data: { name: invite.name, email: invite.email, password: await hashPassword(password), role: invite.role, department: invite.department },
    });
    await prisma.userInvite.update({ where: { token }, data: { used: true } });

    await createNotification({ userId: null, title: `New User Registered — ${user.name}`, message: `${user.name} (${user.email}) completed registration as ${user.role}.`, type: "SUCCESS", entity: "USER", entityId: user.id, socketEvent: "user:registered" });
    await createNotification({ userId: user.id, title: "Welcome to HRMS!", message: `Hi ${user.name}! Your account is ready. Start by marking your attendance.`, type: "SUCCESS", entity: "SYSTEM", socketEvent: "notification:new" });

    res.json({ msg: "Account created successfully", token: generateToken(user), user: sanitizeUser(user) });
  } catch (err) {
    console.error("INVITE COMPLETE ERROR:", err);
    res.status(500).json({ msg: "Registration failed" });
  }
};

/* ================================
   SEND INVITE
================================ */
export const inviteUser = async (req, res) => {
  try {
    const { name, email, role, department } = req.body;
    if (!name || !email || !role) return res.status(400).json({ msg: "Name, email and role are required" });
    if (["EMPLOYEE","MANAGER"].includes(role) && !department)
      return res.status(400).json({ msg: "Department is required for Employee and Manager roles" });
    if (req.user.role === "MANAGER" && !["EMPLOYEE","MANAGER"].includes(role))
      return res.status(403).json({ msg: "Managers can only invite Employees or other Managers" });

    // check if email already a registered user
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ msg: "A user with this email already exists" });

    await prisma.userInvite.deleteMany({ where: { email, used: false } });

    const token = crypto.randomBytes(32).toString("hex");
    await prisma.userInvite.create({
      data: { name, email, role, department, token, expiresAt: new Date(Date.now() + 24*60*60*1000) },
    });
    console.log("📨 LINK:", `${process.env.FRONTEND_URL}/invite/${token}`);
console.log("📨 Sending invite to:", email);
    await sendInviteEmail(email, name, `${process.env.FRONTEND_URL}/invite/${token}`);
    res.json({ msg: "Invite sent successfully" });
  } catch (err) {
    console.error("INVITE ERROR:", err);
    res.status(500).json({ msg: "Invite failed" });
  }
};

/* ================================
   GET PENDING INVITES
================================ */
export const getPendingInvites = async (_req, res) => {
  try {
    const invites = await prisma.userInvite.findMany({
      where: { used: false },
      orderBy: { createdAt: "desc" },
    });

    const now = new Date();
    const result = invites.map(i => ({
      ...i,
      isExpired: i.expiresAt < now,
      expiresIn: i.expiresAt > now
        ? Math.ceil((i.expiresAt - now) / (1000*60*60)) + "h"
        : "Expired",
    }));

    res.json(result);
  } catch (err) {
    console.error("GET INVITES ERROR:", err);
    res.status(500).json({ msg: "Failed to fetch invites" });
  }
};

/* ================================
   RESEND INVITE
================================ */
export const resendInvite = async (req, res) => {
  try {
    const { id } = req.params;

    console.log("RESEND ID:", id);

    const invite = await prisma.userInvite.findFirst({
      where: { id: id.trim() }
    });

    console.log("INVITE FOUND:", invite);

    if (!invite) return res.status(404).json({ msg: "Invite not found" });
    if (invite.used) return res.status(400).json({ msg: "Invite already used" });

    const token = crypto.randomBytes(32).toString("hex");

    await prisma.userInvite.update({
      where: { id: invite.id },
      data: {
        token,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

   try {
  await sendInviteEmail(
    invite.email,
    invite.name,
    `${process.env.FRONTEND_URL}/invite/${token}`
  );
} catch (e) {
  console.error("EMAIL FAILED:", e);
}

    res.json({ msg: "Invite resent successfully" });

  } catch (err) {
    console.error("RESEND INVITE ERROR:", err);
    res.status(500).json({ msg: "Failed to resend invite" });
  }
};

/* ================================
   CANCEL INVITE
================================ */
export const cancelInvite = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.userInvite.delete({ where: { id } });
    res.json({ msg: "Invite cancelled" });
  } catch (err) {
    console.error("CANCEL INVITE ERROR:", err);
    res.status(500).json({ msg: "Failed to cancel invite" });
  }
};

/* ================================
   GOOGLE INVITE SIGNUP
================================ */
export const googleInviteSignup = async (req, res) => {
  try {
    const { token, googleToken } = req.body;
    const payload = (await googleClient.verifyIdToken({ idToken: googleToken, audience: process.env.GOOGLE_CLIENT_ID })).getPayload();
    const invite  = await prisma.userInvite.findUnique({ where: { token } });
    if (!invite || invite.used || invite.expiresAt < new Date())
      return res.status(400).json({ msg: "Invalid invite" });
    if (invite.email !== payload.email)
      return res.status(400).json({ msg: "Email mismatch with invite" });

    const user = await prisma.user.create({
      data: { name: invite.name, email: payload.email, password: "GOOGLE_AUTH", role: invite.role, department: invite.department },
    });
    await prisma.userInvite.update({ where: { token }, data: { used: true } });

    await createNotification({ userId: null, title: `New User via Google — ${user.name}`, message: `${user.name} registered via Google as ${user.role}.`, type: "SUCCESS", entity: "USER", entityId: user.id, socketEvent: "user:registered" });
    await createNotification({ userId: user.id, title: "Welcome to HRMS!", message: `Hi ${user.name}! Your Google account is linked. You're all set!`, type: "SUCCESS", entity: "SYSTEM", socketEvent: "notification:new" });

    res.json({ msg: "Google signup successful", token: generateToken(user), user: sanitizeUser(user) });
  } catch (err) {
    console.error("GOOGLE SIGNUP ERROR:", err);
    res.status(500).json({ msg: "Google signup failed" });
  }
};

/* ================================
   FORGOT PASSWORD
   POST /auth/forgot-password
================================ */
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ msg: "Email is required" });

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { id: true, name: true, email: true },
    });

    /* Always return success — don't reveal if email exists */
    if (!user) return res.json({ msg: "If this email is registered, a reset link has been sent." });

    /* Invalidate any existing unused tokens */
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, used: false },
      data:  { used: true },
    });

    const token    = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await prisma.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt },
    });

    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${token}`;
    await sendPasswordResetEmail(user.email, { name: user.name, resetLink });

    res.json({ msg: "If this email is registered, a reset link has been sent." });
  } catch (err) {
    console.error("forgotPassword error:", err);
    res.status(500).json({ msg: "Failed to process request" });
  }
};

/* ================================
   RESET PASSWORD
   POST /auth/reset-password
================================ */
export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ msg: "Token and password required" });

    const pwdErr = validatePassword(password);
    if (pwdErr) return res.status(400).json({ msg: pwdErr });

    const record = await prisma.passwordResetToken.findUnique({ where: { token } });

    if (!record || record.used)
      return res.status(400).json({ msg: "Reset link is invalid or has already been used" });
    if (record.expiresAt < new Date())
      return res.status(400).json({ msg: "Reset link has expired. Please request a new one." });

    await prisma.user.update({
      where: { id: record.userId },
      data:  { password: await hashPassword(password) },
    });

    await prisma.passwordResetToken.update({
      where: { id: record.id },
      data:  { used: true },
    });

    res.json({ msg: "Password reset successfully. You can now log in." });
  } catch (err) {
    console.error("resetPassword error:", err);
    res.status(500).json({ msg: "Password reset failed" });
  }
};