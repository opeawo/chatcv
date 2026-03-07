// ── Jay Scout: Opportunity Radar Agent ─────────────────────────────────────────

import { claude } from "./api";

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
  background: "Built-in opportunity intelligence agent. Searches the web for real jobs, candidates, collaborations, and deal flow.",
  dealbreakers: [],
};

// ── Opportunity type metadata ──────────────────────────────────────────────────

export const OPP_TYPE_META = {
  role:          { icon: "◈", label: "Role" },
  candidate:     { icon: "◈", label: "Candidate" },
  talent_pool:   { icon: "⊞", label: "Talent Pool" },
  collaboration: { icon: "◎", label: "Collaboration" },
  project:       { icon: "◎", label: "Project" },
  founder:       { icon: "⬡", label: "Founder" },
  conference:    { icon: "⌖", label: "Conference" },
  oss:           { icon: "⬡", label: "Open Source" },
  funding:       { icon: "◇", label: "Funding" },
  advisory:      { icon: "★", label: "Advisory" },
};

// ── Real web search via Anthropic API ──────────────────────────────────────────

const SEARCH_SYSTEM = `You are Jay Scout, an opportunity intelligence agent for chat.cv.
You use web search to find REAL, CURRENT opportunities. Return ONLY a valid JSON array — no markdown fences, no explanation.

Each item in the array must have exactly these fields:
{
  "id": "opp-1" through "opp-10",
  "type": "<type>",
  "title": "exact title from source",
  "company": "company or org name",
  "location": "location or Remote",
  "compRange": "$XXk–$YYk" or null if unknown,
  "source": "domain.com",
  "sourceUrl": "https://full-url-to-listing",
  "tags": ["tag1", "tag2", "tag3"],
  "summary": "1 sentence explaining why this matches the user's profile"
}`;

const INTENT_PROMPTS = {
  open_to_work: (profile, goals) =>
    `Search for 10 real, currently open job postings that match this candidate's profile and goals.

CANDIDATE PROFILE:
${profile}

GOALS:
${goals}

Valid types: "role", "conference", "oss", "advisory"
Prioritize: exact skill match, seniority fit, location/remote compatibility, compensation alignment.
Search job boards, company career pages, LinkedIn postings, and tech communities.`,

  hiring: (profile, goals) =>
    `Search for 10 real sources where this hiring manager can find candidates matching their hiring needs.

HIRING MANAGER PROFILE:
${profile}

HIRING GOALS:
${goals}

Valid types: "candidate", "talent_pool"
Search for: talent communities, recruiting platforms, candidate pools, relevant meetups/conferences where target candidates gather, LinkedIn talent searches, and specific profiles of potential candidates.`,

  collaborating: (profile, goals) =>
    `Search for 10 real collaboration opportunities, research partnerships, open projects, or co-author calls matching this person's profile.

COLLABORATOR PROFILE:
${profile}

COLLABORATION GOALS:
${goals}

Valid types: "collaboration", "project", "conference", "oss"
Search for: open research calls, GitHub projects seeking contributors, conference CFPs, research labs with open collaboration, and relevant academic/industry partnerships.`,

  scouting: (profile, goals) =>
    `Search for 10 real founders, startups, or investment opportunities matching this scout's criteria.

SCOUT PROFILE:
${profile}

SCOUTING GOALS:
${goals}

Valid types: "founder", "funding", "conference"
Search for: recently funded startups, YC/Techstars companies, Product Hunt launches, founder profiles on LinkedIn/Twitter, pitch competitions, and relevant deal flow sources.`,
};

export async function searchOpportunities(userProfile, intent, goals) {
  const buildPrompt = INTENT_PROMPTS[intent] || INTENT_PROMPTS.open_to_work;
  const userPrompt = buildPrompt(userProfile, goals);

  const result = await claude(
    SEARCH_SYSTEM,
    userPrompt,
    4096,
    [{ type: "web_search_20250305", name: "web_search", max_uses: 5 }]
  );

  try {
    // Claude may include preamble text before the JSON array and <cite> tags inside values
    let cleaned = result.replace(/```json\s?|```/g, "");
    // Strip <cite ...>...</cite> tags
    cleaned = cleaned.replace(/<cite[^>]*>|<\/cite>/g, "");
    // Extract the JSON array portion
    const start = cleaned.indexOf("[");
    const end = cleaned.lastIndexOf("]");
    if (start === -1 || end === -1) return [];
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    console.error("Jay Scout: failed to parse search results", result?.slice(0, 200));
    return [];
  }
}

// ── Briefing generator ─────────────────────────────────────────────────────────

const SCAN_LABELS = {
  open_to_work:  "job listings and opportunities",
  hiring:        "candidate sources and talent pools",
  collaborating: "collaboration and research opportunities",
  scouting:      "founders and startups",
};

export function generateBriefing(opportunities, intent) {
  return {
    type: "scout_briefing",
    summary: `I searched the web and found ${opportunities.length} ${SCAN_LABELS[intent] || "opportunities"} matching your profile:`,
    opportunities,
    footer: "Adjust what I look for →",
  };
}
