import { useEffect, useState } from "react";
import { useSearchParams, Link as RLink } from "react-router-dom";
import { Alert, Button, Container, Paper, Typography } from "@mui/material";
import { verifyEmail } from "../api/auth";

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    document.title = "Verify Email — TrustEdge Bank";
    (async () => {
      const token = params.get("token");
      if (!token) { setErr("Missing token"); return; }
      try { 
        const res = await verifyEmail(token);
        setMsg(`✅ Email verified for ${res.email}. You can now log in.`);
      } catch (e) { setErr(e.message); }
    })();
  }, []);

  return (
    <Container sx={{ py: 6 }}>
      <Paper sx={{ p: 4, maxWidth: 560, mx: "auto" }}>
        <Typography variant="h6" fontWeight={800}>Email Verification</Typography>
        {msg && <Alert severity="success" sx={{ mt: 2 }}>{msg}</Alert>}
        {err && <Alert severity="error" sx={{ mt: 2 }}>{err}</Alert>}
        <Button component={RLink} to="/login" variant="contained" sx={{ mt: 3 }}>
          Go to Login
        </Button>
      </Paper>
    </Container>
  );
}
