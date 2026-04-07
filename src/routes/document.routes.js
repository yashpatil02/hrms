import express from "express";

import auth from "../middlewares/auth.middleware.js";
import role from "../middlewares/role.middleware.js";

import {
  getEmployeesWithDocuments,
  getEmployeeDocuments,
  getMyDocuments,
  uploadDocument,
  selfUploadDocument,
  requestDocument,
  cancelDocumentRequest,
  downloadDocument,
  previewDocument,
  deleteDocument,
} from "../controllers/document.controller.js";

import { upload } from "../middlewares/upload.middleware.js";

const router = express.Router();

/* ─────────────────────────────────────────────────────────────
   ADMIN / HR — list all users with document counts
───────────────────────────────────────────────────────────── */
router.get(
  "/employees",
  auth,
  role(["ADMIN", "HR"]),
  getEmployeesWithDocuments
);

/* ─────────────────────────────────────────────────────────────
   ADMIN / HR — view documents of any user
───────────────────────────────────────────────────────────── */
router.get(
  "/employee/:employeeId",
  auth,
  role(["ADMIN", "HR"]),
  getEmployeeDocuments
);

/* ─────────────────────────────────────────────────────────────
   EMPLOYEE — get own documents + pending requests
───────────────────────────────────────────────────────────── */
router.get(
  "/my",
  auth,
  getMyDocuments
);

/* ─────────────────────────────────────────────────────────────
   ADMIN / HR — upload document for any user
───────────────────────────────────────────────────────────── */
router.post(
  "/upload",
  auth,
  role(["ADMIN", "HR"]),
  upload.single("file"),
  uploadDocument
);

/* ─────────────────────────────────────────────────────────────
   EMPLOYEE — self-upload own document (can fulfill a request)
───────────────────────────────────────────────────────────── */
router.post(
  "/self-upload",
  auth,
  upload.single("file"),
  selfUploadDocument
);

/* ─────────────────────────────────────────────────────────────
   ADMIN / HR — request employee to upload a document
───────────────────────────────────────────────────────────── */
router.post(
  "/request",
  auth,
  role(["ADMIN", "HR"]),
  requestDocument
);

/* ─────────────────────────────────────────────────────────────
   ADMIN / HR — cancel a pending document request
───────────────────────────────────────────────────────────── */
router.delete(
  "/request/:id",
  auth,
  role(["ADMIN", "HR"]),
  cancelDocumentRequest
);

/* ─────────────────────────────────────────────────────────────
   DOWNLOAD — Admin/HR any doc; Employee own docs only
───────────────────────────────────────────────────────────── */
router.get(
  "/download/:id",
  auth,
  downloadDocument
);

/* ─────────────────────────────────────────────────────────────
   PREVIEW — Admin/HR any doc; Employee own docs only
───────────────────────────────────────────────────────────── */
router.get(
  "/preview/:id",
  auth,
  previewDocument
);

/* ─────────────────────────────────────────────────────────────
   DELETE — Admin: any doc; Employee: only self-uploaded
───────────────────────────────────────────────────────────── */
router.delete(
  "/:id",
  auth,
  deleteDocument
);

export default router;
