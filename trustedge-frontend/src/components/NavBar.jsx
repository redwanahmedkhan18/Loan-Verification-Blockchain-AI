// src/components/NavBar.jsx
import { AppBar, Toolbar, Typography, Box, Button } from "@mui/material";
import { Link as RLink, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import logo from "../assets/logo.png";

export default function NavBar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  return (
    <AppBar position="sticky" color="primary" elevation={0}>
      <Toolbar sx={{ gap: 3, flexWrap: "wrap" }}>
        {/* Brand */}
        <Box
          component={RLink}
          to="/"
          sx={{
            display: "flex",
            alignItems: "center",
            textDecoration: "none",
            color: "inherit",
          }}
        >
          <img src={logo} height={36} style={{ marginRight: 10 }} alt="TrustEdge logo" />
          <Typography variant="h6" fontWeight={800}>
            TrustEdge Bank
          </Typography>
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        {/* Public links */}
        <Button component={RLink} to="/services" color="inherit">
          Services
        </Button>
        <Button component={RLink} to="/about" color="inherit">
          About Us
        </Button>
        <Button component={RLink} to="/calculator" color="inherit">
          Loan Calculator
        </Button>
        <Button component={RLink} to="/contact" color="inherit">
          Contact
        </Button>

        {user ? (
          <>
            {/* Everyone signed in */}
            <Button component={RLink} to="/dashboard" color="secondary" variant="contained">
              Dashboard
            </Button>

            {/* Officer/Admin shortcuts */}
            {(user.role === "officer" || user.role === "admin") && (
              <>
                <Button component={RLink} to="/officer/borrowers" color="inherit" sx={{ ml: 1 }}>
                  Borrowers
                </Button>
                <Button component={RLink} to="/payments-queue" color="inherit" sx={{ ml: 1 }}>
                  Payments
                </Button>
              </>
            )}

            {/* Admin-only */}
            {user.role === "admin" && (
              <Button
                component={RLink}
                to="/staff"
                variant="outlined"
                color="inherit"
                sx={{ ml: 1 }}
              >
                Manage Staff
              </Button>
            )}

            <Button
              onClick={() => {
                logout();
                nav("/");
              }}
              color="inherit"
              sx={{ ml: 1 }}
            >
              Logout
            </Button>
          </>
        ) : (
          <>
            <Button component={RLink} to="/login" color="inherit">
              Login
            </Button>
            {/* Quick links to pre-select staff portal on the login page */}
            <Button component={RLink} to="/login?role=officer" color="inherit">
              Staff Login
            </Button>
            <Button component={RLink} to="/login?role=admin" color="inherit">
              Admin Login
            </Button>
            <Button component={RLink} to="/register" variant="contained" color="secondary">
              Apply for Loan
            </Button>
          </>
        )}
      </Toolbar>
    </AppBar>
  );
}
