// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import icon from "./assets/trustedge-icon.png";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

/** Brand the tab (title + favicon + theme color) */
(function setBranding() {
  document.title = "TrustEdge Bank";

  // favicon
  let link = document.querySelector("link[rel='icon']");
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.type = "image/png";
  link.href = icon;

  // apple touch icon
  let apple = document.querySelector("link[rel='apple-touch-icon']");
  if (!apple) {
    apple = document.createElement("link");
    apple.rel = "apple-touch-icon";
    document.head.appendChild(apple);
  }
  apple.href = icon;

  // theme color
  let theme = document.querySelector("meta[name='theme-color']");
  if (!theme) {
    theme = document.createElement("meta");
    theme.name = "theme-color";
    document.head.appendChild(theme);
  }
  theme.setAttribute("content", "#0e2a3c");
})();

// Env keys
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "";

// Initialize Stripe only if key present
const stripePromise = stripeKey ? loadStripe(stripeKey) : null;

// Friendly warnings if not configured
if (!googleClientId) {
  console.warn("[Google OAuth] VITE_GOOGLE_CLIENT_ID is not set. Google sign-in will be disabled.");
}
if (!stripeKey) {
  console.warn("[Stripe] VITE_STRIPE_PUBLISHABLE_KEY is not set. Card payments will be disabled.");
}

function Providers({ children }) {
  let tree = children;

  if (stripePromise) {
    tree = <Elements stripe={stripePromise}>{tree}</Elements>;
  }

  if (googleClientId) {
    tree = <GoogleOAuthProvider clientId={googleClientId}>{tree}</GoogleOAuthProvider>;
  }

  return tree;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Providers>
      <App />
    </Providers>
  </React.StrictMode>
);
