import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import prisma from "../../prisma/client.js";
import { sendInviteEmail } from "../utils/mailer.js";
import { OAuth2Client } from "google-auth-library";

/* ================================
   HELPERS
================================ */
const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID
);

const hashPassword = async (password) => {
  return await bcrypt.hash(password, 10);
};

const generateToken = (user) =>
  jwt.sign(
    {
      id: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

/* ================================
   LOGIN
================================ */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res
        .status(400)
        .json({ msg: "Email and password required" });

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user)
      return res
        .status(401)
        .json({ msg: "Invalid email or password" });

    if (user.password === "GOOGLE_AUTH") {
      return res
        .status(401)
        .json({ msg: "Please login using Google" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res
        .status(401)
        .json({ msg: "Invalid email or password" });

    const token = generateToken(user);
    res.json({ token, user });
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
    const { token } = req.params;

    const invite = await prisma.userInvite.findUnique({
      where: { token },
    });

    if (!invite || invite.used || invite.expiresAt < new Date()) {
      return res.status(400).json({ msg: "Invalid or expired invite" });
    }

    res.json({
      name: invite.name,
      email: invite.email,
      role: invite.role,
      department: invite.department,
    });
  } catch (err) {
    console.error("INVITE VALIDATION ERROR:", err);
    res.status(500).json({ msg: "Invite validation failed" });
  }
};

/* ================================
   COMPLETE INVITE (PASSWORD)
================================ */
export const completeInvite = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password)
      return res
        .status(400)
        .json({ msg: "Token and password required" });

    if (password.length < 6)
      return res
        .status(400)
        .json({ msg: "Password must be at least 6 characters" });

    const invite = await prisma.userInvite.findUnique({
      where: { token },
    });

    if (!invite || invite.used || invite.expiresAt < new Date())
      return res
        .status(400)
        .json({ msg: "Invite invalid or expired" });

    const existingUser = await prisma.user.findUnique({
      where: { email: invite.email },
    });

    if (existingUser)
      return res
        .status(400)
        .json({ msg: "User already registered" });

    const user = await prisma.user.create({
      data: {
        name: invite.name,
        email: invite.email,
        password: await hashPassword(password),
        role: invite.role,
        department: invite.department,
      },
    });

    await prisma.userInvite.update({
      where: { token },
      data: { used: true },
    });

    const jwtToken = generateToken(user);

    res.json({
      msg: "Account created successfully",
      token: jwtToken,
      user,
    });
  } catch (err) {
    console.error("INVITE COMPLETE ERROR:", err);
    res.status(500).json({ msg: "Registration failed" });
  }
};

/* ================================
   ADMIN → SEND INVITE
================================ */
export const inviteUser = async (req, res) => {
  try {
    const { name, email, role, department } = req.body;

    if (!name || !email || !role)
      return res.status(400).json({ msg: "Missing fields" });

    await prisma.userInvite.deleteMany({
      where: { email, used: false },
    });

    const token = crypto.randomBytes(32).toString("hex");

    await prisma.userInvite.create({
      data: {
        name,
        email,
        role,
        department,
        token,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    const inviteLink = `${process.env.FRONTEND_URL}/register?token=${token}`;

    await sendInviteEmail(email, name, inviteLink);

    res.json({ msg: "Invite sent successfully" });
  } catch (err) {
    console.error("INVITE ERROR:", err);
    res.status(500).json({ msg: "Invite failed" });
  }
};

/* ================================
   GOOGLE INVITE SIGNUP
================================ */
export const googleInviteSignup = async (req, res) => {
  try {
    const { token, googleToken } = req.body;

    const ticket = await googleClient.verifyIdToken({
      idToken: googleToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const email = payload.email;

    const invite = await prisma.userInvite.findUnique({
      where: { token },
    });

    if (!invite || invite.used || invite.expiresAt < new Date())
      return res.status(400).json({ msg: "Invalid invite" });

    if (invite.email !== email)
      return res
        .status(400)
        .json({ msg: "Email mismatch with invite" });

    const user = await prisma.user.create({
      data: {
        name: invite.name,
        email,
        password: "GOOGLE_AUTH",
        role: invite.role,
        department: invite.department,
      },
    });

    await prisma.userInvite.update({
      where: { token },
      data: { used: true },
    });

    const jwtToken = generateToken(user);

    res.json({
      msg: "Google signup successful",
      token: jwtToken,
      user,
    });
  } catch (err) {
    console.error("GOOGLE SIGNUP ERROR:", err);
    res.status(500).json({ msg: "Google signup failed" });
  }
};
