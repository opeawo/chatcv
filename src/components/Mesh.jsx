import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { claude } from "../api";
import Settings from "./Settings";
import UserMenu from "./UserMenu";
import { JAY_SCOUT, searchOpportunities, generateBriefing, OPP_TYPE_META } from "../jayScoutData";
// profiles-index.json is loaded lazily to avoid bloating the main bundle

// ── Default user placeholder (replaced by onboarded profile) ──
const DEFAULT_USER = {
  id: "a1", name: "Tunde Adeyemi", avatar: "TA", color: "#6366f1",
  title: "Sr. ML Engineer", company: "Flutterwave", status: "open_to_work",
  goals: ["Find Staff ML Engineer roles at fintech companies"],
  background: "5 years building production AI/ML systems for African fintech.",
  dealbreakers: [],
  isYou: true,
};

// ── Agent colors (cycled for indexed profiles) ──
const AGENT_COLORS = ["#ec4899", "#10b981", "#f59e0b", "#8b5cf6", "#06b6d4", "#f97316", "#14b8a6", "#e879f9", "#fb923c", "#34d399", "#818cf8", "#fbbf24", "#a78bfa", "#38bdf8", "#f472b6"];

// Convert a profile-index entry to an agent object
function profileToAgent(p, index) {
  const initials = p.n.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return {
    id: `p${index}`,
    name: p.n,
    avatar: initials,
    color: AGENT_COLORS[index % AGENT_COLORS.length],
    title: p.l,
    company: p.c,
    status: p.st,
    goals: [],
    background: `${p.l} at ${p.c}. ${p.su}`,
    dealbreakers: [],
    fromIndex: true,
  };
}

// Pick agents from the index that are relevant to the user's intent
function pickAgentsFromIndex(index, userStatus, count = 15) {
  if (!index || index.length === 0) return [];

  // Shuffle helper
  const shuffled = [...index].sort(() => Math.random() - 0.5);

  // Pick a mix: prioritize complementary statuses, then add variety
  const picked = [];
  const seen = new Set();

  // Status priority based on user intent
  const priorityStatuses =
    userStatus === "hiring"        ? ["open_to_work", "collaborating", "scouting"] :
    userStatus === "open_to_work"  ? ["hiring", "collaborating", "scouting"] :
    userStatus === "collaborating" ? ["collaborating", "open_to_work", "hiring", "scouting"] :
    userStatus === "scouting"      ? ["open_to_work", "hiring", "collaborating"] :
                                     ["hiring", "open_to_work", "collaborating", "scouting"];

  for (const status of priorityStatuses) {
    const pool = shuffled.filter(p => p.st === status && !seen.has(p.s));
    const take = status === priorityStatuses[0] ? Math.min(pool.length, Math.ceil(count * 0.5)) : Math.min(pool.length, Math.ceil(count * 0.2));
    for (let i = 0; i < take && picked.length < count; i++) {
      seen.add(pool[i].s);
      picked.push(pool[i]);
    }
  }

  // Fill remaining with random profiles
  if (picked.length < count) {
    const remaining = shuffled.filter(p => !seen.has(p.s));
    for (let i = 0; i < remaining.length && picked.length < count; i++) {
      picked.push(remaining[i]);
    }
  }

  return picked.map((p, i) => profileToAgent(p, i));
}

const STATUS_META = {
  open_to_work:  { label: "Open to work",  color: "#6366f1" },
  hiring:        { label: "Hiring",         color: "#10b981" },
  collaborating: { label: "Collaborating",  color: "#f59e0b" },
  scouting:      { label: "Scouting",       color: "#06b6d4" },
};

const THINK_INTERVAL = 4000;
const REPLY_DELAY    = 2600;
const MAX_TURNS      = 4;
const MAX_CONNECTIONS_DAY = 10; // free tier: 10/day (pro tier: 100/day, coming later)

function uid()  { return Math.random().toString(36).slice(2, 8); }
function now()  { return new Date().toLocaleTimeString("en", { hour12: false }); }

export default function Mesh({ userAgent, onUpdateAgent }) {
  // Load profiles index lazily
  const [meshProfiles, setMeshProfiles] = useState([]);
  const profilesLoadedRef = useRef(false);
  useEffect(() => {
    if (profilesLoadedRef.current) return;
    profilesLoadedRef.current = true;
    import("../profiles-index.json").then(mod => {
      setMeshProfiles(mod.default || mod);
    }).catch(() => setMeshProfiles([]));
  }, []);

  // Build agents list from profiles index + user profile
  const agents = useMemo(() => {
    const me = userAgent ? {
      id: "a1",
      name: userAgent.profile.name,
      avatar: userAgent.profile.name.split(" ").map(w => w[0]).join("").slice(0, 2),
      color: "#6366f1",
      title: userAgent.profile.title,
      company: userAgent.profile.company,
      status: userAgent.intent.intent,
      goals: userAgent.intent.goals.split(/[.;]/).map(s => s.trim()).filter(Boolean),
      background: userAgent.profile.summary,
      dealbreakers: userAgent.intent.dealbreakers.split(/[.;]/).map(s => s.trim()).filter(Boolean),
      isYou: true,
    } : DEFAULT_USER;

    const meshAgents = pickAgentsFromIndex(meshProfiles, me.status, 15);
    return [me, JAY_SCOUT, ...meshAgents];
  }, [userAgent, meshProfiles]);

  const byId = useCallback((id) => agents.find(a => a.id === id), [agents]);

  const [threads,     setThreads]     = useState([]);
  const [activeId,    setActiveId]    = useState(null);
  const [agentStates, setAgentStates] = useState(() =>
    Object.fromEntries(agents.map(a => [a.id, { thinking: false, action: "Idle" }]))
  );
  const [decisions,   setDecisions]   = useState({});
  const [log,         setLog]         = useState([]);
  const [paused,      setPaused]      = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [scoutPrefs, setScoutPrefs]   = useState({ threshold: 85, enabled: true });
  const [scoutOpps,  setScoutOpps]   = useState([]);
  const [oppActions,  setOppActions]   = useState({});
  const [concludedOpen, setConcludedOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);

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

  // ── Jay Scout: create scout thread on mount (async web search) ─────────────
  const scoutInitRef = useRef(false);
  useEffect(() => {
    if (scoutInitRef.current) return;
    scoutInitRef.current = true;
    const myAgent = agents.find(a => a.isYou);
    const myId = myAgent?.id || "a1";
    const intent = userAgent?.intent?.intent || myAgent?.status || "open_to_work";
    const goals = userAgent?.intent?.goals || myAgent?.goals?.join("; ") || "";
    const profile = myAgent?.background || "";

    // Show loading state
    setThreads(ts => {
      if (ts.find(t => t.id === "t-scout")) return ts;
      return [{
        id: "t-scout", a: myId, b: "jay-scout",
        messages: [{
          id: "m-scout-loading",
          speaker: "jay-scout",
          text: JSON.stringify({ type: "scout_loading", summary: "Searching the web for opportunities matching your profile..." }),
          streaming: false,
          ts: Date.now(),
        }],
        status: "live",
        startedAt: Date.now(),
        updatedAt: Date.now(),
      }, ...ts];
    });
    setActiveId("t-scout");
    addLog("Jay Scout is searching the web...", "scout");

    // Async web search
    searchOpportunities(profile, intent, goals)
      .then(opps => {
        setScoutOpps(opps);
        const briefing = generateBriefing(opps, intent);
        setThreads(ts => ts.map(t => t.id !== "t-scout" ? t : {
          ...t,
          messages: [{
            id: "m-scout-briefing-1",
            speaker: "jay-scout",
            text: JSON.stringify(briefing),
            streaming: false,
            ts: Date.now(),
          }],
          updatedAt: Date.now(),
        }));
        addLog(`Jay Scout found ${opps.length} opportunities`, "scout");
      })
      .catch(err => {
        console.error("Jay Scout search failed:", err);
        setThreads(ts => ts.map(t => t.id !== "t-scout" ? t : {
          ...t,
          messages: [{
            id: "m-scout-error",
            speaker: "jay-scout",
            text: JSON.stringify({ type: "scout_briefing", summary: "I couldn't complete the web search right now. Try refreshing to search again.", opportunities: [], footer: "" }),
            streaming: false,
            ts: Date.now(),
          }],
          updatedAt: Date.now(),
        }));
        addLog("Jay Scout: web search failed", "error");
      });
  }, [agents, userAgent, addLog]);

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

YOUR STATUS: ${me.status}
YOUR PROFILE: ${me.background}
YOUR GOALS: ${me.goals.join("; ")}
YOUR DEALBREAKERS: ${me.dealbreakers.join("; ")}

You are conversing with ${other.name}'s agent (${other.title} at ${other.company}, status: ${other.status}).
THEIR BACKGROUND: ${other.background}
THEIR GOALS: ${other.goals.join("; ")}

CONVERSATION PURPOSE — based on status pairing:
${me.status === "open_to_work" ? `You are JOB HUNTING. This conversation exists because they may have a role for ${me.name}. Your ONLY job: pitch ${me.name}'s qualifications for their specific role, answer questions about fit, and drive toward an application or interview. Do NOT "share insights", "explore synergies", or make small talk.` : ""}${me.status === "hiring" ? `You are HIRING. This conversation exists because they may be a candidate. Your ONLY job: vet their qualifications against your open role, explain the role/comp/expectations, and drive toward a screening call or application. Do NOT "share insights" or network aimlessly.` : ""}${me.status === "collaborating" ? `You have a SPECIFIC project. This conversation exists because they have skills/resources you need. Stay focused on the concrete deliverable: scope, timeline, contribution. No fluff.` : ""}${me.status === "scouting" ? `You are SOURCING. This conversation exists to evaluate fit against your thesis. Ask direct questions, assess fit, and either move to next steps or close.` : ""}

Rules:
- Speak as ${me.name}'s agent, not as ${me.name} directly.
- Be direct, professional, 2–3 sentences max.
- Every message must ADVANCE toward a concrete outcome (interview scheduled, role details shared, application submitted, collaboration terms agreed). If a message doesn't move the ball forward, don't send it.
- Do NOT: "share insights", "explore synergies", "exchange perspectives", or any variation of aimless networking talk. These are AI agents — skip the theater.
- Prefer async outcomes: send details, share a resume/portfolio link, agree on next steps. Only suggest a live call for things that genuinely require it (technical interview, salary negotiation).
- If the conversation has achieved its outcome OR there's no viable path forward, close it with a clear result: what was accomplished or why it didn't work out.
- Say HUMAN_LOOP_NEEDED:[reason] ONLY if you cannot proceed without the human (e.g. confirming salary expectations, sharing calendar for interview, approving a job application).`,
        `Conversation:\n${history}\n\nYour turn as ${me.name}'s agent. Remember: advance toward the concrete outcome, no fluff.`,
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
      // ── daily connection limit ──
      const todayStart = new Date().setHours(0, 0, 0, 0);
      const connectionsToday = threadsRef.current.filter(t =>
        t.a === agent.id && t.startedAt >= todayStart
      ).length;
      if (connectionsToday >= MAX_CONNECTIONS_DAY) {
        setAgentAction(agent.id, false, `Daily limit reached (${connectionsToday}/${MAX_CONNECTIONS_DAY})`);
        return;
      }

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
YOUR STATUS: ${agent.status}
YOUR PROFILE: ${agent.background}
YOUR GOALS: ${agent.goals.join("; ")}
YOUR DEALBREAKERS: ${agent.dealbreakers.join("; ")}

WHAT YOUR STATUS MEANS — this determines WHO you connect with:
- open_to_work: You are JOB HUNTING. ONLY connect with people who are HIRING for a role you qualify for. Not advisors, not collaborators, not VCs, not "adjacent" people. ONLY hiring managers/recruiters with a concrete open role that matches your skills.
- hiring: You are FILLING A ROLE. ONLY connect with people who are open_to_work AND whose skills match the role you're hiring for. Not consultants, not people who "might know someone."
- collaborating: You have a SPECIFIC project. ONLY connect if this person has the exact skill/data/resource your project needs AND they want to collaborate.
- scouting: You are SOURCING for a specific thesis. ONLY connect if this person directly fits your investment/sourcing criteria. No adjacent people.

MATCHING RULES (non-negotiable):
- Match ONLY on direct, first-order fit. "Might know someone" or "is in a related field" = REJECT.
- Your status is "${agent.status}". If you are open_to_work and the other person is NOT hiring, that is NOT a match. Period.
- If you are hiring and the other person is NOT open_to_work, that is NOT a match. Period.
- Check dealbreakers on BOTH sides. If either side has a dealbreaker violation, REJECT.
- Score 1-10. Only 8+ connects. You have ${MAX_CONNECTIONS_DAY} connections/day — waste none.`,
        `Evaluate if you should connect with:
Name: ${candidate.name} — ${candidate.title} at ${candidate.company}
Status: ${candidate.status}
Goals: ${candidate.goals.join("; ")}
Background: ${candidate.background}
Dealbreakers: ${candidate.dealbreakers?.join("; ") || "None listed"}

THINK STEP BY STEP:
1. What is YOUR status? What does that mean you need?
2. What is THEIR status? Does it complement yours? (open_to_work↔hiring, collaborating↔collaborating)
3. Do their specifics match your specifics? (role, skills, domain, level)
4. Any dealbreaker violations on either side?

Reply ONLY with valid JSON (no markdown):
{"connect":true/false,"score":1-10,"reason":"one sentence — what specific outcome this connection achieves or why it fails"}`,
        200
      );

      let decision;
      try { decision = JSON.parse(raw.replace(/```json|```/g, "").trim()); }
      catch { decision = null; }

      const score = decision?.score || 0;
      if (!decision?.connect || score < 8) {
        addLog(`${agent.name} → ${candidate.name}: rejected (${score}/10) — ${decision?.reason || "no match"}`, "scan");
        setAgentAction(agent.id, false, `Skipped ${candidate.name} (${score}/10)`);
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
YOUR STATUS: ${agent.status}
YOUR PROFILE: ${agent.background}
YOUR GOALS: ${agent.goals.join("; ")}

You decided to connect with ${candidate.name}'s agent (${candidate.title} at ${candidate.company}, status: ${candidate.status}).
Match reason: ${decision.reason}

Write a direct opening message. 2–3 sentences max. Structure:
${agent.status === "open_to_work" ? `1. State you represent ${agent.name} who is actively looking for [specific role type]. 2. Cite the specific reason this is a match (their open role, their hiring need). 3. Offer to share resume/portfolio or specific qualifications.` : ""}${agent.status === "hiring" ? `1. State you represent ${agent.name} who is hiring for [specific role]. 2. Cite why this candidate looks like a fit. 3. Ask for their availability or key qualifications.` : ""}${agent.status === "collaborating" ? `1. State you represent ${agent.name} working on [specific project]. 2. Cite the exact skill/resource you need from them. 3. Propose a concrete next step.` : ""}${agent.status === "scouting" ? `1. State you represent ${agent.name} scouting for [specific thesis]. 2. Cite why this person fits the criteria. 3. Ask a direct qualifying question.` : ""}
No fluff. No "exploring synergies." State intent plainly — these are AI agents, not humans making small talk.`,
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

  // ── staggered scheduler (excludes Jay Scout) ────────────────────────────
  useEffect(() => {
    const timers = [];
    agents.filter(a => !a.isScout).forEach((agent, i) => {
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
  const todayStart   = useMemo(() => new Date().setHours(0, 0, 0, 0), []);
  const connectionsToday = threads.filter(t => t.a === myId && t.startedAt >= todayStart).length;

  const brewingAgents = useMemo(() => {
    return agents
      .filter(a => !a.isScout && !a.isYou)
      .filter(a => {
        const st = agentStates[a.id];
        if (!st?.thinking) return false;
        return !(st.action || "").startsWith("Replying to");
      })
      .map(a => ({ ...a, state: agentStates[a.id] }));
  }, [agents, agentStates]);

  const activeThreads = useMemo(() => {
    return [...myThreads]
      .filter(t => t.status !== "concluded")
      .sort((a, b) => {
        const aScout = a.a === "jay-scout" || a.b === "jay-scout";
        const bScout = b.a === "jay-scout" || b.b === "jay-scout";
        if (aScout && !bScout) return -1;
        if (!aScout && bScout) return 1;
        return b.updatedAt - a.updatedAt;
      });
  }, [myThreads]);

  const concludedThreads = useMemo(() => {
    return [...myThreads].filter(t => t.status === "concluded").sort((a, b) => b.updatedAt - a.updatedAt);
  }, [myThreads]);

  // ── Jay Scout helpers ──────────────────────────────────────────────────────

  function parseScoutMessage(text) {
    try { const d = JSON.parse(text); return d.type?.startsWith("scout_") ? d : null; }
    catch { return null; }
  }

  function messagePreview(text) {
    const d = parseScoutMessage(text);
    if (d?.type === "scout_loading") return "Searching the web...";
    if (d?.type === "scout_briefing") return `${d.opportunities.length} opportunities found`;
    if (d?.type === "scout_detail") return d.detail?.slice(0, 60) + "…";
    return text;
  }

  const handleOppAction = useCallback((oppId, action) => {
    setOppActions(prev => ({ ...prev, [oppId]: action }));
    const opp = scoutOpps.find(o => o.id === oppId);
    if (action === "interested") {
      addLog(`Jay Scout: expanding on ${opp?.title} at ${opp?.company}`, "scout");
      pushMsg("t-scout", "jay-scout", JSON.stringify({
        type: "scout_detail",
        oppId,
        detail: `Here's what I found about ${opp?.title} at ${opp?.company}:\n\n${opp?.summary || "No additional details available."}\n\n• Location: ${opp?.location || "Unknown"}\n${opp?.compRange ? `• Compensation: ${opp.compRange}\n` : ""}• Source: ${opp?.source || "web"}\n${opp?.sourceUrl ? `• Link: ${opp.sourceUrl}\n` : ""}\nWant me to have your agent reach out, or save this for later?`,
      }));
    } else if (action === "reach_out") {
      addLog(`Jay Scout: initiating outreach for ${opp?.title} at ${opp?.company}`, "scout");
      pushMsg("t-scout", "jay-scout", JSON.stringify({
        type: "scout_detail",
        oppId,
        detail: `Got it — I'll have your agent draft an introduction to ${opp?.company}, highlighting your relevant experience. You'll see a new thread when it's ready for review.`,
      }));
    } else if (action === "dismissed") {
      addLog(`Jay Scout: dismissed ${opp?.title} at ${opp?.company}`, "scout");
    }
  }, [addLog, pushMsg, scoutOpps]);

  const isScoutThread = activeThread?.a === "jay-scout" || activeThread?.b === "jay-scout";

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
            {myThreads.length} threads &nbsp;·&nbsp; {totalMsgs} msgs &nbsp;·&nbsp; {concluded} concluded &nbsp;·&nbsp;
            {scoutOpps.length > 0 && <><span style={{ color: "#a78bfa" }}>{scoutOpps.length} opps</span> &nbsp;·&nbsp;</>}
            <span style={{ color: connectionsToday >= MAX_CONNECTIONS_DAY ? "#ef4444" : "#3d3d5c" }}>
              {connectionsToday}/{MAX_CONNECTIONS_DAY} today
            </span>
          </span>
          {pendingCount > 0 && (
            <span style={{ background: "#1a0808", border: "1px solid #4a1515", color: "#f87171", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
              ⚡ {pendingCount} need{pendingCount === 1 ? "s" : ""} you
            </span>
          )}
          <button
            onClick={() => setShowSettings(true)}
            style={{ background: "#0f0f1e", border: "1px solid #252540", color: "#4b5563", padding: "5px 10px", borderRadius: 6, cursor: "pointer", fontSize: 13, lineHeight: 1, transition: "all 0.15s" }}
            onMouseEnter={e => { e.target.style.borderColor = "#6366f1"; e.target.style.color = "#8892b0"; }}
            onMouseLeave={e => { e.target.style.borderColor = "#252540"; e.target.style.color = "#4b5563"; }}
            title="Settings"
          >⚙</button>
          <button
            onClick={() => setPaused(p => !p)}
            style={{ background: paused ? "#140808" : "#0f0f1e", border: `1px solid ${paused ? "#4a1515" : "#252540"}`, color: paused ? "#f87171" : "#4b5563", padding: "5px 14px", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: paused ? "#ef4444" : "#10b981", display: "inline-block", animation: paused ? "none" : "pulse 2s infinite" }} />
            {paused ? "Paused" : "Live"}
          </button>
          <UserMenu />
        </div>
      </div>

      {/* BODY */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "300px 1fr", overflow: "hidden" }}>

        {/* LEFT PANEL */}
        <div style={{ borderRight: "1px solid #141422", display: "flex", flexDirection: "column", background: "#080810", overflow: "hidden" }}>

          {/* Jay Scout card — pinned at top */}
          {(() => {
            const scoutThread = threads.find(t => t.b === "jay-scout" || t.a === "jay-scout");
            const oppCount = scoutOpps.length;
            const scoutLast = scoutThread ? [...scoutThread.messages].reverse().find(m => m.text) : null;
            return (
              <div
                onClick={() => scoutThread && setActiveId(scoutThread.id)}
                style={{
                  padding: 14, cursor: "pointer", flexShrink: 0,
                  background: activeId === "t-scout" ? "#130e24" : "#0a0818",
                  borderBottom: "1px solid #1a1030",
                  transition: "background 0.15s", position: "relative",
                }}
              >
                <div style={{ position: "absolute", top: 12, right: 12, width: 6, height: 6, borderRadius: "50%", background: "#a78bfa", animation: scoutPrefs.enabled ? "pulse 3s infinite" : "none", opacity: scoutPrefs.enabled ? 1 : 0.3 }} />
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: "50%",
                    background: "linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 16, fontWeight: 400, flexShrink: 0,
                    boxShadow: "0 0 12px #a78bfa25",
                  }}>◎</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>
                      Jay Scout <span style={{ color: "#a78bfa", fontSize: 9 }}>SCOUT</span>
                    </div>
                    <div style={{ fontSize: 9, color: "#5a4a80" }}>Opportunity Radar</div>
                  </div>
                  <span style={{ fontSize: 9, color: "#a78bfa", fontWeight: 600 }}>{oppCount > 0 ? oppCount : ""}</span>
                </div>
                <div style={{ fontSize: 11, color: activeId === "t-scout" ? "#7c6aab" : "#3a2a5c", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", lineHeight: 1.55 }}>
                  {scoutLast ? messagePreview(scoutLast.text) : "Scanning…"}
                </div>
                <div style={{ fontSize: 9, color: "#3a2a5c", marginTop: 4 }}>
                  {scoutPrefs.enabled ? "Active · threshold " + scoutPrefs.threshold + "%" : "Paused"}
                </div>
              </div>
            );
          })()}

          {/* Brewing — agents evaluating/scanning */}
          {brewingAgents.length > 0 && (
            <div style={{ borderBottom: "1px solid #0f0f1e", flexShrink: 0 }}>
              <div style={{ padding: "10px 16px 6px", fontSize: 9, color: "#252545", letterSpacing: "0.14em", fontWeight: 700 }}>
                BREWING — {brewingAgents.length}
              </div>
              {brewingAgents.map(agent => (
                <div key={agent.id} style={{ padding: "7px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: "50%", background: agent.color,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 9, fontWeight: 700, flexShrink: 0,
                    boxShadow: `0 0 10px ${agent.color}35`,
                  }}>{agent.avatar}</div>
                  <div style={{ flex: 1, minWidth: 0, fontSize: 11, color: "#4a4a80", fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {agent.state.action}
                  </div>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: agent.color, animation: "pulse 0.7s infinite", flexShrink: 0 }} />
                </div>
              ))}
              <div style={{ height: 6 }} />
            </div>
          )}

          {/* Active conversations */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            <div style={{ padding: "10px 16px 6px", fontSize: 9, color: "#252545", letterSpacing: "0.14em", fontWeight: 700, position: "sticky", top: 0, background: "#080810", zIndex: 1 }}>
              ACTIVE {activeThreads.length > 0 && `— ${activeThreads.length}`}
            </div>

            {activeThreads.length === 0 && brewingAgents.length === 0 && (
              <div style={{ padding: "48px 24px", textAlign: "center" }}>
                <div style={{ fontSize: 28, opacity: 0.04, marginBottom: 16, lineHeight: 1.5 }}>◎ ◎<br />◎ ◎ ◎</div>
                <div style={{ fontSize: 12, color: "#252545", lineHeight: 1.9 }}>
                  Agents are scanning the network.<br />
                  <span style={{ color: "#1e1e30", fontSize: 11 }}>Conversations begin automatically<br />when goals align.</span>
                </div>
              </div>
            )}

            {activeThreads.map(thread => {
              const a = byId(thread.a), b = byId(thread.b);
              const last = [...thread.messages].reverse().find(m => m.text);
              const isLive = activeId === thread.id;
              const hasDec = !!decisions[thread.id];
              const isStreaming = thread.messages.some(m => m.streaming && !m.text);
              const threadIsScout = thread.a === "jay-scout" || thread.b === "jay-scout";
              const other = threadIsScout ? null : (a?.isYou ? b : a);
              const otherSm = other ? (STATUS_META[other.status] || { label: other.status, color: "#6366f1" }) : null;

              if (threadIsScout) return (
                <div key={thread.id} onClick={() => setActiveId(thread.id)}
                  style={{ padding: "12px 16px", cursor: "pointer", borderBottom: "1px solid #0d0d18", background: isLive ? "#0e0a1e" : "transparent", borderLeft: `2px solid ${isLive ? "#a78bfa" : "transparent"}`, transition: "background 0.15s" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
                    <div style={{ width: 22, height: 22, borderRadius: "50%", background: "linear-gradient(135deg, #a78bfa, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>◎</div>
                    <span style={{ fontSize: 12, fontWeight: 600, flex: 1, color: "#c4b5fd" }}>Jay Scout</span>
                    <span style={{ fontSize: 9, color: "#a78bfa", fontWeight: 600 }}>{scoutOpps.length}</span>
                  </div>
                  <div style={{ fontSize: 11, color: isLive ? "#7c6aab" : "#3a2a5c", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", lineHeight: 1.55 }}>
                    {last ? messagePreview(last.text) : <span style={{ fontStyle: "italic", color: "#1e1e30" }}>Scanning…</span>}
                  </div>
                  <div style={{ fontSize: 9, color: "#1a1a28", marginTop: 4 }}>{thread.messages.filter(m => m.text).length} updates · live</div>
                </div>
              );

              return (
                <div key={thread.id} onClick={() => setActiveId(thread.id)}
                  style={{ padding: "12px 16px", cursor: "pointer", borderBottom: "1px solid #0d0d18", background: isLive ? "#0f0f20" : "transparent", borderLeft: `2px solid ${hasDec ? "#ef4444" : isLive ? "#6366f1" : "transparent"}`, transition: "background 0.15s" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
                    <div style={{ display: "flex" }}>
                      <div style={{ width: 22, height: 22, borderRadius: "50%", background: a?.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700 }}>{a?.avatar}</div>
                      <div style={{ width: 22, height: 22, borderRadius: "50%", background: b?.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, marginLeft: -6, border: "2px solid #080810" }}>{b?.avatar}</div>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>
                      {a?.name.split(" ")[0]} <span style={{ color: "#2d2d4a" }}>↔</span> {b?.name.split(" ")[0]}
                    </span>
                    {hasDec && <span style={{ fontSize: 9, color: "#ef4444", fontWeight: 700 }}>⚡ YOU</span>}
                    {!hasDec && isStreaming && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#6366f1", animation: "pulse 0.8s infinite", flexShrink: 0, display: "inline-block" }} />}
                  </div>
                  {otherSm && <div style={{ fontSize: 9, color: otherSm.color, marginBottom: 4, paddingLeft: 44 }}>{other.title} · {otherSm.label}</div>}
                  <div style={{ fontSize: 11, color: isLive ? "#5a607a" : "#2d2d45", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", lineHeight: 1.55 }}>
                    {last?.text || <span style={{ fontStyle: "italic", color: "#1e1e30" }}>Starting…</span>}
                  </div>
                  <div style={{ fontSize: 9, color: "#1a1a28", marginTop: 4 }}>{thread.messages.filter(m => m.text).length} messages · {thread.status}</div>
                </div>
              );
            })}

            {/* Concluded — collapsed by default */}
            {concludedThreads.length > 0 && (
              <>
                <div
                  onClick={() => setConcludedOpen(o => !o)}
                  style={{ padding: "10px 16px", fontSize: 9, color: "#1e1e38", letterSpacing: "0.14em", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid #0f0f1e", background: "#070710", position: "sticky", top: 28, zIndex: 1 }}
                >
                  <span>CONCLUDED — {concludedThreads.length}</span>
                  <span style={{ fontSize: 11 }}>{concludedOpen ? "▾" : "▸"}</span>
                </div>
                {concludedOpen && concludedThreads.map(thread => {
                  const a = byId(thread.a), b = byId(thread.b);
                  const last = [...thread.messages].reverse().find(m => m.text);
                  const isLive = activeId === thread.id;
                  return (
                    <div key={thread.id} onClick={() => setActiveId(thread.id)}
                      style={{ padding: "12px 16px", cursor: "pointer", borderBottom: "1px solid #0d0d18", background: isLive ? "#0f0f20" : "transparent", borderLeft: `2px solid ${isLive ? "#6366f1" : "transparent"}`, opacity: 0.6, transition: "background 0.15s" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
                        <div style={{ display: "flex" }}>
                          <div style={{ width: 22, height: 22, borderRadius: "50%", background: a?.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700 }}>{a?.avatar}</div>
                          <div style={{ width: 22, height: 22, borderRadius: "50%", background: b?.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, marginLeft: -6, border: "2px solid #080810" }}>{b?.avatar}</div>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>
                          {a?.name.split(" ")[0]} <span style={{ color: "#2d2d4a" }}>↔</span> {b?.name.split(" ")[0]}
                        </span>
                        <span style={{ fontSize: 9, color: "#10b981" }}>✓</span>
                      </div>
                      <div style={{ fontSize: 11, color: "#2d2d45", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", lineHeight: 1.55 }}>
                        {last?.text || "Concluded"}
                      </div>
                      <div style={{ fontSize: 9, color: "#1a1a28", marginTop: 4 }}>{thread.messages.filter(m => m.text).length} messages · concluded</div>
                    </div>
                  );
                })}
              </>
            )}
          </div>

          {/* Collapsible Network Log */}
          <div style={{ borderTop: "1px solid #0f0f1e", flexShrink: 0 }}>
            <div
              onClick={() => setLogOpen(o => !o)}
              style={{ padding: "8px 16px", fontSize: 9, color: "#1a1a30", letterSpacing: "0.12em", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}
            >
              <span>NETWORK LOG</span>
              <span style={{ fontSize: 11 }}>{logOpen ? "▾" : "▸"}</span>
            </div>
            {logOpen && (
              <div ref={logRef} style={{ maxHeight: 200, overflowY: "auto", padding: "0 16px 10px" }}>
                {log.length === 0 && <div style={{ fontSize: 10, color: "#1a1a2e", fontStyle: "italic" }}>Agents initialising…</div>}
                {log.slice(-20).map(l => (
                  <div key={l.id} style={{ marginBottom: 6, paddingLeft: 7, borderLeft: `2px solid ${l.type === "error" ? "#ef444430" : l.type === "connect" ? "#6366f140" : l.type === "msg" ? "#10b98130" : l.type === "human" ? "#ef444455" : l.type === "conclude" ? "#10b98145" : l.type === "scout" ? "#a78bfa40" : "#1e1e30"}` }}>
                    <div style={{ fontSize: 9, color: "#252540" }}>{l.t}</div>
                    <div style={{ fontSize: 10, lineHeight: 1.45, color: l.type === "error" ? "#f87171" : l.type === "connect" ? "#818cf8" : l.type === "msg" ? "#34d399" : l.type === "human" ? "#fca5a5" : l.type === "conclude" ? "#6ee7b7" : l.type === "scout" ? "#c4b5fd" : "#3d3d5c" }}>
                      {l.msg}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* MESSAGES */}
        <div style={{ display: "flex", flexDirection: "column", background: "#07070f", overflow: "hidden" }}>
          {!activeThread ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", gap: 8 }}>
                {agents.filter(a => !a.isScout).slice(0, 4).map((a, i) => (
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
              {/* Thread header */}
              {isScoutThread ? (
                <div style={{ padding: "10px 20px", borderBottom: "1px solid #1a1030", display: "flex", alignItems: "center", gap: 10, flexShrink: 0, background: "#0a0814" }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%",
                    background: "linear-gradient(135deg, #a78bfa, #7c3aed)",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
                  }}>◎</div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600 }}>Jay Scout</div>
                    <div style={{ fontSize: 9, color: "#5a4a80" }}>Opportunity Radar · Threshold: {scoutPrefs.threshold}%</div>
                  </div>
                  <div style={{ flex: 1 }} />
                  <button
                    onClick={() => setShowSettings(true)}
                    style={{ background: "#0e0e1c", border: "1px solid #2a1e4a", color: "#a78bfa", padding: "4px 12px", borderRadius: 6, cursor: "pointer", fontSize: 10, fontWeight: 600, transition: "all 0.15s" }}
                    onMouseEnter={e => { e.target.style.background = "#1a1030"; }}
                    onMouseLeave={e => { e.target.style.background = "#0e0e1c"; }}
                  >Preferences</button>
                </div>
              ) : (
                <div style={{ padding: "10px 20px", borderBottom: "1px solid #0f0f1e", display: "flex", alignItems: "center", gap: 0, flexShrink: 0, background: "#09090f" }}>
                  {[activeThread.a, activeThread.b].map((id, i) => {
                    const ag = byId(id);
                    const agSm = STATUS_META[ag?.status] || {};
                    return (
                      <div key={id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {i > 0 && <span style={{ fontSize: 13, color: "#252545", margin: "0 12px" }}>↔</span>}
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: ag?.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700 }}>{ag?.avatar}</div>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 600, lineHeight: 1.3 }}>
                            {ag?.name}
                            {ag?.isYou && <span style={{ color: "#6366f1", fontSize: 9, marginLeft: 4 }}>YOU</span>}
                          </div>
                          <div style={{ fontSize: 9, color: "#3d3d5c" }}>
                            {ag?.title} · {ag?.company}
                            {agSm.label && <span style={{ color: agSm.color, marginLeft: 6 }}>· {agSm.label}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div style={{ flex: 1 }} />
                  <div style={{ fontSize: 9, color: activeThread.status === "concluded" ? "#10b981" : "#2a2a45", background: "#0e0e1c", border: `1px solid ${activeThread.status === "concluded" ? "#0a2a1a" : "#181830"}`, padding: "3px 9px", borderRadius: 4 }}>
                    {activeThread.status === "concluded" ? "✓ Concluded" : "Agent-to-Agent · No humans"}
                  </div>
                </div>
              )}

              {/* Human decision prompt (non-scout threads only) */}
              {!isScoutThread && decisions[activeThread.id] && (
                <div style={{ background: "#110707", borderBottom: "1px solid #3a1010", padding: "12px 20px", flexShrink: 0 }}>
                  <div style={{ fontSize: 11, color: "#f87171", fontWeight: 700, marginBottom: 6 }}>⚡ Your agent needs a decision from you</div>
                  <div style={{ fontSize: 12, color: "#fca5a5", marginBottom: 10, lineHeight: 1.6 }}>{decisions[activeThread.id].need}</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => humanApprove(activeThread.id)} style={{ background: "#10b981", border: "none", color: "white", padding: "6px 18px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Approve</button>
                    <button onClick={() => humanDismiss(activeThread.id)} style={{ background: "transparent", border: "1px solid #3a1010", color: "#6b7280", padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>Dismiss</button>
                  </div>
                </div>
              )}

              {/* Messages area */}
              <div style={{ flex: 1, overflowY: "auto", padding: "22px 22px 10px" }}>
                {activeThread.messages.map(msg => {
                  const ag = byId(msg.speaker);
                  const isRight = msg.speaker === activeThread.b && !isScoutThread;
                  const empty   = msg.streaming && !msg.text;
                  const scoutData = msg.speaker === "jay-scout" && !empty ? parseScoutMessage(msg.text) : null;

                  {/* ── Scout loading message ── */}
                  if (scoutData?.type === "scout_loading") {
                    return (
                      <div key={msg.id} style={{ marginBottom: 24 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: "50%",
                            background: "linear-gradient(135deg, #a78bfa, #7c3aed)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 16, flexShrink: 0, boxShadow: "0 0 10px #a78bfa25",
                            animation: "pulse 2s infinite",
                          }}>◎</div>
                          <div style={{ fontSize: 9, color: "#5a4a80" }}>
                            <span style={{ color: "#a78bfa", fontWeight: 600 }}>Jay Scout</span>
                          </div>
                        </div>
                        <div style={{ background: "#0c0818", border: "1px solid #1e1438", borderRadius: "3px 14px 14px 14px", padding: "16px 20px" }}>
                          <div style={{ fontSize: 13, color: "#c4b5fd", lineHeight: 1.7 }}>
                            {scoutData.summary}
                          </div>
                          <div style={{ display: "flex", gap: 4, marginTop: 12 }}>
                            {[0, 1, 2].map(i => (
                              <div key={i} style={{
                                width: 6, height: 6, borderRadius: "50%", background: "#a78bfa",
                                animation: `pulse 1.4s ${i * 0.2}s infinite`,
                                opacity: 0.5,
                              }} />
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  {/* ── Scout briefing message ── */}
                  if (scoutData?.type === "scout_briefing") {
                    return (
                      <div key={msg.id} style={{ marginBottom: 24 }}>
                        {/* Header */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: "50%",
                            background: "linear-gradient(135deg, #a78bfa, #7c3aed)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 16, flexShrink: 0, boxShadow: "0 0 10px #a78bfa25",
                          }}>◎</div>
                          <div style={{ fontSize: 9, color: "#5a4a80" }}>
                            <span style={{ color: "#a78bfa", fontWeight: 600 }}>Jay Scout</span>
                            <span style={{ color: "#1e1e30", marginLeft: 8 }}>{new Date(msg.ts).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit", hour12: false })}</span>
                          </div>
                        </div>

                        {/* Briefing bubble — full width */}
                        <div style={{ background: "#0c0818", border: "1px solid #1e1438", borderRadius: "3px 14px 14px 14px", padding: "16px 20px" }}>
                          {/* Summary */}
                          <div style={{ fontSize: 13, color: "#c4b5fd", lineHeight: 1.7, marginBottom: 16 }}>
                            {scoutData.summary}
                          </div>

                          {/* Opportunity cards */}
                          {scoutData.opportunities.map(opp => {
                            const action = oppActions[opp.id];
                            const typeMeta = OPP_TYPE_META[opp.type] || { icon: "◈", label: opp.type };
                            return (
                              <div key={opp.id} style={{
                                background: action === "dismissed" ? "#08060f" : "#0a0a1a",
                                border: `1px solid ${action === "dismissed" ? "#0e0c16" : "#a78bfa25"}`,
                                borderRadius: 10, padding: "14px 16px", marginBottom: 12,
                                opacity: action === "dismissed" ? 0.5 : 1,
                                transition: "all 0.3s",
                              }}>
                                {/* Type badge */}
                                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                                  <span style={{ fontSize: 9, color: "#a78bfa" }}>{typeMeta.icon} {typeMeta.label}</span>
                                  {opp.tags?.length > 0 && <span style={{ fontSize: 9, color: "#3d3d5c", marginLeft: "auto" }}>{opp.tags.slice(0, 3).join(" · ")}</span>}
                                </div>
                                {/* Title + Company */}
                                <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", marginBottom: 4 }}>
                                  {opp.title} — {opp.company}
                                </div>
                                {/* Match reason */}
                                <div style={{ fontSize: 11, color: "#8892b0", fontStyle: "italic", marginBottom: 8, lineHeight: 1.5 }}>
                                  "{opp.summary}"
                                </div>
                                {/* Meta */}
                                <div style={{ fontSize: 10, color: "#4b5578", marginBottom: 10 }}>
                                  {opp.location}{opp.compRange && ` · ${opp.compRange}`}
                                </div>
                                {/* Source */}
                                <div style={{ fontSize: 10, color: "#3d3d5c", marginBottom: 12 }}>
                                  Source: {opp.sourceUrl ? (
                                    <a href={opp.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#6366f1", textDecoration: "none", borderBottom: "1px solid #6366f140" }}>{opp.source}</a>
                                  ) : (
                                    <span style={{ color: "#6366f1" }}>{opp.source}</span>
                                  )}
                                </div>
                                {/* Actions */}
                                {!action ? (
                                  <div style={{ display: "flex", gap: 6 }}>
                                    <button onClick={() => handleOppAction(opp.id, "interested")}
                                      style={{ background: "#12122e", border: "1px solid #28285a", color: "#a78bfa", padding: "5px 12px", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 600 }}>
                                      Tell me more
                                    </button>
                                    <button onClick={() => handleOppAction(opp.id, "dismissed")}
                                      style={{ background: "transparent", border: "1px solid #1e1e30", color: "#4b5578", padding: "5px 12px", borderRadius: 6, cursor: "pointer", fontSize: 11 }}>
                                      Not for me
                                    </button>
                                    <button onClick={() => handleOppAction(opp.id, "reach_out")}
                                      title="Have my agent reach out"
                                      style={{ background: "#a78bfa", border: "none", color: "white", padding: "5px 10px", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 700, marginLeft: "auto" }}>
                                      →
                                    </button>
                                  </div>
                                ) : (
                                  <div style={{ fontSize: 11, fontWeight: 600, color: action === "dismissed" ? "#4b5578" : action === "reach_out" ? "#10b981" : "#a78bfa" }}>
                                    {action === "interested" && "⟡ Preparing more details…"}
                                    {action === "dismissed" && "Noted — won't show similar"}
                                    {action === "reach_out" && "✓ Agent reaching out…"}
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {/* Footer */}
                          <div style={{ fontSize: 11, color: "#3a2a5c", marginTop: 8, lineHeight: 1.6 }}>
                            {scoutData.footer.replace(" →", "")}
                            {" "}
                            <span
                              onClick={() => setShowSettings(true)}
                              style={{ color: "#a78bfa", cursor: "pointer", borderBottom: "1px solid #a78bfa40" }}
                            >Adjust what I look for →</span>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  {/* ── Scout detail follow-up message ── */}
                  if (scoutData?.type === "scout_detail") {
                    return (
                      <div key={msg.id} style={{ marginBottom: 24 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: "50%",
                            background: "linear-gradient(135deg, #a78bfa, #7c3aed)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 16, flexShrink: 0, boxShadow: "0 0 10px #a78bfa25",
                          }}>◎</div>
                          <div style={{ fontSize: 9, color: "#5a4a80" }}>
                            <span style={{ color: "#a78bfa", fontWeight: 600 }}>Jay Scout</span>
                            <span style={{ color: "#1e1e30", marginLeft: 8 }}>{new Date(msg.ts).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit", hour12: false })}</span>
                          </div>
                        </div>
                        <div style={{ background: "#0c0818", border: "1px solid #1e1438", borderRadius: "3px 14px 14px 14px", padding: "14px 18px", fontSize: 13, lineHeight: 1.75, color: "#c8d4e0", whiteSpace: "pre-line" }}>
                          {scoutData.detail}
                        </div>
                      </div>
                    );
                  }

                  {/* ── Regular agent message ── */}
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

              {/* Bottom bar */}
              {isScoutThread ? (
                <div style={{ padding: "10px 20px 14px", borderTop: "1px solid #1a1030", flexShrink: 0 }}>
                  <div style={{ background: "#0c0818", border: "1px solid #1e1438", borderRadius: 8, padding: "9px 14px", fontSize: 11, color: "#5a4a80", display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#a78bfa", display: "inline-block", animation: "pulse 3s infinite" }} />
                    Jay Scout runs in the background. Next scan in ~2h.
                  </div>
                </div>
              ) : (
                <div style={{ padding: "10px 20px 14px", borderTop: "1px solid #0f0f1e", flexShrink: 0 }}>
                  <div style={{ background: "#0d0d18", border: "1px solid #141428", borderRadius: 8, padding: "9px 14px", fontSize: 11, color: "#252545", display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: activeThread.status === "concluded" ? "#10b981" : "#6366f1", display: "inline-block", animation: activeThread.status === "concluded" ? "none" : "pulse 2s infinite" }} />
                    {activeThread.status === "concluded"
                      ? "Agents concluded this conversation autonomously"
                      : "Agents are handling this — your input is not needed"}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

      </div>

      {showSettings && userAgent && (
        <Settings
          userAgent={userAgent}
          onSave={onUpdateAgent}
          onClose={() => setShowSettings(false)}
          scoutPrefs={scoutPrefs}
          onUpdateScoutPrefs={setScoutPrefs}
        />
      )}

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
