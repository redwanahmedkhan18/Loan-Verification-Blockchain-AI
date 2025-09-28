import { useMemo, useState } from "react";
import { Container, Paper, Typography, TextField, Grid } from "@mui/material";

export default function LoanCalculator() {
  const [amount, setAmount] = useState(10000);
  const [apr, setApr] = useState(12);
  const [months, setMonths] = useState(12);

  const monthly = useMemo(() => {
    const r = (apr/100)/12;
    return r === 0 ? amount/months : (amount * r) / (1 - Math.pow(1 + r, -months));
  }, [amount, apr, months]);

  return (
    <Container sx={{ py: 4 }}>
      <Paper sx={{ p: 3, maxWidth: 680 }}>
        <Typography variant="h6" fontWeight={800}>Loan Calculator</Typography>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} md={4}><TextField label="Amount" type="number" value={amount} onChange={e=>setAmount(Number(e.target.value))} fullWidth /></Grid>
          <Grid item xs={12} md={4}><TextField label="APR (%)" type="number" value={apr} onChange={e=>setApr(Number(e.target.value))} fullWidth /></Grid>
          <Grid item xs={12} md={4}><TextField label="Months" type="number" value={months} onChange={e=>setMonths(Number(e.target.value))} fullWidth /></Grid>
        </Grid>
        <Typography sx={{ mt: 2 }}><b>Estimated Monthly Payment:</b> {monthly ? monthly.toFixed(2) : "-"}</Typography>
      </Paper>
    </Container>
  );
}
