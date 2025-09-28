// src/pages/Services.jsx
import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Grid,
  List,
  ListItem,
  Paper,
  Stack,
  TextField,
  Typography,
  InputAdornment,
} from "@mui/material";
import { Link as RLink } from "react-router-dom";

export default function Services() {
  useEffect(() => {
    document.title = "Services — TrustEdge Bank";
  }, []);

  // --- Inline Loan Calculator state ---
  const [amount, setAmount] = useState(10000);
  const [term, setTerm] = useState(24); // months
  const [apr, setApr] = useState(10); // %
  const numberFmt = useMemo(
    () => new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }),
    []
  );

  const { monthly, totalPaid, totalInterest } = useMemo(() => {
    const P = Number(amount) || 0;
    const n = Math.max(1, Number(term) || 0);
    const annualRate = Math.max(0, Number(apr) || 0) / 100;
    const r = annualRate / 12;

    if (P <= 0) return { monthly: 0, totalPaid: 0, totalInterest: 0 };

    let m;
    if (r === 0) {
      m = P / n;
    } else {
      const denom = 1 - Math.pow(1 + r, -n);
      m = denom === 0 ? P / n : (P * r) / denom;
    }
    const monthly = Math.round(m * 100) / 100;
    const totalPaid = Math.round(monthly * n * 100) / 100;
    const totalInterest = Math.round((totalPaid - P) * 100) / 100;
    return { monthly, totalPaid, totalInterest };
  }, [amount, term, apr]);

  return (
    <Container sx={{ py: { xs: 5, md: 8 } }}>
      {/* Hero */}
      <Paper
        variant="outlined"
        sx={{
          p: { xs: 3, md: 5 },
          borderRadius: 3,
          bgcolor: "background.paper",
        }}
      >
        <Stack spacing={2}>
          <Chip
            label="Our Services"
            color="secondary"
            variant="outlined"
            sx={{ width: "fit-content", fontWeight: 700 }}
          />
          <Typography variant="h3" fontWeight={900} lineHeight={1.15}>
            Simple loans. Clear terms. Real transparency.
          </Typography>
          <Typography color="text.secondary" sx={{ maxWidth: 900 }}>
            TrustEdge offers fast, fair lending with AI-assisted assessments, human oversight,
            and secure Stripe repayments. Whether you’re consolidating debt, funding a business,
            or buying a vehicle, we make borrowing straightforward and accountable.
          </Typography>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ pt: 1 }}>
            <Button
              component={RLink}
              to="/apply"
              variant="contained"
              color="secondary"
              size="large"
            >
              Apply for a Loan
            </Button>
            <Button component={RLink} to="/calculator" variant="outlined">
              Open Full Loan Calculator
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {/* Loan products */}
      <Grid container spacing={3} sx={{ mt: 3 }}>
        <Grid item xs={12} md={4}>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, height: "100%" }}>
            <Typography variant="h6" fontWeight={800}>
              Personal Loans
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              For life’s big moments—education, medical expenses, or debt consolidation—with
              predictable monthly payments and no prepayment penalty.
            </Typography>
            <List dense sx={{ mt: 1 }}>
              <ListItem disableGutters>• Fixed monthly installments</ListItem>
              <ListItem disableGutters>• Competitive APRs</ListItem>
              <ListItem disableGutters>• Flexible terms</ListItem>
            </List>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, height: "100%" }}>
            <Typography variant="h6" fontWeight={800}>
              Small Business Loans
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              Working capital for growth, inventory, or equipment—paired with clear schedules and
              officer review to keep things responsible.
            </Typography>
            <List dense sx={{ mt: 1 }}>
              <ListItem disableGutters>• Fast application</ListItem>
              <ListItem disableGutters>• AI risk band + human review</ListItem>
              <ListItem disableGutters>• Stripe installments</ListItem>
            </List>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, height: "100%" }}>
            <Typography variant="h6" fontWeight={800}>
              Auto Loans
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              Finance your next vehicle with a transparent schedule and digital receipts for every payment.
            </Typography>
            <List dense sx={{ mt: 1 }}>
              <ListItem disableGutters>• Predictable terms</ListItem>
              <ListItem disableGutters>• Clear amortization</ListItem>
              <ListItem disableGutters>• Instant receipts</ListItem>
            </List>
          </Paper>
        </Grid>
      </Grid>

      {/* How it works */}
      <Paper variant="outlined" sx={{ mt: 3, p: 3, borderRadius: 3 }}>
        <Typography variant="h5" fontWeight={800}>
          How It Works
        </Typography>
        <List dense sx={{ mt: 1 }}>
          <ListItem disableGutters>1) Apply online with basic details and documents.</ListItem>
          <ListItem disableGutters>
            2) AI scores your application and assigns a risk band (Low / Medium / High).
          </ListItem>
          <ListItem disableGutters>3) Officers/admins review and approve where required.</ListItem>
          <ListItem disableGutters>
            4) Your repayment schedule is created—pay monthly via secure Stripe authorization.
          </ListItem>
          <ListItem disableGutters>
            5) An officer/admin captures authorized payments; you receive automatic receipts.
          </ListItem>
        </List>
      </Paper>

      {/* Inline Loan Calculator (quick estimate) */}
      <Paper variant="outlined" sx={{ mt: 3, p: 3, borderRadius: 3 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" fontWeight={800}>
              Quick Loan Calculator
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 0.5 }}>
              Get an instant estimate of your monthly payment. For advanced options, open the full calculator.
            </Typography>

            <Stack spacing={2} sx={{ mt: 2 }}>
              <TextField
                label="Loan Amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  inputProps: { min: 0, step: 100 },
                }}
                fullWidth
              />
              <TextField
                label="Term (months)"
                type="number"
                value={term}
                onChange={(e) => setTerm(Number(e.target.value))}
                InputProps={{ inputProps: { min: 1, step: 1 } }}
                fullWidth
              />
              <TextField
                label="APR (%)"
                type="number"
                value={apr}
                onChange={(e) => setApr(Number(e.target.value))}
                InputProps={{
                  endAdornment: <InputAdornment position="end">%</InputAdornment>,
                  inputProps: { min: 0, step: 0.1 },
                }}
                fullWidth
              />
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mt: 2 }}>
              <Button
                component={RLink}
                to="/apply"
                variant="contained"
                color="secondary"
              >
                Apply for a Loan
              </Button>
              <Button component={RLink} to="/calculator" variant="outlined">
                Open Full Loan Calculator
              </Button>
            </Stack>
          </Box>

          <Divider flexItem orientation="vertical" sx={{ display: { xs: "none", md: "block" } }} />

          <Box sx={{ flex: 1 }}>
            <Paper
              variant="outlined"
              sx={{
                p: 2.5,
                borderRadius: 2,
                bgcolor: "grey.50",
                borderStyle: "dashed",
              }}
            >
              <Typography variant="subtitle2" color="text.secondary">
                Estimated Monthly Payment
              </Typography>
              <Typography variant="h4" fontWeight={900} sx={{ mt: 0.5 }}>
                {numberFmt.format(monthly || 0)}
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Stack direction="row" justifyContent="space-between">
                <Typography color="text.secondary">Total of Payments</Typography>
                <Typography fontWeight={700}>
                  {numberFmt.format(totalPaid || 0)}
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
                <Typography color="text.secondary">Total Interest</Typography>
                <Typography fontWeight={700}>
                  {numberFmt.format(totalInterest || 0)}
                </Typography>
              </Stack>

              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2 }}>
                This is an estimate for illustration only. Final terms depend on approval and exact schedule.
              </Typography>
            </Paper>
          </Box>
        </Stack>
      </Paper>

      {/* Final CTA */}
      <Box sx={{ mt: 4 }}>
        <Divider />
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
          spacing={1.5}
          sx={{ mt: 3 }}
        >
          <Typography color="text.secondary">
            Ready to start? Get a quick decision and a clear plan.
          </Typography>
          <Box>
            <Button
              component={RLink}
              to="/apply"
              variant="contained"
              color="secondary"
              sx={{ mr: 1 }}
            >
              Apply for a Loan
            </Button>
            <Button component={RLink} to="/contact" variant="outlined">
              Contact Us
            </Button>
          </Box>
        </Stack>
      </Box>
    </Container>
  );
}
