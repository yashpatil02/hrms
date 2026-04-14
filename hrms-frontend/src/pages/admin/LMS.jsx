import { useState, useEffect, useCallback } from "react";
import Layout from "../../components/Layout";
import api from "../../services/api";

/* ── helpers ─────────────────────────────────────────────── */
const STATUS_COLOR = {
  DRAFT:     "bg-gray-500/20 text-gray-300",
  PUBLISHED: "bg-green-500/20 text-green-300",
  ARCHIVED:  "bg-yellow-500/20 text-yellow-300",
};
const ASSIGN_COLOR = {
  PENDING:    "bg-yellow-500/20 text-yellow-300",
  IN_PROGRESS:"bg-blue-500/20 text-blue-300",
  COMPLETED:  "bg-green-500/20 text-green-300",
  FAILED:     "bg-red-500/20 text-red-300",
};

/* ═══════════════════════════════════════════════════════════
   TRAINING MODAL
═══════════════════════════════════════════════════════════ */
function TrainingModal({ training, onClose, onSave }) {
  const [form, setForm] = useState({
    title: training?.title || "",
    description: training?.description || "",
    category: training?.category || "",
    duration: training?.duration || "",
    content: training?.content || "",
    passingScore: training?.passingScore ?? 70,
    status: training?.status || "DRAFT",
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.title || !form.content) return alert("Title and content are required.");
    setSaving(true);
    try {
      if (training?.id) {
        await api.put(`/lms/trainings/${training.id}`, form);
      } else {
        await api.post("/lms/trainings", form);
      }
      onSave();
    } catch {
      alert("Failed to save training.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">{training ? "Edit Training" : "New Training"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">×</button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs text-gray-400 mb-1 block">Title *</label>
              <input value={form.title} onChange={e => set("title", e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Category</label>
              <input value={form.category} onChange={e => set("category", e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Duration (minutes)</label>
              <input type="number" value={form.duration} onChange={e => set("duration", e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Passing Score (%)</label>
              <input type="number" min={0} max={100} value={form.passingScore} onChange={e => set("passingScore", e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Status</label>
              <select value={form.status} onChange={e => set("status", e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500">
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-400 mb-1 block">Description</label>
              <textarea value={form.description} onChange={e => set("description", e.target.value)} rows={2}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 resize-none" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-400 mb-1 block">Content * <span className="text-gray-600">(supports HTML or plain text)</span></label>
              <textarea value={form.content} onChange={e => set("content", e.target.value)} rows={8}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 resize-y font-mono" />
            </div>
          </div>
        </div>
        <div className="p-6 border-t border-gray-700 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-700 text-white text-sm hover:bg-gray-600">Cancel</button>
          <button onClick={submit} disabled={saving}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-500 disabled:opacity-50">
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   QUIZ BUILDER MODAL
═══════════════════════════════════════════════════════════ */
function QuizModal({ training, onClose }) {
  const [questions, setQuestions] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get(`/lms/trainings/${training.id}`).then(r => {
      const qs = r.data.training.questions || [];
      setQuestions(qs.map(q => ({
        ...q,
        options: (() => { try { return JSON.parse(q.options); } catch { return q.options || [""]; } })(),
      })));
    });
  }, [training.id]);

  const addQ = () => setQuestions(prev => [...prev, { question: "", options: ["", "", "", ""], correctAnswer: 0, points: 1 }]);
  const removeQ = (i) => setQuestions(prev => prev.filter((_, idx) => idx !== i));
  const setQ = (i, k, v) => setQuestions(prev => prev.map((q, idx) => idx === i ? { ...q, [k]: v } : q));
  const setOpt = (qi, oi, v) => setQuestions(prev => prev.map((q, idx) => {
    if (idx !== qi) return q;
    const opts = [...q.options];
    opts[oi] = v;
    return { ...q, options: opts };
  }));
  const addOpt = (qi) => setQuestions(prev => prev.map((q, idx) => idx === qi ? { ...q, options: [...q.options, ""] } : q));
  const removeOpt = (qi, oi) => setQuestions(prev => prev.map((q, idx) => {
    if (idx !== qi) return q;
    const opts = q.options.filter((_, i) => i !== oi);
    return { ...q, options: opts, correctAnswer: Math.min(q.correctAnswer, opts.length - 1) };
  }));

  const save = async () => {
    setSaving(true);
    try {
      await api.post(`/lms/trainings/${training.id}/questions`, { questions });
      alert("Questions saved!");
      onClose();
    } catch {
      alert("Failed to save questions.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-700 flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg font-bold text-white">Quiz Builder — {training.title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">×</button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {questions.map((q, qi) => (
            <div key={qi} className="bg-gray-800 border border-gray-700 rounded-xl p-4">
              <div className="flex items-start gap-3 mb-3">
                <span className="text-xs text-gray-500 mt-2 flex-shrink-0">Q{qi + 1}</span>
                <input value={q.question} onChange={e => setQ(qi, "question", e.target.value)}
                  placeholder="Question text..."
                  className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
                <input type="number" min={1} value={q.points} onChange={e => setQ(qi, "points", parseInt(e.target.value) || 1)}
                  className="w-16 bg-gray-700 border border-gray-600 rounded-lg px-2 py-2 text-sm text-white text-center focus:outline-none"
                  title="Points" />
                <button onClick={() => removeQ(qi)} className="text-red-400 hover:text-red-300 text-lg flex-shrink-0">×</button>
              </div>
              <div className="space-y-2 ml-6">
                {q.options.map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <input type="radio" checked={q.correctAnswer === oi} onChange={() => setQ(qi, "correctAnswer", oi)}
                      className="text-green-500 accent-green-500" title="Mark correct" />
                    <input value={opt} onChange={e => setOpt(qi, oi, e.target.value)}
                      placeholder={`Option ${oi + 1}`}
                      className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500" />
                    {q.options.length > 2 && (
                      <button onClick={() => removeOpt(qi, oi)} className="text-gray-500 hover:text-red-400 text-sm">×</button>
                    )}
                  </div>
                ))}
                <button onClick={() => addOpt(qi)} className="text-xs text-blue-400 hover:text-blue-300 mt-1">+ Add option</button>
              </div>
            </div>
          ))}
          <button onClick={addQ}
            className="w-full py-3 rounded-xl border-2 border-dashed border-gray-700 text-gray-400 hover:border-blue-500 hover:text-blue-400 text-sm transition-colors">
            + Add Question
          </button>
        </div>
        <div className="p-6 border-t border-gray-700 flex gap-3 justify-end flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-700 text-white text-sm hover:bg-gray-600">Cancel</button>
          <button onClick={save} disabled={saving}
            className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm hover:bg-green-500 disabled:opacity-50">
            {saving ? "Saving..." : `Save ${questions.length} Question${questions.length !== 1 ? "s" : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ASSIGN MODAL
═══════════════════════════════════════════════════════════ */
function AssignModal({ training, onClose }) {
  const [employees, setEmployees] = useState([]);
  const [selected, setSelected] = useState([]);
  const [dueDate, setDueDate] = useState("");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/users").then(r => setEmployees(r.data.users || r.data || []));
  }, []);

  const filtered = employees.filter(e =>
    e.name?.toLowerCase().includes(search.toLowerCase()) ||
    e.department?.toLowerCase().includes(search.toLowerCase())
  );
  const toggle = (id) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleAll = () => setSelected(selected.length === filtered.length ? [] : filtered.map(e => e.id));

  const submit = async () => {
    if (!selected.length) return alert("Select at least one employee.");
    setSaving(true);
    try {
      const r = await api.post("/lms/assign", { trainingId: training.id, userIds: selected, dueDate: dueDate || null });
      alert(`Assigned to ${r.data.created} employee(s). ${r.data.skipped} already assigned.`);
      onClose();
    } catch {
      alert("Failed to assign training.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-700 flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg font-bold text-white">Assign — {training.title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">×</button>
        </div>
        <div className="p-4 border-b border-gray-700 flex-shrink-0 space-y-3">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employees..."
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Due Date (optional)</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center gap-2 mb-3">
            <input type="checkbox" checked={selected.length === filtered.length && filtered.length > 0}
              onChange={toggleAll} className="accent-blue-500" />
            <span className="text-xs text-gray-400">Select All ({filtered.length})</span>
            {selected.length > 0 && <span className="text-xs text-blue-400 ml-auto">{selected.length} selected</span>}
          </div>
          {filtered.map(emp => (
            <label key={emp.id} className="flex items-center gap-3 py-2 cursor-pointer hover:bg-gray-800 rounded-lg px-2">
              <input type="checkbox" checked={selected.includes(emp.id)} onChange={() => toggle(emp.id)} className="accent-blue-500" />
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {emp.name?.charAt(0)?.toUpperCase()}
              </div>
              <div>
                <p className="text-sm text-white font-medium">{emp.name}</p>
                <p className="text-xs text-gray-500">{emp.department || emp.email}</p>
              </div>
            </label>
          ))}
        </div>
        <div className="p-4 border-t border-gray-700 flex gap-3 justify-end flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-700 text-white text-sm hover:bg-gray-600">Cancel</button>
          <button onClick={submit} disabled={saving}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-500 disabled:opacity-50">
            {saving ? "Assigning..." : `Assign to ${selected.length}`}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PROGRESS VIEW MODAL
═══════════════════════════════════════════════════════════ */
function ProgressModal({ training, onClose }) {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/lms/assignments?trainingId=${training.id}`)
      .then(r => setAssignments(r.data.assignments || []))
      .finally(() => setLoading(false));
  }, [training.id]);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="p-6 border-b border-gray-700 flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg font-bold text-white">Progress — {training.title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">×</button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <p className="text-gray-400 text-sm text-center py-8">Loading...</p>
          ) : assignments.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No assignments yet.</p>
          ) : (
            <div className="space-y-3">
              {assignments.map(a => (
                <div key={a.id} className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex items-center gap-4">
                  <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {a.user?.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{a.user?.name}</p>
                    <p className="text-xs text-gray-500">{a.user?.department}</p>
                    <div className="mt-1.5 bg-gray-700 rounded-full h-1.5">
                      <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${a.progress}%` }} />
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className={`text-xs px-2 py-1 rounded-full ${ASSIGN_COLOR[a.status] || "bg-gray-500/20 text-gray-300"}`}>
                      {a.status}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">{a.progress}%</p>
                  </div>
                  {a.certificate && (
                    <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded-full flex-shrink-0">🏆 Certified</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="p-4 border-t border-gray-700 flex justify-end flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-700 text-white text-sm hover:bg-gray-600">Close</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════ */
export default function LMS() {
  const [trainings, setTrainings] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [modal, setModal]         = useState(null); // { type, data }
  const [filter, setFilter]       = useState({ status: "", search: "" });

  const load = useCallback(() => {
    setLoading(true);
    api.get("/lms/trainings")
      .then(r => setTrainings(r.data.trainings || []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const deleteTraining = async (id) => {
    if (!window.confirm("Delete this training?")) return;
    try {
      await api.delete(`/lms/trainings/${id}`);
      load();
    } catch { alert("Delete failed."); }
  };

  const filtered = trainings.filter(t => {
    if (filter.status && t.status !== filter.status) return false;
    if (filter.search && !t.title.toLowerCase().includes(filter.search.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total:     trainings.length,
    published: trainings.filter(t => t.status === "PUBLISHED").length,
    draft:     trainings.filter(t => t.status === "DRAFT").length,
    total_assignments: trainings.reduce((s, t) => s + (t._count?.assignments || 0), 0),
  };

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Learning Management</h1>
            <p className="text-sm text-gray-400 mt-0.5">Create trainings, build quizzes, track employee progress</p>
          </div>
          <button onClick={() => setModal({ type: "training", data: null })}
            className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
            + New Training
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total Programs", value: stats.total,     color: "text-white" },
            { label: "Published",      value: stats.published, color: "text-green-400" },
            { label: "Draft",          value: stats.draft,     color: "text-yellow-400" },
            { label: "Total Assigned", value: stats.total_assignments, color: "text-blue-400" },
          ].map(s => (
            <div key={s.label} className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-5">
          <input value={filter.search} onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
            placeholder="Search trainings..."
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500" />
          <select value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}
            className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500">
            <option value="">All Status</option>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>

        {/* Training Cards */}
        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">📚</p>
            <p className="text-gray-400">No training programs found.</p>
            <button onClick={() => setModal({ type: "training", data: null })}
              className="mt-4 text-blue-400 text-sm hover:underline">Create one →</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(t => (
              <div key={t.id} className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-5 hover:border-gray-600 transition-all flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLOR[t.status]}`}>
                    {t.status}
                  </span>
                  {t.category && (
                    <span className="text-xs text-gray-500 bg-gray-700/50 px-2 py-1 rounded-full">{t.category}</span>
                  )}
                </div>
                <h3 className="text-base font-bold text-white mb-1 line-clamp-2">{t.title}</h3>
                {t.description && <p className="text-xs text-gray-400 mb-3 line-clamp-2">{t.description}</p>}
                <div className="flex gap-4 text-xs text-gray-500 mb-4">
                  {t.duration > 0 && <span>⏱ {t.duration} min</span>}
                  <span>🎯 Pass: {t.passingScore}%</span>
                  <span>❓ {t._count?.questions || 0} Q</span>
                </div>
                <div className="mt-auto pt-3 border-t border-gray-700/50 flex items-center justify-between">
                  <span className="text-xs text-gray-500">👥 {t._count?.assignments || 0} assigned</span>
                  <div className="flex gap-1">
                    <button onClick={() => setModal({ type: "quiz", data: t })}
                      className="text-xs px-2 py-1.5 rounded-lg bg-green-600/20 text-green-400 hover:bg-green-600/30 transition-colors" title="Quiz Builder">
                      Quiz
                    </button>
                    <button onClick={() => setModal({ type: "assign", data: t })}
                      className="text-xs px-2 py-1.5 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 transition-colors" title="Assign to employees">
                      Assign
                    </button>
                    <button onClick={() => setModal({ type: "progress", data: t })}
                      className="text-xs px-2 py-1.5 rounded-lg bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 transition-colors" title="View progress">
                      Progress
                    </button>
                    <button onClick={() => setModal({ type: "training", data: t })}
                      className="text-xs px-2 py-1.5 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors">
                      Edit
                    </button>
                    <button onClick={() => deleteTraining(t.id)}
                      className="text-xs px-2 py-1.5 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-colors">
                      Del
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {modal?.type === "training"  && <TrainingModal training={modal.data} onClose={() => setModal(null)} onSave={() => { setModal(null); load(); }} />}
      {modal?.type === "quiz"      && <QuizModal     training={modal.data} onClose={() => setModal(null)} />}
      {modal?.type === "assign"    && <AssignModal   training={modal.data} onClose={() => setModal(null)} />}
      {modal?.type === "progress"  && <ProgressModal training={modal.data} onClose={() => setModal(null)} />}
    </Layout>
  );
}
