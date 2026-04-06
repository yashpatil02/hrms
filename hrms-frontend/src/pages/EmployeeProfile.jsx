import { useEffect, useState, useRef } from "react";
import Layout from "../components/Layout";
import api from "../api/axios";
import {
  FaUser, FaEnvelope, FaPhone, FaBriefcase, FaBuilding,
  FaCalendarAlt, FaEdit, FaSave, FaTimes, FaLock,
  FaCheckCircle, FaExclamationTriangle, FaCamera, FaIdBadge,
  FaShieldAlt,
} from "react-icons/fa";

const ROLE_COLOR = {
  ADMIN:    "bg-purple-100 text-purple-700",
  HR:       "bg-blue-100 text-blue-700",
  EMPLOYEE: "bg-green-100 text-green-700",
};

const Avatar = ({ name, avatar, size = "lg" }) => {
  const sz = size === "lg" ? "w-24 h-24 text-3xl" : "w-10 h-10 text-base";
  if (avatar) return <img src={avatar} alt={name} className={`${sz} rounded-2xl object-cover`} />;
  const colors = ["from-blue-500 to-indigo-600", "from-teal-500 to-green-600", "from-purple-500 to-pink-600", "from-amber-500 to-orange-600"];
  const idx = (name?.charCodeAt(0) || 0) % colors.length;
  return (
    <div className={`${sz} rounded-2xl bg-gradient-to-br ${colors[idx]} flex items-center justify-center text-white font-bold flex-shrink-0`}>
      {name?.charAt(0)?.toUpperCase() || "U"}
    </div>
  );
};

const InfoRow = ({ icon, label, value }) => (
  <div className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500 flex-shrink-0 mt-0.5">
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-xs text-gray-400 font-medium">{label}</p>
      <p className="text-sm font-semibold text-gray-800 mt-0.5">{value || "—"}</p>
    </div>
  </div>
);

export default function EmployeeProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null); // { msg, type }

  // Password change
  const [pwMode, setPwMode] = useState(false);
  const [pw, setPw] = useState({ current: "", newPw: "", confirm: "" });
  const [pwErr, setPwErr] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  // Avatar input
  const avatarRef = useRef();

  useEffect(() => { loadProfile(); }, []);

  // ✅ Warn before leaving page with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (editMode) { e.preventDefault(); e.returnValue = ""; }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [editMode]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/profile/me");
      setProfile(data);
      setForm({ name: data.name, phone: data.phone || "", designation: data.designation || "", avatar: data.avatar || "" });
    } catch {}
    setLoading(false);
  };

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = async () => {
    if (!form.name?.trim()) return;
    setSaving(true);
    try {
      const { data } = await api.put("/profile/me", form);
      setProfile((p) => ({ ...p, ...data.user }));
      // ✅ Only sync name to localStorage — never store base64 avatar (bloats storage)
      const stored = JSON.parse(localStorage.getItem("user") || "{}");
      localStorage.setItem("user", JSON.stringify({ ...stored, name: data.user.name }));
      setEditMode(false);
      showToast("Profile updated successfully!");
    } catch (err) {
      showToast(err.response?.data?.message || "Update failed", "error");
    }
    setSaving(false);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // ✅ Accept up to 5MB, then auto-compress via canvas
    if (file.size > 5 * 1024 * 1024) {
      showToast("Image must be under 5MB", "error");
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      // Resize to max 400×400 keeping aspect ratio
      const MAX = 400;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round((height * MAX) / width); width = MAX; }
        else                { width  = Math.round((width  * MAX) / height); height = MAX; }
      }
      const canvas = document.createElement("canvas");
      canvas.width  = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      // Compress to JPEG quality 0.82 — keeps good quality, small size
      const compressed = canvas.toDataURL("image/jpeg", 0.82);
      URL.revokeObjectURL(url);
      setForm((p) => ({ ...p, avatar: compressed }));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      showToast("Invalid image file", "error");
    };
    img.src = url;
  };

  const handlePasswordChange = async () => {
    setPwErr("");
    if (!pw.current || !pw.newPw) { setPwErr("All fields required"); return; }
    if (pw.newPw.length < 6) { setPwErr("Min 6 characters"); return; }
    if (pw.newPw !== pw.confirm) { setPwErr("Passwords do not match"); return; }
    setPwSaving(true);
    try {
      await api.put("/profile/change-password", { currentPassword: pw.current, newPassword: pw.newPw });
      setPwMode(false);
      setPw({ current: "", newPw: "", confirm: "" });
      showToast("Password changed successfully!");
    } catch (err) {
      setPwErr(err.response?.data?.message || "Failed");
    }
    setPwSaving(false);
  };

  if (loading) return <Layout><div className="flex items-center justify-center h-64 text-gray-400 text-sm">Loading profile…</div></Layout>;

  const joinDate = profile?.joinDate ? new Date(profile.joinDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : null;
  const memberSince = new Date(profile?.createdAt).toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5">

        {/* Header Card */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="flex items-center gap-5 relative z-10">
            <div className="relative flex-shrink-0">
              {/* Show preview of new image while in edit mode */}
              <Avatar name={profile?.name} avatar={editMode && form.avatar ? form.avatar : profile?.avatar} size="lg" />
              {editMode && (
                <>
                  <button
                    onClick={() => avatarRef.current?.click()}
                    className="absolute -bottom-1 -right-1 w-7 h-7 bg-white rounded-lg shadow flex items-center justify-center text-blue-600 hover:text-blue-800"
                  >
                    <FaCamera size={12} />
                  </button>
                  <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                </>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-black truncate">{profile?.name}</h1>
              <p className="text-blue-200 text-sm mt-0.5">{profile?.designation || "—"} · {profile?.department || "—"}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20 text-white`}>
                  <FaShieldAlt size={9} /> {profile?.role}
                </span>
                <span className="text-blue-200 text-xs">Member since {memberSince}</span>
              </div>
            </div>
            {!editMode && (
              <button
                onClick={() => setEditMode(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-semibold transition flex-shrink-0"
              >
                <FaEdit size={12} /> Edit
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* Profile Info / Edit */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900">Personal Info</h2>
              {editMode && (
                <div className="flex gap-2">
                  <button onClick={() => setEditMode(false)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"><FaTimes size={13} /></button>
                  <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold disabled:opacity-60 transition">
                    <FaSave size={11} /> {saving ? "Saving…" : "Save"}
                  </button>
                </div>
              )}
            </div>

            {editMode ? (
              <div className="space-y-3">
                {[
                  { label: "Full Name *", key: "name", type: "text" },
                  { label: "Phone", key: "phone", type: "tel" },
                  { label: "Designation", key: "designation", type: "text" },
                ].map(({ label, key, type }) => (
                  <div key={key}>
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">{label}</label>
                    <input
                      type={type}
                      value={form[key] || ""}
                      onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                    />
                  </div>
                ))}
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Avatar URL (or upload above)</label>
                  <input
                    type="url"
                    value={form.avatar || ""}
                    onChange={(e) => setForm((p) => ({ ...p, avatar: e.target.value }))}
                    placeholder="https://..."
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                  />
                </div>
              </div>
            ) : (
              <div>
                <InfoRow icon={<FaUser size={12} />}     label="Full Name"    value={profile?.name} />
                <InfoRow icon={<FaEnvelope size={12} />} label="Email"        value={profile?.email} />
                <InfoRow icon={<FaPhone size={12} />}    label="Phone"        value={profile?.phone} />
                <InfoRow icon={<FaIdBadge size={12} />}  label="Designation"  value={profile?.designation} />
                <InfoRow icon={<FaBuilding size={12} />} label="Department"   value={profile?.department} />
                {joinDate && <InfoRow icon={<FaCalendarAlt size={12} />} label="Join Date" value={joinDate} />}
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {/* Stats */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-bold text-gray-900 mb-4">My Stats</h2>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Attendance", val: profile?._count?.attendances || 0, color: "bg-blue-50 text-blue-700" },
                  { label: "Leaves",     val: profile?._count?.leaves     || 0, color: "bg-amber-50 text-amber-700" },
                  { label: "Documents",  val: profile?._count?.documents  || 0, color: "bg-green-50 text-green-700" },
                ].map((s) => (
                  <div key={s.label} className={`${s.color} rounded-xl p-3 text-center`}>
                    <p className="text-2xl font-black">{s.val}</p>
                    <p className="text-xs opacity-70 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Change Password */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-gray-900 flex items-center gap-2"><FaLock size={13} className="text-gray-400" /> Security</h2>
                {!pwMode && (
                  <button onClick={() => setPwMode(true)} className="text-xs text-blue-600 hover:text-blue-800 font-semibold">Change Password</button>
                )}
              </div>

              {!pwMode ? (
                <p className="text-sm text-gray-400">Password is set. Click "Change Password" to update it.</p>
              ) : (
                <div className="space-y-3">
                  {[
                    { label: "Current Password", key: "current" },
                    { label: "New Password",      key: "newPw" },
                    { label: "Confirm New",        key: "confirm" },
                  ].map(({ label, key }) => (
                    <div key={key}>
                      <label className="text-xs font-semibold text-gray-500 mb-1 block">{label}</label>
                      <input
                        type="password"
                        value={pw[key]}
                        onChange={(e) => setPw((p) => ({ ...p, [key]: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                      />
                    </div>
                  ))}
                  {pwErr && (
                    <p className="text-xs text-red-600 flex items-center gap-1"><FaExclamationTriangle size={10} /> {pwErr}</p>
                  )}
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => { setPwMode(false); setPwErr(""); }} className="flex-1 py-2 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition">Cancel</button>
                    <button onClick={handlePasswordChange} disabled={pwSaving} className="flex-1 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition disabled:opacity-60">
                      {pwSaving ? "Saving…" : "Update"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-3 rounded-xl shadow-lg text-sm font-semibold
          ${toast.type === "error" ? "bg-red-600" : "bg-green-600"} text-white`}>
          {toast.type === "error" ? <FaExclamationTriangle /> : <FaCheckCircle />} {toast.msg}
        </div>
      )}
    </Layout>
  );
}
