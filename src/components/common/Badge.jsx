/**
 * components/common/Badge.jsx
 *
 * Flat rectangular badges — borderRadius: 3px, with border.
 * Stage colors are exact matches of the reference SC object.
 */
import { ROLE_LABELS } from "@/utils/roles";
import { getStageInfo, STAGE_MAP } from "@/utils/leadConstants";

/* Stage colours come from src/utils/leadConstants.js (single source of truth) */
const STAGE_COLORS = STAGE_MAP;

const PRIORITY_COLORS = {
  high:   { bg: "#FCE8E8", color: "#9A1818", border: "#F0A8A8" },
  medium: { bg: "#FDF4E0", color: "#7A4A00", border: "#F0D080" },
  low:    { bg: "#E4F8EE", color: "#0A5A28", border: "#80D8A8" },
};

const ROLE_COLORS = {
  admin:          { bg: "#E8E8E0", color: "#5A5A50", border: "#C8C8B8" },
  manager:        { bg: "#FDF0D8", color: "#A06010", border: "#F0C878" },
  sales_employee: { bg: "#E0F8EC", color: "#0A7838", border: "#80D8A0" },
};

/* ── Stage badge ─────────────────────────────────────────────────────────── */
export function StageBadge({ stage }) {
  const s = getStageInfo(stage);
  return (
    <span style={{
      display:       "inline-flex",
      alignItems:    "center",
      gap:           4,
      padding:       "2px 7px",
      borderRadius:  3,
      fontSize:      10,
      fontWeight:    500,
      background:    s.bg,
      color:         s.color,
      border:        `1px solid ${s.border}`,
      whiteSpace:    "nowrap",
    }}>
      <span style={{
        width: 4, height: 4, borderRadius: "50%",
        background: s.color, flexShrink: 0,
      }} />
      {s.label}
    </span>
  );
}

/* ── Priority badge ──────────────────────────────────────────────────────── */
export function PriorityBadge({ priority }) {
  const p = PRIORITY_COLORS[priority] ?? { bg: "#F0EFE8", color: "#7A7A6E", border: "#C8C6BE" };
  return (
    <span style={{
      display:      "inline-block",
      padding:      "1px 6px",
      borderRadius: 3,
      fontSize:     10,
      fontWeight:   500,
      background:   p.bg,
      color:        p.color,
      border:       `1px solid ${p.border}`,
      whiteSpace:   "nowrap",
    }}>
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </span>
  );
}

/* ── Role badge ──────────────────────────────────────────────────────────── */
export function RoleBadge({ role }) {
  const r = ROLE_COLORS[role] ?? { bg: "#F0EFE8", color: "#7A7A6E", border: "#C8C6BE" };
  return (
    <span style={{
      display:      "inline-block",
      padding:      "1px 6px",
      borderRadius: 3,
      fontSize:     9,
      fontWeight:   500,
      background:   r.bg,
      color:        r.color,
      border:       `1px solid ${r.border}`,
      textTransform: "uppercase",
      letterSpacing: "0.06em",
      whiteSpace:   "nowrap",
    }}>
      {ROLE_LABELS[role] ?? role}
    </span>
  );
}

/* ── Generic badge ───────────────────────────────────────────────────────── */
export function Badge({ label, color, bg, border }) {
  return (
    <span style={{
      display:      "inline-block",
      padding:      "2px 7px",
      borderRadius: 3,
      fontSize:     10,
      fontWeight:   500,
      background:   bg,
      color,
      border:       `1px solid ${border ?? color + "44"}`,
      whiteSpace:   "nowrap",
    }}>
      {label}
    </span>
  );
}

/* Export stage colors for use in other components */
export { STAGE_COLORS, PRIORITY_COLORS };