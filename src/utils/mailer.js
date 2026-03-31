import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export const sendInviteEmail = async (to, name, link) => {
  const msg = {
    to,
    from: process.env.EMAIL_FROM,
    subject: "You're invited to join HRMS",
    html: `
      <h2>Hello ${name} 👋</h2>
      <p>You are invited to join HRMS</p>
      <a href="${link}">Complete Registration</a>
      <p>Valid for 24 hours</p>
    `,
  };

  try {
    await sgMail.send(msg);
    console.log("✅ EMAIL SENT:", to);
  } catch (error) {
    console.error("❌ SENDGRID ERROR:", error.response?.body || error);
    throw error;
  }
};