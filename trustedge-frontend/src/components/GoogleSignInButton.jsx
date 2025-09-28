// src/components/GoogleSignInButton.jsx
import { GoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";
import { loginWithGoogle } from "../api/auth";
import useAuth from "../hooks/useAuth";

export default function GoogleSignInButton({
  onSuccessRedirect = "/dashboard",
  oneTap = false,
}) {
  const nav = useNavigate();
  const auth = useAuth?.();
  const setToken = auth?.setToken;
  const setUser = auth?.setUser;

  async function handleSuccess(credentialResponse) {
    try {
      const id_token = credentialResponse?.credential;
      if (!id_token) throw new Error("No Google credential returned");

      // Exchange Google ID token for our backend JWT
      const data = await loginWithGoogle(id_token); // stores te_token in localStorage
      const token = data?.access_token || data?.token;

      if (token && typeof setToken === "function") setToken(token);

      // Load current user and store in context if available
      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("te_token")}` },
        });
        if (res.ok) {
          const me = await res.json();
          if (typeof setUser === "function") setUser(me);
        }
      } catch {
        /* non-fatal – ignore */
      }

      nav(onSuccessRedirect, { replace: true });
    } catch (e) {
      console.error("Google login failed:", e);
      alert(e?.message || "Google sign-in failed");
    }
  }

  return (
    <div style={{ display: "grid", justifyContent: "center" }}>
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={() => alert("Google sign-in was cancelled or failed")}
        useOneTap={oneTap}
        theme="outline"
        type="standard"
        size="large"
        shape="rectangular"
        text="continue_with"
      />
    </div>
  );
}
