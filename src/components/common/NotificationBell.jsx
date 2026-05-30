/**
 * components/common/NotificationBell.jsx
 *
 * Bell icon in the navbar that shows unread notification count.
 * Click opens a dropdown with the 20 most recent notifications.
 *
 * Features:
 *   - Live unread count badge (polls every 30s)
 *   - Dropdown lists notifications newest first
 *   - Click notification → navigate to record + mark as read
 *   - Mark All Read button
 *   - Close on outside click
 *   - Colour-coded by notification type
 */
import { useState, useRef, useEffect } from "react";
import { useNavigate }                  from "react-router-dom";
import {
  useUnreadCount,
  useNotifications,
  useMarkRead,
  useMarkAllRead,
} from "@/hooks/useNotifications";

// ── Notification type metadata ────────────────────────────────────────────────
const NOTIF_META = {
  advertiser_pending:  { icon: "⏳", color: "#A06010", bg: "#FDF4E0", label: "Pending" },
  advertiser_approved: { icon: "✓",  color: "#0A7838", bg: "#E4F8EE", label: "Approved" },
  advertiser_rejected: { icon: "✗",  color: "#8A1A1A", bg: "#FCE8E8", label: "Rejected" },
  advertiser_resubmit: { icon: "↻",  color: "#1A5A9A", bg: "#E0EEFA", label: "Resubmitted" },
  publisher_pending:   { icon: "⏳", color: "#A06010", bg: "#FDF4E0", label: "Pending" },
  publisher_approved:  { icon: "✓",  color: "#0A7838", bg: "#E4F8EE", label: "Approved" },
  publisher_rejected:  { icon: "✗",  color: "#8A1A1A", bg: "#FCE8E8", label: "Rejected" },
  publisher_resubmit:  { icon: "↻",  color: "#1A5A9A", bg: "#E0EEFA", label: "Resubmitted" },
};

const DEFAULT_META = { icon: "•", color: "var(--text3)", bg: "var(--surface)", label: "" };

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60)   return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotificationBell() {
  const navigate    = useNavigate();
  const [open, setOpen] = useState(false);
  const bellRef     = useRef(null);

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data: unreadCount = 0 } = useUnreadCount();
  const { data: notifications = [], isLoading } = useNotifications(
    open ? { page_size: 20 } : { skip: true }  // only fetch when open
  );
  const markRead    = useMarkRead();
  const markAllRead = useMarkAllRead();

  // ── Close on outside click ─────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleNotifClick = async (notif) => {
    // Mark read
    if (!notif.is_read) {
      markRead.mutate(notif.id);
    }
    setOpen(false);
    // Navigate to the related record
    if (notif.related_model === "advertiser") {
      navigate(`/advertisers/${notif.related_id}`);
    } else if (notif.related_model === "publisher") {
      navigate(`/publishers/${notif.related_id}`);
    }
  };

  const handleMarkAllRead = () => {
    markAllRead.mutate();
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div ref={bellRef} style={{ position: "relative", flexShrink: 0 }}>

      {/* Bell button */}
      <button
        onClick={() => setOpen((v) => !v)}
        title="Notifications"
        style={{
          position:   "relative",
          display:    "flex",
          alignItems: "center",
          justifyContent: "center",
          width:      34,
          height:     34,
          borderRadius: "50%",
          border:     "none",
          background: open ? "var(--surface)" : "none",
          cursor:     "pointer",
          fontSize:   16,
          transition: "background 0.13s",
          flexShrink: 0,
        }}
      >
        🔔
        {/* Unread badge */}
        {unreadCount > 0 && (
          <span style={{
            position:     "absolute",
            top:          2,
            right:        2,
            minWidth:     14,
            height:       14,
            borderRadius: 7,
            background:   "#C03030",
            color:        "#fff",
            fontSize:     8,
            fontWeight:   800,
            display:      "flex",
            alignItems:   "center",
            justifyContent: "center",
            padding:      "0 3px",
            border:       "1.5px solid var(--white)",
            lineHeight:   1,
          }}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position:     "absolute",
          top:          "calc(100% + 8px)",
          right:        0,
          width:        340,
          maxHeight:    480,
          background:   "var(--white)",
          border:       "1px solid var(--border)",
          borderRadius: 5,
          boxShadow:    "0 8px 24px rgba(0,0,0,0.12)",
          zIndex:       300,
          display:      "flex",
          flexDirection: "column",
          overflow:     "hidden",
        }}>

          {/* Header */}
          <div style={{
            display:     "flex",
            alignItems:  "center",
            justifyContent: "space-between",
            padding:     "12px 14px 10px",
            borderBottom: "1px solid var(--border)",
            flexShrink:  0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
                Notifications
              </p>
              {unreadCount > 0 && (
                <span style={{
                  fontSize:     9,
                  fontWeight:   800,
                  padding:      "1px 6px",
                  borderRadius: 3,
                  background:   "#C03030",
                  color:        "#fff",
                }}>
                  {unreadCount} unread
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={markAllRead.isPending}
                style={{
                  fontSize:   10,
                  fontWeight: 600,
                  color:      "var(--accent)",
                  background: "none",
                  border:     "none",
                  cursor:     "pointer",
                  fontFamily: "inherit",
                  padding:    "2px 0",
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {isLoading ? (
              <div style={{
                padding: "24px 0", textAlign: "center",
                fontSize: 12, color: "var(--text3)",
              }}>
                Loading…
              </div>
            ) : notifications.length === 0 ? (
              <div style={{
                padding: "32px 16px", textAlign: "center",
              }}>
                <p style={{ fontSize: 24, marginBottom: 6 }}>🔔</p>
                <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text2)" }}>
                  All caught up!
                </p>
                <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 3 }}>
                  No notifications yet.
                </p>
              </div>
            ) : (
              notifications.map((notif) => (
                <NotifItem
                  key={notif.id}
                  notif={notif}
                  onClick={() => handleNotifClick(notif)}
                />
              ))
            )}
          </div>

        </div>
      )}
    </div>
  );
}

// ── Single notification item ──────────────────────────────────────────────────
function NotifItem({ notif, onClick }) {
  const [hov, setHov] = useState(false);
  const meta = NOTIF_META[notif.notification_type] ?? DEFAULT_META;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display:    "flex",
        alignItems: "flex-start",
        gap:        10,
        padding:    "10px 14px",
        cursor:     "pointer",
        background: hov
          ? "var(--surface)"
          : notif.is_read
          ? "transparent"
          : meta.bg + "60",
        borderBottom:  "1px solid var(--border)",
        transition:    "background 0.1s",
        position:      "relative",
      }}
    >
      {/* Unread dot */}
      {!notif.is_read && (
        <div style={{
          position:   "absolute",
          left:       4,
          top:        "50%",
          transform:  "translateY(-50%)",
          width:      4,
          height:     4,
          borderRadius: "50%",
          background: meta.color,
          flexShrink: 0,
        }} />
      )}

      {/* Icon */}
      <div style={{
        width:          28,
        height:         28,
        borderRadius:   "50%",
        background:     meta.bg,
        border:         `1px solid ${meta.color}30`,
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        fontSize:       13,
        flexShrink:     0,
        color:          meta.color,
        fontWeight:     700,
      }}>
        {meta.icon}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Record name */}
        <p style={{
          fontSize:     11,
          fontWeight:   notif.is_read ? 500 : 700,
          color:        "var(--text)",
          marginBottom: 1,
          overflow:     "hidden",
          textOverflow: "ellipsis",
          whiteSpace:   "nowrap",
        }}>
          {notif.related_name || "Record"}
        </p>
        {/* Message */}
        <p style={{
          fontSize:    10,
          color:       "var(--text2)",
          lineHeight:  1.4,
          marginBottom: 3,
          display:     "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow:    "hidden",
        }}>
          {notif.message}
        </p>
        {/* Meta row */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{
            fontSize:     8,
            fontWeight:   700,
            padding:      "0px 5px",
            borderRadius: 2,
            background:   meta.bg,
            color:        meta.color,
            border:       `1px solid ${meta.color}30`,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}>
            {notif.related_model}
          </span>
          {notif.actor_name && (
            <span style={{ fontSize: 9, color: "var(--text3)" }}>
              by {notif.actor_name}
            </span>
          )}
          <span style={{ fontSize: 9, color: "var(--text3)", marginLeft: "auto" }}>
            {timeAgo(notif.created_at)}
          </span>
        </div>
      </div>
    </div>
  );
}