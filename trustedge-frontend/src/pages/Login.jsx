// src/pages/Login.jsx
import { useState } from "react";
import {
  Box,
  Button,
  Container,
  Paper,
  TextField,
  Typography,
  Alert,
  Divider,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
} from "@mui/material";
import { login, me as fetchMe } from "../api/auth";
import useAuth from "../hooks/useAuth";
import { useNavigate, Link as RLink } from "react-router-dom";
import GoogleSignInButton from "../components/GoogleSignInButton";

function nextPathForRole(role) {
  switch ((role || "").toLowerCase()) {
    case "officer":
      return "/payments-queue";
    case "admin":
      return "/staff";
    case "borrower":
    default:
      return "/dashboard";
  }
}

export default function Login() {
  const [portalRole, setPortalRole] = useState("borrower"); // borrower | officer | admin
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const { setUser } = useAuth();
  const nav = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setErr("");
    try {
      // Email/password login → backend enforces role via ?as_role=
      await login(email, password, portalRole);

      // Get current user
      const u = await fetchMe();
      // (Double-check, though backend already guards this)
      if (u?.role && u.role !== portalRole) {
        throw new Error(
          `Role mismatch: your account is '${u.role}'. You cannot sign in as '${portalRole}'.`
        );
      }

      setUser(u);
      nav(nextPathForRole(portalRole));
    } catch (e) {
      setErr(e?.message || "Sign-in failed");
    }
  }

  return (
    <Container sx={{ py: 6 }}>
      <Paper sx={{ p: 4, maxWidth: 520, mx: "auto" }}>
        <Typography variant="h5" fontWeight={800}>
          Login
        </Typography>

        {/* Role selection */}
        <FormControl sx={{ mt: 2 }}>
          <FormLabel>Sign in as</FormLabel>
          <RadioGroup
            row
            value={portalRole}
            onChange={(e) => setPortalRole(e.target.value)}
            name="portal-role"
          >
            <FormControlLabel value="borrower" control={<Radio />} label="Borrower" />
            <FormControlLabel value="officer" control={<Radio />} label="Officer" />
            <FormControlLabel value="admin" control={<Radio />} label="Admin" />
          </RadioGroup>
        </FormControl>

        {err && (
          <Alert severity="error" sx={{ my: 2 }}>
            {err}
          </Alert>
        )}

        <Box component="form" onSubmit={submit} sx={{ mt: 2, display: "grid", gap: 2 }}>
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            fullWidth
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            fullWidth
          />

          <Button type="submit" variant="contained" size="large">
            Sign In
          </Button>

          <Typography variant="body2">
            <RLink to="/forgot">Forgot password?</RLink>
          </Typography>

          <Divider>or</Divider>

          {/* Google Sign-In (passes asRole to backend guard and redirects per role) */}
          <div style={{ marginTop: 8, display: "grid", gap: 12 }}>
            <GoogleSignInButton
              asRole={portalRole}
              onSuccessRedirect={nextPathForRole(portalRole)}
              onError={(message) => setErr(message || "Google sign-in failed")}
            />
          </div>

          <Typography variant="body2" sx={{ mt: 1 }}>
            New user? <RLink to="/register">Create an account</RLink>
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
}
