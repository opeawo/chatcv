// ── Jay Scout: Opportunity Radar Agent ─────────────────────────────────────────

export const JAY_SCOUT = {
  id: "jay-scout",
  name: "Jay Scout",
  avatar: "JS",
  color: "#a78bfa",
  title: "Opportunity Radar",
  company: "ChatCV",
  status: "scouting",
  isScout: true,
  goals: [],
  background: "Built-in opportunity intelligence agent. Scans jobs, conferences, collaborations, open source, and funding.",
  dealbreakers: [],
};

// ── Opportunity type metadata ──────────────────────────────────────────────────

export const OPP_TYPE_META = {
  role:          { icon: "◈", label: "Role" },
  conference:    { icon: "⌖", label: "Conference" },
  collaboration: { icon: "◎", label: "Collaboration" },
  oss:           { icon: "⬡", label: "Open Source" },
  funding:       { icon: "◇", label: "Funding" },
  advisory:      { icon: "★", label: "Advisory" },
};

// ── Mock opportunity pool ──────────────────────────────────────────────────────

export const MOCK_OPPORTUNITIES = [
  // ── Strong matches (85%+) ──
  {
    id: "opp-001",
    type: "role",
    title: "Staff ML Engineer, Fraud Intelligence",
    company: "Stripe",
    location: "Remote",
    compRange: "$190k–$240k",
    source: "careers.stripe.com",
    sourceUrl: "https://careers.stripe.com/listings/ml-fraud",
    tags: ["ML", "fraud detection", "fintech", "PyTorch", "production"],
    summary: "Fraud detection focus maps directly to your Flutterwave work. Remote, comp range fits, Staff-level.",
    matchFactors: { roleLevel: 0.95, skillMatch: 0.94, domainMatch: 0.90, locationMatch: 1.0, compSignal: 0.92 },
  },
  {
    id: "opp-002",
    type: "role",
    title: "Principal ML Engineer",
    company: "Moniepoint",
    location: "Remote (Lagos / London)",
    compRange: "$170k–$210k",
    source: "moniepoint.com/careers",
    sourceUrl: "https://moniepoint.com/careers/principal-ml",
    tags: ["ML", "payments", "African markets", "fraud", "leadership"],
    summary: "African fintech unicorn, payments ML — near-perfect domain overlap with your background.",
    matchFactors: { roleLevel: 0.92, skillMatch: 0.90, domainMatch: 0.98, locationMatch: 0.95, compSignal: 0.85 },
  },
  {
    id: "opp-003",
    type: "collaboration",
    title: "Co-author: LLMs for Low-Resource African Languages",
    company: "Masakhane NLP",
    location: "Remote",
    compRange: null,
    source: "masakhane.io",
    sourceUrl: "https://masakhane.io/call-for-collaborators",
    tags: ["NLP", "LLMs", "African languages", "research", "open source"],
    summary: "Open call for ML practitioners with production African-market data. Aligns with your LLM research goal.",
    matchFactors: { roleLevel: 0.85, skillMatch: 0.88, domainMatch: 0.95, locationMatch: 1.0, compSignal: 0.80 },
  },
  {
    id: "opp-004",
    type: "role",
    title: "Sr. ML Engineer, Risk & Trust",
    company: "Anthropic",
    location: "San Francisco / Remote",
    compRange: "$200k–$280k",
    source: "anthropic.com/careers",
    sourceUrl: "https://anthropic.com/careers/ml-risk",
    tags: ["ML", "safety", "LLMs", "production", "risk"],
    summary: "AI safety meets production ML. Your fraud detection precision work translates well to trust & safety.",
    matchFactors: { roleLevel: 0.90, skillMatch: 0.92, domainMatch: 0.78, locationMatch: 0.85, compSignal: 0.95 },
  },

  // ── Medium matches (70–84%) ──
  {
    id: "opp-005",
    type: "conference",
    title: "MLOps World 2026 — Speaker CFP",
    company: "MLOps Community",
    location: "Toronto / Virtual",
    compRange: null,
    source: "mlopsworld.com",
    sourceUrl: "https://mlopsworld.com/cfp-2026",
    tags: ["MLOps", "conference", "speaking", "production ML"],
    summary: "Call for speakers on production ML systems. Your $2B txn/yr fraud pipeline would be a strong talk.",
    matchFactors: { roleLevel: 0.70, skillMatch: 0.85, domainMatch: 0.75, locationMatch: 0.80, compSignal: 0.60 },
  },
  {
    id: "opp-006",
    type: "role",
    title: "ML Engineering Manager",
    company: "Wise",
    location: "London (Hybrid)",
    compRange: "£130k–£160k",
    source: "wise.jobs",
    sourceUrl: "https://wise.jobs/ml-em",
    tags: ["ML", "management", "fintech", "cross-border payments"],
    summary: "Manager track — strong domain fit but you'd be moving away from IC. London hybrid may trigger dealbreaker.",
    matchFactors: { roleLevel: 0.75, skillMatch: 0.80, domainMatch: 0.88, locationMatch: 0.55, compSignal: 0.78 },
  },
  {
    id: "opp-007",
    type: "oss",
    title: "Maintainer: AfriML — African Market ML Toolkit",
    company: "Open Source",
    location: "Remote",
    compRange: null,
    source: "github.com/afriml",
    sourceUrl: "https://github.com/afriml/toolkit",
    tags: ["open source", "ML", "African markets", "Python", "toolkit"],
    summary: "Looking for maintainers with production African fintech ML experience. High visibility, low time commitment.",
    matchFactors: { roleLevel: 0.70, skillMatch: 0.82, domainMatch: 0.90, locationMatch: 1.0, compSignal: 0.50 },
  },
  {
    id: "opp-008",
    type: "role",
    title: "Data Scientist, Fraud Analytics",
    company: "Klarna",
    location: "Stockholm (Relocation)",
    compRange: "€90k–€120k",
    source: "klarna.com/careers",
    sourceUrl: "https://klarna.com/careers/ds-fraud",
    tags: ["data science", "fraud", "fintech", "analytics"],
    summary: "Domain match is strong but role level is below your seniority. Relocation required.",
    matchFactors: { roleLevel: 0.55, skillMatch: 0.75, domainMatch: 0.85, locationMatch: 0.30, compSignal: 0.60 },
  },
  {
    id: "opp-009",
    type: "advisory",
    title: "Technical Advisor — AI-first Neobank",
    company: "Stealth (YC W26)",
    location: "Remote",
    compRange: "0.25% equity",
    source: "ycombinator.com/companies",
    sourceUrl: "https://ycombinator.com/companies/stealth-neobank",
    tags: ["advisory", "startup", "neobank", "AI", "equity"],
    summary: "YC-backed stealth building AI-native banking for Africa. Seeking ML advisor with African fintech ops experience.",
    matchFactors: { roleLevel: 0.80, skillMatch: 0.78, domainMatch: 0.92, locationMatch: 1.0, compSignal: 0.65 },
  },
  {
    id: "opp-010",
    type: "role",
    title: "Lead ML Engineer, Payments Risk",
    company: "Block (Square)",
    location: "Remote (US)",
    compRange: "$180k–$230k",
    source: "block.xyz/careers",
    sourceUrl: "https://block.xyz/careers/ml-payments-risk",
    tags: ["ML", "payments", "risk", "production", "distributed systems"],
    summary: "Payments risk ML at scale. Good fit but less emerging-market focus than your sweet spot.",
    matchFactors: { roleLevel: 0.88, skillMatch: 0.85, domainMatch: 0.72, locationMatch: 0.90, compSignal: 0.88 },
  },

  // ── Weak matches (<70%) ──
  {
    id: "opp-011",
    type: "role",
    title: "Junior Data Engineer",
    company: "Rappi",
    location: "Bogotá (On-site)",
    compRange: "$45k–$60k",
    source: "rappi.com/careers",
    sourceUrl: "https://rappi.com/careers/data-eng",
    tags: ["data engineering", "ETL", "junior"],
    summary: "Too junior, wrong specialization, requires relocation.",
    matchFactors: { roleLevel: 0.20, skillMatch: 0.40, domainMatch: 0.50, locationMatch: 0.20, compSignal: 0.25 },
  },
  {
    id: "opp-012",
    type: "role",
    title: "Frontend Engineer",
    company: "Figma",
    location: "San Francisco",
    compRange: "$170k–$220k",
    source: "figma.com/careers",
    sourceUrl: "https://figma.com/careers/frontend",
    tags: ["frontend", "React", "design tools"],
    summary: "Wrong specialization entirely — frontend, not ML.",
    matchFactors: { roleLevel: 0.70, skillMatch: 0.20, domainMatch: 0.10, locationMatch: 0.70, compSignal: 0.85 },
  },
  {
    id: "opp-013",
    type: "conference",
    title: "DevOps Days Lagos 2026",
    company: "DevOps Community",
    location: "Lagos",
    compRange: null,
    source: "devopsdays.org/lagos",
    sourceUrl: "https://devopsdays.org/lagos-2026",
    tags: ["devops", "infrastructure", "Lagos"],
    summary: "DevOps-focused, not ML. Tangential at best.",
    matchFactors: { roleLevel: 0.40, skillMatch: 0.35, domainMatch: 0.45, locationMatch: 0.90, compSignal: 0.30 },
  },
  {
    id: "opp-014",
    type: "funding",
    title: "AI Startup Grant — Google for Startups Africa",
    company: "Google",
    location: "Africa-based founders",
    compRange: "$100k grant",
    source: "startup.google.com/africa",
    sourceUrl: "https://startup.google.com/africa-ai-grant",
    tags: ["grant", "AI", "Africa", "startup", "funding"],
    summary: "For founders building AI in Africa. You're not a founder yet, but could be interesting if you're considering it.",
    matchFactors: { roleLevel: 0.50, skillMatch: 0.70, domainMatch: 0.80, locationMatch: 0.90, compSignal: 0.45 },
  },
  {
    id: "opp-015",
    type: "role",
    title: "ML Research Intern",
    company: "Meta AI",
    location: "Menlo Park",
    compRange: "$8k/mo",
    source: "metacareers.com",
    sourceUrl: "https://metacareers.com/ml-intern",
    tags: ["intern", "research", "ML"],
    summary: "Internship — far below your experience level.",
    matchFactors: { roleLevel: 0.10, skillMatch: 0.60, domainMatch: 0.30, locationMatch: 0.60, compSignal: 0.15 },
  },
];

// ── Scoring engine ─────────────────────────────────────────────────────────────

const WEIGHTS = {
  roleLevel:     0.25,
  skillMatch:    0.25,
  domainMatch:   0.20,
  locationMatch: 0.15,
  compSignal:    0.15,
};

export function scoreOpportunity(opp) {
  const score = Object.entries(WEIGHTS).reduce(
    (sum, [k, w]) => sum + (opp.matchFactors[k] || 0) * w, 0
  );
  return Math.round(score * 100);
}

export function filterOpportunities(pool, threshold = 85) {
  return pool
    .map(opp => ({ ...opp, matchScore: scoreOpportunity(opp) }))
    .filter(opp => opp.matchScore >= threshold)
    .sort((a, b) => b.matchScore - a.matchScore);
}

// ── Briefing generator ─────────────────────────────────────────────────────────

export function generateBriefing(filteredOpps, totalScanned, sourcesCount, hoursAway) {
  const timeLabel = hoursAway >= 24
    ? `${Math.round(hoursAway / 24)}d`
    : `${Math.round(hoursAway)}h`;

  return {
    type: "scout_briefing",
    summary: `While you were away (${timeLabel}), I scanned ${totalScanned} listings across ${sourcesCount} sources. ${filteredOpps.length} opportunit${filteredOpps.length === 1 ? "y" : "ies"} cleared your bar:`,
    opportunities: filteredOpps,
    footer: `Nothing else met your threshold. Adjust what I look for →`,
  };
}
