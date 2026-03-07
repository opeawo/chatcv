import { requireAuth } from "./_auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const userId = await requireAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const pdlKey = process.env.PDL_API_KEY;
  if (!pdlKey) {
    return res.status(500).json({ error: "PDL_API_KEY not configured on server" });
  }

  const { query, size = 10 } = req.body;
  if (!query) {
    return res.status(400).json({ error: "Missing required field: query" });
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

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: `PDL API error: ${errorText}` });
    }

    const result = await response.json();
    return res.status(200).json({
      status: result.status,
      total: result.total,
      data: result.data || [],
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
