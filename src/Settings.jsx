import { useState, useEffect } from "react";
import { INTENT_OPTIONS, GUARDRAILS_BY_INTENT, DEFAULT_LOOPS_BY_INTENT } from "./Onboarding";

export default function Settings({ userAgent, onSave, onClose }) {
  const { profile, intent, guardrails } = userAgent;

  const [selectedIntent, setSelectedIntent] = useState(intent.intent);
  const [goals, setGoals]                  = useState(intent.goals || "");
  const [dealbreakers, setDealbreakers]    = useState(intent.dealbreakers || "");
  const [loops, setLoops]                  = useState(guardrails?.loops || []);
  const [visible, setVisible]              = useState(false);

  // Slide-in animation on mount
  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);

  // When intent changes, reset guardrails to new defaults
  const handleIntentChange = (key) => {
    if (key === selectedIntent) return;
    setSelectedIntent(key);
    setLoops(DEFAULT_LOOPS_BY_INTENT[key] || []);
  };

  const toggleLoop = (id) => setLoops(l => l.includes(id) ? l.filter(x => x !== id) : [...l, id]);

  const handleSave = () => {
    onSave({
      profile,
      intent: { intent: selectedIntent, goals, dealbreakers },
      guardrails: { loops },
    });
    handleClose();
  };

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  const options = GUARDRAILS_BY_INTENT[selectedIntent] || GUARDRAILS_BY_INTENT.open_to_work;
  const hasChanges = selectedIntent !== intent.intent
    || goals !== (intent.goals || "")
    || dealbreakers !== (intent.dealbreakers || "")
    || JSON.stringify(loops) !== JSON.stringify(guardrails?.loops || []);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, opacity: visible ? 1 : 0, transition: "opacity 0.3s" }}
      />

      {/* Panel */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: 420, maxWidth: "90vw",
        background: "#0a0a18", borderLeft: "1px solid #161628", zIndex: 101,
        display: "flex", flexDirection: "column", fontFamily: "'Instrument Sans',-apple-system,sans-serif",
        transform: visible ? "translateX(0)" : "translateX(100%)", transition: "transform 0.3s ease",
      }}>

        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #141428", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#e2e8f0" }}>Settings</span>
          <button onClick={handleClose} style={{ background: "none", border: "none", color: "#4b5578", cursor: "pointer", fontSize: 18, padding: "4px 8px", lineHeight: 1 }}>×</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>

          {/* PROFILE */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 10, color: "#3d3d6a", letterSpacing: "0.18em", fontWeight: 700, marginBottom: 12, fontFamily: "'DM Mono', monospace" }}>PROFILE</div>
            <div style={{ background: "#0d0d1e", border: "1px solid #1a1a30", borderRadius: 10, padding: "14px 16px" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#e2e8f0" }}>{profile.name}</div>
              <div style={{ fontSize: 12, color: "#4b5578", marginTop: 3 }}>{profile.title} at {profile.company}</div>
              {profile.years && <div style={{ fontSize: 11, color: "#3d3d5c", marginTop: 4 }}>{profile.years} experience</div>}
            </div>
            <div style={{ fontSize: 11, color: "#2d2d4a", marginTop: 8 }}>Re-upload your CV to update profile details.</div>
          </div>

          {/* INTENT */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 10, color: "#3d3d6a", letterSpacing: "0.18em", fontWeight: 700, marginBottom: 12, fontFamily: "'DM Mono', monospace" }}>INTENT</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {Object.entries(INTENT_OPTIONS).map(([key, opt]) => (
                <div
                  key={key}
                  onClick={() => handleIntentChange(key)}
                  style={{
                    padding: "10px 12px", cursor: "pointer", borderRadius: 10, transition: "all 0.2s",
                    background: selectedIntent === key ? "#12122e" : "#0d0d1c",
                    border: `1px solid ${selectedIntent === key ? opt.color : "#1a1a30"}`,
                  }}
                >
                  <div style={{ fontSize: 15, color: opt.color, marginBottom: 3 }}>{opt.icon}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: selectedIntent === key ? "white" : "#5a607a" }}>{opt.label}</div>
                  <div style={{ fontSize: 10, color: "#3d3d5c", lineHeight: 1.4, marginTop: 2 }}>{opt.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* GOALS */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, color: "#3d3d6a", letterSpacing: "0.18em", fontWeight: 700, marginBottom: 8, fontFamily: "'DM Mono', monospace" }}>GOALS</div>
            <textarea
              value={goals}
              onChange={e => setGoals(e.target.value)}
              placeholder="What should your agent actively seek?"
              style={{ width: "100%", height: 72, background: "#09091a", border: "1px solid #1e1e38", borderRadius: 8, padding: "10px 12px", color: "#c8d4e0", fontSize: 12, lineHeight: 1.6, resize: "vertical", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
            />
          </div>

          {/* DEALBREAKERS */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 10, color: "#3d3d6a", letterSpacing: "0.18em", fontWeight: 700, marginBottom: 8, fontFamily: "'DM Mono', monospace" }}>DEALBREAKERS</div>
            <textarea
              value={dealbreakers}
              onChange={e => setDealbreakers(e.target.value)}
              placeholder="What should your agent never pursue or agree to?"
              style={{ width: "100%", height: 60, background: "#09091a", border: "1px solid #1e1e38", borderRadius: 8, padding: "10px 12px", color: "#c8d4e0", fontSize: 12, lineHeight: 1.6, resize: "vertical", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
            />
          </div>

          {/* GUARDRAILS */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, color: "#3d3d6a", letterSpacing: "0.18em", fontWeight: 700, marginBottom: 12, fontFamily: "'DM Mono', monospace" }}>GUARDRAILS</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {options.map(opt => {
                const isHuman = loops.includes(opt.id);
                return (
                  <div
                    key={opt.id}
                    onClick={() => toggleLoop(opt.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, cursor: "pointer", transition: "all 0.15s",
                      background: isHuman ? "#0e0e20" : "#09091a",
                      border: `1px solid ${isHuman ? "#6366f130" : "#141428"}`,
                    }}
                  >
                    <div style={{
                      width: 16, height: 16, borderRadius: 4, flexShrink: 0, transition: "all 0.15s",
                      background: isHuman ? "#6366f1" : "transparent",
                      border: `1.5px solid ${isHuman ? "#6366f1" : "#2d2d4a"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, color: "white", fontWeight: 700,
                    }}>
                      {isHuman && "✓"}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: isHuman ? "#e2e8f0" : "#5a607a" }}>{opt.label}</div>
                      <div style={{ fontSize: 10, color: "#3d3d5c", marginTop: 1 }}>{isHuman ? "Human approval required" : "Autonomous"}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 20px", borderTop: "1px solid #141428", flexShrink: 0 }}>
          <button
            onClick={handleSave}
            disabled={!hasChanges}
            style={{
              width: "100%", padding: "12px 0", borderRadius: 10, border: "none", fontSize: 13, fontWeight: 700, cursor: hasChanges ? "pointer" : "not-allowed", transition: "all 0.2s",
              background: hasChanges ? "#6366f1" : "#1a1a30",
              color: hasChanges ? "white" : "#3d3d5c",
              boxShadow: hasChanges ? "0 4px 24px #6366f140" : "none",
            }}
          >
            {hasChanges ? "Save & apply" : "No changes"}
          </button>
        </div>
      </div>

      <style>{`
        textarea:focus { border-color: #6366f1 !important; }
      `}</style>
    </>
  );
}
