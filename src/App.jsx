import { useState } from "react";
import Onboarding from "./Onboarding";
import Mesh from "./Mesh";

export default function App() {
  const [view, setView] = useState("onboarding"); // "onboarding" | "mesh"
  const [userAgent, setUserAgent] = useState(null);

  const handleOnboardingComplete = (agentData) => {
    setUserAgent(agentData);
    setView("mesh");
  };

  if (view === "onboarding") {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return <Mesh userAgent={userAgent} />;
}
