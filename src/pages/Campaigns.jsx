/**
 * pages/Campaigns.jsx
 *
 * Campaign list page.
 *
 * Features:
 *   - Stats bar (total, active, pending, rejected)
 *   - Status tabs + filter bar (search, category, sales_manager)
 *   - Table: Campaign, Advertiser, Category, Type, Sales Manager, Status
 *   - Sortable column headers
 *   - Create via modal
 *   - Role-aware: Sales sees own campaigns; Ops/MIS/Admin see all
 */
import { useState }        from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth }     from "@/hooks/useAuth";
import { useCreateCampaign, useUpdateCampaign, useCampaigns } from "@/hooks/useCampaigns";
import { useIsMobile } from "@/hooks/useIsMobile";
import Spinner          from "@/components/common/Spinner";
import { hasPerm, canApprove } from "@/utils/permissions";
import EmptyState       from "@/components/common/EmptyState";
import MobileFilterPanel from "@/components/common/MobileFilterPanel";
import Modal            from "@/components/common/Modal";
import CampaignForm     from "@/components/campaigns/CampaignForm";
import { useSortable }  from "@/hooks/useSortable";
import SortableHeader   from "@/components/common/SortableHeader";
import IdBadge          from "@/components/common/IdBadge";
import DateRangeFilter  from "@/components/common/DateRangeFilter";
import { CAMPAIGN_CATEGORIES } from "@/constants/campaign";

const toArray = (d) => Array.isArray(d) ? d : (d?.results ?? []);

// ── Permission helpers ────────────────────────────────────────────────────────
const canCreate = (user) => !!user;

// ── Status colours ────────────────────────────────────────────────────────────
const STATUS_STYLE = {
  pending:  { bg: "#FDF4E0", color: "#A06010", border: "#F0D080" },
  active:   { bg: "#E4F8EE", color: "#0A7838", border: "#80D8A8" },
  rejected: { bg: "#FCE8E8", color: "#8A1A1A", border: "#F0A8A8" },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] ?? { bg: "var(--surface)", color: "var(--text3)", border: "var(--border)" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 8px", borderRadius: 3, fontSize: 10, fontWeight: 600,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      textTransform: "capitalize",
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
      {status ?? "—"}
    </span>
  );
}

// ── Category badge ────────────────────────────────────────────────────────────
const CATEGORY_COLORS = {
  retag:        { bg: "#EEE0F8", color: "#6030A0" },
  network:      { bg: "#E0F8EC", color: "#0A7838" },
  branding:     { bg: "#E0EEFA", color: "#1A5A9A" },
  influencer:   { bg: "#FDF4E0", color: "#7A4A00" },
  affiliate:    { bg: "#E4F8EE", color: "#0A5A28" },
  media_buying: { bg: "#FDF4E0", color: "#A06010" },
  creative:     { bg: "#FCE8E8", color: "#8A1A1A" },
};

function CategoryBadge({ category, label }) {
  const c = CATEGORY_COLORS[category] ?? { bg: "var(--surface)", color: "var(--text2)" };
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: "2px 7px",
      borderRadius: 3, background: c.bg, color: c.color, whiteSpace: "nowrap",
    }}>
      {label ?? category ?? "—"}
    </span>
  );
}

// ── Stats bar ─────────────────────────────────────────────────────────────────
function StatsBar({ campaigns }) {
  const stats = [
    { label: "Total",    value: campaigns.length,                                      color: "#1A5A9A" },
    { label: "Active",   value: campaigns.filter((c) => c.status === "active").length,   color: "#0A7838" },
    { label: "Pending",  value: campaigns.filter((c) => c.status === "pending").length,  color: "#A06010" },
    { label: "Rejected", value: campaigns.filter((c) => c.status === "rejected").length, color: "#8A1A1A" },
  ];
  return (
    <div style={{ display: "flex", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
      {stats.map((s) => (
        <div key={s.label} style={{
          background: "var(--white)", border: "1px solid var(--border)",
          borderRadius: 4, padding: "10px 16px", minWidth: 100, flexShrink: 0,
        }}>
          <p style={{ fontSize: 20, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</p>
          <p style={{ fontSize: 10, color: "var(--text3)", marginTop: 2 }}>{s.label}</p>
        </div>
      ))}
    </div>
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

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CampaignsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const userCanCreate = canCreate(user);
  const isMISApprover = canApprove(user);

  // ── Filters ───────────────────────────────────────────────────────────────
  const [search,        setSearch]        = useState("");
  const [categoryF,     setCategoryF]     = useState("");
  const [statusF,       setStatusF]       = useState("");
  const [createdAfter,  setCreatedAfter]  = useState("");
  const [createdBefore, setCreatedBefore] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const activeFilterCount = (categoryF ? 1 : 0) + (statusF ? 1 : 0) + (createdAfter ? 1 : 0) + (createdBefore ? 1 : 0);
  const clearAllFilters   = () => { setSearch(""); setCategoryF(""); setStatusF(""); setCreatedAfter(""); setCreatedBefore(""); };

  const STATUS_TABS = [
    { label: "All",      value: "" },
    { label: "Pending",  value: "pending" },
    { label: "Active",   value: "active" },
    { label: "Rejected", value: "rejected" },
  ];

  // ── Modals ────────────────────────────────────────────────────────────────
  const [showCreate, setShowCreate] = useState(false);

  // ── Data ──────────────────────────────────────────────────────────────────
  const apiParams = {
    ...(categoryF     && { category:       categoryF     }),
    ...(statusF       && { status:         statusF       }),
    ...(search        && { search:         search        }),
    ...(createdAfter  && { created_after:  createdAfter  }),
    ...(createdBefore && { created_before: createdBefore }),
  };
  const { data: rawData, isLoading } = useCampaigns(apiParams);
  const campaigns = toArray(rawData);
  const { sortedData: sortedCampaigns, sortBy, sortDir, toggleSort } = useSortable(campaigns, { column: "internal_id", dir: "desc" });

  const pendingCount = isMISApprover
    ? campaigns.filter((c) => c.status === "pending").length
    : 0;

  const hasFilters = search || categoryF || statusF || createdAfter || createdBefore;

  const createMutation = useCreateCampaign();

  const handleCreate = async (payload) => {
    await createMutation.mutateAsync(payload);
    setShowCreate(false);
  };

  return (
    <div>
      {/* Page header */}
      <div style={{
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        alignItems: isMobile ? "stretch" : "center",
        justifyContent: "space-between",
        gap: isMobile ? 10 : 16, marginBottom: 14,
      }}>
        <div>
          <h1 className="page-title" style={isMobile ? { fontSize: 18 } : undefined}>Campaigns</h1>
          <p className="page-subtitle">
            {isLoading ? "Loading…" : `${campaigns.length} campaign${campaigns.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {isMISApprover && (
            <Link to="/campaigns/bulk-upload" className="btn btn-secondary"
              style={isMobile ? { minHeight: 44, fontSize: 14 } : undefined}>
              ↑ Bulk Upload
            </Link>
          )}
          {userCanCreate && (
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}
              style={isMobile ? { minHeight: 44, fontSize: 14 } : undefined}>
              + New Campaign
            </button>
          )}
        </div>
      </div>

      {/* Stats bar */}
      {!isLoading && <StatsBar campaigns={campaigns} />}

      {/* Status tabs */}
      <div style={{
        display: "flex", gap: 0,
        borderBottom: "1px solid var(--border)", marginBottom: 14, overflowX: "auto",
      }}>
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setStatusF(t.value)}
            style={{
              padding: isMobile ? "9px 14px" : "9px 18px",
              minHeight: isMobile ? 40 : "auto",
              flexShrink: 0, whiteSpace: "nowrap",
              border: "none",
              borderBottom: statusF === t.value ? "2px solid var(--accent)" : "2px solid transparent",
              marginBottom: -1, background: "none", cursor: "pointer",
              fontFamily: "inherit", fontSize: 12,
              fontWeight: statusF === t.value ? 700 : 500,
              color: statusF === t.value ? "var(--accent)" : "var(--text3)",
              transition: "all 0.12s",
              position: "relative",
            }}
          >
            {t.label}
            {t.value === "pending" && isMISApprover && pendingCount > 0 && !statusF && (
              <span style={{
                position: "absolute", top: 4, right: 2,
                background: "#E08818", color: "#fff",
                borderRadius: "50%", fontSize: 8, fontWeight: 800,
                width: 14, height: 14,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filter bar */}
      {isMobile ? (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input type="text" placeholder="Search…" value={search}
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
              🔍 Filters{activeFilterCount > 0 && ` (${activeFilterCount})`}
            </button>
          </div>
          {filtersOpen && (
            <MobileFilterPanel
              onClose={() => setFiltersOpen(false)}
              onClear={() => { clearAllFilters(); setFiltersOpen(false); }}
              onApply={() => setFiltersOpen(false)}
            >
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--text2)" }}>
                  Category
                </label>
                <select className="form-select" value={categoryF}
                  onChange={(e) => setCategoryF(e.target.value)}
                  style={{ width: "100%", minHeight: 44, fontSize: 14 }}>
                  <option value="">All Categories</option>
                  {CAMPAIGN_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
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
        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "var(--surface)", border: "1px solid var(--border2)",
            borderRadius: 3, padding: "4px 10px",
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              style={{ border: "none", background: "none", outline: "none",
                fontSize: 12, width: 180, fontFamily: "inherit", height: "21px" }}
              placeholder="Search name, advertiser…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select className="form-select" value={categoryF}
            onChange={(e) => setCategoryF(e.target.value)}
            style={{ width: "auto", minWidth: 150 }}>
            <option value="">All Categories</option>
            {CAMPAIGN_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
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
            <button className="btn btn-ghost btn-sm" onClick={clearAllFilters}
              style={{ color: "var(--red)" }}>
              ✕ Clear
            </button>
          )}
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <Spinner center />
      ) : campaigns.length === 0 ? (
        <EmptyState
          icon="📋"
          title={hasFilters ? "No campaigns match your filters" : "No campaigns yet"}
          subtitle={
            hasFilters ? "Try clearing filters"
              : userCanCreate ? "Click '+ New Campaign' to create your first campaign"
              : "No campaigns assigned to you yet"
          }
        />
      ) : isMobile ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {sortedCampaigns.map((c) => (
            <div
              key={c.id}
              onClick={() => navigate(`/campaigns/${c.id}`)}
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
                    {c.name}
                  </span>
                  <IdBadge id={c.internal_id} />
                </div>
                <StatusBadge status={c.status} />
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: 4, flexWrap: "wrap", alignItems: "center" }}>
                <CategoryBadge category={c.category} label={c.category_display} />
                <span style={{ fontSize: 12, color: "var(--text3)" }}>
                  {c.advertiser?.name ?? "—"}
                </span>
              </div>
              <div style={{ fontSize: 11, color: "var(--text3)", display: "flex", gap: 10, flexWrap: "wrap" }}>
                {c.campaign_type_display && <span>{c.campaign_type_display}</span>}
                {c.sales_manager?.full_name && <span>👤 {c.sales_manager.full_name}</span>}
                {c.ccn && <span>CCN: {c.ccn}</span>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <SortableHeader label="ID"       column="internal_id" sortBy={sortBy} sortDir={sortDir} onToggle={toggleSort} />
                <SortableHeader label="Campaign" column="name"        sortBy={sortBy} sortDir={sortDir} onToggle={toggleSort} />
                <th>Advertiser</th>
                <th>Category</th>
                <th>Type</th>
                <th>Sales Manager</th>
                <SortableHeader label="Status" column="status" sortBy={sortBy} sortDir={sortDir} onToggle={toggleSort} />
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedCampaigns.map((c) => (
                <CampaignRow key={c.id} campaign={c} onView={() => navigate(`/campaigns/${c.id}`)} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <Modal
          open
          onClose={() => setShowCreate(false)}
          title="New Campaign"
          subtitle="Submit for approval"
          size="lg"
        >
          <CampaignForm
            onSave={handleCreate}
            onClose={() => setShowCreate(false)}
          />
        </Modal>
      )}
    </div>
  );
}

// ── Table row ─────────────────────────────────────────────────────────────────
function CampaignRow({ campaign: c, onView }) {
  return (
    <tr style={{ cursor: "pointer" }} onClick={onView}>
      <td><IdBadge id={c.internal_id} /></td>
      <td>
        <p style={{ fontWeight: 600, fontSize: 12, color: "var(--text)" }}>{c.name}</p>
        {c.ccn && <p style={{ fontSize: 10, color: "var(--text3)" }}>CCN: {c.ccn}</p>}
        {c.campaign_id && <p style={{ fontSize: 10, color: "var(--text3)" }}>ID: {c.campaign_id}</p>}
      </td>
      <td style={{ fontSize: 11, color: "var(--text2)" }}>
        {c.advertiser?.name ?? "—"}
      </td>
      <td>
        <CategoryBadge category={c.category} label={c.category_display} />
      </td>
      <td style={{ fontSize: 11, color: "var(--text2)" }}>
        {c.campaign_type_display ?? c.campaign_type ?? "—"}
      </td>
      <td>
        {c.sales_manager?.full_name ? (
          <span style={{ fontSize: 11, color: "var(--text2)" }}>{c.sales_manager.full_name}</span>
        ) : (
          <span style={{ fontSize: 10, color: "var(--text3)", fontStyle: "italic" }}>Unassigned</span>
        )}
      </td>
      <td><StatusBadge status={c.status} /></td>
      <td style={{ textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
        <ActionBtn label="View" color="var(--accent)" onClick={onView} />
      </td>
    </tr>
  );
}
