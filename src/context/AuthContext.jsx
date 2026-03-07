import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

export function useAuthContext() { return useContext(AuthContext); }

const DEMO_USERS = {
  demo: { password: "demo", user: { name: "Demo User", email: "demo@chatcv.app" } },
};

function makeToken(username) {
  return btoa(JSON.stringify({ sub: username, iat: Date.now() }));
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem("chatcv_user");
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });

  const login = (username, userData) => {
    const token = makeToken(username);
    localStorage.setItem("chatcv_token", token);
    localStorage.setItem("chatcv_user", JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("chatcv_token");
    localStorage.removeItem("chatcv_user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, DEMO_USERS }}>
      {children}
    </AuthContext.Provider>
  );
}
