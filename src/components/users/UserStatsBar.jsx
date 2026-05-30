/**
 * components/users/UserStatsBar.jsx
 *
 * A compact summary row showing:
 *  - Total users
 *  - Breakdown by role (admin / manager / sales_employee)
 *  - Active vs inactive count
 */
export default function UserStatsBar({ users = [] }) {
  const total     = users.length;
  const admins    = users.filter(u => u.role === "admin").length;
  const managers  = users.filter(u => u.role === "manager").length;
  const employees = users.filter(u => u.role === "sales_employee").length;
  const active    = users.filter(u => u.is_active).length;
  const inactive  = total - active;

  const stats = [
    { label: "Total Users",      value: total,     color: "#1A1A14" },
    { label: "Admins",           value: admins,     color: "#7A7A6E" },
    { label: "Managers",         value: managers,   color: "#E08818" },
    { label: "Sales Employees",  value: employees,  color: "#1A5A9A" },
    { label: "Active",           value: active,     color: "#0A5A28" },
    { label: "Inactive",         value: inactive,   color: "#8A1A1A" },
  ];

  return (
    <div style={{
      display:      "flex",
      gap:          1,
      background:   "var(--white)",
      border:       "1px solid var(--border)",
      borderRadius: 4,
      overflow:     "hidden",
      marginBottom: 16,
    }}>
      {stats.map((s, i) => (
        <div key={s.label} style={{
          flex:        1,
          padding:     "12px 14px",
          borderRight: i < stats.length - 1 ? "1px solid var(--border)" : "none",
          background:  "var(--white)",
        }}>
          <p style={{
            fontSize:      9,
            fontWeight:    600,
            color:         "var(--text3)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom:  4,
          }}>
            {s.label}
          </p>
          <p style={{
            fontSize:   20,
            fontWeight: 700,
            color:      s.color,
            lineHeight: 1,
            letterSpacing: "-0.02em",
          }}>
            {s.value}
          </p>
        </div>
      ))}
    </div>
  );
}