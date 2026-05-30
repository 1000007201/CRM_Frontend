/**
 * utils/leadConstants.js
 *
 * Canonical source of truth for lead stages and sources.
 * Import from here everywhere instead of duplicating the lists.
 *
 * Each stage has:
 *   value  — backend enum value
 *   label  — human-readable label
 *   color  — primary text/accent color
 *   bg     — light background tint (for badges, cards)
 *   border — medium border color (for badges)
 */

export const STAGES = [
  { value: "raw",                label: "Raw",               color: "#6B7280", bg: "#F3F4F6", border: "#D1D5DB" },
  { value: "new",                label: "New",               color: "#3B82F6", bg: "#DBEAFE", border: "#93C5FD" },
  { value: "contact_attempted",  label: "Contact Attempted", color: "#06B6D4", bg: "#CFFAFE", border: "#67E8F9" },
  { value: "connected",          label: "Connected",         color: "#10B981", bg: "#D1FAE5", border: "#6EE7B7" },
  { value: "no_response",        label: "No Response",       color: "#8B5CF6", bg: "#EDE9FE", border: "#C4B5FD" },
  { value: "meeting_scheduled",  label: "Meeting Scheduled", color: "#0EA5E9", bg: "#E0F2FE", border: "#7DD3FC" },
  { value: "converted",          label: "Converted",         color: "#16A34A", bg: "#BBF7D0", border: "#4ADE80" },
  { value: "lost",               label: "Lost",              color: "#DC2626", bg: "#FEE2E2", border: "#FCA5A5" },
];

export const SOURCES = [
  { value: "linkedin",          label: "LinkedIn"         },
  { value: "referral",          label: "Referral"         },
  { value: "event_conference",  label: "Event/Conference" },
  { value: "network",           label: "Network"          },
];

// ── Lookup maps ────────────────────────────────────────────────────────────
export const STAGE_MAP  = Object.fromEntries(STAGES.map((s) => [s.value, s]));
export const SOURCE_MAP = Object.fromEntries(SOURCES.map((s) => [s.value, s]));

// ── Safe getters (always return a valid object, never undefined) ──────────
const STAGE_FALLBACK  = { value: "_unknown", label: "Unknown", color: "#9CA3AF", bg: "#F3F4F6", border: "#D1D5DB" };
const SOURCE_FALLBACK = { value: "_unknown", label: "Unknown" };

export const getStageInfo  = (value) => STAGE_MAP[value]  ?? { ...STAGE_FALLBACK,  value, label: value || STAGE_FALLBACK.label  };
export const getSourceInfo = (value) => SOURCE_MAP[value] ?? { ...SOURCE_FALLBACK, value, label: value || SOURCE_FALLBACK.label };

// ── Subsets used by workload / dashboard cards ────────────────────────────
// "Active" = anything not yet closed (converted/lost are terminal).
export const ACTIVE_STAGE_VALUES   = STAGES.filter((s) => s.value !== "converted" && s.value !== "lost").map((s) => s.value);
export const TERMINAL_STAGE_VALUES = ["converted", "lost"];
