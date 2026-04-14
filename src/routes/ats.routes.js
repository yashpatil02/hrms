import { Router } from "express";
import auth from "../middlewares/auth.middleware.js";
import role from "../middlewares/role.middleware.js";
import {
  getJobs, createJob, updateJob, deleteJob,
  getCandidates, addCandidate, getCandidateDetail, moveStage, deleteCandidate,
  addFeedback,
  saveOffer,
  hireCandidate,
} from "../controllers/ats.controller.js";

const router = Router();
const mgr = role(["ADMIN", "HR", "MANAGER"]);

// Jobs
router.get("/jobs",          auth, mgr, getJobs);
router.post("/jobs",         auth, mgr, createJob);
router.put("/jobs/:id",      auth, mgr, updateJob);
router.delete("/jobs/:id",   auth, mgr, deleteJob);

// Candidates
router.get("/candidates",          auth, mgr, getCandidates);
router.post("/candidates",         auth, mgr, addCandidate);
router.get("/candidates/:id",      auth, mgr, getCandidateDetail);
router.patch("/candidates/:id/stage",    auth, mgr, moveStage);
router.delete("/candidates/:id",         auth, mgr, deleteCandidate);

// Feedback
router.post("/candidates/:id/feedback",  auth, mgr, addFeedback);

// Offer letter
router.post("/candidates/:id/offer",     auth, mgr, saveOffer);

// Hire → convert to employee
router.post("/candidates/:id/hire",      auth, role(["ADMIN", "HR"]), hireCandidate);

export default router;
