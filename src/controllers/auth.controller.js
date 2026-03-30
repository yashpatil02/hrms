import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import prisma from "../../prisma/client.js";
import { sendInviteEmail } from "../utils/mailer.js";
import { OAuth2Client } from "google-auth-library";
import { createNotification } from "../utils/createNotification.js";

const googleClient  = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const hashPassword  = async (p) => bcrypt.hash(p, 10);

const generateToken = (user) =>
  jwt.sign(
    { id: user.id, role: user.role, name: user.name, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

const sanitizeUser  = (user) => {
  const { password: _, ...safe } = user;
  return safe;
};

/* ================================
   LOGIN
================================ */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log("📩 EMAIL:", email);

    const user = await prisma.user.findUnique({ where: { email } });
    console.log("👤 USER FROM DB:", user);

    if (!user) {
      console.log("❌ USER NOT FOUND");
      return res.status(401).json({ msg: "Invalid email or password" });
    }

    const match = await bcrypt.compare(password, user.password);
    console.log("🔑 PASSWORD MATCH:", match);

    if (!match) {
      console.log("❌ PASSWORD WRONG");
      return res.status(401).json({ msg: "Invalid email or password" });
    }

    res.json({ token: generateToken(user), user: sanitizeUser(user) });

  } catch (err) {
    console.error("LOGIN ERROR:", err);
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

    res.json({
      name: invite.name,
      email: invite.email,
      role: invite.role,
      department: invite.department
    });

  } catch (err) {
    res.status(500).json({ msg: "Invite validation failed" });
  }
};

/* ================================
   COMPLETE INVITE
================================ */
export const completeInvite = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password)
      return res.status(400).json({ msg: "Token and password required" });

    if (password.length < 6)
      return res.status(400).json({ msg: "Password must be at least 6 characters" });

    const invite = await prisma.userInvite.findUnique({ where: { token } });

    if (!invite || invite.used || invite.expiresAt < new Date())
      return res.status(400).json({ msg: "Invite invalid or expired" });

    if (await prisma.user.findUnique({ where: { email: invite.email } }))
      return res.status(400).json({ msg: "User already registered" });

    const user = await prisma.user.create({
      data: {
        name: invite.name,
        email: invite.email,
        password: await hashPassword(password),
        role: invite.role,
        department: invite.department
      },
    });

    await prisma.userInvite.update({
      where: { token },
      data: { used: true }
    });

    await createNotification({
      userId: null,
      title: `New User Registered — ${user.name}`,
      message: `${user.name} (${user.email}) completed registration`,
      type: "SUCCESS",
      entity: "USER",
      entityId: user.id,
      socketEvent: "user:registered"
    });

    res.json({
      msg: "Account created successfully",
      token: generateToken(user),
      user: sanitizeUser(user)
    });

  } catch (err) {
    console.error("INVITE COMPLETE ERROR:", err);
    res.status(500).json({ msg: "Registration failed" });
  }
};

/* ================================
   SEND INVITE (FIXED 🔥)
================================ */
export const inviteUser = async (req, res) => {
  try {
    const { name, email, role, department } = req.body;

    if (!name || !email || !role)
      return res.status(400).json({ msg: "Name, email and role are required" });

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser)
      return res.status(400).json({ msg: "User already exists" });

    await prisma.userInvite.deleteMany({ where: { email, used: false } });

    const token = crypto.randomBytes(32).toString("hex");

    await prisma.userInvite.create({
      data: {
        name,
        email,
        role,
        department,
        token,
        expiresAt: new Date(Date.now() + 24*60*60*1000)
      },
    });

    console.log("📧 Sending invite email...");

    try {
      await sendInviteEmail(
        email,
        name,
        `${process.env.FRONTEND_URL}/invite/${token}`
      );
      console.log("✅ Invite email sent");
    } catch (e) {
      console.error("❌ EMAIL FAILED:", e);
    }

    res.json({ msg: "Invite sent successfully" });

  } catch (err) {
    console.error("INVITE ERROR:", err);
    res.status(500).json({ msg: "Invite failed" });
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
      console.log("✅ Resend email sent");
    } catch (e) {
      console.error("❌ EMAIL FAILED:", e);
    }

    res.json({ msg: "Invite resent successfully" });

  } catch (err) {
    console.error("RESEND INVITE ERROR:", err);
    res.status(500).json({ msg: "Failed to resend invite" });
  }
};

export const cancelInvite = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.userInvite.delete({
      where: { id }
    });

    res.json({ msg: "Invite cancelled successfully" });

  } catch (err) {
    console.error("CANCEL INVITE ERROR:", err);
    res.status(500).json({ msg: "Failed to cancel invite" });
  }
};