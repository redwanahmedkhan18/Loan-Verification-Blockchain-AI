// src/pages/Staff.jsx
import { useEffect, useMemo, useState } from "react";
import {
  Alert, Box, Button, Chip, Container, Dialog, DialogActions, DialogContent,
  DialogTitle, Grid, IconButton, MenuItem, Paper, Stack, TextField, Typography,
  Table, TableBody, TableCell, TableHead, TableRow
} from "@mui/material";
import { Link as RLink, useNavigate } from "react-router-dom";
import AddIcon from "@mui/icons-material/PersonAddAlt";
import EditIcon from "@mui/icons-material/Edit";
import useAuth from "../hooks/useAuth";
import { createUser, listUsers, patchUser } from "../api/staff";

export default function Staff() {
  const { user } = useAuth();
  const nav = useNavigate();

  const [tab, setTab] = useState("borrower"); // default for officers
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const canSeeOfficers = user?.role === "admin";

  useEffect(() => {
    document.title = "Manage Staff — TrustEdge";
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function load() {
    setErr(""); setOk("");
    try {
      const r = await listUsers({ role: tab, q: q || undefined });
      setRows(Array.isArray(r) ? r : []);
    } catch (e) {
      setErr(e.message || "Failed to load users");
    }
  }

  function roleChip(role) {
    const c =
      role === "admin" ? "error" :
      role === "officer" ? "info" : "success";
    return <Chip size="small" label={role} color={c} variant="outlined" />;
  }

  return (
    <Container sx={{ py: 4 }}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems="center" spacing={2}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="h5" fontWeight={800}>Manage Staff</Typography>
            <Chip size="small" label={user?.role?.toUpperCase()} />
          </Stack>
          <Stack direction="row" spacing={1}>
            {canSeeOfficers && (
              <Button
                variant={tab === "officer" ? "contained" : "outlined"}
                onClick={() => setTab("officer")}
              >
                Officers
              </Button>
            )}
            <Button
              variant={tab === "borrower" ? "contained" : "outlined"}
              onClick={() => setTab("borrower")}
            >
              Borrowers
            </Button>
            {canSeeOfficers && (
              <Button
                variant={tab === "admin" ? "contained" : "outlined"}
                onClick={() => setTab("admin")}
              >
                Admins
              </Button>
            )}
          </Stack>
        </Stack>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 2 }}>
          <TextField
            size="small"
            label="Search (email / name)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
          />
          <Button onClick={load} variant="outlined">Search</Button>
          <Box sx={{ flexGrow: 1 }} />
          <AddUserButton currentRole={user?.role} defaultRole={tab} onCreated={load} />
        </Stack>
      </Paper>

      <Paper sx={{ p: 2 }}>
        {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
        {ok && <Alert severity="success" sx={{ mb: 2 }}>{ok}</Alert>}

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Active</TableCell>
              <TableCell>Created</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <Button component={RLink} to={`/staff/${r.id}`} size="small">
                    {r.email}
                  </Button>
                </TableCell>
                <TableCell>{roleChip(r.role)}</TableCell>
                <TableCell>{r.full_name || "-"}</TableCell>
                <TableCell>{r.is_active ? "Yes" : "No"}</TableCell>
                <TableCell>{r.created_at ? new Date(r.created_at).toLocaleString() : "-"}</TableCell>
                <TableCell align="right">
                  <QuickToggleActive userId={r.id} isActive={!!r.is_active} onChanged={load} />
                </TableCell>
              </TableRow>
            ))}
            {!rows.length && (
              <TableRow>
                <TableCell colSpan={6} align="center">No users.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Container>
  );
}

function QuickToggleActive({ userId, isActive, onChanged }) {
  const [busy, setBusy] = useState(false);
  async function toggle() {
    setBusy(true);
    try {
      await patchUser(userId, { is_active: !isActive });
      onChanged?.();
    } finally {
      setBusy(false);
    }
  }
  return (
    <Button onClick={toggle} size="small" variant="outlined" disabled={busy}>
      {isActive ? "Disable" : "Enable"}
    </Button>
  );
}

function AddUserButton({ currentRole, defaultRole = "borrower", onCreated }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    email: "", password: "", role: defaultRole, full_name: "", phone: "", nid_number: "", address: ""
  });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // keep role in sync with current tab
    setForm((s) => ({ ...s, role: defaultRole }));
  }, [defaultRole]);

  const roles = currentRole === "admin" ? ["borrower", "officer", "admin"] : ["borrower"];

  function set(k, v) { setForm((s) => ({ ...s, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await createUser(form);
      setOpen(false);
      onCreated?.();
    } catch (e) {
      setErr(e.message || "Create failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button startIcon={<AddIcon />} variant="contained" color="secondary" onClick={() => setOpen(true)}>
        Add User
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add {form.role.charAt(0).toUpperCase() + form.role.slice(1)}</DialogTitle>
        <DialogContent>
          {err && <Alert severity="error" sx={{ my: 1 }}>{err}</Alert>}
          <Box component="form" onSubmit={submit} sx={{ mt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={8}>
                <TextField label="Email" fullWidth required value={form.email} onChange={(e) => set("email", e.target.value)} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField select label="Role" fullWidth value={form.role} onChange={(e) => set("role", e.target.value)}>
                  {roles.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField label="Temp Password" type="password" fullWidth required value={form.password} onChange={(e) => set("password", e.target.value)} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField label="Full Name" fullWidth value={form.full_name} onChange={(e) => set("full_name", e.target.value)} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField label="Phone" fullWidth value={form.phone} onChange={(e) => set("phone", e.target.value)} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField label="NID Number" fullWidth value={form.nid_number} onChange={(e) => set("nid_number", e.target.value)} />
              </Grid>
              <Grid item xs={12}>
                <TextField label="Address" fullWidth value={form.address} onChange={(e) => set("address", e.target.value)} />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Close</Button>
          <Button onClick={submit} variant="contained" disabled={busy}>Create</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
