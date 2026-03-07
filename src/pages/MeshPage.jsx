import { useEffect } from "react";
import Mesh from "../components/Mesh";
import { useUserAgent } from "../context/UserAgentContext";

const DEV_AGENT = {
  profile: { name: "Opeyemi Awoyemi", title: "Product Manager", company: "Hello.cv", summary: "Product Manager leading AI Agents at Hello.cv. Building autonomous networking agents for professionals." },
  intent: { intent: "hiring", goals: "Hire senior ML engineers for fraud detection; Find fintech engineers with payments experience", dealbreakers: "No junior engineers; Must have production ML experience" },
  guardrails: { loops: ["salary", "equity"] },
};

export default function MeshPage() {
  const { userAgent, setUserAgent } = useUserAgent();

  // DEV: auto-inject test agent if not onboarded
  useEffect(() => {
    if (!userAgent && import.meta.env.DEV) setUserAgent(DEV_AGENT);
  }, [userAgent, setUserAgent]);

  if (!userAgent) return null;
  return <Mesh userAgent={userAgent} onUpdateAgent={setUserAgent} />;
}
