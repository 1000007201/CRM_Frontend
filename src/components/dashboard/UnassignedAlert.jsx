/**
 * components/dashboard/UnassignedAlert.jsx
 *
 * Shows an actionable warning banner when there are unassigned leads.
 * Only visible to Admin and Manager.
 */
import { useNavigate } from "react-router-dom";

export default function UnassignedAlert({ count }) {
  const navigate = useNavigate();

  if (!count || count === 0) return null;

  return (
    <div style={{
      background: "#fffbeb",
      border: "1px solid #F0D080",
      borderRadius: 4,
      padding: "14px 20px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16,
      flexWrap: "wrap",
      marginBottom: 20,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 20 }}>⚠</span>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#92400e" }}>
            {count} lead{count !== 1 ? "s" : ""} unassigned
          </p>
          <p style={{ fontSize: 12, color: "#b45309" }}>
            These leads have no sales employee assigned to them.
          </p>
        </div>
      </div>
      <button
        className="btn btn-sm"
        style={{
          background: "#C08010", color: "#fff",
          border: "none", flexShrink: 0,
        }}
        onClick={() => navigate("/leads?assigned_to=none")}
      >
        Review Unassigned
      </button>
    </div>
  );
}