// src/api/contact.js
import { api, handleError } from "./client";

/** Submit a contact message */
export async function submitContact({ name, email, message }) {
  try {
    const { data } = await api.post("/contact", { name, email, message });
    return data; // { status: "ok", id }
  } catch (e) {
    handleError(e);
  }
}
