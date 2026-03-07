// ── Jay Scout: Opportunity Radar Agent ─────────────────────────────────────────

import { claude, searchPDLPersons } from "./api";

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

// ── Web search (non-hiring intents) ──────────────────────────────────────────

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

function parseWebSearchResult(result) {
  try {
    let cleaned = result.replace(/```json\s?|```/g, "");
    cleaned = cleaned.replace(/<cite[^>]*>|<\/cite>/g, "");
    const start = cleaned.indexOf("[");
    const end = cleaned.lastIndexOf("]");
    if (start === -1 || end === -1) return [];
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    console.error("Jay Scout: failed to parse search results", result?.slice(0, 200));
    return [];
  }
}

async function webSearch(profile, intent, goals) {
  const buildPrompt = INTENT_PROMPTS[intent] || INTENT_PROMPTS.open_to_work;
  const result = await claude(
    SEARCH_SYSTEM,
    buildPrompt(profile, goals),
    4096,
    [{ type: "web_search_20250305", name: "web_search", max_uses: 5 }]
  );
  return parseWebSearchResult(result);
}

// ── PDL Person Search (hiring intent) ────────────────────────────────────────

const PDL_QUERY_SYSTEM = `You translate hiring requirements into People Data Labs Elasticsearch queries.
Return ONLY valid JSON — no markdown, no explanation.

Return an Elasticsearch "bool" query object:
- "must": conditions that MUST match (core requirements: role, seniority, key skills)
- "should": conditions that SHOULD match (nice-to-haves, bonus skills, preferred location)
- "minimum_should_match": 1

Available fields (all values lowercase):
- job_title_role: broad role ("engineering", "design", "sales", "marketing", "operations", "finance")
- job_title_sub_role: specific ("machine learning", "frontend", "devops", "data science", "product management")
- job_title_levels: seniority array (["senior", "director", "vp", "cxo", "manager", "entry", "training"])
- job_company_industry: industry of current employer
- location_country: ISO code ("us", "gb", "ng", "in", "de")
- location_locality: city ("san francisco", "london", "lagos")
- skills: skill name ("python", "machine learning", "fraud detection", "react")

Use "term" for single values, "terms" for arrays.

Example for "Senior ML engineers with fraud detection experience":
{"must":[{"term":{"job_title_role":"engineering"}},{"term":{"job_title_sub_role":"machine learning"}},{"terms":{"job_title_levels":["senior","director"]}}],"should":[{"term":{"skills":"fraud detection"}},{"term":{"skills":"python"}}],"minimum_should_match":1}`;

function buildPDLQueryPrompt(profile, goals) {
  return `Convert to PDL Elasticsearch bool query:\n\nHIRING CONTEXT:\n${profile}\n\nHIRING GOALS:\n${goals}`;
}

const titleCase = (s) => s ? s.replace(/\b\w/g, c => c.toUpperCase()) : "";

function pdlPersonToOpp(person, index) {
  const name = person.full_name || "Unknown";
  const jobTitle = person.job_title || "Professional";
  const company = person.job_company_name || "";
  const city = person.location_locality || "";
  const country = person.location_country ? person.location_country.toUpperCase() : "";
  const location = [city, country].filter(Boolean).join(", ") || "Unknown";

  const tags = (person.skills || []).slice(0, 5).map(s => titleCase(s));

  const resolveTitle = (t) => {
    if (!t) return "";
    if (typeof t === "string") return t;
    return t.name || t.role || "";
  };

  const recentRoles = (person.experience || [])
    .filter(e => e.title && e.company?.name)
    .slice(0, 2)
    .map(e => `${titleCase(resolveTitle(e.title))} at ${titleCase(e.company.name)}`)
    .join("; ");

  const summary = recentRoles
    ? `${titleCase(jobTitle)} — previously ${recentRoles}`
    : `${titleCase(jobTitle)}${company ? ` at ${titleCase(company)}` : ""}`;

  return {
    id: `opp-${index + 1}`,
    type: "candidate",
    title: titleCase(name),
    company: titleCase(company) || titleCase(jobTitle),
    location,
    compRange: null,
    source: person.linkedin_url ? "LinkedIn" : "PDL",
    sourceUrl: person.linkedin_url || null,
    tags,
    summary,
  };
}

function buildFallbackQuery(goals) {
  const words = goals.toLowerCase().split(/[\s,;]+/).filter(w => w.length > 3);
  return {
    should: words.slice(0, 5).map(w => ({ term: { skills: w } })),
    minimum_should_match: 1,
  };
}

async function searchHiringCandidates(profile, goals) {
  try {
    // Step 1: Use Claude to build PDL query from natural language
    const queryJson = await claude(
      PDL_QUERY_SYSTEM,
      buildPDLQueryPrompt(profile, goals),
      1024
    );

    let query;
    try {
      const cleaned = queryJson.replace(/```json\s?|```/g, "").trim();
      const start = cleaned.indexOf("{");
      const end = cleaned.lastIndexOf("}");
      if (start === -1 || end === -1) throw new Error("No JSON found");
      query = JSON.parse(cleaned.slice(start, end + 1));
    } catch (parseErr) {
      console.warn("Jay Scout: Claude query parse failed, using fallback", queryJson?.slice(0, 200));
      query = buildFallbackQuery(goals);
    }

    console.log("Jay Scout: PDL query", JSON.stringify(query));

    // Step 2: Call PDL Person Search
    const result = await searchPDLPersons(query, 10);

    if (!result.data || result.data.length === 0) {
      console.warn("Jay Scout: PDL returned 0 results, falling back to web search");
      return webSearch(profile, "hiring", goals);
    }

    console.log(`Jay Scout: PDL found ${result.total} total, returning ${result.data.length}`);

    // Step 3: Map to opportunity card schema
    return result.data.map((person, i) => pdlPersonToOpp(person, i));

  } catch (err) {
    console.error("Jay Scout: PDL search failed, falling back to web search", err);
    return webSearch(profile, "hiring", goals);
  }
}

// ── Main search entry point ──────────────────────────────────────────────────

export async function searchOpportunities(userProfile, intent, goals) {
  if (intent === "hiring") {
    return searchHiringCandidates(userProfile, goals);
  }
  return webSearch(userProfile, intent, goals);
}

// ── Briefing generator ─────────────────────────────────────────────────────────

const SCAN_LABELS = {
  open_to_work:  "job listings and opportunities",
  hiring:        "candidate profiles",
  collaborating: "collaboration and research opportunities",
  scouting:      "founders and startups",
};

export function generateBriefing(opportunities, intent) {
  const source = intent === "hiring"
    ? `I searched candidate databases and found ${opportunities.length} ${SCAN_LABELS.hiring} matching your hiring needs:`
    : `I searched the web and found ${opportunities.length} ${SCAN_LABELS[intent] || "opportunities"} matching your profile:`;
  return {
    type: "scout_briefing",
    summary: source,
    opportunities,
    footer: "Adjust what I look for →",
  };
}
