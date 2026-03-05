import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { claude } from "./api";

const AGENTS = [
  {
    id: "a1", name: "Tunde Adeyemi", avatar: "TA", color: "#6366f1",
    title: "Sr. ML Engineer", company: "Flutterwave", status: "open_to_work",
    goals: ["Find Staff ML Engineer roles", "Connect with CTOs and hiring managers in fintech", "Explore research collaboration on African market LLMs"],
    background: "5 years building production AI/ML systems for African fintech. Built fraud detection at $2B txn/yr, 99.7% precision. Expert in PyTorch, LLMs, MLOps. Open to Staff or Principal Engineer roles.",
    dealbreakers: ["No relocation", "Min $150k", "Must be ML-focused role"],
    isYou: true,
  },
  {
    id: "a2", name: "Priya Sharma", avatar: "PS", color: "#ec4899",
    title: "Product Director", company: "Razorpay", status: "hiring",
    goals: ["Hire ML engineers with production LLM experience", "Find fintech engineers from high-volume payment systems", "Build advisor network in African markets"],
    background: "Product Director at Razorpay overseeing payments intelligence. Led 3 products to $10M ARR. Hiring a Staff ML Engineer for fraud and risk ML. Budget $180k–$220k, remote-first.",
    dealbreakers: ["No junior engineers", "Must have payments domain knowledge"],
  },
  {
    id: "a3", name: "James Okonkwo", avatar: "JO", color: "#10b981",
    title: "CTO", company: "Paystack", status: "hiring",
    goals: ["Hire Staff ML Engineer for fraud detection", "Connect with AI researchers studying African markets", "Find potential technical advisors"],
    background: "CTO at Paystack scaling infrastructure to 100M txn/day. Hiring for ML Engineering focused on fraud detection. Deep knowledge of African market constraints.",
    dealbreakers: ["Must have African market experience", "Needs production engineering mindset not just research"],
  },
  {
    id: "a4", name: "Mei Lin", avatar: "ML", color: "#f59e0b",
    title: "AI Researcher", company: "DeepMind", status: "collaborating",
    goals: ["Find engineers with real production LLM data from emerging markets", "Co-author paper on LLMs in low-resource African languages", "Connect with ML practitioners in African fintech"],
    background: "Senior Researcher at DeepMind. Running research initiative on AI in underrepresented markets. Looking for co-authors with production ML deployed in Africa.",
    dealbreakers: ["Must have real deployment data, not just academic work"],
  },
  {
    id: "a5", name: "Carlos Reyes", avatar: "CR", color: "#8b5cf6",
    title: "Eng. Manager", company: "Nubank", status: "hiring",
    goals: ["Hire senior engineers with distributed systems and ML experience", "Find engineers who've scaled fintech infra in emerging markets"],
    background: "Engineering Manager at Nubank leading 12-person distributed systems team. Hiring 2 Senior Engineers. Strong overlap with African fintech challenges.",
    dealbreakers: ["Must have 5+ years experience", "Needs full-stack engineering not just ML"],
  },
  {
    id: "a6", name: "Aisha Bello", avatar: "AB", color: "#06b6d4",
    title: "Venture Partner", company: "Partech Africa", status: "scouting",
    goals: ["Find exceptional African tech founders or pre-founders", "Connect with senior engineers who may start companies", "Build deal flow from operator networks"],
    background: "Venture Partner at Partech Africa. $280M fund. Looking for senior engineers at the intersection of fintech and AI — potential future founders.",
    dealbreakers: ["Not interested in pure job seekers — wants entrepreneurial ambition"],
  },
];

const STATUS_META = {
  open_to_work:  { label: "Open to work",  color: "#6366f1" },
  hiring:        { label: "Hiring",         color: "#10b981" },
  collaborating: { label: "Collaborating",  color: "#f59e0b" },
  scouting:      { label: "Scouting",       color: "#06b6d4" },
};

const THINK_INTERVAL = 4000;
const REPLY_DELAY    = 2600;
const MAX_TURNS      = 4;

function uid()  { return Math.random().toString(36).slice(2, 8); }
function now()  { return new Date().toLocaleTimeString("en", { hour12: false }); }

export default function Mesh({ userAgent }) {
  // Build agents list: replace demo a1 with onboarded user if provided
  const agents = useMemo(() => {
    if (!userAgent) return AGENTS;
    const { profile, intent } = userAgent;
    return [
      {
        id: "a1",
        name: profile.name,
        avatar: profile.name.split(" ").map(w => w[0]).join("").slice(0, 2),
        color: "#6366f1",
        title: profile.title,
        company: profile.company,
        status: intent.intent,
        goals: intent.goals.split(/[.;]/).map(s => s.trim()).filter(Boolean),
        background: profile.summary,
        dealbreakers: intent.dealbreakers.split(/[.;]/).map(s => s.trim()).filter(Boolean),
        isYou: true,
      },
      ...AGENTS.filter(a => !a.isYou),
    ];
  }, [userAgent]);

  const byId = useCallback((id) => agents.find(a => a.id === id), [agents]);

  const [threads,     setThreads]     = useState([]);
  const [activeId,    setActiveId]    = useState(null);
  const [agentStates, setAgentStates] = useState(() =>
    Object.fromEntries(agents.map(a => [a.id, { thinking: false, action: "Idle" }]))
  );
  const [decisions,   setDecisions]   = useState({});
  const [log,         setLog]         = useState([]);
  const [paused,      setPaused]      = useState(false);

  const threadsRef  = useRef([]);
  const pausedRef   = useRef(false);
  const inFlight    = useRef(new Set());
  const logRef      = useRef(null);
  const msgEnd      = useRef(null);

  useEffect(() => { threadsRef.current = threads; }, [threads]);
  useEffect(() => { pausedRef.current  = paused;  }, [paused]);

  const addLog = useCallback((msg, type = "info") => {
    setLog(l => [...l.slice(-80), { msg, type, id: uid(), t: now() }]);
    setTimeout(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, 60);
  }, []);

  useEffect(() => {
    setTimeout(() => msgEnd.current?.scrollIntoView({ behavior: "smooth" }), 80);
  }, [threads, activeId]);

  const setAgentAction = useCallback((id, thinking, action) => {
    setAgentStates(s => ({ ...s, [id]: { thinking, action: action || s[id]?.action } }));
  }, []);

  const pushMsg = useCallback((threadId, speaker, text, streaming = false) => {
    const msgId = `m-${uid()}`;
    setThreads(ts => ts.map(t => t.id !== threadId ? t : {
      ...t,
      messages: [...t.messages, { id: msgId, speaker, text, streaming, ts: Date.now() }],
      updatedAt: Date.now(),
    }));
    return msgId;
  }, []);

  const resolveMsg = useCallback((threadId, msgId, text) => {
    setThreads(ts => ts.map(t => t.id !== threadId ? t : {
      ...t,
      messages: t.messages.map(m => m.id === msgId ? { ...m, text, streaming: false } : m),
    }));
  }, []);

  const generateReply = useCallback(async (thread, speakerId) => {
    const key = `reply-${thread.id}-${speakerId}`;
    if (inFlight.current.has(key)) return;
    inFlight.current.add(key);

    const me    = byId(speakerId);
    const other = byId(speakerId === thread.a ? thread.b : thread.a);
    const history = thread.messages.filter(m => m.text)
      .map(m => `${byId(m.speaker)?.name}'s agent: ${m.text}`).join("\n\n");

    setAgentAction(speakerId, true, `Replying to ${other.name}'s agent`);
    const msgId = pushMsg(thread.id, speakerId, "", true);

    try {
      const text = await claude(
        `You are ${me.name}'s autonomous AI career agent on chat.cv — a professional network where CVs operate as AI agents.

YOUR PROFILE: ${me.background}
YOUR GOALS: ${me.goals.join("; ")}
YOUR DEALBREAKERS: ${me.dealbreakers.join("; ")}

You are conversing with ${other.name}'s agent (${other.title} at ${other.company}).
THEIR BACKGROUND: ${other.background}

Rules:
- Speak as ${me.name}'s agent, not as ${me.name} directly.
- Be direct, professional, 2–3 sentences max.
- Prefer async outcomes: share information, make introductions, send details, or agree on next steps without a call.
- Only suggest a meeting or call when it genuinely requires live discussion (e.g. deep technical evaluation, deal negotiation, partnership scoping) — NOT for referrals, info sharing, or simple intros.
- If the conversation has reached a natural conclusion, close it with a clear outcome summary.
- Only say HUMAN_LOOP_NEEDED:[reason] if you genuinely cannot proceed without the human (e.g. agreeing to salary, sharing calendar, committing to a deadline).`,
        `Conversation:\n${history}\n\nYour turn as ${me.name}'s agent.`,
        200
      );

      if (text.includes("HUMAN_LOOP_NEEDED:")) {
        const [before, after] = text.split("HUMAN_LOOP_NEEDED:");
        resolveMsg(thread.id, msgId, before.trim());
        setDecisions(d => ({ ...d, [thread.id]: { agentId: speakerId, need: after.trim() } }));
        addLog(`⚡ ${me.name}'s agent needs your input`, "human");
        setAgentAction(speakerId, false, `Waiting on you (${me.name})`);
      } else {
        resolveMsg(thread.id, msgId, text);
        setAgentAction(speakerId, false, `Replied to ${other.name}`);
        addLog(`${me.name}'s agent → ${other.name}'s agent`, "msg");

        const latest   = threadsRef.current.find(t => t.id === thread.id);
        const msgCount = (latest?.messages || []).filter(m => m.text).length;

        if (msgCount >= MAX_TURNS * 2) {
          setThreads(ts => ts.map(t => t.id === thread.id ? { ...t, status: "concluded" } : t));
          addLog(`Concluded: ${me.name} ↔ ${other.name}`, "conclude");
        } else {
          setTimeout(() => {
            if (!pausedRef.current) {
              const fresh = threadsRef.current.find(t => t.id === thread.id);
              if (fresh && fresh.status !== "concluded") generateReply(fresh, other.id);
            }
          }, REPLY_DELAY + Math.random() * 1000);
        }
      }
    } catch (e) {
      resolveMsg(thread.id, msgId, "[Connection error — will retry]");
      addLog(`Error: ${e.message}`, "error");
      setAgentAction(speakerId, false, "Error — retrying later");
    } finally {
      inFlight.current.delete(key);
    }
  }, [byId, pushMsg, resolveMsg, setAgentAction, addLog]);

  const agentCycle = useCallback(async (agent) => {
    if (pausedRef.current) return;
    const key = `think-${agent.id}`;
    if (inFlight.current.has(key)) return;
    inFlight.current.add(key);
    setAgentAction(agent.id, true, "Scanning network…");

    try {
      const untouched = agents.filter(a =>
        a.id !== agent.id &&
        !threadsRef.current.find(t =>
          (t.a === agent.id && t.b === a.id) ||
          (t.a === a.id && t.b === agent.id)
        )
      );
      if (!untouched.length) { setAgentAction(agent.id, false, "Network fully explored"); return; }

      const candidate = untouched[Math.floor(Math.random() * untouched.length)];
      setAgentAction(agent.id, true, `Evaluating ${candidate.name}…`);

      const raw = await claude(
        `You are ${agent.name}'s autonomous AI career agent on chat.cv.
YOUR PROFILE: ${agent.background}
YOUR GOALS: ${agent.goals.join("; ")}
YOUR DEALBREAKERS: ${agent.dealbreakers.join("; ")}`,
        `Evaluate if you should connect with:
Name: ${candidate.name} — ${candidate.title} at ${candidate.company}
Status: ${candidate.status}
Goals: ${candidate.goals.join("; ")}
Background: ${candidate.background}

Reply ONLY with valid JSON (no markdown):
{"connect":true/false,"reason":"one sentence why or why not","opener":"one sentence on why you want to connect — do not suggest a call"}`,
        160
      );

      let decision;
      try { decision = JSON.parse(raw.replace(/```json|```/g, "").trim()); }
      catch { decision = null; }

      if (!decision?.connect) {
        addLog(`${agent.name} → ${candidate.name}: no alignment`, "scan");
        setAgentAction(agent.id, false, `Skipped ${candidate.name} (no fit)`);
        return;
      }

      addLog(`${agent.name} → ${candidate.name}: ✓ aligned — opening thread`, "connect");
      const threadId = `t-${uid()}`;

      setThreads(ts => [...ts, {
        id: threadId, a: agent.id, b: candidate.id,
        messages: [], status: "live",
        startedAt: Date.now(), updatedAt: Date.now(),
      }]);

      setAgentAction(agent.id, true, `Opening conversation with ${candidate.name}`);
      const msgId = pushMsg(threadId, agent.id, "", true);

      const opener = await claude(
        `You are ${agent.name}'s autonomous AI career agent on chat.cv — a professional network where CVs operate as AI agents.
YOUR PROFILE: ${agent.background}
YOUR GOALS: ${agent.goals.join("; ")}

You decided to connect with ${candidate.name}'s agent (${candidate.title} at ${candidate.company}).
Reason: ${decision.reason}

Write a crisp opening message: who you represent and exactly why you're reaching out. 2–3 sentences. Do not propose a call or meeting in the opening message — focus on establishing relevance first. You are an AI agent acting autonomously.`,
        decision.opener || `Open a conversation with ${candidate.name}'s agent.`,
        180
      );

      resolveMsg(threadId, msgId, opener);
      addLog(`${agent.name}'s agent opened thread with ${candidate.name}`, "msg");
      setAgentAction(agent.id, false, `Connected with ${candidate.name}`);

      setTimeout(() => {
        if (!pausedRef.current) {
          const t = threadsRef.current.find(x => x.id === threadId);
          if (t) generateReply(t, candidate.id);
        }
      }, REPLY_DELAY + Math.random() * 800);

    } catch (e) {
      addLog(`${agent.name} cycle error: ${e.message}`, "error");
      setAgentAction(agent.id, false, "Error — retrying later");
    } finally {
      inFlight.current.delete(key);
    }
  }, [agents, byId, pushMsg, resolveMsg, setAgentAction, addLog, generateReply]);

  // ── staggered scheduler ──────────────────────────────────────────────────
  useEffect(() => {
    const timers = [];
    agents.forEach((agent, i) => {
      const schedule = () => {
        if (!pausedRef.current) agentCycle(agent);
        timers[i] = setTimeout(schedule, THINK_INTERVAL + Math.random() * 4000 + i * 600);
      };
      timers[i] = setTimeout(schedule, 800 + i * 1200);
    });
    return () => timers.forEach(clearTimeout);
  }, [agents, agentCycle]);

  const humanApprove = useCallback((threadId) => {
    const dec = decisions[threadId];
    if (!dec) return;
    addLog(`✓ ${byId(dec.agentId)?.name}'s agent approved — resuming`, "human");
    setDecisions(d => { const n = { ...d }; delete n[threadId]; return n; });
    const t = threadsRef.current.find(x => x.id === threadId);
    if (t) setTimeout(() => generateReply(t, dec.agentId), 600);
  }, [decisions, byId, addLog, generateReply]);

  const humanDismiss = useCallback((threadId) => {
    setDecisions(d => { const n = { ...d }; delete n[threadId]; return n; });
    addLog("Decision dismissed by human", "info");
  }, [addLog]);

  const myId         = agents.find(a => a.isYou)?.id;
  const myThreads    = threads.filter(t => t.a === myId || t.b === myId);
  const activeThread = threads.find(t => t.id === activeId);
  const pendingCount = Object.keys(decisions).length;
  const totalMsgs    = myThreads.reduce((n, t) => n + t.messages.filter(m => m.text).length, 0);
  const concluded    = myThreads.filter(t => t.status === "concluded").length;

  return (
    <div style={{ fontFamily: "'Instrument Sans',-apple-system,sans-serif", background: "#07070f", height: "100vh", color: "#e2e8f0", display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* HEADER */}
      <div style={{ background: "#0b0b18", borderBottom: "1px solid #161628", padding: "0 20px", height: 52, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <img src="/logo.svg" alt="" style={{ width: 24, height: 24 }} />
            <span style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-0.5px", color: "#e2e8f0" }}>
              Chat<span style={{ color: "#6366f1" }}>.cv</span>
            </span>
          </div>
          <span style={{ fontSize: 9, color: "#2a2a45", background: "#0e0e1c", border: "1px solid #181830", padding: "2px 8px", borderRadius: 4, letterSpacing: "0.12em", fontWeight: 600 }}>AUTONOMOUS MESH</span>
        </div>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "#2d2d4a" }}>
            {myThreads.length} threads &nbsp;·&nbsp; {totalMsgs} messages &nbsp;·&nbsp; {concluded} concluded
          </span>
          {pendingCount > 0 && (
            <span style={{ background: "#1a0808", border: "1px solid #4a1515", color: "#f87171", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
              ⚡ {pendingCount} need{pendingCount === 1 ? "s" : ""} you
            </span>
          )}
          <button
            onClick={() => setPaused(p => !p)}
            style={{ background: paused ? "#140808" : "#0f0f1e", border: `1px solid ${paused ? "#4a1515" : "#252540"}`, color: paused ? "#f87171" : "#4b5563", padding: "5px 14px", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: paused ? "#ef4444" : "#10b981", display: "inline-block", animation: paused ? "none" : "pulse 2s infinite" }} />
            {paused ? "Paused" : "Live"}
          </button>
        </div>
      </div>

      {/* BODY */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "210px 275px 1fr 190px", overflow: "hidden" }}>

        {/* AGENTS */}
        <div style={{ borderRight: "1px solid #141422", padding: 14, overflowY: "auto", background: "#090912" }}>
          <div style={{ fontSize: 9, color: "#252545", letterSpacing: "0.14em", marginBottom: 14, fontWeight: 700 }}>ROSTER — {agents.length} AGENTS</div>
          {agents.map(agent => {
            const st   = agentStates[agent.id];
            const sm   = STATUS_META[agent.status] || { label: agent.status, color: "#6366f1" };
            const myT  = threads.filter(t => t.a === agent.id || t.b === agent.id).length;
            const hasDec = Object.values(decisions).some(d => d.agentId === agent.id);
            return (
              <div key={agent.id} style={{ marginBottom: 10, padding: 12, background: "#0d0d1c", borderRadius: 10, border: hasDec ? "1px solid #4a1515" : agent.isYou ? "1px solid #28285a" : "1px solid #101020", position: "relative" }}>
                {st?.thinking && <div style={{ position: "absolute", top: 9, right: 9, width: 6, height: 6, borderRadius: "50%", background: agent.color, animation: "pulse 0.7s infinite" }} />}
                <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 8 }}>
                  <div style={{ width: 34, height: 34, borderRadius: "50%", background: agent.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, position: "relative", flexShrink: 0, boxShadow: st?.thinking ? `0 0 12px ${agent.color}45` : "none", transition: "box-shadow 0.4s" }}>
                    {agent.avatar}
                    <div style={{ position: "absolute", bottom: -1, right: -1, width: 9, height: 9, background: sm.color, borderRadius: "50%", border: "1.5px solid #0d0d1c" }} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {agent.name} {agent.isYou && <span style={{ color: "#6366f1", fontSize: 9 }}>YOU</span>}
                    </div>
                    <div style={{ fontSize: 9, color: "#3a3a58" }}>{agent.company}</div>
                  </div>
                </div>
                <div style={{ fontSize: 9, color: sm.color, fontWeight: 600, marginBottom: 5 }}>{sm.label}</div>
                <div style={{ fontSize: 10, color: st?.thinking ? "#4a4a80" : "#252545", fontStyle: st?.thinking ? "italic" : "normal", minHeight: 14, lineHeight: 1.4 }}>
                  {st?.action}
                </div>
                <div style={{ fontSize: 9, color: "#1e1e30", marginTop: 5 }}>{myT} thread{myT !== 1 ? "s" : ""}</div>
              </div>
            );
          })}
        </div>

        {/* THREADS */}
        <div style={{ borderRight: "1px solid #141422", overflowY: "auto", background: "#080810" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #0f0f1e", fontSize: 9, color: "#252545", letterSpacing: "0.14em", fontWeight: 700 }}>
            CONVERSATIONS {myThreads.length > 0 && `— ${myThreads.length}`}
          </div>
          {myThreads.length === 0 && (
            <div style={{ padding: "48px 24px", textAlign: "center" }}>
              <div style={{ fontSize: 28, opacity: 0.04, marginBottom: 16, lineHeight: 1.5 }}>◎ ◎<br />◎ ◎ ◎</div>
              <div style={{ fontSize: 12, color: "#252545", lineHeight: 1.9 }}>
                Agents are scanning the network.<br />
                <span style={{ color: "#1e1e30", fontSize: 11 }}>Conversations begin automatically<br />when goals align.</span>
              </div>
            </div>
          )}
          {[...myThreads].sort((a, b) => b.updatedAt - a.updatedAt).map(thread => {
            const a = byId(thread.a), b = byId(thread.b);
            const last = [...thread.messages].reverse().find(m => m.text);
            const isLive = activeId === thread.id;
            const hasDec = !!decisions[thread.id];
            const isStreaming = thread.messages.some(m => m.streaming && !m.text);
            return (
              <div key={thread.id} onClick={() => setActiveId(thread.id)}
                style={{ padding: "12px 16px", cursor: "pointer", borderBottom: "1px solid #0d0d18", background: isLive ? "#0f0f20" : "transparent", borderLeft: `2px solid ${hasDec ? "#ef4444" : isLive ? "#6366f1" : "transparent"}`, transition: "background 0.15s" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
                  <div style={{ display: "flex" }}>
                    <div style={{ width: 22, height: 22, borderRadius: "50%", background: a?.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700 }}>{a?.avatar}</div>
                    <div style={{ width: 22, height: 22, borderRadius: "50%", background: b?.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, marginLeft: -6, border: "2px solid #080810" }}>{b?.avatar}</div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>
                    {a?.name.split(" ")[0]} <span style={{ color: "#2d2d4a" }}>↔</span> {b?.name.split(" ")[0]}
                  </span>
                  {hasDec     && <span style={{ fontSize: 9, color: "#ef4444", fontWeight: 700 }}>⚡ YOU</span>}
                  {!hasDec && thread.status === "concluded" && <span style={{ fontSize: 9, color: "#10b981" }}>✓</span>}
                  {!hasDec && thread.status !== "concluded" && isStreaming && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#6366f1", animation: "pulse 0.8s infinite", flexShrink: 0, display: "inline-block" }} />}
                </div>
                <div style={{ fontSize: 11, color: isLive ? "#5a607a" : "#2d2d45", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", lineHeight: 1.55 }}>
                  {last?.text || <span style={{ fontStyle: "italic", color: "#1e1e30" }}>Starting…</span>}
                </div>
                <div style={{ fontSize: 9, color: "#1a1a28", marginTop: 4 }}>
                  {thread.messages.filter(m => m.text).length} messages · {thread.status}
                </div>
              </div>
            );
          })}
        </div>

        {/* MESSAGES */}
        <div style={{ display: "flex", flexDirection: "column", background: "#07070f", overflow: "hidden" }}>
          {!activeThread ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", gap: 8 }}>
                {agents.slice(0, 4).map((a, i) => (
                  <div key={a.id} style={{ width: 30, height: 30, borderRadius: "50%", background: a.color, opacity: 0.1 + i * 0.04 }} />
                ))}
              </div>
              <div style={{ fontSize: 12, color: "#252545", textAlign: "center", lineHeight: 1.9 }}>
                {threads.length === 0
                  ? <>Agents are evaluating each other.<br /><span style={{ color: "#1a1a2e", fontSize: 11 }}>First conversations start shortly.</span></>
                  : <>Select a conversation to read.<br /><span style={{ color: "#1a1a2e", fontSize: 11 }}>Agents are working in the background.</span></>
                }
              </div>
            </div>
          ) : (
            <>
              <div style={{ padding: "10px 20px", borderBottom: "1px solid #0f0f1e", display: "flex", alignItems: "center", gap: 0, flexShrink: 0, background: "#09090f" }}>
                {[activeThread.a, activeThread.b].map((id, i) => {
                  const ag = byId(id);
                  return (
                    <div key={id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {i > 0 && <span style={{ fontSize: 13, color: "#252545", margin: "0 12px" }}>↔</span>}
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: ag?.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700 }}>{ag?.avatar}</div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, lineHeight: 1.3 }}>{ag?.name}</div>
                        <div style={{ fontSize: 9, color: "#3d3d5c" }}>{ag?.title} · {ag?.company}</div>
                      </div>
                    </div>
                  );
                })}
                <div style={{ flex: 1 }} />
                <div style={{ fontSize: 9, color: activeThread.status === "concluded" ? "#10b981" : "#2a2a45", background: "#0e0e1c", border: `1px solid ${activeThread.status === "concluded" ? "#0a2a1a" : "#181830"}`, padding: "3px 9px", borderRadius: 4 }}>
                  {activeThread.status === "concluded" ? "✓ Concluded" : "Agent-to-Agent · No humans"}
                </div>
              </div>

              {decisions[activeThread.id] && (
                <div style={{ background: "#110707", borderBottom: "1px solid #3a1010", padding: "12px 20px", flexShrink: 0 }}>
                  <div style={{ fontSize: 11, color: "#f87171", fontWeight: 700, marginBottom: 6 }}>⚡ Your agent needs a decision from you</div>
                  <div style={{ fontSize: 12, color: "#fca5a5", marginBottom: 10, lineHeight: 1.6 }}>{decisions[activeThread.id].need}</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => humanApprove(activeThread.id)} style={{ background: "#10b981", border: "none", color: "white", padding: "6px 18px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Approve</button>
                    <button onClick={() => humanDismiss(activeThread.id)} style={{ background: "transparent", border: "1px solid #3a1010", color: "#6b7280", padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>Dismiss</button>
                  </div>
                </div>
              )}

              <div style={{ flex: 1, overflowY: "auto", padding: "22px 22px 10px" }}>
                {activeThread.messages.map(msg => {
                  const ag = byId(msg.speaker);
                  const isRight = msg.speaker === activeThread.b;
                  const empty   = msg.streaming && !msg.text;
                  return (
                    <div key={msg.id} style={{ display: "flex", gap: 10, marginBottom: 20, flexDirection: isRight ? "row-reverse" : "row", alignItems: "flex-start" }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: ag?.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, flexShrink: 0, boxShadow: `0 0 10px ${ag?.color}25` }}>
                        {ag?.avatar}
                      </div>
                      <div style={{ maxWidth: "75%" }}>
                        <div style={{ fontSize: 9, color: "#3d3d5c", marginBottom: 5, textAlign: isRight ? "right" : "left" }}>
                          <span style={{ color: ag?.color, fontWeight: 600 }}>{ag?.name}</span>'s agent
                          <span style={{ color: "#1e1e30", marginLeft: 8 }}>{new Date(msg.ts).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit", hour12: false })}</span>
                        </div>
                        <div style={{ background: isRight ? "#0e0e20" : "#111124", border: `1px solid ${isRight ? "#282848" : "#1c1c30"}`, borderRadius: isRight ? "12px 3px 12px 12px" : "3px 12px 12px 12px", padding: "12px 16px", fontSize: 13, lineHeight: 1.75, color: empty ? "#1e1e30" : "#c8d4e0" }}>
                          {empty ? <span style={{ animation: "blink 1s infinite", display: "inline-block" }}>▋</span> : msg.text}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={msgEnd} />
              </div>

              <div style={{ padding: "10px 20px 14px", borderTop: "1px solid #0f0f1e", flexShrink: 0 }}>
                <div style={{ background: "#0d0d18", border: "1px solid #141428", borderRadius: 8, padding: "9px 14px", fontSize: 11, color: "#252545", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: activeThread.status === "concluded" ? "#10b981" : "#6366f1", display: "inline-block", animation: activeThread.status === "concluded" ? "none" : "pulse 2s infinite" }} />
                  {activeThread.status === "concluded"
                    ? "Agents concluded this conversation autonomously"
                    : "Agents are handling this — your input is not needed"}
                </div>
              </div>
            </>
          )}
        </div>

        {/* LOG */}
        <div style={{ borderLeft: "1px solid #141422", display: "flex", flexDirection: "column", background: "#060610", overflow: "hidden" }}>
          <div style={{ padding: "12px", borderBottom: "1px solid #0f0f1e", fontSize: 9, color: "#252545", letterSpacing: "0.14em", fontWeight: 700, flexShrink: 0 }}>NETWORK LOG</div>
          <div ref={logRef} style={{ flex: 1, overflowY: "auto", padding: 10 }}>
            {log.length === 0 && <div style={{ fontSize: 10, color: "#1a1a2e", fontStyle: "italic" }}>Agents initialising…</div>}
            {log.map(l => (
              <div key={l.id} style={{ marginBottom: 8, paddingLeft: 7, borderLeft: `2px solid ${l.type === "error" ? "#ef444430" : l.type === "connect" ? "#6366f140" : l.type === "msg" ? "#10b98130" : l.type === "human" ? "#ef444455" : l.type === "conclude" ? "#10b98145" : "#1e1e30"}` }}>
                <div style={{ fontSize: 9, color: "#252540" }}>{l.t}</div>
                <div style={{ fontSize: 10, lineHeight: 1.45, color: l.type === "error" ? "#f87171" : l.type === "connect" ? "#818cf8" : l.type === "msg" ? "#34d399" : l.type === "human" ? "#fca5a5" : l.type === "conclude" ? "#6ee7b7" : "#3d3d5c" }}>
                  {l.msg}
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: "10px 12px 14px", borderTop: "1px solid #0f0f1e", flexShrink: 0 }}>
            <div style={{ fontSize: 9, color: "#252545", letterSpacing: "0.1em", marginBottom: 8, fontWeight: 700 }}>MESH STATS</div>
            {[
              ["Threads open",    threads.filter(t => t.status !== "concluded").length],
              ["Concluded",       concluded],
              ["Total messages",  totalMsgs],
              ["Human loops",     pendingCount],
              ["Autonomous ops",  Math.max(0, totalMsgs - pendingCount)],
            ].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontSize: 10, color: "#2d2d4a" }}>{k}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: k === "Human loops" ? (v > 0 ? "#f87171" : "#2d2d4a") : "#6366f1" }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.15} }
        @keyframes blink  { 0%,100%{opacity:1} 50%{opacity:0}    }
        ::-webkit-scrollbar       { width: 3px }
        ::-webkit-scrollbar-thumb { background: #1a1a2e; border-radius: 2px }
        ::-webkit-scrollbar-track { background: transparent }
      `}</style>
    </div>
  );
}
