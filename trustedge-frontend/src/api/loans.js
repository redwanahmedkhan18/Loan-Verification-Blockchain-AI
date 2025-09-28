// src/api/loans.js
import { api, handleError } from "./client";

/* ---------------- helpers ---------------- */

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

/* ---------------- Applications ---------------- */

export async function createApplication(payload) {
  try {
    const { data } = await api.post("/loans/applications", payload);
    return data;
  } catch (e) {
    handleError(e);
  }
}

export async function listApplications(scope = "mine") {
  try {
    const { data } = await api.get("/loans/applications", { params: { scope } });
    return data;
  } catch (e) {
    if (scope === "mine") {
      return await getWithFallback("/loans/applications?scope=mine", "/loans/applications/mine");
    }
    handleError(e);
  }
}

export async function getApplication(id) {
  try {
    const { data } = await api.get(`/loans/applications/${id}`);
    return data;
  } catch (e) {
    try {
      const mine = await listApplications("mine");
      const hit = (mine || []).find((a) => String(a.id) === String(id));
      if (hit) return hit;
      const all = await listApplications("all");
      return (all || []).find((a) => String(a.id) === String(id));
    } catch {
      /* ignore */
    }
    handleError(e);
  }
}

export async function decideApplication(applicationId, decision, reason = "") {
  try {
    const { data } = await api.post(
      `/loans/applications/${applicationId}/decision`,
      null,
      { params: { decision, reason } }
    );
    return data;
  } catch (e) {
    handleError(e);
  }
}

/** Optional legacy helpers */
export async function updateApplication(id, patch) {
  try {
    const { data } = await api.patch(`/loans/applications/${id}`, patch);
    return data;
  } catch (e) {
    handleError(e);
  }
}

export async function mintOnChain(id) {
  try {
    const { data } = await api.post(`/chain/mint/${id}`);
    return data;
  } catch (e) {
    handleError(e);
  }
}

/* ---------------- Loans & Repayments ---------------- */

export async function listMyLoans() {
  // normal + defensive fallback in case of double prefixing
  return await getWithFallback("/loans/mine", "/loans/loans/mine");
}

export async function getLoanChart(loanId) {
  return await getWithFallback(`/loans/${loanId}/chart`, `/loans/loans/${loanId}/chart`);
}

/* ---------------- Stripe Payments (manual capture flow) ---------------- */

/**
 * Borrower: create a Stripe PaymentIntent for a repayment (manual capture).
 * Returns: { client_secret, payment_id, payment_intent_id }
 */
export async function createStripeIntent(loanId, repaymentId, { amount, currency } = {}) {
  const primary = `/loans/${loanId}/repayments/${repaymentId}/stripe/intent`;
  const fallback = `/loans/loans/${loanId}/repayments/${repaymentId}/stripe/intent`;
  return await postWithFallback(primary, fallback, null, {
    params: { amount, currency },
  });
}

/**
 * Borrower: after confirming the card with Stripe Elements on the client,
 * call this to mark the Payment as Authorized (when PI.status == "requires_capture").
 */
export async function confirmStripeAuthorization(paymentIntentId) {
  try {
    const { data } = await api.post("/loans/payments/confirm", null, {
      params: { payment_intent_id: paymentIntentId },
    });
    return data; // { payment_id, status }
  } catch (e) {
    handleError(e);
  }
}

/** Compatibility alias so components can import { confirmAuthorization } */
export const confirmAuthorization = confirmStripeAuthorization;

/** Officer/Admin: list payments in Authorized state awaiting capture */
export async function listPendingPayments() {
  try {
    const { data } = await api.get("/loans/payments/pending");
    return data;
  } catch (e) {
    handleError(e);
  }
}

/** Officer/Admin: capture an authorized payment */
export async function approvePayment(paymentId) {
  try {
    const { data } = await api.post(`/loans/payments/${paymentId}/approve`);
    return data; // { payment_id, status, repayment_status, receipt_url }
  } catch (e) {
    handleError(e);
  }
}

/** Officer/Admin: void an authorization */
export async function cancelPayment(paymentId) {
  try {
    const { data } = await api.post(`/loans/payments/${paymentId}/cancel`);
    return data;
  } catch (e) {
    handleError(e);
  }
}

/* ---------------- misc helpers ---------------- */

export function mediaUrl(pathOrSlashMedia) {
  if (!pathOrSlashMedia) return "";
  const base = import.meta.env.VITE_API_BASE?.replace(/\/+$/, "") || "";
  const path = pathOrSlashMedia.startsWith("/media")
    ? pathOrSlashMedia
    : `/media/${String(pathOrSlashMedia).replace(/^\/+/, "")}`;
  return `${base}${path}`;
}

/* ---------------- deprecated direct-pay ---------------- */

export async function payInstallment() {
  throw new Error(
    "payInstallment() is deprecated. Use createStripeIntent() + confirmAuthorization(), then have an officer approve."
  );
}
