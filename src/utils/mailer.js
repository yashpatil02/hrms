import nodemailer from "nodemailer";

export const sendInviteEmail = async (to, name, link) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"HRMS" <${process.env.EMAIL_USER}>`,
    to,
    subject: "You're invited to HRMS",
    html: `
      <h2>Hello ${name}</h2>
      <p>You are invited to join HRMS.</p>
      <p>
        <a href="${link}">
          Click here to complete registration
        </a>
      </p>
      <p>This link is valid for 24 hours.</p>
    `,
  });
};
