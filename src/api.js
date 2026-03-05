export async function claude(system, user, maxTokens = 220, tools = null) {
  const body = { system, user, maxTokens };
  if (tools) body.tools = tools;

  const r = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!r.ok) {
    const errorBody = await r.text();
    throw new Error(`API error (${r.status}): ${errorBody}`);
  }

  const d = await r.json();
  // Web search responses have multiple content blocks (server_tool_use, web_search_tool_result, text).
  // Extract the last text block which contains the final answer.
  const textBlocks = d.content?.filter(b => b.type === "text") || [];
  return textBlocks.length > 0 ? textBlocks[textBlocks.length - 1].text : "";
}
