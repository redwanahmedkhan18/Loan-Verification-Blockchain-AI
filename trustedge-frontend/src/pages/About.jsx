// src/pages/About.jsx
import { useEffect } from "react";
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
  Typography,
} from "@mui/material";
import { Link as RLink } from "react-router-dom";

export default function About() {
  useEffect(() => {
    document.title = "About — TrustEdge Bank";
  }, []);

  return (
    <Container sx={{ py: { xs: 5, md: 8 } }}>
      {/* Hero */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, md: 5 },
          borderRadius: 3,
          bgcolor: "background.paper",
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Stack spacing={2}>
          <Chip
            label="About TrustEdge Bank"
            color="secondary"
            variant="outlined"
            sx={{ width: "fit-content", fontWeight: 700 }}
          />
          <Typography variant="h3" fontWeight={900} lineHeight={1.15}>
            Transparent lending. Human oversight. Technology you can trust.
          </Typography>
          <Typography color="text.secondary" sx={{ maxWidth: 900 }}>
            We’re a modern lending platform that blends AI-driven underwriting, blockchain-anchored
            audit trails, and secure Stripe repayments to make credit faster, fairer, and more
            accountable—for borrowers and risk teams alike.
          </Typography>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ pt: 1 }}>
            <Button component={RLink} to="/apply" variant="contained" color="secondary">
              Apply for a Loan
            </Button>
            <Button component={RLink} to="/calculator" variant="outlined">
              Try the Loan Calculator
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {/* Mission + What we do */}
      <Grid container spacing={3} sx={{ mt: 3 }}>
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, height: "100%" }}>
            <Typography variant="h5" fontWeight={800}>
              Our Mission
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1.5 }}>
              To expand responsible access to credit by combining explainable AI, verifiable
              records, and human judgment—so every decision is fair, auditable, and designed for
              real people.
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, height: "100%" }}>
            <Typography variant="h5" fontWeight={800}>
              What We Do
            </Typography>
            <List dense sx={{ mt: 1 }}>
              <ListItem disableGutters>
                • Digital applications with a guided borrower experience.
              </ListItem>
              <ListItem disableGutters>
                • AI credit assessment with clear risk bands (Low / Medium / High).
              </ListItem>
              <ListItem disableGutters>
                • Human-in-the-loop review for officers and admins.
              </ListItem>
              <ListItem disableGutters>
                • Blockchain-anchored lifecycle events for auditability.
              </ListItem>
              <ListItem disableGutters>
                • Secure Stripe repayments with authorization/capture and receipts.
              </ListItem>
            </List>
          </Paper>
        </Grid>
      </Grid>

      {/* Why TrustEdge */}
      <Paper variant="outlined" sx={{ mt: 3, p: 3, borderRadius: 3 }}>
        <Typography variant="h5" fontWeight={800}>
          Why TrustEdge
        </Typography>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} md={6}>
            <List dense>
              <ListItem disableGutters>• Transparency by design.</ListItem>
              <ListItem disableGutters>• Speed with safeguards (human approval where it matters).</ListItem>
              <ListItem disableGutters>• Security that scales with role-based access.</ListItem>
            </List>
          </Grid>
          <Grid item xs={12} md={6}>
            <List dense>
              <ListItem disableGutters>• Fairness & inclusion through model oversight.</ListItem>
              <ListItem disableGutters>• Operational control for admins and officers.</ListItem>
              <ListItem disableGutters>• Clear receipts, histories, and compliance views.</ListItem>
            </List>
          </Grid>
        </Grid>
      </Paper>

      {/* How it works */}
      <Paper variant="outlined" sx={{ mt: 3, p: 3, borderRadius: 3 }}>
        <Typography variant="h5" fontWeight={800}>
          How It Works
        </Typography>
        <List dense sx={{ mt: 1 }}>
          <ListItem disableGutters>1) Apply – submit documents and profile.</ListItem>
          <ListItem disableGutters>2) Assess – AI scores and highlights risk factors.</ListItem>
          <ListItem disableGutters>
            3) Review – officers/admins verify KYC and issue decisions.
          </ListItem>
          <ListItem disableGutters>4) Activate – loan & repayment schedule created.</ListItem>
          <ListItem disableGutters>
            5) Repay – installments via Stripe; officers/admins approve captures; receipts sent.
          </ListItem>
          <ListItem disableGutters>
            6) Audit – blockchain-anchored events and logs support compliance.
          </ListItem>
        </List>
      </Paper>

      {/* Technology */}
      <Paper variant="outlined" sx={{ mt: 3, p: 3, borderRadius: 3 }}>
        <Typography variant="h5" fontWeight={800}>
          Our Technology
        </Typography>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} md={6}>
            <List dense>
              <ListItem disableGutters>• AI underwriting with explainable risk bands.</ListItem>
              <ListItem disableGutters>• Blockchain anchoring for integrity and traceability.</ListItem>
              <ListItem disableGutters>• Stripe payments (auth/capture, receipts, refunds).</ListItem>
            </List>
          </Grid>
          <Grid item xs={12} md={6}>
            <List dense>
              <ListItem disableGutters>• Secure KYC & document queues for officers.</ListItem>
              <ListItem disableGutters>• Role-based access: borrower, officer, admin.</ListItem>
              <ListItem disableGutters>• Structured logs and exportable histories.</ListItem>
            </List>
          </Grid>
        </Grid>
      </Paper>

      {/* Security & compliance */}
      <Paper variant="outlined" sx={{ mt: 3, p: 3, borderRadius: 3 }}>
        <Typography variant="h5" fontWeight={800}>
          Security & Compliance Principles
        </Typography>
        <List dense sx={{ mt: 1 }}>
          <ListItem disableGutters>• Least-privilege access and auditable actions.</ListItem>
          <ListItem disableGutters>• Encryption in transit and at rest.</ListItem>
          <ListItem disableGutters>• KYC/AML workflows and document verification lanes.</ListItem>
          <ListItem disableGutters>• Model governance with human review.</ListItem>
          <ListItem disableGutters>• Privacy-first data collection.</ListItem>
        </List>
      </Paper>

      {/* Story */}
      <Paper variant="outlined" sx={{ mt: 3, p: 3, borderRadius: 3 }}>
        <Typography variant="h5" fontWeight={800}>
          Our Story
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 1.5 }}>
          TrustEdge began with a simple idea: lending decisions should be as clear as a bank
          statement—fast when they can be, carefully reviewed when they should be, and always
          explainable after the fact. We built a platform that respects both data and judgment,
          because responsible credit requires both.
        </Typography>
      </Paper>

      {/* CTA / Footer section */}
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
            Media & partnerships:{` `}
            <b>press@trustedgebank.example</b>
          </Typography>
          <Box>
            <Button component={RLink} to="/apply" variant="contained" color="secondary" sx={{ mr: 1 }}>
              Get Started
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
