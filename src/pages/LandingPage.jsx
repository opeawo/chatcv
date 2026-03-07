import { useState } from "react";
import Landing from "../components/Landing";
import LoginModal from "../components/LoginModal";

export default function LandingPage() {
  const [showAuth, setShowAuth] = useState(false);

  return (
    <>
      <Landing onStart={() => setShowAuth(true)} />
      {showAuth && <LoginModal onClose={() => setShowAuth(false)} />}
    </>
  );
}
