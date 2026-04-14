import { useState, useEffect, useCallback } from "react";
import Layout from "../../components/Layout";
import api from "../../api/axios";
import {
  FaPlus, FaTimes, FaEdit, FaTrash, FaUsers, FaChevronRight,
  FaArrowLeft, FaStar, FaCheckCircle, FaTimesCircle, FaClock,
  FaPrint, FaUserPlus, FaBriefcase, FaMapMarkerAlt, FaMoneyBillWave,
  FaCalendarAlt, FaFileAlt,
} from "react-icons/fa";

/* ── Constants ── */
const STAGES = ["APPLIED", "SCREENING", "INTERVIEW", "OFFER", "HIRED", "REJECTED"];
const STAGE_COLORS = {
  APPLIED:   { bg: "bg-blue-100",   text: "text-blue-700",   border: "border-blue-200",   dot: "bg-blue-400"   },
  SCREENING: { bg: "bg-yellow-100", text: "text-yellow-700", border: "border-yellow-200", dot: "bg-yellow-400" },
  INTERVIEW: { bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-200", dot: "bg-purple-400" },
  OFFER:     { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-200", dot: "bg-orange-400" },
  HIRED:     { bg: "bg-green-100",  text: "text-green-700",  border: "border-green-200",  dot: "bg-green-400"  },
  REJECTED:  { bg: "bg-red-100",    text: "text-red-700",    border: "border-red-200",    dot: "bg-red-400"    },
};
const NEXT_STAGE = { APPLIED: "SCREENING", SCREENING: "INTERVIEW", INTERVIEW: "OFFER", OFFER: "HIRED" };
const JOB_TYPES  = ["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP"];
const TYPE_LABEL = { FULL_TIME: "Full Time", PART_TIME: "Part Time", CONTRACT: "Contract", INTERNSHIP: "Internship" };
const REC_COLORS = { HIRE: "text-green-600", REJECT: "text-red-500", HOLD: "text-yellow-600" };

const fmtDate = d => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
const fmtSalary = n => n ? `₹${Number(n).toLocaleString("en-IN")}` : null;

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════ */
export default function ATS() {
  const [tab, setTab] = useState("jobs"); // "jobs" | "pipeline"
  const [jobs,       setJobs]       = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [selJob,     setSelJob]     = useState(null);
  const [loading,    setLoading]    = useState(false);

  // Panels / Modals
  const [jobModal,       setJobModal]       = useState(null);  // null | "create" | job-obj
  const [candidatePanel, setCandidatePanel] = useState(null);  // null | candidate-obj
  const [addCandModal,   setAddCandModal]   = useState(false);
  const [feedbackModal,  setFeedbackModal]  = useState(false);
  const [offerModal,     setOfferModal]     = useState(false);
  const [hireModal,      setHireModal]      = useState(false);

  /* ── Load jobs ── */
  const loadJobs = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get("/ats/jobs"); setJobs(data.jobs); }
    catch { /* ignore */ }
    setLoading(false);
  }, []);

  /* ── Load candidates for selected job ── */
  const loadCandidates = useCallback(async (jobId) => {
    if (!jobId) return;
    try { const { data } = await api.get("/ats/candidates", { params: { jobId } }); setCandidates(data.candidates); }
    catch { /* ignore */ }
  }, []);

  useEffect(() => { loadJobs(); }, [loadJobs]);
  useEffect(() => { if (selJob) loadCandidates(selJob.id); }, [selJob, loadCandidates]);

  const openPipeline = (job) => { setSelJob(job); setTab("pipeline"); setCandidates([]); };

  /* ── Candidate detail ── */
  const openCandidate = async (id) => {
    try {
      const { data } = await api.get(`/ats/candidates/${id}`);
      setCandidatePanel(data.candidate);
    } catch { /* ignore */ }
  };

  const refreshCandidate = async () => {
    if (!candidatePanel) return;
    try {
      const { data } = await api.get(`/ats/candidates/${candidatePanel.id}`);
      setCandidatePanel(data.candidate);
    } catch { /* ignore */ }
    if (selJob) loadCandidates(selJob.id);
  };

  /* ── Move stage ── */
  const moveStage = async (candidateId, stage) => {
    try {
      await api.patch(`/ats/candidates/${candidateId}/stage`, { stage });
      if (selJob) loadCandidates(selJob.id);
      if (candidatePanel?.id === candidateId) refreshCandidate();
    } catch { /* ignore */ }
  };

  const byStage = (stage) => candidates.filter(c => c.stage === stage);
  const avgRating = (feedbacks) => feedbacks?.length
    ? (feedbacks.reduce((s, f) => s + f.rating, 0) / feedbacks.length).toFixed(1) : null;

  return (
    <Layout>
      <div className="p-4 md:p-6 min-h-screen bg-gray-50">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            {tab === "pipeline" && (
              <button onClick={() => setTab("jobs")} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
                <FaArrowLeft className="text-gray-500" />
              </button>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                {tab === "jobs" ? "Recruitment / ATS" : selJob?.title}
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {tab === "jobs" ? "Manage job postings and hiring pipeline"
                  : `${selJob?.department || ""} · ${candidates.length} candidate${candidates.length !== 1 ? "s" : ""}`}
              </p>
            </div>
          </div>
          {tab === "jobs" && (
            <button
              onClick={() => setJobModal("create")}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
            >
              <FaPlus /> New Job Posting
            </button>
          )}
          {tab === "pipeline" && (
            <button
              onClick={() => setAddCandModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
            >
              <FaPlus /> Add Candidate
            </button>
          )}
        </div>

        {/* ══════════════ JOBS TAB ══════════════ */}
        {tab === "jobs" && (
          <div>
            {loading ? (
              <div className="text-center py-20 text-gray-400">Loading...</div>
            ) : jobs.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <FaBriefcase className="text-5xl mx-auto mb-3 opacity-20" />
                <p>No job postings yet</p>
                <button onClick={() => setJobModal("create")} className="mt-3 text-indigo-600 hover:underline text-sm">Create your first job posting</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {jobs.map(job => {
                  const statusC = job.status === "OPEN" ? "bg-green-100 text-green-700" : job.status === "DRAFT" ? "bg-gray-100 text-gray-600" : "bg-red-100 text-red-600";
                  return (
                    <div key={job.id} className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusC} mb-1.5 inline-block`}>{job.status}</span>
                          <h3 className="font-bold text-gray-800 text-base leading-tight">{job.title}</h3>
                          {job.department && <p className="text-xs text-gray-500 mt-0.5">{job.department}</p>}
                        </div>
                        <div className="flex gap-1 ml-2">
                          <button onClick={() => setJobModal(job)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><FaEdit size={12} /></button>
                          <button onClick={async () => { await api.delete(`/ats/jobs/${job.id}`); loadJobs(); }} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><FaTrash size={12} /></button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-3 text-xs text-gray-500">
                        {job.location && <span className="flex items-center gap-1"><FaMapMarkerAlt />{job.location}</span>}
                        <span className="flex items-center gap-1"><FaBriefcase />{TYPE_LABEL[job.type]}</span>
                        {job.salaryMin && <span className="flex items-center gap-1"><FaMoneyBillWave />{fmtSalary(job.salaryMin)}{job.salaryMax ? ` – ${fmtSalary(job.salaryMax)}` : "+"}</span>}
                        {job.closingDate && <span className="flex items-center gap-1"><FaCalendarAlt />Closes {fmtDate(job.closingDate)}</span>}
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <FaUsers className="text-gray-400" />
                          <span><strong>{job._count.candidates}</strong> candidate{job._count.candidates !== 1 ? "s" : ""}</span>
                        </div>
                        <button
                          onClick={() => openPipeline(job)}
                          className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                        >
                          View Pipeline <FaChevronRight size={10} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══════════════ PIPELINE TAB ══════════════ */}
        {tab === "pipeline" && (
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-4 min-w-max">
              {STAGES.map(stage => {
                const cards = byStage(stage);
                const sc = STAGE_COLORS[stage];
                return (
                  <div key={stage} className="w-64 flex-shrink-0">
                    {/* Column header */}
                    <div className={`flex items-center justify-between px-3 py-2 rounded-xl mb-3 ${sc.bg} ${sc.border} border`}>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${sc.dot}`} />
                        <span className={`text-xs font-bold ${sc.text}`}>{stage}</span>
                      </div>
                      <span className={`text-xs font-semibold ${sc.text} bg-white/60 px-1.5 py-0.5 rounded-full`}>{cards.length}</span>
                    </div>

                    {/* Cards */}
                    <div className="space-y-2">
                      {cards.map(c => {
                        const avg = avgRating(c.feedbacks);
                        return (
                          <div
                            key={c.id}
                            onClick={() => openCandidate(c.id)}
                            className="bg-white rounded-xl border border-gray-100 p-3.5 cursor-pointer hover:shadow-md hover:border-indigo-200 transition-all"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-800 text-sm truncate">{c.name}</p>
                                <p className="text-xs text-gray-500 truncate">{c.email}</p>
                              </div>
                              {avg && (
                                <div className="flex items-center gap-0.5 text-amber-500 text-xs ml-2 flex-shrink-0">
                                  <FaStar size={10} /><span className="font-semibold">{avg}</span>
                                </div>
                              )}
                            </div>
                            <div className="text-[10px] text-gray-400">{fmtDate(c.createdAt)}</div>
                            {/* Move buttons */}
                            {NEXT_STAGE[stage] && (
                              <button
                                onClick={e => { e.stopPropagation(); moveStage(c.id, NEXT_STAGE[stage]); }}
                                className="mt-2 w-full text-[10px] font-semibold text-indigo-600 border border-indigo-200 rounded-lg py-1 hover:bg-indigo-50 transition-colors"
                              >
                                Move to {NEXT_STAGE[stage]} →
                              </button>
                            )}
                            {stage !== "REJECTED" && stage !== "HIRED" && (
                              <button
                                onClick={e => { e.stopPropagation(); moveStage(c.id, "REJECTED"); }}
                                className="mt-1 w-full text-[10px] font-semibold text-red-400 border border-red-100 rounded-lg py-1 hover:bg-red-50 transition-colors"
                              >
                                Reject
                              </button>
                            )}
                          </div>
                        );
                      })}
                      {cards.length === 0 && (
                        <div className="text-center py-6 text-gray-300 text-xs border-2 border-dashed border-gray-100 rounded-xl">Empty</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════
          CANDIDATE DETAIL PANEL (side panel)
      ══════════════════════════════════════════════════ */}
      {candidatePanel && (
        <div className="fixed inset-0 z-40 flex">
          <div className="flex-1 bg-black/30" onClick={() => setCandidatePanel(null)} />
          <div className="w-full max-w-lg bg-white h-full shadow-2xl overflow-y-auto flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-lg font-bold text-gray-800">{candidatePanel.name}</h2>
                <p className="text-xs text-gray-500">{candidatePanel.job?.title}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STAGE_COLORS[candidatePanel.stage]?.bg} ${STAGE_COLORS[candidatePanel.stage]?.text}`}>
                  {candidatePanel.stage}
                </span>
                <button onClick={() => setCandidatePanel(null)} className="p-2 hover:bg-gray-100 rounded-lg"><FaTimes /></button>
              </div>
            </div>

            <div className="flex-1 p-5 space-y-5">
              {/* Basic info */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-400 text-xs">Email</span><p className="font-medium text-gray-800 truncate">{candidatePanel.email}</p></div>
                <div><span className="text-gray-400 text-xs">Phone</span><p className="font-medium text-gray-800">{candidatePanel.phone || "—"}</p></div>
                <div><span className="text-gray-400 text-xs">Applied</span><p className="font-medium text-gray-800">{fmtDate(candidatePanel.createdAt)}</p></div>
                <div><span className="text-gray-400 text-xs">Added By</span><p className="font-medium text-gray-800">{candidatePanel.addedBy?.name}</p></div>
              </div>
              {candidatePanel.resumeUrl && (
                <a href={candidatePanel.resumeUrl} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 text-indigo-600 text-sm hover:underline">
                  <FaFileAlt /> View Resume
                </a>
              )}
              {candidatePanel.notes && (
                <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600 italic">"{candidatePanel.notes}"</div>
              )}

              {/* Stage actions */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Move Stage</p>
                <div className="flex flex-wrap gap-2">
                  {STAGES.filter(s => s !== candidatePanel.stage && s !== "REJECTED").map(s => (
                    <button key={s} onClick={async () => { await moveStage(candidatePanel.id, s); refreshCandidate(); }}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium border transition-all ${STAGE_COLORS[s].bg} ${STAGE_COLORS[s].text} ${STAGE_COLORS[s].border} hover:shadow-sm`}>
                      → {s}
                    </button>
                  ))}
                  {candidatePanel.stage !== "REJECTED" && (
                    <button onClick={async () => { await moveStage(candidatePanel.id, "REJECTED"); refreshCandidate(); }}
                      className="text-xs px-3 py-1.5 rounded-lg font-medium border bg-red-50 text-red-600 border-red-200 hover:shadow-sm">
                      Reject
                    </button>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setFeedbackModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 text-white rounded-lg text-xs font-medium hover:bg-purple-700">
                  <FaStar /> Add Feedback
                </button>
                <button onClick={() => setOfferModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-orange-500 text-white rounded-lg text-xs font-medium hover:bg-orange-600">
                  <FaFileAlt /> Offer Letter
                </button>
                {candidatePanel.offerContent && (
                  <button onClick={() => printOffer(candidatePanel)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-gray-700 text-white rounded-lg text-xs font-medium hover:bg-gray-800">
                    <FaPrint /> Print Offer
                  </button>
                )}
                {(candidatePanel.stage === "OFFER" || candidatePanel.stage === "HIRED") && (
                  <button onClick={() => setHireModal(true)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700">
                    <FaUserPlus /> {candidatePanel.stage === "HIRED" ? "Already Hired" : "Convert to Employee"}
                  </button>
                )}
              </div>

              {/* Interview Feedback */}
              {candidatePanel.feedbacks?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Interview Feedback</p>
                  <div className="space-y-3">
                    {candidatePanel.feedbacks.map(f => (
                      <div key={f.id} className="border rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-gray-700">{f.round}</span>
                          <div className="flex items-center gap-2">
                            <div className="flex">
                              {[1,2,3,4,5].map(n => <FaStar key={n} size={12} className={n <= f.rating ? "text-amber-400" : "text-gray-200"} />)}
                            </div>
                            <span className={`text-xs font-bold ${REC_COLORS[f.recommendation]}`}>{f.recommendation}</span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mb-1">by {f.interviewer?.name}</p>
                        {f.strengths  && <p className="text-xs text-green-700 mt-1"><strong>✓</strong> {f.strengths}</p>}
                        {f.weaknesses && <p className="text-xs text-red-600 mt-1"><strong>✗</strong> {f.weaknesses}</p>}
                        {f.notes      && <p className="text-xs text-gray-500 mt-1 italic">"{f.notes}"</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Offer details */}
              {candidatePanel.offerSalary && (
                <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
                  <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide mb-2">Offer Details</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-xs text-gray-500">Salary</span><p className="font-bold text-gray-800">{fmtSalary(candidatePanel.offerSalary)}/mo</p></div>
                    <div><span className="text-xs text-gray-500">Joining</span><p className="font-bold text-gray-800">{fmtDate(candidatePanel.joiningDate)}</p></div>
                  </div>
                </div>
              )}

              {/* Stage History */}
              {candidatePanel.stageHistory?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Stage History</p>
                  <div className="relative border-l-2 border-gray-100 ml-2 space-y-3">
                    {candidatePanel.stageHistory.map((h, idx) => (
                      <div key={h.id} className="pl-4 relative">
                        <div className={`absolute -left-[9px] top-0.5 w-4 h-4 rounded-full border-2 border-white ${STAGE_COLORS[h.toStage]?.dot || "bg-gray-300"}`} />
                        <p className="text-xs font-semibold text-gray-700">
                          {h.fromStage ? `${h.fromStage} → ` : ""}{h.toStage}
                        </p>
                        <p className="text-[10px] text-gray-400">{h.changedBy?.name} · {fmtDate(h.changedAt)}</p>
                        {h.notes && <p className="text-[10px] text-gray-500 italic mt-0.5">"{h.notes}"</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══ JOB MODAL ══ */}
      {jobModal && (
        <JobModal
          job={jobModal === "create" ? null : jobModal}
          onClose={() => setJobModal(null)}
          onSave={() => { setJobModal(null); loadJobs(); }}
        />
      )}

      {/* ══ ADD CANDIDATE MODAL ══ */}
      {addCandModal && selJob && (
        <AddCandidateModal
          jobId={selJob.id}
          onClose={() => setAddCandModal(false)}
          onSave={() => { setAddCandModal(false); loadCandidates(selJob.id); }}
        />
      )}

      {/* ══ FEEDBACK MODAL ══ */}
      {feedbackModal && candidatePanel && (
        <FeedbackModal
          candidateId={candidatePanel.id}
          candidateName={candidatePanel.name}
          onClose={() => setFeedbackModal(false)}
          onSave={() => { setFeedbackModal(false); refreshCandidate(); }}
        />
      )}

      {/* ══ OFFER MODAL ══ */}
      {offerModal && candidatePanel && (
        <OfferModal
          candidate={candidatePanel}
          job={selJob}
          onClose={() => setOfferModal(false)}
          onSave={() => { setOfferModal(false); refreshCandidate(); }}
        />
      )}

      {/* ══ HIRE MODAL ══ */}
      {hireModal && candidatePanel && (
        <HireModal
          candidate={candidatePanel}
          job={selJob}
          onClose={() => setHireModal(false)}
          onSave={() => { setHireModal(false); refreshCandidate(); loadCandidates(selJob?.id); }}
        />
      )}
    </Layout>
  );
}

/* ══════════════════════════════════════════════════════════
   PRINT OFFER LETTER
══════════════════════════════════════════════════════════ */
function printOffer(candidate) {
  const w = window.open("", "_blank");
  w.document.write(`
    <html><head><title>Offer Letter — ${candidate.name}</title>
    <style>
      body { font-family: Georgia, serif; max-width: 750px; margin: 60px auto; color: #1a1a1a; line-height: 1.7; }
      h1 { font-size: 22px; color: #1a1a1a; margin-bottom: 4px; }
      .sub { color: #555; font-size: 14px; margin-bottom: 30px; }
      .content { white-space: pre-wrap; font-size: 15px; }
      @media print { body { margin: 40px; } }
    </style></head><body>
    <h1>Offer Letter</h1>
    <div class="sub">For: ${candidate.name} &nbsp;|&nbsp; ${candidate.job?.title || ""}</div>
    <div class="content">${candidate.offerContent || ""}</div>
    <script>window.print();</script>
    </body></html>
  `);
  w.document.close();
}

/* ══════════════════════════════════════════════════════════
   JOB MODAL
══════════════════════════════════════════════════════════ */
function JobModal({ job, onClose, onSave }) {
  const [form, setForm] = useState({
    title: job?.title || "", department: job?.department || "",
    description: job?.description || "", requirements: job?.requirements || "",
    location: job?.location || "", type: job?.type || "FULL_TIME",
    status: job?.status || "OPEN",
    salaryMin: job?.salaryMin || "", salaryMax: job?.salaryMax || "",
    closingDate: job?.closingDate ? job.closingDate.split("T")[0] : "",
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  const save = async () => {
    if (!form.title || !form.description) { setError("Title and description required"); return; }
    setSaving(true); setError("");
    try {
      if (job) await api.put(`/ats/jobs/${job.id}`, form);
      else     await api.post("/ats/jobs", form);
      onSave();
    } catch (err) { setError(err?.response?.data?.msg || "Failed to save"); }
    setSaving(false);
  };

  return (
    <Modal title={job ? "Edit Job Posting" : "New Job Posting"} onClose={onClose} wide>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Job Title *" colSpan>
            <input value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} className={INPUT} placeholder="e.g. Senior Data Analyst" />
          </Field>
          <Field label="Department">
            <input value={form.department} onChange={e => setForm(p => ({...p, department: e.target.value}))} className={INPUT} placeholder="e.g. Analytics" />
          </Field>
          <Field label="Location">
            <input value={form.location} onChange={e => setForm(p => ({...p, location: e.target.value}))} className={INPUT} placeholder="e.g. Remote / Mumbai" />
          </Field>
          <Field label="Type">
            <select value={form.type} onChange={e => setForm(p => ({...p, type: e.target.value}))} className={INPUT}>
              {JOB_TYPES.map(t => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select value={form.status} onChange={e => setForm(p => ({...p, status: e.target.value}))} className={INPUT}>
              {["DRAFT","OPEN","CLOSED"].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Closing Date">
            <input type="date" value={form.closingDate} onChange={e => setForm(p => ({...p, closingDate: e.target.value}))} className={INPUT} />
          </Field>
          <Field label="Min Salary (₹/mo)">
            <input type="number" value={form.salaryMin} onChange={e => setForm(p => ({...p, salaryMin: e.target.value}))} className={INPUT} placeholder="25000" />
          </Field>
          <Field label="Max Salary (₹/mo)">
            <input type="number" value={form.salaryMax} onChange={e => setForm(p => ({...p, salaryMax: e.target.value}))} className={INPUT} placeholder="50000" />
          </Field>
        </div>
        <Field label="Description *">
          <textarea rows={3} value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} className={INPUT} placeholder="Job description..." />
        </Field>
        <Field label="Requirements">
          <textarea rows={3} value={form.requirements} onChange={e => setForm(p => ({...p, requirements: e.target.value}))} className={INPUT} placeholder="Skills, experience, qualifications..." />
        </Field>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <ModalFooter onClose={onClose} onSave={save} saving={saving} saveLabel={job ? "Update" : "Create Job"} />
      </div>
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════════
   ADD CANDIDATE MODAL
══════════════════════════════════════════════════════════ */
function AddCandidateModal({ jobId, onClose, onSave }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", resumeUrl: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  const save = async () => {
    if (!form.name || !form.email) { setError("Name and email required"); return; }
    setSaving(true); setError("");
    try {
      await api.post("/ats/candidates", { ...form, jobId });
      onSave();
    } catch (err) { setError(err?.response?.data?.msg || "Failed to add"); }
    setSaving(false);
  };

  return (
    <Modal title="Add Candidate" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Full Name *"><input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} className={INPUT} placeholder="John Doe" /></Field>
        <Field label="Email *"><input type="email" value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} className={INPUT} placeholder="john@example.com" /></Field>
        <Field label="Phone"><input value={form.phone} onChange={e => setForm(p => ({...p, phone: e.target.value}))} className={INPUT} placeholder="+91 9876543210" /></Field>
        <Field label="Resume URL"><input value={form.resumeUrl} onChange={e => setForm(p => ({...p, resumeUrl: e.target.value}))} className={INPUT} placeholder="https://drive.google.com/..." /></Field>
        <Field label="Notes"><textarea rows={2} value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))} className={INPUT} placeholder="Any initial notes..." /></Field>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <ModalFooter onClose={onClose} onSave={save} saving={saving} saveLabel="Add Candidate" />
      </div>
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════════
   FEEDBACK MODAL
══════════════════════════════════════════════════════════ */
function FeedbackModal({ candidateId, candidateName, onClose, onSave }) {
  const [form, setForm] = useState({ round: "Round 1", rating: 3, strengths: "", weaknesses: "", recommendation: "HOLD", notes: "" });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  const save = async () => {
    setSaving(true); setError("");
    try {
      await api.post(`/ats/candidates/${candidateId}/feedback`, form);
      onSave();
    } catch (err) { setError(err?.response?.data?.msg || "Failed"); }
    setSaving(false);
  };

  return (
    <Modal title={`Interview Feedback — ${candidateName}`} onClose={onClose}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Round">
            <input value={form.round} onChange={e => setForm(p => ({...p, round: e.target.value}))} className={INPUT} placeholder="e.g. Technical Round 1" />
          </Field>
          <Field label="Recommendation">
            <select value={form.recommendation} onChange={e => setForm(p => ({...p, recommendation: e.target.value}))} className={INPUT}>
              <option value="HIRE">Hire</option>
              <option value="HOLD">Hold</option>
              <option value="REJECT">Reject</option>
            </select>
          </Field>
        </div>
        <Field label={`Rating: ${form.rating}/5`}>
          <div className="flex gap-2 mt-1">
            {[1,2,3,4,5].map(n => (
              <button key={n} onClick={() => setForm(p => ({...p, rating: n}))}
                className={`text-2xl transition-transform hover:scale-110 ${n <= form.rating ? "text-amber-400" : "text-gray-200"}`}>
                ★
              </button>
            ))}
          </div>
        </Field>
        <Field label="Strengths"><textarea rows={2} value={form.strengths} onChange={e => setForm(p => ({...p, strengths: e.target.value}))} className={INPUT} placeholder="Strong communication, problem solving..." /></Field>
        <Field label="Areas of Improvement"><textarea rows={2} value={form.weaknesses} onChange={e => setForm(p => ({...p, weaknesses: e.target.value}))} className={INPUT} placeholder="Needs improvement in..." /></Field>
        <Field label="Additional Notes"><textarea rows={2} value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))} className={INPUT} placeholder="Any other observations..." /></Field>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <ModalFooter onClose={onClose} onSave={save} saving={saving} saveLabel="Submit Feedback" />
      </div>
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════════
   OFFER LETTER MODAL
══════════════════════════════════════════════════════════ */
function OfferModal({ candidate, job, onClose, onSave }) {
  const company = "Your Company Name";
  const [salary,      setSalary]      = useState(candidate.offerSalary || "");
  const [joiningDate, setJoiningDate] = useState(candidate.joiningDate ? candidate.joiningDate.split("T")[0] : "");
  const [content,     setContent]     = useState(candidate.offerContent || "");
  const [saving,      setSaving]      = useState(false);

  const generate = () => {
    const jDate = joiningDate ? new Date(joiningDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "[Joining Date]";
    const sal   = salary ? `₹${Number(salary).toLocaleString("en-IN")} per month` : "[Salary]";
    setContent(
`Dear ${candidate.name},

We are pleased to offer you the position of ${job?.title || "the role"} at ${company}.

After reviewing your application and interview performance, we are confident that you will be a valuable addition to our team.

Offer Details:
• Position       : ${job?.title || ""}
• Department     : ${job?.department || ""}
• Joining Date   : ${jDate}
• Compensation   : ${sal} (CTC)
• Work Location  : ${job?.location || "Office"}
• Employment Type: ${TYPE_LABEL[job?.type] || "Full Time"}

This offer is contingent upon successful completion of background verification and submission of required documents.

Please confirm your acceptance of this offer by replying to this letter within 3 working days.

We look forward to welcoming you to our team!

Warm Regards,
HR Department
${company}`
    );
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.post(`/ats/candidates/${candidate.id}/offer`, { offerSalary: salary, joiningDate, offerContent: content });
      onSave();
    } catch { /* ignore */ }
    setSaving(false);
  };

  return (
    <Modal title="Generate Offer Letter" onClose={onClose} wide>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Monthly Salary (₹)">
            <input type="number" value={salary} onChange={e => setSalary(e.target.value)} className={INPUT} placeholder="35000" />
          </Field>
          <Field label="Joining Date">
            <input type="date" value={joiningDate} onChange={e => setJoiningDate(e.target.value)} className={INPUT} />
          </Field>
        </div>
        <div className="flex justify-end">
          <button onClick={generate} className="text-sm px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 font-medium">
            ✨ Auto-Generate Letter
          </button>
        </div>
        <Field label="Offer Letter Content">
          <textarea rows={14} value={content} onChange={e => setContent(e.target.value)} className={`${INPUT} font-mono text-xs`} placeholder="Offer letter content..." />
        </Field>
        <ModalFooter onClose={onClose} onSave={save} saving={saving} saveLabel="Save & Move to Offer" />
      </div>
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════════
   HIRE MODAL — Convert to Employee
══════════════════════════════════════════════════════════ */
function HireModal({ candidate, job, onClose, onSave }) {
  const [form, setForm] = useState({
    role: "EMPLOYEE", designation: job?.title || "",
    department: job?.department || "", tempPassword: "",
  });
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState(null);

  const hire = async () => {
    if (!form.tempPassword) { setError("Set a temporary password for the employee"); return; }
    setSaving(true); setError("");
    try {
      const { data } = await api.post(`/ats/candidates/${candidate.id}/hire`, form);
      setSuccess(data.user);
    } catch (err) { setError(err?.response?.data?.msg || "Failed to create employee"); }
    setSaving(false);
  };

  if (success) return (
    <Modal title="Employee Created!" onClose={() => { onSave(); onClose(); }}>
      <div className="text-center py-4">
        <FaCheckCircle className="text-green-500 text-5xl mx-auto mb-3" />
        <p className="text-gray-700 font-semibold">{success.name} has been added as an employee.</p>
        <div className="bg-gray-50 rounded-xl p-4 mt-4 text-left text-sm space-y-1">
          <p><span className="text-gray-500">Email:</span> <strong>{success.email}</strong></p>
          <p><span className="text-gray-500">Role:</span> <strong>{success.role}</strong></p>
          <p><span className="text-gray-500">Department:</span> <strong>{success.department || "—"}</strong></p>
          <p className="text-orange-600 text-xs mt-2">⚠ Share the temporary password with the employee to log in.</p>
        </div>
        <button onClick={() => { onSave(); onClose(); }} className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700">Done</button>
      </div>
    </Modal>
  );

  return (
    <Modal title={`Convert to Employee — ${candidate.name}`} onClose={onClose}>
      <div className="space-y-3">
        <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-sm text-green-700 mb-1">
          A new employee account will be created with <strong>{candidate.email}</strong> as the login email.
        </div>
        <Field label="Role">
          <select value={form.role} onChange={e => setForm(p => ({...p, role: e.target.value}))} className={INPUT}>
            <option value="EMPLOYEE">Employee</option>
            <option value="MANAGER">Manager</option>
            <option value="HR">HR</option>
          </select>
        </Field>
        <Field label="Designation">
          <input value={form.designation} onChange={e => setForm(p => ({...p, designation: e.target.value}))} className={INPUT} />
        </Field>
        <Field label="Department">
          <input value={form.department} onChange={e => setForm(p => ({...p, department: e.target.value}))} className={INPUT} />
        </Field>
        <Field label="Temporary Password *">
          <input type="password" value={form.tempPassword} onChange={e => setForm(p => ({...p, tempPassword: e.target.value}))} className={INPUT} placeholder="Min 6 characters" />
        </Field>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <ModalFooter onClose={onClose} onSave={hire} saving={saving} saveLabel="Create Employee Account" saveClass="bg-green-600 hover:bg-green-700" />
      </div>
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════════
   SHARED UI HELPERS
══════════════════════════════════════════════════════════ */
const INPUT = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none";

function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${wide ? "max-w-2xl" : "max-w-md"} max-h-[90vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white rounded-t-2xl z-10">
          <h2 className="text-base font-bold text-gray-800">{title}</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><FaTimes /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children, colSpan }) {
  return (
    <div className={colSpan ? "col-span-2" : ""}>
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

function ModalFooter({ onClose, onSave, saving, saveLabel, saveClass }) {
  return (
    <div className="flex gap-2 pt-2">
      <button onClick={onClose} className="flex-1 py-2.5 border rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
      <button onClick={onSave} disabled={saving} className={`flex-1 py-2.5 text-white rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors ${saveClass || "bg-indigo-600 hover:bg-indigo-700"}`}>
        {saving ? "Saving..." : saveLabel}
      </button>
    </div>
  );
}
