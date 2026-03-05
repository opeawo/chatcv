function titleCase(str) {
  if (!str) return "";
  return str.replace(/\b\w/g, c => c.toUpperCase());
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const pdlKey = process.env.PDL_API_KEY;
  if (!pdlKey) {
    return res.status(500).json({ error: "PDL_API_KEY not configured on server" });
  }

  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: "Missing required query param: url" });
  }

  try {
    const pdlUrl = `https://api.peopledatalabs.com/v5/person/enrich?profile=${encodeURIComponent(url)}`;
    const response = await fetch(pdlUrl, {
      headers: { "X-Api-Key": pdlKey },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: `PDL API error: ${errorText}` });
    }

    const result = await response.json();
    const d = result.data;

    if (!d || result.status === 404) {
      return res.status(404).json({ error: "Profile not found" });
    }

    // Calculate years of experience from earliest experience start_date
    let years = "";
    if (d.experience && d.experience.length > 0) {
      const dates = d.experience
        .map(e => e.start_date)
        .filter(Boolean)
        .sort();
      if (dates.length > 0) {
        const earliest = new Date(dates[0]);
        const diff = Math.floor((Date.now() - earliest.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        years = `${diff}+`;
      }
    }

    // Resolve title — PDL returns title as object {name, role, ...} or string
    const resolveTitle = (t) => {
      if (!t) return "";
      if (typeof t === "string") return t;
      return t.name || t.role || JSON.stringify(t);
    };

    // Build highlights from experience entries
    const highlights = (d.experience || [])
      .filter(e => e.title && e.company && e.company.name)
      .slice(0, 20)
      .map(e => {
        const jobTitle = titleCase(resolveTitle(e.title));
        const companyName = titleCase(e.company.name);
        const duration = e.start_date
          ? `${e.start_date}${e.end_date ? ` - ${e.end_date}` : " - Present"}`
          : "";
        return `${jobTitle} at ${companyName}${duration ? ` (${duration})` : ""}`;
      });

    // Build a summary from experience if job_summary is empty
    let summary = d.job_summary || d.summary || "";
    if (!summary && d.experience && d.experience.length > 0) {
      const top3 = d.experience.slice(0, 3).map(e =>
        `${titleCase(resolveTitle(e.title))} at ${titleCase(e.company?.name || "")}`
      ).join(", ");
      summary = `Professional with ${years ? years + " years" : "extensive"} experience. Recent roles include ${top3}.`;
    }

    // Map to our profile schema — title-case all PDL lowercase fields
    const profile = {
      name: titleCase(d.full_name || ""),
      title: titleCase(d.job_title || ""),
      company: titleCase(d.job_company_name || ""),
      years,
      summary,
      skills: (d.skills || []).slice(0, 8).map(s => titleCase(s)),
      highlights,
    };

    return res.status(200).json({ profile, likelihood: result.likelihood });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
