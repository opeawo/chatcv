import { createContext, useContext, useState, useCallback } from "react";

const UserAgentContext = createContext(null);

export function UserAgentProvider({ children }) {
  const [userAgent, setUserAgent] = useState(null);

  const updateAgent = useCallback((data) => {
    setUserAgent(data);
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
