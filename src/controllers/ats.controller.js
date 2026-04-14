import prisma from "../../prisma/client.js";
import bcrypt from "bcrypt";

const STAGE_ORDER = ["APPLIED", "SCREENING", "INTERVIEW", "OFFER", "HIRED"];

/* ══════════════════════════════════════
   JOB POSTINGS
══════════════════════════════════════ */

// GET /api/ats/jobs
export const getJobs = async (req, res) => {
  try {
    const jobs = await prisma.jobPosting.findMany({
      include: {
        createdBy: { select: { id: true, name: true } },
        _count:    { select: { candidates: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ jobs });
  } catch (err) {
    console.error("getJobs:", err);
    res.status(500).json({ msg: "Failed to fetch jobs" });
  }
};

// POST /api/ats/jobs
export const createJob = async (req, res) => {
  try {
    const { title, department, description, requirements, location, type, status, salaryMin, salaryMax, closingDate } = req.body;
    if (!title || !description) return res.status(400).json({ msg: "title and description required" });

    const job = await prisma.jobPosting.create({
      data: {
        title, department, description, requirements, location,
        type:        type        || "FULL_TIME",
        status:      status      || "OPEN",
        salaryMin:   salaryMin   ? Number(salaryMin)  : null,
        salaryMax:   salaryMax   ? Number(salaryMax)  : null,
        closingDate: closingDate ? new Date(closingDate) : null,
        createdById: req.user.id,
      },
      include: { createdBy: { select: { id: true, name: true } }, _count: { select: { candidates: true } } },
    });
    res.status(201).json({ msg: "Job created", job });
  } catch (err) {
    console.error("createJob:", err);
    res.status(500).json({ msg: "Failed to create job" });
  }
};

// PUT /api/ats/jobs/:id
export const updateJob = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { title, department, description, requirements, location, type, status, salaryMin, salaryMax, closingDate } = req.body;

    const data = {};
    if (title        !== undefined) data.title        = title;
    if (department   !== undefined) data.department   = department;
    if (description  !== undefined) data.description  = description;
    if (requirements !== undefined) data.requirements = requirements;
    if (location     !== undefined) data.location     = location;
    if (type         !== undefined) data.type         = type;
    if (status       !== undefined) data.status       = status;
    if (salaryMin    !== undefined) data.salaryMin    = salaryMin ? Number(salaryMin) : null;
    if (salaryMax    !== undefined) data.salaryMax    = salaryMax ? Number(salaryMax) : null;
    if (closingDate  !== undefined) data.closingDate  = closingDate ? new Date(closingDate) : null;

    const job = await prisma.jobPosting.update({
      where: { id },
      data,
      include: { createdBy: { select: { id: true, name: true } }, _count: { select: { candidates: true } } },
    });
    res.json({ msg: "Job updated", job });
  } catch (err) {
    console.error("updateJob:", err);
    res.status(500).json({ msg: "Failed to update job" });
  }
};

// DELETE /api/ats/jobs/:id
export const deleteJob = async (req, res) => {
  try {
    await prisma.jobPosting.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ msg: "Job deleted" });
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ msg: "Job not found" });
    res.status(500).json({ msg: "Failed to delete job" });
  }
};

/* ══════════════════════════════════════
   CANDIDATES
══════════════════════════════════════ */

// GET /api/ats/candidates?jobId=&stage=
export const getCandidates = async (req, res) => {
  try {
    const { jobId, stage } = req.query;
    const where = {};
    if (jobId) where.jobId = parseInt(jobId);
    if (stage) where.stage = stage;

    const candidates = await prisma.candidate.findMany({
      where,
      include: {
        job:      { select: { id: true, title: true, department: true } },
        addedBy:  { select: { id: true, name: true } },
        feedbacks: { select: { id: true, rating: true, recommendation: true, round: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ candidates });
  } catch (err) {
    console.error("getCandidates:", err);
    res.status(500).json({ msg: "Failed to fetch candidates" });
  }
};

// POST /api/ats/candidates
export const addCandidate = async (req, res) => {
  try {
    const { name, email, phone, resumeUrl, jobId, notes } = req.body;
    if (!name || !email || !jobId) return res.status(400).json({ msg: "name, email, jobId required" });

    const candidate = await prisma.candidate.create({
      data: {
        name, email, phone: phone || null, resumeUrl: resumeUrl || null,
        jobId: parseInt(jobId), notes: notes || null,
        stage: "APPLIED", addedById: req.user.id,
      },
      include: {
        job:     { select: { id: true, title: true, department: true } },
        addedBy: { select: { id: true, name: true } },
        feedbacks: true,
      },
    });

    // Log initial stage
    await prisma.candidateStageHistory.create({
      data: { candidateId: candidate.id, fromStage: null, toStage: "APPLIED", changedById: req.user.id, notes: "Application received" },
    });

    res.status(201).json({ msg: "Candidate added", candidate });
  } catch (err) {
    console.error("addCandidate:", err);
    res.status(500).json({ msg: "Failed to add candidate" });
  }
};

// GET /api/ats/candidates/:id
export const getCandidateDetail = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const candidate = await prisma.candidate.findUnique({
      where: { id },
      include: {
        job:      { select: { id: true, title: true, department: true } },
        addedBy:  { select: { id: true, name: true } },
        feedbacks: {
          include: { interviewer: { select: { id: true, name: true } } },
          orderBy: { createdAt: "asc" },
        },
        stageHistory: {
          include: { changedBy: { select: { id: true, name: true } } },
          orderBy: { changedAt: "asc" },
        },
      },
    });
    if (!candidate) return res.status(404).json({ msg: "Candidate not found" });
    res.json({ candidate });
  } catch (err) {
    console.error("getCandidateDetail:", err);
    res.status(500).json({ msg: "Failed to fetch candidate" });
  }
};

// PATCH /api/ats/candidates/:id/stage
export const moveStage = async (req, res) => {
  try {
    const id    = parseInt(req.params.id);
    const { stage, notes } = req.body;
    if (!stage) return res.status(400).json({ msg: "stage required" });

    const candidate = await prisma.candidate.findUnique({ where: { id } });
    if (!candidate) return res.status(404).json({ msg: "Candidate not found" });

    const updated = await prisma.candidate.update({
      where: { id },
      data:  { stage },
      include: {
        job:     { select: { id: true, title: true } },
        feedbacks: { select: { id: true, rating: true, recommendation: true } },
      },
    });

    await prisma.candidateStageHistory.create({
      data: {
        candidateId: id,
        fromStage:   candidate.stage,
        toStage:     stage,
        notes:       notes || null,
        changedById: req.user.id,
      },
    });

    res.json({ msg: "Stage updated", candidate: updated });
  } catch (err) {
    console.error("moveStage:", err);
    res.status(500).json({ msg: "Failed to update stage" });
  }
};

// DELETE /api/ats/candidates/:id
export const deleteCandidate = async (req, res) => {
  try {
    await prisma.candidate.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ msg: "Candidate removed" });
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ msg: "Not found" });
    res.status(500).json({ msg: "Failed to delete candidate" });
  }
};

/* ══════════════════════════════════════
   INTERVIEW FEEDBACK
══════════════════════════════════════ */

// POST /api/ats/candidates/:id/feedback
export const addFeedback = async (req, res) => {
  try {
    const candidateId = parseInt(req.params.id);
    const { round, rating, strengths, weaknesses, recommendation, notes } = req.body;
    if (!round || !rating || !recommendation)
      return res.status(400).json({ msg: "round, rating, recommendation required" });

    const feedback = await prisma.interviewFeedback.create({
      data: {
        candidateId, interviewerId: req.user.id,
        round, rating: parseInt(rating),
        strengths: strengths || null, weaknesses: weaknesses || null,
        recommendation, notes: notes || null,
      },
      include: { interviewer: { select: { id: true, name: true } } },
    });
    res.status(201).json({ msg: "Feedback added", feedback });
  } catch (err) {
    console.error("addFeedback:", err);
    res.status(500).json({ msg: "Failed to add feedback" });
  }
};

/* ══════════════════════════════════════
   OFFER LETTER
══════════════════════════════════════ */

// POST /api/ats/candidates/:id/offer
export const saveOffer = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { offerSalary, joiningDate, offerContent } = req.body;

    const candidate = await prisma.candidate.update({
      where: { id },
      data: {
        offerSalary:  offerSalary  ? Number(offerSalary) : null,
        joiningDate:  joiningDate  ? new Date(joiningDate) : null,
        offerContent: offerContent || null,
        stage: "OFFER",
      },
    });

    // Log stage change if was not already OFFER
    await prisma.candidateStageHistory.create({
      data: { candidateId: id, fromStage: "INTERVIEW", toStage: "OFFER", changedById: req.user.id, notes: "Offer letter generated" },
    }).catch(() => {}); // ignore if duplicate

    res.json({ msg: "Offer saved", candidate });
  } catch (err) {
    console.error("saveOffer:", err);
    res.status(500).json({ msg: "Failed to save offer" });
  }
};

/* ══════════════════════════════════════
   HIRE — Convert candidate to Employee
══════════════════════════════════════ */

// POST /api/ats/candidates/:id/hire
export const hireCandidate = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { role, designation, department, tempPassword } = req.body;
    if (!tempPassword) return res.status(400).json({ msg: "tempPassword required" });

    const candidate = await prisma.candidate.findUnique({
      where: { id },
      include: { job: true },
    });
    if (!candidate) return res.status(404).json({ msg: "Candidate not found" });

    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email: candidate.email } });
    if (existing) return res.status(409).json({ msg: "An employee with this email already exists" });

    const hashed = await bcrypt.hash(tempPassword, 10);
    const user = await prisma.user.create({
      data: {
        name:        candidate.name,
        email:       candidate.email,
        phone:       candidate.phone || null,
        password:    hashed,
        role:        role        || "EMPLOYEE",
        designation: designation || candidate.job?.title || null,
        department:  department  || candidate.job?.department || null,
        joinDate:    candidate.joiningDate || new Date(),
      },
      select: { id: true, name: true, email: true, role: true, department: true, designation: true },
    });

    // Mark candidate as HIRED
    await prisma.candidate.update({
      where: { id },
      data:  { stage: "HIRED" },
    });
    await prisma.candidateStageHistory.create({
      data: { candidateId: id, fromStage: "OFFER", toStage: "HIRED", changedById: req.user.id, notes: "Converted to employee" },
    });

    res.json({ msg: "Candidate hired and employee account created", user });
  } catch (err) {
    console.error("hireCandidate:", err);
    res.status(500).json({ msg: err.message || "Failed to hire candidate" });
  }
};
