/**
 * components/dashboard/RecentLeads.jsx
 */
import { useNavigate } from "react-router-dom";
import { StageBadge, PriorityBadge } from "@/components/common/Badge";
import Avatar from "@/components/common/Avatar";
import Spinner from "@/components/common/Spinner";
import EmptyState from "@/components/common/EmptyState";
import { formatCurrency, timeAgo } from "@/utils/formatters";

export default function RecentLeads({ leads, loading }) {
  const navigate = useNavigate();

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">
          Recent Leads
          {leads?.length > 0 && (
            <span style={{ color: "var(--text3)", fontWeight: 400, marginLeft: 6 }}>
              ({leads.length})
            </span>
          )}
        </h2>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => navigate("/leads")}
        >
          View All →
        </button>
      </div>

      {loading ? (
        <Spinner center />
      ) : !leads?.length ? (
        <EmptyState icon="◈" title="No leads yet" subtitle="Create your first lead to get started" />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Lead</th>
                <th>Stage</th>
                <th>Priority</th>
                
                <th>Assigned To</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {leads.slice(0, 5).map((lead) => (
                <tr
                  key={lead.id}
                  style={{ cursor: "pointer" }}
                  onClick={() => navigate(`/leads/${lead.id}`)}
                >
                  {/* Lead name + company */}

                  {/* Assigned to */}
                  <td>
                    {lead.assigned_to_name ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Avatar name={lead.assigned_to_name} size={20} />
                        <span style={{ fontSize: 12 }}>{lead.assigned_to_name}</span>
                      </div>
                    ) : (
                      <span style={{ fontSize: 12, color: "var(--text3)", fontStyle: "italic" }}>
                        Unassigned
                      </span>
                    )}
                  </td>

                  <td style={{ fontSize: 12, color: "var(--text3)" }}>
                    {timeAgo(lead.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}