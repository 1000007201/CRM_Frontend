/**
 * components/leads/AssignmentHistory.jsx
 *
 * Shows every assignment/reassignment event for this lead,
 * newest first. Useful for tracking handoff chains.
 */
import Avatar   from "@/components/common/Avatar";
import Spinner  from "@/components/common/Spinner";
import EmptyState from "@/components/common/EmptyState";
import { useAssignmentHistory } from "@/hooks/useLeads";
import { formatDateTime, timeAgo } from "@/utils/formatters";

export default function AssignmentHistory({ leadId }) {
  const { data: history = [], isLoading } = useAssignmentHistory(leadId);

  if (isLoading) return <Spinner center />;

  if (!history.length) return (
    <EmptyState
      icon="◎"
      title="Never assigned"
      subtitle="This lead hasn't been assigned to anyone yet"
    />
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {history.map((record, idx) => (
        <AssignmentCard key={record.id} record={record} isLatest={idx === 0} />
      ))}
    </div>
  );
}

function AssignmentCard({ record, isLatest }) {
  return (
    <div style={{
      background:   isLatest ? "var(--accent-lt)" : "var(--surface)",
      border:       `1px solid ${isLatest ? "#F0D080" : "var(--border)"}`,
      borderRadius: 4,
      padding:      "14px 16px",
    }}>
      {/* Header */}
      <div style={{
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        marginBottom:   10,
      }}>
        <span style={{
          fontSize:     10,
          fontWeight:   700,
          color:        isLatest ? "var(--accent)" : "var(--text3)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}>
          {isLatest ? "Current Assignment" : "Previous Assignment"}
        </span>
        <span
          title={formatDateTime(record.assigned_at)}
          style={{ fontSize: 11, color: "var(--text3)", cursor: "help" }}
        >
          {timeAgo(record.assigned_at)}
        </span>
      </div>

      {/* Assigned to */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <Avatar name={record.assigned_to_detail?.full_name ?? "?"} size={32} />
        <div>
          <p style={{ fontSize: 13, fontWeight: 700 }}>
            {record.assigned_to_detail?.full_name ?? "Unknown"}
          </p>
          <p style={{ fontSize: 11, color: "var(--text3)" }}>
            {record.assigned_to_detail?.email}
          </p>
        </div>
      </div>

      {/* Assignment details */}
      <div style={{
        display:  "flex",
        gap:      16,
        fontSize: 11,
        color:    "var(--text3)",
        flexWrap: "wrap",
      }}>
        {record.assigned_by_detail && (
          <span>
            Assigned by{" "}
            <strong style={{ color: "var(--text2)" }}>
              {record.assigned_by_detail.full_name}
            </strong>
          </span>
        )}
        {record.previous_assignee_detail && (
          <span>
            From{" "}
            <strong style={{ color: "var(--text2)" }}>
              {record.previous_assignee_detail.full_name}
            </strong>
          </span>
        )}
      </div>

      {/* Note */}
      {record.note && (
        <div style={{
          marginTop:    10,
          padding:      "8px 12px",
          background:   "var(--white)",
          border:       "1px solid var(--border)",
          borderLeft:   "3px solid var(--accent)",
          borderRadius: "var(--radius)",
          fontSize:     12,
          color:        "var(--text2)",
          fontStyle:    "italic",
        }}>
          "{record.note}"
        </div>
      )}
    </div>
  );
}