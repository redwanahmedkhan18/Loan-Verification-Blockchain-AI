import { useEffect, useMemo, useState } from "react";
import {
  Box, Button, Container, Paper, Typography, Stack, Alert, LinearProgress,
  Table, TableHead, TableRow, TableCell, TableBody
} from "@mui/material";
import { useParams } from "react-router-dom";
import { getSchedule, payInstallment, downloadReceipt } from "../api/loans";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

export default function LoanRepayments() {
  const { loanId } = useParams();
  const [sched, setSched] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  async function load() {
    setErr(""); setLoading(true);
    try { setSched(await getSchedule(loanId)); }
    catch (e) { setErr(e?.message || "Failed to load schedule"); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [loanId]);

  const chartData = useMemo(() => {
    if (!sched?.rows) return [];
    return sched.rows.map((r, idx) => ({
      idx: idx + 1,
      due: r.due_date.slice(0, 10),
      dueAmt: r.amount_due,
      paid: r.amount_paid || 0,
    }));
  }, [sched]);

  async function pay(r) {
    try {
      const res = await payInstallment(loanId, r.id);
      await load();
      if (res?.receipt) window.open(res.receipt, "_blank");
    } catch (e) {
      alert(e?.message || "Payment failed");
    }
  }

  async function receipt(r) {
    try {
      const res = await downloadReceipt(loanId, r.id);
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `TrustEdge-receipt-${loanId}-${r.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e?.message || "Download failed");
    }
  }

  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h5" fontWeight={800} sx={{ mb: 2 }}>
        Loan #{loanId} — Repayments
      </Typography>

      {loading && <LinearProgress />}
      {err && <Alert severity="error" sx={{ my: 2 }}>{err}</Alert>}

      {sched && (
        <>
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
              Monthly Installments (Graph)
            </Typography>
            <Box sx={{ width: "100%", height: 280 }}>
              <ResponsiveContainer>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="idx" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="dueAmt" name="Due" />
                  <Bar dataKey="paid" name="Paid" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
              Installments
            </Typography>

            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>Due Date</TableCell>
                  <TableCell align="right">Amount Due</TableCell>
                  <TableCell align="right">Paid</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sched.rows.map((r, idx) => (
                  <TableRow key={r.id} hover>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell>{r.due_date.slice(0, 10)}</TableCell>
                    <TableCell align="right">{r.amount_due.toFixed(2)}</TableCell>
                    <TableCell align="right">{(r.amount_paid || 0).toFixed(2)}</TableCell>
                    <TableCell>{r.status}</TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        {r.status !== "Paid" ? (
                          <Button size="small" variant="contained" onClick={() => pay(r)}>
                            Pay now
                          </Button>
                        ) : (
                          <Button size="small" variant="outlined" onClick={() => receipt(r)}>
                            Receipt
                          </Button>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </>
      )}
    </Container>
  );
}
