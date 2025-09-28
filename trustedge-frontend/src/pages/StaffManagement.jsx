// src/pages/StaffManagement.jsx
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
  Table, TableHead, TableRow, TableCell, TableBody,
} from "@mui/material";
import { Link as RLink } from "react-router-dom";
import {
  listOfficers,
  createOfficer,
  listBorrowers,
  createBorrower,
} from "../api/staff";

const currency = (v) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(v ?? 0);

export default function StaffManagement() {
  const [tab, setTab] = useState(0);

  // Officers
  const [officers, setOfficers] = useState([]);
  const [offQ, setOffQ] = useState("");
  const [offActive, setOffActive] = useState("");
  const [offErr, setOffErr] = useState("");
  const [offOk, setOffOk] = useState("");
  const [offForm, setOffForm] = useState({ email: "", full_name: "", phone: "", address: "" });

  // Borrowers
  const [borrows, setBorrows] = useState([]);
  const [borQ, setBorQ] = useState("");
  const [borActive, setBorActive] = useState("");
  const [borErr, setBorErr] = useState("");
  const [borOk, setBorOk] = useState("");
  const [borForm, setBorForm] = useState({ email: "", full_name: "", phone: "", address: "" });

  useEffect(() => {
    document.title = "Manage Staff — TrustEdge Bank";
  }, []);

  // Loaders
  async function loadOfficers() {
    setOffErr(""); setOffOk("");
    try {
      const data = await listOfficers({
        q: offQ || undefined,
        active: offActive === "" ? undefined : offActive === "true",
        page: 1,
        pageSize: 50,
      });
      setOfficers(data?.items || []);
    } catch (e) {
      setOffErr(e.message || "Failed to load officers");
    }
  }

  async function loadBorrowers() {
    setBorErr(""); setBorOk("");
    try {
      const data = await listBorrowers({
        q: borQ || undefined,
        active: borActive === "" ? undefined : borActive === "true",
        page: 1,
        pageSize: 50,
      });
      setBorrows(data?.items || []);
    } catch (e) {
      setBorErr(e.message || "Failed to load borrowers");
    }
  }

  useEffect(() => { loadOfficers(); }, []);     // initial
  useEffect(() => { if (tab === 0) loadOfficers(); }, [tab]); // refresh when switching back
  useEffect(() => { if (tab === 1) loadBorrowers(); }, [tab]); // refresh when switching

  // Create handlers
  async function onCreateOfficer(e) {
    e.preventDefault();
    setOffErr(""); setOffOk("");
    try {
      await createOfficer(offForm);
      setOffOk("Officer invited (email sent with password setup).");
      setOffForm({ email: "", full_name: "", phone: "", address: "" });
      loadOfficers();
    } catch (e) {
      setOffErr(e.message || "Failed to create officer");
    }
  }

  async function onCreateBorrower(e) {
    e.preventDefault();
    setBorErr(""); setBorOk("");
    try {
      await createBorrower(borForm);
      setBorOk("Borrower invited (email sent with password setup).");
      setBorForm({ email: "", full_name: "", phone: "", address: "" });
      loadBorrowers();
    } catch (e) {
      setBorErr(e.message || "Failed to create borrower");
    }
  }

  const statusChip = (u) => {
    const color = u.is_active ? "success" : "default";
    return <Chip size="small" color={color} label={u.is_active ? "ACTIVE" : "INACTIVE"} variant="outlined" />;
  };

  return (
    <Container sx={{ py: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          alignItems={{ xs: "flex-start", sm: "center" }}
          justifyContent="space-between"
          spacing={2}
        >
          <Typography variant="h5" fontWeight={800}>Manage Staff</Typography>
        </Stack>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mt: 2 }}>
          <Tab label="Officers" />
          <Tab label="Borrowers" />
        </Tabs>

        <Divider sx={{ my: 2 }} />

        {/* Officers */}
        {tab === 0 && (
          <Box sx={{ display: "grid", gap: 2 }}>
            {/* Create officer */}
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                Add Officer
              </Typography>
              {offErr && <Alert severity="error" sx={{ mb: 2 }}>{offErr}</Alert>}
              {offOk && <Alert severity="success" sx={{ mb: 2 }}>{offOk}</Alert>}
              <Box
                component="form"
                onSubmit={onCreateOfficer}
                sx={{ display: "grid", gap: 1, gridTemplateColumns: { sm: "1fr 1fr" }, alignItems: "center" }}
              >
                <TextField
                  required
                  label="Email"
                  type="email"
                  value={offForm.email}
                  onChange={(e) => setOffForm({ ...offForm, email: e.target.value })}
                />
                <TextField
                  label="Full name"
                  value={offForm.full_name}
                  onChange={(e) => setOffForm({ ...offForm, full_name: e.target.value })}
                />
                <TextField
                  label="Phone"
                  value={offForm.phone}
                  onChange={(e) => setOffForm({ ...offForm, phone: e.target.value })}
                />
                <TextField
                  label="Address"
                  value={offForm.address}
                  onChange={(e) => setOffForm({ ...offForm, address: e.target.value })}
                />
                <Box sx={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", mt: 1 }}>
                  <Button type="submit" variant="contained">Invite Officer</Button>
                </Box>
              </Box>
            </Paper>

            {/* Filter + list officers */}
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems="center">
                <TextField
                  size="small"
                  label="Search (email/name/phone)"
                  value={offQ}
                  onChange={(e) => setOffQ(e.target.value)}
                />
                <TextField
                  size="small"
                  select
                  SelectProps={{ native: true }}
                  label="Active"
                  value={offActive}
                  onChange={(e) => setOffActive(e.target.value)}
                >
                  <option value="">All</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </TextField>
                <Button onClick={loadOfficers} variant="outlined">Search</Button>
              </Stack>

              <Table size="small" sx={{ mt: 2 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Phone</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Joined</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {officers.map(u => (
                    <TableRow key={u.id}>
                      <TableCell>{u.id}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>{u.full_name || "—"}</TableCell>
                      <TableCell>{u.phone || "—"}</TableCell>
                      <TableCell>{statusChip(u)}</TableCell>
                      <TableCell>{u.created_at ? new Date(u.created_at).toLocaleDateString() : "-"}</TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          component={RLink}
                          to={`/staff/users/${u.id}`}
                          variant="outlined"
                        >
                          View Profile
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!officers.length && (
                    <TableRow>
                      <TableCell colSpan={7} align="center">No officers found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Paper>
          </Box>
        )}

        {/* Borrowers */}
        {tab === 1 && (
          <Box sx={{ display: "grid", gap: 2 }}>
            {/* Create borrower */}
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                Add Borrower
              </Typography>
              {borErr && <Alert severity="error" sx={{ mb: 2 }}>{borErr}</Alert>}
              {borOk && <Alert severity="success" sx={{ mb: 2 }}>{borOk}</Alert>}
              <Box
                component="form"
                onSubmit={onCreateBorrower}
                sx={{ display: "grid", gap: 1, gridTemplateColumns: { sm: "1fr 1fr" }, alignItems: "center" }}
              >
                <TextField
                  required
                  label="Email"
                  type="email"
                  value={borForm.email}
                  onChange={(e) => setBorForm({ ...borForm, email: e.target.value })}
                />
                <TextField
                  label="Full name"
                  value={borForm.full_name}
                  onChange={(e) => setBorForm({ ...borForm, full_name: e.target.value })}
                />
                <TextField
                  label="Phone"
                  value={borForm.phone}
                  onChange={(e) => setBorForm({ ...borForm, phone: e.target.value })}
                />
                <TextField
                  label="Address"
                  value={borForm.address}
                  onChange={(e) => setBorForm({ ...borForm, address: e.target.value })}
                />
                <Box sx={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", mt: 1 }}>
                  <Button type="submit" variant="contained">Invite Borrower</Button>
                </Box>
              </Box>
            </Paper>

            {/* Filter + list borrowers */}
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems="center">
                <TextField
                  size="small"
                  label="Search (email/name/phone)"
                  value={borQ}
                  onChange={(e) => setBorQ(e.target.value)}
                />
                <TextField
                  size="small"
                  select
                  SelectProps={{ native: true }}
                  label="Active"
                  value={borActive}
                  onChange={(e) => setBorActive(e.target.value)}
                >
                  <option value="">All</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </TextField>
                <Button onClick={loadBorrowers} variant="outlined">Search</Button>
              </Stack>

              <Table size="small" sx={{ mt: 2 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Phone</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Joined</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {borrows.map(u => (
                    <TableRow key={u.id}>
                      <TableCell>{u.id}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>{u.full_name || "—"}</TableCell>
                      <TableCell>{u.phone || "—"}</TableCell>
                      <TableCell>{statusChip(u)}</TableCell>
                      <TableCell>{u.created_at ? new Date(u.created_at).toLocaleDateString() : "-"}</TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          component={RLink}
                          to={`/officer/borrowers/${u.id}`}
                          variant="outlined"
                        >
                          View Profile
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!borrows.length && (
                    <TableRow>
                      <TableCell colSpan={7} align="center">No borrowers found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Paper>
          </Box>
        )}
      </Paper>
    </Container>
  );
}
