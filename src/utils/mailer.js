import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendInviteEmail = async (to, name, link) => {
  try {
    await resend.emails.send({
      from: "HRMS <noreply@hrmsco.com>", // ✅ custom domain sender
      to,
      subject: "You're invited to join HRMS",
      html: `
        <h2>Hello ${name} 👋</h2>
        <p>You are invited to join HRMS</p>
        <a href="${link}">Complete Registration</a>
      `,
    });

    console.log("✅ EMAIL SENT:", to);
  } catch (error) {
    console.error("❌ RESEND ERROR:", error);
    throw error;
  }
};