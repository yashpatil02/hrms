import prisma from "../../prisma/client.js";

/* ══════════════════════════════════
   TRAINING PROGRAMS
══════════════════════════════════ */

// GET /api/lms/trainings
export const getTrainings = async (req, res) => {
  try {
    const trainings = await prisma.training.findMany({
      include: {
        createdBy: { select: { id: true, name: true } },
        _count: { select: { assignments: true, questions: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ trainings });
  } catch (err) {
    console.error("getTrainings:", err);
    res.status(500).json({ msg: "Failed to fetch trainings" });
  }
};

// GET /api/lms/trainings/:id
export const getTrainingDetail = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const training = await prisma.training.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true } },
        questions: { orderBy: { order: "asc" } },
        _count: { select: { assignments: true } },
      },
    });
    if (!training) return res.status(404).json({ msg: "Training not found" });
    res.json({ training });
  } catch (err) {
    console.error("getTrainingDetail:", err);
    res.status(500).json({ msg: "Failed to fetch training" });
  }
};

// POST /api/lms/trainings
export const createTraining = async (req, res) => {
  try {
    const { title, description, category, duration, content, passingScore, status } = req.body;
    if (!title || !content) return res.status(400).json({ msg: "title and content required" });

    const training = await prisma.training.create({
      data: {
        title, description: description || null, category: category || null,
        duration: parseInt(duration) || 0, content,
        passingScore: parseInt(passingScore) || 70,
        status: status || "DRAFT",
        createdById: req.user.id,
      },
      include: { createdBy: { select: { id: true, name: true } }, _count: { select: { assignments: true, questions: true } } },
    });
    res.status(201).json({ msg: "Training created", training });
  } catch (err) {
    console.error("createTraining:", err);
    res.status(500).json({ msg: "Failed to create training" });
  }
};

// PUT /api/lms/trainings/:id
export const updateTraining = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { title, description, category, duration, content, passingScore, status } = req.body;
    const data = {};
    if (title        !== undefined) data.title        = title;
    if (description  !== undefined) data.description  = description;
    if (category     !== undefined) data.category     = category;
    if (duration     !== undefined) data.duration     = parseInt(duration) || 0;
    if (content      !== undefined) data.content      = content;
    if (passingScore !== undefined) data.passingScore = parseInt(passingScore) || 70;
    if (status       !== undefined) data.status       = status;

    const training = await prisma.training.update({
      where: { id }, data,
      include: { createdBy: { select: { id: true, name: true } }, _count: { select: { assignments: true, questions: true } } },
    });
    res.json({ msg: "Training updated", training });
  } catch (err) {
    console.error("updateTraining:", err);
    res.status(500).json({ msg: "Failed to update training" });
  }
};

// DELETE /api/lms/trainings/:id
export const deleteTraining = async (req, res) => {
  try {
    await prisma.training.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ msg: "Training deleted" });
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ msg: "Not found" });
    res.status(500).json({ msg: "Failed to delete training" });
  }
};

/* ══════════════════════════════════
   QUIZ QUESTIONS
══════════════════════════════════ */

// POST /api/lms/trainings/:id/questions  — replace all questions
export const saveQuestions = async (req, res) => {
  try {
    const trainingId = parseInt(req.params.id);
    const { questions } = req.body; // array of { question, options, correctAnswer, points }
    if (!Array.isArray(questions)) return res.status(400).json({ msg: "questions array required" });

    // Delete old + insert new (simple replace)
    await prisma.quizQuestion.deleteMany({ where: { trainingId } });
    if (questions.length > 0) {
      await prisma.quizQuestion.createMany({
        data: questions.map((q, i) => ({
          trainingId,
          question:      q.question,
          options:       JSON.stringify(q.options),
          correctAnswer: parseInt(q.correctAnswer),
          points:        parseInt(q.points) || 1,
          order:         i,
        })),
      });
    }
    const saved = await prisma.quizQuestion.findMany({ where: { trainingId }, orderBy: { order: "asc" } });
    res.json({ msg: "Questions saved", questions: saved });
  } catch (err) {
    console.error("saveQuestions:", err);
    res.status(500).json({ msg: "Failed to save questions" });
  }
};

/* ══════════════════════════════════
   ASSIGNMENTS
══════════════════════════════════ */

// GET /api/lms/assignments?trainingId=&userId=&status=
export const getAssignments = async (req, res) => {
  try {
    const { trainingId, userId, status } = req.query;
    const where = {};
    if (trainingId) where.trainingId = parseInt(trainingId);
    if (userId)     where.userId     = parseInt(userId);
    if (status)     where.status     = status;

    const assignments = await prisma.trainingAssignment.findMany({
      where,
      include: {
        training:   { select: { id: true, title: true, category: true, duration: true, passingScore: true } },
        user:       { select: { id: true, name: true, department: true, avatar: true } },
        assignedBy: { select: { id: true, name: true } },
        certificate: { select: { id: true, certificateNo: true, issuedAt: true } },
        quizAttempts: { select: { id: true, score: true, passed: true, attemptNo: true, attemptedAt: true }, orderBy: { attemptNo: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ assignments });
  } catch (err) {
    console.error("getAssignments:", err);
    res.status(500).json({ msg: "Failed to fetch assignments" });
  }
};

// POST /api/lms/assign  — bulk assign training to employees
export const assignTraining = async (req, res) => {
  try {
    const { trainingId, userIds, dueDate } = req.body;
    if (!trainingId || !userIds?.length) return res.status(400).json({ msg: "trainingId and userIds required" });

    let created = 0, skipped = 0;
    for (const uid of userIds.map(Number)) {
      const exists = await prisma.trainingAssignment.findUnique({
        where: { trainingId_userId: { trainingId: Number(trainingId), userId: uid } },
      });
      if (exists) { skipped++; continue; }

      await prisma.trainingAssignment.create({
        data: {
          trainingId: Number(trainingId), userId: uid,
          assignedById: req.user.id,
          dueDate: dueDate ? new Date(dueDate) : null,
          status: "PENDING", progress: 0,
        },
      });
      created++;
    }
    res.json({ msg: "Training assigned", created, skipped });
  } catch (err) {
    console.error("assignTraining:", err);
    res.status(500).json({ msg: "Failed to assign training" });
  }
};

/* ══════════════════════════════════
   EMPLOYEE — MY TRAININGS
══════════════════════════════════ */

// GET /api/lms/my-trainings
export const getMyTrainings = async (req, res) => {
  try {
    const assignments = await prisma.trainingAssignment.findMany({
      where: { userId: req.user.id },
      include: {
        training: {
          include: {
            questions: { select: { id: true }, orderBy: { order: "asc" } },
          },
        },
        certificate:  { select: { id: true, certificateNo: true, issuedAt: true } },
        quizAttempts: { orderBy: { attemptNo: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ assignments });
  } catch (err) {
    console.error("getMyTrainings:", err);
    res.status(500).json({ msg: "Failed to fetch trainings" });
  }
};

// PATCH /api/lms/assignments/:id/progress
export const updateProgress = async (req, res) => {
  try {
    const id       = parseInt(req.params.id);
    const { progress } = req.body;
    const pct = Math.min(100, Math.max(0, parseInt(progress) || 0));

    const data = { progress: pct };
    if (pct > 0 && pct < 100) {
      data.status    = "IN_PROGRESS";
      data.startedAt = new Date();
    }
    // Don't auto-complete here — completion only via passing quiz
    const updated = await prisma.trainingAssignment.update({ where: { id }, data });
    res.json({ msg: "Progress updated", assignment: updated });
  } catch (err) {
    console.error("updateProgress:", err);
    res.status(500).json({ msg: "Failed to update progress" });
  }
};

/* ══════════════════════════════════
   QUIZ SUBMISSION
══════════════════════════════════ */

// POST /api/lms/assignments/:id/quiz
export const submitQuiz = async (req, res) => {
  try {
    const assignmentId = parseInt(req.params.id);
    const { answers } = req.body; // { "questionId": selectedIndex, ... }

    const assignment = await prisma.trainingAssignment.findUnique({
      where: { id: assignmentId },
      include: { training: { include: { questions: true } } },
    });
    if (!assignment) return res.status(404).json({ msg: "Assignment not found" });
    if (assignment.userId !== req.user.id) return res.status(403).json({ msg: "Not your assignment" });

    const questions = assignment.training.questions;
    if (questions.length === 0) return res.status(400).json({ msg: "No questions in this training" });

    // Calculate score
    let totalPoints = 0, earnedPoints = 0;
    const result = {};
    questions.forEach(q => {
      totalPoints += q.points;
      const selected = answers[String(q.id)];
      const correct  = selected === q.correctAnswer;
      if (correct) earnedPoints += q.points;
      result[q.id] = { selected, correct, correctAnswer: q.correctAnswer };
    });

    const score  = Math.round((earnedPoints / totalPoints) * 100);
    const passed = score >= assignment.training.passingScore;

    // Count previous attempts
    const prevAttempts = await prisma.quizAttempt.count({ where: { assignmentId } });

    const attempt = await prisma.quizAttempt.create({
      data: {
        assignmentId, userId: req.user.id,
        answers:   JSON.stringify(answers),
        score, passed,
        attemptNo: prevAttempts + 1,
      },
    });

    let certificate = null;
    if (passed) {
      // Mark assignment complete
      await prisma.trainingAssignment.update({
        where: { id: assignmentId },
        data:  { status: "COMPLETED", progress: 100, completedAt: new Date() },
      });

      // Issue certificate (idempotent — might already exist)
      const certNo = `CERT-${new Date().getFullYear()}-${String(assignmentId).padStart(6, "0")}`;
      certificate = await prisma.trainingCertificate.upsert({
        where:  { assignmentId },
        create: { assignmentId, userId: req.user.id, trainingId: assignment.trainingId, certificateNo: certNo },
        update: {},
      });
    }

    res.json({
      msg:   passed ? "Quiz passed! 🎉" : `Score: ${score}%. Passing: ${assignment.training.passingScore}%`,
      score, passed, attempt, result, certificate,
    });
  } catch (err) {
    console.error("submitQuiz:", err);
    res.status(500).json({ msg: "Failed to submit quiz" });
  }
};

/* ══════════════════════════════════
   CERTIFICATES
══════════════════════════════════ */

// GET /api/lms/my-certificates
export const getMyCertificates = async (req, res) => {
  try {
    const certs = await prisma.trainingCertificate.findMany({
      where: { userId: req.user.id },
      include: {
        training: { select: { id: true, title: true, category: true, duration: true } },
      },
      orderBy: { issuedAt: "desc" },
    });
    res.json({ certificates: certs });
  } catch (err) {
    console.error("getMyCertificates:", err);
    res.status(500).json({ msg: "Failed to fetch certificates" });
  }
};
