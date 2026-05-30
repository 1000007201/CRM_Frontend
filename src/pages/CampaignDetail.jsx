/**
 * pages/CampaignDetail.jsx
 *
 * Full-width campaign detail page.
 *
 * Tabs: Overview | Publishers | Creatives | Activity
 *
 * Role-aware:
 *   Sales     → read-only for their own campaigns, can't see campaign_id/ccn
 *   Ops       → full view, can edit pending/active campaigns
 *   MIS/Admin → full view, approval panel shown when campaign is pending
 */
import { useState, useRef }        from "react";
import { useParams, useNavigate }  from "react-router-dom";
import { useAuth }                 from "@/hooks/useAuth";
import { useIsMobile }             from "@/hooks/useIsMobile";
import {
  useCampaign,
  useUpdateCampaign,
  useCampaignPublishers,
  useRemovePublisher,
  useCampaignCreatives,
  useUploadCreative,
  useRemoveCreative,
} from "@/hooks/useCampaigns";
import { useActivityList }             from "@/hooks/useActivity";
import Spinner                         from "@/components/common/Spinner";
import Modal                           from "@/components/common/Modal";
import { useToast }                    from "@/components/common/Toast";
import { hasPerm, canApprove }         from "@/utils/permissions";
import { formatDateTime }              from "@/utils/formatters";
import CampaignForm                    from "@/components/campaigns/CampaignForm";
import PublisherAssignModal            from "@/components/campaigns/PublisherAssignModal";
import PendingCampaignApprovalPanel    from "@/components/campaigns/PendingCampaignApprovalPanel";

// ── Permission helpers ────────────────────────────────────────────────────────
const canEdit = (user, campaign) => {
  if (!campaign) return false;
  if (canApprove(user)) return true;
  if (hasPerm(user, "campaigns") && user?.department !== "sales") return true;
  return (
    hasPerm(user, "campaigns") &&
    campaign.status === "pending" &&
    (campaign.created_by === user?.id || campaign.sales_manager === user?.id)
  );
};

const canSeeSensitive = (user) =>
  user?.role === "admin" ||
  user?.department === "operations" ||
  user?.is_mis_approver === true;

// ── Status / tone constants ───────────────────────────────────────────────────
const STATUS_STYLE = {
  pending:  { bg: "#FDF4E0", color: "#A06010", border: "#F0D080" },
  active:   { bg: "#E4F8EE", color: "#0A7838", border: "#80D8A8" },
  rejected: { bg: "#FCE8E8", color: "#8A1A1A", border: "#F0A8A8" },
  paused:   { bg: "#FDF4E0", color: "#7A4A00", border: "#F0D080" },
  inactive: { bg: "#FCE8E8", color: "#8A1A1A", border: "#F0A8A8" },
};

const PENDING_TONE  = { bg: "#FDF4E0", color: "#A06010", border: "#F0D080" };
const REJECTED_TONE = { bg: "#FCE8E8", color: "#8A1A1A", border: "#F0A8A8" };
const APPROVED_TONE = { bg: "#E4F8EE", color: "#0A7838", border: "#80D8A8" };

const CATEGORY_COLORS = {
  retag:        "#6030A0",
  network:      "#0A7838",
  branding:     "#1A5A9A",
  influencer:   "#7A4A00",
  affiliate:    "#0A5A28",
  media_buying: "#A06010",
  creative:     "#8A1A1A",
};

const TABS = [
  { id: "overview",   label: "Overview"   },
  { id: "publishers", label: "Publishers" },
  { id: "creatives",  label: "Creatives"  },
  { id: "activity",   label: "Activity"   },
];

const PERFORMANCE_CATEGORIES = ["network", "branding", "affiliate", "media_buying", "creative"];

// ── Page ──────────────────────────────────────────────────────────────────────
export default function CampaignDetailPage() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const toast    = useToast();

  const [tab,      setTab]      = useState("overview");
  const [showEdit, setShowEdit] = useState(false);

  const { data: campaign, isLoading, isError } = useCampaign(id);
  const updateMutation = useUpdateCampaign(id);

  const userCanApprove   = canApprove(user);
  const userCanEdit      = canEdit(user, campaign);
  const userSeeSensitive = canSeeSensitive(user);

  const { data: activityRaw, isLoading: actLoading } = useActivityList({
    module: "campaigns",
    page_size: 30,
  });
  const activityAll = activityRaw?.results ?? [];
  const activity    = activityAll.filter(
    (a) => a.meta?.id === id || a.meta?.campaign_id === id
  );

  const handleSaveEdit = async (payload) => {
    try {
      await updateMutation.mutateAsync(payload);
      toast.success("Campaign updated.");
      setShowEdit(false);
    } catch {
      toast.error("Could not update campaign.");
    }
  };

  if (isLoading) return <div style={{ padding: 40 }}><Spinner center /></div>;
  if (isError || !campaign) return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <p style={{ color: "var(--text3)" }}>Campaign not found.</p>
      <button className="btn btn-secondary" style={{ marginTop: 12 }}
        onClick={() => navigate("/campaigns")}>← Back</button>
    </div>
  );

  return (
    <div>
      {/* Back nav */}
      <button
        onClick={() => navigate("/campaigns")}
        style={{
          background: "none", border: "none", cursor: "pointer",
          fontSize: 12, color: "var(--text3)", marginBottom: 14,
          display: "flex", alignItems: "center", gap: 5, fontFamily: "inherit",
        }}
      >
        ← Campaigns
      </button>

      {/* Header card */}
      <div className="card" style={{ padding: "20px 22px", marginBottom: 16 }}>
        <div style={{
          display: "flex", alignItems: "flex-start",
          justifyContent: "space-between", gap: 16, flexWrap: "wrap",
        }}>
          {/* Left */}
          <div style={{ minWidth: 0, flex: "1 1 auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", lineHeight: 1.2 }}>
                {campaign.name}
              </h2>
              {campaign.ccn && userSeeSensitive && (
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: "2px 7px",
                  borderRadius: 3, background: "var(--surface)",
                  color: "var(--text3)", border: "1px solid var(--border)",
                  letterSpacing: "0.05em",
                }}>
                  CCN: {campaign.ccn}
                </span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
              {campaign.category && (
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: "2px 8px",
                  borderRadius: 3, letterSpacing: "0.04em",
                  background: (CATEGORY_COLORS[campaign.category] ?? "var(--text3)") + "15",
                  color: CATEGORY_COLORS[campaign.category] ?? "var(--text3)",
                  textTransform: "capitalize",
                }}>
                  {campaign.category_display ?? campaign.category}
                </span>
              )}
              {campaign.advertiser?.name && (
                <span style={{ fontSize: 12, color: "var(--text3)" }}>
                  {campaign.advertiser.name}
                </span>
              )}
            </div>
          </div>

          {/* Right: status + edit */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {(() => {
              const s = STATUS_STYLE[campaign.status] ?? STATUS_STYLE.inactive;
              return (
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "3px 10px", borderRadius: 3, fontSize: 11,
                  fontWeight: 600, background: s.bg, color: s.color,
                  border: `1px solid ${s.border}`, textTransform: "capitalize",
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.color }} />
                  {campaign.status ?? "—"}
                </span>
              );
            })()}

            {userCanEdit && (
              <button className="btn btn-secondary btn-sm" onClick={() => setShowEdit(true)}>
                ✎ Edit
              </button>
            )}
          </div>
        </div>

        {/* Status banners */}
        {campaign.status === "pending" && !userCanApprove && (
          <div style={{ marginTop: 16 }}>
            <div style={{
              padding: "14px 16px", borderRadius: 4,
              background: PENDING_TONE.bg, border: `1px solid ${PENDING_TONE.border}`,
              color: PENDING_TONE.color,
            }}>
              <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                ⏳ Awaiting Approval
              </p>
              <p style={{ fontSize: 11, color: "var(--text2)", marginTop: 4 }}>
                This campaign is under review by the APP.
              </p>
            </div>
          </div>
        )}

        {campaign.status === "rejected" && campaign.rejection_reason && (
          <div style={{ marginTop: 16 }}>
            <div style={{
              padding: "14px 16px", borderRadius: 4,
              background: REJECTED_TONE.bg, border: `1px solid ${REJECTED_TONE.border}`,
              color: REJECTED_TONE.color,
            }}>
              <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>
                ✗ Rejected
              </p>
              <p style={{ fontSize: 11, color: "var(--text2)" }}>
                <strong>Reason:</strong> {campaign.rejection_reason}
              </p>
            </div>
          </div>
        )}

        {campaign.status === "active" && campaign.approved_by_name && (
          <div style={{ marginTop: 14 }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "6px 10px", borderRadius: 3,
              background: APPROVED_TONE.bg, color: APPROVED_TONE.color,
              border: `1px solid ${APPROVED_TONE.border}`,
              fontSize: 11, fontWeight: 600,
            }}>
              ✓ Approved by {campaign.approved_by_name}
              {campaign.approved_at && ` on ${formatDateTime(campaign.approved_at)}`}
            </span>
          </div>
        )}

        {/* Approval panel — approver only, pending only */}
        {userCanApprove && campaign.status === "pending" && (
          <div style={{ marginTop: 16 }}>
            <PendingCampaignApprovalPanel campaign={campaign} />
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div
        className={isMobile ? "hide-scrollbar" : undefined}
        style={{
          display: "flex", gap: 0,
          borderBottom: "1px solid var(--border)",
          marginBottom: 16,
          overflowX: isMobile ? "auto" : "visible",
          overflowY: "hidden",
          WebkitOverflowScrolling: "touch",
        }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: isMobile ? "10px 14px" : "10px 20px",
              minHeight: isMobile ? 44 : "auto",
              flexShrink: 0, whiteSpace: "nowrap",
              border: "none",
              borderBottom: tab === t.id ? "2px solid var(--accent)" : "2px solid transparent",
              marginBottom: -1, background: "none", cursor: "pointer",
              fontFamily: "inherit", fontSize: 13,
              fontWeight: tab === t.id ? 700 : 500,
              color: tab === t.id ? "var(--accent)" : "var(--text3)",
              transition: "all 0.12s",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "overview"   && (
        <OverviewTab
          campaign={campaign}
          userSeeSensitive={userSeeSensitive}
          isMISPlus={user?.role === "admin" || user?.is_mis_approver === true}
        />
      )}
      {tab === "publishers" && <PublishersTab campaignId={id} />}
      {tab === "creatives"  && <CreativesTab  campaignId={id} />}
      {tab === "activity"   && <ActivityTab   activity={activity} loading={actLoading} />}

      {/* Edit modal */}
      {showEdit && (
        <Modal open onClose={() => setShowEdit(false)} title="Edit Campaign">
          <CampaignForm
            campaign={campaign}
            onSave={handleSaveEdit}
            onClose={() => setShowEdit(false)}
          />
        </Modal>
      )}
    </div>
  );
}

// ── Overview tab ──────────────────────────────────────────────────────────────
function OverviewTab({ campaign: c, userSeeSensitive, isMISPlus }) {
  const isReTag       = c.category === "retag";
  const isInfluencer  = c.category === "influencer";
  const isPerformance = PERFORMANCE_CATEGORIES.includes(c.category);

  return (
    <div>
      {/* Approval information — shown on active (approved) campaigns */}
      {c.status === "active" && (c.superadme_campaign_name || c.ccn || c.reference_name || c.campaign_id) && (
        <div style={{
          padding:      14,
          background:   "var(--surface)",
          border:       "1px solid var(--border)",
          borderRadius: 4,
          marginBottom: 14,
        }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>
            Approval Information
          </div>
          {c.superadme_campaign_name && (
            <div style={{ fontSize: 12, marginBottom: 4 }}>
              <strong>SuperAdme Campaign Name:</strong> {c.superadme_campaign_name}
            </div>
          )}
          {c.ccn && (
            <div style={{ fontSize: 12, marginBottom: 4 }}>
              <strong>Campaign Name (CCN):</strong> {c.ccn}
            </div>
          )}
          {c.reference_name && (
            <div style={{ fontSize: 12, marginBottom: 4 }}>
              <strong>Reference Name:</strong> {c.reference_name}
            </div>
          )}
          {c.campaign_id && (
            <div style={{ fontSize: 12 }}>
              <strong>Campaign ID:</strong> {c.campaign_id}
            </div>
          )}
        </div>
      )}

      {/* Campaign Info + Advertiser */}
      <GridRow>
        <InfoCard title="Campaign Info">
          <Row label="Campaign Name" value={c.name} />
          <Row label="Category"      value={c.category_display ?? c.category} />
          <Row label="Campaign Type" value={c.campaign_type_display ?? c.campaign_type} />
          <Row label="Currency"      value={c.currency} />
          <Row label="Description"   value={c.description} last />
        </InfoCard>

        <InfoCard title="Advertiser">
          <Row label="Advertiser"        value={c.advertiser?.name} />
          <Row label="Point of Contact"  value={c.advertiser_poc_name} />
          <Row label="Sales Manager"     value={c.sales_manager?.full_name} last />
        </InfoCard>
      </GridRow>

      {/* Performance / ReTag fields */}
      {(isReTag || isPerformance) && (
        <GridRow>
          <InfoCard title="Performance Details">
            {isReTag && <Row label="Tag"          value={c.tag} />}
            {isReTag && <Row label="S2S Postback" value={c.s2s_postback} isLink />}
            <Row label="Tracking Type"    value={c.tracking_type} />
            <Row label="Daily Run Rate"   value={c.drr} />
            <Row label="Geos"             value={c.geos} />
            <Row label="Revenue"          value={c.revenue} />
            {c.payout && <Row label="Payout"  value={c.payout} />}
            <Row label="KPI"              value={c.kpi} />
            <Row label="Validation Terms" value={c.validation_terms} />
            <Row label="Payment Terms"    value={c.payment_terms} last />
          </InfoCard>

          <InfoCard title="Links">
            <Row label="Preview Link"     value={c.preview_link}         isLink />
            <Row label="Offline Report"   value={c.offline_report_link}  isLink />
            <Row label="Advertiser Panel" value={c.advertiser_panel_link} isLink last />
          </InfoCard>
        </GridRow>
      )}

      {/* Tracking links */}
      {(isReTag || isPerformance) && c.tracking_links_list?.length > 0 && (
        <FullCard>
          <InfoCard title="Tracking Links">
            {c.tracking_links_list.map((link, i) => {
              const url = typeof link === "string" ? link : link.url;
              return (
                <div
                  key={i}
                  style={{
                    padding: "5px 0",
                    borderBottom: i < c.tracking_links_list.length - 1
                      ? "1px solid var(--border)"
                      : "none",
                  }}
                >
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 12, color: "var(--accent)", wordBreak: "break-all" }}
                  >
                    {url} ↗
                  </a>
                </div>
              );
            })}
          </InfoCard>
        </FullCard>
      )}

      {/* Influencer fields */}
      {isInfluencer && (
        <FullCard>
          <InfoCard title="Influencer Details">
            <Row label="Brand Name"     value={c.brand_name} />
            <Row label="Platform"       value={c.platform} />
            <Row label="Activity Month" value={c.campaign_activity_month} />
            <Row label="Invoice Amount" value={c.invoice_amount} />
            <Row label="Client Type"    value={c.client_type} />
            <Row label="Brand Website"  value={c.brand_website_link} isLink last />
          </InfoCard>
        </FullCard>
      )}

      {/* Operations */}
      {userSeeSensitive && (
        <FullCard>
          <InfoCard title="Operations">
            {isMISPlus ? (
              <>
                <Row label="CCN"         value={c.ccn} />
                <Row label="Campaign ID" value={c.campaign_id} last />
              </>
            ) : (
              <Row label="CCN" value={c.ccn ?? "—"} last />
            )}
          </InfoCard>
        </FullCard>
      )}

      {/* Audit */}
      {c.created_by_name && (
        <FullCard>
          <InfoCard title="Audit">
            <Row label="Created By" value={c.created_by_name} />
            <Row label="Created At" value={formatDateTime(c.created_at)} />
            <Row label="Updated At" value={formatDateTime(c.updated_at)} last />
          </InfoCard>
        </FullCard>
      )}
    </div>
  );
}

// ── Publishers tab ────────────────────────────────────────────────────────────
function PublishersTab({ campaignId }) {
  const toast = useToast();
  const [showAssign,    setShowAssign]    = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(null);

  const { data: publishers = [], isLoading } = useCampaignPublishers(campaignId);
  const removeMutation = useRemovePublisher(campaignId);

  const handleRemove = async () => {
    if (!confirmRemove) return;
    try {
      await removeMutation.mutateAsync(confirmRemove.id);
      toast.success("Publisher removed.");
      setConfirmRemove(null);
    } catch {
      toast.error("Could not remove publisher.");
    }
  };

  if (isLoading) return <Spinner center />;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <button className="btn btn-primary" onClick={() => setShowAssign(true)}>
          + Assign Publisher
        </button>
      </div>

      {publishers.length === 0 ? (
        <div style={{
          padding: "48px 0", textAlign: "center",
          border: "2px dashed var(--border)", borderRadius: 4,
          color: "var(--text3)",
        }}>
          <p style={{ fontSize: 24, marginBottom: 8 }}>🤝</p>
          <p style={{ fontSize: 13, fontWeight: 600 }}>No publishers assigned yet</p>
          <p style={{ fontSize: 11, marginTop: 4 }}>
            Click "+ Assign Publisher" to add a publisher to this campaign.
          </p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Publisher</th>
                <th>Specialization</th>
                <th>Notes</th>
                <th>Assigned By</th>
                <th>Assigned At</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {publishers.map((p) => (
                <tr key={p.id}>
                  <td>
                    <p style={{ fontWeight: 600, fontSize: 12, color: "var(--text)" }}>
                      {p.publisher_name ?? p.publisher}
                    </p>
                    {p.publisher_email && (
                      <p style={{ fontSize: 10, color: "var(--text3)" }}>{p.publisher_email}</p>
                    )}
                  </td>
                  <td style={{ fontSize: 11, color: "var(--text2)" }}>
                    {p.specialization ?? "—"}
                  </td>
                  <td style={{ fontSize: 11, color: "var(--text2)", maxWidth: 200 }}>
                    {p.notes ?? "—"}
                  </td>
                  <td style={{ fontSize: 11, color: "var(--text2)" }}>
                    {p.assigned_by_name ?? "—"}
                  </td>
                  <td style={{ fontSize: 11, color: "var(--text2)" }}>
                    {formatDateTime(p.assigned_at)}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <TableActionBtn
                      label="Remove"
                      color="#C03030"
                      onClick={() => setConfirmRemove(p)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAssign && (
        <PublisherAssignModal
          campaignId={campaignId}
          assignedPublisherIds={publishers.map((p) => p.publisher)}
          onClose={() => setShowAssign(false)}
          onSaved={() => setShowAssign(false)}
        />
      )}

      {confirmRemove && (
        <ConfirmModal
          title="Remove Publisher?"
          message={`Remove "${confirmRemove.publisher_name ?? "this publisher"}" from this campaign?`}
          confirmLabel={removeMutation.isPending ? "Removing…" : "Yes, Remove"}
          confirmStyle={{ background: "#C03030", color: "#fff", border: "none" }}
          onCancel={() => setConfirmRemove(null)}
          onConfirm={handleRemove}
          loading={removeMutation.isPending}
        />
      )}
    </div>
  );
}

// ── Creatives tab ─────────────────────────────────────────────────────────────
function CreativesTab({ campaignId }) {
  const toast   = useToast();
  const fileRef = useRef(null);
  const [confirmRemove, setConfirmRemove] = useState(null);

  const { data: creatives = [], isLoading } = useCampaignCreatives(campaignId);
  const uploadMutation = useUploadCreative(campaignId);
  const removeMutation = useRemoveCreative(campaignId);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      await uploadMutation.mutateAsync(fd);
      toast.success("Creative uploaded!");
    } catch {
      toast.error("Could not upload creative.");
    }
    e.target.value = "";
  };

  const handleRemove = async () => {
    if (!confirmRemove) return;
    try {
      await removeMutation.mutateAsync(confirmRemove.id);
      toast.success("Creative removed.");
      setConfirmRemove(null);
    } catch {
      toast.error("Could not remove creative.");
    }
  };

  if (isLoading) return <Spinner center />;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <input
          ref={fileRef}
          type="file"
          style={{ display: "none" }}
          onChange={handleUpload}
        />
        <button
          className="btn btn-primary"
          onClick={() => fileRef.current?.click()}
          disabled={uploadMutation.isPending}
        >
          {uploadMutation.isPending ? "Uploading…" : "+ Upload Creative"}
        </button>
      </div>

      {creatives.length === 0 ? (
        <div style={{
          padding: "48px 0", textAlign: "center",
          border: "2px dashed var(--border)", borderRadius: 4,
          color: "var(--text3)",
        }}>
          <p style={{ fontSize: 24, marginBottom: 8 }}>🖼</p>
          <p style={{ fontSize: 13, fontWeight: 600 }}>No creatives uploaded yet</p>
          <p style={{ fontSize: 11, marginTop: 4 }}>
            Click "+ Upload Creative" to attach files to this campaign.
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
          {creatives.map((c) => (
            <div key={c.id} style={{
              background: "var(--white)", border: "1px solid var(--border)",
              borderRadius: 4, padding: "14px 16px",
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{
                    fontSize: 12, fontWeight: 600, color: "var(--text)",
                    wordBreak: "break-all", marginBottom: 4,
                  }}>
                    {c.filename ?? c.file_name ?? "File"}
                  </p>
                  {c.uploaded_by_name && (
                    <p style={{ fontSize: 10, color: "var(--text3)" }}>
                      {c.uploaded_by_name}
                    </p>
                  )}
                  {c.uploaded_at && (
                    <p style={{ fontSize: 10, color: "var(--text3)" }}>
                      {formatDateTime(c.uploaded_at)}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setConfirmRemove(c)}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    fontSize: 14, color: "var(--text3)", flexShrink: 0, padding: 2,
                  }}
                  title="Remove"
                >
                  ✕
                </button>
              </div>
              {c.file_url && (
                <a
                  href={c.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-block", marginTop: 8,
                    fontSize: 10, color: "var(--accent)", fontWeight: 600,
                  }}
                >
                  ↓ Download
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {confirmRemove && (
        <ConfirmModal
          title="Remove Creative?"
          message={`Remove "${confirmRemove.filename ?? "this file"}"?`}
          confirmLabel={removeMutation.isPending ? "Removing…" : "Yes, Remove"}
          confirmStyle={{ background: "#C03030", color: "#fff", border: "none" }}
          onCancel={() => setConfirmRemove(null)}
          onConfirm={handleRemove}
          loading={removeMutation.isPending}
        />
      )}
    </div>
  );
}

// ── Activity tab ──────────────────────────────────────────────────────────────
function ActivityTab({ activity, loading }) {
  if (loading) return <Spinner center />;

  if (!activity.length) return (
    <div style={{
      padding: "32px 0", textAlign: "center",
      color: "var(--text3)", fontSize: 12,
    }}>
      No activity recorded for this campaign yet.
    </div>
  );

  const ACTION_ICON = {
    campaign_created:  { icon: "✚", color: "#0A7838" },
    campaign_updated:  { icon: "✎", color: "#1A5A9A" },
    campaign_approved: { icon: "✓", color: "#0A7838" },
    campaign_rejected: { icon: "✗", color: "#C03030" },
  };

  return (
    <div className="card" style={{ padding: "8px 20px" }}>
      {activity.map((entry, i) => {
        const meta = ACTION_ICON[entry.action] ?? { icon: "•", color: "var(--text3)" };
        return (
          <div key={entry.id} style={{
            display: "flex", gap: 12, alignItems: "flex-start",
            padding: "10px 0",
            borderBottom: i < activity.length - 1 ? "1px solid var(--border)" : "none",
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              background: meta.color + "15",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, color: meta.color, flexShrink: 0,
            }}>
              {meta.icon}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 12, color: "var(--text)", lineHeight: 1.4 }}>
                {entry.human_readable}
              </p>
              <p style={{ fontSize: 10, color: "var(--text3)", marginTop: 2 }}>
                {entry.actor_name} · {formatDateTime(entry.created_at)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Generic confirm modal ─────────────────────────────────────────────────────
function ConfirmModal({ title, message, confirmLabel, confirmStyle, onCancel, onConfirm, loading }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300,
    }}>
      <div style={{
        background: "var(--white)", borderRadius: 6, padding: "28px 32px",
        maxWidth: 400, width: "90%", boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
      }}>
        <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{title}</p>
        <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 20, lineHeight: 1.5 }}>
          {message}
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="btn btn-secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              padding: "7px 16px", borderRadius: 3, fontSize: 12,
              fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "inherit", opacity: loading ? 0.7 : 1,
              ...confirmStyle,
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Inline action button for tables ──────────────────────────────────────────
function TableActionBtn({ label, color, onClick }) {
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

// ── Overview layout helpers ───────────────────────────────────────────────────
function GridRow({ children }) {
  const isMobile = useIsMobile();
  return (
    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14, marginBottom: 14 }}>
      {children}
    </div>
  );
}

function FullCard({ children }) {
  return <div style={{ marginBottom: 14 }}>{children}</div>;
}

function InfoCard({ title, children }) {
  return (
    <div style={{
      background: "var(--white)", border: "1px solid var(--border)",
      borderRadius: 4, padding: "16px 20px",
    }}>
      <p style={{
        fontSize: 10, fontWeight: 700, textTransform: "uppercase",
        letterSpacing: "0.08em", color: "var(--accent)", marginBottom: 14,
      }}>
        {title}
      </p>
      {children}
    </div>
  );
}

function Row({ label, value, isEmail, isLink, last }) {
  const display = value === 0 ? "0" : (value || "—");
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "flex-start",
      padding: "6px 0", borderBottom: last ? "none" : "1px solid var(--border)", gap: 12,
    }}>
      <span style={{ fontSize: 11, color: "var(--text3)", flexShrink: 0, minWidth: 140, paddingTop: 1 }}>
        {label}
      </span>
      {isEmail && value ? (
        <a href={`mailto:${value}`} style={{ fontSize: 12, color: "var(--accent)", textAlign: "right", wordBreak: "break-all" }}>
          {value}
        </a>
      ) : isLink && value ? (
        <a href={value} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "var(--accent)", textAlign: "right", wordBreak: "break-all" }}>
          {value} ↗
        </a>
      ) : (
        <span style={{ fontSize: 12, color: "var(--text2)", textAlign: "right", wordBreak: "break-word", textTransform: "capitalize" }}>
          {display}
        </span>
      )}
    </div>
  );
}
