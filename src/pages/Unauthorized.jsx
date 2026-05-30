/**
 * pages/Unauthorized.jsx
 * Shown when a user navigates to a route their role can't access.
 */
import { useNavigate } from "react-router-dom";

export default function UnauthorizedPage() {
  const navigate = useNavigate();
  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "var(--bg)", gap: 12, textAlign: "center", padding: 24,
    }}>
      <div style={{ fontSize: 48 }}>🔒</div>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>Access Denied</h1>
      <p style={{ color: "var(--text3)", fontSize: 14, maxWidth: 320 }}>
        You don't have permission to view this page.
        Contact your admin if you think this is a mistake.
      </p>
      <button
        className="btn btn-primary btn-sm"
        onClick={() => navigate("/dashboard")}
        style={{ marginTop: 8 }}
      >
        ← Back to Dashboard
      </button>
    </div>
  );
}