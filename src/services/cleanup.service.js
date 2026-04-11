/**
 * cleanup.service.js
 * Runs periodic DB maintenance to prevent storage bloat.
 * Called once on server start, then every 24 hours.
 */
import prisma from "../../prisma/client.js";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

async function runCleanup() {
  const cutoff = new Date(Date.now() - THIRTY_DAYS_MS);
  try {
    /* ── Delete notifications older than 30 days ── */
    const { count: notifDeleted } = await prisma.notification.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });

    /* ── Delete password reset tokens older than 24 hours ── */
    const tokenCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const { count: tokensDeleted } = await prisma.passwordResetToken.deleteMany({
      where: { createdAt: { lt: tokenCutoff } },
    });

    /* ── Delete attendance audit logs older than 90 days ── */
    const auditCutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const { count: auditDeleted } = await prisma.attendanceAudit.deleteMany({
      where: { timestamp: { lt: auditCutoff } },
    });

    if (notifDeleted + tokensDeleted + auditDeleted > 0) {
      console.log(
        `🧹 Cleanup: removed ${notifDeleted} notifications, ` +
        `${tokensDeleted} expired tokens, ${auditDeleted} audit logs`
      );
    }
  } catch (err) {
    console.error("Cleanup error (non-fatal):", err.message);
  }
}

export function startCleanupScheduler() {
  /* Run once immediately on start */
  runCleanup();

  /* Then every 24 hours */
  const INTERVAL_MS = 24 * 60 * 60 * 1000;
  setInterval(runCleanup, INTERVAL_MS);

  console.log("🧹 Cleanup scheduler started (runs every 24h)");
}
