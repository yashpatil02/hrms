import nodemailer from "nodemailer";

const createTransporter = () =>
  nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

/* ================================
   SEND INVITE EMAIL
================================ */
export const sendInviteEmail = async (to, name, link) => {
  const transporter = createTransporter();

  await transporter.sendMail({
    from: `"HRMS Team" <${process.env.EMAIL_USER}>`,
    to,
    subject: "You're invited to join HRMS",
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- HEADER -->
        <tr>
          <td style="background:linear-gradient(135deg,#2563eb,#4f46e5);padding:36px 40px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">HRMS</h1>
            <p style="margin:6px 0 0;color:#bfdbfe;font-size:13px;">Human Resource Management System</p>
          </td>
        </tr>

        <!-- BODY -->
        <tr>
          <td style="padding:40px;">
            <h2 style="margin:0 0 8px;color:#1e293b;font-size:20px;font-weight:700;">Hello, ${name}! 👋</h2>
            <p style="margin:0 0 24px;color:#64748b;font-size:15px;line-height:1.6;">
              You have been invited to join <strong style="color:#2563eb;">HRMS</strong>. Click the button below to complete your registration and set up your account.
            </p>

            <!-- CTA BUTTON -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="padding:8px 0 24px;">
                  <a href="${link}" style="display:inline-block;background:linear-gradient(135deg,#2563eb,#4f46e5);color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:12px;font-size:15px;font-weight:600;letter-spacing:0.3px;">
                    Complete Registration →
                  </a>
                </td>
              </tr>
            </table>

            <!-- INFO BOX -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px 20px;">
                  <p style="margin:0 0 8px;color:#475569;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">What you can do in HRMS</p>
                  <table width="100%">
                    ${["✅ Mark daily attendance","📅 Apply for leave","📄 Access your documents","🔔 Get real-time notifications"].map(item =>
                      `<tr><td style="padding:3px 0;color:#64748b;font-size:13px;">${item}</td></tr>`
                    ).join("")}
                  </table>
                </td>
              </tr>
            </table>

            <p style="margin:24px 0 0;color:#94a3b8;font-size:12px;line-height:1.6;">
              ⏰ This invitation link expires in <strong>24 hours</strong>. If you did not expect this email, you can safely ignore it.
            </p>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
            <p style="margin:0;color:#94a3b8;font-size:12px;">© ${new Date().getFullYear()} HRMS · Sent by Admin</p>
          </td>
        </tr>

      </table>

      <!-- FALLBACK LINK -->
      <p style="margin:16px 0 0;color:#94a3b8;font-size:12px;">
        Can't click the button?
        <a href="${link}" style="color:#2563eb;text-decoration:none;">Copy this link</a>
      </p>
    </td></tr>
  </table>
</body>
</html>
    `,
  });
};