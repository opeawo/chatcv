import Mesh from "../components/Mesh";
import { useUserAgent } from "../context/UserAgentContext";

export default function MeshPage() {
  const { userAgent, setUserAgent } = useUserAgent();
  return <Mesh userAgent={userAgent} onUpdateAgent={setUserAgent} />;
}
