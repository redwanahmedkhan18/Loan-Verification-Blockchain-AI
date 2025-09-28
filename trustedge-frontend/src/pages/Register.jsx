// src/pages/Register.jsx
import { useState, useMemo } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
  Stack,
  Divider,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client"; // axios instance with baseURL & auth interceptors
import GoogleSignInButton from "../components/GoogleSignInButton";

const steps = ["Account", "Personal", "Identity", "Address", "Review"];

export default function Register() {
  const nav = useNavigate();

  // Step control
  const [activeStep, setActiveStep] = useState(0);
  const next = () => setActiveStep((s) => Math.min(s + 1, steps.length - 1));
  const back = () => setActiveStep((s) => Math.max(s - 1, 0));

  // Account
  const [role, setRole] = useState("borrower");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Personal
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  // Identity
  const [nidNumber, setNidNumber] = useState("");
  const [photoFile, setPhotoFile] = useState(null);

  // Address
  const [address, setAddress] = useState("");

  const [err, setErr] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const photoPreview = useMemo(() => {
    if (!photoFile) return "";
    return URL.createObjectURL(photoFile);
  }, [photoFile]);

  function validateStep(idx) {
    switch (idx) {
      case 0: // account
        return email.trim() && password.trim();
      case 1: // personal
        return fullName.trim() && phone.trim();
      case 2: // identity
        return nidNumber.trim() && photoFile;
      case 3: // address
        return address.trim();
      default:
        return true;
    }
  }

  async function submitAll() {
    setErr("");
    if (!validateStep(0) || !validateStep(1) || !validateStep(2) || !validateStep(3)) {
      setErr("Please complete all required fields.");
      return;
    }

    try {
      setSubmitting(true);
      const fd = new FormData();
      fd.append("email", email.trim().toLowerCase());
      fd.append("password", password);
      fd.append("role", role);

      fd.append("full_name", fullName.trim());
      fd.append("phone", phone.trim());
      fd.append("nid_number", nidNumber.trim());
      fd.append("address", address.trim());

      if (photoFile) fd.append("photo", photoFile, photoFile.name);

      await api.post("/auth/register", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // On success, go to login (user will verify email if enabled)
      nav("/login");
    } catch (e) {
      const msg = e?.response?.data?.detail || e?.message || "Registration failed";
      setErr(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const StepActions = (
    <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
      {activeStep > 0 && (
        <Button onClick={back} variant="outlined" color="inherit">
          Back
        </Button>
      )}
      {activeStep < steps.length - 1 && (
        <Button
          onClick={() => {
            if (!validateStep(activeStep)) {
              setErr("Please complete required fields in this step.");
              return;
            }
            setErr("");
            next();
          }}
          variant="contained"
          color="secondary"
        >
          Next
        </Button>
      )}
      {activeStep === steps.length - 1 && (
        <Button
          onClick={submitAll}
          variant="contained"
          color="secondary"
          disabled={submitting}
        >
          {submitting ? "Submitting..." : "Create Account"}
        </Button>
      )}
    </Stack>
  );

  return (
    <Container sx={{ py: 6 }}>
      <Paper sx={{ p: 4, maxWidth: 720, mx: "auto" }}>
        <Typography variant="h5" fontWeight={800}>
          Create Account
        </Typography>

        <Stepper activeStep={activeStep} sx={{ my: 3 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {err && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {err}
          </Alert>
        )}

        {/* Step Content */}
        {activeStep === 0 && (
          <Box sx={{ display: "grid", gap: 2 }}>
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              fullWidth
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                label="Role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <MenuItem value="borrower">Borrower</MenuItem>
                <MenuItem value="officer">Loan Officer</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
            </FormControl>
          </Box>
        )}

        {activeStep === 1 && (
          <Box sx={{ display: "grid", gap: 2 }}>
            <TextField
              label="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              fullWidth
            />
            <TextField
              label="Phone Number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              fullWidth
            />
          </Box>
        )}

        {activeStep === 2 && (
          <Box sx={{ display: "grid", gap: 2 }}>
            <TextField
              label="NID Number"
              value={nidNumber}
              onChange={(e) => setNidNumber(e.target.value)}
              required
              fullWidth
            />

            <Stack direction="row" alignItems="center" spacing={2}>
              <Button variant="outlined" component="label">
                Upload Photo
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                />
              </Button>
              {photoPreview ? (
                <Avatar
                  src={photoPreview}
                  alt="Preview"
                  sx={{ width: 64, height: 64, borderRadius: 2 }}
                />
              ) : (
                <Typography variant="body2" color="text.secondary">
                  JPG/PNG up to ~3 MB
                </Typography>
              )}
            </Stack>
          </Box>
        )}

        {activeStep === 3 && (
          <Box sx={{ display: "grid", gap: 2 }}>
            <TextField
              label="Address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
              multiline
              rows={3}
              fullWidth
            />
          </Box>
        )}

        {activeStep === 4 && (
          <Box sx={{ display: "grid", gap: 1 }}>
            <Typography variant="subtitle1" fontWeight={700}>
              Review
            </Typography>
            <Typography><b>Email:</b> {email}</Typography>
            <Typography><b>Role:</b> {role}</Typography>
            <Typography><b>Name:</b> {fullName}</Typography>
            <Typography><b>Phone:</b> {phone}</Typography>
            <Typography><b>NID:</b> {nidNumber}</Typography>
            <Typography sx={{ whiteSpace: "pre-wrap" }}>
              <b>Address:</b> {address}
            </Typography>
            {photoPreview && (
              <Stack direction="row" alignItems="center" spacing={2} sx={{ mt: 1 }}>
                <Avatar src={photoPreview} alt="Preview" sx={{ width: 64, height: 64, borderRadius: 2 }} />
                <Typography variant="body2" color="text.secondary">
                  {photoFile?.name}
                </Typography>
              </Stack>
            )}
          </Box>
        )}

        {StepActions}

        {/* Social sign-up option */}
        <Divider sx={{ my: 3 }}>or</Divider>
        <div style={{ marginTop: 8, display: "grid", gap: 12 }}>
          <GoogleSignInButton onSuccessRedirect="/dashboard" />
        </div>
      </Paper>
    </Container>
  );
}
