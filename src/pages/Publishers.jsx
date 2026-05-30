/**
 * pages/Publishers.jsx
 *
 * Publisher list page.
 *
 * Features:
 *   - Stats bar (total, active, by specialization top-3)
 *   - Filter bar (status, region, specialization, search)
 *   - Table with key columns
 *   - Create / Edit via modal form (Operations/Admin only)
 *   - Quick status toggle
 *   - Specialization chips on each row
 *   - Bank details indicator (🏦) visible to Ops/Admin
 *   - Role-aware: Sales read-only, Ops/Admin full access
 */
import { useState }     from "react";
import { useNavigate } from "react-router-dom";
import { useAuth }     from "@/hooks/useAuth";
import {
  usePublishers,
  usePublisherChoices,
  useDeletePublisher,
  useSetPublisherStatus,
} from "@/hooks/usePublishers";
import { useToast }    from "@/components/common/Toast";
import { useIsMobile } from "@/hooks/useIsMobile";
import { hasPerm, canApprove } from "@/utils/permissions";
import Spinner         from "@/components/common/Spinner";
import EmptyState      from "@/components/common/EmptyState";
import Avatar          from "@/components/common/Avatar";
import MobileFilterPanel from "@/components/common/MobileFilterPanel";
import PublisherForm   from "@/components/advertisers/PublisherForm";
import { useSortable } from "@/hooks/useSortable";
import SortableHeader  from "@/components/common/SortableHeader";
import IdBadge         from "@/components/common/IdBadge";
import DateRangeFilter from "@/components/common/DateRangeFilter";

const toArray = (d) => Array.isArray(d) ? d : (d?.results ?? []);

// Can create — all authenticated users including Sales
const canCreate = (user) => !!user;
const canManage = (user) => hasPerm(user, "publishers");
const canDelete = (user) => user?.role === "admin";

const canActivateRecord = (user, pub) => {
  if (pub.status === "pending_approval" || pub.status === "rejected") {
    return canApprove(user);
  }
  return canManage(user);
};

// ── Status badge ──────────────────────────────────────────────────────────────
const STATUS_STYLE = {
  active:   { bg: "#E4F8EE", color: "#0A5A28", border: "#80D8A8" },
  inactive: { bg: "#FCE8E8", color: "#8A1A1A", border: "#F0A8A8" },
  paused:   { bg: "#FDF4E0", color: "#7A4A00", border: "#F0D080" },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.inactive;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 8px", borderRadius: 3,
      fontSize: 10, fontWeight: 600,
      background: s.bg, color: s.color,
      border: `1px solid ${s.border}`,
      textTransform: "capitalize",
    }}>
      <span style={{
        width: 5, height: 5, borderRadius: "50%",
        background: s.color, flexShrink: 0,
      }} />
      {status}
    </span>
  );
}

// ── Specialization chips ──────────────────────────────────────────────────────
function SpecChips({ specs = [], max = 3 }) {
  if (!specs.length) return <span style={{ fontSize: 10, color: "var(--text3)" }}>—</span>;
  const shown = specs.slice(0, max);
  const extra = specs.length - max;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
      {shown.map((s) => (
        <span key={s} style={{
          fontSize: 9, fontWeight: 700, padding: "1px 6px",
          borderRadius: 10, background: "var(--accent-lt)",
          color: "var(--accent)", border: "1px solid #F0D080",
          textTransform: "uppercase", letterSpacing: "0.04em",
        }}>
          {s}
        </span>
      ))}
      {extra > 0 && (
        <span style={{
          fontSize: 9, color: "var(--text3)",
          padding: "1px 6px", borderRadius: 10,
          background: "var(--surface)", border: "1px solid var(--border)",
        }}>
          +{extra}
        </span>
      )}
    </div>
  );
}

// ── Stats bar ─────────────────────────────────────────────────────────────────
function StatsBar({ publishers }) {
  const total    = publishers.length;
  const active   = publishers.filter((p) => p.status === "active").length;
  const inactive = publishers.filter((p) => p.status === "inactive").length;
  const withBank = publishers.filter((p) => p.has_bank_details).length;

  const stats = [
    { label: "Total",      value: total,    color: "#1A5A9A" },
    { label: "Active",     value: active,   color: "#0A7838" },
    { label: "Inactive",   value: inactive, color: "#8A1A1A" },
    { label: "Bank Added", value: withBank, color: "#6030A0" },
  ];

  return (
    <div style={{ display: "flex", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
      {stats.map((s) => (
        <div key={s.label} style={{
          background: "var(--white)", border: "1px solid var(--border)",
          borderRadius: 4, padding: "10px 16px",
          minWidth: 100, flexShrink: 0,
        }}>
          <p style={{ fontSize: 20, fontWeight: 800, color: s.color, lineHeight: 1 }}>
            {s.value}
          </p>
          <p style={{ fontSize: 10, color: "var(--text3)", marginTop: 2 }}>
            {s.label}
          </p>
        </div>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PublishersPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast    = useToast();
  const isMobile = useIsMobile();
  const userCanManage = canManage(user);
  const userCanCreate = canCreate(user);
  const userCanDelete = canDelete(user);

  // ── Filters ───────────────────────────────────────────────────────────────
  const [search,        setSearch]        = useState("");
  const [statusF,       setStatusF]       = useState("");
  const [regionF,       setRegionF]       = useState("");
  const [specF,         setSpecF]         = useState("");
  const [createdAfter,  setCreatedAfter]  = useState("");
  const [createdBefore, setCreatedBefore] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const activeFilterCount = (statusF ? 1 : 0) + (regionF ? 1 : 0) + (specF ? 1 : 0) + (createdAfter ? 1 : 0) + (createdBefore ? 1 : 0);
  const clearAllFilters = () => { setSearch(""); setStatusF(""); setRegionF(""); setSpecF(""); setCreatedAfter(""); setCreatedBefore(""); };

  // ── Modals ────────────────────────────────────────────────────────────────
  const [showCreate, setShowCreate] = useState(false);
  const [editPub,    setEditPub]    = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  // ── Data ──────────────────────────────────────────────────────────────────
  const apiParams = {
    ...(statusF       && { status:         statusF       }),
    ...(regionF       && { region:         regionF       }),
    ...(specF         && { specialization: specF         }),
    ...(search        && { search:         search        }),
    ...(createdAfter  && { created_after:  createdAfter  }),
    ...(createdBefore && { created_before: createdBefore }),
  };

  const { data: rawData, isLoading }  = usePublishers(apiParams);
  const { data: choices }             = usePublisherChoices();
  const deleteMutation                = useDeletePublisher();
  const setStatusMutation             = useSetPublisherStatus();

  const publishers      = toArray(rawData);
  const { sortedData: sortedPublishers, sortBy, sortDir, toggleSort } = useSortable(publishers, { column: "internal_id", dir: "desc" });
  const regions         = choices?.regions         ?? [];
  const specializations = choices?.specializations ?? [];
  const hasFilters      = search || statusF || regionF || specF || createdAfter || createdBefore;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!confirmDel) return;
    try {
      await deleteMutation.mutateAsync(confirmDel.id);
      toast.success(`Deleted ${confirmDel.display_name ?? confirmDel.full_name}`);
      setConfirmDel(null);
    } catch {
      toast.error("Could not delete publisher.");
    }
  };

  const handleStatusToggle = async (pub) => {
    const next = pub.status === "active" ? "inactive" : "active";
    try {
      await setStatusMutation.mutateAsync({ id: pub.id, status: next });
      toast.success(`${pub.display_name ?? pub.full_name} marked ${next}`);
    } catch {
      toast.error("Could not update status.");
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div style={{
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        alignItems: isMobile ? "stretch" : "center",
        justifyContent: "space-between",
        gap: isMobile ? 10 : 16,
        marginBottom: 14,
      }}>
        <div>
          <h1 className="page-title" style={isMobile ? { fontSize: 18 } : undefined}>Publishers</h1>
          <p className="page-subtitle">
            {isLoading
              ? "Loading…"
              : `${publishers.length} publisher${publishers.length !== 1 ? "s" : ""}`
            }
          </p>
        </div>
        {userCanCreate && (
          <button
            className="btn btn-primary"
            onClick={() => setShowCreate(true)}
            style={isMobile ? { minHeight: 44, fontSize: 14 } : undefined}
          >
            + Add Publisher
          </button>
        )}
      </div>

      {/* Stats */}
      {!isLoading && <StatsBar publishers={publishers} />}

      {/* Filters */}
      {isMobile ? (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input
              type="text"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                flex: 1, padding: "10px 12px",
                border: "1px solid var(--border)", borderRadius: 3,
                fontSize: 14, minHeight: 40, fontFamily: "inherit", outline: "none",
              }}
            />
            <button
              onClick={() => setFiltersOpen(true)}
              style={{
                padding: "0 14px",
                background: activeFilterCount > 0 ? "var(--accent)" : "var(--white)",
                color: activeFilterCount > 0 ? "#fff" : "var(--text)",
                border: "1px solid var(--border2)", borderRadius: 3,
                fontSize: 13, fontWeight: 600, cursor: "pointer",
                minHeight: 40, display: "flex", alignItems: "center", gap: 6,
                whiteSpace: "nowrap", fontFamily: "inherit",
              }}
            >
              🔍 Filters
              {activeFilterCount > 0 && (
                <span style={{
                  background: "#fff", color: "var(--accent)", borderRadius: 10,
                  padding: "1px 6px", fontSize: 10, fontWeight: 700,
                }}>
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
          {filtersOpen && (
            <MobileFilterPanel
              onClose={() => setFiltersOpen(false)}
              onClear={() => { clearAllFilters(); setFiltersOpen(false); }}
              onApply={() => setFiltersOpen(false)}
            >
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--text2)" }}>Status</label>
                <select className="form-select" value={statusF}
                  onChange={(e) => setStatusF(e.target.value)}
                  style={{ width: "100%", minHeight: 44, fontSize: 14 }}>
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="paused">Paused</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--text2)" }}>Region</label>
                <select className="form-select" value={regionF}
                  onChange={(e) => setRegionF(e.target.value)}
                  style={{ width: "100%", minHeight: 44, fontSize: 14 }}>
                  <option value="">All Regions</option>
                  {regions.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--text2)" }}>Specialization</label>
                <select className="form-select" value={specF}
                  onChange={(e) => setSpecF(e.target.value)}
                  style={{ width: "100%", minHeight: 44, fontSize: 14 }}>
                  <option value="">All Specializations</option>
                  {specializations.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--text2)" }}>Created Date</label>
                <DateRangeFilter
                  fromDate={createdAfter}
                  toDate={createdBefore}
                  onFromChange={setCreatedAfter}
                  onToChange={setCreatedBefore}
                  label=""
                />
              </div>
            </MobileFilterPanel>
          )}
        </>
      ) : (
        <div style={{
          display: "flex", gap: 8, marginBottom: 14,
          flexWrap: "wrap", alignItems: "center",
        }}>
          {/* Search */}
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "var(--surface)", border: "1px solid var(--border2)",
            borderRadius: 3, padding: "4px 10px",
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="var(--text3)" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              style={{
                border: "none", background: "none", outline: "none",
                fontSize: 12, width: 160, fontFamily: "inherit", height: "21px"
              }}
              placeholder="Search name, email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Status */}
          <select className="form-select" value={statusF}
            onChange={(e) => setStatusF(e.target.value)}
            style={{ width: "auto", minWidth: 120 }}>
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="paused">Paused</option>
          </select>

          {/* Region */}
          <select className="form-select" value={regionF}
            onChange={(e) => setRegionF(e.target.value)}
            style={{ width: "auto", minWidth: 140 }}>
            <option value="">All Regions</option>
            {regions.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>

          {/* Specialization */}
          <select className="form-select" value={specF}
            onChange={(e) => setSpecF(e.target.value)}
            style={{ width: "auto", minWidth: 160 }}>
            <option value="">All Specializations</option>
            {specializations.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>

          {/* Date range */}
          <DateRangeFilter
            fromDate={createdAfter}
            toDate={createdBefore}
            onFromChange={setCreatedAfter}
            onToChange={setCreatedBefore}
            label="Created"
          />

          {hasFilters && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={clearAllFilters}
              style={{ color: "var(--red)" }}
            >
              ✕ Clear
            </button>
          )}
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <Spinner center />
      ) : publishers.length === 0 ? (
        <EmptyState
          icon="🤝"
          title={hasFilters ? "No publishers match your filters" : "No publishers yet"}
          subtitle={
            hasFilters
              ? "Try clearing filters"
              : userCanCreate
              ? "Click '+ Add Publisher' to register your first publisher"
              : "No publishers are assigned to you yet"
          }
        />
      ) : isMobile ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {sortedPublishers.map((pub) => (
            <div
              key={pub.id}
              onClick={() => navigate(`/publishers/${pub.id}`)}
              style={{
                padding: "12px 14px",
                background: "var(--white)",
                border: "1px solid var(--border)",
                borderRadius: 4, cursor: "pointer",
                boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                opacity: pub.status === "inactive" ? 0.7 : 1,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{
                    fontSize: 14, fontWeight: 600, color: "var(--text)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {pub.display_name ?? pub.full_name}
                  </span>
                  <IdBadge id={pub.internal_id} />
                </div>
                <StatusBadge status={pub.status} />
              </div>
              <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 4, wordBreak: "break-word" }}>
                {pub.specializations?.length
                  ? pub.specializations.slice(0, 3).map((s) => s.label ?? s).join(" · ")
                  : "—"}
              </div>
              <div style={{ fontSize: 11, color: "var(--text3)", display: "flex", gap: 10, flexWrap: "wrap" }}>
                {pub.display_location && <span>📍 {pub.display_location}</span>}
                {pub.sales_manager_name && <span>👤 {pub.sales_manager_name}</span>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <SortableHeader label="ID"        column="internal_id" sortBy={sortBy} sortDir={sortDir} onToggle={toggleSort} />
                <SortableHeader label="Publisher" column="full_name"   sortBy={sortBy} sortDir={sortDir} onToggle={toggleSort} />
                <th>Specializations</th>
                <th>Location</th>
                <th>Account Manager</th>
                <th>Bank</th>
                <SortableHeader label="Status" column="status" sortBy={sortBy} sortDir={sortDir} onToggle={toggleSort} />
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedPublishers.map((pub) => (
                <PublisherRow
                  key={pub.id}
                  pub={pub}
                  canManage={userCanManage}
                  canDelete={userCanDelete}
                  canActivate={canActivateRecord(user, pub)}
                  onView={() => navigate(`/publishers/${pub.id}`)}
                  onEdit={() => setEditPub(pub)}
                  onDelete={() => setConfirmDel(pub)}
                  onToggleStatus={() => handleStatusToggle(pub)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <PublisherForm
          onClose={() => setShowCreate(false)}
          onSaved={() => setShowCreate(false)}
        />
      )}

      {/* Edit modal */}
      {editPub && (
        <PublisherForm
          publisher={editPub}
          onClose={() => setEditPub(null)}
          onSaved={() => setEditPub(null)}
        />
      )}

      {/* Delete confirm */}
      {confirmDel && (
        <DeleteConfirm
          name={confirmDel.display_name ?? confirmDel.full_name}
          onCancel={() => setConfirmDel(null)}
          onConfirm={handleDelete}
          loading={deleteMutation.isPending}
        />
      )}
    </div>
  );
}

// ── Table row ─────────────────────────────────────────────────────────────────
function PublisherRow({ pub, canManage, canDelete, canActivate, onView, onEdit, onDelete, onToggleStatus }) {
  const [hov, setHov] = useState(false);
  const displayName   = pub.display_name ?? pub.full_name;

  return (
    <tr
      style={{ cursor: "pointer", opacity: pub.status === "inactive" ? 0.6 : 1 }}
      onClick={onView}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {/* ID */}
      <td><IdBadge id={pub.internal_id} /></td>

      {/* Publisher name + email */}
      <td>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Avatar name={displayName} size={30} />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <p style={{ fontWeight: 600, fontSize: 12, color: "var(--text)" }}>
                {displayName}
              </p>
            </div>
            {pub.company_name && pub.company_name !== pub.full_name && (
              <p style={{ fontSize: 10, color: "var(--text3)" }}>{pub.full_name}</p>
            )}
            <p style={{ fontSize: 10, color: "var(--text3)" }}>{pub.email}</p>
          </div>
        </div>
      </td>

      {/* Specializations */}
      <td>
        <SpecChips specs={pub.area_of_specialization ?? []} max={3} />
      </td>

      {/* Location */}
      <td style={{ fontSize: 11, color: "var(--text2)" }}>
        {pub.display_location || "—"}
      </td>

      {/* Account manager */}
      <td>
        {pub.sales_manager_name ? (
          <span style={{ fontSize: 11, color: "var(--text2)" }}>
            {pub.sales_manager_name}
          </span>
        ) : (
          <span style={{ fontSize: 10, color: "var(--text3)", fontStyle: "italic" }}>
            Unassigned
          </span>
        )}
      </td>

      {/* Bank indicator */}
      <td style={{ textAlign: "center" }}>
        {pub.has_bank_details ? (
          <span title="Bank details added" style={{ fontSize: 14 }}>🏦</span>
        ) : (
          <span style={{ fontSize: 10, color: "var(--text3)" }}>—</span>
        )}
      </td>

      {/* Status */}
      <td>
        <StatusBadge status={pub.status} />
      </td>

      {/* Actions */}
      <td style={{ textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", gap: 5, justifyContent: "flex-end" }}>
          <ActionBtn label="View" color="var(--accent)" onClick={onView} />
          {canManage && (
            <ActionBtn label="Edit" color="#3A80D0" onClick={onEdit} />
          )}
          {canActivate && (
            <ActionBtn
              label={pub.status === "active" ? "Deactivate" : "Activate"}
              color={pub.status === "active" ? "#C03030" : "#0A7838"}
              onClick={onToggleStatus}
            />
          )}
          {canDelete && (
            <ActionBtn label="Delete" color="#C03030" onClick={onDelete} />
          )}
        </div>
      </td>
    </tr>
  );
}

function ActionBtn({ label, color, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: "3px 8px", borderRadius: 3,
        border: `1px solid ${hov ? color + "60" : "var(--border)"}`,
        background: hov ? color + "10" : "none",
        fontSize: 10, fontWeight: 600,
        color: hov ? color : "var(--text3)",
        cursor: "pointer", transition: "all 0.12s",
        whiteSpace: "nowrap", fontFamily: "inherit",
      }}
    >
      {label}
    </button>
  );
}

function DeleteConfirm({ name, onCancel, onConfirm, loading }) {
  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.4)",
      display: "flex", alignItems: "center",
      justifyContent: "center", zIndex: 200,
    }}>
      <div style={{
        background: "var(--white)", borderRadius: 6,
        padding: "28px 32px", maxWidth: 380,
        width: "90%", boxShadow: "var(--shadow-lg)",
      }}>
        <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
          Delete Publisher?
        </p>
        <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 20 }}>
          This will permanently delete <strong>{name}</strong>.
          This action cannot be undone.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="btn btn-secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button className="btn btn-danger" onClick={onConfirm} disabled={loading}>
            {loading ? "Deleting…" : "Yes, Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}