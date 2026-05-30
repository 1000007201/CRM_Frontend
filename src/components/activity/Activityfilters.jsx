/**
 * components/activity/ActivityFilters.jsx
 */
import { ACTION_META } from "@/utils/formatters";

const ACTIONS = Object.keys(ACTION_META);

export default function ActivityFilters({ filters, onChange }) {
  const set = (k, v) => onChange({ ...filters, [k]: v || undefined });

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>

      {/* Action type */}
      <select
        className="form-select"
        value={filters.action ?? ""}
        onChange={(e) => set("action", e.target.value)}
        style={{ width: "auto", minWidth: 160 }}
      >
        <option value="">All Actions</option>
        {ACTIONS.map((a) => (
          <option key={a} value={a}>{ACTION_META[a].label}</option>
        ))}
      </select>

      {/* Date from */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <label style={{ fontSize: 11, color: "var(--text3)", whiteSpace: "nowrap" }}>
          From
        </label>
        <input
          type="date"
          className="form-input"
          value={filters.created_after ?? ""}
          onChange={(e) => set("created_after", e.target.value)}
          style={{ width: 145 }}
        />
      </div>

      {/* Date to */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <label style={{ fontSize: 11, color: "var(--text3)", whiteSpace: "nowrap" }}>
          To
        </label>
        <input
          type="date"
          className="form-input"
          value={filters.created_before ?? ""}
          onChange={(e) => set("created_before", e.target.value)}
          style={{ width: 145 }}
        />
      </div>

      {/* Clear */}
      {Object.values(filters).some(Boolean) && (
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => onChange({})}
          style={{ color: "var(--red)" }}
        >
          ✕ Clear
        </button>
      )}
    </div>
  );
}