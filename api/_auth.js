export async function requireAuth(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  try {
    const token = authHeader.replace("Bearer ", "");
    const payload = JSON.parse(atob(token));
    if (!payload.sub) return null;
    return payload.sub;
  } catch {
    return null;
  }
}
