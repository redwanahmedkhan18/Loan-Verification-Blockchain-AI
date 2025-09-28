// src/pages/BorrowerProfile.jsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Alert, Box, Button, Chip, Container, Divider, Grid, LinearProgress, Paper, Stack, Tab, Tabs, Typography
} from "@mui/material";
import {
  getBorrower, updateBorrower,
  borrowerApplications, borrowerLoans, borrowerPayments, borrowerKyc,
  setKycStatus
} from "../api/staff";
import { mediaUrl } from "../api/loans";
import { approvePayment, cancelPayment } from "../api/loans";

export default function BorrowerProfile() {
  const { id } = useParams();
  const [tab, setTab] = useState(0);
  const [b, setB] = useState(null);
  const [apps, setApps] = useState([]);
  const [loans, setLoans] = useState([]);
  const [pays, setPays] = useState([]);
  const [kyc, setKyc] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    document.title = "Borrower Profile — TrustEdge";
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function refreshAll() {
    if (!id) return;
    setLoading(true); setErr("");
    try {
      const [u, a, l, p, k] = await Promise.all([
        getBorrower(id),
        borrowerApplications(id),
        borrowerLoans(id),
        borrowerPayments(id),
        borrowerKyc(id),
      ]);
      setB(u); setApps(a||[]); setLoans(l||[]); setPays(p||[]); setKyc(k||[]);
    } catch (e) {
      setErr(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  const currency = (v) => new Intl.NumberFormat(undefined, { style:"currency", currency:"USD" }).format(v ?? 0);

  async function markKyc(docId, status) {
    await setKycStatus(docId, status);
    const k = await borrowerKyc(id);
    setKyc(k||[]);
  }

  return (
    <Container sx={{ py: 4 }}>
      <Paper>
        {loading && <LinearProgress />}
        <Box sx={{ p: 2 }}>
          {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
          {b && (
            <>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="h6" fontWeight={800}>{b.full_name || "—"}</Typography>
                  <Typography>{b.email}</Typography>
                  <Typography color="text.secondary">{b.phone || "No phone"} • {b.address || "No address"}</Typography>
                </Box>
                <Chip label={b.is_active ? "Active" : "Inactive"} color={b.is_active ? "success" : "default"} variant="outlined"/>
              </Stack>

              <Divider sx={{ my: 2 }} />

              <Tabs value={tab} onChange={(e,v)=>setTab(v)} variant="scrollable" allowScrollButtonsMobile>
                <Tab label="Applications" />
                <Tab label="Loans & Schedule" />
                <Tab label="Payments" />
                <Tab label="KYC" />
              </Tabs>

              {/* Applications */}
              {tab === 0 && (
                <Box sx={{ mt: 2 }}>
                  {apps.map(a => (
                    <Paper key={a.id} sx={{ p: 2, mb: 1 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography><b>ID:</b> {a.id}</Typography>
                        <Chip size="small" label={a.status} />
                      </Stack>
                      <Typography sx={{ mt: 0.5 }}>
                        <b>Amount:</b> {currency(a.amount)} • <b>Term:</b> {a.term_months} months
                      </Typography>
                      {a.ai_score != null && (
                        <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                          AI Score {Number(a.ai_score).toFixed(4)} • Risk {a.ai_risk_band || a.risk_level}
                        </Typography>
                      )}
                    </Paper>
                  ))}
                </Box>
              )}

              {/* Loans & Schedule */}
              {tab === 1 && (
                <Box sx={{ mt: 2, display: "grid", gap: 1 }}>
                  {loans.map(block => (
                    <Paper key={block.loan.id} sx={{ p: 2 }}>
                      <Typography fontWeight={700}>Loan #{block.loan.id} — {currency(block.loan.principal)} @ {(block.loan.interest_rate*100).toFixed(2)}% / {block.loan.duration_months}m</Typography>
                      <Grid container spacing={1} sx={{ mt: 1 }}>
                        {block.repayments.map(r => (
                          <Grid item xs={12} md={6} key={r.id}>
                            <Paper sx={{ p: 1.5 }}>
                              <Stack direction="row" justifyContent="space-between">
                                <Typography>{new Date(r.due_date).toLocaleDateString()}</Typography>
                                <Chip size="small" label={r.status} color={r.status === "Paid" ? "success" : (r.status === "Late" ? "error" : "default")} />
                              </Stack>
                              <Typography sx={{ mt: 0.5 }}>
                                Due: {currency(r.amount_due)} • Paid: {currency(r.amount_paid)}
                              </Typography>
                              {!!r.receipt_path && (
                                <Button size="small" sx={{ mt: 0.5 }} href={mediaUrl(`/media/${r.receipt_path}`)} target="_blank">
                                  Receipt
                                </Button>
                              )}
                            </Paper>
                          </Grid>
                        ))}
                      </Grid>
                    </Paper>
                  ))}
                </Box>
              )}

              {/* Payments */}
              {tab === 2 && (
                <Box sx={{ mt: 2, display: "grid", gap: 1 }}>
                  {pays.map(p => (
                    <Paper key={p.id} sx={{ p: 2 }}>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography><b>Payment #{p.id}</b> — PI: {p.payment_intent_id}</Typography>
                        <Chip size="small" label={p.status} />
                      </Stack>
                      <Typography sx={{ mt: 0.5 }}>
                        Loan #{p.loan_id} • Installment #{p.repayment_id} • {currency(p.amount)}
                      </Typography>
                      {/* No inline approve/cancel here; use Payments Queue page */}
                    </Paper>
                  ))}
                </Box>
              )}

              {/* KYC */}
              {tab === 3 && (
                <Box sx={{ mt: 2, display: "grid", gap: 1 }}>
                  {kyc.map(d => (
                    <Paper key={d.id} sx={{ p: 2 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography><b>{d.doc_type}</b> — {d.filename}</Typography>
                        <Chip size="small" label={d.status} />
                      </Stack>
                      <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                        Uploaded: {new Date(d.uploaded_at).toLocaleString()}
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                        <Button size="small" variant="outlined" onClick={()=>markKyc(d.id, "Verified")}>Verify</Button>
                        <Button size="small" variant="outlined" color="error" onClick={()=>markKyc(d.id, "Rejected")}>Reject</Button>
                      </Stack>
                    </Paper>
                  ))}
                </Box>
              )}
            </>
          )}
        </Box>
      </Paper>
    </Container>
  );
}
