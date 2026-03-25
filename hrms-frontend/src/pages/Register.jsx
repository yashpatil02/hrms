import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { GoogleLogin } from "@react-oauth/google";

const Register = () => {
  const [params] = useSearchParams();
  const token = params.get("token");
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* =========================
     VALIDATE INVITE
  ========================= */
  useEffect(() => {
    if (!token) {
      setError("Invalid invite link");
      return;
    }

    api
      .get(`/auth/invite/${token}`)
      .then((res) => setUser(res.data))
      .catch((err) =>
        setError(
          err.response?.data?.msg || "Invite expired or invalid"
        )
      );
  }, [token]);

  /* =========================
     PASSWORD SIGNUP
  ========================= */
  const submit = async () => {
    if (password.length < 6) {
      alert("Password must be at least 6 characters");
      return;
    }

    try {
      setLoading(true);
      await api.post("/auth/complete-invite", {
        token,
        password,
      });

      alert("Account created successfully");
      navigate("/login");
    } catch (err) {
      alert(err.response?.data?.msg || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     GOOGLE SIGNUP
  ========================= */
  const handleGoogleSignup = async (credentialResponse) => {
    try {
      setLoading(true);

      await api.post("/auth/google-invite", {
        token, // ✅ invite token from URL
        googleToken: credentialResponse.credential, // ✅ Google ID token
      });

      alert("Account created successfully via Google");
      navigate("/login");
    } catch (err) {
      alert(
        err.response?.data?.msg || "Google signup failed"
      );
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     UI STATES
  ========================= */
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600 font-semibold">
          {error}
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Validating invite…</p>
      </div>
    );
  }

  /* =========================
     RENDER
  ========================= */
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-6 rounded shadow w-full max-w-md">
        <h2 className="text-xl font-bold mb-2">
          Complete Registration
        </h2>

        <p className="text-sm text-gray-600 mb-4">
          {user.email} ({user.role})
        </p>

        {/* PASSWORD SIGNUP */}
        <input
          type="password"
          placeholder="Set Password"
          className="border p-2 w-full mb-3 rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
        />

        <button
          onClick={submit}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded mb-4"
        >
          {loading ? "Creating..." : "Create Account"}
        </button>

        <div className="text-center text-sm text-gray-500 mb-3">
          OR
        </div>

        {/* GOOGLE SIGNUP */}
        <GoogleLogin
          onSuccess={handleGoogleSignup}
          onError={() =>
            alert("Google login failed")
          }
        />
      </div>
    </div>
  );
};

export default Register;
