import { useState, useRef, useEffect } from "react";
import { useAuthContext } from "./App";

export default function UserMenu() {
  const { user, logout } = useAuthContext();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!user) return null;

  const initials = user.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => setOpen(o => !o)}>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0", lineHeight: 1.3 }}>
            {user.name}
          </div>
          <div style={{ fontSize: 10, color: "#3d3d5c", fontFamily: "'DM Mono', monospace" }}>
            {user.email}
          </div>
        </div>
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          background: "#6366f1", border: "2px solid #1e1e38",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 700, color: "white",
        }}>
          {initials}
        </div>
      </div>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", right: 0, width: 200,
          background: "#0a0a18", border: "1px solid #1e1e38", borderRadius: 12,
          boxShadow: "0 8px 40px rgba(0,0,0,0.6)", overflow: "hidden", zIndex: 50,
        }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #141428" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0" }}>{user.name}</div>
            <div style={{ fontSize: 10, color: "#3d3d5c", marginTop: 2 }}>{user.email}</div>
          </div>
          <button
            onClick={() => { setOpen(false); logout(); }}
            style={{
              width: "100%", padding: "10px 16px", background: "transparent", border: "none",
              color: "#ef4444", fontSize: 12, fontWeight: 600, cursor: "pointer", textAlign: "left",
            }}
            onMouseEnter={e => e.target.style.background = "#140808"}
            onMouseLeave={e => e.target.style.background = "transparent"}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
