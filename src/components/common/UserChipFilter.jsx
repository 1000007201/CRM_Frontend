/**
 * components/common/UserChipFilter.jsx
 *
 * Props-based chip filter — same visual as UserFilterBar but driven by
 * local state rather than UserFilterContext, so each page gets independent
 * selection (Pipeline uses UserFilterBar/context; Activity uses this).
 */
import { useAuth }          from "@/hooks/useAuth";
import { isAdminOrManager } from "@/utils/roles";

const PALETTE = [
  { bg: "#FDF0D8", color: "#A06010" },
  { bg: "#E0EEFA", color: "#1A60A8" },
  { bg: "#E0F8EC", color: "#0A7838" },
  { bg: "#EEE0F8", color: "#6030A0" },
  { bg: "#FCE8E8", color: "#8A1A1A" },
];
const getPalette = (name = "") => PALETTE[name.charCodeAt(0) % PALETTE.length];

/**
 * @param {object[]}  tls           — team-lead users
 * @param {object[]}  members       — member users
 * @param {Set}       selectedIds   — Set of selected UUIDs
 * @param {function}  onToggleTL    — (tl: user) => void
 * @param {function}  onToggleMember — (member: user) => void
 * @param {function}  onClearAll    — () => void
 */
export default function UserChipFilter({
  tls = [],
  members = [],
  selectedIds,
  onToggleTL,
  onToggleMember,
  onClearAll,
}) {
  const { user } = useAuth();

  if (!isAdminOrManager(user)) return null;
  if (tls.length === 0 && members.length === 0) return null;

  const hasSelection = selectedIds.size > 0;

  return (
    <div style={{
      display:    "flex",
      alignItems: "center",
      gap:        6,
      padding:    "8px 14px",
      background: hasSelection ? "var(--accent-lt)" : "var(--surface)",
      border:     `1px solid ${hasSelection ? "#F0D080" : "var(--border)"}`,
      borderRadius: 4,
      marginBottom: 14,
      flexWrap:   "wrap",
      transition: "all 0.15s",
    }}>
      <span style={{
        fontSize:      9,
        fontWeight:    700,
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        color:         "var(--text3)",
        marginRight:   4,
        flexShrink:    0,
      }}>
        Filter
      </span>

      {tls.map((tl) => (
        <UserChip
          key={tl.id}
          user={tl}
          selected={selectedIds.has(tl.id)}
          isTL
          onClick={() => onToggleTL(tl)}
        />
      ))}

      {tls.length > 0 && members.length > 0 && (
        <div style={{
          width:      1,
          height:     28,
          background: "var(--border2)",
          margin:     "0 6px",
          flexShrink: 0,
        }} />
      )}

      {members.map((member) => (
        <UserChip
          key={member.id}
          user={member}
          selected={selectedIds.has(member.id)}
          isTL={false}
          onClick={() => onToggleMember(member)}
        />
      ))}

      {hasSelection && (
        <button
          onClick={onClearAll}
          style={{
            marginLeft:  "auto",
            padding:     "3px 10px",
            borderRadius: 3,
            border:      "1px solid var(--border2)",
            background:  "none",
            fontSize:    10,
            fontWeight:  600,
            color:       "var(--red)",
            cursor:      "pointer",
            fontFamily:  "inherit",
            flexShrink:  0,
          }}
        >
          ✕ Clear
        </button>
      )}
    </div>
  );
}

function UserChip({ user, selected, isTL, onClick }) {
  const p         = getPalette(user.full_name);
  const firstName = user.full_name.split(" ")[0];
  const initials  = user.full_name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <button
      onClick={onClick}
      title={`${user.full_name} · ${user.display_role ?? user.role}`}
      style={{
        display:    "flex",
        alignItems: "center",
        gap:        5,
        padding:    isTL ? "4px 10px 4px 4px" : "3px 9px 3px 4px",
        borderRadius: 20,
        border:     selected ? `2px solid ${p.color}` : "2px solid var(--border)",
        background: selected ? p.bg : "var(--white)",
        cursor:     "pointer",
        fontFamily: "inherit",
        transition: "all 0.13s",
        flexShrink: 0,
        userSelect: "none",
        boxShadow:  selected ? `0 0 0 1px ${p.color}30` : "none",
      }}
    >
      <div style={{
        width:       isTL ? 22 : 19,
        height:      isTL ? 22 : 19,
        borderRadius: "50%",
        background:  selected ? p.bg : "var(--surface)",
        border:      `1.5px solid ${selected ? p.color : "var(--border2)"}`,
        display:     "flex",
        alignItems:  "center",
        justifyContent: "center",
        fontSize:    8,
        fontWeight:  800,
        color:       p.color,
        flexShrink:  0,
      }}>
        {initials}
      </div>

      <span style={{
        fontSize:   isTL ? 11 : 10,
        fontWeight: selected ? 700 : 500,
        color:      selected ? p.color : "var(--text2)",
      }}>
        {firstName}
      </span>

      {isTL && (
        <span style={{
          fontSize:      7,
          fontWeight:    800,
          color:         selected ? p.color : "var(--text3)",
          background:    selected ? p.color + "20" : "transparent",
          padding:       "0px 3px",
          borderRadius:  2,
          letterSpacing: "0.05em",
        }}>
          TL
        </span>
      )}
    </button>
  );
}
