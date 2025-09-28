import { Box, Container, Grid, Typography, Link, Stack } from "@mui/material";
import logo from "../assets/logo.png";

export default function Footer() {
  return (
    <Box sx={{ bgcolor: "primary.main", color: "#fff", mt: 6, py: 6 }}>
      <Container>
        <Grid container spacing={4}>
          <Grid item xs={12} md={5}>
            <Stack direction="row" spacing={2} alignItems="center">
              <img src={logo} height={44} />
              <Typography variant="h6" fontWeight={800}>TrustEdge Bank</Typography>
            </Stack>
            <Typography sx={{ mt: 1, opacity: .9 }}>
              Building Trust; Securing Futures
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle1" fontWeight={700}>Quick Links</Typography>
            <Stack>
              <Link href="/" color="inherit" underline="hover">Home</Link>
              <Link href="/services" color="inherit" underline="hover">Services</Link>
              <Link href="/contact" color="inherit" underline="hover">Contact</Link>
            </Stack>
          </Grid>
          <Grid item xs={12} md={3}>
            <Typography variant="subtitle1" fontWeight={700}>Contact</Typography>
            <Typography>1-800-123-4367</Typography>
            <Typography>info@trustedgebank.com</Typography>
          </Grid>
        </Grid>
        <Typography sx={{ mt: 4, opacity: .7, fontSize: 13 }}>
          © {new Date().getFullYear()} TrustEdge Bank. All rights reserved.
        </Typography>
      </Container>
    </Box>
  );
}
