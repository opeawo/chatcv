import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/react";
import App from "./App";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const clerkAppearance = {
  variables: {
    colorPrimary: "#6366f1",
    colorBackground: "#0a0a18",
    colorInputBackground: "#09091a",
    colorInputText: "#e2e8f0",
    colorText: "#e2e8f0",
    colorTextSecondary: "#4b5578",
    colorDanger: "#ef4444",
    borderRadius: "12px",
    fontFamily: "'Instrument Sans', -apple-system, sans-serif",
    fontFamilyButtons: "'Instrument Sans', -apple-system, sans-serif",
  },
  elements: {
    card: {
      background: "#0a0a18",
      border: "1px solid #1e1e38",
      borderRadius: "16px",
      boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
    },
    headerTitle: {
      color: "#e2e8f0",
      fontWeight: 800,
      letterSpacing: "-0.5px",
    },
    headerSubtitle: {
      color: "#4b5578",
    },
    socialButtonsBlockButton: {
      background: "#0d0d1e",
      border: "1px solid #1e1e38",
      color: "#e2e8f0",
    },
    formButtonPrimary: {
      background: "#6366f1",
      boxShadow: "0 4px 24px #6366f140",
      fontWeight: 700,
    },
    formFieldInput: {
      background: "#09091a",
      border: "1px solid #1e1e38",
      color: "#e2e8f0",
    },
    footerActionLink: {
      color: "#6366f1",
    },
    userButtonPopoverCard: {
      background: "#0a0a18",
      border: "1px solid #1e1e38",
    },
    userButtonPopoverActionButton: {
      color: "#e2e8f0",
    },
  },
};

function Root() {
  if (!PUBLISHABLE_KEY) {
    return <App />;
  }
  return (
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      appearance={clerkAppearance}
    >
      <App />
    </ClerkProvider>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Root />
  </StrictMode>
);
