/**
 * components/leads/LeadTable.jsx
 *
 * Full leads data table with:
 *  - Sortable columns
 *  - Role-aware action buttons (Edit, Assign, Delete)
 *  - Inline stage selector
 *  - Row click → navigate to detail page
 */
import { useNavigate } from "react-router-dom";
import { PriorityBadge } from "@/components/common/Badge";
import Avatar            from "@/components/common/Avatar";
import EmptyState        from "@/components/common/EmptyState";
import Spinner           from "@/components/common/Spinner";
import StageSelect       from "./StageSelect";
import { timeAgo, SOURCE_LABELS } from "@/utils/formatters";
import { isAdminOrManager }       from "@/utils/roles";
import { useAuth }                from "@/hooks/useAuth";
import { useIsMobile }            from "@/hooks/useIsMobile";
import { useSortable }            from "@/hooks/useSortable";
import SortableHeader             from "@/components/common/SortableHeader";

export default function LeadTable({
  leads = [],
  loading,
  onEdit,
  onAssign,
  onDelete,
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const canManage = isAdminOrManager(user);
  const { sortedData, sortBy, sortDir, toggleSort } = useSortable(leads);

  if (loading) return <Spinner center />;

  if (!leads.length) return (
    <EmptyState
      icon="◈"
      title="No leads found"
      subtitle="Try adjusting your filters or create a new lead"
    />
  );

  if (isMobile) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 12 }}>
        {sortedData.map((lead) => (
          <div
            key={lead.id}
            onClick={() => navigate(`/leads/${lead.id}`)}
            style={{
              padding: "12px 14px",
              background: "var(--white)",
              border: "1px solid var(--border)",
              borderRadius: 4, cursor: "pointer",
              boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
              <div style={{
                fontSize: 14, fontWeight: 600, color: "var(--text)",
                flex: 1, minWidth: 0,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {lead.contact_name || lead.title || "—"}
              </div>
              <div onClick={(e) => e.stopPropagation()}>
                <StageSelect lead={lead} />
              </div>
            </div>
            {lead.company && (
              <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 4, wordBreak: "break-word" }}>
                🏢 {lead.company}
              </div>
            )}
            <div style={{ fontSize: 11, color: "var(--text3)", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              {lead.priority && <PriorityBadge priority={lead.priority} />}
              {lead.value != null && <span>💰 {lead.value}</span>}
              {lead.source && <span>{SOURCE_LABELS[lead.source] ?? lead.source}</span>}
              {lead.assigned_to_name && <span>👤 {lead.assigned_to_name}</span>}
              {lead.updated_at && <span>· {timeAgo(lead.updated_at)}</span>}
            </div>
            {canManage && (
              <div style={{ marginTop: 8, display: "flex", gap: 6 }} onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => onEdit?.(lead)}
                  style={{
                    flex: 1, minHeight: 36,
                    background: "var(--white)", border: "1px solid var(--border)",
                    borderRadius: 3, fontSize: 12, fontWeight: 600,
                    color: "var(--accent)", cursor: "pointer", fontFamily: "inherit",
                  }}
                >Edit</button>
                <button
                  onClick={() => onAssign?.(lead)}
                  style={{
                    flex: 1, minHeight: 36,
                    background: "var(--white)", border: "1px solid var(--border)",
                    borderRadius: 3, fontSize: 12, fontWeight: 600,
                    color: "var(--text2)", cursor: "pointer", fontFamily: "inherit",
                  }}
                >Assign</button>
                <button
                  onClick={() => onDelete?.(lead)}
                  style={{
                    flex: 1, minHeight: 36,
                    background: "var(--white)", border: "1px solid var(--border)",
                    borderRadius: 3, fontSize: 12, fontWeight: 600,
                    color: "#C03030", cursor: "pointer", fontFamily: "inherit",
                  }}
                >Delete</button>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <SortableHeader label="Lead"        column="contact_name"     sortBy={sortBy} sortDir={sortDir} onToggle={toggleSort} />
            <SortableHeader label="Stage"       column="stage"            sortBy={sortBy} sortDir={sortDir} onToggle={toggleSort} />
            <SortableHeader label="Priority"    column="priority"         sortBy={sortBy} sortDir={sortDir} onToggle={toggleSort} />
            <SortableHeader label="Source"      column="source"           sortBy={sortBy} sortDir={sortDir} onToggle={toggleSort} />
            <SortableHeader label="Assigned To" column="assigned_to_name" sortBy={sortBy} sortDir={sortDir} onToggle={toggleSort} />
            <SortableHeader label="Created"     column="created_at"       sortBy={sortBy} sortDir={sortDir} onToggle={toggleSort} />
            <th style={{ textAlign: "right" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sortedData.map((lead) => (
            <LeadRow
              key={lead.id}
              lead={lead}
              canManage={canManage}
              onRowClick={() => navigate(`/leads/${lead.id}`)}
              onEdit={onEdit}
              onAssign={onAssign}
              onDelete={onDelete}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LeadRow({ lead, canManage, onRowClick, onEdit, onAssign, onDelete }) {
  return (
    <tr
      style={{ cursor: "pointer" }}
      onClick={onRowClick}
    >
      {/* Lead contact + company */}
      <td>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Avatar name={lead.contact_name} size={32} />
          <div>
            <p style={{ fontWeight: 600, fontSize: 13 }}>{lead.contact_name}</p>
            <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 1 }}>
              {lead.company || lead.title}
            </p>
          </div>
        </div>
      </td>

      {/* Stage — inline selector for admin/manager, badge for employee */}
      <td onClick={(e) => e.stopPropagation()}>
        <StageSelect lead={lead} />
      </td>

      {/* Priority */}
      <td><PriorityBadge priority={lead.priority} /></td>

      {/* Source */}
      <td style={{ fontSize: 12, color: "var(--text2)" }}>
        {SOURCE_LABELS[lead.source] ?? lead.source}
      </td>

      {/* Assigned to */}
      <td>
        {lead.assigned_to_name ? (
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <Avatar name={lead.assigned_to_name} size={22} />
            <span style={{ fontSize: 12 }}>{lead.assigned_to_name}</span>
          </div>
        ) : (
          <span style={{ fontSize: 12, color: "var(--text3)", fontStyle: "italic" }}>
            Unassigned
          </span>
        )}
      </td>

      {/* Created */}
      <td style={{ fontSize: 12, color: "var(--text3)" }}>
        {timeAgo(lead.created_at)}
      </td>

      {/* Actions */}
      <td
        style={{ textAlign: "right" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
          {/* Edit — all roles that can see this lead */}
          <ActionBtn
            label="Edit"
            onClick={() => onEdit(lead)}
            color="var(--accent)"
          />

          {/* Assign — admin/manager only */}
          {canManage && (
            <ActionBtn
              label={lead.assigned_to ? "Reassign" : "Assign"}
              onClick={() => onAssign(lead)}
              color="#3A80D0"
            />
          )}

          {/* Delete — admin/manager only */}
          {canManage && (
            <ActionBtn
              label="Delete"
              onClick={() => onDelete(lead)}
              color="var(--red)"
            />
          )}
        </div>
      </td>
    </tr>
  );
}

function ActionBtn({ label, onClick, color }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding:      "4px 10px",
        borderRadius: "var(--radius-sm)",
        border:       `1px solid var(--border)`,
        background:   "none",
        fontSize:     11,
        fontWeight:   600,
        color:        "var(--text2)",
        cursor:       "pointer",
        transition:   "all 0.12s",
        whiteSpace:   "nowrap",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background   = color + "12";
        e.currentTarget.style.borderColor  = color + "60";
        e.currentTarget.style.color        = color;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background   = "none";
        e.currentTarget.style.borderColor  = "var(--border)";
        e.currentTarget.style.color        = "var(--text2)";
      }}
    >
      {label}
    </button>
  );
}