import { useEffect, useState, useRef } from "react";
import Layout from "../components/Layout";
import api from "../api/axios";
import { useUser } from "../context/UserContext";
import {
  FaUser, FaEnvelope, FaPhone, FaBriefcase, FaBuilding,
  FaCalendarAlt, FaEdit, FaSave, FaTimes, FaLock,
  FaCheckCircle, FaExclamationTriangle, FaCamera, FaIdBadge,
  FaShieldAlt, FaMapMarkerAlt, FaHeartbeat, FaUniversity,
  FaUserFriends,
} from "react-icons/fa";

const ROLE_COLOR = {
  ADMIN:    "bg-purple-100 text-purple-700",
  HR:       "bg-blue-100 text-blue-700",
  MANAGER:  "bg-orange-100 text-orange-700",
  EMPLOYEE: "bg-green-100 text-green-700",
};

const Avatar = ({ name, avatar, size = "lg" }) => {
  const sz = size === "lg" ? "w-24 h-24 text-3xl" : "w-10 h-10 text-base";
  if (avatar) return <img src={avatar} alt={name} className={`${sz} rounded-2xl object-cover`} />;
  const colors = ["from-blue-500 to-indigo-600","from-teal-500 to-green-600","from-purple-500 to-pink-600","from-amber-500 to-orange-600"];
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

const FieldInput = ({ label, value, onChange, type = "text", placeholder = "" }) => (
  <div>
    <label className="text-xs font-semibold text-gray-500 mb-1 block">{label}</label>
    <input
      type={type}
      value={value || ""}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
    />
  </div>
);

const FieldSelect = ({ label, value, onChange, options }) => (
  <div>
    <label className="text-xs font-semibold text-gray-500 mb-1 block">{label}</label>
    <select
      value={value || ""}
      onChange={e => onChange(e.target.value)}
      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white"
    >
      <option value="">— Select —</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

const SectionCard = ({ title, icon, children }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
    <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
      {icon} {title}
    </h2>
    {children}
  </div>
);

export default function EmployeeProfile() {
  const { updateUser } = useUser();
  const [profile, setProfile]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm]         = useState({});
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState(null);

  const [pwMode, setPwMode]   = useState(false);
  const [pw, setPw]           = useState({ current: "", newPw: "", confirm: "" });
  const [pwErr, setPwErr]     = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  const avatarRef = useRef();

  useEffect(() => { loadProfile(); }, []);

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
      setForm({
        name:           data.name        || "",
        phone:          data.phone       || "",
        designation:    data.designation || "",
        avatar:         data.avatar      || "",
        dateOfBirth:    data.dateOfBirth ? data.dateOfBirth.slice(0, 10) : "",
        gender:         data.gender      || "",
        bloodGroup:     data.bloodGroup  || "",
        address:        data.address     || "",
        city:           data.city        || "",
        state:          data.state       || "",
        pincode:        data.pincode     || "",
        emergencyName:  data.emergencyName  || "",
        emergencyPhone: data.emergencyPhone || "",
        emergencyRel:   data.emergencyRel   || "",
        bankName:       data.bankName    || "",
        bankAccount:    data.bankAccount || "",
        bankIFSC:       data.bankIFSC    || "",
        bankHolder:     data.bankHolder  || "",
      });
      updateUser({ name: data.name, avatar: data.avatar || "" });
    } catch {}
    setLoading(false);
  };

  const f = (key) => (val) => setForm(p => ({ ...p, [key]: val }));

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = async () => {
    if (!form.name?.trim()) return;
    setSaving(true);
    try {
      await api.put("/profile/me", form);
      await loadProfile(); // reload full profile so extended fields (DOB, bank etc.) refresh
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
    if (file.size > 5 * 1024 * 1024) { showToast("Image must be under 5MB", "error"); return; }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 400;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round((height * MAX) / width); width = MAX; }
        else                { width  = Math.round((width  * MAX) / height); height = MAX; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      const compressed = canvas.toDataURL("image/jpeg", 0.82);
      URL.revokeObjectURL(url);
      setForm(p => ({ ...p, avatar: compressed }));
    };
    img.onerror = () => { URL.revokeObjectURL(url); showToast("Invalid image file", "error"); };
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

  const joinDate    = profile?.joinDate   ? new Date(profile.joinDate).toLocaleDateString("en-IN",   { day: "numeric", month: "long", year: "numeric" }) : null;
  const dob         = profile?.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : null;
  const memberSince = new Date(profile?.createdAt).toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  const EditActions = () => (
    <div className="flex gap-2">
      <button onClick={() => setEditMode(false)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"><FaTimes size={13} /></button>
      <button onClick={handleSave} disabled={saving}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold disabled:opacity-60 transition">
        <FaSave size={11} /> {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">

        {/* Header Card */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="flex items-center gap-5 relative z-10">
            <div className="relative flex-shrink-0">
              <Avatar name={profile?.name} avatar={editMode && form.avatar ? form.avatar : profile?.avatar} size="lg" />
              {editMode && (
                <>
                  <button onClick={() => avatarRef.current?.click()}
                    className="absolute -bottom-1 -right-1 w-7 h-7 bg-white rounded-lg shadow flex items-center justify-center text-blue-600 hover:text-blue-800">
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
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20 text-white">
                  <FaShieldAlt size={9} /> {profile?.role}
                </span>
                <span className="text-blue-200 text-xs">Member since {memberSince}</span>
              </div>
            </div>
            {!editMode && (
              <button onClick={() => setEditMode(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-semibold transition flex-shrink-0">
                <FaEdit size={12} /> Edit Profile
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* LEFT — main info (2 cols wide) */}
          <div className="lg:col-span-2 space-y-5">

            {/* Basic Info */}
            <SectionCard title="Basic Information" icon={<FaUser className="text-blue-500" size={14} />}>
              <div className="flex items-center justify-between -mt-1 mb-3">
                <span />
                {editMode && <EditActions />}
              </div>
              {editMode ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FieldInput label="Full Name *" value={form.name}        onChange={f("name")} />
                  <FieldInput label="Phone"       value={form.phone}       onChange={f("phone")} type="tel" />
                  <FieldInput label="Designation" value={form.designation} onChange={f("designation")} />
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">Avatar URL (or upload above)</label>
                    <input type="url" value={form.avatar || ""} onChange={e => setForm(p => ({ ...p, avatar: e.target.value }))}
                      placeholder="https://…"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" />
                  </div>
                </div>
              ) : (
                <>
                  <InfoRow icon={<FaUser size={12} />}       label="Full Name"   value={profile?.name} />
                  <InfoRow icon={<FaEnvelope size={12} />}   label="Email"       value={profile?.email} />
                  <InfoRow icon={<FaPhone size={12} />}      label="Phone"       value={profile?.phone} />
                  <InfoRow icon={<FaIdBadge size={12} />}    label="Designation" value={profile?.designation} />
                  <InfoRow icon={<FaBuilding size={12} />}   label="Department"  value={profile?.department} />
                  {joinDate && <InfoRow icon={<FaCalendarAlt size={12} />} label="Join Date" value={joinDate} />}
                </>
              )}
            </SectionCard>

            {/* Personal Details */}
            <SectionCard title="Personal Details" icon={<FaHeartbeat className="text-rose-500" size={14} />}>
              {editMode ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FieldInput label="Date of Birth" value={form.dateOfBirth} onChange={f("dateOfBirth")} type="date" />
                  <FieldSelect label="Gender" value={form.gender} onChange={f("gender")} options={["MALE","FEMALE","OTHER"]} />
                  <FieldSelect label="Blood Group" value={form.bloodGroup} onChange={f("bloodGroup")} options={["A+","A-","B+","B-","O+","O-","AB+","AB-"]} />
                  <div className="sm:col-span-2">
                    <FieldInput label="Address" value={form.address} onChange={f("address")} />
                  </div>
                  <FieldInput label="City"    value={form.city}    onChange={f("city")} />
                  <FieldInput label="State"   value={form.state}   onChange={f("state")} />
                  <FieldInput label="Pincode" value={form.pincode} onChange={f("pincode")} />
                </div>
              ) : (
                <>
                  {dob    && <InfoRow icon={<FaCalendarAlt size={12} />} label="Date of Birth" value={dob} />}
                  <InfoRow icon={<FaUser size={12} />}         label="Gender"     value={profile?.gender} />
                  <InfoRow icon={<FaHeartbeat size={12} />}   label="Blood Group" value={profile?.bloodGroup} />
                  <InfoRow icon={<FaMapMarkerAlt size={12} />} label="Address"    value={[profile?.address, profile?.city, profile?.state, profile?.pincode].filter(Boolean).join(", ")} />
                </>
              )}
            </SectionCard>

            {/* Emergency Contact */}
            <SectionCard title="Emergency Contact" icon={<FaUserFriends className="text-amber-500" size={14} />}>
              {editMode ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FieldInput label="Contact Name"     value={form.emergencyName}  onChange={f("emergencyName")} />
                  <FieldInput label="Contact Phone"    value={form.emergencyPhone} onChange={f("emergencyPhone")} type="tel" />
                  <FieldInput label="Relation (e.g. Father, Spouse)" value={form.emergencyRel} onChange={f("emergencyRel")} />
                </div>
              ) : (
                <>
                  <InfoRow icon={<FaUser size={12} />}         label="Name"     value={profile?.emergencyName} />
                  <InfoRow icon={<FaPhone size={12} />}        label="Phone"    value={profile?.emergencyPhone} />
                  <InfoRow icon={<FaUserFriends size={12} />}  label="Relation" value={profile?.emergencyRel} />
                </>
              )}
            </SectionCard>

            {/* Bank Details */}
            <SectionCard title="Bank Details" icon={<FaUniversity className="text-indigo-500" size={14} />}>
              {editMode ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FieldInput label="Bank Name"        value={form.bankName}    onChange={f("bankName")} />
                  <FieldInput label="Account Number"   value={form.bankAccount} onChange={f("bankAccount")} />
                  <FieldInput label="IFSC Code"        value={form.bankIFSC}    onChange={f("bankIFSC")} />
                  <FieldInput label="Account Holder"   value={form.bankHolder}  onChange={f("bankHolder")} />
                </div>
              ) : (
                <>
                  <InfoRow icon={<FaUniversity size={12} />} label="Bank Name"      value={profile?.bankName} />
                  <InfoRow icon={<FaIdBadge size={12} />}    label="Account Number"
                    value={profile?.bankAccount ? `****${profile.bankAccount.slice(-4)}` : null} />
                  <InfoRow icon={<FaBriefcase size={12} />}  label="IFSC Code"      value={profile?.bankIFSC} />
                  <InfoRow icon={<FaUser size={12} />}       label="Account Holder" value={profile?.bankHolder} />
                </>
              )}
            </SectionCard>

          </div>

          {/* RIGHT — stats + security */}
          <div className="space-y-5">

            {/* Stats */}
            <SectionCard title="My Stats" icon={<FaBriefcase className="text-gray-400" size={13} />}>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Attendance", val: profile?._count?.attendances || 0, color: "bg-blue-50 text-blue-700" },
                  { label: "Leaves",     val: profile?._count?.leaves      || 0, color: "bg-amber-50 text-amber-700" },
                  { label: "Documents",  val: profile?._count?.documents   || 0, color: "bg-green-50 text-green-700" },
                ].map(s => (
                  <div key={s.label} className={`${s.color} rounded-xl p-3 text-center`}>
                    <p className="text-2xl font-black">{s.val}</p>
                    <p className="text-[10px] opacity-70 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-0">
                {profile?.weekoffBalance !== undefined && (
                  <InfoRow icon={<FaCalendarAlt size={12} />} label="Week-off Balance" value={`${profile.weekoffBalance} day(s)`} />
                )}
              </div>
            </SectionCard>

            {/* Change Password */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-gray-900 flex items-center gap-2"><FaLock size={13} className="text-gray-400" /> Security</h2>
                {!pwMode && (
                  <button onClick={() => setPwMode(true)} className="text-xs text-blue-600 hover:text-blue-800 font-semibold">Change Password</button>
                )}
              </div>
              {!pwMode ? (
                <p className="text-sm text-gray-400">Password is set. Click "Change Password" to update.</p>
              ) : (
                <div className="space-y-3">
                  {[
                    { label: "Current Password", key: "current" },
                    { label: "New Password",      key: "newPw" },
                    { label: "Confirm New",        key: "confirm" },
                  ].map(({ label, key }) => (
                    <div key={key}>
                      <label className="text-xs font-semibold text-gray-500 mb-1 block">{label}</label>
                      <input type="password" value={pw[key]}
                        onChange={e => setPw(p => ({ ...p, [key]: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" />
                    </div>
                  ))}
                  {pwErr && <p className="text-xs text-red-600 flex items-center gap-1"><FaExclamationTriangle size={10} /> {pwErr}</p>}
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => { setPwMode(false); setPwErr(""); }}
                      className="flex-1 py-2 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition">Cancel</button>
                    <button onClick={handlePasswordChange} disabled={pwSaving}
                      className="flex-1 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition disabled:opacity-60">
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
