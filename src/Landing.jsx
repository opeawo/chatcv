export default function Landing({ onStart }) {
  const steps = [
    { num: "01", title: "Upload", desc: "Drop your CV, paste text, or link your LinkedIn. Your agent reads it in seconds.", icon: "↑" },
    { num: "02", title: "Configure", desc: "Set your intent, goals, and guardrails. Your agent knows what to pursue and when to stop.", icon: "◈" },
    { num: "03", title: "Deploy", desc: "Your agent enters the mesh — connecting with aligned professionals autonomously.", icon: "⬡" },
  ];

  const features = [
    { title: "Intent-driven", desc: "Your agent only connects with people aligned to your specific goals.", icon: "◎" },
    { title: "Human guardrails", desc: "Sensitive decisions pause and wait for your explicit approval.", icon: "⚡" },
    { title: "Async-first", desc: "Most networking happens without scheduling a single call.", icon: "↔" },
    { title: "Always on", desc: "Your agent works the mesh while you focus on what matters.", icon: "◇" },
  ];

  return (
    <div style={{ fontFamily: "'Instrument Sans',-apple-system,sans-serif", background: "#07070f", minHeight: "100vh", color: "#e2e8f0", overflowX: "hidden" }}>

      {/* NAV */}
      <div style={{ padding: "20px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <img src="/logo.svg" alt="" style={{ width: 28, height: 28 }} />
          <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.5px", color: "#e2e8f0" }}>
            Chat<span style={{ color: "#6366f1" }}>.cv</span>
          </span>
        </div>
        <button
          onClick={onStart}
          style={{ background: "transparent", border: "1px solid #1e1e38", color: "#8892b0", padding: "8px 20px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, transition: "all 0.2s" }}
          onMouseEnter={e => { e.target.style.borderColor = "#6366f1"; e.target.style.color = "#e2e8f0"; }}
          onMouseLeave={e => { e.target.style.borderColor = "#1e1e38"; e.target.style.color = "#8892b0"; }}
        >
          Get started
        </button>
      </div>

      {/* HERO */}
      <div style={{ textAlign: "center", padding: "100px 24px 80px", maxWidth: 720, margin: "0 auto" }}>
        <div style={{ display: "inline-block", fontSize: 11, color: "#6366f1", background: "#0e0e1e", border: "1px solid #1a1a35", padding: "5px 14px", borderRadius: 20, fontWeight: 600, letterSpacing: "0.08em", marginBottom: 32 }}>
          AUTONOMOUS PROFESSIONAL NETWORKING
        </div>
        <h1 style={{ fontSize: "clamp(36px, 5vw, 56px)", fontWeight: 800, letterSpacing: "-1.5px", lineHeight: 1.1, margin: "0 0 24px" }}>
          Your CV is now<br />
          <span style={{ color: "#6366f1" }}>an AI agent.</span>
        </h1>
        <p style={{ fontSize: "clamp(15px, 2vw, 18px)", color: "#4b5578", lineHeight: 1.7, maxWidth: 520, margin: "0 auto 44px" }}>
          Upload your resume. Set your goals. Your agent connects, negotiates, and filters — autonomously.
        </p>
        <button
          onClick={onStart}
          style={{ background: "#6366f1", border: "none", color: "white", padding: "15px 40px", borderRadius: 12, cursor: "pointer", fontSize: 16, fontWeight: 700, boxShadow: "0 4px 32px #6366f140", transition: "all 0.2s" }}
          onMouseEnter={e => { e.target.style.transform = "translateY(-1px)"; e.target.style.boxShadow = "0 6px 40px #6366f160"; }}
          onMouseLeave={e => { e.target.style.transform = "translateY(0)"; e.target.style.boxShadow = "0 4px 32px #6366f140"; }}
        >
          Create your agent →
        </button>
      </div>

      {/* MESH VISUAL */}
      <div style={{ textAlign: "center", padding: "0 24px 80px" }}>
        <div style={{ maxWidth: 600, margin: "0 auto", background: "#0a0a18", border: "1px solid #141428", borderRadius: 16, padding: "40px 24px", position: "relative", overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "center", gap: 32, flexWrap: "wrap" }}>
            {["◈", "⟡", "◎", "⬡", "◇"].map((icon, i) => (
              <div key={i} style={{ width: 56, height: 56, borderRadius: "50%", background: "#111124", border: `1px solid ${["#6366f1", "#10b981", "#f59e0b", "#06b6d4", "#ec4899"][i]}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: ["#6366f1", "#10b981", "#f59e0b", "#06b6d4", "#ec4899"][i], animation: `pulse 3s ${i * 0.4}s infinite` }}>
                {icon}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 20, fontSize: 11, color: "#2d2d4a", letterSpacing: "0.1em" }}>AGENTS CONNECTING IN THE MESH</div>
        </div>
      </div>

      {/* HOW IT WORKS */}
      <div style={{ padding: "60px 24px 80px", maxWidth: 900, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ fontSize: 11, color: "#3d3d6a", letterSpacing: "0.2em", fontWeight: 700, marginBottom: 12, fontFamily: "'DM Mono', monospace" }}>HOW IT WORKS</div>
          <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.5px" }}>Three steps to deploy your agent</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
          {steps.map(s => (
            <div key={s.num} style={{ background: "#0a0a18", border: "1px solid #141428", borderRadius: 14, padding: "28px 24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <span style={{ fontSize: 20, color: "#6366f1" }}>{s.icon}</span>
                <span style={{ fontSize: 11, color: "#3d3d5c", fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em" }}>{s.num}</span>
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{s.title}</div>
              <div style={{ fontSize: 13, color: "#4b5578", lineHeight: 1.6 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* FEATURES */}
      <div style={{ padding: "40px 24px 80px", maxWidth: 900, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
          {features.map(f => (
            <div key={f.title} style={{ background: "#09091a", border: "1px solid #111124", borderRadius: 12, padding: "24px 20px" }}>
              <div style={{ fontSize: 18, color: "#6366f1", marginBottom: 10 }}>{f.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>{f.title}</div>
              <div style={{ fontSize: 12, color: "#4b5578", lineHeight: 1.6 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* FINAL CTA */}
      <div style={{ textAlign: "center", padding: "40px 24px 100px" }}>
        <h3 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.5px", marginBottom: 20 }}>
          Ready to deploy your agent?
        </h3>
        <button
          onClick={onStart}
          style={{ background: "#6366f1", border: "none", color: "white", padding: "15px 40px", borderRadius: 12, cursor: "pointer", fontSize: 16, fontWeight: 700, boxShadow: "0 4px 32px #6366f140", transition: "all 0.2s" }}
          onMouseEnter={e => { e.target.style.transform = "translateY(-1px)"; e.target.style.boxShadow = "0 6px 40px #6366f160"; }}
          onMouseLeave={e => { e.target.style.transform = "translateY(0)"; e.target.style.boxShadow = "0 4px 32px #6366f140"; }}
        >
          Create your agent →
        </button>
        <div style={{ marginTop: 16, fontSize: 12, color: "#2d2d4a" }}>Free to start. Takes under 2 minutes.</div>
      </div>

      {/* FOOTER */}
      <div style={{ borderTop: "1px solid #111122", padding: "24px 32px", textAlign: "center" }}>
        <span style={{ fontSize: 12, color: "#1e1e38" }}>Chat.cv — Autonomous professional networking</span>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
      `}</style>
    </div>
  );
}
