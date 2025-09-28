import { useState, useEffect } from "react";
import { Container, Paper, Typography, TextField, Button, Alert } from "@mui/material";
import { forgotPassword } from "../api/auth";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => { document.title = "Forgot Password — TrustEdge Bank"; }, []);

  async function submit(e) {
    e.preventDefault(); setErr(""); setOk(false);
    try {
      await forgotPassword(email);
      setOk(true);
    } catch (e) { setErr(e.message); }
  }

  return (
    <Container sx={{ py: 6 }}>
      <Paper sx={{ p: 4, maxWidth: 480, mx: "auto" }}>
        <Typography variant="h6" fontWeight={800}>Forgot Password</Typography>
        {ok && <Alert severity="success" sx={{ my: 2 }}>
          If that email exists, a reset link has been sent.
        </Alert>}
        {err && <Alert severity="error" sx={{ my: 2 }}>{err}</Alert>}
        <form onSubmit={submit} style={{ display: "grid", gap: 12, marginTop: 16 }}>
          <TextField label="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
          <Button type="submit" variant="contained">Send Reset Link</Button>
        </form>
      </Paper>
    </Container>
  );
}
