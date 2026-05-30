/**
 * utils/formatters.js
 */
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

// ── Date / time ───────────────────────────────────────────────────────────────

export const formatDate = (date) =>
  date ? dayjs(date).format("DD MMM YYYY") : "—";

export const formatDateTime = (date) =>
  date ? dayjs(date).format("DD MMM YYYY, hh:mm A") : "—";

export const timeAgo = (date) =>
  date ? dayjs(date).fromNow() : "—";

// ── Currency ──────────────────────────────────────────────────────────────────

export const formatCurrency = (value) => {
  if (value === null || value === undefined) return "—";
  const n = Number(value);
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)}Cr`;
  if (n >= 100_000)    return `₹${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000)      return `₹${(n / 1_000).toFixed(0)}K`;
  return `₹${n}`;
};

// ── Lead stage labels + colors ────────────────────────────────────────────────
// STAGE_META and SOURCE_LABELS are derived from src/utils/leadConstants.js — the
// single source of truth for lead stages and sources.
import { STAGES, SOURCES } from "./leadConstants";

export const STAGE_META = Object.fromEntries(
  STAGES.map((s) => [s.value, { label: s.label, color: s.color, bg: s.bg, border: s.border }])
);

export const PRIORITY_META = {
  low:    { label: "Low",    color: "#0A5A28", bg: "#E4F8EE" },
  medium: { label: "Medium", color: "#7A4A00", bg: "#FDF4E0" },
  high:   { label: "High",   color: "#9A1818", bg: "#FCE8E8" },
};

export const SOURCE_LABELS = Object.fromEntries(
  SOURCES.map((s) => [s.value, s.label])
);

export const ACTION_META = {
  // ── Lead actions ───────────────────────────────────────────────────────────
  lead_created:    { label: "Lead Created",    icon: "✦", color: "#1A5A9A" },
  lead_updated:    { label: "Lead Updated",    icon: "✎", color: "#5A5A50" },
  lead_deleted:    { label: "Lead Deleted",    icon: "✕", color: "#9A1818" },
  stage_changed:   { label: "Stage Changed",   icon: "→", color: "#7A4A00" },
  lead_assigned:   { label: "Lead Assigned",   icon: "◎", color: "#6030A0" },
  lead_reassigned: { label: "Lead Reassigned", icon: "⇄", color: "#8A1A50" },
  note_added:      { label: "Note Added",      icon: "✉", color: "#0A5A28" },
  // ── Task actions ───────────────────────────────────────────────────────────
  task_created:        { label: "Task Created",       icon: "☐", color: "#1A60A8" },
  task_completed:      { label: "Task Completed",     icon: "☑", color: "#0A7838" },
  task_reassigned:     { label: "Task Reassigned",    icon: "⇄", color: "#6030A0" },
  leads_bulk_imported: { label: "Bulk Import",        icon: "📥", color: "#7A4A00" },
  // ── Advertiser actions ──────────────────────────────────────────────────────
  advertiser_created:  { label: "Advertiser Created",  icon: "◈", color: "#1A5A9A" },
  advertiser_updated:  { label: "Advertiser Updated",  icon: "✎", color: "#1A5A9A" },
  advertiser_deleted:  { label: "Advertiser Deleted",  icon: "✕", color: "#C03030" },
  advertiser_approved: { label: "Advertiser Approved", icon: "✓", color: "#0A7838" },
  advertiser_rejected: { label: "Advertiser Rejected", icon: "✗", color: "#C03030" },
  // ── Publisher actions ───────────────────────────────────────────────────────
  publisher_created:   { label: "Publisher Created",   icon: "◈", color: "#0A7838" },
  publisher_updated:   { label: "Publisher Updated",   icon: "✎", color: "#0A7838" },
  publisher_deleted:   { label: "Publisher Deleted",   icon: "✕", color: "#C03030" },
  publisher_approved:  { label: "Publisher Approved",  icon: "✓", color: "#0A7838" },
  publisher_rejected:  { label: "Publisher Rejected",  icon: "✗", color: "#C03030" },
};

// ── String helpers ─────────────────────────────────────────────────────────────

export const initials = (name) => {
  if (!name) return "?";
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
};

export const truncate = (str, length = 60) => {
  if (!str) return "";
  return str.length > length ? str.slice(0, length) + "…" : str;
};


// ── Task metadata ─────────────────────────────────────────────────────────────

export const TASK_STATUS_META = {
  pending:     { label: "Pending",     color: "#1A5A9A", bg: "#E8F2FC", border: "#A8C8F0" },
  in_progress: { label: "In Progress", color: "#7A4A00", bg: "#FDF4E0", border: "#F0D080" },
  completed:   { label: "Completed",   color: "#0A5A28", bg: "#E4F8EE", border: "#80D8A8" },
  cancelled:   { label: "Cancelled",   color: "#8A1A1A", bg: "#FCE8E8", border: "#F0A8A8" },
};

export const TASK_PRIORITY_META = {
  low:    { label: "Low",    color: "#0A5A28", bg: "#E4F8EE", border: "#80D8A8" },
  medium: { label: "Medium", color: "#7A4A00", bg: "#FDF4E0", border: "#F0D080" },
  high:   { label: "High",   color: "#9A1818", bg: "#FCE8E8", border: "#F0A8A8" },
};