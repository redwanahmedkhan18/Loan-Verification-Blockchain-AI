// src/App.jsx
import { CssBaseline, ThemeProvider } from "@mui/material";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import theme from "./theme";

import AuthProvider from "./context/AuthProvider";
import ProtectedRoute from "./components/ProtectedRoute";
import NavBar from "./components/NavBar";
import Footer from "./components/Footer";

// Public pages
import Home from "./pages/Home";
import About from "./pages/About";
import LoanCalculator from "./pages/LoanCalculator";
import Services from "./pages/Services";

// Auth flow
import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyEmail from "./pages/VerifyEmail";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

// App features
import Dashboard from "./pages/Dashboard";
import ApplyLoan from "./pages/ApplyLoan";
import Applications from "./pages/Applications";
import ApplicationDetails from "./pages/ApplicationDetails";
import KycUpload from "./pages/KycUpload";
import PaymentsQueue from "./pages/PaymentsQueue";

// Officer/Admin pages
import OfficerBorrowers from "./pages/OfficerBorrowers";
import BorrowerProfile from "./pages/BorrowerProfile";

// Admin-only pages
import StaffManagement from "./pages/StaffManagement";
import StaffUserProfile from "./pages/StaffUserProfile";

import NotFound from "./pages/NotFound";
import Contact from "./pages/Contact";


export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <BrowserRouter>
          <NavBar />

          <Routes>
            {/* Public */}
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/calculator" element={<LoanCalculator />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/services" element={<Services />} />

            {/* Auth */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify" element={<VerifyEmail />} />
            <Route path="/forgot" element={<ForgotPassword />} />
            <Route path="/reset" element={<ResetPassword />} />

            {/* Protected app (all authenticated roles) */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/kyc"
              element={
                <ProtectedRoute>
                  <KycUpload />
                </ProtectedRoute>
              }
            />

            {/* Borrower-only */}
            <Route
              path="/apply"
              element={
                <ProtectedRoute roles={["borrower"]}>
                  <ApplyLoan />
                </ProtectedRoute>
              }
            />

            {/* Officers/Admins — applications queue */}
            <Route
              path="/applications"
              element={
                <ProtectedRoute roles={["officer", "admin"]}>
                  <Applications />
                </ProtectedRoute>
              }
            />

            {/* Application details (server enforces ownership/role access) */}
            <Route
              path="/applications/:id"
              element={
                <ProtectedRoute>
                  <ApplicationDetails />
                </ProtectedRoute>
              }
            />

            {/* Officers/Admins — borrower management */}
            <Route
              path="/officer/borrowers"
              element={
                <ProtectedRoute roles={["officer", "admin"]}>
                  <OfficerBorrowers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/officer/borrowers/:id"
              element={
                <ProtectedRoute roles={["officer", "admin"]}>
                  <BorrowerProfile />
                </ProtectedRoute>
              }
            />

            {/* Officers/Admins — Stripe authorization approvals */}
            <Route
              path="/payments-queue"
              element={
                <ProtectedRoute roles={["officer", "admin"]}>
                  <PaymentsQueue />
                </ProtectedRoute>
              }
            />

            {/* Admin-only — staff management */}
            <Route
              path="/staff"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <StaffManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/staff/users/:id"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <StaffUserProfile />
                </ProtectedRoute>
              }
            />

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>

          <Footer />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
