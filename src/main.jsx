import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { UserAgentProvider } from "./context/UserAgentContext";
import App from "./App";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <UserAgentProvider>
          <App />
        </UserAgentProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
