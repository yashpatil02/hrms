import express from "express";

import auth from "../middlewares/auth.middleware.js";
import role from "../middlewares/role.middleware.js";

import {
  getEmployeesWithDocuments,
  getEmployeeDocuments,
  uploadDocument,
  downloadDocument,
previewDocument,
  deleteDocument,
} from "../controllers/document.controller.js";

import { upload } from "../middlewares/upload.middleware.js";

const router = express.Router();

/* ADMIN ONLY */
router.get(
  "/employees",
  auth,
  role(["ADMIN"]),
  getEmployeesWithDocuments
);

/* ADMIN ONLY */
router.get(
  "/employee/:employeeId",
  auth,
  role(["ADMIN"]),
  getEmployeeDocuments
);

/* ADMIN, HR */
router.post(
  "/upload",
  auth,
  role(["ADMIN", "HR"]),
  upload.single("file"),
  uploadDocument
);

/* ADMIN, HR */
router.get(
  "/download/:id",
  auth,
  role(["ADMIN", "HR"]),
  downloadDocument
);

router.get(
  "/preview/:id",
  auth,
  role(["ADMIN", "HR"]),
  previewDocument
);

router.delete(
  "/:id",
  auth,
  role(["ADMIN"]),
  deleteDocument
);

export default router;
