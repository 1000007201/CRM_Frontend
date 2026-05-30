/**
 * pages/Pipeline.jsx
 *
 * Kanban pipeline board. User filter comes from UserFilterContext (shared
 * across all Sales CRM tabs). Local filters: priority, source.
 */
import { useState, useMemo }   from "react";
import { useNavigate }          from "react-router-dom";
import { useAuth }              from "@/hooks/useAuth";
import { usePipeline, useLeads } from "@/hooks/useLeads";
import { useTags }              from "@/hooks/useTags";
import { useIsMobile }          from "@/hooks/useIsMobile";
import { isAdmin }              from "@/utils/roles";
import { STAGE_META, PRIORITY_META, SOURCE_LABELS } from "@/utils/formatters";
import { useUserFilter }        from "@/context/UserFilterContext";

import KanbanColumn  from "@/components/pipeline/KanbanColumn";
import LeadForm      from "@/components/leads/LeadForm";
import AssignModal   from "@/components/leads/AssignModal";
import Spinner       from "@/components/common/Spinner";
import UserFilterBar from "@/components/common/UserFilterBar";

const STAGES = Object.keys(STAGE_META);

export default function PipelinePage() {
  const navigate    = useNavigate();
  const { user }    = useAuth();
  const isMobile    = useIsMobile();
  const isAdminUser = isAdmin(user);
  const [activeStage, setActiveStage] = useState(STAGES[0]);

  // ── Shared user filter from context ──────────────────────────────────────
  const { selectedIds, team } = useUserFilter();
  const hasSelection = selectedIds.size > 0;

  // ── Other filters ─────────────────────────────────────────────────────────
  const [filters, setFilters] = useState({});
  const setF = (k, v) => setFilters((f) => ({ ...f, [k]: v || undefined }));
  const [searchQuery, setSearchQuery] = useState("");
  const [tagFilter,   setTagFilter]   = useState("");

  // ── Tags for filter dropdown ───────────────────────────────────────────────
  const { data: tagsData } = useTags();
  const tagList = tagsData?.results ?? (Array.isArray(tagsData) ? tagsData : []);

  // ── Build pipeline query params ───────────────────────────────────────────
  const combinedFilter = useMemo(() => {
    const f = { ...filters };
    if (hasSelection) f.assigned_to = [...selectedIds].join(",");
    if (tagFilter)    f.tag         = tagFilter;
    return f;
  }, [selectedIds, hasSelection, filters, tagFilter]);

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data: pipeline, isLoading } = usePipeline(combinedFilter);

  const filteredPipeline = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || !pipeline) return pipeline;
    const result = {};
    for (const stage of STAGES) {
      const leads    = pipeline[stage]?.leads ?? [];
      const filtered = leads.filter((lead) => {
        const name    = (lead.contact_name || "").toLowerCase();
        const company = (lead.company       || "").toLowerCase();
        return name.includes(q) || company.includes(q);
      });
      result[stage] = { ...pipeline[stage], leads: filtered, count: filtered.length };
    }
    return result;
  }, [pipeline, searchQuery]);

  // Raw leads — admin only, hidden when filter is active
  const { data: rawData, isLoading: rawLoading } = useLeads({
    assigned_to: "none", page_size: 50,
  });
  const rawLeads = Array.isArray(rawData) ? rawData : (rawData?.results ?? []);
  const [rawExpanded, setRawExpanded] = useState(true);

  // ── Modals ────────────────────────────────────────────────────────────────
  const [showAdd,    setShowAdd]    = useState(false);
  const [editLead,   setEditLead]   = useState(null);
  const [assignLead, setAssignLead] = useState(null);

  // ── Selection label for subtitle ──────────────────────────────────────────
  const selectionLabel = useMemo(() => {
    if (!hasSelection) return isAdminUser ? "Full organisation pipeline" : "Your team pipeline";
    const names = [...selectedIds]
      .map((id) => team.find((t) => t.id === id)?.full_name.split(" ")[0])
      .filter(Boolean);
    if (names.length <= 3) return names.join(", ");
    return `${names.slice(0, 2).join(", ")} +${names.length - 2} more`;
  }, [selectedIds, team, hasSelection, isAdminUser]);

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
        marginBottom: 12,
      }}>
        <div>
          <h1 className="page-title" style={isMobile ? { fontSize: 18 } : undefined}>Pipeline</h1>
          <p className="page-subtitle">{selectionLabel}</p>
        </div>
        <div style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          flexWrap: "wrap",
        }}>
          {/* Search */}
          <div style={{ position: "relative", flex: "0 0 220px" }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name or company…"
              style={{
                width:        "100%",
                height:       38,
                padding:      searchQuery ? "0 30px 0 12px" : "0 12px",
                fontSize:     13,
                border:       "1px solid var(--border)",
                borderRadius: 4,
                background:   "var(--white)",
                outline:      "none",
                fontFamily:   "inherit",
                boxSizing:    "border-box",
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                style={{
                  position:   "absolute",
                  right:      8,
                  top:        "50%",
                  transform:  "translateY(-50%)",
                  background: "transparent",
                  border:     "none",
                  cursor:     "pointer",
                  color:      "var(--text3)",
                  fontSize:   14,
                  padding:    4,
                  lineHeight: 1,
                }}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          <select className="form-select" value={filters.priority ?? ""}
            onChange={(e) => setF("priority", e.target.value)}
            style={{ width: isMobile ? "100%" : "auto", minWidth: 130, minHeight: isMobile ? 44 : undefined, fontSize: isMobile ? 14 : undefined }}>
            <option value="">All Priorities</option>
            {Object.entries(PRIORITY_META).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <select className="form-select" value={filters.source ?? ""}
            onChange={(e) => setF("source", e.target.value)}
            style={{ width: isMobile ? "100%" : "auto", minWidth: 130, minHeight: isMobile ? 44 : undefined, fontSize: isMobile ? 14 : undefined }}>
            <option value="">All Sources</option>
            {Object.entries(SOURCE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select className="form-select" value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            style={{ width: isMobile ? "100%" : "auto", minWidth: 130, minHeight: isMobile ? 44 : undefined, fontSize: isMobile ? 14 : undefined }}>
            <option value="">All CRM Tags</option>
            {tagList.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <button
            className="btn btn-primary"
            onClick={() => setShowAdd(true)}
            style={isMobile ? { minHeight: 44, fontSize: 14, width: "100%" } : undefined}
          >
            + Add Lead
          </button>
        </div>
      </div>

      {/* Shared user filter bar */}
      <UserFilterBar />

      {/* Empty state when search matches nothing */}
      {searchQuery && filteredPipeline && !isLoading &&
        Object.values(filteredPipeline).reduce((sum, col) => sum + (col?.leads?.length ?? 0), 0) === 0 && (
        <div style={{
          padding:      20,
          textAlign:    "center",
          fontSize:     13,
          color:        "var(--text3)",
          background:   "var(--surface)",
          borderRadius: 4,
          marginBottom: 14,
          border:       "1px solid var(--border)",
        }}>
          No leads match &ldquo;{searchQuery}&rdquo;. Try a different search term.
        </div>
      )}

      {/* ── Kanban board ── */}
      {isLoading ? (
        <Spinner center />
      ) : isMobile ? (
        <>
          {/* Horizontal stage picker */}
          <div
            className="hide-scrollbar"
            style={{
              background: "var(--white)",
              borderBottom: "1px solid var(--border)",
              overflowX: "auto",
              overflowY: "hidden",
              WebkitOverflowScrolling: "touch",
              margin: "0 -12px 12px",
              padding: "8px 12px",
            }}
          >
            <div style={{ display: "flex", gap: 6 }}>
              {STAGES.map((stage) => {
                const count = filteredPipeline?.[stage]?.count ?? filteredPipeline?.[stage]?.leads?.length ?? 0;
                const active = activeStage === stage;
                return (
                  <button
                    key={stage}
                    onClick={() => setActiveStage(stage)}
                    style={{
                      padding: "8px 14px",
                      minHeight: 36,
                      borderRadius: 18,
                      border: `1px solid ${active ? "var(--accent)" : "var(--border2)"}`,
                      background: active ? "var(--accent)" : "var(--white)",
                      color: active ? "#fff" : "var(--text)",
                      fontSize: 12, fontWeight: 600, cursor: "pointer",
                      whiteSpace: "nowrap", flexShrink: 0,
                      display: "flex", alignItems: "center", gap: 6,
                      fontFamily: "inherit",
                    }}
                  >
                    <span>{STAGE_META[stage]?.label ?? stage}</span>
                    {count > 0 && (
                      <span style={{
                        background: active ? "#fff" : "var(--surface)",
                        color: active ? "var(--accent)" : "var(--text3)",
                        borderRadius: 10,
                        padding: "1px 6px",
                        fontSize: 10, fontWeight: 700,
                      }}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active stage column — full width */}
          <KanbanColumn
            key={activeStage}
            stage={activeStage}
            data={filteredPipeline?.[activeStage]}
            onAssign={setAssignLead}
            onEdit={setEditLead}
            isMobile
          />
        </>
      ) : (
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start", paddingBottom: 24 }}>
          {STAGES.map((stage) => (
            <KanbanColumn
              key={stage}
              stage={stage}
              data={filteredPipeline?.[stage]}
              onAssign={setAssignLead}
              onEdit={setEditLead}
            />
          ))}
        </div>
      )}

      {/* ── Raw leads (admin, default view only) ── */}
      {isAdminUser && !hasSelection && (
        <div style={{ marginTop: 8, marginBottom: 24 }}>
          <button onClick={() => setRawExpanded((v) => !v)} style={{
            display: "flex", alignItems: "center", gap: 10,
            width: "100%", padding: "10px 14px",
            background: "#FDF4E0", border: "1px solid #F0D080",
            borderRadius: rawExpanded ? "3px 3px 0 0" : 3,
            cursor: "pointer", fontFamily: "inherit", textAlign: "left",
          }}>
            <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase",
              letterSpacing: "0.1em", color: "#C08010" }}>
              📥 Raw Leads — Unassigned
            </span>
            {rawLeads.length > 0 && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 7px",
                borderRadius: 3, background: "#C08010", color: "#fff" }}>
                {rawLeads.length}
              </span>
            )}
            <span style={{ marginLeft: "auto", fontSize: 11, color: "#C08010" }}>
              {rawExpanded ? "▲ Collapse" : "▼ Expand"}
            </span>
          </button>
          {rawExpanded && (
            <div style={{ border: "1px solid #F0D080", borderTop: "none",
              borderRadius: "0 0 3px 3px", padding: "12px 14px", background: "#FFFDF5" }}>
              {rawLoading ? <Spinner center /> :
               rawLeads.length === 0 ? (
                <div style={{ textAlign: "center", padding: "16px 0",
                  fontSize: 12, color: "var(--text3)" }}>
                  No raw leads — all leads are assigned ✓
                </div>
              ) : (
                <div style={{ display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
                  {rawLeads.map((lead) => (
                    <RawLeadCard key={lead.id} lead={lead}
                      onAssign={setAssignLead}
                      onView={() => navigate(`/leads/${lead.id}`)} />
                  ))}
                </div>
              )}
              <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
                <button className="btn btn-sm" style={{
                  background: "none", border: "1px solid #F0D080",
                  color: "#C08010", fontSize: 10,
                }} onClick={() => navigate("/bulk-upload")}>
                  + Bulk Upload Leads
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showAdd    && <LeadForm onClose={() => setShowAdd(false)}    onSaved={() => setShowAdd(false)} />}
      {editLead   && <LeadForm lead={editLead} onClose={() => setEditLead(null)} onSaved={() => setEditLead(null)} />}
      {assignLead && <AssignModal lead={assignLead} onClose={() => setAssignLead(null)} />}
    </div>
  );
}

// ── Raw lead card ─────────────────────────────────────────────────────────────
function RawLeadCard({ lead, onAssign, onView }) {
  const [hov, setHov] = useState(false);
  return (
    <div onClick={onView}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? "var(--white)" : "#FFFDF5",
        border: "1px solid #F0D080", borderLeft: "3px solid #C08010",
        borderRadius: 3, padding: "10px 12px",
        cursor: "pointer", transition: "all 0.12s",
        boxShadow: hov ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
      }}
    >
      <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text)",
        marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {lead.contact_name}
      </p>
      {lead.company && (
        <p style={{ fontSize: 10, color: "var(--text3)", marginBottom: 6 }}>{lead.company}</p>
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 9, fontWeight: 600, padding: "1px 6px",
          borderRadius: 3, background: "#FDF4E0", border: "1px solid #F0D080", color: "#C08010" }}>
          {STAGE_META[lead.stage]?.label ?? lead.stage}
        </span>
        <button onClick={(e) => { e.stopPropagation(); onAssign(lead); }}
          style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px",
            borderRadius: 3, border: "1px solid #F0D080",
            background: "#FDF4E0", color: "#C08010",
            cursor: "pointer", fontFamily: "inherit" }}>
          Assign →
        </button>
      </div>
    </div>
  );
}
