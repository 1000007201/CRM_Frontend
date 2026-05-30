/**
 * pages/Users.jsx
 *
 * Admin-only user management page.
 *
 * Layout:
 *  - Summary stats bar (total, by role, active/inactive)
 *  - Search + role filter bar
 *  - Two-column layout:
 *      Left (wider): Users table with edit actions
 *      Right:        Team workload panel (sales employees)
 *  - "Create User" button → UserForm modal
 *  - Edit row action → UserForm modal (edit mode)
 */
import { useState, useEffect } from "react";
import { useSearchParams }     from "react-router-dom";

import { useUsers, usePendingCount, useDeleteUser } from "@/hooks/useUsers";
import { useWorkload } from "@/hooks/useAssignments";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useToast }    from "@/components/common/Toast";
import { useAuth }     from "@/hooks/useAuth";

import UserStatsBar      from "@/components/users/UserStatsBar";
import UserTable         from "@/components/users/UserTable";
import UserWorkloadPanel from "@/components/users/UserWorkloadPanel";
import UserForm          from "@/components/users/UserForm";
import Modal             from "@/components/common/Modal";
import Spinner           from "@/components/common/Spinner";

const ROLE_FILTER_OPTIONS = [
  { value: "",               label: "All Roles"       },
  { value: "admin",          label: "Admin"           },
  { value: "manager",        label: "Manager"         },
  { value: "member", label: "Sales Member"  },
];

const DEPT_FILTER_OPTIONS = [
  { value: "",          label: "All Departments" },
  { value: "sales",     label: "Sales"           },
  { value: "hr",        label: "HR"              },
  { value: "finance",   label: "Finance"         },
  { value: "operations",label: "Operations"      },
];

const STATUS_FILTER_OPTIONS = [
  { value: "",     label: "All Status" },
  { value: "true", label: "Active"     },
  { value: "false", label: "Inactive"  },
];

export default function UsersPage() {
  const isMobile = useIsMobile();
  const toast    = useToast();
  const { user: currentUser } = useAuth();

  // ── Tab + URL sync ────────────────────────────────────────────────────────
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab") || "all";
  const [activeTab, setActiveTab] = useState(tabFromUrl);

  useEffect(() => { setActiveTab(tabFromUrl); }, [tabFromUrl]);

  const switchTab = (tab) => {
    setActiveTab(tab);
    setSearchParams(tab === "all" ? {} : { tab });
  };

  // ── Modal state ───────────────────────────────────────────────────────────
  const [showCreate,  setShowCreate]  = useState(false);
  const [editUser,    setEditUser]    = useState(null);
  const [deleteUser,  setDeleteUser]  = useState(null);
  const [roleFilter,  setRoleFilter]  = useState("");
  const [search,      setSearch]      = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [deptFilter,   setDeptFilter]   = useState("");

  // ── Data ─────────────────────────────────────────────────────────────────
  const { data: allUsers = [], isLoading: usersLoading, refetch } = useUsers();
  const { data: workload = [], isLoading: wlLoading }             = useWorkload();
  const { data: pendingData }                                      = usePendingCount();
  const pendingCount = pendingData?.count ?? allUsers.filter((u) => !u.is_active).length;
  const deleteMutation = useDeleteUser();

  // ── Client-side filter ────────────────────────────────────────────────────
  const filteredUsers = allUsers.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      u.full_name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q);
    const matchRole   = !roleFilter   || u.role === roleFilter;
    const matchStatus = !statusFilter ||
      String(u.is_active) === statusFilter;
    const matchDept = !deptFilter || u.department === deptFilter;
    return matchSearch && matchRole && matchStatus && matchDept;
  });

  // Pending users = inactive accounts awaiting approval
  const pendingUsers = allUsers.filter((u) => !u.is_active);

  // Only sales employees in the workload panel
  const repWorkload = workload.filter(w => ["manager", "member"].includes(w.user.role));

  const handleSaved = () => { refetch(); };

  const handleDeleteConfirm = async () => {
    if (!deleteUser) return;
    try {
      await deleteMutation.mutateAsync(deleteUser.id);
      const msg = deleteUser.is_active
        ? `${deleteUser.full_name} has been deleted.`
        : "User rejected and removed.";
      toast.success(msg);
      setDeleteUser(null);
    } catch (err) {
      const detail = err?.response?.data?.error || "Could not remove user. Please try again.";
      toast.error(detail);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Page header */}
      <div style={{
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        alignItems: isMobile ? "stretch" : "center",
        justifyContent: "space-between",
        gap: isMobile ? 10 : 16,
        marginBottom: 16,
      }}>
        <div>
          <h1 className="page-title" style={isMobile ? { fontSize: 18 } : undefined}>User Management</h1>
          <p className="page-subtitle">
            {usersLoading
              ? "Loading…"
              : `${allUsers.length} user${allUsers.length !== 1 ? "s" : ""} in the system`}
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowCreate(true)}
          style={isMobile ? { minHeight: 44, fontSize: 14 } : undefined}
        >
          + Create User
        </button>
      </div>

      {/* Stats bar */}
      {!usersLoading && <UserStatsBar users={allUsers} />}

      {/* Tab switcher */}
      <div style={{
        display: "flex", gap: 4,
        borderBottom: "1px solid var(--border)",
        marginBottom: 16,
      }}>
        <button
          onClick={() => switchTab("all")}
          style={{
            padding: "10px 16px", background: "none", border: "none",
            borderBottom: activeTab === "all" ? "2px solid var(--accent)" : "2px solid transparent",
            color:      activeTab === "all" ? "var(--accent)" : "var(--text2)",
            fontWeight: activeTab === "all" ? 700 : 500,
            fontSize: 13, cursor: "pointer", marginBottom: -1, fontFamily: "inherit",
          }}
        >
          All Users
        </button>
        <button
          onClick={() => switchTab("pending")}
          style={{
            padding: "10px 16px", background: "none", border: "none",
            borderBottom: activeTab === "pending" ? "2px solid var(--accent)" : "2px solid transparent",
            color:      activeTab === "pending" ? "var(--accent)" : "var(--text2)",
            fontWeight: activeTab === "pending" ? 700 : 500,
            fontSize: 13, cursor: "pointer", marginBottom: -1, fontFamily: "inherit",
            display: "flex", alignItems: "center", gap: 6,
          }}
        >
          Pending Approvals
          {pendingCount > 0 && (
            <span style={{
              background: "var(--accent)", color: "#fff",
              borderRadius: 10, padding: "1px 8px",
              fontSize: 10, fontWeight: 700,
            }}>
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      {/* Main content grid */}
      <div style={{
        display:             "grid",
        gridTemplateColumns: isMobile ? "1fr" : "1fr 300px",
        gap:                 16,
        alignItems:          "start",
      }}>

        {/* ── LEFT: Users table / Pending cards ── */}
        <div className="card">
          {activeTab === "pending" ? (
            <>
              <div className="card-header">
                <span className="card-title">
                  Pending Approvals
                  <span style={{ color: "var(--text3)", fontWeight: 400, marginLeft: 6 }}>
                    ({pendingUsers.length})
                  </span>
                </span>
              </div>
              <div style={{ padding: "12px 16px" }}>
                {usersLoading ? (
                  <Spinner center />
                ) : pendingUsers.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text3)", fontSize: 13 }}>
                    No pending approvals ✓
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {pendingUsers.map((u) => (
                      <PendingUserCard
                        key={u.id}
                        user={u}
                        onActivate={() => setEditUser(u)}
                        onReject={() => setDeleteUser(u)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="card-header">
                <span className="card-title">
                  Users
                  {filteredUsers.length !== allUsers.length && (
                    <span style={{ color: "var(--text3)", fontWeight: 400, marginLeft: 6 }}>
                      ({filteredUsers.length} of {allUsers.length})
                    </span>
                  )}
                </span>

                {/* Filter toolbar */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 6,
                    background: "var(--surface)", border: "1px solid var(--border2)",
                    borderRadius: 3, padding: "4px 10px", transition: "border-color 0.12s",
                  }}
                    onFocusCapture={e => e.currentTarget.style.borderColor = "var(--accent)"}
                    onBlurCapture={e  => e.currentTarget.style.borderColor  = "var(--border2)"}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                      stroke="var(--text3)" strokeWidth="2.5" style={{ flexShrink: 0 }}>
                      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                    </svg>
                    <input
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Search users…"
                      style={{
                        border: "none", outline: "none", background: "none",
                        fontSize: 12, color: "var(--text)", width: 140, height: "21px", fontFamily: "inherit",
                      }}
                    />
                    {search && (
                      <button onClick={() => setSearch("")}
                        style={{ border: "none", background: "none", cursor: "pointer",
                          color: "var(--text3)", fontSize: 12, padding: 0 }}>✕</button>
                    )}
                  </div>
                  <select className="form-select" value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={{ width: "auto", minWidth: 130 }}>
                    {ROLE_FILTER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <select className="form-select" value={deptFilter} onChange={e => setDeptFilter(e.target.value)} style={{ width: "auto", minWidth: 140 }}>
                    {DEPT_FILTER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <select className="form-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ width: "auto", minWidth: 110 }}>
                    {STATUS_FILTER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  {(search || roleFilter || statusFilter) && (
                    <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(""); setRoleFilter(""); setStatusFilter(""); setDeptFilter(""); }} style={{ color: "var(--red)" }}>
                      ✕ Clear
                    </button>
                  )}
                </div>
              </div>

              <UserTable
                users={filteredUsers}
                loading={usersLoading}
                workload={workload}
                onEdit={setEditUser}
                onDelete={setDeleteUser}
                currentUser={currentUser}
              />
            </>
          )}
        </div>

        {/* ── RIGHT: Workload panel ── */}
        <UserWorkloadPanel workload={repWorkload} loading={wlLoading} />
      </div>

      {/* ── Modals ── */}
      {showCreate && (
        <UserForm
          onClose={() => setShowCreate(false)}
          onSaved={handleSaved}
        />
      )}

      {editUser && (
        <UserForm
          user={editUser}
          onClose={() => setEditUser(null)}
          onSaved={() => { handleSaved(); toast.success("User activated successfully"); }}
        />
      )}

      {/* Reject / delete confirmation */}
      {deleteUser && (
        <DeleteUserConfirm
          user={deleteUser}
          isPending={deleteMutation.isPending}
          onClose={() => setDeleteUser(null)}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </div>
  );
}

// ── Delete / Reject confirmation modal ───────────────────────────────────────
function DeleteUserConfirm({ user, isPending, onClose, onConfirm }) {
  const isActive = user.is_active;
  return (
    <Modal
      open
      onClose={onClose}
      title={isActive ? "Delete User" : "Reject User"}
      size="sm"
      footer={
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={isPending}>
            Cancel
          </button>
          <button className="btn btn-danger" onClick={onConfirm} disabled={isPending}>
            {isPending
              ? "Removing…"
              : isActive ? "Delete User" : "Reject & Remove"}
          </button>
        </div>
      }
    >
      <div style={{ fontSize: 14, color: "var(--text2)" }}>
        {isActive ? (
          <>
            <p>Are you sure you want to delete <strong>{user.full_name}</strong>?</p>
            <p style={{ marginTop: 10, fontSize: 12, color: "var(--text3)" }}>
              This will deactivate their account. They won't be able to log in,
              but their historical data (leads, contacts, advertisers) will be preserved.
            </p>
          </>
        ) : (
          <p>
            Are you sure you want to reject and remove{" "}
            <strong>{user.full_name}</strong>? This cannot be undone.
          </p>
        )}
      </div>
    </Modal>
  );
}

// ── Pending user card ──────────────────────────────────────────────────────────
function PendingUserCard({ user, onActivate, onReject }) {
  return (
    <div style={{
      padding: 14, background: "var(--white)",
      border: "1px solid var(--border)", borderRadius: 4,
      display: "flex", justifyContent: "space-between",
      alignItems: "center", gap: 12, flexWrap: "wrap",
    }}>
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
          {user.full_name}
        </div>
        <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>
          {user.email}
        </div>
        {user.phone && (
          <div style={{ fontSize: 12, color: "var(--text3)" }}>{user.phone}</div>
        )}
        <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>
          Signed up: {new Date(user.date_joined ?? user.created_at).toLocaleDateString()}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onActivate} className="btn btn-primary btn-sm" style={{ minHeight: 36 }}>
          Activate
        </button>
        <button onClick={onReject} className="btn btn-danger btn-sm" style={{ minHeight: 36 }}>
          Reject
        </button>
      </div>
    </div>
  );
}