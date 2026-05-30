/**
 * pages/Leads.jsx
 *
 * Full leads management page with:
 *  - Tab switcher: All Leads | Raw Leads (admin only)
 *  - Search + filter bar
 *  - Paginated leads table with inline stage selector
 *  - Add Lead, Edit, Assign, Delete modals
 *  - URL query params sync for deep-linking filters
 *  - Shared user filter from UserFilterContext (layers on top of other filters)
 *
 * Raw Leads = assigned_to is null (imported without assignee or left unassigned).
 * Visible to Admin only — managers and employees never see unassigned leads.
 */
import { useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

import { useAuth }              from "@/hooks/useAuth";
import { useLeads }             from "@/hooks/useLeads";
import { useTags }              from "@/hooks/useTags";
import { useIsMobile }          from "@/hooks/useIsMobile";
import { isAdmin, isAdminOrManager } from "@/utils/roles";
import { hasPerm } from "@/utils/permissions";
import { useUserFilter }        from "@/context/UserFilterContext";
import { STAGE_META, PRIORITY_META, SOURCE_LABELS } from "@/utils/formatters";

import LeadTable          from "@/components/leads/LeadTable";
import LeadForm           from "@/components/leads/LeadForm";
import AssignModal        from "@/components/leads/AssignModal";
import DeleteConfirm      from "@/components/leads/DeleteConfirm";
import UserFilterBar      from "@/components/common/UserFilterBar";
import MobileFilterPanel  from "@/components/common/MobileFilterPanel";

const TAB        = { ALL: "all", RAW: "raw" };
const STAGES     = Object.keys(STAGE_META);
const PRIORITIES = Object.keys(PRIORITY_META);
const SOURCES    = Object.keys(SOURCE_LABELS);

export default function LeadsPage() {
  const { user }    = useAuth();
  const navigate    = useNavigate();
  const isMobile    = useIsMobile();
  const isAdminUser = isAdmin(user);
  const isAdminMgr  = isAdminOrManager(user);
  const hasSalesCrm = hasPerm(user, "sales_crm");

  // ── Tab (admin only) ──────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState(TAB.ALL);
  const isRawTab = isAdminUser && activeTab === TAB.RAW;

  // ── Shared user filter ────────────────────────────────────────────────────
  const { selectedIds, team } = useUserFilter();
  const contextAssignedTo = useMemo(
    () => selectedIds.size > 0 ? [...selectedIds].join(",") : null,
    [selectedIds]
  );

  // ── URL ↔ filter sync ─────────────────────────────────────────────────────
  const [searchParams, setSearchParams] = useSearchParams();

  const filtersFromUrl = () => ({
    search:      searchParams.get("search")      || undefined,
    stage:       searchParams.get("stage")       || undefined,
    priority:    searchParams.get("priority")    || undefined,
    source:      searchParams.get("source")      || undefined,
    assigned_to: searchParams.get("assigned_to") || undefined,
  });

  const [filters, setFilters] = useState(filtersFromUrl);

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
    const params = {};
    Object.entries(newFilters).forEach(([k, v]) => { if (v) params[k] = v; });
    setSearchParams(params, { replace: true });
  };

  // ── Effective assigned_to: context overrides LeadFilters dropdown ──────────
  const effectiveAssignedTo = contextAssignedTo ?? filters.assigned_to;

  // ── Tag filter (admin only) ───────────────────────────────────────────────
  const [tagFilter, setTagFilter] = useState("");
  const { data: tagsData } = useTags();
  const tags = tagsData?.results ?? (Array.isArray(tagsData) ? tagsData : []);

  // ── Data ──────────────────────────────────────────────────────────────────
  const normalise = (data) =>
    Array.isArray(data) ? data : (data?.results ?? []);

  const allLeadsFilter = {
    ...filters,
    assigned_to: effectiveAssignedTo,
    ...(tagFilter && { tag: tagFilter }),
    page_size: 50,
  };

  const { data: allData, isLoading: allLoading } = useLeads(allLeadsFilter);

  const { data: rawData, isLoading: rawLoading } = useLeads({
    ...filters,
    assigned_to: "none",
    page_size:   50,
  });

  // Backend role-scopes /api/leads/ — sales reps see their accessible leads,
  // managers see their team's leads, admins see everything. No client-side
  // endpoint switch needed.
  const leads   = normalise(isRawTab ? rawData    : allData);
  const loading = isRawTab           ? rawLoading : allLoading;

  const rawCount = normalise(rawData).length;

  // Active filter count — used for mobile "Filters" badge
  const filterActiveCount =
    ["stage", "priority", "source", "assigned_to"].filter((k) => filters[k]).length +
    (tagFilter ? 1 : 0);

  // ── Modal / panel state ───────────────────────────────────────────────────
  const [showAdd,    setShowAdd]    = useState(false);
  const [editLead,   setEditLead]   = useState(null);
  const [assignLead, setAssignLead] = useState(null);
  const [deleteLead, setDeleteLead] = useState(null);
  const [panelOpen,  setPanelOpen]  = useState(false);

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
          <h1 className="page-title" style={isMobile ? { fontSize: 18 } : undefined}>
            {isRawTab ? "Raw Leads" : isAdminMgr ? "Leads" : "My Leads"}
          </h1>
          <p className="page-subtitle">
            {loading
              ? "Loading…"
              : isRawTab
              ? `${leads.length} unassigned lead${leads.length !== 1 ? "s" : ""} — visible to Admin only`
              : `${leads.length} lead${leads.length !== 1 ? "s" : ""}${
                  effectiveAssignedTo || Object.values(filters).some(Boolean)
                    ? " matching filters"
                    : ""
                }`}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {hasSalesCrm && (
            <button
              className="btn btn-secondary"
              onClick={() => navigate("/bulk-upload")}
              style={isMobile ? { minHeight: 44, fontSize: 14 } : undefined}
            >
              ↑ Bulk Upload
            </button>
          )}
          <button
            className="btn btn-primary"
            onClick={() => setShowAdd(true)}
            style={isMobile ? { minHeight: 44, fontSize: 14 } : undefined}
          >
            + Add Lead
          </button>
        </div>
      </div>

      {/* Shared user filter bar (admin/manager only) */}
      {!isRawTab && <UserFilterBar />}

      {/* ── Tab switcher — admin only ── */}
      {isAdminUser && (
        <div style={{
          display:      "flex",
          borderBottom: "1px solid var(--border)",
          marginBottom: 16,
        }}>
          <button
            onClick={() => setActiveTab(TAB.ALL)}
            style={{
              padding:      "10px 16px",
              border:       "none",
              borderBottom: activeTab === TAB.ALL
                ? "2px solid var(--accent)"
                : "2px solid transparent",
              background:   "none",
              fontSize:     11,
              fontWeight:   activeTab === TAB.ALL ? 700 : 400,
              color:        activeTab === TAB.ALL ? "var(--accent)" : "var(--text3)",
              cursor:       "pointer",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              fontFamily:   "inherit",
              marginBottom: -1,
            }}
          >
            All Leads
          </button>

          <button
            onClick={() => setActiveTab(TAB.RAW)}
            style={{
              display:      "flex",
              alignItems:   "center",
              gap:          6,
              padding:      "10px 16px",
              border:       "none",
              borderBottom: activeTab === TAB.RAW
                ? "2px solid #C08010"
                : "2px solid transparent",
              background:   "none",
              fontSize:     11,
              fontWeight:   activeTab === TAB.RAW ? 700 : 400,
              color:        activeTab === TAB.RAW ? "#C08010" : "var(--text3)",
              cursor:       "pointer",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              fontFamily:   "inherit",
              marginBottom: -1,
            }}
          >
            Raw Leads
            {rawCount > 0 && (
              <span style={{
                fontSize:     10,
                fontWeight:   700,
                padding:      "1px 6px",
                borderRadius: 3,
                background:   activeTab === TAB.RAW ? "#C08010" : "#FDF4E0",
                color:        activeTab === TAB.RAW ? "#fff"     : "#C08010",
                border:       "1px solid #F0D080",
              }}>
                {rawCount}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Raw leads info banner */}
      {isRawTab && (
        <div style={{
          display:      "flex",
          alignItems:   "center",
          justifyContent: "space-between",
          padding:      "11px 16px",
          background:   "#FDF4E0",
          border:       "1px solid #F0D080",
          borderRadius: 3,
          marginBottom: 16,
          gap:          12,
          flexWrap:     "wrap",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18 }}>📥</span>
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#7A4A00" }}>
                Raw Leads — Admin Only
              </p>
              <p style={{ fontSize: 11, color: "#C08010" }}>
                These leads have no assigned sales employee. Use the Assign button to allocate them to your team.
              </p>
            </div>
          </div>
          <button
            className="btn btn-sm"
            style={{ background: "#C08010", color: "#fff", border: "none", flexShrink: 0 }}
            onClick={() => navigate("/bulk-upload")}
          >
            + Bulk Upload
          </button>
        </div>
      )}

      {/* Filters — hide on Raw tab */}
      {!isRawTab && (
        <div style={{ marginBottom: 16 }}>
          {isMobile ? (
            <>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  value={filters.search ?? ""}
                  onChange={(e) => handleFiltersChange({ ...filters, search: e.target.value || undefined })}
                  placeholder="Search leads…"
                  style={{
                    flex: 1, padding: "10px 12px",
                    border: "1px solid var(--border)", borderRadius: 3,
                    fontSize: 14, minHeight: 40, fontFamily: "inherit", outline: "none",
                  }}
                />
                <button
                  onClick={() => setPanelOpen(true)}
                  style={{
                    padding: "0 14px",
                    background: filterActiveCount > 0 ? "var(--accent)" : "var(--white)",
                    color:      filterActiveCount > 0 ? "#fff"           : "var(--text)",
                    border: "1px solid var(--border2)", borderRadius: 3,
                    fontSize: 13, fontWeight: 600, cursor: "pointer",
                    minHeight: 40, display: "flex", alignItems: "center", gap: 6,
                    whiteSpace: "nowrap", fontFamily: "inherit",
                  }}
                >
                  🔍 Filters
                  {filterActiveCount > 0 && (
                    <span style={{
                      background: "#fff", color: "var(--accent)", borderRadius: 10,
                      padding: "1px 6px", fontSize: 10, fontWeight: 700,
                    }}>
                      {filterActiveCount}
                    </span>
                  )}
                </button>
              </div>

              {panelOpen && (
                <MobileFilterPanel
                  onClose={() => setPanelOpen(false)}
                  onClear={() => { handleFiltersChange({}); setTagFilter(""); setPanelOpen(false); }}
                  onApply={() => setPanelOpen(false)}
                >
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--text2)" }}>Stage</label>
                    <select className="form-select" value={filters.stage ?? ""} onChange={(e) => handleFiltersChange({ ...filters, stage: e.target.value || undefined })} style={{ width: "100%", minHeight: 44, fontSize: 14 }}>
                      <option value="">All Stages</option>
                      {STAGES.map((s) => <option key={s} value={s}>{STAGE_META[s]?.label ?? s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--text2)" }}>Priority</label>
                    <select className="form-select" value={filters.priority ?? ""} onChange={(e) => handleFiltersChange({ ...filters, priority: e.target.value || undefined })} style={{ width: "100%", minHeight: 44, fontSize: 14 }}>
                      <option value="">All Priorities</option>
                      {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_META[p].label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--text2)" }}>Source</label>
                    <select className="form-select" value={filters.source ?? ""} onChange={(e) => handleFiltersChange({ ...filters, source: e.target.value || undefined })} style={{ width: "100%", minHeight: 44, fontSize: 14 }}>
                      <option value="">All Sources</option>
                      {SOURCES.map((s) => <option key={s} value={s}>{SOURCE_LABELS[s]}</option>)}
                    </select>
                  </div>
                  {isAdminMgr && (
                    <div>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--text2)" }}>Assigned To</label>
                      <select className="form-select" value={filters.assigned_to ?? ""} onChange={(e) => handleFiltersChange({ ...filters, assigned_to: e.target.value || undefined })} style={{ width: "100%", minHeight: 44, fontSize: 14 }}>
                        <option value="">All Reps</option>
                        <option value="none">Unassigned</option>
                        {team.map((rep) => <option key={rep.id} value={rep.id}>{rep.full_name}</option>)}
                      </select>
                    </div>
                  )}
                  {isAdminUser && (
                    <div>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--text2)" }}>CRM Tag</label>
                      <select className="form-select" value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} style={{ width: "100%", minHeight: 44, fontSize: 14 }}>
                        <option value="">All CRM Tags</option>
                        {tags.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.lead_count})</option>)}
                      </select>
                    </div>
                  )}
                </MobileFilterPanel>
              )}
            </>
          ) : (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <input
                type="text"
                value={filters.search ?? ""}
                onChange={(e) => handleFiltersChange({ ...filters, search: e.target.value || undefined })}
                placeholder="Search leads…"
                className="form-input"
                style={{ flex: "1 1 240px", minWidth: 200, height: 38 }}
              />
              <select className="form-select" value={filters.stage ?? ""} onChange={(e) => handleFiltersChange({ ...filters, stage: e.target.value || undefined })} style={{ flex: "0 0 160px", minWidth: 160, height: 38 }}>
                <option value="">All stages</option>
                {STAGES.map((s) => <option key={s} value={s}>{STAGE_META[s]?.label ?? s}</option>)}
              </select>
              <select className="form-select" value={filters.priority ?? ""} onChange={(e) => handleFiltersChange({ ...filters, priority: e.target.value || undefined })} style={{ flex: "0 0 160px", minWidth: 160, height: 38 }}>
                <option value="">All priorities</option>
                {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_META[p].label}</option>)}
              </select>
              <select className="form-select" value={filters.source ?? ""} onChange={(e) => handleFiltersChange({ ...filters, source: e.target.value || undefined })} style={{ flex: "0 0 160px", minWidth: 160, height: 38 }}>
                <option value="">All sources</option>
                {SOURCES.map((s) => <option key={s} value={s}>{SOURCE_LABELS[s]}</option>)}
              </select>
              {isAdminMgr && (
                <select className="form-select" value={filters.assigned_to ?? ""} onChange={(e) => handleFiltersChange({ ...filters, assigned_to: e.target.value || undefined })} style={{ flex: "0 0 160px", minWidth: 160, height: 38 }}>
                  <option value="">All reps</option>
                  <option value="none">Unassigned</option>
                  {team.map((rep) => <option key={rep.id} value={rep.id}>{rep.full_name}</option>)}
                </select>
              )}
              {isAdminUser && (
                <select className="form-select" value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} style={{ flex: "0 0 160px", minWidth: 160, height: 38 }}>
                  <option value="">All CRM Tags</option>
                  {tags.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.lead_count})</option>)}
                </select>
              )}
              {(Object.values(filters).some(Boolean) || tagFilter) && (
                <button className="btn btn-ghost btn-sm" onClick={() => { handleFiltersChange({}); setTagFilter(""); }} style={{ color: "var(--red)", whiteSpace: "nowrap" }}>
                  ✕ Clear
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="card">
        <div className="card-header" style={{ padding: "12px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="card-title">
              {isRawTab
                ? "Unassigned Leads"
                : effectiveAssignedTo || Object.values(filters).some(Boolean)
                ? "Filtered Results"
                : "All Leads"}
            </span>
            {!loading && (
              <span style={{
                fontSize:     11,
                color:        "var(--text3)",
                background:   "var(--surface)",
                border:       "1px solid var(--border)",
                borderRadius: 3,
                padding:      "1px 8px",
              }}>
                {leads.length}
              </span>
            )}
          </div>

          {/* Active filter chips — only on All tab */}
          {!isRawTab && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {filters.stage && (
                <FilterChip
                  label={`Stage: ${filters.stage}`}
                  onRemove={() => handleFiltersChange({ ...filters, stage: undefined })}
                />
              )}
              {filters.priority && (
                <FilterChip
                  label={`Priority: ${filters.priority}`}
                  onRemove={() => handleFiltersChange({ ...filters, priority: undefined })}
                />
              )}
              {filters.assigned_to === "none" && (
                <FilterChip
                  label="Unassigned"
                  onRemove={() => handleFiltersChange({ ...filters, assigned_to: undefined })}
                />
              )}
              {tagFilter && (
                <FilterChip
                  label={`Tag: ${tags.find((t) => String(t.id) === tagFilter)?.name ?? tagFilter}`}
                  onRemove={() => setTagFilter("")}
                />
              )}
            </div>
          )}
        </div>

        <LeadTable
          leads={leads}
          loading={loading}
          onEdit={setEditLead}
          onAssign={setAssignLead}
          onDelete={setDeleteLead}
        />
      </div>

      {/* ── Modals ── */}
      {showAdd && (
        <LeadForm
          onClose={() => setShowAdd(false)}
          onSaved={(lead) => lead?.id && navigate(`/leads/${lead.id}`)}
        />
      )}
      {editLead && (
        <LeadForm
          lead={editLead}
          onClose={() => setEditLead(null)}
          onSaved={() => setEditLead(null)}
        />
      )}
      {assignLead && (
        <AssignModal
          lead={assignLead}
          onClose={() => setAssignLead(null)}
        />
      )}
      {deleteLead && (
        <DeleteConfirm
          lead={deleteLead}
          onClose={() => setDeleteLead(null)}
        />
      )}
    </div>
  );
}

// ── Filter chip ────────────────────────────────────────────────────────────────
function FilterChip({ label, onRemove }) {
  return (
    <div style={{
      display:      "flex",
      alignItems:   "center",
      gap:          5,
      padding:      "3px 8px 3px 10px",
      borderRadius: 3,
      background:   "var(--accent-lt)",
      border:       "1px solid #F0D080",
      fontSize:     11,
      fontWeight:   600,
      color:        "var(--accent)",
    }}>
      {label}
      <button
        onClick={onRemove}
        style={{
          border: "none", background: "none", cursor: "pointer",
          color: "var(--accent)", fontSize: 12, lineHeight: 1, padding: "0 2px",
        }}
      >✕</button>
    </div>
  );
}
