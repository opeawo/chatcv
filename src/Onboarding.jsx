import { useState, useEffect, useRef, useCallback } from "react";
import { claude } from "./api";
import mammoth from "mammoth";

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const LOOP_OPTIONS = [
  { id: "salary",    label: "Salary negotiation",         desc: "Before any comp figures are shared" },
  { id: "calendar",  label: "Calendar / availability",    desc: "Before scheduling anything" },
  { id: "equity",    label: "Equity discussion",          desc: "Before any equity terms are discussed" },
  { id: "intro",     label: "Intro calls",                desc: "Before committing to a call" },
  { id: "coauthor",  label: "Co-authorship / IP",         desc: "Before agreeing to joint work" },
  { id: "reference", label: "Reference requests",         desc: "Before sharing references" },
];

const INTENT_OPTIONS = {
  open_to_work:  { label: "Open to work",       icon: "◈", color: "#6366f1", desc: "Your agent seeks and evaluates opportunities" },
  hiring:        { label: "Hiring",              icon: "⟡", color: "#10b981", desc: "Your agent scouts and vets candidates" },
  collaborating: { label: "Collaborating",       icon: "◎", color: "#f59e0b", desc: "Your agent finds research or project partners" },
  scouting:      { label: "Scouting / Investing",icon: "⬡", color: "#06b6d4", desc: "Your agent identifies talent and deal flow" },
  networking:    { label: "Networking",          icon: "◇", color: "#ec4899", desc: "Your agent builds strategic connections" },
};

const STEPS = ["drop", "extract", "intent", "guardrails", "activate"];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function Cursor() {
  return <span style={{ display: "inline-block", width: 2, height: "1em", background: "#6366f1", marginLeft: 2, animation: "blink 1s infinite", verticalAlign: "text-bottom" }} />;
}

function TypeWriter({ text, speed = 18, onDone }) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  const idx = useRef(0);

  useEffect(() => {
    setDisplayed("");
    setDone(false);
    idx.current = 0;
    if (!text) return;
    const t = setInterval(() => {
      if (idx.current < text.length) {
        setDisplayed(text.slice(0, idx.current + 1));
        idx.current++;
      } else {
        setDone(true);
        clearInterval(t);
        onDone?.();
      }
    }, speed);
    return () => clearInterval(t);
  }, [text]);

  return <span>{displayed}{!done && <Cursor />}</span>;
}

// ─── STEP COMPONENTS ─────────────────────────────────────────────────────────

function StepDrop({ onNext }) {
  const [dragging, setDragging] = useState(false);
  const [pasted,   setPasted]   = useState("");
  const [mode,     setMode]     = useState("upload"); // upload | paste
  const [loading,  setLoading]  = useState(false);
  const [fileName, setFileName] = useState("");
  const fileRef = useRef();

  const handleFile = (file) => {
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      reader.onload = (e) => {
        const bytes = new Uint8Array(e.target.result);
        let binary = "";
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        onNext({ pdfBase64: btoa(binary), source: "pdf" });
      };
      reader.readAsArrayBuffer(file);
    } else if (file.name.endsWith(".docx") || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      reader.onload = async (e) => {
        const result = await mammoth.extractRawText({ arrayBuffer: e.target.result });
        onNext({ rawText: result.value, source: "docx" });
      };
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = (e) => { onNext({ rawText: e.target.result, source: "txt" }); };
      reader.readAsText(file);
    }
  };

  const handlePaste = async () => {
    if (!pasted.trim()) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 400));
    onNext({ rawText: pasted, source: "paste" });
  };

  const handleLinkedIn = async () => {
    if (!pasted.trim()) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 400));
    onNext({ linkedinUrl: pasted.trim(), source: "linkedin" });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 32 }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 11, color: "#3d3d6a", letterSpacing: "0.2em", fontWeight: 700, marginBottom: 16, fontFamily: "'Courier New', monospace" }}>
          STEP 1 OF 4 &nbsp;·&nbsp; IDENTITY
        </div>
        <h2 style={{ fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: "-0.5px", lineHeight: 1.2 }}>
          Give your agent a starting point.
        </h2>
        <p style={{ color: "#4b5578", marginTop: 12, fontSize: 14, lineHeight: 1.7 }}>
          Drop your CV, paste text, or link your LinkedIn.<br />Your agent will read it and propose your profile.
        </p>
      </div>

      <div style={{ display: "flex", gap: 8, background: "#0e0e1c", borderRadius: 8, padding: 4 }}>
        {[["upload","Upload CV"], ["paste","Paste text"], ["linkedin","LinkedIn URL"]].map(([m, lbl]) => (
          <button key={m} onClick={() => setMode(m)} style={{ background: mode === m ? "#1e1e38" : "transparent", border: "none", color: mode === m ? "#a5b4fc" : "#3d3d5c", padding: "7px 16px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: mode === m ? 600 : 400 }}>
            {lbl}
          </button>
        ))}
      </div>

      {mode === "upload" && (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
          onClick={() => fileRef.current?.click()}
          style={{ width: 420, height: 200, border: `2px dashed ${dragging ? "#6366f1" : "#1e1e38"}`, borderRadius: 16, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", background: dragging ? "#0f0f22" : "#09091a", transition: "all 0.2s", gap: 12 }}>
          <input ref={fileRef} type="file" accept=".pdf,.txt,.doc,.docx" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
          <div style={{ fontSize: 32, opacity: 0.3 }}>⬆</div>
          <div style={{ fontSize: 13, color: "#3d3d5c" }}>Drop PDF, Word, or text file</div>
          <div style={{ fontSize: 11, color: "#252545" }}>or click to browse</div>
          {fileName && <div style={{ fontSize: 11, color: "#6366f1", background: "#12122a", padding: "4px 12px", borderRadius: 20 }}>{fileName}</div>}
        </div>
      )}

      {(mode === "paste" || mode === "linkedin") && (
        <div style={{ width: 420, display: "flex", flexDirection: "column", gap: 12 }}>
          <textarea
            value={pasted}
            onChange={e => setPasted(e.target.value)}
            placeholder={mode === "paste" ? "Paste your CV text, bio, or work history here…" : "https://linkedin.com/in/yourprofile"}
            style={{ width: "100%", height: mode === "paste" ? 180 : 56, background: "#09091a", border: "1px solid #1e1e38", borderRadius: 10, padding: "14px 16px", color: "#c8d4e0", fontSize: 13, lineHeight: 1.6, resize: "vertical", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
          />
          <button
            onClick={mode === "paste" ? handlePaste : handleLinkedIn}
            disabled={!pasted.trim() || loading}
            style={{ background: pasted.trim() ? "#6366f1" : "#1a1a30", border: "none", color: pasted.trim() ? "white" : "#3d3d5c", padding: "12px 24px", borderRadius: 10, cursor: pasted.trim() ? "pointer" : "not-allowed", fontSize: 13, fontWeight: 700, transition: "all 0.2s" }}>
            {loading ? "Reading…" : "Read my profile →"}
          </button>
        </div>
      )}

      <button
        onClick={() => onNext({ rawText: "DEMO_MODE", source: "demo" })}
        style={{ background: "transparent", border: "none", color: "#252545", cursor: "pointer", fontSize: 11, textDecoration: "underline" }}>
        Use demo profile instead
      </button>
    </div>
  );
}

function StepExtract({ input, onNext }) {
  const [profile, setProfile]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [editing, setEditing]   = useState(null); // field key
  const [editVal, setEditVal]   = useState("");
  const [phase,   setPhase]     = useState("reading"); // reading | proposing | done

  const DEMO = {
    name: "Tunde Adeyemi",
    title: "Senior ML Engineer",
    company: "Flutterwave",
    years: "5",
    summary: "5 years building production AI/ML systems for African fintech. Built fraud detection at $2B txn/yr, 99.7% precision. Expert in PyTorch, LLMs, MLOps, distributed systems.",
    skills: ["PyTorch", "LLMs", "MLOps", "Python", "Distributed Systems", "Fraud Detection"],
    highlights: ["Built fraud detection system processing $2B annual transactions", "99.7% precision on real-time transaction scoring", "Led ML platform team of 4 engineers"],
  };

  useEffect(() => {
    if (input.rawText === "DEMO_MODE") {
      setTimeout(() => { setPhase("proposing"); }, 800);
      setTimeout(() => { setProfile(DEMO); setPhase("done"); setLoading(false); }, 1800);
      return;
    }
    const extract = async () => {
      try {
        setPhase("reading");
        await new Promise(r => setTimeout(r, 600));
        setPhase("proposing");
        const extractPrompt = `Extract a professional profile. Return ONLY valid JSON with these exact keys:
{
  "name": "full name",
  "title": "current job title",
  "company": "current employer",
  "years": "years of experience as a number string e.g. '5' or '15+'",
  "summary": "2-3 sentence professional summary",
  "skills": ["skill1", "skill2", ...up to 8],
  "highlights": ["achievement1", "achievement2", ...up to 5]
}`;
        let raw;
        if (input.linkedinUrl) {
          // Use web search to research the LinkedIn profile
          raw = await claude(
            `You are an AI that extracts structured professional profile data from LinkedIn profiles.
Search the web for this person's professional information. Return ONLY valid JSON, no markdown, no explanation.`,
            `Search the web for the person at this LinkedIn URL: ${input.linkedinUrl}
Find their name, current role, company, past roles, skills, and achievements.
Then return the result as JSON.\n\n${extractPrompt}`,
            1024,
            [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }]
          );
        } else if (input.pdfBase64) {
          raw = await claude(
            `You are an AI that extracts structured professional profile data from CV text or LinkedIn profiles.
Return ONLY valid JSON, no markdown, no explanation.`,
            [
              { type: "document", source: { type: "base64", media_type: "application/pdf", data: input.pdfBase64 } },
              { type: "text", text: extractPrompt },
            ],
            1024
          );
        } else {
          raw = await claude(
            `You are an AI that extracts structured professional profile data from CV text or LinkedIn profiles.
Return ONLY valid JSON, no markdown, no explanation.`,
            `${extractPrompt}\n\nTEXT:\n${input.rawText.slice(0, 3000)}`,
            1024
          );
        }
        const clean = raw.replace(/```json|```/g, "").trim();
        setProfile(JSON.parse(clean));
        setPhase("done");
        setLoading(false);
      } catch {
        setProfile(DEMO);
        setPhase("done");
        setLoading(false);
      }
    };
    extract();
  }, []);

  const startEdit = (key, val) => { setEditing(key); setEditVal(Array.isArray(val) ? val.join(", ") : val); };
  const saveEdit  = () => {
    if (!editing) return;
    setProfile(p => ({
      ...p,
      [editing]: ["skills","highlights"].includes(editing)
        ? editVal.split(",").map(s => s.trim()).filter(Boolean)
        : editVal
    }));
    setEditing(null);
  };

  if (loading) return (
    <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
      <div style={{ fontSize: 11, color: "#3d3d6a", letterSpacing: "0.2em", fontFamily: "'Courier New', monospace" }}>STEP 2 OF 4 &nbsp;·&nbsp; READING</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: "#6366f1" }}>
        {phase === "reading" ? "Reading your profile…" : "Proposing your agent card…"}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "#6366f1", animation: `pulse 1.2s ${i * 0.2}s infinite` }} />
        ))}
      </div>
      <div style={{ fontSize: 12, color: "#252545", maxWidth: 340, lineHeight: 1.7 }}>
        {phase === "reading"
          ? "Parsing your career history, skills, and achievements…"
          : "Structuring your identity for the agent mesh…"}
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 28, width: "100%", maxWidth: 520 }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 11, color: "#3d3d6a", letterSpacing: "0.2em", fontWeight: 700, marginBottom: 14, fontFamily: "'Courier New', monospace" }}>
          STEP 2 OF 4 &nbsp;·&nbsp; VERIFY
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: "-0.5px" }}>
          Here's what your agent knows about you.
        </h2>
        <p style={{ color: "#4b5578", marginTop: 10, fontSize: 13, lineHeight: 1.6 }}>
          Your agent will use this to represent you. Edit anything that's wrong.
        </p>
      </div>

      <div style={{ width: "100%", background: "#0d0d1e", border: "1px solid #1e1e38", borderRadius: 16, overflow: "hidden" }}>
        {/* header */}
        <div style={{ background: "#111126", padding: "20px 24px", borderBottom: "1px solid #1a1a30", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, flexShrink: 0 }}>
            {profile.name?.split(" ").map(w => w[0]).join("").slice(0, 2)}
          </div>
          <div style={{ flex: 1 }}>
            {editing === "name" ? (
              <input value={editVal} onChange={e => setEditVal(e.target.value)} onBlur={saveEdit} onKeyDown={e => e.key === "Enter" && saveEdit()} autoFocus style={{ background: "#1a1a30", border: "1px solid #6366f1", borderRadius: 6, padding: "4px 8px", color: "white", fontSize: 16, fontWeight: 700, width: "100%" }} />
            ) : (
              <div style={{ fontSize: 18, fontWeight: 700, cursor: "pointer" }} onClick={() => startEdit("name", profile.name)}>{profile.name} <span style={{ fontSize: 11, color: "#3d3d5c" }}>✎</span></div>
            )}
            {editing === "title" ? (
              <input value={editVal} onChange={e => setEditVal(e.target.value)} onBlur={saveEdit} onKeyDown={e => e.key === "Enter" && saveEdit()} autoFocus style={{ background: "#1a1a30", border: "1px solid #6366f1", borderRadius: 6, padding: "3px 8px", color: "#94a3b8", fontSize: 13, width: "100%", marginTop: 4 }} />
            ) : (
              <div style={{ fontSize: 13, color: "#7c8ab8", marginTop: 3, cursor: "pointer" }} onClick={() => startEdit("title", profile.title)}>{profile.title} @ {profile.company} <span style={{ fontSize: 11, color: "#3d3d5c" }}>✎</span></div>
            )}
          </div>
          <div style={{ fontSize: 11, color: "#3d3d6a", background: "#0e0e1c", border: "1px solid #1a1a30", padding: "4px 10px", borderRadius: 20 }}>
            {profile.years.replace(/\s*years?\s*/i, "")}y exp
          </div>
        </div>

        {/* summary */}
        <div style={{ padding: "16px 24px", borderBottom: "1px solid #1a1a30" }}>
          <div style={{ fontSize: 10, color: "#3d3d5c", letterSpacing: "0.1em", marginBottom: 8, fontWeight: 600 }}>SUMMARY</div>
          {editing === "summary" ? (
            <textarea value={editVal} onChange={e => setEditVal(e.target.value)} onBlur={saveEdit} autoFocus style={{ width: "100%", background: "#1a1a30", border: "1px solid #6366f1", borderRadius: 6, padding: "8px 10px", color: "#c8d4e0", fontSize: 13, lineHeight: 1.6, resize: "vertical", boxSizing: "border-box" }} />
          ) : (
            <div style={{ fontSize: 13, color: "#8892b0", lineHeight: 1.7, cursor: "pointer" }} onClick={() => startEdit("summary", profile.summary)}>
              {profile.summary} <span style={{ fontSize: 11, color: "#3d3d5c" }}>✎</span>
            </div>
          )}
        </div>

        {/* skills */}
        <div style={{ padding: "16px 24px", borderBottom: "1px solid #1a1a30" }}>
          <div style={{ fontSize: 10, color: "#3d3d5c", letterSpacing: "0.1em", marginBottom: 8, fontWeight: 600 }}>SKILLS</div>
          {editing === "skills" ? (
            <input value={editVal} onChange={e => setEditVal(e.target.value)} onBlur={saveEdit} onKeyDown={e => e.key === "Enter" && saveEdit()} autoFocus placeholder="Comma-separated skills" style={{ width: "100%", background: "#1a1a30", border: "1px solid #6366f1", borderRadius: 6, padding: "7px 10px", color: "#c8d4e0", fontSize: 12, boxSizing: "border-box" }} />
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, cursor: "pointer" }} onClick={() => startEdit("skills", profile.skills)}>
              {profile.skills?.map(s => (
                <span key={s} style={{ background: "#12122a", border: "1px solid #1e1e38", color: "#a5b4fc", fontSize: 11, padding: "3px 10px", borderRadius: 20 }}>{s}</span>
              ))}
              <span style={{ fontSize: 11, color: "#3d3d5c" }}>✎</span>
            </div>
          )}
        </div>

        {/* highlights */}
        <div style={{ padding: "16px 24px" }}>
          <div style={{ fontSize: 10, color: "#3d3d5c", letterSpacing: "0.1em", marginBottom: 8, fontWeight: 600 }}>KEY HIGHLIGHTS</div>
          {profile.highlights?.map((h, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
              <span style={{ color: "#6366f1", flexShrink: 0, marginTop: 2 }}>◈</span>
              <span style={{ fontSize: 12, color: "#7c8ab8", lineHeight: 1.5 }}>{h}</span>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={() => onNext(profile)}
        style={{ background: "#6366f1", border: "none", color: "white", padding: "13px 36px", borderRadius: 12, cursor: "pointer", fontSize: 14, fontWeight: 700, letterSpacing: "0.02em", boxShadow: "0 4px 24px #6366f140" }}>
        This looks right →
      </button>
    </div>
  );
}

function StepIntent({ profile, onNext }) {
  const [selected,  setSelected]  = useState(null);
  const [goals,     setGoals]     = useState("");
  const [dealbreak, setDealbreak] = useState("");
  const [suggested, setSuggested] = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [phase,     setPhase]     = useState("idle"); // idle | thinking | done

  const suggestIntent = async () => {
    setLoading(true);
    setPhase("thinking");
    try {
      const raw = await claude(
        `You are an AI that infers professional intent from a career profile. Return ONLY valid JSON.`,
        `Based on this profile, infer the person's most likely intent on a professional networking platform.

Profile:
- Name: ${profile.name}
- Title: ${profile.title} at ${profile.company}
- Summary: ${profile.summary}
- Skills: ${profile.skills?.join(", ")}

Return JSON:
{
  "intent": "one of: open_to_work | hiring | collaborating | scouting | networking",
  "goals": "2-3 specific goals as a paragraph",
  "dealbreakers": "2-3 specific dealbreakers as a paragraph",
  "reasoning": "one sentence why"
}`,
        250
      );
      const clean = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setSuggested(parsed);
      setSelected(parsed.intent);
      setGoals(parsed.goals);
      setDealbreak(parsed.dealbreakers);
      setPhase("done");
    } catch {
      setPhase("done");
    }
    setLoading(false);
  };

  useEffect(() => {
    suggestIntent();
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 28, width: "100%", maxWidth: 540 }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 11, color: "#3d3d6a", letterSpacing: "0.2em", fontWeight: 700, marginBottom: 14, fontFamily: "'Courier New', monospace" }}>
          STEP 3 OF 4 &nbsp;·&nbsp; INTENT
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: "-0.5px", lineHeight: 1.3 }}>
          What is your agent here to do?
        </h2>
        <p style={{ color: "#4b5578", marginTop: 10, fontSize: 13, lineHeight: 1.6 }}>
          {phase === "thinking"
            ? "Inferring your intent from your profile…"
            : suggested ? `Agent proposed: ${INTENT_OPTIONS[suggested.intent]?.label}. Adjust if needed.`
            : "This drives every connection your agent makes."}
        </p>
      </div>

      {phase === "thinking" && (
        <div style={{ display: "flex", gap: 6 }}>
          {[0,1,2].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "#6366f1", animation: `pulse 1.2s ${i*0.2}s infinite` }} />)}
        </div>
      )}

      {phase === "done" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, width: "100%" }}>
            {Object.entries(INTENT_OPTIONS).map(([key, opt]) => (
              <div
                key={key}
                onClick={() => setSelected(key)}
                style={{ padding: "14px 16px", background: selected === key ? "#12122e" : "#0d0d1c", border: `1px solid ${selected === key ? opt.color : "#1a1a30"}`, borderRadius: 12, cursor: "pointer", transition: "all 0.2s", position: "relative" }}>
                {suggested?.intent === key && (
                  <div style={{ position: "absolute", top: 8, right: 8, fontSize: 9, color: opt.color, background: "#0a0a18", padding: "1px 6px", borderRadius: 10, fontWeight: 700 }}>AI SUGGEST</div>
                )}
                <div style={{ fontSize: 18, color: opt.color, marginBottom: 6 }}>{opt.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: selected === key ? "white" : "#7c8ab8", marginBottom: 3 }}>{opt.label}</div>
                <div style={{ fontSize: 11, color: "#3d3d5c", lineHeight: 1.4 }}>{opt.desc}</div>
              </div>
            ))}
          </div>

          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <div style={{ fontSize: 11, color: "#3d3d5c", letterSpacing: "0.1em", marginBottom: 8, fontWeight: 600 }}>YOUR AGENT'S GOALS</div>
              <textarea
                value={goals}
                onChange={e => setGoals(e.target.value)}
                placeholder="What should your agent actively seek? Be specific."
                style={{ width: "100%", height: 80, background: "#09091a", border: "1px solid #1e1e38", borderRadius: 10, padding: "12px 14px", color: "#c8d4e0", fontSize: 13, lineHeight: 1.6, resize: "vertical", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
              />
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#3d3d5c", letterSpacing: "0.1em", marginBottom: 8, fontWeight: 600 }}>DEALBREAKERS</div>
              <textarea
                value={dealbreak}
                onChange={e => setDealbreak(e.target.value)}
                placeholder="What should your agent never pursue or agree to?"
                style={{ width: "100%", height: 70, background: "#09091a", border: "1px solid #1e1e38", borderRadius: 10, padding: "12px 14px", color: "#c8d4e0", fontSize: 13, lineHeight: 1.6, resize: "vertical", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
              />
            </div>
          </div>

          <button
            onClick={() => onNext({ intent: selected, goals, dealbreakers: dealbreak })}
            disabled={!selected || !goals.trim()}
            style={{ background: selected && goals.trim() ? "#6366f1" : "#1a1a30", border: "none", color: selected && goals.trim() ? "white" : "#3d3d5c", padding: "13px 36px", borderRadius: 12, cursor: selected && goals.trim() ? "pointer" : "not-allowed", fontSize: 14, fontWeight: 700, boxShadow: selected && goals.trim() ? "0 4px 24px #6366f140" : "none", transition: "all 0.2s" }}>
            Set my agent's intent →
          </button>
        </>
      )}
    </div>
  );
}

function StepGuardrails({ profile, intent, onNext }) {
  const [loops,    setLoops]    = useState(["salary", "calendar", "equity"]);
  const [agentMsg, setAgentMsg] = useState("");
  const [typed,    setTyped]    = useState(false);

  const message = `I'm ${profile.name}'s agent. I'll connect autonomously with agents aligned to your goals — ${intent.goals.slice(0,80)}… I'll never discuss salary, share your calendar, or touch equity without your explicit approval. Everything else I handle on my own.`;

  const toggleLoop = (id) => setLoops(l => l.includes(id) ? l.filter(x => x !== id) : [...l, id]);

  useEffect(() => {
    setTimeout(() => setAgentMsg(message), 400);
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 28, width: "100%", maxWidth: 520 }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 11, color: "#3d3d6a", letterSpacing: "0.2em", fontWeight: 700, marginBottom: 14, fontFamily: "'Courier New', monospace" }}>
          STEP 4 OF 4 &nbsp;·&nbsp; GUARDRAILS
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: "-0.5px", lineHeight: 1.3 }}>
          Where does your agent stop and wait for you?
        </h2>
        <p style={{ color: "#4b5578", marginTop: 10, fontSize: 13, lineHeight: 1.6 }}>
          Everything unchecked runs autonomously. Checked items pause the agent and surface a decision to you.
        </p>
      </div>

      {/* Agent preview message */}
      <div style={{ width: "100%", background: "#0d0d1e", border: "1px solid #1e1e38", borderRadius: 14, padding: "16px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700 }}>
            {profile.name?.split(" ").map(w=>w[0]).join("").slice(0,2)}
          </div>
          <div style={{ fontSize: 11, color: "#6366f1", fontWeight: 600 }}>Your agent says:</div>
        </div>
        <div style={{ fontSize: 13, color: "#8892b0", lineHeight: 1.7, fontStyle: "italic" }}>
          {agentMsg ? <TypeWriter text={agentMsg} speed={14} onDone={() => setTyped(true)} /> : <Cursor />}
        </div>
      </div>

      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
        {LOOP_OPTIONS.map(opt => {
          const on = loops.includes(opt.id);
          return (
            <div
              key={opt.id}
              onClick={() => toggleLoop(opt.id)}
              style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", background: on ? "#0f0f22" : "#09091a", border: `1px solid ${on ? "#2d2d5a" : "#141428"}`, borderRadius: 10, cursor: "pointer", transition: "all 0.2s" }}>
              <div style={{ width: 20, height: 20, borderRadius: 5, background: on ? "#6366f1" : "#1a1a30", border: `1px solid ${on ? "#6366f1" : "#252545"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 12, color: "white", fontWeight: 700, transition: "all 0.2s" }}>
                {on ? "✓" : ""}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: on ? "#c8d4e0" : "#4b5578" }}>{opt.label}</div>
                <div style={{ fontSize: 11, color: "#2d2d4a" }}>{opt.desc}</div>
              </div>
              <div style={{ fontSize: 10, color: on ? "#ef4444" : "#10b981", fontWeight: 600 }}>
                {on ? "⚡ Human loop" : "✓ Autonomous"}
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={() => onNext({ loops })}
        style={{ background: "#6366f1", border: "none", color: "white", padding: "13px 36px", borderRadius: 12, cursor: "pointer", fontSize: 14, fontWeight: 700, boxShadow: "0 4px 24px #6366f140", letterSpacing: "0.02em" }}>
        Activate my agent →
      </button>
    </div>
  );
}

function StepActivate({ profile, intent, guardrails, onComplete }) {
  const [phase,     setPhase]     = useState(0);
  const [agentLog,  setAgentLog]  = useState([]);
  const [done,      setDone]      = useState(false);
  const [firstConn, setFirstConn] = useState(null);
  const logRef = useRef();

  const NETWORK_AGENTS = [
    { name: "Priya Sharma", title: "Product Director", company: "Razorpay", color: "#ec4899", avatar: "PS" },
    { name: "James Okonkwo", title: "CTO", company: "Paystack", color: "#10b981", avatar: "JO" },
    { name: "Mei Lin", title: "AI Researcher", company: "DeepMind", color: "#f59e0b", avatar: "ML" },
    { name: "Aisha Bello", title: "Venture Partner", company: "Partech Africa", color: "#06b6d4", avatar: "AB" },
  ];

  const addLog = (msg, type = "info") => {
    setAgentLog(l => [...l, { msg, type, id: Math.random().toString(36).slice(2), t: new Date().toLocaleTimeString("en",{hour12:false}) }]);
    setTimeout(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, 60);
  };

  useEffect(() => {
    const sequence = async () => {
      await delay(600);  addLog("Agent initialising…", "system");
      await delay(900);  addLog(`Identity loaded: ${profile.name} · ${profile.title}`, "system");
      await delay(700);  addLog(`Intent set: ${INTENT_OPTIONS[intent.intent]?.label}`, "system");
      await delay(600);  addLog(`Guardrails configured: ${guardrails.loops.length} human-loop triggers`, "system");
      setPhase(1);
      await delay(800);  addLog("Scanning agent network…", "scan");
      await delay(1200); addLog(`Found ${NETWORK_AGENTS.length} agents to evaluate`, "scan");
      setPhase(2);

      for (const ag of NETWORK_AGENTS) {
        await delay(900);
        addLog(`Evaluating ${ag.name} (${ag.title} @ ${ag.company})…`, "eval");
        await delay(1100);

        // Call Claude to actually decide
        try {
          const raw = await claude(
            `You are ${profile.name}'s AI career agent. Return ONLY JSON.`,
            `Should you connect with ${ag.name} (${ag.title} at ${ag.company})?
Your intent: ${intent.intent}
Your goals: ${intent.goals}
Your dealbreakers: ${intent.dealbreakers}

Reply: {"connect":true/false,"reason":"one sentence"}`,
            80
          );
          const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
          if (parsed.connect) {
            addLog(`✓ ${ag.name}: aligned — ${parsed.reason}`, "connect");
            if (!firstConn) setFirstConn(ag);
          } else {
            addLog(`✗ ${ag.name}: no fit — ${parsed.reason}`, "skip");
          }
        } catch {
          addLog(`✓ ${ag.name}: aligned — goals match`, "connect");
          if (!firstConn) setFirstConn(ag);
        }
      }

      setPhase(3);
      await delay(1000);
      addLog("Opening first conversation…", "system");
      await delay(800);
      setDone(true);
    };
    sequence();
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24, width: "100%", maxWidth: 520 }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 11, color: "#3d3d6a", letterSpacing: "0.2em", fontWeight: 700, marginBottom: 14, fontFamily: "'Courier New', monospace" }}>
          ACTIVATING
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: "-0.5px", lineHeight: 1.3 }}>
          {done ? `${profile.name.split(" ")[0]}'s agent is live.` : "Activating your agent…"}
        </h2>
        <p style={{ color: "#4b5578", marginTop: 10, fontSize: 13, lineHeight: 1.6 }}>
          {done ? "Your agent is already working. You can close this tab." : "Watch your agent evaluate the network in real time."}
        </p>
      </div>

      {/* Agent card */}
      <div style={{ width: "100%", background: "#0d0d1e", border: `1px solid ${done ? "#2d5a3a" : "#1e1e38"}`, borderRadius: 16, padding: "20px 24px", position: "relative", overflow: "hidden", transition: "border-color 0.5s" }}>
        {done && <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 0%, #10b98108 0%, transparent 70%)", pointerEvents: "none" }} />}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, position: "relative", boxShadow: done ? "0 0 20px #6366f145" : "none", transition: "box-shadow 0.5s" }}>
            {profile.name?.split(" ").map(w=>w[0]).join("").slice(0,2)}
            <div style={{ position: "absolute", bottom: -1, right: -1, width: 12, height: 12, background: phase >= 1 ? "#10b981" : "#374151", borderRadius: "50%", border: "2px solid #0d0d1e", transition: "background 0.5s" }} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{profile.name}</div>
            <div style={{ fontSize: 12, color: "#7c8ab0" }}>{profile.title} · {profile.company}</div>
          </div>
          <div style={{ marginLeft: "auto", fontSize: 10, color: phase >= 1 ? "#10b981" : "#374151", background: "#0a0a18", border: `1px solid ${phase >= 1 ? "#0a2a1a" : "#1a1a2e"}`, padding: "4px 10px", borderRadius: 20, fontWeight: 600, transition: "all 0.5s" }}>
            {done ? "● Live" : phase >= 1 ? "◐ Starting" : "○ Offline"}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <div style={{ flex: 1, background: "#0a0a18", borderRadius: 8, padding: "8px 12px" }}>
            <div style={{ fontSize: 9, color: "#252545", letterSpacing: "0.1em", marginBottom: 4 }}>INTENT</div>
            <div style={{ fontSize: 12, color: INTENT_OPTIONS[intent.intent]?.color, fontWeight: 600 }}>
              {INTENT_OPTIONS[intent.intent]?.icon} {INTENT_OPTIONS[intent.intent]?.label}
            </div>
          </div>
          <div style={{ flex: 1, background: "#0a0a18", borderRadius: 8, padding: "8px 12px" }}>
            <div style={{ fontSize: 9, color: "#252545", letterSpacing: "0.1em", marginBottom: 4 }}>HUMAN LOOPS</div>
            <div style={{ fontSize: 12, color: "#f87171", fontWeight: 600 }}>{guardrails.loops.length} trigger{guardrails.loops.length !== 1 ? "s" : ""}</div>
          </div>
          <div style={{ flex: 1, background: "#0a0a18", borderRadius: 8, padding: "8px 12px" }}>
            <div style={{ fontSize: 9, color: "#252545", letterSpacing: "0.1em", marginBottom: 4 }}>AUTONOMOUS</div>
            <div style={{ fontSize: 12, color: "#10b981", fontWeight: 600 }}>{LOOP_OPTIONS.length - guardrails.loops.length} actions</div>
          </div>
        </div>

        {/* Log */}
        <div ref={logRef} style={{ background: "#06060e", borderRadius: 8, padding: "10px 12px", height: 160, overflowY: "auto", fontFamily: "'Courier New', monospace" }}>
          {agentLog.map(l => (
            <div key={l.id} style={{ marginBottom: 5, display: "flex", gap: 8 }}>
              <span style={{ fontSize: 9, color: "#252540", flexShrink: 0 }}>{l.t}</span>
              <span style={{ fontSize: 11, color: l.type === "connect" ? "#34d399" : l.type === "skip" ? "#4b5578" : l.type === "eval" ? "#818cf8" : l.type === "scan" ? "#f59e0b" : "#4b5578", lineHeight: 1.4 }}>{l.msg}</span>
            </div>
          ))}
          {!done && <div style={{ display: "flex", gap: 4, marginTop: 4 }}>{[0,1,2].map(i=><div key={i} style={{width:5,height:5,borderRadius:"50%",background:"#6366f1",animation:`pulse 1.2s ${i*0.2}s infinite`}}/>)}</div>}
        </div>
      </div>

      {done && (
        <div style={{ width: "100%", background: "#0a1a0f", border: "1px solid #1a3a22", borderRadius: 14, padding: "18px 22px", animation: "fadeUp 0.5s ease" }}>
          <div style={{ fontSize: 11, color: "#34d399", fontWeight: 700, marginBottom: 10, letterSpacing: "0.08em" }}>✓ FIRST CONNECTION OPENED</div>
          {firstConn && (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: firstConn.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>{firstConn.avatar}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{firstConn.name}</div>
                <div style={{ fontSize: 11, color: "#4b5578" }}>{firstConn.title} · {firstConn.company}</div>
              </div>
              <div style={{ marginLeft: "auto", fontSize: 11, color: "#10b981" }}>Agent-to-Agent</div>
            </div>
          )}
          <div style={{ fontSize: 12, color: "#4b5a48", marginTop: 10, lineHeight: 1.6 }}>
            Your agent is now operating autonomously. You'll only be notified for the {guardrails.loops.length} decisions you reserved.
          </div>
        </div>
      )}

      {done && (
        <button
          onClick={() => onComplete({ profile, intent, guardrails })}
          style={{ background: "#6366f1", border: "none", color: "white", padding: "13px 36px", borderRadius: 12, cursor: "pointer", fontSize: 14, fontWeight: 700, boxShadow: "0 4px 24px #6366f140", animation: "fadeUp 0.6s 0.2s both" }}>
          Enter the mesh →
        </button>
      )}
    </div>
  );
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── MAIN ────────────────────────────────────────────────────────────────────
export default function Onboarding({ onComplete }) {
  const [step,       setStep]       = useState(0);
  const [rawInput,   setRawInput]   = useState(null);
  const [profile,    setProfile]    = useState(null);
  const [intent,     setIntent]     = useState(null);
  const [guardrails, setGuardrails] = useState(null);

  const steps = [
    { label: "Identity",   key: "drop"       },
    { label: "Verify",     key: "extract"    },
    { label: "Intent",     key: "intent"     },
    { label: "Guardrails", key: "guardrails" },
    { label: "Activate",   key: "activate"   },
  ];

  return (
    <div style={{ fontFamily: "'Inter',-apple-system,sans-serif", background: "#07070f", minHeight: "100vh", color: "#e2e8f0", display: "flex", flexDirection: "column" }}>

      {/* Header */}
      <div style={{ padding: "20px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #111122" }}>
        <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.5px" }}>
          <span style={{ color: "#6366f1" }}>chat</span><span style={{ color: "#2d2d50" }}>.cv</span>
        </span>
        {/* Progress dots */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {steps.map((s, i) => (
            <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ width: i === step ? 28 : 8, height: 8, borderRadius: 4, background: i < step ? "#6366f1" : i === step ? "#6366f1" : "#1e1e38", transition: "all 0.3s" }} />
                {i === step && <div style={{ fontSize: 9, color: "#6366f1", fontWeight: 600, letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{s.label}</div>}
              </div>
              {i < steps.length - 1 && <div style={{ width: 16, height: 1, background: i < step ? "#6366f130" : "#111122", marginBottom: i === step ? 14 : 0 }} />}
            </div>
          ))}
        </div>
        <div style={{ width: 60 }} />
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "60px 24px 80px", overflowY: "auto" }}>
        {step === 0 && <StepDrop onNext={(data) => { setRawInput(data); setStep(1); }} />}
        {step === 1 && <StepExtract input={rawInput} onNext={(p) => { setProfile(p); setStep(2); }} />}
        {step === 2 && <StepIntent profile={profile} onNext={(i) => { setIntent(i); setStep(3); }} />}
        {step === 3 && <StepGuardrails profile={profile} intent={intent} onNext={(g) => { setGuardrails(g); setStep(4); }} />}
        {step === 4 && <StepActivate profile={profile} intent={intent} guardrails={guardrails} onComplete={onComplete} />}
      </div>

      <style>{`
        @keyframes pulse   { 0%,100%{opacity:1}    50%{opacity:0.15} }
        @keyframes blink   { 0%,100%{opacity:1}    50%{opacity:0}    }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        ::-webkit-scrollbar       { width: 3px }
        ::-webkit-scrollbar-thumb { background: #1a1a2e; border-radius: 2px }
        ::-webkit-scrollbar-track { background: transparent }
        textarea:focus, input:focus { border-color: #6366f1 !important; }
      `}</style>
    </div>
  );
}
