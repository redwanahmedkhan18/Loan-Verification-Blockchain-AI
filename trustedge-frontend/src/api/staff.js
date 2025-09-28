// src/api/staff.js
import { api, handleError } from "./client";

/* -------------------------------------------------
   Small helpers for graceful fallbacks (404 only)
-------------------------------------------------- */
async function getWithFallback(primary, fallback, config = {}) {
  try {
    const res = await api.get(primary, config);
    return res.data;
  } catch (e) {
    if (e?.response?.status === 404 && fallback) {
      const res2 = await api.get(fallback, config);
      return res2.data;
    }
    handleError(e);
  }
}
async function postWithFallback(primary, fallback, body = undefined, config = {}) {
  try {
    const res = await api.post(primary, body, config);
    return res.data;
  } catch (e) {
    if (e?.response?.status === 404 && fallback) {
      const res2 = await api.post(fallback, body, config);
      return res2.data;
    }
    handleError(e);
  }
}
async function patchWithFallback(primary, fallback, body = undefined, config = {}) {
  try {
    const res = await api.patch(primary, body, config);
    return res.data;
  } catch (e) {
    if (e?.response?.status === 404 && fallback) {
      const res2 = await api.patch(fallback, body, config);
      return res2.data;
    }
    handleError(e);
  }
}

/* ---------------------------------
   Borrowers (kept for compatibility)
---------------------------------- */

export async function listBorrowers({ q, active, page = 1, pageSize = 20 } = {}) {
  try {
    const { data } = await api.get("/staff/borrowers", {
      params: { q, active, page, page_size: pageSize },
    });
    return data; // { total, items }
  } catch (e) {
    handleError(e);
  }
}

export async function createBorrower({ email, full_name, phone, address }) {
  try {
    const { data } = await api.post("/staff/borrowers", null, {
      params: { email, full_name, phone, address },
    });
    return data; // sanitized user
  } catch (e) {
    handleError(e);
  }
}

export async function getBorrower(id) {
  try {
    const { data } = await api.get(`/staff/borrowers/${id}`);
    return data; // sanitized user
  } catch (e) {
    handleError(e);
  }
}

export async function updateBorrower(id, patch) {
  try {
    const { full_name, phone, address, is_active } = patch || {};
    const { data } = await api.patch(`/staff/borrowers/${id}`, null, {
      params: { full_name, phone, address, is_active },
    });
    return data; // sanitized user
  } catch (e) {
    handleError(e);
  }
}

/* Borrower subresources */
export async function borrowerApplications(id) {
  try {
    const { data } = await api.get(`/staff/borrowers/${id}/applications`);
    return data;
  } catch (e) {
    handleError(e);
  }
}

export async function borrowerLoans(id) {
  try {
    const { data } = await api.get(`/staff/borrowers/${id}/loans`);
    return data;
  } catch (e) {
    handleError(e);
  }
}

export async function borrowerPayments(id) {
  try {
    const { data } = await api.get(`/staff/borrowers/${id}/payments`);
    return data;
  } catch (e) {
    handleError(e);
  }
}

export async function borrowerKyc(id) {
  try {
    const { data } = await api.get(`/staff/borrowers/${id}/kyc`);
    return data;
  } catch (e) {
    handleError(e);
  }
}

/* ----------------
   KYC queue/admin
------------------ */

export async function kycQueue(status = "Pending") {
  try {
    const { data } = await api.get("/staff/kyc/queue", { params: { status } });
    return data;
  } catch (e) {
    handleError(e);
  }
}

export async function setKycStatus(docId, status, note = "") {
  try {
    const { data } = await api.patch(`/staff/kyc/${docId}`, null, {
      params: { status, note },
    });
    return data;
  } catch (e) {
    handleError(e);
  }
}

/* ---------------------------
   Staff Management (NEW)
   Unified /staff/users* endpoints
   - Admin: manage all roles
   - Officer: borrowers only
---------------------------- */

/** List users with filters (admin: any role; officer: borrowers only). */
export async function listUsers({ role, q, active, page = 1, pageSize = 25 } = {}) {
  try {
    const { data } = await api.get("/staff/users", {
      params: { role, q, active, page, page_size: pageSize },
    });
    return data; // { total, items }
  } catch (e) {
    handleError(e);
  }
}

/**
 * Create a user.
 * Admin: role can be borrower/officer/admin
 * Officer: role must be borrower
 * payload = { email, password?, role, full_name?, phone?, nid_number?, address? }
 */
export async function createUser(payload) {
  try {
    const { data } = await api.post("/staff/users", payload); // JSON body
    return data; // sanitized user
  } catch (e) {
    handleError(e);
  }
}

/** Get a single user (officers can only view borrowers). */
export async function getUser(userId) {
  try {
    const { data } = await api.get(`/staff/users/${userId}`);
    return data; // sanitized user
  } catch (e) {
    handleError(e);
  }
}

/** Get full overview for a user: { user, applications, loans:[{loan,repayments}...] } */
export async function userOverview(userId) {
  try {
    const { data } = await api.get(`/staff/users/${userId}/overview`);
    return data;
  } catch (e) {
    handleError(e);
  }
}

/**
 * Patch a user.
 * Admin: can change role, is_active, and profile fields.
 * Officer: can change borrowers’ profile fields + is_active (not role).
 * patch = { role?, is_active?, full_name?, phone?, nid_number?, address? }
 */
export async function patchUser(userId, patch = {}) {
  try {
    const { data } = await api.patch(`/staff/users/${userId}`, patch); // JSON body
    return data; // sanitized user
  } catch (e) {
    handleError(e);
  }
}

/* ------------------------------------------
   Officer convenience helpers (used by UI)
   They target /staff/users under the hood,
   but fall back to /staff/officers if present.
------------------------------------------- */

/** Admin-only: list officers. */
export async function listOfficers({ q, active, page = 1, pageSize = 25 } = {}) {
  // Prefer unified users endpoint with role=officer; fallback to legacy /staff/officers
  const primary = "/staff/users";
  const fallback = "/staff/officers";
  const params = { role: "officer", q, active, page, page_size: pageSize };
  const data = await getWithFallback(primary, fallback, { params });
  // legacy /staff/officers returns { total, items } as well — keep same shape
  return data;
}

/** Admin-only: create an officer (wraps createUser with role='officer'). */
export async function createOfficer({ email, full_name, phone, address }) {
  // Prefer unified POST /staff/users; fallback to legacy POST /staff/officers (query params)
  try {
    const { data } = await api.post("/staff/users", {
      email,
      role: "officer",
      full_name,
      phone,
      address,
    });
    return data;
  } catch (e) {
    if (e?.response?.status === 404) {
      // Fallback to legacy officers endpoint
      return await postWithFallback(
        "/staff/officers",
        null,
        null,
        { params: { email, full_name, phone, address } }
      );
    }
    handleError(e);
  }
}

/** Admin-only: get officer by id. */
export async function getOfficer(id) {
  try {
    const { data } = await api.get(`/staff/users/${id}`);
    return data;
  } catch (e) {
    if (e?.response?.status === 404) {
      return await getWithFallback(`/staff/officers/${id}`, null);
    }
    handleError(e);
  }
}

/** Admin-only: update officer profile/active status. */
export async function updateOfficer(id, patch) {
  try {
    const { data } = await api.patch(`/staff/users/${id}`, patch);
    return data;
  } catch (e) {
    if (e?.response?.status === 404) {
      const { full_name, phone, address, is_active } = patch || {};
      return await patchWithFallback(
        `/staff/officers/${id}`,
        null,
        null,
        { params: { full_name, phone, address, is_active } }
      );
    }
    handleError(e);
  }
}
