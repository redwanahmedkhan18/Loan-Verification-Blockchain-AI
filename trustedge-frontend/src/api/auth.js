// src/api/auth.js
import { api, handleError } from "./client";

export const TOKEN_KEY = "te_token";

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
}
export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * Email/password login
 * Backend expects OAuth2 form fields: username + password
 * NOTE: pass the portal role (borrower|officer|admin) via as_role query param
 */
export async function login(email, password, asRole = "borrower") {
  try {
    const body = new URLSearchParams();
    body.set("username", (email || "").trim().toLowerCase());
    body.set("password", password);

    const { data } = await api.post("/auth/login", body.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      params: asRole ? { as_role: asRole } : undefined,
    });

    setToken(data?.access_token || data?.token);
    return data;
  } catch (e) {
    handleError(e);
  }
}

/**
 * Registration (public sign-up is borrower-only)
 * This helper keeps the old signature but forces role="borrower".
 * Your Register page should send the full multipart form (including photo).
 */
export async function register(email, password, _roleIgnored = "borrower") {
  try {
    const payload = {
      email: (email || "").trim().toLowerCase(),
      password,
      role: "borrower", // force borrower on client; backend enforces too
    };
    const { data } = await api.post("/auth/register", payload);
    return data; // UserOut
  } catch (e) {
    handleError(e);
  }
}

/**
 * Current user (requires Authorization header set by axios interceptor)
 */
export async function me() {
  try {
    const { data } = await api.get("/auth/me");
    return data;
  } catch (e) {
    handleError(e);
  }
}

/**
 * Google Sign-in
 * Send ID token from Google Identity Services to backend.
 * Also pass as_role so backend can enforce role-based portal access.
 */
export async function loginWithGoogle(idToken, asRole = "borrower") {
  try {
    const { data } = await api.post(
      "/auth/google",
      { id_token: idToken },
      { params: asRole ? { as_role: asRole } : undefined }
    );
    setToken(data?.access_token || data?.token);
    return data;
  } catch (e) {
    handleError(e);
  }
}

/**
 * Email verification helpers
 */
export async function resendVerification(email) {
  try {
    await api.post("/auth/resend-verification", {
      email: (email || "").trim().toLowerCase(),
    });
  } catch (e) {
    handleError(e);
  }
  return { ok: true };
}

export async function verifyEmail(token) {
  try {
    const { data } = await api.get("/auth/verify", { params: { token } });
    return data; // { status: "verified", email }
  } catch (e) {
    handleError(e);
  }
}

/**
 * Forgot / Reset password
 */
export async function forgotPassword(email) {
  try {
    await api.post("/auth/forgot-password", {
      email: (email || "").trim().toLowerCase(),
    });
  } catch (e) {
    handleError(e);
  }
  return { ok: true };
}

export async function resetPassword(token, newPassword) {
  try {
    const { data } = await api.post("/auth/reset-password", {
      token,
      new_password: newPassword,
    });
    return data; // { status: "password_changed" }
  } catch (e) {
    handleError(e);
  }
}

export function logout() {
  clearToken();
}
