import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendInviteEmail = async (to, name, link) => {
  try {
    await resend.emails.send({
      from: "HRMS <noreply@hrmsco.com>",
      to,
      subject: "You're invited to join HRMS 🚀",
      html: `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>

<body style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
<tr>
<td align="center">

<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.08);">

<!-- HEADER -->
<tr>
<td style="background:linear-gradient(135deg,#2563eb,#4f46e5);padding:30px;text-align:center;color:#fff;">
  <h1 style="margin:0;font-size:22px;">HRMS</h1>
  <p style="margin:5px 0 0;font-size:13px;color:#dbeafe;">Human Resource Management System</p>
</td>
</tr>

<!-- BODY -->
<tr>
<td style="padding:40px 30px;">

  <h2 style="margin:0 0 10px;color:#111827;">Hello, ${name} 👋</h2>

  <p style="color:#4b5563;font-size:15px;line-height:1.6;">
    You have been invited to join <b>HRMS</b>.  
    Click the button below to activate your account and get started.
  </p>

  <!-- BUTTON -->
  <div style="text-align:center;margin:30px 0;">
    <a href="${link}" 
       style="background:linear-gradient(135deg,#2563eb,#4f46e5);
              color:#ffffff;
              text-decoration:none;
              padding:14px 28px;
              border-radius:10px;
              font-size:15px;
              font-weight:600;
              display:inline-block;">
      Complete Registration →
    </a>
  </div>

  <!-- INFO BOX -->
  <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:15px;">
    <p style="margin:0 0 8px;font-size:13px;color:#6b7280;font-weight:600;">
      What you can do in HRMS:
    </p>
    <ul style="margin:0;padding-left:18px;color:#4b5563;font-size:13px;">
      <li>Mark attendance</li>
      <li>Apply for leave</li>
      <li>View reports</li>
      <li>Get notifications</li>
    </ul>
  </div>

  <p style="margin-top:25px;font-size:12px;color:#9ca3af;">
    ⏰ This link will expire in 24 hours.
  </p>

</td>
</tr>

<!-- FOOTER -->
<tr>
<td style="background:#f9fafb;text-align:center;padding:20px;font-size:12px;color:#9ca3af;">
  © ${new Date().getFullYear()} HRMS · All rights reserved
</td>
</tr>

</table>

<!-- FALLBACK LINK -->
<p style="margin-top:15px;font-size:12px;color:#9ca3af;">
  If the button doesn't work, copy this link:<br/>
  <a href="${link}" style="color:#2563eb;">${link}</a>
</p>

</td>
</tr>
</table>

</body>
</html>
      `,
    });

    console.log("✅ EMAIL SENT:", to);
  } catch (error) {
    console.error("❌ RESEND ERROR:", error);
    throw error;
  }
};