// src/pages/ApplyLoan.jsx
import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Container,
  Grid,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { createApplication } from "../api/loans";

const PURPOSES = ["personal", "auto", "business", "education", "home"];
const REGIONS = ["NA", "EU", "APAC", "LATAM", "MEA"];

export default function ApplyLoan() {
  const nav = useNavigate();

  const [form, setForm] = useState({
    amount: 10000,
    term_months: 12,
    purpose: "personal",
    annual_income: 50000,
    credit_score: 700,
    dti: 0.25,
    past_defaults: 0,
    employment_years: 3,
    savings: 1000,
    collateral_value: 0,
    age: 30,
    region: "NA",
  });

  const [err, setErr] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const set = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  // Simple monthly estimate preview (client-side), not authoritative
  const estMonthly = useMemo(() => {
    const P = Number(form.amount) || 0;
    const n = Number(form.term_months) || 0;
    const r = 0.10 / 12; // 10% APR preview
    if (P <= 0 || n <= 0) return 0;
    // M = P * r * (1+r)^n / ((1+r)^n - 1)
    const a = Math.pow(1 + r, n);
    return Math.round((P * r * a) / (a - 1));
  }, [form.amount, form.term_months]);

  function toNumOrNull(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  function sanitize(payload) {
    // Clamp DTI to [0,1] if provided
    if (payload.dti != null) {
      const d = Number(payload.dti);
      if (Number.isFinite(d)) payload.dti = Math.max(0, Math.min(1, d));
    }
    // Convert any empty strings to null for optional numeric fields
    [
      "annual_income",
      "credit_score",
      "dti",
      "past_defaults",
      "employment_years",
      "savings",
      "collateral_value",
      "age",
    ].forEach((k) => {
      if (payload[k] === "" || payload[k] === undefined) payload[k] = null;
      if (typeof payload[k] === "string") payload[k] = toNumOrNull(payload[k]);
    });
    // Ensure mandatory numerics are numbers
    payload.amount = toNumOrNull(payload.amount);
    payload.term_months = toNumOrNull(payload.term_months);
    return payload;
  }

  async function submit(e) {
    e.preventDefault();
    setErr("");

    // Basic client validation
    if (!form.amount || form.amount <= 0) {
      setErr("Please enter a positive loan amount.");
      return;
    }
    if (!form.term_months || form.term_months < 3) {
      setErr("Term must be at least 3 months.");
      return;
    }
    if (!form.purpose) {
      setErr("Please select a loan purpose.");
      return;
    }
    if (!form.region) {
      setErr("Please select your region.");
      return;
    }

    const payload = sanitize({ ...form });

    try {
      setSubmitting(true);
      const created = await createApplication(payload);
      // The backend responds with the full application (incl. status, ai_score, ai_risk_band).
      // Send the user straight to the details page so they can see AI results and (if approved) schedule.
      if (created?.id) {
        nav(`/applications/${created.id}`);
      } else {
        // Fallback: go to dashboard if response shape changes
        nav("/dashboard");
      }
    } catch (e) {
      const msg =
        e?.response?.data?.detail ||
        e?.message ||
        "Failed to submit application";
      setErr(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Container sx={{ py: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight={800}>
          Apply for Loan
        </Typography>

        {err && (
          <Alert severity="error" sx={{ my: 2 }}>
            {err}
          </Alert>
        )}

        {/* Quick monthly estimate preview */}
        <Alert severity="info" sx={{ mt: 2 }}>
          Estimated monthly payment (preview): <b>${estMonthly || 0}</b> @ 10% APR
        </Alert>

        <Box component="form" onSubmit={submit} sx={{ mt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                label="Amount"
                type="number"
                value={form.amount}
                onChange={(e) => set("amount", Number(e.target.value))}
                fullWidth
                required
                inputProps={{ min: 1, step: 1 }}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                label="Term (months)"
                type="number"
                value={form.term_months}
                onChange={(e) => set("term_months", Number(e.target.value))}
                fullWidth
                required
                inputProps={{ min: 3, step: 1 }}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                select
                label="Purpose"
                value={form.purpose}
                onChange={(e) => set("purpose", e.target.value)}
                fullWidth
                required
              >
                {PURPOSES.map((p) => (
                  <MenuItem key={p} value={p}>
                    {p}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                select
                label="Region"
                value={form.region}
                onChange={(e) => set("region", e.target.value)}
                fullWidth
                required
              >
                {REGIONS.map((r) => (
                  <MenuItem key={r} value={r}>
                    {r}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* Extended AI features (optional) */}
            <Grid item xs={12} md={4}>
              <TextField
                label="Annual Income"
                type="number"
                value={form.annual_income}
                onChange={(e) => set("annual_income", e.target.value)}
                fullWidth
                helperText="Optional"
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                label="Credit Score"
                type="number"
                value={form.credit_score}
                onChange={(e) => set("credit_score", e.target.value)}
                fullWidth
                helperText="Optional"
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                label="Debt-to-Income (0–1)"
                type="number"
                value={form.dti}
                onChange={(e) => set("dti", e.target.value)}
                fullWidth
                inputProps={{ step: 0.01, min: 0, max: 1 }}
                helperText="Optional"
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                label="Past Defaults"
                type="number"
                value={form.past_defaults}
                onChange={(e) => set("past_defaults", e.target.value)}
                fullWidth
                inputProps={{ min: 0, step: 1 }}
                helperText="Optional"
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                label="Employment Years"
                type="number"
                value={form.employment_years}
                onChange={(e) => set("employment_years", e.target.value)}
                fullWidth
                inputProps={{ min: 0, step: 0.5 }}
                helperText="Optional"
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                label="Savings"
                type="number"
                value={form.savings}
                onChange={(e) => set("savings", e.target.value)}
                fullWidth
                inputProps={{ min: 0, step: 1 }}
                helperText="Optional"
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                label="Collateral Value"
                type="number"
                value={form.collateral_value}
                onChange={(e) => set("collateral_value", e.target.value)}
                fullWidth
                inputProps={{ min: 0, step: 1 }}
                helperText="Optional"
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                label="Age"
                type="number"
                value={form.age}
                onChange={(e) => set("age", e.target.value)}
                fullWidth
                inputProps={{ min: 18, step: 1 }}
                helperText="Optional"
              />
            </Grid>
          </Grid>

          <Button
            type="submit"
            variant="contained"
            color="secondary"
            sx={{ mt: 2 }}
            disabled={submitting}
          >
            {submitting ? "Submitting..." : "Submit Application"}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
