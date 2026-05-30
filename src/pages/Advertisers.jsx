/**
 * pages/Advertisers.jsx
 *
 * Advertiser list page — full implementation.
 *
 * Features:
 *   - Stats bar (total, active, by type)
 *   - Filter bar (type, region, status, search)
 *   - Table with all key columns
 *   - Create / Edit via modal form (Operations/Admin only)
 *   - Quick status toggle from table
 *   - Role-aware: Sales sees read-only, Ops/Admin can create/edit
 */
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth }     from "@/hooks/useAuth";
import {
  useAdvertisers,
  useAdvertiserChoices,
  useAdvertiserStats,
  useDeleteAdvertiser,
  useExportAdvertisers,
} from "@/hooks/useAdvertisers";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useToast }    from "@/components/common/Toast";
import { hasPerm } from "@/utils/permissions";
import Spinner         from "@/components/common/Spinner";
import EmptyState      from "@/components/common/EmptyState";
import Avatar          from "@/components/common/Avatar";
import MobileFilterPanel from "@/components/common/MobileFilterPanel";
import AdvertiserForm  from "@/components/advertisers/AdvertiserForm";
import { REGIONS }     from "@/constants/regions";
import { useSortable } from "@/hooks/useSortable";
import SortableHeader  from "@/components/common/SortableHeader";
import DateRangeFilter from "@/components/common/DateRangeFilter";
import IdBadge         from "@/components/common/IdBadge";

const toArray = (d) => Array.isArray(d) ? d : (d?.results ?? []);

const dropdownItemStyle = {
  display:    "block",
  width:      "100%",
  padding:    "10px 14px",
  background: "transparent",
  border:     "none",
  textAlign:  "left",
  fontSize:   13,
  color:      "var(--text1)",
  cursor:     "pointer",
  fontFamily: "inherit",
};

// ── Permission helpers ─────────────────────────────────────────────────────────
const canCreate = (user) => !!user;
const canManage = (user) => hasPerm(user, "advertisers");
const canDelete = (user) => user?.role === "admin";

// ── Status badge ──────────────────────────────────────────────────────────────
const STATUS_STYLE = {
  approved: { bg: "#E4F8EE", color: "#0A5A28", border: "#80D8A8" },
  active:   { bg: "#E4F8EE", color: "#0A5A28", border: "#80D8A8" },  // legacy alias
  pending:  { bg: "#FDF4E0", color: "#A06010", border: "#F0D080", icon: "⏳" },
  pending_approval: { bg: "#FDF4E0", color: "#A06010", border: "#F0D080", icon: "⏳" }, // legacy
  rejected: { bg: "#FCE8E8", color: "#8A1A1A", border: "#F0A8A8", icon: "✗" },
  inactive: { bg: "#FCE8E8", color: "#8A1A1A", border: "#F0A8A8" },
  paused:   { bg: "#FDF4E0", color: "#7A4A00", border: "#F0D080" },
  merged:   { bg: "#E0E7FF", color: "#3730A3", border: "#818CF8", icon: "⇒" },
};

const STATUS_LABEL = {
  approved:         "Approved",
  pending:          "Pending",
  pending_approval: "Pending",
  rejected:         "Rejected",
  merged:           "Merged",
};

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.inactive;
  const label = STATUS_LABEL[status] ?? status;
  return (
    <span style={{
      display:      "inline-flex",
      alignItems:   "center",
      gap:          4,
      padding:      "2px 8px",
      borderRadius: 3,
      fontSize:     10,
      fontWeight:   600,
      background:   s.bg,
      color:        s.color,
      border:       `1px solid ${s.border}`,
      textTransform: "capitalize",
    }}>
      {s.icon ? (
        <span style={{ fontSize: 10, lineHeight: 1 }}>{s.icon}</span>
      ) : (
        <span style={{
          width: 5, height: 5, borderRadius: "50%",
          background: s.color, flexShrink: 0,
        }} />
      )}
      {label}
    </span>
  );
}

// ── Type badge ────────────────────────────────────────────────────────────────
const TYPE_COLORS = {
  direct_client: { bg: "#E0EEFA", color: "#1A5A9A" },
  network:       { bg: "#EEE0F8", color: "#6030A0" },
  agency:        { bg: "#E0F8EC", color: "#0A7838" },
  freelancer:    { bg: "#FDF4E0", color: "#7A4A00" },
};

function TypeBadge({ type, label }) {
  const c = TYPE_COLORS[type] ?? { bg: "var(--surface)", color: "var(--text2)" };
  return (
    <span style={{
      fontSize:     10,
      fontWeight:   600,
      padding:      "2px 7px",
      borderRadius: 3,
      background:   c.bg,
      color:        c.color,
    }}>
      {label ?? type}
    </span>
  );
}

// ── Clickable stat cards ──────────────────────────────────────────────────────
const STAT_CARDS = [
  { filter: "",         label: "Total",    statKey: "total",    color: "#1A5A9A" },
  { filter: "approved", label: "Approved", statKey: "approved", color: "#0A7838" },
  { filter: "pending",  label: "Pending",  statKey: "pending",  color: "#A06010" },
  { filter: "rejected", label: "Rejected", statKey: "rejected", color: "#8A1A1A" },
  { filter: "merged",   label: "Merged",   statKey: "merged",   color: "#3730A3" },
];

function StatsCards({ stats, statusFilter, onFilter, showMerged }) {
  const cards = STAT_CARDS.filter((c) => c.filter !== "merged" || showMerged);

  return (
    <div style={{
      display:             "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
      gap:                 10,
      marginBottom:        14,
    }}>
      {cards.map((card) => {
        const isActive = statusFilter === card.filter;
        return (
          <button
            key={card.filter}
            type="button"
            onClick={() => onFilter(card.filter)}
            style={{
              padding:      "12px 14px",
              background:   isActive ? "#FEF3E2" : "var(--white)",
              border:       isActive
                ? "2px solid var(--accent)"
                : "1px solid var(--border)",
              borderRadius: 4,
              cursor:       "pointer",
              textAlign:    "left",
              outline:      "none",
              fontFamily:   "inherit",
              transition:   "background 0.12s",
            }}
            onMouseEnter={(e) => {
              if (!isActive) e.currentTarget.style.background = "var(--surface)";
            }}
            onMouseLeave={(e) => {
              if (!isActive) e.currentTarget.style.background = "var(--white)";
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 800, color: card.color, lineHeight: 1.1 }}>
              {stats?.[card.statKey] ?? "—"}
            </div>
            <div style={{
              fontSize:      10,
              color:         isActive ? "var(--accent)" : "var(--text3)",
              marginTop:     4,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              fontWeight:    isActive ? 700 : 600,
            }}>
              {card.label}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AdvertisersPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast    = useToast();
  const isMobile = useIsMobile();
  const userCanManage       = canManage(user);
  const userCanCreate       = canCreate(user);
  const userCanDelete       = canDelete(user);
  const userIsApproverOrAdmin = user?.role === "admin" || user?.is_mis_approver;

  // ── Export ────────────────────────────────────────────────────────────────
  const { exportData, isExporting } = useExportAdvertisers();
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Filters ───────────────────────────────────────────────────────────────
  const [search,        setSearch]        = useState("");
  const [typeF,         setTypeF]         = useState("");
  const [regionF,       setRegionF]       = useState("");
  const [statusF,       setStatusF]       = useState("");
  const [createdAfter,  setCreatedAfter]  = useState("");
  const [createdBefore, setCreatedBefore] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const activeFilterCount = (typeF ? 1 : 0) + (regionF ? 1 : 0) + (statusF ? 1 : 0) + (createdAfter ? 1 : 0) + (createdBefore ? 1 : 0);
  const clearAllFilters = () => { setSearch(""); setTypeF(""); setRegionF(""); setStatusF(""); setCreatedAfter(""); setCreatedBefore(""); };

  // ── Modals ────────────────────────────────────────────────────────────────
  const [showCreate,  setShowCreate]  = useState(false);
  const [editAdv,     setEditAdv]     = useState(null);
  const [confirmDel,  setConfirmDel]  = useState(null);

  // ── Data ──────────────────────────────────────────────────────────────────
  const apiParams = {
    ...(typeF         && { type:           typeF         }),
    ...(regionF       && { region:         regionF       }),
    ...(statusF       && { status:         statusF       }),
    ...(!statusF      && { exclude_status: "merged"      }),
    ...(search        && { search:         search        }),
    ...(createdAfter  && { created_after:  createdAfter  }),
    ...(createdBefore && { created_before: createdBefore }),
  };
  const statsDateParams = {
    ...(createdAfter  && { created_after:  createdAfter  }),
    ...(createdBefore && { created_before: createdBefore }),
  };
  const { data: rawData, isLoading }  = useAdvertisers(apiParams);
  const { data: advertiserStats }     = useAdvertiserStats(statsDateParams);
  const { data: choices }             = useAdvertiserChoices();
  const deleteMutation                = useDeleteAdvertiser();

  const advertisers = toArray(rawData);
  const { sortedData: sortedAdvertisers, sortBy, sortDir, toggleSort } = useSortable(advertisers, { column: "internal_id", dir: "desc" });
  const types       = choices?.types ?? [];
  const regions     = REGIONS;

  const hasFilters = search || typeF || regionF || statusF || createdAfter || createdBefore;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleExport = async (format) => {
    setShowExportMenu(false);
    try {
      const filters = {
        ...(typeF         && { type:           typeF         }),
        ...(regionF       && { region:         regionF       }),
        ...(statusF       && { status:         statusF       }),
        ...(!statusF      && { exclude_status: "merged"      }),
        ...(search        && { search:         search        }),
        ...(createdAfter  && { created_after:  createdAfter  }),
        ...(createdBefore && { created_before: createdBefore }),
      };
      const result = await exportData(format, filters);
      toast.success(`Exported: ${result.filename}`);
    } catch (err) {
      toast.error(err.response?.data?.error || "Export failed.");
    }
  };

  const handleDelete = async () => {
    if (!confirmDel) return;
    try {
      await deleteMutation.mutateAsync(confirmDel.id);
      toast.success(`Deleted ${confirmDel.full_name}`);
      setConfirmDel(null);
    } catch {
      toast.error("Could not delete advertiser.");
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
        marginBottom: 14,
      }}>
        <div>
          <h1 className="page-title" style={isMobile ? { fontSize: 18 } : undefined}>Advertisers</h1>
          <p className="page-subtitle">
            {isLoading
              ? "Loading…"
              : `${advertisers.length} advertiser${advertisers.length !== 1 ? "s" : ""}`
            }
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {userIsApproverOrAdmin && (
            <div ref={exportMenuRef} style={{ position: "relative" }}>
              <button
                onClick={() => setShowExportMenu((s) => !s)}
                disabled={isExporting}
                className="btn btn-secondary"
                style={isMobile ? { minHeight: 44, fontSize: 14 } : undefined}
              >
                {isExporting ? "Exporting…" : "↓ Export"}
              </button>

              {showExportMenu && (
                <div style={{
                  position:     "absolute",
                  top:          "calc(100% + 4px)",
                  right:        0,
                  background:   "var(--white)",
                  border:       "1px solid var(--border)",
                  borderRadius: 4,
                  boxShadow:    "0 4px 12px rgba(0,0,0,0.1)",
                  zIndex:       100,
                  minWidth:     160,
                }}>
                  <button
                    onClick={() => handleExport("csv")}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    style={dropdownItemStyle}
                  >
                    📄 Export as CSV
                  </button>
                  <button
                    onClick={() => handleExport("xlsx")}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    style={{ ...dropdownItemStyle, borderTop: "1px solid var(--border)" }}
                  >
                    📊 Export as Excel
                  </button>
                </div>
              )}
            </div>
          )}

          {userCanCreate && (
            <button
              className="btn btn-primary"
              onClick={() => setShowCreate(true)}
              style={isMobile ? { minHeight: 44, fontSize: 14 } : undefined}
            >
              + Add Advertiser
            </button>
          )}
        </div>
      </div>

      {/* Stat cards — click to filter by status */}
      {advertiserStats && (
        <StatsCards
          stats={advertiserStats}
          statusFilter={statusF}
          onFilter={setStatusF}
          showMerged={userIsApproverOrAdmin}
        />
      )}

      {/* Filter bar */}
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
                fontSize: 14, minHeight: 40, fontFamily: "inherit",
                outline: "none",
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
                minHeight: 40,
                display: "flex", alignItems: "center", gap: 6,
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
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--text2)" }}>Type</label>
                <select className="form-select" value={typeF}
                  onChange={(e) => setTypeF(e.target.value)}
                  style={{ width: "100%", minHeight: 44, fontSize: 14 }}>
                  <option value="">All Types</option>
                  {types.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
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
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--text2)" }}>Status</label>
                <select className="form-select" value={statusF}
                  onChange={(e) => setStatusF(e.target.value)}
                  style={{ width: "100%", minHeight: 44, fontSize: 14 }}>
                  <option value="">All Status</option>
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="rejected">Rejected</option>
                  {userIsApproverOrAdmin && <option value="merged">Merged</option>}
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
          display:      "flex",
          gap:          8,
          marginBottom: 14,
          flexWrap:     "wrap",
          alignItems:   "center",
        }}>
          {/* Search */}
          <div style={{
            display:    "flex",
            alignItems: "center",
            gap:        6,
            background: "var(--surface)",
            border:     "1px solid var(--border2)",
            borderRadius: 3,
            padding:    "4px 10px",
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="var(--text3)" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              style={{ border: "none", background: "none", outline: "none",
                fontSize: 12, width: 160, fontFamily: "inherit", height: "21px" }}
              placeholder="Search name, email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Type */}
          <select className="form-select" value={typeF}
            onChange={(e) => setTypeF(e.target.value)}
            style={{ width: "auto", minWidth: 140 }}>
            <option value="">All Types</option>
            {types.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
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

          {/* Status */}
          <select className="form-select" value={statusF}
            onChange={(e) => setStatusF(e.target.value)}
            style={{ width: "auto", minWidth: 120 }}>
            <option value="">All Status</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
            {userIsApproverOrAdmin && <option value="merged">Merged</option>}
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
      ) : advertisers.length === 0 ? (
        <EmptyState
          icon="📢"
          title={hasFilters ? "No advertisers match your filters" : "No advertisers yet"}
          subtitle={
            hasFilters
              ? "Try clearing filters"
              : userCanCreate
              ? "Click '+ Add Advertiser' to register your first advertiser"
              : "No advertisers are assigned to you yet"
          }
        />
      ) : isMobile ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {sortedAdvertisers.map((adv) => (
            <div
              key={adv.id}
              onClick={() => navigate(`/advertisers/${adv.id}`)}
              style={{
                padding: "12px 14px",
                background: "var(--white)",
                border: "1px solid var(--border)",
                borderRadius: 4, cursor: "pointer",
                boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{
                    fontSize: 14, fontWeight: 600, color: "var(--text)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {adv.full_name}
                  </span>
                  <IdBadge id={adv.internal_id} />
                </div>
                <StatusBadge status={adv.status} />
              </div>
              <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 4, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <TypeBadge type={adv.type} label={adv.type_display} />
                {adv.display_id && (
                  <span style={{ fontSize: 10, color: "var(--text3)" }}>{adv.display_id}</span>
                )}
              </div>
              <div style={{ fontSize: 11, color: "var(--text3)", display: "flex", gap: 10, flexWrap: "wrap" }}>
                {adv.poc_name && <span>👤 {adv.poc_name}</span>}
                {adv.display_location && <span>📍 {adv.display_location}</span>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <SortableHeader label="ID"         column="internal_id" sortBy={sortBy} sortDir={sortDir} onToggle={toggleSort} />
                <SortableHeader label="Advertiser" column="full_name"   sortBy={sortBy} sortDir={sortDir} onToggle={toggleSort} />
                <th>Type</th>
                <th>POC</th>
                <th>Location</th>
                <SortableHeader label="Status" column="status" sortBy={sortBy} sortDir={sortDir} onToggle={toggleSort} />
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedAdvertisers.map((adv) => (
                <AdvertiserRow
                  key={adv.id}
                  adv={adv}
                  canEdit={userIsApproverOrAdmin}
                  canDelete={userCanDelete}
                  onView={() => navigate(`/advertisers/${adv.id}`)}
                  onEdit={() => setEditAdv(adv)}
                  onDelete={() => setConfirmDel(adv)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <AdvertiserForm
          onClose={() => setShowCreate(false)}
          onSaved={() => setShowCreate(false)}
        />
      )}

      {/* Edit modal */}
      {editAdv && (
        <AdvertiserForm
          advertiser={editAdv}
          onClose={() => setEditAdv(null)}
          onSaved={() => setEditAdv(null)}
        />
      )}

      {/* Delete confirm */}
      {confirmDel && (
        <DeleteConfirm
          name={confirmDel.full_name}
          onCancel={() => setConfirmDel(null)}
          onConfirm={handleDelete}
          loading={deleteMutation.isPending}
        />
      )}
    </div>
  );
}

// ── Table row ─────────────────────────────────────────────────────────────────
function AdvertiserRow({ adv, canEdit, canDelete, onView, onEdit, onDelete }) {
  const [hov, setHov] = useState(false);

  return (
    <tr
      style={{ cursor: "pointer" }}
      onClick={onView}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {/* ID */}
      <td><IdBadge id={adv.internal_id} /></td>

      {/* Advertiser name + email */}
      <td>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Avatar name={adv.full_name} size={30} />
          <div>
            <p style={{ fontWeight: 600, fontSize: 12, color: "var(--text)" }}>
              {adv.full_name}
            </p>
            <p style={{ fontSize: 10, color: "var(--text3)" }}>{adv.email}</p>
          </div>
        </div>
      </td>

      {/* Type */}
      <td>
        <TypeBadge type={adv.type} label={adv.type_display} />
      </td>

      {/* POC */}
      <td>
        <p style={{ fontSize: 12, color: "var(--text)" }}>{adv.poc_name}</p>
        <p style={{ fontSize: 10, color: "var(--text3)" }}>{adv.mobile}</p>
      </td>

      {/* Location */}
      <td style={{ fontSize: 11, color: "var(--text2)" }}>
        {adv.display_location || "—"}
      </td>

      {/* Status */}
      <td>
        <StatusBadge status={adv.status} />
        {adv.status === "merged" && adv.merged_into_name && (
          <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 2 }}>
            → {adv.merged_into_name}
          </div>
        )}
        {adv.status === "rejected" && adv.rejection_note && (
          <p
            title={adv.rejection_note}
            style={{
              fontStyle: "italic",
              fontSize: 9,
              color: "#8A1A1A",
              maxWidth: 120,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              marginTop: 3,
            }}
          >
            "{adv.rejection_note.slice(0, 40)}…"
          </p>
        )}
      </td>

      {/* Actions */}
      <td style={{ textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", gap: 5, justifyContent: "flex-end" }}>
          <ActionBtn label="View" color="var(--accent)" onClick={onView} />
          {canEdit && (
            <ActionBtn label="Edit" color="#3A80D0" onClick={onEdit} />
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
        padding:      "3px 8px",
        borderRadius: 3,
        border:       `1px solid ${hov ? color + "60" : "var(--border)"}`,
        background:   hov ? color + "10" : "none",
        fontSize:     10,
        fontWeight:   600,
        color:        hov ? color : "var(--text3)",
        cursor:       "pointer",
        transition:   "all 0.12s",
        whiteSpace:   "nowrap",
        fontFamily:   "inherit",
      }}
    >
      {label}
    </button>
  );
}

// ── Delete confirm modal ──────────────────────────────────────────────────────
function DeleteConfirm({ name, onCancel, onConfirm, loading }) {
  return (
    <div style={{
      position:   "fixed",
      inset:      0,
      background: "rgba(0,0,0,0.4)",
      display:    "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex:     200,
    }}>
      <div style={{
        background:   "var(--white)",
        borderRadius: 6,
        padding:      "28px 32px",
        maxWidth:     380,
        width:        "90%",
        boxShadow:    "var(--shadow-lg)",
      }}>
        <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
          Delete Advertiser?
        </p>
        <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 20 }}>
          This will permanently delete <strong>{name}</strong> and all associated data.
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