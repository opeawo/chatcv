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
        const { system, user, maxTokens = 220 } = JSON.parse(body);

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
          const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": apiKey,
              "anthropic-version": "2023-06-01",
              "anthropic-beta": "pdfs-2024-09-25",
            },
            body: JSON.stringify({
              model: "claude-sonnet-4-20250514",
              max_tokens: maxTokens,
              system,
              messages: [{ role: "user", content: user }],
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
