import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM   = "HRMS <noreply@hrmsco.com>";

/* ─────────────────────────────────────────────────────────────
   SHARED LAYOUT HELPERS
───────────────────────────────────────────────────────────── */
const emailHeader = (title, subtitle = "Human Resource Management System") => `
<table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#2563eb,#4f46e5);padding:30px;text-align:center;color:#fff;">
<tr><td>
  <h1 style="margin:0;font-size:22px;font-weight:700;">HRMS</h1>
  <p style="margin:6px 0 0;font-size:13px;color:#dbeafe;">${subtitle}</p>
  ${title ? `<div style="margin-top:16px;background:rgba(255,255,255,0.15);border-radius:8px;padding:8px 16px;display:inline-block;font-size:14px;font-weight:600;">${title}</div>` : ""}
</td></tr>
</table>`;

const emailFooter = () => `
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-top:1px solid #e5e7eb;">
<tr><td style="padding:20px;text-align:center;font-size:12px;color:#9ca3af;">
  © ${new Date().getFullYear()} HRMS · All rights reserved<br/>
  <span style="font-size:11px;">This is an automated email, please do not reply.</span>
</td></tr>
</table>`;

const emailWrapper = (bodyHtml) => `
<!DOCTYPE html><html>
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.08);">
${bodyHtml}
</table>
</td></tr>
</table>
</body></html>`;

const infoRow = (label, value) =>
  `<tr>
    <td style="padding:6px 0;font-size:13px;color:#6b7280;width:130px;">${label}</td>
    <td style="padding:6px 0;font-size:13px;color:#111827;font-weight:600;">${value}</td>
  </tr>`;

const badge = (text, color) =>
  `<span style="display:inline-block;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;background:${color.bg};color:${color.text};">${text}</span>`;

const COLORS = {
  green:  { bg: "#dcfce7", text: "#166534" },
  red:    { bg: "#fee2e2", text: "#991b1b" },
  blue:   { bg: "#dbeafe", text: "#1e40af" },
  yellow: { bg: "#fef9c3", text: "#854d0e" },
};

/* safe send — never throws, just logs */
async function send(to, subject, html) {
  try {
    const recipients = Array.isArray(to) ? to : [to];
    if (!recipients.length) return;
    await resend.emails.send({ from: FROM, to: recipients, subject, html });
    console.log("✅ EMAIL SENT →", recipients.join(", "), "|", subject);
  } catch (err) {
    console.error("❌ EMAIL ERROR →", err?.message || err);
  }
}

/* ─────────────────────────────────────────────────────────────
   1. INVITE EMAIL
───────────────────────────────────────────────────────────── */
export const sendInviteEmail = async (to, name, link) => {
  const html = emailWrapper(`
    ${emailHeader("Account Invitation")}
    <tr><td style="padding:40px 30px;">
      <h2 style="margin:0 0 10px;color:#111827;">Hello, ${name} 👋</h2>
      <p style="color:#4b5563;font-size:15px;line-height:1.6;">
        You have been invited to join <b>HRMS</b>. Click the button below to activate your account.
      </p>
      <div style="text-align:center;margin:30px 0;">
        <a href="${link}" style="background:linear-gradient(135deg,#2563eb,#4f46e5);color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-size:15px;font-weight:600;display:inline-block;">
          Complete Registration →
        </a>
      </div>
      <p style="margin-top:20px;font-size:12px;color:#9ca3af;">⏰ This link will expire in 24 hours.</p>
    </td></tr>
    ${emailFooter()}
  `);
  await send(to, "You're invited to join HRMS 🚀", html);
};

/* ─────────────────────────────────────────────────────────────
   2. LEAVE APPLIED — notify HR & Admin
   @param {string[]} toList  — list of admin/HR emails
   @param {{ name, department }} employee
   @param {{ fromDate, toDate, days, reason }} leave
───────────────────────────────────────────────────────────── */
export const sendLeaveAppliedEmail = async (toList, employee, leave) => {
  if (!toList?.length) return;
  const html = emailWrapper(`
    ${emailHeader("New Leave Request")}
    <tr><td style="padding:40px 30px;">
      <h2 style="margin:0 0 6px;color:#111827;">New Leave Application</h2>
      <p style="color:#6b7280;font-size:14px;margin:0 0 24px;">
        <b>${employee.name}</b> has submitted a leave request that requires your approval.
      </p>
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          ${infoRow("Employee",   employee.name)}
          ${infoRow("Department", employee.department || "—")}
          ${infoRow("From",       leave.fromDate)}
          ${infoRow("To",         leave.toDate)}
          ${infoRow("Duration",   `${leave.days} day${leave.days > 1 ? "s" : ""}`)}
          ${infoRow("Reason",     leave.reason)}
          ${infoRow("Status",     badge("PENDING", COLORS.yellow))}
        </table>
      </div>
      <p style="font-size:13px;color:#6b7280;">Please log in to HRMS to approve or reject this request.</p>
    </td></tr>
    ${emailFooter()}
  `);
  await send(toList, `Leave Request — ${employee.name}`, html);
};

/* ─────────────────────────────────────────────────────────────
   3. LEAVE APPROVED — notify Employee
───────────────────────────────────────────────────────────── */
export const sendLeaveApprovedEmail = async (to, employee, leave) => {
  const html = emailWrapper(`
    ${emailHeader("Leave Approved ✅")}
    <tr><td style="padding:40px 30px;">
      <h2 style="margin:0 0 6px;color:#111827;">Hello, ${employee.name} 👋</h2>
      <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 24px;">
        Great news! Your leave request has been <b style="color:#16a34a;">approved</b>.
      </p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          ${infoRow("From",     leave.fromDate)}
          ${infoRow("To",       leave.toDate)}
          ${infoRow("Duration", `${leave.days} day${leave.days > 1 ? "s" : ""}`)}
          ${infoRow("Reason",   leave.reason)}
          ${infoRow("Status",   badge("APPROVED", COLORS.green))}
        </table>
      </div>
      <p style="font-size:13px;color:#6b7280;">Enjoy your time off! You can view all your leave details in HRMS.</p>
    </td></tr>
    ${emailFooter()}
  `);
  await send(to, "Your Leave has been Approved ✅", html);
};

/* ─────────────────────────────────────────────────────────────
   4. LEAVE REJECTED — notify Employee
───────────────────────────────────────────────────────────── */
export const sendLeaveRejectedEmail = async (to, employee, leave, rejectReason) => {
  const html = emailWrapper(`
    ${emailHeader("Leave Update")}
    <tr><td style="padding:40px 30px;">
      <h2 style="margin:0 0 6px;color:#111827;">Hello, ${employee.name}</h2>
      <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 24px;">
        Unfortunately, your leave request has been <b style="color:#dc2626;">rejected</b>.
      </p>
      <div style="background:#fff1f2;border:1px solid #fecdd3;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          ${infoRow("From",           leave.fromDate)}
          ${infoRow("To",             leave.toDate)}
          ${infoRow("Duration",       `${leave.days} day${leave.days > 1 ? "s" : ""}`)}
          ${infoRow("Status",         badge("REJECTED", COLORS.red))}
          ${infoRow("Reject Reason",  rejectReason)}
        </table>
      </div>
      <p style="font-size:13px;color:#6b7280;">If you have questions, please contact HR. You can re-apply with updated details in HRMS.</p>
    </td></tr>
    ${emailFooter()}
  `);
  await send(to, "Leave Request Update — Rejected", html);
};

/* ─────────────────────────────────────────────────────────────
   5. SALARY STRUCTURE ADDED/UPDATED — notify Employee
───────────────────────────────────────────────────────────── */
export const sendSalaryStructureEmail = async (to, employee, structure, isNew) => {
  const fmt = (n) => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 0 });
  const gross = (structure.basicSalary || 0) + (structure.hra || 0) +
                (structure.da || 0) + (structure.otherAllowances || 0);

  const html = emailWrapper(`
    ${emailHeader(isNew ? "Salary Structure Created" : "Salary Structure Updated")}
    <tr><td style="padding:40px 30px;">
      <h2 style="margin:0 0 6px;color:#111827;">Hello, ${employee.name} 👋</h2>
      <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 24px;">
        Your salary structure has been <b>${isNew ? "set up" : "updated"}</b> by HR.
      </p>

      <p style="font-size:13px;font-weight:700;color:#374151;margin:0 0 8px;">Earnings</p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px 20px;margin-bottom:16px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          ${infoRow("Basic Salary",     "₹" + fmt(structure.basicSalary))}
          ${infoRow("HRA",              "₹" + fmt(structure.hra))}
          ${infoRow("DA",               "₹" + fmt(structure.da))}
          ${infoRow("Other Allowances", "₹" + fmt(structure.otherAllowances))}
          ${infoRow("Gross Salary",     "<b>₹" + fmt(gross) + "</b>")}
        </table>
      </div>

      <p style="font-size:13px;font-weight:700;color:#374151;margin:0 0 8px;">Deductions (% based)</p>
      <div style="background:#fff1f2;border:1px solid #fecdd3;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          ${infoRow("PF (Employee)",    structure.pfEmployee + "%")}
          ${infoRow("ESI (Employee)",   structure.esiEmployee + "%")}
          ${infoRow("Professional Tax", "₹" + fmt(structure.professionalTax))}
          ${infoRow("TDS",              "₹" + fmt(structure.tds))}
        </table>
      </div>
      <p style="font-size:13px;color:#6b7280;">You can view your complete salary details and payslips in HRMS.</p>
    </td></tr>
    ${emailFooter()}
  `);
  await send(to, isNew ? "Your Salary Structure has been Set Up" : "Your Salary Structure has been Updated", html);
};

/* ─────────────────────────────────────────────────────────────
   6. PAYROLL GENERATED — notify Employee
───────────────────────────────────────────────────────────── */
export const sendPayrollGeneratedEmail = async (to, employee, payroll) => {
  const fmt = (n) => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 0 });
  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const period = `${MONTHS[payroll.month - 1]} ${payroll.year}`;

  const html = emailWrapper(`
    ${emailHeader(`Payslip — ${period}`)}
    <tr><td style="padding:40px 30px;">
      <h2 style="margin:0 0 6px;color:#111827;">Hello, ${employee.name} 👋</h2>
      <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 24px;">
        Your payslip for <b>${period}</b> has been generated.
      </p>

      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:16px 20px;margin-bottom:16px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          ${infoRow("Period",          period)}
          ${infoRow("Working Days",    payroll.totalWorkingDays)}
          ${infoRow("Present Days",    payroll.presentDays)}
          ${infoRow("Gross Salary",    "₹" + fmt(payroll.grossSalary))}
          ${infoRow("Deductions",      "₹" + fmt(payroll.totalDeductions))}
        </table>
      </div>

      <div style="background:linear-gradient(135deg,#2563eb,#4f46e5);border-radius:12px;padding:20px;text-align:center;margin-bottom:24px;">
        <p style="margin:0;font-size:13px;color:#bfdbfe;">Net Take-Home Pay</p>
        <p style="margin:8px 0 0;font-size:28px;font-weight:800;color:#fff;">₹${fmt(payroll.netSalary)}</p>
        <p style="margin:6px 0 0;font-size:12px;color:#93c5fd;">${period}</p>
      </div>

      ${payroll.status === "PAID"
        ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 16px;text-align:center;font-size:14px;font-weight:700;color:#16a34a;">
            ✅ Salary has been credited to your account
           </div>`
        : `<p style="font-size:13px;color:#6b7280;text-align:center;">Status: ${badge(payroll.status, COLORS.yellow)} — You will be notified once it is paid.</p>`
      }
    </td></tr>
    ${emailFooter()}
  `);
  await send(to, `Your Payslip for ${period} is Ready`, html);
};

/* ─────────────────────────────────────────────────────────────
   7. PAYROLL STATUS CHANGED (APPROVED / PAID) — notify Employee
───────────────────────────────────────────────────────────── */
export const sendPayrollStatusEmail = async (to, employee, payroll, status) => {
  const fmt = (n) => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 0 });
  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const period = `${MONTHS[payroll.month - 1]} ${payroll.year}`;

  const isPaid     = status === "PAID";
  const color      = isPaid ? COLORS.green : COLORS.blue;
  const statusText = isPaid ? "Paid ✅" : "Approved";
  const headline   = isPaid
    ? `Your salary for <b>${period}</b> has been <b style="color:#16a34a;">credited</b>! 🎉`
    : `Your payroll for <b>${period}</b> has been <b style="color:#1d4ed8;">approved</b>.`;

  const html = emailWrapper(`
    ${emailHeader(`Payroll ${statusText}`)}
    <tr><td style="padding:40px 30px;">
      <h2 style="margin:0 0 6px;color:#111827;">Hello, ${employee.name} 👋</h2>
      <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 24px;">${headline}</p>

      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px 20px;margin-bottom:16px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          ${infoRow("Period",       period)}
          ${infoRow("Gross Salary", "₹" + fmt(payroll.grossSalary))}
          ${infoRow("Deductions",   "₹" + fmt(payroll.totalDeductions))}
          ${infoRow("Net Pay",      "<b style='font-size:15px;'>₹" + fmt(payroll.netSalary) + "</b>")}
          ${infoRow("Status",       badge(statusText, color))}
        </table>
      </div>
      <p style="font-size:13px;color:#6b7280;">You can view and print your full payslip in HRMS under "My Payslips".</p>
    </td></tr>
    ${emailFooter()}
  `);
  await send(to, isPaid ? `Salary Credited for ${period} ✅` : `Payroll Approved for ${period}`, html);
};

/* ─────────────────────────────────────────────────────────────
   8. DOCUMENT REQUEST — HR/Admin asks employee to upload a doc
───────────────────────────────────────────────────────────── */
export const sendDocumentRequestEmail = async (to, employee, { documentType, message, requestedBy }) => {
  const html = emailWrapper(`
    ${emailHeader("Document Upload Required", "Action Required")}
    <tr><td style="padding:40px 30px;">
      <h2 style="margin:0 0 6px;color:#111827;">Hello, ${employee.name} 👋</h2>
      <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 24px;">
        <b>${requestedBy}</b> has requested you to upload a document in HRMS.
      </p>

      <div style="background:#fefce8;border:1px solid #fde047;border-radius:12px;padding:16px 20px;margin-bottom:16px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          ${infoRow("Document Type", `<b>${documentType}</b>`)}
          ${infoRow("Requested By",  requestedBy)}
          ${message ? infoRow("Note", `<i style="color:#92400e;">${message}</i>`) : ""}
        </table>
      </div>

      <p style="font-size:13px;color:#6b7280;margin:0 0 20px;">
        Please log in to HRMS and go to <b>"My Documents"</b> to upload the requested document at your earliest convenience.
      </p>

      <div style="text-align:center;margin-top:8px;">
        <span style="display:inline-block;padding:10px 24px;background:#2563eb;color:#fff;border-radius:8px;font-size:14px;font-weight:600;">
          Upload via HRMS Portal
        </span>
      </div>
    </td></tr>
    ${emailFooter()}
  `);
  await send(to, `Action Required: Please Upload Your ${documentType}`, html);
};
