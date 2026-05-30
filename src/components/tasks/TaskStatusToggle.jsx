/**
 * components/tasks/TaskStatusToggle.jsx
 *
 * A single button that toggles a task between:
 *   pending/in_progress → completed  (shows a checkmark)
 *   completed           → pending    (shows a reopen icon)
 *
 * Used inline inside TaskCard and the Lead Detail tasks tab.
 * Stops click propagation so it doesn't trigger row/card navigation.
 */
import { useState } from "react";
import { useToast }            from "@/components/common/Toast";
import { useToggleTaskComplete } from "@/hooks/useTasks";

export default function TaskStatusToggle({ task, size = "md" }) {
  const toast   = useToast();
  const toggle  = useToggleTaskComplete();
  const [busy, setBusy] = useState(false);

  const isCompleted = task.status === "completed";
  const isCancelled = task.status === "cancelled";

  const dim = size === "sm" ? 20 : 24;
  const iconSize = size === "sm" ? 11 : 13;

  const handleClick = async (e) => {
    e.stopPropagation();
    if (isCancelled || busy) return;
    setBusy(true);
    try {
      await toggle.mutateAsync(task.id);
      toast.success(isCompleted ? "Task reopened." : "Task completed!");
    } catch {
      toast.error("Could not update task.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isCancelled || busy}
      title={
        isCancelled  ? "Cancelled — cannot change"
        : isCompleted ? "Click to reopen"
        : "Click to mark complete"
      }
      style={{
        width:          dim,
        height:         dim,
        borderRadius:   3,
        border:         isCompleted
          ? "1.5px solid #80D8A8"
          : isCancelled
          ? "1.5px solid var(--border2)"
          : "1.5px solid var(--border2)",
        background:     isCompleted
          ? "#E4F8EE"
          : "var(--white)",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        cursor:         isCancelled ? "not-allowed" : "pointer",
        transition:     "all 0.12s",
        opacity:        busy ? 0.5 : 1,
        flexShrink:     0,
      }}
      onMouseEnter={(e) => {
        if (isCancelled || busy) return;
        if (isCompleted) {
          e.currentTarget.style.background   = "#FCE8E8";
          e.currentTarget.style.borderColor  = "#F0A8A8";
        } else {
          e.currentTarget.style.background   = "#E4F8EE";
          e.currentTarget.style.borderColor  = "#80D8A8";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background  = isCompleted ? "#E4F8EE" : "var(--white)";
        e.currentTarget.style.borderColor = isCompleted ? "#80D8A8" : "var(--border2)";
      }}
    >
      {busy ? (
        <div style={{
          width: dim * 0.5, height: dim * 0.5,
          border: "1.5px solid var(--border2)",
          borderTopColor: "var(--accent)",
          borderRadius: "50%",
          animation: "spin 0.5s linear infinite",
        }} />
      ) : isCompleted ? (
        <svg width={iconSize} height={iconSize} viewBox="0 0 12 12" fill="none">
          <path d="M2 6L5 9L10 3" stroke="#18A858" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ) : isCancelled ? (
        <svg width={iconSize} height={iconSize} viewBox="0 0 12 12" fill="none">
          <path d="M3 3L9 9M9 3L3 9" stroke="var(--text3)" strokeWidth="1.5"
            strokeLinecap="round"/>
        </svg>
      ) : (
        /* Empty circle — click to complete */
        null
      )}
    </button>
  );
}