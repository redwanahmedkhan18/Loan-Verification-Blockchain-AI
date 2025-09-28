// src/pages/UserProfile.jsx
import { useEffect, useState } from "react";
import {
  Alert, Box, Button, Chip, Container, Divider, Grid, Paper, Stack, TextField, Typography
} from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { getUser, getUserOverview, patchUser } from "../api/staff";
import { mediaUrl } from "../api/loans";

export default function UserProfile() {
  const { id } = useParams();
  const { user: me } = useAuth();
  const nav = useNavigate();

  const [ov, setOv] = useState(null);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [edit, setEdit] = useState({});

  useEffect(() => { load(); }, [id]);

  async function load() {
    setErr(""); setOk("");
    try {
      const data = await getUserOverview(id);
      setOv(data);
      setEdit({
        full_name: data.user.full_name || "",
        phone: data.user.phone || "",
        nid_number: data.user.nid_number || "",
        address: data.user.address || "",
        role: data.user.role,
        is_active: data.user.is_active,
      });
      document.title = `User #${data.user.id} — ${data.user.email}`;
    } catch (e) { setErr(e.message); }
  }

  function canChangeRole() { return me?.role === "admin"; }
  function canToggleActive() { return me?.role === "admin" || (me?.role === "officer" && ov?.user.role === "borrower"); }

  async function save() {
    setErr(""); setOk("");
    try {
      const payload = {
        full_name: edit.full_name, phone: edit.phone,
        nid_number: edit.nid_number, address: edit.address,
      };
      if (canChangeRole() && edit.role !== ov.user.role) payload.role = edit.role;
      if (canToggleActive() && edit.is_active !== ov.user.is_active) payload.is_active = edit.is_active;
      await patchUser(ov.user.id, payload);
      setOk("Saved");
      await load();
    } catch (e) { setErr(e.message); }
  }

  if (!ov) return null;

  const u = ov.user;
  const currency = (v) => new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(v ?? 0);

  return (
    <Container sx={{ py: 4 }}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="h5" fontWeight={800}>{u.email}</Typography>
            <Chip label={u.role} color={u.role === "admin" ? "error" : u.role === "officer" ? "info" : "success"} variant="outlined" />
            <Chip label={u.is_active ? "Active" : "Disabled"} color={u.is_active ? "success" : "default"} size="small" />
          </Stack>
          <Button onClick={() => nav(-1)} variant="outlined">Back</Button>
        </Stack>

        <Divider sx={{ my: 2 }} />
        {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
        {ok && <Alert severity="success" sx={{ mb: 2 }}>{ok}</Alert>}

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField fullWidth label="Full Name" value={edit.full_name} onChange={(e) => setEdit({ ...edit, full_name: e.target.value })} />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField fullWidth label="Phone" value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField fullWidth label="NID Number" value={edit.nid_number} onChange={(e) => setEdit({ ...edit, nid_number: e.target.value })} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth label="Address" value={edit.address} onChange={(e) => setEdit({ ...edit, address: e.target.value })} />
          </Grid>

          <Grid item xs={12} md={3}>
            <TextField select fullWidth label="Role" value={edit.role} onChange={(e) => setEdit({ ...edit, role: e.target.value })} disabled={!canChangeRole()}>
              {["borrower","officer","admin"].map((r) => <option key={r} value={r}>{r}</option>)}
            </TextField>
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField select fullWidth label="Active" value={edit.is_active ? "yes" : "no"} onChange={(e) => setEdit({ ...edit, is_active: e.target.value === "yes" })} disabled={!canToggleActive()}>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </TextField>
          </Grid>
        </Grid>

        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <Button variant="contained" onClick={save}>Save</Button>
        </Stack>
      </Paper>

      {/* Borrower-only: Applications & Loans */}
      {u.role === "borrower" && (
        <>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" fontWeight={800}>Applications</Typography>
            <Box sx={{ mt: 1, display: "grid", gap: 1 }}>
              {ov.applications?.map((a) => (
                <Paper key={a.id} sx={{ p: 2 }}>
                  <Typography><b>ID:</b> {a.id} • <b>Status:</b> {a.status}</Typography>
                  <Typography><b>Amount:</b> {currency(a.amount)} • <b>Term:</b> {a.term_months} months</Typography>
                  {a.ai_score != null && (
                    <Typography><b>AI:</b> {Number(a.ai_score).toFixed(4)} ({a.ai_risk_band || a.risk_level})</Typography>
                  )}
                </Paper>
              ))}
              {!ov.applications?.length && <Typography color="text.secondary">No applications</Typography>}
            </Box>
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" fontWeight={800}>Loans</Typography>
            <Box sx={{ mt: 1, display: "grid", gap: 1 }}>
              {ov.loans?.map((blk) => (
                <Paper key={blk.loan.id} sx={{ p: 2 }}>
                  <Typography>
                    <b>Loan #{blk.loan.id}</b> — {currency(blk.loan.principal)} at {(blk.loan.interest_rate*100).toFixed(2)}% • {blk.loan.duration_months} mo • <i>{blk.loan.status}</i>
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    {blk.repayments?.map((r) => (
                      <Stack key={r.id} direction="row" spacing={2} sx={{ py: 0.5, borderBottom: "1px dashed rgba(0,0,0,0.08)" }}>
                        <Typography sx={{ minWidth: 120 }}>{new Date(r.due_date).toLocaleDateString()}</Typography>
                        <Typography sx={{ minWidth: 120 }}>Due: {currency(r.amount_due)}</Typography>
                        <Typography sx={{ minWidth: 140 }}>Paid: {currency(r.amount_paid || 0)}</Typography>
                        <Chip size="small" label={r.status} color={r.status === "Paid" ? "success" : r.status === "Late" ? "error" : "default"} />
                        {r.receipt_path && (
                          <Button size="small" href={mediaUrl(`/media/${r.receipt_path}`)} target="_blank">
                            Receipt
                          </Button>
                        )}
                      </Stack>
                    ))}
                    {!blk.repayments?.length && <Typography color="text.secondary">No schedule</Typography>}
                  </Box>
                </Paper>
              ))}
              {!ov.loans?.length && <Typography color="text.secondary">No loans</Typography>}
            </Box>
          </Paper>
        </>
      )}
    </Container>
  );
}
