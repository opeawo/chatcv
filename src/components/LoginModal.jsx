import { useState, useEffect } from "react";
import { useAuthContext } from "../context/AuthContext";

export default function LoginModal({ onClose }) {
  const { login, DEMO_USERS } = useAuthContext();
  const [visible, setVisible] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);

  const handleClose = () => { setVisible(false); setTimeout(onClose, 300); };

  const handleSubmit = (e) => {
    e.preventDefault();
    const entry = DEMO_USERS[username];
    if (!entry || entry.password !== password) {
      setError("Invalid username or password");
      return;
    }
    login(username, entry.user);
  };

  const handleDemo = () => {
    login("demo", DEMO_USERS.demo.user);
  };

  return (
    <div
      onClick={handleClose}
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
        onClick={e => e.stopPropagation()}
        style={{
          width: 380, maxWidth: "90vw",
          background: "#0a0a18", border: "1px solid #1e1e38", borderRadius: 16,
          boxShadow: "0 8px 40px rgba(0,0,0,0.6)", padding: "32px 28px",
          transform: visible ? "translateY(0) scale(1)" : "translateY(12px) scale(0.97)",
          opacity: visible ? 1 : 0, transition: "all 0.3s ease",
          fontFamily: "'Instrument Sans',-apple-system,sans-serif",
        }}
      >
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#e2e8f0", letterSpacing: "-0.5px", marginBottom: 6 }}>
            Sign in to Chat<span style={{ color: "#6366f1" }}>.cv</span>
          </div>
          <div style={{ fontSize: 13, color: "#4b5578" }}>Enter your credentials or use the demo account.</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, color: "#5a607a", display: "block", marginBottom: 6, fontWeight: 600 }}>Username</label>
            <input
              value={username} onChange={e => { setUsername(e.target.value); setError(""); }}
              placeholder="demo"
              autoFocus
              style={{
                width: "100%", padding: "10px 12px", background: "#09091a", border: "1px solid #1e1e38",
                borderRadius: 8, color: "#e2e8f0", fontSize: 13, outline: "none", boxSizing: "border-box",
                fontFamily: "inherit",
              }}
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 11, color: "#5a607a", display: "block", marginBottom: 6, fontWeight: 600 }}>Password</label>
            <input
              type="password" value={password} onChange={e => { setPassword(e.target.value); setError(""); }}
              placeholder="demo"
              style={{
                width: "100%", padding: "10px 12px", background: "#09091a", border: "1px solid #1e1e38",
                borderRadius: 8, color: "#e2e8f0", fontSize: 13, outline: "none", boxSizing: "border-box",
                fontFamily: "inherit",
              }}
            />
          </div>

          {error && (
            <div style={{ fontSize: 12, color: "#ef4444", marginBottom: 14, padding: "8px 12px", background: "#140808", border: "1px solid #3a1010", borderRadius: 8 }}>
              {error}
            </div>
          )}

          <button type="submit" style={{
            width: "100%", padding: "11px 0", borderRadius: 10, border: "none",
            background: "#6366f1", color: "white", fontSize: 13, fontWeight: 700,
            cursor: "pointer", boxShadow: "0 4px 24px #6366f140", marginBottom: 12,
          }}>
            Sign in
          </button>
        </form>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <div style={{ flex: 1, height: 1, background: "#1e1e38" }} />
          <span style={{ fontSize: 11, color: "#3d3d5c" }}>or</span>
          <div style={{ flex: 1, height: 1, background: "#1e1e38" }} />
        </div>

        <button onClick={handleDemo} style={{
          width: "100%", padding: "11px 0", borderRadius: 10,
          background: "#0d0d1e", border: "1px solid #28285a", color: "#818cf8",
          fontSize: 13, fontWeight: 600, cursor: "pointer",
        }}>
          Use demo account →
        </button>
      </div>

      <style>{`
        input:focus { border-color: #6366f1 !important; }
      `}</style>
    </div>
  );
}
