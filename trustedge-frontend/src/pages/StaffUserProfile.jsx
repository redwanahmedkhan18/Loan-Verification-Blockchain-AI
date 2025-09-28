// src/pages/StaffUserProfile.jsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Alert, Box, Button, Chip, Container, Paper, Stack, TextField, Typography,
} from "@mui/material";
import { getOfficer, updateOfficer } from "../api/staff";

export default function StaffUserProfile() {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  async function load() {
    setErr(""); setOk("");
    try {
      const data = await getOfficer(id);
      setUser(data);
    } catch (e) {
      setErr(e.message || "Failed to load user");
    }
  }

  useEffect(() => {
    document.title = `Officer #${id} — TrustEdge`;
    load();
  }, [id]);

  async function save(e) {
    e.preventDefault();
    setErr(""); setOk("");
    try {
      await updateOfficer(id, {
        full_name: user.full_name,
        phone: user.phone,
        address: user.address,
        is_active: user.is_active,
      });
      setOk("Saved.");
      load();
    } catch (e) {
      setErr(e.message || "Failed to save");
    }
  }

  if (!user) {
    return (
      <Container sx={{ py: 4 }}>
        <Paper sx={{ p: 3 }}><Typography>Loading…</Typography></Paper>
      </Container>
    );
  }

  return (
    <Container sx={{ py: 4 }}>
      <Paper sx={{ p: 3, display: "grid", gap: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="h5" fontWeight={800}>Officer Profile</Typography>
          <Chip label={user.is_active ? "ACTIVE" : "INACTIVE"} color={user.is_active ? "success" : "default"} />
        </Stack>

        {err && <Alert severity="error">{err}</Alert>}
        {ok && <Alert severity="success">{ok}</Alert>}

        <Box component="form" onSubmit={save} sx={{ display: "grid", gap: 2 }}>
          <TextField label="Email" value={user.email} InputProps={{ readOnly: true }} />
          <TextField
            label="Full name"
            value={user.full_name || ""}
            onChange={(e) => setUser({ ...user, full_name: e.target.value })}
          />
          <TextField
            label="Phone"
            value={user.phone || ""}
            onChange={(e) => setUser({ ...user, phone: e.target.value })}
          />
          <TextField
            label="Address"
            value={user.address || ""}
            onChange={(e) => setUser({ ...user, address: e.target.value })}
          />
          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              variant={user.is_active ? "outlined" : "contained"}
              color={user.is_active ? "warning" : "success"}
              onClick={() => setUser({ ...user, is_active: !user.is_active })}
            >
              {user.is_active ? "Deactivate" : "Activate"}
            </Button>
            <Box sx={{ flexGrow: 1 }} />
            <Button type="submit" variant="contained">Save</Button>
          </Stack>
        </Box>
      </Paper>
    </Container>
  );
}
