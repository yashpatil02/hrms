import crypto from "crypto";
import prisma from "../../prisma/client.js";



export const inviteUser = async (req, res) => {
  const { name, email, role, department } = req.body;

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

  const inviteLink = `${process.env.FRONTEND_URL}/invite/${token}`;

  console.log("INVITE LINK:", inviteLink);

  res.json({ msg: "Invite sent successfully" });
};
