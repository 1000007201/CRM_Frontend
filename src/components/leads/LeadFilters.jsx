/**
 * components/leads/LeadFilters.jsx
 *
 * Search bar + Stage / Priority / Source / Assigned-to dropdowns.
 * Calls onChange(filters) whenever any filter changes.
 * The parent (LeadsPage) owns the filter state and passes it to useLeads().
 */
import { useState } from "react";
import { STAGE_META, PRIORITY_META, SOURCE_LABELS } from "@/utils/formatters";
import { isAdminOrManager } from "@/utils/roles";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/useIsMobile";
import MobileFilterPanel from "@/components/common/MobileFilterPanel";

const STAGES     = Object.keys(STAGE_META);
const PRIORITIES = Object.keys(PRIORITY_META);
const SOURCES    = Object.keys(SOURCE_LABELS);

export default function LeadFilters({ filters, onChange, team = [] }) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [panelOpen, setPanelOpen] = useState(false);
  const canFilter = isAdminOrManager(user);

  const set = (key, val) => onChange({ ...filters, [key]: val || undefined });

  const activeCount = ["stage", "priority", "source", "assigned_to"]
    .filter((k) => filters[k]).length;

  if (isMobile) {
    return (
      <>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="text"
            value={filters.search ?? ""}
            onChange={(e) => set("search", e.target.value)}
            placeholder="Search leads…"
            style={{
              flex: 1, padding: "10px 12px",
              border: "1px solid var(--border)", borderRadius: 3,
              fontSize: 14, minHeight: 40, fontFamily: "inherit", outline: "none",
            }}
          />
          <button
            onClick={() => setPanelOpen(true)}
            style={{
              padding: "0 14px",
              background: activeCount > 0 ? "var(--accent)" : "var(--white)",
              color: activeCount > 0 ? "#fff" : "var(--text)",
              border: "1px solid var(--border2)", borderRadius: 3,
              fontSize: 13, fontWeight: 600, cursor: "pointer",
              minHeight: 40, display: "flex", alignItems: "center", gap: 6,
              whiteSpace: "nowrap", fontFamily: "inherit",
            }}
          >
            🔍 Filters
            {activeCount > 0 && (
              <span style={{
                background: "#fff", color: "var(--accent)", borderRadius: 10,
                padding: "1px 6px", fontSize: 10, fontWeight: 700,
              }}>
                {activeCount}
              </span>
            )}
          </button>
        </div>
        {panelOpen && (
          <MobileFilterPanel
            onClose={() => setPanelOpen(false)}
            onClear={() => { onChange({}); setPanelOpen(false); }}
            onApply={() => setPanelOpen(false)}
          >
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--text2)" }}>Stage</label>
              <select className="form-select"
                value={filters.stage ?? ""}
                onChange={(e) => set("stage", e.target.value)}
                style={{ width: "100%", minHeight: 44, fontSize: 14 }}>
                <option value="">All Stages</option>
                {STAGES.map((s) => (
                  <option key={s} value={s}>{STAGE_META[s]?.label ?? s}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--text2)" }}>Priority</label>
              <select className="form-select"
                value={filters.priority ?? ""}
                onChange={(e) => set("priority", e.target.value)}
                style={{ width: "100%", minHeight: 44, fontSize: 14 }}>
                <option value="">All Priorities</option>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{PRIORITY_META[p].label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--text2)" }}>Source</label>
              <select className="form-select"
                value={filters.source ?? ""}
                onChange={(e) => set("source", e.target.value)}
                style={{ width: "100%", minHeight: 44, fontSize: 14 }}>
                <option value="">All Sources</option>
                {SOURCES.map((s) => (
                  <option key={s} value={s}>{SOURCE_LABELS[s]}</option>
                ))}
              </select>
            </div>
            {canFilter && (
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--text2)" }}>Assigned To</label>
                <select className="form-select"
                  value={filters.assigned_to ?? ""}
                  onChange={(e) => set("assigned_to", e.target.value)}
                  style={{ width: "100%", minHeight: 44, fontSize: 14 }}>
                  <option value="">All Reps</option>
                  <option value="none">Unassigned</option>
                  {team.map((rep) => (
                    <option key={rep.id} value={rep.id}>{rep.full_name}</option>
                  ))}
                </select>
              </div>
            )}
          </MobileFilterPanel>
        )}
      </>
    );
  }

  return (
    <div style={{
      display: "flex", gap: 8, alignItems: "center",
      flexWrap: "wrap",
    }}>
      {/* Search */}
      <div style={{
        display: "flex", alignItems: "center", gap: 7,
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "6px 12px",
        flex: "1", minWidth: 180, maxWidth: 280,
        transition: "border-color 0.15s",
      }}
        onFocusCapture={(e) => e.currentTarget.style.borderColor = "var(--accent)"}
        onBlurCapture={(e)  => e.currentTarget.style.borderColor = "var(--border)"}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
          stroke="var(--text3)" strokeWidth="2.5" style={{ flexShrink: 0 }}>
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
        <input
          value={filters.search ?? ""}
          onChange={(e) => set("search", e.target.value)}
          placeholder="Search leads…"
          style={{
            border: "none", outline: "none", background: "none",
            fontSize: 13, color: "var(--text)", width: "100%",
          }}
        />
        {filters.search && (
          <button
            onClick={() => set("search", "")}
            style={{
              border: "none", background: "none", cursor: "pointer",
              color: "var(--text3)", fontSize: 14, lineHeight: 1, padding: 0,
            }}
          >✕</button>
        )}
      </div>

      {/* Stage filter */}
      <select
        className="form-select"
        value={filters.stage ?? ""}
        onChange={(e) => set("stage", e.target.value)}
        style={{ width: "auto", minWidth: 130 }}
      >
        <option value="">All Stages</option>
        {STAGES.map((s) => (
          <option key={s} value={s}>{STAGE_META[s]?.label ?? s}</option>
        ))}
      </select>

      {/* Priority filter */}
      <select
        className="form-select"
        value={filters.priority ?? ""}
        onChange={(e) => set("priority", e.target.value)}
        style={{ width: "auto", minWidth: 130 }}
      >
        <option value="">All Priorities</option>
        {PRIORITIES.map((p) => (
          <option key={p} value={p}>{PRIORITY_META[p].label}</option>
        ))}
      </select>

      {/* Source filter */}
      <select
        className="form-select"
        value={filters.source ?? ""}
        onChange={(e) => set("source", e.target.value)}
        style={{ width: "auto", minWidth: 130 }}
      >
        <option value="">All Sources</option>
        {SOURCES.map((s) => (
          <option key={s} value={s}>{SOURCE_LABELS[s]}</option>
        ))}
      </select>

      {/* Assigned-to filter — admin/manager only */}
      {canFilter && (
        <select
          className="form-select"
          value={filters.assigned_to ?? ""}
          onChange={(e) => set("assigned_to", e.target.value)}
          style={{ width: "auto", minWidth: 140 }}
        >
          <option value="">All Reps</option>
          <option value="none">Unassigned</option>
          {team.map((rep) => (
            <option key={rep.id} value={rep.id}>{rep.full_name}</option>
          ))}
        </select>
      )}

      {/* Clear all */}
      {Object.values(filters).some(Boolean) && (
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => onChange({})}
          style={{ color: "var(--red)", whiteSpace: "nowrap" }}
        >
          ✕ Clear
        </button>
      )}
    </div>
  );
}