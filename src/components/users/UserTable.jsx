/**
 * components/users/UserTable.jsx
 *
 * Displays all users in a table with:
 *  - Avatar + name + email
 *  - Role badge
 *  - Manager assignment
 *  - Lead count
 *  - Active/Inactive status
 *  - Edit action button
 */
import Avatar       from "@/components/common/Avatar";
import { displayRole, DEPT_LABELS } from "@/utils/roles";
import { RoleBadge } from "@/components/common/Badge";
import Spinner      from "@/components/common/Spinner";
import EmptyState   from "@/components/common/EmptyState";
import { formatDateTime } from "@/utils/formatters";
import { useIsMobile } from "@/hooks/useIsMobile";

export default function UserTable({ users = [], loading, workload = [], onEdit, onDelete, currentUser }) {
  const isMobile = useIsMobile();
  if (loading) return <Spinner center />;

  if (!users.length) return (
    <EmptyState icon="◎" title="No users found" subtitle="Create your first user above" />
  );

  const getLeadCount = (userId) =>
    workload.find(w => w.user.id === userId)?.total ?? 0;

  const canDelete = (u) =>
    currentUser?.role === "admin" &&
    u.id !== currentUser.id &&
    u.role !== "admin";

  if (isMobile) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 12 }}>
        {users.map((u) => (
          <div
            key={u.id}
            onClick={() => onEdit?.(u)}
            style={{
              padding: "12px 14px",
              background: "var(--white)",
              border: "1px solid var(--border)",
              borderRadius: 4,
              cursor: "pointer",
              boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
              opacity: u.is_active ? 1 : 0.6,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <Avatar name={u.full_name} size={36} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {u.full_name}
                </div>
                <div style={{ fontSize: 11, color: "var(--text3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {u.email}
                </div>
              </div>
              <RoleBadge role={u.role} />
            </div>
            <div style={{ fontSize: 11, color: "var(--text3)", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              {u.department && <span>{u.department_display || DEPT_LABELS[u.department] || u.department}</span>}
              {u.is_mis_approver && <span style={{ color: "var(--accent)", fontWeight: 600 }}>APP</span>}
              <span>{getLeadCount(u.id)} leads</span>
              <span style={{ color: u.is_active ? "#0A7838" : "#8A1A1A" }}>
                {u.is_active ? "● Active" : "○ Inactive"}
              </span>
            </div>
            {canDelete(u) && (
              <div
                style={{ marginTop: 8, display: "flex", justifyContent: "flex-end" }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => onDelete?.(u)}
                  className="btn btn-danger btn-sm"
                  style={{ minHeight: 32, fontSize: 11 }}
                >
                  Delete
                </button>
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
            <th>User</th>
            <th>Role</th>
            <th>Department</th>
            <th>Manager</th>
            <th>Leads</th>
            <th>Status</th>
            <th>Joined</th>
            <th style={{ textAlign: "right" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <UserRow
              key={u.id}
              user={u}
              leadCount={getLeadCount(u.id)}
              onEdit={onEdit}
              onDelete={onDelete}
              canDelete={canDelete(u)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UserRow({ user, leadCount, onEdit, onDelete, canDelete }) {
  const isActive = user.is_active;

  return (
    <tr style={{ opacity: isActive ? 1 : 0.55 }}>

      {/* User info */}
      <td>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Avatar name={user.full_name} size={30} />
          <div>
            <p style={{ fontWeight: 600, fontSize: 12, color: "var(--text)" }}>
              {user.full_name}
            </p>
            <p style={{ fontSize: 11, color: "var(--text3)" }}>{user.email}</p>
            {user.phone && (
              <p style={{ fontSize: 10, color: "var(--text3)" }}>{user.phone}</p>
            )}
          </div>
        </div>
      </td>

      {/* Role + APP badge */}
      <td>
        <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
          <RoleBadge role={displayRole(user)} />
          {user.is_mis_approver && (
            <span style={{
              fontSize:     8,
              fontWeight:   800,
              padding:      "1px 5px",
              borderRadius: 3,
              background:   "#6030A0",
              color:        "#fff",
              letterSpacing: "0.04em",
              flexShrink:   0,
            }}>
              APP
            </span>
          )}
        </div>
      </td>

      {/* Department */}
      <td>
        {user.department ? (
          <span style={{
            fontSize:     11,
            fontWeight:   500,
            padding:      "2px 7px",
            borderRadius: 3,
            background:   "var(--surface)",
            color:        "var(--text2)",
            border:       "1px solid var(--border)",
          }}>
            {user.department_display || DEPT_LABELS[user.department] || user.department}
          </span>
        ) : (
          <span style={{ fontSize: 11, color: "var(--text3)", fontStyle: "italic" }}>—</span>
        )}
      </td>

      {/* Manager */}
      <td>
        {user.manager_name ? (
          <span style={{ fontSize: 12, color: "var(--text2)" }}>{user.manager_name}</span>
        ) : (
          <span style={{ fontSize: 11, color: "var(--text3)", fontStyle: "italic" }}>—</span>
        )}
      </td>

      {/* Lead count */}
      <td>
        {user.role !== "admin" ? (
          <span style={{
            fontSize:   12,
            fontWeight: leadCount > 0 ? 700 : 400,
            color:      leadCount > 0 ? "#1A5A9A" : "var(--text3)",
          }}>
            {leadCount > 0 ? leadCount : "—"}
          </span>
        ) : (
          <span style={{ fontSize: 11, color: "var(--text3)", fontStyle: "italic" }}>—</span>
        )}
      </td>

      {/* Active status */}
      <td>
        <span style={{
          display:      "inline-flex",
          alignItems:   "center",
          gap:          4,
          padding:      "2px 7px",
          borderRadius: 3,
          fontSize:     10,
          fontWeight:   500,
          background:   isActive ? "#E4F8EE" : "#FCE8E8",
          color:        isActive ? "#0A5A28" : "#8A1A1A",
          border:       `1px solid ${isActive ? "#80D8A8" : "#F0A8A8"}`,
        }}>
          <span style={{
            width: 4, height: 4, borderRadius: "50%",
            background: isActive ? "#18A858" : "#C03030",
            flexShrink: 0,
          }} />
          {isActive ? "Active" : "Inactive"}
        </span>
      </td>

      {/* Joined date */}
      <td style={{ fontSize: 11, color: "var(--text3)" }}>
        {formatDateTime(user.created_at)}
      </td>

      {/* Actions */}
      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
        <button
          onClick={() => onEdit(user)}
          style={{
            padding:      "3px 10px",
            borderRadius: 3,
            border:       "1px solid var(--border2)",
            background:   "none",
            fontSize:     11,
            fontWeight:   500,
            color:        "var(--text2)",
            cursor:       "pointer",
            transition:   "all 0.12s",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background   = "#FDF0D8";
            e.currentTarget.style.borderColor  = "#E08818";
            e.currentTarget.style.color        = "#E08818";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background   = "none";
            e.currentTarget.style.borderColor  = "var(--border2)";
            e.currentTarget.style.color        = "var(--text2)";
          }}
        >
          Edit
        </button>

        {canDelete && (
          <button
            onClick={() => onDelete?.(user)}
            style={{
              padding:      "3px 10px",
              borderRadius: 3,
              border:       "1px solid #F0A8A8",
              background:   "none",
              fontSize:     11,
              fontWeight:   500,
              color:        "#C03030",
              cursor:       "pointer",
              marginLeft:   6,
              transition:   "all 0.12s",
              fontFamily:   "inherit",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "#FCE8E8"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "none"; }}
          >
            Delete
          </button>
        )}
      </td>
    </tr>
  );
}