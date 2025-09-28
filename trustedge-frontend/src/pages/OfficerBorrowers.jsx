// src/pages/OfficerBorrowers.jsx
import { useEffect, useState } from "react";
import {
  Alert, Box, Button, Container, Dialog, DialogActions, DialogContent,
  DialogTitle, Grid, LinearProgress, Paper, Stack, TextField, Typography
} from "@mui/material";
import { Link as RLink } from "react-router-dom";
import { listBorrowers, createBorrower } from "../api/staff";
import useAuth from "../hooks/useAuth";

export default function OfficerBorrowers() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ email: "", full_name: "", phone: "", address: "" });

  useEffect(() => {
    document.title = "Borrowers — TrustEdge";
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refresh() {
    setLoading(true); setErr("");
    try {
      const data = await listBorrowers({ q: query, page: 1, pageSize: 50 });
      setRows(data?.items || []);
      setTotal(data?.total || 0);
    } catch (e) {
      setErr(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  async function submitAdd(e) {
    e.preventDefault();
    try {
      await createBorrower(form);
      setAddOpen(false);
      setForm({ email: "", full_name: "", phone: "", address: "" });
      refresh();
    } catch (e2) {}
  }

  const RoleBadge = () => (
    <Typography variant="caption" sx={{ px: 1, py: 0.25, border: "1px solid", borderRadius: 1 }}>
      {user?.role?.toUpperCase()}
    </Typography>
  );

  return (
    <Container sx={{ py: 4 }}>
      <Paper>
        {loading && <LinearProgress />}
        <Box sx={{ p: 2 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Typography variant="h6" fontWeight={800}>Borrowers <RoleBadge /></Typography>
            <Stack direction="row" spacing={1}>
              <TextField size="small" placeholder="Search…" value={query} onChange={e=>setQuery(e.target.value)} />
              <Button variant="outlined" onClick={refresh}>Search</Button>
              <Button variant="contained" color="secondary" onClick={()=>setAddOpen(true)}>
                Add Borrower
              </Button>
            </Stack>
          </Stack>

          {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
          <Typography color="text.secondary" sx={{ mb: 1 }}>{total} results</Typography>

          <Grid container spacing={1}>
            {rows.map((b) => (
              <Grid item xs={12} md={6} key={b.id}>
                <Paper sx={{ p: 2 }}>
                  <Typography fontWeight={700}>{b.full_name || "—"}</Typography>
                  <Typography sx={{ mt: 0.5 }}>{b.email}</Typography>
                  <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                    {b.phone || "No phone"} • {b.is_active ? "Active" : "Inactive"}
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    <Button size="small" variant="outlined" component={RLink} to={`/officer/borrowers/${b.id}`}>
                      View Profile
                    </Button>
                  </Stack>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Paper>

      <Dialog open={addOpen} onClose={()=>setAddOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add Borrower</DialogTitle>
        <DialogContent>
          <Stack component="form" onSubmit={submitAdd} spacing={2} sx={{ pt: 1 }}>
            <TextField label="Email" required value={form.email} onChange={e=>setForm(f=>({...f, email: e.target.value}))}/>
            <TextField label="Full name" value={form.full_name} onChange={e=>setForm(f=>({...f, full_name: e.target.value}))}/>
            <TextField label="Phone" value={form.phone} onChange={e=>setForm(f=>({...f, phone: e.target.value}))}/>
            <TextField label="Address" value={form.address} onChange={e=>setForm(f=>({...f, address: e.target.value}))}/>
            <Button type="submit" variant="contained">Create</Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setAddOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
