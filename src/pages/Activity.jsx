/**
 * pages/Activity.jsx
 *
 * Org-wide activity log (Admin/Manager only — enforced by router).
 * User filter is LOCAL state (independent from Pipeline's shared context).
 *
 * Layout:
 *  - Summary stat cards (total, today, this week, top action)
 *  - User chip filter (local — selecting here doesn't affect Pipeline)
 *  - Local filter bar (action type, date range)
 *  - Tabular log with pagination
 *  - "Most active users" sidebar panel
 */
import { useState, useMemo, useEffect } from "react";
import { useActivityList, useActivitySummary } from "@/hooks/useActivity";
import { useTeam }           from "@/hooks/useUsers";
import { useAuth }           from "@/hooks/useAuth";
import { useIsMobile }       from "@/hooks/useIsMobile";
import { leadsApi }          from "@/api/leads";

import ActivitySummaryCards from "@/components/activity/ActivitySummaryCards";
import ActivityFilters      from "@/components/activity/Activityfilters";
import ActivityTable        from "@/components/activity/ActivityTable";
import AutocompleteInput    from "@/components/common/AutocompleteInput";
import UserChipFilter       from "@/components/common/UserChipFilter";
import Spinner              from "@/components/common/Spinner";
import Avatar               from "@/components/common/Avatar";

export default function ActivityPage() {
  const isMobile       = useIsMobile();
  const { user }       = useAuth();
  const { data: team = [] } = useTeam();

  const [filters,      setFilters]      = useState({});
  const [page,         setPage]         = useState(1);
  const [selectedLead, setSelectedLead] = useState(null);
  const [pageSize,     setPageSize]     = useState(20);

  // ── Local user chip filter (independent from Pipeline) ────────────────────
  const tls     = useMemo(() => team.filter((u) => u.role === "manager"), [team]);
  const members = useMemo(() => team.filter((u) => u.role === "member"),  [team]);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const toggleTL = (tl) => {
    setSelectedIds((prev) => {
      const next      = new Set(prev);
      const tlMembers = members.filter((m) => m.manager === tl.id);
      const group     = [tl.id, ...tlMembers.map((m) => m.id)];
      const allIn     = group.every((id) => next.has(id));
      group.forEach((id) => (allIn ? next.delete(id) : next.add(id)));
      return next;
    });
  };

  const toggleMember = (member) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(member.id) ? next.delete(member.id) : next.add(member.id);
      return next;
    });
  };

  const clearChips = () => setSelectedIds(new Set());

  // Stable string used as effect dep — changes whenever chip selection changes
  const actorParam = useMemo(
    () => selectedIds.size > 0 ? [...selectedIds].sort().join(",") : undefined,
    [selectedIds]
  );

  const handleFiltersChange = (f) => { setFilters(f); setPage(1); };

  useEffect(() => { setPage(1); }, [selectedLead, pageSize, actorParam]);

  const fetchLeadOptions = async (query) => {
    try {
      const res = await leadsApi.search(query, 10);
      return res.data.results ?? res.data ?? [];
    } catch {
      return [];
    }
  };

  const { data: summary, isLoading: summaryLoading } = useActivitySummary();

  const effectiveFilters = useMemo(() => ({
    ...filters,
    ...(actorParam ? { actor: actorParam } : {}),
  }), [filters, actorParam]);

  const { data: activityData, isLoading: listLoading } = useActivityList({
    ...effectiveFilters,
    ...(selectedLead?.id && { lead_id: selectedLead.id }),
    page,
    page_size: pageSize,
  });

  const entries    = activityData?.results ?? activityData ?? [];
  const totalCount = activityData?.count   ?? entries.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const hasNext    = page < totalPages;
  const hasPrev    = page > 1;

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
          <h1 className="page-title" style={isMobile ? { fontSize: 18 } : undefined}>Activity Log</h1>
          <p className="page-subtitle">
            Everything that has happened across all leads
          </p>
        </div>
        <span style={{
          fontSize: 12, color: "var(--text3)",
          background: "var(--white)",
          border: "1px solid var(--border)",
          borderRadius: 3,
          padding: "4px 12px",
          alignSelf: isMobile ? "flex-start" : "auto",
        }}>
          {summaryLoading ? "…" : `${summary?.total_events ?? 0} total events`}
        </span>
      </div>

      {/* Summary cards */}
      <ActivitySummaryCards summary={summary} loading={summaryLoading} />

      {/* Local user chip filter — independent from Pipeline's selection */}
      <UserChipFilter
        tls={tls}
        members={members}
        selectedIds={selectedIds}
        onToggleTL={toggleTL}
        onToggleMember={toggleMember}
        onClearAll={clearChips}
      />

      {/* Main grid: table + sidebar */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 260px", gap: 16, alignItems: "start" }}>

        {/* Left: filter bar + table */}
        <div>
          <div style={{ marginBottom: 14 }}>
            {/* Lead autocomplete filter */}
            <div style={{ marginBottom: 10 }}>
              <AutocompleteInput
                value={selectedLead}
                onChange={setSelectedLead}
                fetchFn={fetchLeadOptions}
                getLabel={(lead) => lead?.contact_name || "Unnamed"}
                getSublabel={(lead) => lead?.company || ""}
                placeholder="Filter by lead name…"
              />
            </div>

            {/* Selected lead indicator */}
            {selectedLead && (
              <div style={{
                display:        "flex",
                alignItems:     "center",
                justifyContent: "space-between",
                padding:        "8px 12px",
                marginBottom:   10,
                background:     "#FFF8E1",
                border:         "1px solid #FBBF24",
                borderRadius:   4,
                fontSize:       12,
              }}>
                <span>
                  Showing activities for:{" "}
                  <strong>
                    {selectedLead.contact_name || "Unnamed"}
                    {selectedLead.company ? ` — ${selectedLead.company}` : ""}
                  </strong>
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedLead(null)}
                  style={{
                    background: "transparent",
                    border:     "none",
                    color:      "var(--text2)",
                    cursor:     "pointer",
                    fontSize:   14,
                    lineHeight: 1,
                    padding:    "0 2px",
                  }}
                  title="Clear filter"
                >
                  ✕
                </button>
              </div>
            )}

            <ActivityFilters
              filters={filters}
              onChange={handleFiltersChange}
            />
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-title">
                Events
                {!listLoading && (
                  <span style={{ color: "var(--text3)", fontWeight: 400, marginLeft: 6 }}>
                    ({totalCount})
                  </span>
                )}
              </span>
              <span style={{ fontSize: 11, color: "var(--text3)" }}>
                Auto-refreshes every 30s
              </span>
            </div>

            <ActivityTable
              entries={entries}
              loading={listLoading}
              emptyMessage={selectedLead ? `No activities found for "${selectedLead.contact_name || "this lead"}"` : undefined}
            />

            {totalCount > 0 && (
              <div style={{
                display:        "flex",
                alignItems:     "center",
                justifyContent: "space-between",
                flexWrap:       "wrap",
                gap:            8,
                padding:        "12px 20px",
                borderTop:      "1px solid var(--border)",
              }}>
                <span style={{ fontSize: 12, color: "var(--text3)" }}>
                  {totalCount > 0
                    ? `Showing ${((page - 1) * pageSize) + 1}–${Math.min(page * pageSize, totalCount)} of ${totalCount}`
                    : "0 events"
                  }
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    style={{
                      height:       32,
                      padding:      "0 8px",
                      fontSize:     12,
                      border:       "1px solid var(--border)",
                      borderRadius: "var(--radius)",
                      background:   "var(--white)",
                      color:        "var(--text)",
                      cursor:       "pointer",
                    }}
                  >
                    <option value={20}>20 / page</option>
                    <option value={50}>50 / page</option>
                    <option value={100}>100 / page</option>
                    <option value={200}>200 / page</option>
                  </select>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setPage((p) => p - 1)}
                    disabled={!hasPrev}
                  >
                    ← Prev
                  </button>
                  <span style={{ fontSize: 12, color: "var(--text3)", whiteSpace: "nowrap" }}>
                    {page} / {totalPages || 1}
                  </span>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={!hasNext}
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: most active users */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Most Active</span>
          </div>
          {summaryLoading ? (
            <Spinner center />
          ) : (
            <div style={{ padding: "8px 0" }}>
              {summary?.most_active_users?.slice(0, 8).map((u, idx) => (
                <div key={u["actor__full_name"] ?? idx} style={{
                  display:      "flex",
                  alignItems:   "center",
                  gap:          10,
                  padding:      "9px 16px",
                  borderBottom: idx < 7 ? "1px solid var(--border)" : "none",
                }}>
                  <span style={{
                    width:      20,
                    fontSize:   11,
                    fontWeight: 700,
                    color:      idx < 3 ? "var(--accent)" : "var(--text3)",
                    textAlign:  "center",
                    flexShrink: 0,
                  }}>
                    #{idx + 1}
                  </span>

                  <Avatar name={u["actor__full_name"] ?? "?"} size={28} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize:     12,
                      fontWeight:   600,
                      whiteSpace:   "nowrap",
                      overflow:     "hidden",
                      textOverflow: "ellipsis",
                    }}>
                      {u["actor__full_name"] ?? "Unknown"}
                    </p>
                    <p style={{ fontSize: 10, color: "var(--text3)" }}>
                      {u["actor__role"]?.replace("_", " ")}
                    </p>
                  </div>

                  <span style={{
                    fontSize:   12,
                    fontWeight: 700,
                    color:      "var(--accent)",
                    flexShrink: 0,
                  }}>
                    {u.count}
                  </span>
                </div>
              ))}
              {!summary?.most_active_users?.length && (
                <p style={{ padding: "20px", textAlign: "center", fontSize: 12, color: "var(--text3)" }}>
                  No data yet
                </p>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
