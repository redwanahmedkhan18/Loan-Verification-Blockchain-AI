import { useEffect, useState } from "react";
import { listPendingPayments, approvePayment, cancelPayment } from "../api/loans";
import {
  Container, Paper, Typography, Table, TableHead, TableRow, TableCell, TableBody,
  Button, Alert
} from "@mui/material";

export default function PaymentsQueue() {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  async function load() {
    setErr(""); setOk("");
    try {
      const data = await listPendingPayments();
      setRows(data || []);
    } catch (e) { setErr(e.message); }
  }

  useEffect(() => { load(); }, []);

  async function doApprove(id) {
    setErr(""); setOk("");
    try {
      const res = await approvePayment(id);
      setOk(`Captured. Repayment status: ${res.repayment_status}`);
      load();
    } catch (e) { setErr(e.message); }
  }

  async function doCancel(id) {
    setErr(""); setOk("");
    try {
      await cancelPayment(id);
      setOk("Authorization canceled.");
      load();
    } catch (e) { setErr(e.message); }
  }

  return (
    <Container sx={{ py: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight={800}>Pending Installment Payments</Typography>
        {err && <Alert severity="error" sx={{ my: 2 }}>{err}</Alert>}
        {ok && <Alert severity="success" sx={{ my: 2 }}>{ok}</Alert>}

        <Table size="small" sx={{ mt: 2 }}>
          <TableHead>
            <TableRow>
              <TableCell>Payment ID</TableCell>
              <TableCell>Loan</TableCell>
              <TableCell>Repayment</TableCell>
              <TableCell>Borrower</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Authorized At</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(r => (
              <TableRow key={r.id}>
                <TableCell>{r.id}</TableCell>
                <TableCell>#{r.loan_id}</TableCell>
                <TableCell>#{r.repayment_id}</TableCell>
                <TableCell>{r.borrower}</TableCell>
                <TableCell>{r.amount} {r.currency?.toUpperCase()}</TableCell>
                <TableCell>{r.authorized_at ? new Date(r.authorized_at).toLocaleString() : "-"}</TableCell>
                <TableCell align="right">
                  <Button onClick={() => doApprove(r.id)} size="small" variant="contained" sx={{ mr: 1 }}>
                    Approve & Capture
                  </Button>
                  <Button onClick={() => doCancel(r.id)} size="small" variant="outlined" color="error">
                    Cancel
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!rows.length && (
              <TableRow><TableCell colSpan={7} align="center">No pending payments.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Container>
  );
}
