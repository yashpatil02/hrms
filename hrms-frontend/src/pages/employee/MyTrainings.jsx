import { useState, useEffect, useCallback } from "react";
import Layout from "../../components/Layout";
import api from "../../services/api";

/* ── helpers ─────────────────────────────────────────────── */
const STATUS_COLOR = {
  PENDING:    "bg-yellow-500/20 text-yellow-300",
  IN_PROGRESS:"bg-blue-500/20 text-blue-300",
  COMPLETED:  "bg-green-500/20 text-green-300",
  FAILED:     "bg-red-500/20 text-red-400",
};

/* ═══════════════════════════════════════════════════════════
   TRAINING DETAIL + QUIZ MODAL
═══════════════════════════════════════════════════════════ */
function TrainingModal({ assignment, onClose, onRefresh }) {
  const [tab, setTab]         = useState("content"); // content | quiz
  const [answers, setAnswers] = useState({});
  const [result, setResult]   = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress]     = useState(assignment.progress);
  const [savingProgress, setSavingProgress] = useState(false);

  const t = assignment.training;
  const questions = t?.questions || [];
  const lastAttempt = assignment.quizAttempts?.[0];

  const updateProgress = async (pct) => {
    if (assignment.status === "COMPLETED") return;
    setSavingProgress(true);
    try {
      await api.patch(`/lms/assignments/${assignment.id}/progress`, { progress: pct });
      setProgress(pct);
    } finally {
      setSavingProgress(false);
    }
  };

  const submitQuiz = async () => {
    if (Object.keys(answers).length < questions.length) {
      return alert("Please answer all questions before submitting.");
    }
    setSubmitting(true);
    try {
      const r = await api.post(`/lms/assignments/${assignment.id}/quiz`, { answers });
      setResult(r.data);
      onRefresh();
    } catch {
      alert("Failed to submit quiz.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderContent = () => {
    if (!t?.content) return <p className="text-gray-400 text-sm">No content available.</p>;
    // If content looks like HTML, render it; otherwise plain text
    const isHtml = t.content.trim().startsWith("<");
    if (isHtml) {
      return (
        <div
          className="prose prose-invert prose-sm max-w-none text-gray-300"
          dangerouslySetInnerHTML={{ __html: t.content }}
        />
      );
    }
    return <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{t.content}</p>;
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="p-6 border-b border-gray-700 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">{t?.title}</h2>
              <div className="flex gap-3 mt-1 text-xs text-gray-400">
                {t?.category && <span>📂 {t.category}</span>}
                {t?.duration > 0 && <span>⏱ {t.duration} min</span>}
                <span>🎯 Pass: {t?.passingScore}%</span>
                <span>❓ {questions.length} questions</span>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white text-xl ml-4">×</button>
          </div>

          {/* Progress bar */}
          {assignment.status !== "COMPLETED" && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5">
                <span>Reading progress</span>
                <span>{progress}%</span>
              </div>
              <div className="bg-gray-700 rounded-full h-2 cursor-pointer" title="Click to set progress"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pct = Math.round(((e.clientX - rect.left) / rect.width) * 100);
                  updateProgress(Math.max(0, Math.min(100, pct)));
                }}>
                <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
              {savingProgress && <p className="text-xs text-gray-500 mt-1">Saving...</p>}
              <div className="flex gap-2 mt-2">
                {[25, 50, 75, 100].map(p => (
                  <button key={p} onClick={() => updateProgress(p)}
                    className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                      progress >= p ? "border-blue-500 text-blue-400 bg-blue-500/10" : "border-gray-700 text-gray-500 hover:border-gray-500"
                    }`}>{p}%</button>
                ))}
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 mt-4">
            {["content", "quiz"].map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
                  tab === t ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
                }`}>{t}</button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === "content" && renderContent()}

          {tab === "quiz" && (
            <div>
              {/* Last attempt info */}
              {lastAttempt && (
                <div className={`mb-4 p-4 rounded-xl border ${
                  lastAttempt.passed
                    ? "bg-green-500/10 border-green-500/30"
                    : "bg-red-500/10 border-red-500/30"
                }`}>
                  <p className="text-sm font-medium text-white">
                    {lastAttempt.passed ? "✅ Passed" : "❌ Failed"} — Last attempt score: {lastAttempt.score}%
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">Attempt #{lastAttempt.attemptNo}</p>
                </div>
              )}

              {/* Quiz result */}
              {result && (
                <div className={`mb-6 p-5 rounded-xl border text-center ${
                  result.passed
                    ? "bg-green-500/10 border-green-500/30"
                    : "bg-red-500/10 border-red-500/30"
                }`}>
                  <p className="text-3xl font-black text-white mb-1">{result.score}%</p>
                  <p className={`text-sm font-semibold ${result.passed ? "text-green-400" : "text-red-400"}`}>
                    {result.passed ? "🎉 Congratulations! You passed!" : "Try again to improve your score."}
                  </p>
                  {result.certificate && (
                    <p className="text-xs text-yellow-300 mt-2">🏆 Certificate issued: {result.certificate.certificateNo}</p>
                  )}
                </div>
              )}

              {/* Questions */}
              {questions.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">No quiz questions for this training.</p>
              ) : (
                <div className="space-y-6">
                  {questions.map((q, qi) => {
                    let opts = [];
                    try { opts = JSON.parse(q.options); } catch { opts = q.options || []; }
                    const qResult = result?.result?.[q.id];
                    return (
                      <div key={q.id} className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                        <p className="text-sm font-medium text-white mb-3">
                          <span className="text-gray-500 mr-2">Q{qi + 1}.</span>
                          {q.question}
                          <span className="text-xs text-gray-500 ml-2">({q.points} pt{q.points !== 1 ? "s" : ""})</span>
                        </p>
                        <div className="space-y-2">
                          {opts.map((opt, oi) => {
                            const selected = answers[q.id] === oi;
                            let optClass = "border-gray-600 text-gray-300";
                            if (qResult) {
                              if (oi === qResult.correctAnswer) optClass = "border-green-500 bg-green-500/10 text-green-300";
                              else if (selected && !qResult.correct) optClass = "border-red-500 bg-red-500/10 text-red-300";
                            } else if (selected) {
                              optClass = "border-blue-500 bg-blue-500/10 text-blue-300";
                            }
                            return (
                              <button key={oi} disabled={!!result}
                                onClick={() => setAnswers(prev => ({ ...prev, [q.id]: oi }))}
                                className={`w-full text-left px-4 py-2.5 rounded-lg border text-sm transition-all ${optClass} ${!result ? "hover:border-gray-400" : ""}`}>
                                <span className="mr-2 text-gray-500 font-mono text-xs">{String.fromCharCode(65 + oi)}.</span>
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {!result && (
                    <button onClick={submitQuiz} disabled={submitting || assignment.status === "COMPLETED"}
                      className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-semibold text-sm disabled:opacity-50 transition-colors">
                      {submitting ? "Submitting..." : assignment.status === "COMPLETED" ? "Already Completed" : "Submit Quiz"}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   CERTIFICATE PREVIEW MODAL
═══════════════════════════════════════════════════════════ */
function CertificateModal({ certificate, onClose }) {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const print = () => {
    const win = window.open("", "_blank");
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Certificate — ${certificate.training?.title}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Inter:wght@400;600&display=swap');
          body { margin: 0; padding: 40px; font-family: 'Inter', sans-serif; background: #fff; }
          .cert { border: 12px solid #1d4ed8; max-width: 800px; margin: 0 auto; padding: 60px; text-align: center; position: relative; }
          .cert::before { content: ''; position: absolute; inset: 8px; border: 2px solid #93c5fd; pointer-events: none; }
          h1 { font-family: 'Playfair Display', serif; font-size: 42px; color: #1e3a8a; margin-bottom: 8px; }
          .subtitle { color: #6b7280; font-size: 14px; letter-spacing: 4px; text-transform: uppercase; margin-bottom: 40px; }
          .name { font-family: 'Playfair Display', serif; font-size: 36px; color: #111827; border-bottom: 2px solid #3b82f6; display: inline-block; padding: 0 20px 8px; margin: 20px 0; }
          .course { font-size: 22px; color: #1e40af; font-weight: 600; margin: 20px 0; }
          .desc { color: #6b7280; font-size: 14px; margin: 12px 0 40px; }
          .meta { display: flex; justify-content: space-between; margin-top: 50px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
          .meta div { text-align: center; }
          .meta p { font-size: 12px; color: #9ca3af; margin: 4px 0 0; }
          @media print { body { padding: 0; } .cert { border-color: #1d4ed8; } }
        </style>
      </head>
      <body>
        <div class="cert">
          <div class="subtitle">Certificate of Completion</div>
          <h1>🏆 Achievement Unlocked</h1>
          <p style="color:#6b7280;font-size:15px;margin-bottom:10px;">This certifies that</p>
          <div class="name">${user.name || "Employee"}</div>
          <p style="color:#6b7280;font-size:15px;">has successfully completed</p>
          <div class="course">${certificate.training?.title || "Training Program"}</div>
          ${certificate.training?.category ? `<p class="desc">Category: ${certificate.training.category}</p>` : ""}
          <div class="meta">
            <div><strong>${certificate.certificateNo}</strong><p>Certificate No.</p></div>
            <div><strong>${new Date(certificate.issuedAt).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}</strong><p>Issued On</p></div>
            ${certificate.training?.duration ? `<div><strong>${certificate.training.duration} min</strong><p>Duration</p></div>` : ""}
          </div>
        </div>
        <script>window.print();</script>
      </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6 text-center">
        <div className="text-5xl mb-3">🏆</div>
        <h2 className="text-xl font-bold text-white mb-1">{certificate.training?.title}</h2>
        <p className="text-sm text-gray-400 mb-4">{certificate.training?.category}</p>
        <div className="bg-gray-800 rounded-xl p-4 mb-6 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Certificate No.</span>
            <span className="text-white font-mono text-xs">{certificate.certificateNo}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Issued On</span>
            <span className="text-white">{new Date(certificate.issuedAt).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })}</span>
          </div>
          {certificate.training?.duration > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Duration</span>
              <span className="text-white">{certificate.training.duration} min</span>
            </div>
          )}
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-gray-700 text-white text-sm hover:bg-gray-600">Close</button>
          <button onClick={print} className="flex-1 py-2.5 rounded-xl bg-yellow-600 text-white text-sm hover:bg-yellow-500 font-semibold">
            🖨 Print / Download
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════ */
export default function MyTrainings() {
  const [assignments,   setAssignments]   = useState([]);
  const [certificates,  setCertificates]  = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [tab,           setTab]           = useState("trainings"); // trainings | certificates
  const [modal,         setModal]         = useState(null); // { type:"training"|"cert", data }

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get("/lms/my-trainings"),
      api.get("/lms/my-certificates"),
    ]).then(([ta, ca]) => {
      setAssignments(ta.data.assignments || []);
      setCertificates(ca.data.certificates || []);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const stats = {
    total:      assignments.length,
    pending:    assignments.filter(a => a.status === "PENDING").length,
    inProgress: assignments.filter(a => a.status === "IN_PROGRESS").length,
    completed:  assignments.filter(a => a.status === "COMPLETED").length,
    certs:      certificates.length,
  };

  return (
    <Layout>
      <div className="p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">My Trainings</h1>
          <p className="text-sm text-gray-400 mt-0.5">Complete assigned courses and earn certificates</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          {[
            { label: "Total",       value: stats.total,      color: "text-white" },
            { label: "Pending",     value: stats.pending,    color: "text-yellow-400" },
            { label: "In Progress", value: stats.inProgress, color: "text-blue-400" },
            { label: "Completed",   value: stats.completed,  color: "text-green-400" },
            { label: "Certificates",value: stats.certs,      color: "text-yellow-300" },
          ].map(s => (
            <div key={s.label} className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-3 text-center">
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 bg-gray-800/50 border border-gray-700/50 rounded-xl p-1 w-fit">
          {[
            { key: "trainings",    label: "Trainings",    count: stats.total },
            { key: "certificates", label: "Certificates", count: stats.certs },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                tab === t.key ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
              }`}>
              {t.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === t.key ? "bg-white/20" : "bg-gray-700"}`}>{t.count}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading...</div>
        ) : tab === "trainings" ? (
          assignments.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-4xl mb-3">📚</p>
              <p className="text-gray-400">No trainings assigned to you yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {assignments.map(a => {
                const t = a.training;
                const questionCount = t?.questions?.length || 0;
                const lastAttempt = a.quizAttempts?.[0];
                return (
                  <div key={a.id}
                    className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-5 hover:border-gray-600 transition-all cursor-pointer"
                    onClick={() => setModal({ type: "training", data: a })}>
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${
                        a.status === "COMPLETED" ? "bg-green-500/20" :
                        a.status === "IN_PROGRESS" ? "bg-blue-500/20" : "bg-gray-700"
                      }`}>
                        {a.status === "COMPLETED" ? "✅" : a.status === "IN_PROGRESS" ? "📖" : "📚"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-bold text-white">{t?.title}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOR[a.status]}`}>{a.status}</span>
                          {a.certificate && (
                            <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded-full">🏆 Certified</span>
                          )}
                        </div>
                        {t?.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{t.description}</p>}
                        <div className="flex gap-3 mt-1.5 text-xs text-gray-500">
                          {t?.category && <span>📂 {t.category}</span>}
                          {t?.duration > 0 && <span>⏱ {t.duration} min</span>}
                          {questionCount > 0 && <span>❓ {questionCount} questions</span>}
                          {a.dueDate && (
                            <span className={new Date(a.dueDate) < new Date() && a.status !== "COMPLETED" ? "text-red-400" : ""}>
                              📅 Due: {new Date(a.dueDate).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                            </span>
                          )}
                        </div>
                        {/* Progress bar */}
                        {a.status !== "PENDING" && (
                          <div className="mt-2 bg-gray-700 rounded-full h-1.5">
                            <div className={`h-1.5 rounded-full transition-all ${a.status === "COMPLETED" ? "bg-green-500" : "bg-blue-500"}`}
                              style={{ width: `${a.progress}%` }} />
                          </div>
                        )}
                        {lastAttempt && (
                          <p className="text-xs text-gray-500 mt-1">
                            Last quiz: {lastAttempt.score}% ({lastAttempt.passed ? "✅ Passed" : "❌ Failed"}) · Attempt #{lastAttempt.attemptNo}
                          </p>
                        )}
                      </div>
                      <div className="flex-shrink-0 text-xs text-gray-500 text-right">
                        <p>{a.progress}%</p>
                        <p className="text-gray-600 mt-0.5">progress</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          // Certificates tab
          certificates.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-4xl mb-3">🏆</p>
              <p className="text-gray-400">No certificates earned yet. Complete a training quiz to earn one!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {certificates.map(c => (
                <div key={c.id}
                  className="bg-gradient-to-br from-yellow-500/10 to-amber-600/5 border border-yellow-500/20 rounded-2xl p-6 cursor-pointer hover:border-yellow-500/40 transition-all"
                  onClick={() => setModal({ type: "cert", data: c })}>
                  <div className="text-3xl mb-3">🏆</div>
                  <h3 className="text-base font-bold text-white mb-1">{c.training?.title}</h3>
                  {c.training?.category && <p className="text-xs text-gray-400 mb-3">{c.training.category}</p>}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Certificate No.</span>
                      <span className="text-yellow-300 font-mono">{c.certificateNo}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Issued</span>
                      <span className="text-white">{new Date(c.issuedAt).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })}</span>
                    </div>
                  </div>
                  <p className="text-xs text-yellow-400/60 mt-3">Click to view & print →</p>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Modals */}
      {modal?.type === "training" && (
        <TrainingModal
          assignment={modal.data}
          onClose={() => setModal(null)}
          onRefresh={load}
        />
      )}
      {modal?.type === "cert" && (
        <CertificateModal
          certificate={modal.data}
          onClose={() => setModal(null)}
        />
      )}
    </Layout>
  );
}
