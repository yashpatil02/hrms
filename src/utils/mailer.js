import sgMail from "@sendgrid/mail";

/* =========================
   SET API KEY
========================= */
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

/* =========================
   SEND INVITE EMAIL
========================= */
export const sendInviteEmail = async (to, name, link) => {
  const msg = {
    to,
    from: `"HRMS Team" <${process.env.EMAIL_USER}>`, // ⚠️ verified sender
    subject: "You're invited to join HRMS",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 20px;">
    <tr>
      <td align="center">

        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- HEADER -->
          <tr>
            <td style="background:linear-gradient(135deg,#2563eb,#4f46e5);padding:36px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">HRMS</h1>
              <p style="margin:6px 0 0;color:#bfdbfe;font-size:13px;">Human Resource Management System</p>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 8px;color:#1e293b;font-size:20px;font-weight:700;">
                Hello, ${name}! 👋
              </h2>

              <p style="margin:0 0 24px;color:#64748b;font-size:15px;line-height:1.6;">
                You have been invited to join <strong style="color:#2563eb;">HRMS</strong>.
                Click the button below to complete your registration.
              </p>

              <!-- BUTTON -->
              <table width="100%">
                <tr>
                  <td align="center">
                    <a href="${link}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:14px 30px;border-radius:10px;font-weight:600;">
                      Complete Registration →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin-top:20px;font-size:12px;color:#94a3b8;">
                ⏰ This link expires in 24 hours
              </p>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#f8fafc;padding:20px;text-align:center;">
              <p style="margin:0;color:#94a3b8;font-size:12px;">
                © ${new Date().getFullYear()} HRMS
              </p>
            </td>
          </tr>

        </table>

        <!-- FALLBACK -->
        <p style="margin-top:10px;font-size:12px;color:#94a3b8;">
          Can't click? <a href="${link}" style="color:#2563eb;">Copy link</a>
        </p>

      </td>
    </tr>
  </table>
</body>
</html>
    `,
  };

  try {
    await sgMail.send(msg);
    console.log("✅ Email sent via SendGrid");
  } catch (error) {
    console.error("❌ SendGrid Error:", error.response?.body || error.message);
  }
};