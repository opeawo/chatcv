import { useState, useEffect } from "react";
import { SignIn, useAuth } from "@clerk/react";
import Landing from "./Landing";
import Onboarding from "./Onboarding";
import Mesh from "./Mesh";
import { setAuthTokenGetter } from "./api";

const HAS_CLERK = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

function AuthenticatedApp() {
  const { getToken } = useAuth();
  const [view, setView] = useState("onboarding"); // "onboarding" | "mesh"
  const [userAgent, setUserAgent] = useState(null);

  useEffect(() => {
    if (getToken) {
      setAuthTokenGetter(() => getToken());
    }
  }, [getToken]);

  if (view === "onboarding" && !userAgent) {
    return (
      <Onboarding onComplete={(data) => { setUserAgent(data); setView("mesh"); }} />
    );
  }

  return <Mesh userAgent={userAgent} onUpdateAgent={setUserAgent} />;
}

function AuthModal({ onClose }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0,
        background: visible ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0)",
        backdropFilter: visible ? "blur(6px)" : "none",
        zIndex: 200,
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.3s ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          transform: visible ? "translateY(0) scale(1)" : "translateY(12px) scale(0.97)",
          opacity: visible ? 1 : 0,
          transition: "all 0.3s ease",
        }}
      >
        <SignIn routing="virtual" />
      </div>
    </div>
  );
}

function ClerkApp() {
  const { isLoaded, isSignedIn } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  if (!isLoaded) {
    return (
      <div style={{
        background: "#07070f", minHeight: "100vh",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, opacity: 0.5 }}>
          <img src="/logo.svg" alt="" style={{ width: 28, height: 28 }} />
          <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.5px", color: "#e2e8f0" }}>
            Chat<span style={{ color: "#6366f1" }}>.cv</span>
          </span>
        </div>
      </div>
    );
  }

  if (isSignedIn) {
    return <AuthenticatedApp />;
  }

  return (
    <>
      <Landing onStart={() => setShowAuth(true)} />
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  );
}

function FallbackApp() {
  const [view, setView] = useState("landing");
  const [userAgent, setUserAgent] = useState(null);

  if (view === "landing") {
    return <Landing onStart={() => setView("onboarding")} />;
  }
  if (view === "onboarding") {
    return <Onboarding onComplete={(data) => { setUserAgent(data); setView("mesh"); }} />;
  }
  return <Mesh userAgent={userAgent} onUpdateAgent={setUserAgent} />;
}

export default function App() {
  if (!HAS_CLERK) return <FallbackApp />;
  return <ClerkApp />;
}
