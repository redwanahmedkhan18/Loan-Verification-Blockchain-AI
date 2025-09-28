import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Container, Paper, Typography, Stack, Button, Alert } from "@mui/material";
import { getApplication } from "../api/loans";
import { scoreApplication } from "../api/ai";
import { mintOnChain } from "../api/loans";
import useAuth from "../hooks/useAuth";

export default function ApplicationDetails() {
  const { id } = useParams();
  const [a, setA] = useState(null);
  const [err, setErr] = useState("");
  const { user } = useAuth();

  async function refresh() {
    setErr("");
    try { setA(await getApplication(id)); }
    catch (e) { setErr(e.message); }
  }
  useEffect(()=>{ refresh(); }, [id]);

  async function runScore() {
    try { await scoreApplication(id); await refresh(); }
    catch (e) { setErr(e.message); }
  }
  async function runMint() {
    try { await mintOnChain(id); await refresh(); }
    catch (e) { setErr(e.message); }
  }

  if (!a) return <Container sx={{ py: 4 }}><Typography>Loading...</Typography></Container>;

  return (
    <Container sx={{ py: 4 }}>
      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight={800}>Application #{a.id}</Typography>
        <Typography sx={{ mt: 1 }}>Status: <b>{a.status}</b></Typography>
        <Typography>Amount: {a.amount} • Term: {a.term_months} months</Typography>
        {a.ai_score != null && (
          <Typography>AI Score: {Number(a.ai_score).toFixed(4)} • Risk: {a.risk_level || a.ai_risk_band}</Typography>
        )}
        <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
          <Button onClick={runScore} variant="contained">Score with AI</Button>
          {(user?.role === "officer" || user?.role === "admin") && (
            <Button onClick={runMint} variant="contained" color="secondary">Mint On-Chain</Button>
          )}
        </Stack>
      </Paper>
    </Container>
  );
}
