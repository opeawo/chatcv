import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthContext } from "./context/AuthContext";
import { useUserAgent } from "./context/UserAgentContext";
import LandingPage from "./pages/LandingPage";
import OnboardingPage from "./pages/OnboardingPage";
import MeshPage from "./pages/MeshPage";

function RequireAuth({ children }) {
  const { user } = useAuthContext();
  if (!user) return <Navigate to="/" replace />;
  return children;
}

function RequireOnboarded({ children }) {
  const { userAgent } = useUserAgent();
  if (!userAgent) return <Navigate to="/onboarding" replace />;
  return children;
}

function RedirectIfAuth({ children }) {
  const { user } = useAuthContext();
  if (user) return <Navigate to="/onboarding" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={<RedirectIfAuth><LandingPage /></RedirectIfAuth>}
      />
      <Route
        path="/onboarding"
        element={<RequireAuth><OnboardingPage /></RequireAuth>}
      />
      <Route
        path="/mesh"
        element={<RequireAuth><RequireOnboarded><MeshPage /></RequireOnboarded></RequireAuth>}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
