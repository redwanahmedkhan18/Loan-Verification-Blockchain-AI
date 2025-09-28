import { useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Alert, Box
} from "@mui/material";
import { CardElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { createStripeIntent, confirmAuthorization } from "../api/loans";

export default function PaymentDialog({ open, onClose, loan, repayment, defaultAmount }) {
  const stripe = useStripe();
  const elements = useElements();
  const [amount, setAmount] = useState(defaultAmount ?? 0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  async function submit() {
    setErr(""); setOk(""); setBusy(true);
    try {
      const remaining = (repayment.amount_due || 0) - (repayment.amount_paid || 0);
      const payAmt = Number(amount) > 0 ? Number(amount) : remaining;

      const intent = await createStripeIntent(loan.id, repayment.id, payAmt, "usd");
      if (!intent?.client_secret) throw new Error("Unable to create payment");

      const card = elements.getElement(CardElement);
      const result = await stripe.confirmCardPayment(intent.client_secret, {
        payment_method: { card },
      });

      if (result.error) throw result.error;
      if (result.paymentIntent?.status !== "requires_capture") {
        throw new Error(`Unexpected status: ${result.paymentIntent?.status}`);
      }

      await confirmAuthorization(result.paymentIntent.id);
      setOk("Payment authorized. Waiting for officer approval.");
    } catch (e) {
      setErr(e?.message || "Payment failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Pay Installment</DialogTitle>
      <DialogContent>
        {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
        {ok && <Alert severity="success" sx={{ mb: 2 }}>{ok}</Alert>}
        <TextField
          fullWidth
          label="Amount (USD)"
          type="number"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          sx={{ mb: 2 }}
        />
        <Box sx={{ p: 1, border: "1px solid #ddd", borderRadius: 1 }}>
          <CardElement options={{ hidePostalCode: true }} />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>Close</Button>
        <Button onClick={submit} disabled={!stripe || !elements || busy} variant="contained">Authorize</Button>
      </DialogActions>
    </Dialog>
  );
}
