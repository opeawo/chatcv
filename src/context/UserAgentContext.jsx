import { createContext, useContext, useState, useCallback } from "react";

const STORAGE_KEY = "chatcv_agent";
const UserAgentContext = createContext(null);

function loadAgent() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function UserAgentProvider({ children }) {
  const [userAgent, setUserAgent] = useState(loadAgent);

  const updateAgent = useCallback((data) => {
    setUserAgent(data);
    if (data) localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    else localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <UserAgentContext.Provider value={{ userAgent, setUserAgent: updateAgent }}>
      {children}
    </UserAgentContext.Provider>
  );
}

export function useUserAgent() {
  const ctx = useContext(UserAgentContext);
  if (!ctx) throw new Error("useUserAgent must be used within UserAgentProvider");
  return ctx;
}
