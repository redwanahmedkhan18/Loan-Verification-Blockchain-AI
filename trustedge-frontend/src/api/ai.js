import { api, handleError } from "./client";

export async function aiMode() {
  try { const { data } = await api.get("/ai/mode"); return data; }
  catch (e) { handleError(e); }
}

export async function scoreApplication(id) {
  try { const { data } = await api.post(`/ai/score/${id}`); return data; }
  catch (e) { handleError(e); }
}

export async function predict(features) {
  try { const { data } = await api.post("/ai/predict", features); return data; }
  catch (e) { handleError(e); }
}
