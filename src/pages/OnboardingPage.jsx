import { Navigate, useNavigate } from "react-router-dom";
import Onboarding from "../components/Onboarding";
import { useUserAgent } from "../context/UserAgentContext";

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { userAgent, setUserAgent } = useUserAgent();

  if (userAgent) return <Navigate to="/mesh" replace />;

  const handleComplete = (data) => {
    setUserAgent(data);
    navigate("/mesh");
  };

  return <Onboarding onComplete={handleComplete} />;
}
