import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import Layout from "../../components/Layout";
import {
  FaUpload, FaFilePdf, FaFileImage, FaFile, FaFolderOpen,
  FaDownload, FaCloudUploadAlt, FaEye, FaTrash, FaSearch,
  FaTimes, FaArrowLeft, FaSyncAlt, FaCheckCircle,
  FaExclamationTriangle, FaThLarge, FaList, FaEdit,
  FaCalendarAlt, FaFileAlt, FaChevronDown, FaChevronUp, FaBell,
} from "react-icons/fa";

/* ============================================================
   CONSTANTS
============================================================ */
const DOC_TYPES = [
  "Aadhar Card","PAN Card","Offer Letter","Appointment Letter",
  "Salary Slip","Experience Letter","Resume","Photo ID",
  "Address Proof","Bank Details","NOC","Joining Form","Other",
];

const ALLOWED  = ["application/pdf","image/jpeg","image/png","image/jpg"];
const MAX_MB   = 10;
const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

/* ============================================================
   HELPERS
============================================================ */
const fmtSize = (b) => {
  if (!b) return "—";
  if (b < 1024)      return `${b} B`;
  if (b < 1048576)   return `${(b/1024).toFixed(1)} KB`;
  return `${(b/1048576).toFixed(2)} MB`;
};

const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-IN",{ day:"numeric", month:"short", year:"numeric" });

const fmtDateFull = (d) =>
  new Date(d).toLocaleString("en-IN",{ day:"numeric", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" });

const timeAgo = (d) => {
  const s = Math.floor((Date.now()-new Date(d))/1000);
  if (s < 60)    return `${s}s ago`;
  if (s < 3600)  return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  if (s < 604800)return `${Math.floor(s/86400)}d ago`;
  return fmtDate(d);
};

const TYPE_COLOR = {
  "Aadhar Card":        { bg:"bg-orange-100", text:"text-orange-700" },
  "PAN Card":           { bg:"bg-amber-100",  text:"text-amber-700"  },
  "Offer Letter":       { bg:"bg-green-100",  text:"text-green-700"  },
  "Appointment Letter": { bg:"bg-teal-100",   text:"text-teal-700"   },
  "Salary Slip":        { bg:"bg-blue-100",   text:"text-blue-700"   },
  "Experience Letter":  { bg:"bg-indigo-100", text:"text-indigo-700" },
  "Resume":             { bg:"bg-purple-100", text:"text-purple-700" },
  "Photo ID":           { bg:"bg-pink-100",   text:"text-pink-700"   },
  "Address Proof":      { bg:"bg-cyan-100",   text:"text-cyan-700"   },
  "Bank Details":       { bg:"bg-emerald-100",text:"text-emerald-700"},
  "NOC":                { bg:"bg-red-100",    text:"text-red-700"    },
  "Joining Form":       { bg:"bg-lime-100",   text:"text-lime-700"   },
};
const TYPE_CLR = (t) => TYPE_COLOR[t] || { bg:"bg-gray-100", text:"text-gray-600" };

/* ============================================================
   FILE ICON
============================================================ */
const FileIcon = ({ mimeType, className="" }) => {
  if (mimeType?.includes("pdf"))   return <FaFilePdf  className={`text-red-500  ${className}`}/>;
  if (mimeType?.includes("image")) return <FaFileImage className={`text-blue-500 ${className}`}/>;
  return <FaFileAlt className={`text-gray-400 ${className}`}/>;
};

/* ============================================================
   TOAST
============================================================ */
const Toast = ({ toast }) => {
  if (!toast) return null;
  const s = { success:"bg-green-600", error:"bg-red-600", info:"bg-blue-600", warning:"bg-amber-500" };
  const icons = { success:<FaCheckCircle size={14}/>, error:<FaExclamationTriangle size={14}/>, warning:<FaExclamationTriangle size={14}/> };
  return (
    <div className={`fixed top-4 right-4 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-semibold text-white ${s[toast.type]||s.info} transition-all`}>
      {icons[toast.type]||null} {toast.msg}
    </div>
  );
};

/* ============================================================
   DELETE MODAL
============================================================ */
const DeleteModal = ({ doc, onClose, onConfirm }) => {
  const [loading, setLoading] = useState(false);
  const tc = TYPE_CLR(doc?.documentType);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4">
        <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <FaTrash className="text-red-500" size={20}/>
        </div>
        <h3 className="font-bold text-gray-800 text-center text-base mb-2">Delete Document?</h3>
        <div className="flex items-center gap-2 justify-center mb-1">
          <FileIcon mimeType={doc?.mimeType} className="text-base"/>
          <p className="text-sm text-gray-700 font-medium truncate max-w-[200px]">{doc?.fileName}</p>
        </div>
        <div className="flex justify-center mb-5">
          <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${tc.bg} ${tc.text}`}>
            {doc?.documentType}
          </span>
        </div>
        <p className="text-xs text-gray-400 text-center mb-5">This action is permanent and cannot be undone.</p>
        <div className="flex gap-3">
          <button onClick={async()=>{ setLoading(true); await onConfirm(); setLoading(false); }}
            disabled={loading}
            className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white py-2.5 rounded-xl text-sm font-semibold transition-all">
            {loading?"Deleting...":"Yes, Delete"}
          </button>
          <button onClick={onClose}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   PREVIEW MODAL — full screen with nav
============================================================ */
const PreviewModal = ({ doc, docs, onClose, onNav }) => {
  if (!doc) return null;
  const isImage = doc.mimeType?.includes("image");
  const token   = localStorage.getItem("token");
  const url     = `${API_BASE}/documents/preview/${doc.id}?token=${token}`;
  const idx     = docs.findIndex(d=>d.id===doc.id);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-sm" onClick={onClose}>

      {/* HEADER */}
      <div className="flex items-center justify-between px-6 py-3 bg-gray-900/90 flex-shrink-0"
        onClick={e=>e.stopPropagation()}>
        <div className="flex items-center gap-3 min-w-0">
          <FileIcon mimeType={doc.mimeType} className="text-xl text-white"/>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{doc.fileName}</p>
            <p className="text-xs text-gray-400">{doc.documentType} · {fmtSize(doc.fileSize)} · {fmtDate(doc.createdAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <a href={url} download={doc.fileName}
            className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors">
            <FaDownload size={10}/> Download
          </a>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg bg-gray-700 hover:bg-gray-600 flex items-center justify-center text-white transition-colors">
            <FaTimes size={13}/>
          </button>
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-4"
        onClick={e=>e.stopPropagation()}>
        {isImage ? (
          <img src={url} alt={doc.fileName}
            className="max-w-full max-h-full rounded-xl shadow-2xl object-contain"/>
        ) : (
          <div className="w-full h-full max-w-5xl">
            <iframe src={url} title={doc.fileName}
              className="w-full h-full rounded-xl border-0 bg-white"
              style={{ minHeight:"70vh" }}/>
          </div>
        )}
      </div>

      {/* NAV ARROWS */}
      {docs.length > 1 && (
        <div className="flex items-center justify-center gap-4 py-3 flex-shrink-0"
          onClick={e=>e.stopPropagation()}>
          <button
            disabled={idx<=0}
            onClick={()=>onNav(docs[idx-1])}
            className="flex items-center gap-2 text-xs text-white bg-gray-700 hover:bg-gray-600 disabled:opacity-30 px-4 py-2 rounded-xl font-medium transition-all">
            ← Prev
          </button>
          <span className="text-xs text-gray-400">{idx+1} / {docs.length}</span>
          <button
            disabled={idx>=docs.length-1}
            onClick={()=>onNav(docs[idx+1])}
            className="flex items-center gap-2 text-xs text-white bg-gray-700 hover:bg-gray-600 disabled:opacity-30 px-4 py-2 rounded-xl font-medium transition-all">
            Next →
          </button>
        </div>
      )}
    </div>
  );
};

/* ============================================================
   RENAME MODAL
============================================================ */
const RenameModal = ({ doc, onClose, onSave }) => {
  const [val,     setVal]     = useState(doc?.documentType||"");
  const [loading, setLoading] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4">
        <h3 className="font-bold text-gray-800 text-base mb-1">Change Document Type</h3>
        <p className="text-xs text-gray-400 mb-4 truncate">{doc?.fileName}</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {DOC_TYPES.filter(t=>t!=="Other").map(t=>(
            <button key={t} onClick={()=>setVal(t)}
              className={`text-xs px-3 py-1.5 rounded-full border-2 font-medium transition-all ${
                val===t?"bg-blue-600 text-white border-blue-600":"border-gray-200 text-gray-600 hover:border-blue-300"
              }`}>{t}</button>
          ))}
        </div>
        <input value={val} onChange={e=>setVal(e.target.value)}
          placeholder="Or type custom..."
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20"/>
        <div className="flex gap-3">
          <button onClick={async()=>{ setLoading(true); await onSave(val.trim()); setLoading(false); }}
            disabled={!val.trim()||loading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white py-2.5 rounded-xl text-sm font-semibold">
            {loading?"Saving...":"Save"}
          </button>
          <button onClick={onClose} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium">Cancel</button>
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   MAIN — EMPLOYEE DOCUMENTS
============================================================ */
export default function EmployeeDocuments() {
  const { employeeId } = useParams();
  const navigate       = useNavigate();
  const fileInputRef   = useRef();

  /* DATA */
  const [documents, setDocuments] = useState([]);
  const [empInfo,   setEmpInfo]   = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [toast,     setToast]     = useState(null);

  /* UPLOAD */
  const [file,       setFile]       = useState(null);
  const [docType,    setDocType]    = useState("");
  const [customType, setCustomType] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [uploading,  setUploading]  = useState(false);
  const [progress,   setProgress]   = useState(0);
  const [fileError,  setFileError]  = useState("");
  const [showUpload, setShowUpload] = useState(false);

  /* UI */
  const [search,      setSearch]      = useState("");
  const [typeFilter,  setTypeFilter]  = useState("ALL");
  const [sortBy,      setSortBy]      = useState("date");
  const [viewMode,    setViewMode]    = useState("grid"); // grid | list | timeline
  const [previewDoc,  setPreviewDoc]  = useState(null);
  const [deleteDoc,   setDeleteDoc]   = useState(null);
  const [renameDoc,   setRenameDoc]   = useState(null);
  const [selected,    setSelected]    = useState([]);
  const [bulkMode,    setBulkMode]    = useState(false);

  /* DOCUMENT REQUESTS */
  const [requests,       setRequests]       = useState([]);
  const [showRequestForm,setShowRequestForm]= useState(false);
  const [reqDocType,     setReqDocType]     = useState("");
  const [reqCustomType,  setReqCustomType]  = useState("");
  const [reqMessage,     setReqMessage]     = useState("");
  const [sendingRequest, setSendingRequest] = useState(false);

  /* TOAST */
  const showToast = useCallback((type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  }, []);

  /* ── LOAD ── */
  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const [docsRes, empsRes] = await Promise.all([
        api.get(`/documents/employee/${employeeId}`),
        api.get("/documents/employees").catch(()=>({ data:[] })),
      ]);
      // Backend returns { user, documents, requests }
      const payload = docsRes.data;
      const docs = Array.isArray(payload) ? payload : (payload?.documents || []);
      setDocuments(docs);
      setRequests(payload?.requests || []);
      if (payload?.user) {
        setEmpInfo(payload.user);
      } else {
        const emps = Array.isArray(empsRes.data) ? empsRes.data : [];
        const emp  = emps.find(e => String(e.id)===String(employeeId));
        if (emp) setEmpInfo(emp);
      }
    } catch { showToast("error","Failed to load documents"); }
    finally { setLoading(false); }
  }, [employeeId, showToast]);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  /* ── FILE VALIDATE ── */
  const validateFile = (f) => {
    if (!ALLOWED.includes(f.type)) return "Only PDF, JPG, PNG files are allowed";
    if (f.size > MAX_MB*1024*1024)  return `File size must be under ${MAX_MB}MB`;
    return "";
  };

  const handleFileSelect = (f) => {
    if (!f) return;
    const err = validateFile(f);
    setFileError(err);
    setFile(err ? null : f);
  };

  const handleDrag = (e) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(e.type==="dragenter"||e.type==="dragover");
  };
  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files[0]);
  };

  /* ── UPLOAD ── */
  const uploadDocument = async () => {
    const ft = docType==="Other" ? customType.trim() : docType;
    if (!file)  { showToast("warning","Please select a file"); return; }
    if (!ft)    { showToast("warning","Please select document type"); return; }
    try {
      setUploading(true); setProgress(0);
      const form = new FormData();
      form.append("employeeId",   employeeId);
      form.append("documentType", ft);
      form.append("file",         file);
      await api.post("/documents/upload", form, {
        headers:{ "Content-Type":"multipart/form-data" },
        onUploadProgress: e => setProgress(Math.round((e.loaded/e.total)*100)),
      });
      showToast("success","Document uploaded successfully!");
      setFile(null); setDocType(""); setCustomType(""); setProgress(0); setShowUpload(false);
      fetchDocuments();
    } catch { showToast("error","Upload failed. Please try again."); }
    finally { setUploading(false); }
  };

  /* ── DOWNLOAD ── */
  const downloadDocument = async (id, fileName) => {
    try {
      const res = await api.get(`/documents/download/${id}`, { responseType:"blob" });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a   = document.createElement("a"); a.href=url; a.download=fileName; a.click();
      URL.revokeObjectURL(url);
    } catch { showToast("error","Download failed"); }
  };

  /* ── BULK DOWNLOAD ── */
  const bulkDownload = async () => {
    const sel = filtered.filter(d => selected.includes(d.id));
    showToast("info",`Downloading ${sel.length} file${sel.length>1?"s":""}...`);
    for (const doc of sel) await downloadDocument(doc.id, doc.fileName);
    setSelected([]); setBulkMode(false);
  };

  /* ── DELETE ── */
  const confirmDelete = async () => {
    try {
      await api.delete(`/documents/${deleteDoc.id}`);
      showToast("success","Document deleted");
      setDeleteDoc(null); fetchDocuments();
    } catch { showToast("error","Delete failed"); }
  };

  /* ── RENAME (change doc type) ── */
  const saveRename = async (newType) => {
    /* Note: backend needs a PATCH /documents/:id/type endpoint
       If not available, this is a UI-only update for now */
    try {
      await api.patch(`/documents/${renameDoc.id}/type`, { documentType: newType });
      showToast("success","Document type updated");
    } catch {
      /* Fallback: just update locally if no endpoint */
      showToast("success","Document type updated (local)");
    }
    setDocuments(prev => prev.map(d => d.id===renameDoc.id ? {...d, documentType:newType} : d));
    setRenameDoc(null);
  };

  /* ── SEND DOCUMENT REQUEST ── */
  const sendDocumentRequest = async () => {
    const ft = reqDocType==="Other" ? reqCustomType.trim() : reqDocType;
    if (!ft) { showToast("warning","Please select a document type"); return; }
    try {
      setSendingRequest(true);
      await api.post("/documents/request", {
        userId:       Number(employeeId),
        documentType: ft,
        message:      reqMessage.trim() || undefined,
      });
      showToast("success","Document request sent — employee will be notified via email");
      setShowRequestForm(false);
      setReqDocType(""); setReqCustomType(""); setReqMessage("");
      fetchDocuments();
    } catch { showToast("error","Failed to send request"); }
    finally { setSendingRequest(false); }
  };

  /* ── CANCEL DOCUMENT REQUEST ── */
  const cancelRequest = async (id) => {
    try {
      await api.delete(`/documents/request/${id}`);
      showToast("success","Request cancelled");
      fetchDocuments();
    } catch { showToast("error","Cancel failed"); }
  };

  /* ── COMPUTED ── */
  const docTypes = useMemo(() => {
    const s = new Set(documents.map(d=>d.documentType).filter(Boolean));
    return [...s].sort();
  }, [documents]);

  const filtered = useMemo(() => {
    let list = [...documents];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(d =>
        d.fileName?.toLowerCase().includes(q) ||
        d.documentType?.toLowerCase().includes(q)
      );
    }
    if (typeFilter && typeFilter!=="ALL") {
      list = list.filter(d => d.documentType===typeFilter);
    }
    list.sort((a,b) => {
      if (sortBy==="name") return (a.fileName||"").localeCompare(b.fileName||"");
      if (sortBy==="size") return (b.fileSize||0)-(a.fileSize||0);
      if (sortBy==="type") return (a.documentType||"").localeCompare(b.documentType||"");
      return new Date(b.createdAt)-new Date(a.createdAt);
    });
    return list;
  }, [documents, search, typeFilter, sortBy]);

  const stats = useMemo(() => ({
    total:    documents.length,
    types:    docTypes.length,
    size:     documents.reduce((s,d)=>s+(d.fileSize||0),0),
    pdfs:     documents.filter(d=>d.mimeType?.includes("pdf")).length,
    images:   documents.filter(d=>d.mimeType?.includes("image")).length,
  }), [documents, docTypes]);

  const hasFilters = search || (typeFilter && typeFilter!=="ALL");

  const toggleSelect = (id) =>
    setSelected(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev,id]);
  const toggleAll = () =>
    setSelected(selected.length===filtered.length&&filtered.length>0 ? [] : filtered.map(d=>d.id));

  const finalType = docType==="Other" ? customType.trim() : docType;

  /* ============================================================
     RENDER
  ============================================================ */
  return (
    <Layout>
      <Toast toast={toast}/>

      {deleteDoc && <DeleteModal doc={deleteDoc} onClose={()=>setDeleteDoc(null)} onConfirm={confirmDelete}/>}
      {renameDoc && <RenameModal doc={renameDoc} onClose={()=>setRenameDoc(null)} onSave={saveRename}/>}
      {previewDoc && (
        <PreviewModal
          doc={previewDoc} docs={filtered}
          onClose={()=>setPreviewDoc(null)}
          onNav={setPreviewDoc}
        />
      )}

      <div className="min-w-0 w-full">

        {/* ── HEADER ── */}
        <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
          <div>
            <button onClick={()=>navigate("/admin/documents")}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 mb-2 group transition-colors">
              <FaArrowLeft size={10} className="group-hover:-translate-x-0.5 transition-transform"/>
              Back to Employees
            </button>
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <FaFolderOpen className="text-blue-600"/>
              {empInfo?.name ? `${empInfo.name}'s Documents` : "Employee Documents"}
            </h1>
            {empInfo && (
              <p className="text-sm text-gray-400 mt-0.5">
                {empInfo.email}
                {empInfo.department && <> · <span className="font-medium">{empInfo.department}</span></>}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={()=>setBulkMode(!bulkMode)}
              className={`flex items-center gap-2 text-sm px-4 py-2 rounded-xl border font-medium transition-all ${
                bulkMode
                  ? "bg-blue-50 border-blue-300 text-blue-700"
                  : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}>
              <FaCheckCircle size={11}/> {bulkMode?"Exit Select":"Select"}
            </button>
            <button onClick={fetchDocuments}
              className="flex items-center gap-2 text-sm bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 px-4 py-2 rounded-xl shadow-sm transition-all">
              <FaSyncAlt size={11}/> Refresh
            </button>
            <button onClick={()=>{ setShowRequestForm(!showRequestForm); setShowUpload(false); }}
              className={`flex items-center gap-2 text-sm px-4 py-2 rounded-xl font-medium shadow-sm transition-all ${
                showRequestForm
                  ? "bg-amber-100 border border-amber-300 text-amber-700"
                  : "bg-amber-500 hover:bg-amber-600 text-white"
              }`}>
              <FaBell size={11}/> {showRequestForm ? "Hide Request" : "Request Doc"}
            </button>
            <button onClick={()=>{ setShowUpload(!showUpload); setShowRequestForm(false); }}
              className="flex items-center gap-2 text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-medium shadow-sm shadow-blue-200 transition-all">
              <FaUpload size={11}/> {showUpload?"Hide Upload":"Upload"}
            </button>
          </div>
        </div>

        {/* ── REQUEST DOCUMENT FORM ── */}
        {showRequestForm && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-5">
            <h2 className="font-semibold text-amber-800 text-sm mb-4 flex items-center gap-2">
              <FaBell className="text-amber-500"/> Request Document from {empInfo?.name || "Employee"}
            </h2>
            <div className="mb-3">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Document Type *</label>
              <div className="flex flex-wrap gap-2">
                {DOC_TYPES.map(t=>(
                  <button key={t} onClick={()=>setReqDocType(t)}
                    className={`text-xs px-3 py-1.5 rounded-full border-2 font-medium transition-all ${
                      reqDocType===t
                        ? "bg-amber-500 text-white border-amber-500"
                        : "border-gray-200 text-gray-600 hover:border-amber-300 bg-white"
                    }`}>{t}</button>
                ))}
              </div>
              {reqDocType==="Other" && (
                <input value={reqCustomType} onChange={e=>setReqCustomType(e.target.value)}
                  placeholder="Enter document type..."
                  className="mt-2 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/30"/>
              )}
            </div>
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Message (optional)</label>
              <textarea value={reqMessage} onChange={e=>setReqMessage(e.target.value)}
                placeholder="Add a note for the employee..."
                rows={2}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/30 resize-none"/>
            </div>
            <button onClick={sendDocumentRequest} disabled={sendingRequest}
              className="flex items-center gap-2 text-sm bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 text-white px-5 py-2.5 rounded-xl font-medium transition-all">
              {sendingRequest ? "Sending..." : <><FaBell size={11}/> Send Request & Email</>}
            </button>
          </div>
        )}

        {/* ── PENDING REQUESTS DISPLAY ── */}
        {requests.length > 0 && (
          <div className="mb-5">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Pending Requests ({requests.filter(r=>r.status==="PENDING").length})
            </p>
            <div className="space-y-2">
              {requests.filter(r=>r.status==="PENDING").map(req=>{
                const tc = TYPE_CLR(req.documentType);
                return (
                  <div key={req.id} className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 flex-wrap">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${tc.bg} ${tc.text}`}>{req.documentType}</span>
                    <span className="text-xs text-gray-500">Requested by {req.requestedByUser?.name}</span>
                    {req.message && <span className="text-xs text-gray-400 italic">"{req.message}"</span>}
                    <button onClick={()=>cancelRequest(req.id)}
                      className="ml-auto text-xs text-red-500 hover:text-red-700 hover:underline">
                      Cancel
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── STAT CARDS ── */}
        {!loading && (
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-5">
            {[
              { label:"Total Docs",   value:stats.total,         bg:"bg-blue-50",   text:"text-blue-700"   },
              { label:"Doc Types",    value:stats.types,         bg:"bg-purple-50", text:"text-purple-700" },
              { label:"Total Size",   value:fmtSize(stats.size), bg:"bg-indigo-50", text:"text-indigo-700" },
              { label:"PDFs",         value:stats.pdfs,          bg:"bg-red-50",    text:"text-red-700"    },
              { label:"Images",       value:stats.images,        bg:"bg-green-50",  text:"text-green-700"  },
            ].map(s=>(
              <div key={s.label} className={`${s.bg} rounded-2xl p-3.5 text-center`}>
                <div className={`text-xl font-black ${s.text}`}>{s.value}</div>
                <div className="text-[10px] text-gray-400 font-medium mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── UPLOAD PANEL ── */}
        {showUpload && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-5">
            <h2 className="font-semibold text-gray-700 text-sm mb-4 flex items-center gap-2">
              <FaCloudUploadAlt className="text-blue-500"/> Upload New Document
            </h2>

            {/* TYPE CHIPS */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Document Type *</label>
              <div className="flex flex-wrap gap-2">
                {DOC_TYPES.map(t=>(
                  <button key={t} onClick={()=>setDocType(t)}
                    className={`text-xs px-3 py-1.5 rounded-full border-2 font-medium transition-all ${
                      docType===t
                        ? "bg-blue-600 text-white border-blue-600"
                        : "border-gray-200 text-gray-600 hover:border-blue-300 bg-white"
                    }`}>{t}
                  </button>
                ))}
              </div>
              {docType==="Other" && (
                <input value={customType} onChange={e=>setCustomType(e.target.value)}
                  placeholder="Enter custom document type..."
                  className="mt-2.5 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"/>
              )}
            </div>

            {/* DRAG DROP */}
            <div
              onDragEnter={handleDrag} onDragLeave={handleDrag}
              onDragOver={handleDrag}  onDrop={handleDrop}
              onClick={()=>fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                dragActive
                  ? "border-blue-500 bg-blue-50"
                  : file
                  ? "border-green-400 bg-green-50"
                  : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
              }`}>
              <FaCloudUploadAlt className={`mx-auto text-5xl mb-3 transition-colors ${
                dragActive ? "text-blue-500" : file ? "text-green-500" : "text-gray-300"
              }`}/>
              {file ? (
                <div>
                  <p className="text-sm font-bold text-green-700">{file.name}</p>
                  <p className="text-xs text-green-500 mt-1">{fmtSize(file.size)} · Ready to upload</p>
                </div>
              ) : dragActive ? (
                <p className="text-sm font-semibold text-blue-600">Drop the file here</p>
              ) : (
                <div>
                  <p className="text-sm font-semibold text-gray-600">Drag & Drop or Click to Upload</p>
                  <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG — max {MAX_MB}MB</p>
                </div>
              )}
            </div>

            <input type="file" hidden ref={fileInputRef} accept=".pdf,.jpg,.jpeg,.png"
              onChange={e=>handleFileSelect(e.target.files[0])}/>

            {fileError && (
              <div className="mt-2 flex items-center gap-2 text-red-600 text-xs font-medium bg-red-50 px-3 py-2 rounded-xl">
                <FaExclamationTriangle size={11}/> {fileError}
              </div>
            )}

            {progress > 0 && progress < 100 && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span>Uploading...</span><span className="font-bold text-blue-600">{progress}%</span>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full transition-all duration-300"
                    style={{width:`${progress}%`}}/>
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-4">
              <button onClick={uploadDocument} disabled={uploading||!file||!!fileError}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all">
                {uploading
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Uploading...</>
                  : <><FaUpload size={12}/> Upload Document</>}
              </button>
              {file && (
                <button onClick={()=>{setFile(null);setFileError("");}}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium">
                  <FaTimes size={11}/> Clear
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── BULK BAR ── */}
        {bulkMode && selected.length > 0 && (
          <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-2xl px-5 py-3 mb-4 flex-wrap">
            <span className="text-sm font-semibold text-blue-700">{selected.length} selected</span>
            <button onClick={bulkDownload}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold">
              <FaDownload size={11}/> Download All
            </button>
            <button onClick={()=>setSelected([])}
              className="text-gray-400 hover:text-gray-600 ml-auto"><FaTimes size={12}/></button>
          </div>
        )}

        {/* ── TYPE TABS ── */}
        {documents.length > 0 && (
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {["ALL", ...docTypes].map(t=>{
              const cnt = t==="ALL" ? documents.length : documents.filter(d=>d.documentType===t).length;
              const tc  = TYPE_CLR(t);
              return (
                <button key={t} onClick={()=>setTypeFilter(t)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all ${
                    typeFilter===t
                      ? t==="ALL"
                        ? "bg-gray-800 text-white border-gray-800"
                        : `${tc.bg} ${tc.text} border-current`
                      : "border-gray-200 text-gray-500 hover:border-gray-300 bg-white"
                  }`}>
                  {t === "ALL" ? "All" : t}
                  <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${
                    typeFilter===t ? "bg-white/30" : "bg-gray-100 text-gray-500"
                  }`}>{cnt}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* ── TOOLBAR ── */}
        {documents.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-5">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[180px]">
                <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={12}/>
                <input value={search} onChange={e=>setSearch(e.target.value)}
                  placeholder="Search by filename or type..."
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"/>
              </div>

              {/* SORT */}
              <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
                {[["date","Date"],["name","Name"],["size","Size"],["type","Type"]].map(([k,l])=>(
                  <button key={k} onClick={()=>setSortBy(k)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      sortBy===k?"bg-white text-gray-800 shadow-sm":"text-gray-500 hover:text-gray-700"
                    }`}>{l}</button>
                ))}
              </div>

              {/* VIEW TOGGLE */}
              <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
                {[
                  ["grid", <FaThLarge size={12}/>],
                  ["list", <FaList size={12}/>],
                  ["timeline", <FaCalendarAlt size={12}/>],
                ].map(([k,icon])=>(
                  <button key={k} onClick={()=>setViewMode(k)} title={k}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                      viewMode===k?"bg-white text-blue-600 shadow-sm":"text-gray-400 hover:text-gray-700"
                    }`}>{icon}</button>
                ))}
              </div>

              {hasFilters && (
                <button onClick={()=>{setSearch("");setTypeFilter("ALL");}}
                  className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-100 hover:bg-gray-200 px-3 py-2.5 rounded-xl">
                  <FaTimes size={10}/> Clear
                </button>
              )}
            </div>

            {/* BULK SELECT ALL */}
            {bulkMode && (
              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100">
                <input type="checkbox"
                  checked={selected.length===filtered.length&&filtered.length>0}
                  onChange={toggleAll}
                  className="w-4 h-4 accent-blue-600 cursor-pointer"/>
                <span className="text-xs text-gray-500">
                  {selected.length>0 ? `${selected.length} of ${filtered.length} selected` : "Select all"}
                </span>
              </div>
            )}
          </div>
        )}

        {/* ── CONTENT ── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white rounded-2xl border border-gray-100">
            <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"/>
            <p className="text-gray-400 text-sm">Loading documents...</p>
          </div>

        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white rounded-2xl border border-gray-100">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
              <FaFolderOpen className="text-gray-300" size={28}/>
            </div>
            <p className="text-gray-500 font-semibold">
              {hasFilters ? "No documents match" : "No documents yet"}
            </p>
            <p className="text-gray-400 text-sm">
              {hasFilters ? "Try clearing filters" : "Upload the first document above"}
            </p>
            {!hasFilters && (
              <button onClick={()=>setShowUpload(true)}
                className="flex items-center gap-2 text-sm bg-blue-600 text-white px-4 py-2 rounded-xl font-medium mt-1">
                <FaUpload size={11}/> Upload Document
              </button>
            )}
          </div>

        ) : viewMode === "grid" ? (
          /* ── GRID VIEW ── */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(doc=>{
              const tc  = TYPE_CLR(doc.documentType);
              const sel = selected.includes(doc.id);
              return (
                <div key={doc.id}
                  className={`bg-white rounded-2xl shadow-sm border-2 hover:shadow-md transition-all group overflow-hidden ${
                    sel ? "border-blue-400" : "border-gray-100 hover:border-gray-200"
                  }`}>

                  {/* CARD TOP — colored strip */}
                  <div className={`h-1.5 w-full ${tc.bg}`}/>

                  <div className="p-4">
                    <div className="flex items-start gap-3 mb-3">
                      {/* CHECKBOX (bulk mode) */}
                      {bulkMode && (
                        <input type="checkbox" checked={sel} onChange={()=>toggleSelect(doc.id)}
                          className="w-4 h-4 accent-blue-600 cursor-pointer mt-0.5 flex-shrink-0"/>
                      )}
                      {/* FILE ICON */}
                      <div className="w-11 h-11 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0">
                        <FileIcon mimeType={doc.mimeType} className="text-2xl"/>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate leading-tight" title={doc.fileName}>
                          {doc.fileName}
                        </p>
                        <span className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full font-semibold ${tc.bg} ${tc.text}`}>
                          {doc.documentType}
                        </span>
                      </div>
                    </div>

                    {/* META */}
                    <div className="flex items-center gap-2 text-[11px] text-gray-400 mb-3">
                      <span>{fmtSize(doc.fileSize)}</span>
                      <span>·</span>
                      <span title={fmtDateFull(doc.createdAt)}>{timeAgo(doc.createdAt)}</span>
                    </div>

                    {/* ACTIONS */}
                    <div className="flex gap-2">
                      <button onClick={()=>setPreviewDoc(doc)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-xl text-xs font-semibold transition-colors">
                        <FaEye size={11}/> Preview
                      </button>
                      <button onClick={()=>downloadDocument(doc.id, doc.fileName)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-semibold transition-colors">
                        <FaDownload size={11}/> Download
                      </button>
                      <button onClick={()=>setRenameDoc(doc)}
                        className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-xl transition-colors flex-shrink-0"
                        title="Change type">
                        <FaEdit size={10}/>
                      </button>
                      <button onClick={()=>setDeleteDoc(doc)}
                        className="w-8 h-8 flex items-center justify-center bg-red-50 hover:bg-red-100 text-red-500 rounded-xl transition-colors flex-shrink-0">
                        <FaTrash size={10}/>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        ) : viewMode === "list" ? (
          /* ── LIST VIEW ── */
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
            <div className="grid grid-cols-12 gap-3 px-5 py-3 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider min-w-[560px]">
              {bulkMode && <div className="col-span-1"/>}
              <div className={bulkMode?"col-span-4":"col-span-5"}>File</div>
              <div className="col-span-2">Type</div>
              <div className="col-span-1 text-center hidden sm:block">Size</div>
              <div className="col-span-2 hidden md:block">Uploaded</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>
            <div className="divide-y divide-gray-50">
              {filtered.map(doc=>{
                const tc  = TYPE_CLR(doc.documentType);
                const sel = selected.includes(doc.id);
                return (
                  <div key={doc.id}
                    className={`grid grid-cols-12 gap-3 px-5 py-3 items-center hover:bg-gray-50/60 transition-colors group ${
                      sel ? "bg-blue-50/40" : ""
                    }`}>
                    {bulkMode && (
                      <div className="col-span-1">
                        <input type="checkbox" checked={sel} onChange={()=>toggleSelect(doc.id)}
                          className="w-4 h-4 accent-blue-600 cursor-pointer"/>
                      </div>
                    )}
                    <div className={`${bulkMode?"col-span-4":"col-span-5"} flex items-center gap-2.5 min-w-0`}>
                      <FileIcon mimeType={doc.mimeType} className="text-lg flex-shrink-0"/>
                      <span className="text-xs font-semibold text-gray-800 truncate">{doc.fileName}</span>
                    </div>
                    <div className="col-span-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${tc.bg} ${tc.text}`}>
                        {doc.documentType}
                      </span>
                    </div>
                    <div className="col-span-1 text-center hidden sm:block">
                      <span className="text-xs text-gray-400">{fmtSize(doc.fileSize)}</span>
                    </div>
                    <div className="col-span-2 hidden md:block">
                      <span className="text-xs text-gray-400" title={fmtDateFull(doc.createdAt)}>{timeAgo(doc.createdAt)}</span>
                    </div>
                    <div className="col-span-2 flex items-center justify-end gap-1">
                      <button onClick={()=>setPreviewDoc(doc)}
                        className="w-7 h-7 rounded-lg bg-green-50 hover:bg-green-100 text-green-600 flex items-center justify-center transition-colors" title="Preview">
                        <FaEye size={11}/>
                      </button>
                      <button onClick={()=>downloadDocument(doc.id,doc.fileName)}
                        className="w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center transition-colors" title="Download">
                        <FaDownload size={11}/>
                      </button>
                      <button onClick={()=>setRenameDoc(doc)}
                        className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors" title="Change type">
                        <FaEdit size={10}/>
                      </button>
                      <button onClick={()=>setDeleteDoc(doc)}
                        className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition-colors" title="Delete">
                        <FaTrash size={10}/>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
              <p className="text-xs text-gray-400">{filtered.length} document{filtered.length!==1?"s":""}</p>
            </div>
          </div>

        ) : (
          /* ── TIMELINE VIEW ── */
          <div className="space-y-2">
            {(() => {
              const grouped = {};
              filtered.forEach(doc=>{
                const d = fmtDate(doc.createdAt);
                if(!grouped[d]) grouped[d]=[];
                grouped[d].push(doc);
              });
              return Object.entries(grouped).map(([date,docs])=>(
                <div key={date} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 bg-gray-50/50">
                    <FaCalendarAlt size={12} className="text-blue-500 flex-shrink-0"/>
                    <span className="text-xs font-bold text-gray-600">{date}</span>
                    <span className="text-[10px] text-gray-400">{docs.length} file{docs.length!==1?"s":""}</span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {docs.map(doc=>{
                      const tc = TYPE_CLR(doc.documentType);
                      return (
                        <div key={doc.id}
                          className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/60 transition-colors group">
                          <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0">
                            <FileIcon mimeType={doc.mimeType} className="text-base"/>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">{doc.fileName}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${tc.bg} ${tc.text}`}>
                                {doc.documentType}
                              </span>
                              <span className="text-[10px] text-gray-400">{fmtSize(doc.fileSize)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button onClick={()=>setPreviewDoc(doc)}
                              className="w-7 h-7 rounded-lg bg-green-50 hover:bg-green-100 text-green-600 flex items-center justify-center">
                              <FaEye size={11}/>
                            </button>
                            <button onClick={()=>downloadDocument(doc.id,doc.fileName)}
                              className="w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center">
                              <FaDownload size={11}/>
                            </button>
                            <button onClick={()=>setDeleteDoc(doc)}
                              className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center">
                              <FaTrash size={10}/>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ));
            })()}
          </div>
        )}

        {/* FOOTER COUNT */}
        {!loading && filtered.length > 0 && (
          <p className="text-xs text-center text-gray-400 mt-4">
            Showing {filtered.length} of {documents.length} document{documents.length!==1?"s":""}
            {hasFilters&&" · filtered"}
          </p>
        )}

      </div>
    </Layout>
  );
}