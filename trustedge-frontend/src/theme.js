import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#0e2a3c" },     // deep navy
    secondary: { main: "#d4a24c" },   // gold
    background: { default: "#f5efe3", paper: "#ffffff" }, // warm/cream
    success: { main: "#2e7d32" },
    warning: { main: "#ed6c02" },
  },
  typography: {
    fontFamily: ['"Inter"', "system-ui", "Helvetica", "Arial", "sans-serif"].join(","),
    h2: { fontWeight: 800, letterSpacing: ".3px" },
    h4: { fontWeight: 700 },
    button: { textTransform: "none", fontWeight: 600 },
  },
  shape: { borderRadius: 12 },
});

export default theme;
