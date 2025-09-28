import { useEffect, useState } from "react";
import { useSearchParams, Link as RLink, useNavigate } from "react-router-dom";
import { Container, Paper, Typography, TextField, Button, Alert } from "@mui/material";
import { resetPassword } from "../api/auth";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const [pwd, setPwd] = useState("");
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => { document.title = "Reset Password — TrustEdge Bank"; }, []);

  async function submit(e) {
    e.preventDefault(); setErr("");
    try {
      const token = params.get("token");
      if (!token) { setErr("Missing token"); return; }
      await resetPassword(token, pwd);
      setOk(true);
      setTimeout(()=> nav("/login"), 1200);
    } catch (e) { setErr(e.message); }
  }

  return (
    <Container sx={{ py: 6 }}>
      <Paper sx={{ p: 4, maxWidth: 480, mx: "auto" }}>
        <Typography variant="h6" fontWeight={800}>Choose a new password</Typography>
        {ok && <Alert severity="success" sx={{ my: 2 }}>Password changed. Redirecting to login…</Alert>}
        {err && <Alert severity="error" sx={{ my: 2 }}>{err}</Alert>}
        <form onSubmit={submit} style={{ display: "grid", gap: 12, marginTop: 16 }}>
          <TextField label="New Password" type="password" value={pwd} onChange={e=>setPwd(e.target.value)} required />
          <Button type="submit" variant="contained">Set Password</Button>
        </form>
      </Paper>
    </Container>
  );
}
