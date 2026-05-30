/**
 * components/dashboard/StatCard.jsx
 */
import Spinner from "@/components/common/Spinner";

export default function StatCard({
  label,
  value,
  sub,
  color = "#E08818",
  icon,
  loading = false,
  onClick,
}) {
  return (
    <div
      className="card"
      onClick={onClick}
      style={{
        padding:     "14px 16px",
        cursor:      onClick ? "pointer" : "default",
        borderLeft:  `2px solid ${color}`,
        transition:  "background 0.12s",
        position:    "relative",
        overflow:    "hidden",
      }}
      onMouseEnter={(e) => {
        if (onClick) e.currentTarget.style.background = "var(--bg-hover)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "var(--white)";
      }}
    >
      {/* Icon */}
      {icon && (
        <div style={{
          position: "absolute", top: 14, right: 14,
          width: 28, height: 28, borderRadius: 3,
          background: color + "14",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, color,
        }}>
          {icon}
        </div>
      )}

      {/* Label */}
      <p style={{
        fontSize: 9, fontWeight: 600, color: "var(--text3)",
        textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8,
      }}>
        {label}
      </p>

      {/* Value */}
      {loading ? (
        <div className="spinner" style={{ width: 18, height: 18 }} />
      ) : (
        <p style={{
          fontSize: 24, fontWeight: 700, color,
          letterSpacing: "-0.02em", lineHeight: 1,
        }}>
          {value ?? "—"}
        </p>
      )}

      {/* Sub label */}
      {sub && (
        <p style={{ fontSize: 10, color: "var(--text3)", marginTop: 6 }}>
          {sub}
        </p>
      )}
    </div>
  );
}