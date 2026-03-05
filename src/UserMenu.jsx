import { UserButton, useUser } from "@clerk/react";

export default function UserMenu() {
  const { user } = useUser();
  if (!user) return null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ textAlign: "right" }}>
        <div style={{
          fontSize: 12,
          fontWeight: 600,
          color: "#e2e8f0",
          lineHeight: 1.3,
        }}>
          {user.firstName || user.username || "User"}
        </div>
        <div style={{
          fontSize: 10,
          color: "#3d3d5c",
          fontFamily: "'DM Mono', monospace",
        }}>
          {user.primaryEmailAddress?.emailAddress}
        </div>
      </div>
      <UserButton
        appearance={{
          elements: {
            avatarBox: {
              width: 32,
              height: 32,
              borderRadius: "50%",
              border: "2px solid #1e1e38",
            },
            userButtonPopoverCard: {
              background: "#0a0a18",
              border: "1px solid #1e1e38",
              borderRadius: "12px",
              boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
            },
            userButtonPopoverActionButton: {
              color: "#e2e8f0",
            },
            userButtonPopoverActionButtonText: {
              color: "#e2e8f0",
            },
            userButtonPopoverFooter: {
              display: "none",
            },
          },
        }}
      />
    </div>
  );
}
