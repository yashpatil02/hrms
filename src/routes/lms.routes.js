import { Router } from "express";
import auth from "../middlewares/auth.middleware.js";
import role from "../middlewares/role.middleware.js";
import {
  getTrainings, getTrainingDetail, createTraining, updateTraining, deleteTraining,
  saveQuestions,
  getAssignments, assignTraining,
  getMyTrainings, updateProgress,
  submitQuiz,
  getMyCertificates,
} from "../controllers/lms.controller.js";

const router = Router();
const mgr  = role(["ADMIN", "HR", "MANAGER"]);

// ── Training Programs ──────────────────────────────────────────────
router.get("/trainings",         auth, mgr, getTrainings);
router.get("/trainings/:id",     auth, getTrainingDetail);   // employees too
router.post("/trainings",        auth, mgr, createTraining);
router.put("/trainings/:id",     auth, mgr, updateTraining);
router.delete("/trainings/:id",  auth, mgr, deleteTraining);

// ── Quiz Questions (replace all for a training) ────────────────────
router.post("/trainings/:id/questions", auth, mgr, saveQuestions);

// ── Assignments ────────────────────────────────────────────────────
router.get("/assignments",   auth, mgr, getAssignments);
router.post("/assign",       auth, mgr, assignTraining);

// ── Employee: My Trainings ─────────────────────────────────────────
router.get("/my-trainings",                        auth, getMyTrainings);
router.patch("/assignments/:id/progress",          auth, updateProgress);
router.post("/assignments/:id/quiz",               auth, submitQuiz);

// ── Certificates ───────────────────────────────────────────────────
router.get("/my-certificates", auth, getMyCertificates);

export default router;
