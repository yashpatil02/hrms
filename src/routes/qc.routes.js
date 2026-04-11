import express from "express";
import auth from "../middlewares/auth.middleware.js";
import role from "../middlewares/role.middleware.js";
import {
  createSession,
  getSessions,
  getSessionDetail,
  getAllErrors,
  getMyErrors,
  createDispute,
  getPendingDisputes,
  resolveDispute,
} from "../controllers/qc.controller.js";

const router = express.Router();

const mgr = role(["ADMIN", "HR", "MANAGER"]);

/* Sessions */
router.post("/sessions",         auth, mgr, createSession);
router.get("/sessions",          auth, mgr, getSessions);
router.get("/sessions/:id",      auth, mgr, getSessionDetail);

/* Errors */
router.get("/errors",            auth, mgr, getAllErrors);
router.get("/my-errors",         auth, getMyErrors);

/* Disputes */
router.post("/disputes",         auth, createDispute);           // employee raises
router.get("/disputes",          auth, mgr, getPendingDisputes); // manager lists
router.patch("/disputes/:id",    auth, mgr, resolveDispute);     // manager resolves

export default router;
