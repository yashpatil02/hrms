/**
 * audit.service.js
 * Single helper to log any management action to ManagementAudit table.
 * Never throws — audit failures must not break the main operation.
 */
import prisma from "../../prisma/client.js";

/**
 * @param {object} opts
 * @param {number}  opts.actorId        - manager/HR/admin user ID
 * @param {string}  opts.actorName      - their display name
 * @param {string}  opts.actorRole      - ADMIN | HR | MANAGER
 * @param {string}  opts.action         - e.g. "LEAVE_APPROVED"
 * @param {string}  opts.entity         - e.g. "LEAVE"
 * @param {number}  [opts.entityId]     - affected record ID
 * @param {string}  opts.description    - human-readable sentence
 * @param {number}  [opts.targetUserId] - affected employee ID
 * @param {string}  [opts.targetUserName]
 * @param {object}  [opts.metadata]     - extra JSON details
 */
export async function logAudit({
  actorId, actorName, actorRole,
  action, entity, entityId,
  description,
  targetUserId, targetUserName,
  metadata,
}) {
  try {
    await prisma.managementAudit.create({
      data: {
        actorId,
        actorName,
        actorRole,
        action,
        entity,
        entityId:       entityId       ?? null,
        description,
        targetUserId:   targetUserId   ?? null,
        targetUserName: targetUserName ?? null,
        metadata:       metadata       ?? null,
      },
    });
  } catch (err) {
    // Never crash the main request
    console.error("Audit log error (non-fatal):", err.message);
  }
}
