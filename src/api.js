async function authHeaders() {
  const token = localStorage.getItem("chatcv_token");
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

export async function claude(system, user, maxTokens = 220, tools = null) {
  const body = { system, user, maxTokens };
  if (tools) body.tools = tools;

  const r = await fetch("/api/chat", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(body),
  });

  if (!r.ok) {
    const errorBody = await r.text();
    throw new Error(`API error (${r.status}): ${errorBody}`);
  }

  const d = await r.json();
  const textBlocks = d.content?.filter(b => b.type === "text") || [];
  return textBlocks.length > 0 ? textBlocks[textBlocks.length - 1].text : "";
}

export async function fetchLinkedIn(url) {
  const token = localStorage.getItem("chatcv_token");
  const headers = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const r = await fetch(`/api/linkedin?url=${encodeURIComponent(url)}`, { headers });
  if (!r.ok) {
    const errorBody = await r.text();
    throw new Error(`LinkedIn API error (${r.status}): ${errorBody}`);
  }
  return r.json();
}
