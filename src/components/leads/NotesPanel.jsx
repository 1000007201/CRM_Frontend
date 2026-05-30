/**
 * components/leads/NotesPanel.jsx
 *
 * Displays all notes on a lead and lets users add new ones.
 * Notes are immutable once created (append-only).
 */
import { useState } from "react";
import Avatar       from "@/components/common/Avatar";
import Spinner      from "@/components/common/Spinner";
import EmptyState   from "@/components/common/EmptyState";
import { useToast } from "@/components/common/Toast";
import { useLeadNotes, useAddNote } from "@/hooks/useLeads";
import { formatDateTime }           from "@/utils/formatters";

export default function NotesPanel({ leadId }) {
  const toast = useToast();
  const [text, setText] = useState("");

  const { data: notes = [], isLoading } = useLeadNotes(leadId);
  const addMutation = useAddNote();

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    try {
      await addMutation.mutateAsync({ leadId, content: trimmed });
      setText("");
      toast.success("Note added!");
    } catch {
      toast.error("Could not add note.");
    }
  };

  const handleKeyDown = (e) => {
    // Ctrl/Cmd + Enter to submit
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleSubmit();
  };

  return (
    <div>
      {/* Section header */}
      <div style={{
        display: "flex", alignItems: "center",
        justifyContent: "space-between", marginBottom: 14,
      }}>
        <p style={{
          fontSize: 10, fontWeight: 700, color: "var(--text3)",
          textTransform: "uppercase", letterSpacing: "0.09em",
        }}>
          Notes
        </p>
        <span style={{
          fontSize: 11, color: "var(--text3)",
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 3, padding: "1px 8px",
        }}>
          {notes.length}
        </span>
      </div>

      {/* Input area */}
      <div style={{
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: 4, overflow: "hidden",
        marginBottom: 16,
        transition: "border-color 0.15s",
      }}
        onFocusCapture={(e) => e.currentTarget.style.borderColor = "var(--accent)"}
        onBlurCapture={(e)  => e.currentTarget.style.borderColor = "var(--border)"}
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a note… (Ctrl+Enter to submit)"
          rows={3}
          style={{
            width: "100%", border: "none", outline: "none",
            padding: "12px 14px", background: "none",
            fontSize: 13, color: "var(--text)",
            lineHeight: 1.6, resize: "none",
            fontFamily: "inherit",
          }}
        />
        <div style={{
          display: "flex", alignItems: "center",
          justifyContent: "flex-end",
          padding: "8px 12px",
          borderTop: "1px solid var(--border)",
          background: "var(--white)",
        }}>
          <span style={{ fontSize: 11, color: "var(--text3)", marginRight: "auto" }}>
            Ctrl + Enter to save
          </span>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleSubmit}
            disabled={!text.trim() || addMutation.isPending}
          >
            {addMutation.isPending ? "Adding…" : "Add Note"}
          </button>
        </div>
      </div>

      {/* Notes list */}
      {isLoading ? (
        <Spinner center />
      ) : notes.length === 0 ? (
        <EmptyState
          icon="✉"
          title="No notes yet"
          subtitle="Add a note to record important details or follow-ups"
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[...notes].reverse().map((note) => (
            <NoteCard key={note.id} note={note} />
          ))}
        </div>
      )}
    </div>
  );
}

function NoteCard({ note }) {
  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 4,
      padding: "14px 16px",
    }}>
      {/* Author row */}
      <div style={{
        display: "flex", alignItems: "center",
        gap: 8, marginBottom: 10,
      }}>
        <Avatar name={note.author_name ?? "?"} size={26} />
        <div>
          <p style={{ fontSize: 12, fontWeight: 700 }}>
            {note.author_name ?? "Unknown"}
          </p>
          <p style={{ fontSize: 10, color: "var(--text3)" }}>
            {note.author_role?.replace("_", " ")} · {formatDateTime(note.created_at)}
          </p>
        </div>
      </div>

      {/* Content */}
      <p style={{
        fontSize: 13, color: "var(--text)",
        lineHeight: 1.65, whiteSpace: "pre-wrap",
      }}>
        {note.content}
      </p>
    </div>
  );
}