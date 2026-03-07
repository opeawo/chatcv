import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

function apiProxyPlugin() {
  return {
    name: "api-proxy",
    configureServer(server) {
      server.middlewares.use("/api/chat", async (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: "Method not allowed" }));
          return;
        }

        let body = "";
        for await (const chunk of req) body += chunk;
        const { system, user, maxTokens = 220, tools } = JSON.parse(body);

        if (!system || !user) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: "Missing required fields: system, user" }));
          return;
        }

        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: "ANTHROPIC_API_KEY not set in .env.local" }));
          return;
        }

        try {
          const apiBody = {
            model: "claude-sonnet-4-20250514",
            max_tokens: maxTokens,
            system,
            messages: [{ role: "user", content: user }],
          };
          if (tools) apiBody.tools = tools;

          const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": apiKey,
              "anthropic-version": "2023-06-01",
              "anthropic-beta": "pdfs-2024-09-25",
            },
            body: JSON.stringify(apiBody),
          });

          const data = await response.text();
          res.statusCode = response.status;
          res.setHeader("Content-Type", "application/json");
          res.end(data);
        } catch (err) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err.message }));
        }
      });

      // LinkedIn / PDL enrichment proxy
      server.middlewares.use("/api/linkedin", async (req, res) => {
        if (req.method !== "GET") {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: "Method not allowed" }));
          return;
        }

        const params = new URL(req.url, "http://localhost").searchParams;
        const url = params.get("url");
        if (!url) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: "Missing required query param: url" }));
          return;
        }

        const pdlKey = process.env.PDL_API_KEY;
        if (!pdlKey) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: "PDL_API_KEY not set in .env.local" }));
          return;
        }

        try {
          const pdlUrl = `https://api.peopledatalabs.com/v5/person/enrich?profile=${encodeURIComponent(url)}`;
          const response = await fetch(pdlUrl, {
            headers: { "X-Api-Key": pdlKey },
          });

          if (!response.ok) {
            const errorText = await response.text();
            res.statusCode = response.status;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: `PDL API error: ${errorText}` }));
            return;
          }

          const result = await response.json();
          const d = result.data;

          if (!d || result.status === 404) {
            res.statusCode = 404;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "Profile not found" }));
            return;
          }

          // Helper: title-case a string (PDL returns lowercase)
          const titleCase = (s) => {
            if (!s) return "";
            return s.replace(/\b\w/g, c => c.toUpperCase());
          };

          // Helper: resolve title (PDL returns object or string)
          const resolveTitle = (t) => {
            if (!t) return "";
            if (typeof t === "string") return t;
            return t.name || t.role || JSON.stringify(t);
          };

          // Calculate years of experience
          let years = "";
          if (d.experience && d.experience.length > 0) {
            const dates = d.experience.map(e => e.start_date).filter(Boolean).sort();
            if (dates.length > 0) {
              const earliest = new Date(dates[0]);
              const diff = Math.floor((Date.now() - earliest.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
              years = `${diff}+`;
            }
          }

          // Build highlights from experience
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

          // Build summary from experience if job_summary is empty
          let summary = d.job_summary || d.summary || "";
          if (!summary && d.experience && d.experience.length > 0) {
            const top3 = d.experience.slice(0, 3).map(e =>
              `${titleCase(resolveTitle(e.title))} at ${titleCase(e.company?.name || "")}`
            ).join(", ");
            summary = `Professional with ${years ? years + " years" : "extensive"} experience. Recent roles include ${top3}.`;
          }

          const profile = {
            name: titleCase(d.full_name || ""),
            title: titleCase(d.job_title || ""),
            company: titleCase(d.job_company_name || ""),
            years,
            summary,
            skills: (d.skills || []).slice(0, 8).map(s => titleCase(s)),
            highlights,
          };

          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ profile, likelihood: result.likelihood }));
        } catch (err) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err.message }));
        }
      });

      // PDL Person Search proxy
      server.middlewares.use("/api/pdl-search", async (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: "Method not allowed" }));
          return;
        }

        let body = "";
        for await (const chunk of req) body += chunk;
        const { query, size = 10 } = JSON.parse(body);

        if (!query) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: "Missing required field: query" }));
          return;
        }

        const pdlKey = process.env.PDL_API_KEY;
        if (!pdlKey) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: "PDL_API_KEY not set in .env.local" }));
          return;
        }

        try {
          const response = await fetch("https://api.peopledatalabs.com/v5/person/search", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Api-Key": pdlKey,
            },
            body: JSON.stringify({
              query: { bool: query },
              size: Math.min(size, 10),
              titlecase: true,
            }),
          });

          const data = await response.text();
          res.statusCode = response.status;
          res.setHeader("Content-Type", "application/json");
          res.end(data);
        } catch (err) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err.message }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  Object.assign(process.env, env);

  return {
    plugins: [react(), apiProxyPlugin()],
  };
});
