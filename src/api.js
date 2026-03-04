export async function claude(system, user, maxTokens = 220) {
  const r = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system, user, maxTokens }),
  });

  if (!r.ok) {
    const errorBody = await r.text();
    throw new Error(`API error (${r.status}): ${errorBody}`);
  }

  const d = await r.json();
  return d.content?.[0]?.text || "";
}
