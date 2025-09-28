// src/pages/Contact.jsx
import { useState } from "react";
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  Stack,
} from "@mui/material";
import { submitContact } from "../api/contact";

export default function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [ok, setOk] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setOk("");
    setErr("");
    setBusy(true);
    try {
      await submitContact({ name, email, message });
      setOk("Thanks! We received your message and will get back to you soon.");
      setName("");
      setEmail("");
      setMessage("");
    } catch (e) {
      setErr(e?.message || "Failed to send message");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Container sx={{ py: 6 }}>
      <Paper sx={{ p: 4, maxWidth: 720, mx: "auto" }}>
        <Typography variant="h5" fontWeight={800} gutterBottom>
          Contact Us
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Have questions? Send us a note and we’ll reach out.
        </Typography>

        {ok && <Alert severity="success" sx={{ mb: 2 }}>{ok}</Alert>}
        {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

        <form onSubmit={onSubmit}>
          <Stack spacing={2}>
            <TextField
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              fullWidth
            />
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              fullWidth
            />
            <TextField
              label="Message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              multiline
              minRows={4}
              required
              fullWidth
            />
            <Button type="submit" variant="contained" size="large" disabled={busy}>
              {busy ? "Sending..." : "Submit"}
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}
