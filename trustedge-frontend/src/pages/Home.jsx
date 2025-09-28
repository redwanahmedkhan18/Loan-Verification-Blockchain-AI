import { Box, Button, Container, Grid, Paper, Stack, Typography } from "@mui/material";
import { Link as RLink } from "react-router-dom";

export default function Home() {
  return (
    <>
      <Box sx={{ bgcolor: "primary.main", color: "#fff", py: 8 }}>
        <Container>
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={7}>
              <Typography variant="h2" sx={{ lineHeight: 1.15 }}>
                YOUR TRUSTED PARTNER IN <br /> FINANCIAL GROWTH
              </Typography>
              <Typography sx={{ mt: 2, opacity: .9 }}>
                Secure, Transparent, and Efficient Loan Services
              </Typography>
              <Button component={RLink} to="/register" variant="contained" color="secondary" sx={{ mt: 3 }}>
                Get Started
              </Button>
            </Grid>
            <Grid item xs={12} md={5}>
              <Paper elevation={0} sx={{ bgcolor: "#f5efe3", color: "primary.main", p: 4, borderRadius: 4 }}>
                <Typography variant="h6" fontWeight={800}>Security • Transparency • Speed</Typography>
                <Typography sx={{ mt: 1 }}>
                  AI-driven scoring & blockchain-backed verification for responsible lending.
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Container sx={{ py: 6 }}>
        <Typography variant="h4" fontWeight={800} textAlign="center">OUR SERVICES</Typography>
        <Grid container spacing={3} sx={{ mt: 1 }}>
          {[
            { title: "Loan Verification", desc: "AI + blockchain to verify and manage loans." },
            { title: "Savings & Investments", desc: "Grow wealth with transparent plans." },
            { title: "Business Solutions", desc: "Flexible credit lines and financing." },
          ].map((s) => (
            <Grid item xs={12} md={4} key={s.title}>
              <Paper sx={{ p: 3, height: "100%" }}>
                <Typography variant="h6" fontWeight={800}>{s.title}</Typography>
                <Typography sx={{ mt: 1, opacity: .8 }}>{s.desc}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        <Stack alignItems="center" sx={{ mt: 5 }}>
          <Button component={RLink} to="/calculator" color="success" variant="contained">
            Featured Loan Calculator
          </Button>
        </Stack>
      </Container>
    </>
  );
}
