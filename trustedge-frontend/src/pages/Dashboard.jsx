// src/pages/Dashboard.jsx
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  LinearProgress,
  Paper,
  Stack,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from "@mui/material";
import { Link as RLink } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { listApplications, listMyLoans } from "../api/loans";
import PaymentDialog from "../components/PaymentDialog";

// Recharts (graph)
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";

export default function Dashboard() {
  const { user } = useAuth();

  // Applications
  const [apps, setApps] = useState([]);
  const [appsLoading, setAppsLoading] = useState(true);
  const [appsErr, setAppsErr] = useState("");

  // Loans (borrower)
  const [loans, setLoans] = useState([]);
  const [loansLoading, setLoansLoading] = useState(true);
  const [loansErr, setLoansErr] = useState("");

  // Payment dialog (Stripe)
  const [payOpen, setPayOpen] = useState(false);
  const [sel, setSel] = useState(null); // { loan, repayment }

  // Scope: borrowers see their own; officers/admins see all
  const scope = useMemo(
    () => (user?.role === "officer" || user?.role === "admin" ? "all" : "mine"),
    [user]
  );

  useEffect(() => {
    document.title = "Dashboard — TrustEdge Bank";
  }, []);

  useEffect(() => {
    if (!user) return;
    loadApplications();
    if (user.role === "borrower") {
      loadLoans();
    } else {
      // clear loans area for officers/admins
      setLoans([]);
      setLoansLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, scope]);

  async function loadApplications() {
    setAppsLoading(true);
    setAppsErr("");
    try {
      const data = await listApplications(scope);
      setApps(Array.isArray(data) ? data : []);
    } catch (e) {
      setAppsErr(e.message || "Failed to load applications");
    } finally {
      setAppsLoading(false);
    }
  }

  async function loadLoans() {
    setLoansLoading(true);
    setLoansErr("");
    try {
      const data = await listMyLoans();
      setLoans(Array.isArray(data) ? data : []);
    } catch (e) {
      setLoansErr(e.message || "Failed to load loans");
    } finally {
      setLoansLoading(false);
    }
  }

  const currency = (v) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(v ?? 0);

  const statusColor = (s = "") => {
    const k = s.toLowerCase();
    if (k.includes("approved") || k.includes("active")) return "success";
    if (k.includes("underreview") || k.includes("submitted")) return "warning";
    if (k.includes("rejected") || k.includes("default")) return "error";
    if (k.includes("minted") || k.includes("closed")) return "info";
    return "default";
  };

  const riskColor = (r = "") => {
    const k = r.toLowerCase();
    if (k === "low") return "success";
    if (k === "medium") return "warning";
    if (k === "high") return "error";
    return "default";
  };

  // Build chart series from a loan's repayments: [{month, due, paid, status}]
  function buildSeries(repayments = []) {
    return repayments.map((r) => ({
      month: r.due_date ? new Date(r.due_date).toISOString().slice(0, 7) : "",
      due: Number(r.amount_due || 0),
      paid: Number(r.amount_paid || 0),
      status: r.status || "Due",
    }));
  }

  return (
    <Container sx={{ py: 4 }}>
      {/* Header */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          alignItems={{ xs: "flex-start", sm: "center" }}
          justifyContent="space-between"
          spacing={2}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="h5" fontWeight={800}>
              Welcome, {user?.email}
            </Typography>
            <Chip
              size="small"
              sx={{ ml: 1 }}
              label={user?.role?.toUpperCase() || "USER"}
              color="primary"
              variant="outlined"
            />
          </Stack>

          <Stack direction="row" spacing={1}>
            {user?.role === "borrower" && (
              <Button
                component={RLink}
                to="/apply"
                variant="contained"
                color="secondary"
              >
                Apply for a Loan
              </Button>
            )}
            <Button onClick={() => { loadApplications(); if (user?.role === "borrower") loadLoans(); }} variant="outlined">
              Refresh
            </Button>
          </Stack>
        </Stack>

        <Divider sx={{ mt: 2 }} />
        <Typography sx={{ mt: 1 }} color="text.secondary">
          Viewing: <b>{scope === "all" ? "All applications" : "My applications"}</b>
        </Typography>
      </Paper>

      {/* Applications */}
      <Paper sx={{ p: 0, mb: 3 }}>
        {appsLoading && <LinearProgress />}
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
            Loan Applications
          </Typography>

          {appsErr && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {appsErr}
            </Alert>
          )}

          {!appsLoading && apps.length === 0 && !appsErr && (
            <Typography color="text.secondary">No applications yet.</Typography>
          )}

          <Box sx={{ display: "grid", gap: 1 }}>
            {apps.map((a) => (
              <Paper key={a.id} sx={{ p: 2, display: "grid", gap: 0.5 }}>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  alignItems={{ xs: "flex-start", sm: "center" }}
                  justifyContent="space-between"
                  spacing={1}
                >
                  <Typography>
                    <b>ID:</b> {a.id}
                  </Typography>
                  <Chip
                    size="small"
                    label={a.status || "—"}
                    color={statusColor(a.status)}
                    variant="outlined"
                  />
                </Stack>

                <Typography>
                  <b>Amount:</b> {currency(a.amount)} • <b>Term:</b> {a.term_months} months
                </Typography>

                {a.ai_score != null && (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography>
                      <b>AI Score:</b> {Number(a.ai_score).toFixed(4)}
                    </Typography>
                    <Chip
                      size="small"
                      label={a.risk_level || a.ai_risk_band || "—"}
                      color={riskColor(a.risk_level || a.ai_risk_band)}
                      variant="outlined"
                    />
                  </Stack>
                )}

                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    component={RLink}
                    to={`/applications/${a.id}`}
                  >
                    View
                  </Button>
                </Stack>
              </Paper>
            ))}
          </Box>
        </Box>
      </Paper>

      {/* Borrower: My Loans (with schedule + graph + Pay) */}
      {user?.role === "borrower" && (
        <Paper sx={{ p: 0 }}>
          {loansLoading && <LinearProgress />}
          <Box sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
              My Loans
            </Typography>

            {loansErr && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {loansErr}
              </Alert>
            )}

            {!loansLoading && loans.length === 0 && !loansErr && (
              <Typography color="text.secondary">No active loans yet.</Typography>
            )}

            <Box sx={{ display: "grid", gap: 2 }}>
              {loans.map(({ loan, repayments }) => {
                const series = buildSeries(repayments);
                return (
                  <Paper key={loan.id} sx={{ p: 2 }}>
                    <Typography variant="subtitle2" fontWeight={800}>
                      Loan #{loan.id} — {currency(loan.principal)} @{" "}
                      {(loan.interest_rate * 100).toFixed(2)}% • {loan.duration_months} mo
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Status: <Chip size="small" label={loan.status} color={statusColor(loan.status)} />
                    </Typography>

                    {/* Tracking Graph */}
                    <Box sx={{ width: "100%", height: 220 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={series} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip formatter={(v) => currency(v)} />
                          <Legend />
                          <Line type="monotone" dataKey="due" name="Due" />
                          <Line type="monotone" dataKey="paid" name="Paid" />
                        </LineChart>
                      </ResponsiveContainer>
                    </Box>

                    {/* Schedule Table */}
                    <Box sx={{ mt: 2, overflowX: "auto" }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Due Date</TableCell>
                            <TableCell align="right">Amount Due</TableCell>
                            <TableCell align="right">Paid</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Receipt</TableCell>
                            <TableCell align="center">Action</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {repayments.map((r) => {
                            const remaining = Math.max(0, (r.amount_due || 0) - (r.amount_paid || 0));
                            return (
                              <TableRow key={r.id}>
                                <TableCell>
                                  {r.due_date ? new Date(r.due_date).toLocaleDateString() : "—"}
                                </TableCell>
                                <TableCell align="right">{currency(r.amount_due || 0)}</TableCell>
                                <TableCell align="right">{currency(r.amount_paid || 0)}</TableCell>
                                <TableCell>
                                  <Chip
                                    size="small"
                                    label={r.status}
                                    color={
                                      r.status === "Paid"
                                        ? "success"
                                        : r.status === "Late"
                                        ? "error"
                                        : "default"
                                    }
                                  />
                                </TableCell>
                                <TableCell>
                                  {r.receipt_path ? (
                                    <a
                                      href={`/media/${r.receipt_path}`}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      Open
                                    </a>
                                  ) : (
                                    "—"
                                  )}
                                </TableCell>
                                <TableCell align="center">
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={() => {
                                      setSel({ loan, repayment: r });
                                      setPayOpen(true);
                                    }}
                                    disabled={r.status === "Paid" || remaining <= 0}
                                  >
                                    Pay
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </Box>
                  </Paper>
                );
              })}
            </Box>
          </Box>
        </Paper>
      )}

      {/* Stripe payment dialog */}
      {sel && (
        <PaymentDialog
          open={payOpen}
          onClose={() => setPayOpen(false)}
          loan={sel.loan}
          repayment={sel.repayment}
          defaultAmount={Math.max(
            0,
            (sel.repayment?.amount_due || 0) - (sel.repayment?.amount_paid || 0)
          )}
          onSuccess={async () => {
            // After a successful authorization/capture, refresh loans
            await loadLoans();
          }}
        />
      )}
    </Container>
  );
}
