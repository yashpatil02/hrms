import { useEffect, useState, useRef, useCallback } from "react";
import api from "../../api/axios";
import Layout from "../../components/Layout";
import {
  FaFolderOpen, FaUpload, FaFilePdf, FaFileImage, FaFileAlt,
  FaDownload, FaEye, FaTrash, FaSyncAlt, FaCheckCircle,
  FaExclamationTriangle, FaCloudUploadAlt, FaTimes, FaBell,
} from "react-icons/fa";

/* ─── CONSTANTS ─── */
const DOC_TYPES = [
  "Aadhar Card","PAN Card","Offer Letter","Appointment Letter",
  "Salary Slip","Experience Letter","Resume","Photo ID",
  "Address Proof","Bank Details","NOC","Joining Form","Other",
];
const ALLOWED = ["application/pdf","image/jpeg","image/png","image/jpg"];
const MAX_MB  = 10;
const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

/* ─── HELPERS ─── */
const fmtSize = (b) => {
  if (!b) return "—";
  if (b < 1024)    return `${b} B`;
  if (b < 1048576) return `${(b/1024).toFixed(1)} KB`;
  return `${(b/1048576).toFixed(2)} MB`;
};
const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-IN",{ day:"numeric", month:"short", year:"numeric" });

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

/* ─── FILE ICON ─── */
const FileIcon = ({ mimeType, className="" }) => {
  if (mimeType?.includes("pdf"))   return <FaFilePdf  className={`text-red-500 ${className}`}/>;
  if (mimeType?.includes("image")) return <FaFileImage className={`text-blue-500 ${className}`}/>;
  return <FaFileAlt className={`text-gray-400 ${className}`}/>;
};

/* ─── TOAST ─── */
const Toast = ({ toast }) => {
  if (!toast) return null;
  const s = { success:"bg-green-600", error:"bg-red-600", info:"bg-blue-600", warning:"bg-amber-500" };
  return (
    <div className={`fixed top-4 right-4 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-semibold text-white ${s[toast.type]||s.info}`}>
      {toast.msg}
    </div>
  );
};

/* ─── PREVIEW MODAL ─── */
const PreviewModal = ({ doc, onClose }) => {
  if (!doc) return null;
  const isImage = doc.mimeType?.includes("image");
  const token   = localStorage.getItem("token");
  const url     = `${API_BASE}/documents/preview/${doc.id}?token=${token}`;
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className="flex items-center justify-between px-6 py-3 bg-gray-900/90 flex-shrink-0"
        onClick={e=>e.stopPropagation()}>
        <div className="flex items-center gap-3 min-w-0">
          <FileIcon mimeType={doc.mimeType} className="text-xl text-white"/>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{doc.fileName}</p>
            <p className="text-xs text-gray-400">{doc.documentType} · {fmtSize(doc.fileSize)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <a href={url} download={doc.fileName}
            className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-medium">
            <FaDownload size={10}/> Download
          </a>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg bg-gray-700 hover:bg-gray-600 flex items-center justify-center text-white">
            <FaTimes size={13}/>
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto flex items-center justify-center p-4" onClick={e=>e.stopPropagation()}>
        {isImage ? (
          <img src={url} alt={doc.fileName} className="max-w-full max-h-full rounded-xl shadow-2xl object-contain"/>
        ) : (
          <div className="w-full h-full max-w-5xl">
            <iframe src={url} title={doc.fileName}
              className="w-full h-full rounded-xl border-0 bg-white" style={{ minHeight:"70vh" }}/>
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── DELETE MODAL ─── */
const DeleteModal = ({ doc, onClose, onConfirm }) => {
  const [loading, setLoading] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4">
        <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <FaTrash className="text-red-500" size={20}/>
        </div>
        <h3 className="font-bold text-gray-800 text-center text-base mb-2">Delete Document?</h3>
        <p className="text-sm text-gray-500 text-center mb-1 truncate px-2">{doc?.fileName}</p>
        <p className="text-xs text-gray-400 text-center mb-5">This action is permanent and cannot be undone.</p>
        <div className="flex gap-3">
          <button onClick={async()=>{ setLoading(true); await onConfirm(); setLoading(false); }}
            disabled={loading}
            className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white py-2.5 rounded-xl text-sm font-semibold">
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

/* ─── UPLOAD MODAL ─── */
const UploadModal = ({ request, onClose, onUploaded }) => {
  const fileInputRef = useRef();
  const [file,       setFile]       = useState(null);
  const [docType,    setDocType]    = useState(request?.documentType || "");
  const [customType, setCustomType] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [uploading,  setUploading]  = useState(false);
  const [fileError,  setFileError]  = useState("");

  const validateFile = (f) => {
    if (!ALLOWED.includes(f.type)) return "Only PDF, JPG, PNG files allowed";
    if (f.size > MAX_MB*1024*1024) return `Max file size is ${MAX_MB}MB`;
    return "";
  };
  const handleFileSelect = (f) => {
    const err = validateFile(f);
    setFileError(err);
    setFile(err ? null : f);
  };

  const handleDrag = (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(e.type==="dragenter"||e.type==="dragover"); };
  const handleDrop = (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); if(e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files[0]); };

  const doUpload = async () => {
    const ft = docType==="Other" ? customType.trim() : docType;
    if (!file) return;
    if (!ft)   return;
    try {
      setUploading(true);
      const form = new FormData();
      form.append("documentType", ft);
      form.append("file", file);
      if (request?.id) form.append("requestId", request.id);
      await api.post("/documents/self-upload", form, {
        headers:{ "Content-Type":"multipart/form-data" },
      });
      onUploaded();
      onClose();
    } catch {
      setFileError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const finalType = docType==="Other" ? customType.trim() : docType;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-800 text-base">Upload Document</h3>
            {request && (
              <p className="text-xs text-amber-600 mt-0.5">
                Requested by {request.requestedByUser?.name} · {request.documentType}
              </p>
            )}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500">
            <FaTimes size={13}/>
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Doc type selector (disabled if request already has type) */}
          {!request && (
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Document Type</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {DOC_TYPES.filter(t=>t!=="Other").map(t=>(
                  <button key={t} onClick={()=>setDocType(t)}
                    className={`text-xs px-3 py-1.5 rounded-full border-2 font-medium transition-all ${
                      docType===t?"bg-blue-600 text-white border-blue-600":"border-gray-200 text-gray-600 hover:border-blue-300"
                    }`}>{t}</button>
                ))}
                <button onClick={()=>setDocType("Other")}
                  className={`text-xs px-3 py-1.5 rounded-full border-2 font-medium transition-all ${
                    docType==="Other"?"bg-blue-600 text-white border-blue-600":"border-gray-200 text-gray-600 hover:border-blue-300"
                  }`}>Other</button>
              </div>
              {docType==="Other" && (
                <input value={customType} onChange={e=>setCustomType(e.target.value)}
                  placeholder="Enter document type..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"/>
              )}
            </div>
          )}

          {/* File drop zone */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">File</label>
            <div
              onDragEnter={handleDrag} onDragLeave={handleDrag}
              onDragOver={handleDrag} onDrop={handleDrop}
              onClick={()=>fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                dragActive?"border-blue-500 bg-blue-50":"border-gray-200 hover:border-blue-300 hover:bg-blue-50/30"
              }`}>
              <input ref={fileInputRef} type="file" className="hidden"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={e=>{ if(e.target.files?.[0]) handleFileSelect(e.target.files[0]); e.target.value=""; }}/>
              {file ? (
                <div className="flex items-center gap-3 justify-center">
                  <FileIcon mimeType={file.type} className="text-2xl"/>
                  <div className="text-left min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate max-w-[200px]">{file.name}</p>
                    <p className="text-xs text-gray-400">{fmtSize(file.size)}</p>
                  </div>
                  <button onClick={e=>{e.stopPropagation();setFile(null);}}
                    className="ml-2 w-6 h-6 rounded-full bg-gray-200 hover:bg-red-100 flex items-center justify-center text-gray-500 hover:text-red-500">
                    <FaTimes size={9}/>
                  </button>
                </div>
              ) : (
                <>
                  <FaCloudUploadAlt className="text-gray-300 mx-auto mb-2" size={30}/>
                  <p className="text-sm font-medium text-gray-500">Drop file here or click to browse</p>
                  <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG · Max {MAX_MB}MB</p>
                </>
              )}
            </div>
            {fileError && <p className="text-xs text-red-500 mt-1.5">{fileError}</p>}
          </div>

          <button
            onClick={doUpload}
            disabled={!file || !finalType || uploading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all">
            {uploading ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Uploading...</>
            ) : (
              <><FaUpload size={13}/> Upload Document</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   MAIN — MY DOCUMENTS (Employee)
───────────────────────────────────────────────────────────── */
export default function MyDocuments() {
  const [documents, setDocuments] = useState([]);
  const [requests,  setRequests]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [toast,     setToast]     = useState(null);
  const [previewDoc,setPreviewDoc]= useState(null);
  const [deleteDoc, setDeleteDoc] = useState(null);
  const [uploadFor, setUploadFor] = useState(null); // null = new upload, or a request obj

  const showToast = useCallback((type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/documents/my");
      setDocuments(res.data.documents || []);
      setRequests(res.data.requests   || []);
    } catch {
      showToast("error", "Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const downloadDoc = async (id, fileName) => {
    try {
      const res = await api.get(`/documents/download/${id}`, { responseType:"blob" });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a   = document.createElement("a"); a.href=url; a.download=fileName; a.click();
      URL.revokeObjectURL(url);
    } catch { showToast("error","Download failed"); }
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/documents/${deleteDoc.id}`);
      showToast("success","Document deleted");
      setDeleteDoc(null);
      fetchData();
    } catch { showToast("error","Delete failed — you can only delete documents you uploaded yourself"); }
  };

  /* ─── RENDER ─── */
  return (
    <Layout>
      <Toast toast={toast}/>
      {previewDoc && <PreviewModal doc={previewDoc} onClose={()=>setPreviewDoc(null)}/>}
      {deleteDoc  && <DeleteModal  doc={deleteDoc}  onClose={()=>setDeleteDoc(null)} onConfirm={confirmDelete}/>}
      {uploadFor !== undefined && uploadFor !== false && (
        <UploadModal
          request={uploadFor === "new" ? null : uploadFor}
          onClose={()=>setUploadFor(false)}
          onUploaded={()=>{ showToast("success","Document uploaded successfully!"); fetchData(); }}
        />
      )}

      <div className="min-w-0 w-full">

        {/* HEADER */}
        <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <FaFolderOpen className="text-blue-600"/> My Documents
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">View and manage your personal documents</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchData}
              className="flex items-center gap-2 text-sm bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 px-4 py-2 rounded-xl shadow-sm transition-all">
              <FaSyncAlt size={11}/> Refresh
            </button>
            <button onClick={()=>setUploadFor("new")}
              className="flex items-center gap-2 text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl shadow-sm transition-all font-medium">
              <FaUpload size={11}/> Upload Document
            </button>
          </div>
        </div>

        {/* PENDING REQUESTS BANNER */}
        {requests.length > 0 && (
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-3">
              <FaBell className="text-amber-500" size={14}/>
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                Pending Document Requests ({requests.length})
              </h2>
            </div>
            <div className="space-y-2">
              {requests.map(req => {
                const tc = TYPE_CLR(req.documentType);
                return (
                  <div key={req.id}
                    className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                        <FaExclamationTriangle className="text-amber-500" size={14}/>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${tc.bg} ${tc.text}`}>
                            {req.documentType}
                          </span>
                          <span className="text-xs text-gray-400">
                            Requested by {req.requestedByUser?.name}
                          </span>
                        </div>
                        {req.message && (
                          <p className="text-xs text-gray-600 mt-1 italic">"{req.message}"</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">{fmtDate(req.createdAt)}</p>
                      </div>
                    </div>
                    <button
                      onClick={()=>setUploadFor(req)}
                      className="flex items-center gap-1.5 text-xs bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl font-semibold whitespace-nowrap transition-all">
                      <FaUpload size={10}/> Upload Now
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STATS */}
        {!loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
            {[
              { label:"Total Documents", value:documents.length,      bg:"bg-blue-50",   text:"text-blue-700"  },
              { label:"PDFs",            value:documents.filter(d=>d.mimeType?.includes("pdf")).length,   bg:"bg-red-50",    text:"text-red-700"   },
              { label:"Images",          value:documents.filter(d=>d.mimeType?.includes("image")).length, bg:"bg-green-50",  text:"text-green-700" },
            ].map(s=>(
              <div key={s.label} className={`${s.bg} rounded-2xl p-4 text-center`}>
                <div className={`text-2xl font-bold ${s.text}`}>{s.value}</div>
                <div className="text-[10px] text-gray-400 font-medium mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* DOCUMENTS LIST */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white rounded-2xl border border-gray-100">
            <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"/>
            <p className="text-gray-400 text-sm">Loading documents...</p>
          </div>

        ) : documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white rounded-2xl border border-gray-100">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
              <FaFolderOpen className="text-gray-300" size={28}/>
            </div>
            <p className="text-gray-500 font-semibold">No documents yet</p>
            <p className="text-xs text-gray-400">Upload your first document to get started</p>
            <button onClick={()=>setUploadFor("new")}
              className="mt-2 flex items-center gap-2 text-sm bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium">
              <FaUpload size={11}/> Upload Document
            </button>
          </div>

        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

            {/* TABLE HEADER */}
            <div className="grid grid-cols-12 gap-3 px-5 py-3 border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider min-w-[500px]">
              <div className="col-span-5">Document</div>
              <div className="col-span-3 hidden sm:block">Type</div>
              <div className="col-span-2 hidden sm:block">Size</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>

            {/* ROWS */}
            <div className="divide-y divide-gray-50 min-w-[500px]">
              {documents.map(doc => {
                const tc = TYPE_CLR(doc.documentType);
                const isSelfUploaded = doc.uploadedBy === doc.employeeId;
                return (
                  <div key={doc.id} className="grid grid-cols-12 gap-3 px-5 py-3.5 items-center hover:bg-blue-50/20 transition-colors group">

                    {/* FILE INFO */}
                    <div className="col-span-5 flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0 border border-gray-100">
                        <FileIcon mimeType={doc.mimeType} className="text-base"/>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{doc.fileName}</p>
                        <p className="text-xs text-gray-400">{fmtDate(doc.createdAt)}</p>
                      </div>
                    </div>

                    {/* TYPE */}
                    <div className="col-span-3 hidden sm:block">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${tc.bg} ${tc.text}`}>
                        {doc.documentType}
                      </span>
                    </div>

                    {/* SIZE */}
                    <div className="col-span-2 hidden sm:block">
                      <span className="text-xs text-gray-400">{fmtSize(doc.fileSize)}</span>
                    </div>

                    {/* ACTIONS */}
                    <div className="col-span-2 flex items-center justify-end gap-1.5">
                      <button
                        onClick={()=>setPreviewDoc(doc)}
                        title="Preview"
                        className="w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center text-blue-600 transition-colors">
                        <FaEye size={12}/>
                      </button>
                      <button
                        onClick={()=>downloadDoc(doc.id, doc.fileName)}
                        title="Download"
                        className="w-8 h-8 rounded-lg bg-green-50 hover:bg-green-100 flex items-center justify-center text-green-600 transition-colors">
                        <FaDownload size={12}/>
                      </button>
                      {isSelfUploaded && (
                        <button
                          onClick={()=>setDeleteDoc(doc)}
                          title="Delete"
                          className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                          <FaTrash size={11}/>
                        </button>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>

            {/* FOOTER */}
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
              <p className="text-xs text-gray-400">
                {documents.length} document{documents.length!==1?"s":""} total ·
                You can only delete documents you uploaded yourself
              </p>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}
