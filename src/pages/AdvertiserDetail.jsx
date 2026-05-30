/**
 * pages/AdvertiserDetail.jsx
 *
 * Full-width layout:
 *   Back nav
 *   Header section (avatar + name + type + location — status + actions — approval panel)
 *   Tab bar (Overview | Activity | Campaigns)
 *   Tab content (full width)
 *
 * Role-aware:
 *   Sales     → read-only, panel credentials hidden
 *   Ops       → full view, panel password masked without reveal
 *   Admin     → full view, panel password has Show toggle
 *   Approver  → can approve/reject pending advertisers, correct name
 */
import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useCampaigns }          from "@/hooks/useCampaigns";
import CampaignForm              from "@/components/campaigns/CampaignForm";
import { useContacts, useDeleteContact, useAssignContactOwner } from "@/hooks/useContacts";
import ContactForm               from "@/components/contacts/ContactForm";
import { useAuth }               from "@/hooks/useAuth";
import { useIsMobile }           from "@/hooks/useIsMobile";
import {
  useAdvertiser,
  useDeleteAdvertiser,
  useUnmergeAdvertiser,
  useRevertAdvertiser,
} from "@/hooks/useAdvertisers";
import { useActivity }           from "@/hooks/useActivity";
import Spinner                   from "@/components/common/Spinner";
import Avatar                    from "@/components/common/Avatar";
import { useToast }              from "@/components/common/Toast";
import { hasPerm, canApprove }   from "@/utils/permissions";
import { formatDateTime }        from "@/utils/formatters";
import AdvertiserForm            from "@/components/advertisers/AdvertiserForm";
import ManageManagersModal       from "@/components/advertisers/ManageManagersModal";
import PendingApprovalPanel      from "@/components/advertisers/PendingApprovalPanel";


// ── Permission helpers ────────────────────────────────────────────────────────
const canManage = (user) => hasPerm(user, "advertisers");

const canSeeCredentials = (user) =>
  user?.role === "admin" || user?.department === "operations";

// ── Status colours ────────────────────────────────────────────────────────────
const STATUS_STYLE = {
  approved:         { bg: "#E4F8EE", color: "#0A5A28", border: "#80D8A8" },
  active:           { bg: "#E4F8EE", color: "#0A5A28", border: "#80D8A8" }, // legacy
  pending:          { bg: "#FDF4E0", color: "#A06010", border: "#F0D080" },
  pending_approval: { bg: "#FDF4E0", color: "#A06010", border: "#F0D080" }, // legacy
  rejected:         { bg: "#FCE8E8", color: "#8A1A1A", border: "#F0A8A8" },
  inactive:         { bg: "#FCE8E8", color: "#8A1A1A", border: "#F0A8A8" },
  paused:           { bg: "#FDF4E0", color: "#7A4A00", border: "#F0D080" },
  merged:           { bg: "#E0E7FF", color: "#3730A3", border: "#818CF8" },
};

const PENDING_TONE  = { bg: "#FDF4E0", color: "#A06010", border: "#F0D080" };
const APPROVED_TONE = { bg: "#E4F8EE", color: "#0A7838", border: "#80D8A8" };
const REJECTED_TONE = { bg: "#FCE8E8", color: "#8A1A1A", border: "#F0A8A8" };

const TYPE_COLOR = {
  direct_client: "#1A5A9A",
  network:       "#6030A0",
  agency:        "#0A7838",
  freelancer:    "#7A4A00",
};

const TABS = [
  { id: "overview",  label: "Overview"  },
  { id: "contacts",  label: "Contacts"  },
  { id: "campaigns", label: "Campaigns" },
  { id: "activity",  label: "Activity"  },
];

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AdvertiserDetailPage() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const { user }  = useAuth();
  const isMobile  = useIsMobile();
  const toast     = useToast();
  const userCanManage       = canManage(user);
  const userCanApprove      = canApprove(user);
  const userCanSeeCreds     = canSeeCredentials(user);
  const userIsAdmin         = user?.role === "admin";
  const userCanDelete       = user?.role === "admin";
  const isApproverOrAdmin   = user?.role === "admin" || user?.is_mis_approver;

  const [tab,               setTab]               = useState("overview");
  const [showEdit,          setShowEdit]          = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showUnmergeConfirm, setShowUnmergeConfirm] = useState(false);
  const [showRevertConfirm, setShowRevertConfirm] = useState(false);
  const [revertReason,      setRevertReason]     = useState("");

  const { data: adv, isLoading, isError } = useAdvertiser(id);
  const deleteMutation  = useDeleteAdvertiser();
  const unmergeMutation = useUnmergeAdvertiser(id);
  const revertMutation  = useRevertAdvertiser(id);

  const { data: activityRaw, isLoading: actLoading } = useActivity({
    module:    "advertisers",
    object_id: id,
    page_size: 50,
  });
  const activity = Array.isArray(activityRaw)
    ? activityRaw
    : (activityRaw?.results ?? []);

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(adv.id);
      toast.success(`${adv.full_name} deleted.`);
      navigate("/advertisers");
    } catch {
      toast.error("Could not delete advertiser.");
    }
  };

  const handleUnmerge = async () => {
    try {
      await unmergeMutation.mutateAsync();
      toast.success("Advertiser unmerged. Contacts restored. Status reset to Pending.");
      setShowUnmergeConfirm(false);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to unmerge.");
    }
  };

  const handleRevert = async () => {
    try {
      await revertMutation.mutateAsync(revertReason);
      toast.success("Advertiser reverted to pending.");
      setShowRevertConfirm(false);
      setRevertReason("");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to revert.");
    }
  };

  if (isLoading) return <div style={{ padding: 40 }}><Spinner center /></div>;
  if (isError || !adv) return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <p style={{ color: "var(--text3)" }}>Advertiser not found.</p>
      <button className="btn btn-secondary" style={{ marginTop: 12 }}
        onClick={() => navigate("/advertisers")}>← Back</button>
    </div>
  );

  return (
    <div>
      {/* Back nav */}
      <button
        onClick={() => navigate("/advertisers")}
        style={{
          background: "none", border: "none", cursor: "pointer",
          fontSize: 12, color: "var(--text3)", marginBottom: 14,
          display: "flex", alignItems: "center", gap: 5, fontFamily: "inherit",
        }}
      >
        ← Advertisers
      </button>

      {/* Merged banner */}
      {adv.status === "merged" && (
        <div style={{
          padding:      "14px 16px",
          background:   "#E0E7FF",
          border:       "1px solid #818CF8",
          borderRadius: 4,
          marginBottom: 16,
        }}>
          <div style={{
            display:        "flex",
            justifyContent: "space-between",
            alignItems:     "center",
            flexWrap:       "wrap",
            gap:            12,
          }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#3730A3", marginBottom: 4 }}>
                This advertiser has been merged
              </div>
              <div style={{ fontSize: 12, color: "#3730A3" }}>
                Merged into:{" "}
                {adv.merged_into ? (
                  <Link
                    to={`/advertisers/${adv.merged_into}`}
                    style={{ color: "#3730A3", fontWeight: 600, textDecoration: "underline" }}
                  >
                    {adv.merged_into_name || adv.merged_into}
                  </Link>
                ) : "—"}
                {adv.merged_at && (
                  <span style={{ marginLeft: 8, opacity: 0.7 }}>
                    on {new Date(adv.merged_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
            {isApproverOrAdmin && (
              <button
                className="btn btn-secondary"
                onClick={() => setShowUnmergeConfirm(true)}
                disabled={unmergeMutation.isPending}
              >
                Unmerge
              </button>
            )}
          </div>
        </div>
      )}

      {/* Header section */}
      <HeaderSection
        adv={adv}
        isApproverOrAdmin={isApproverOrAdmin}
        userCanApprove={userCanApprove}
        userCanDelete={userCanDelete}
        onEdit={() => setShowEdit(true)}
        onDelete={() => setShowDeleteConfirm(true)}
        onRevert={() => setShowRevertConfirm(true)}
      />

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
              flexShrink: 0,
              whiteSpace: "nowrap",
              border: "none",
              borderBottom: tab === t.id
                ? "2px solid var(--accent)"
                : "2px solid transparent",
              marginBottom: -1,
              background: "none",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: 13,
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
      {tab === "overview" && (
        <OverviewTab
          adv={adv}
          userCanSeeCreds={userCanSeeCreds}
          userIsAdmin={userIsAdmin}
          user={user}
        />
      )}
      {tab === "contacts"  && (
        <ContactsTab
          advertiserId={id}
          user={user}
          managers={adv.managers ?? []}
          isApproverOrAdmin={isApproverOrAdmin}
        />
      )}
      {tab === "activity"  && <ActivityTab activity={activity} loading={actLoading} />}
      {tab === "campaigns" && <CampaignsTab advertiserId={id} />}

      {/* Edit modal */}
      {showEdit && (
        <AdvertiserForm
          advertiser={adv}
          onClose={() => setShowEdit(false)}
          onSaved={() => setShowEdit(false)}
        />
      )}

      {/* Delete confirm modal */}
      {showDeleteConfirm && (
        <DeleteConfirmModal
          name={adv.full_name}
          onCancel={() => setShowDeleteConfirm(false)}
          onConfirm={handleDelete}
          loading={deleteMutation.isPending}
        />
      )}

      {/* Unmerge confirm modal */}
      {showUnmergeConfirm && (
        <UnmergeConfirmModal
          targetName={adv.merged_into_name}
          onCancel={() => setShowUnmergeConfirm(false)}
          onConfirm={handleUnmerge}
          loading={unmergeMutation.isPending}
        />
      )}

      {/* Revert-to-Pending confirm modal */}
      {showRevertConfirm && (
        <RevertConfirmModal
          name={adv.full_name}
          reason={revertReason}
          onReasonChange={setRevertReason}
          onCancel={() => { setShowRevertConfirm(false); setRevertReason(""); }}
          onConfirm={handleRevert}
          loading={revertMutation.isPending}
        />
      )}
    </div>
  );
}

// ── Header section ────────────────────────────────────────────────────────────
function HeaderSection({
  adv, isApproverOrAdmin, userCanApprove, userCanDelete,
  onEdit, onDelete, onRevert,
}) {
  const isMerged    = adv.status === "merged";
  const statusStyle = STATUS_STYLE[adv.status] ?? STATUS_STYLE.inactive;
  const typeColor   = TYPE_COLOR[adv.type] ?? "var(--text3)";
  const location    = [adv.city, adv.country_name ?? adv.country].filter(Boolean).join(", ");

  return (
    <div className="card" style={{
      padding: "20px 22px",
      marginBottom: 16,
    }}>
      <div style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 16,
        flexWrap: "wrap",
      }}>
        {/* Left: avatar + name + type + location */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0, flex: "1 1 auto" }}>
          <Avatar name={adv.full_name} size={48} />
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <h2 style={{
                fontSize: 20, fontWeight: 700, color: "var(--text)",
                lineHeight: 1.2, wordBreak: "break-word",
              }}>
                {adv.full_name}
              </h2>
              {adv.display_id && (
                <span style={{
                  fontSize:      10,
                  fontWeight:    700,
                  padding:       "2px 7px",
                  borderRadius:  3,
                  background:    "var(--surface)",
                  color:         "var(--text3)",
                  border:        "1px solid var(--border)",
                  letterSpacing: "0.05em",
                  flexShrink:    0,
                }}>
                  {adv.display_id}
                </span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: "2px 8px",
                borderRadius: 3, letterSpacing: "0.04em",
                background: typeColor + "15",
                color: typeColor,
              }}>
                {adv.type_display ?? adv.type}
              </span>
              {location && (
                <span style={{ fontSize: 12, color: "var(--text3)" }}>
                  {location}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: status + actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "3px 10px", borderRadius: 3, fontSize: 11,
            fontWeight: 600, background: statusStyle.bg,
            color: statusStyle.color, border: `1px solid ${statusStyle.border}`,
            textTransform: "capitalize",
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: "50%",
              background: statusStyle.color,
            }} />
            {(adv.status ?? "").replace("_", " ")}
          </span>

          {!isMerged && isApproverOrAdmin && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={onEdit}
            >
              ✎ Edit
            </button>
          )}
          {isApproverOrAdmin && adv.status === "approved" && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={onRevert}
            >
              ↩ Revert to Pending
            </button>
          )}
                    {userCanDelete && (
            <button
              onClick={onDelete}
              style={{
                padding:      "5px 12px",
                borderRadius: 3,
                border:       "1px solid #F0A8A8",
                background:   "#FCE8E8",
                color:        "#8A1A1A",
                fontSize:     11,
                fontWeight:   600,
                cursor:       "pointer",
                fontFamily:   "inherit",
              }}
            >
              🗑 Delete
            </button>
          )}
        </div>
      </div>

      {/* Approval panel (full width inside header) */}
      {userCanApprove && adv.is_pending && (
        <div style={{ marginTop: 16 }}>
          <ApprovalPendingPanel createdByName={adv.created_by_name} />
        </div>
      )}

      {userCanApprove && adv.is_rejected && (
        <div style={{ marginTop: 16 }}>
          <ApproverRejectedPanel rejectionNote={adv.rejection_note || adv.rejected_reason} />
        </div>
      )}

      {!userCanApprove && adv.is_pending && (
        <div style={{ marginTop: 16 }}><AwaitingApprovalPanel /></div>
      )}

      {!userCanApprove && adv.is_rejected && (
        <div style={{ marginTop: 16 }}>
          <SubmissionRejectedPanel rejectionNote={adv.rejection_note || adv.rejected_reason} />
        </div>
      )}

      {/* Approval stamp */}
      {adv.is_approved && adv.approved_by_name && adv.approved_at && (
        <div style={{ marginTop: 14 }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "6px 10px", borderRadius: 3,
            background: APPROVED_TONE.bg,
            color: APPROVED_TONE.color,
            border: `1px solid ${APPROVED_TONE.border}`,
            fontSize: 11, fontWeight: 600,
          }}>
            ✓ Approved by {adv.approved_by_name} on {formatDateTime(adv.approved_at)}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Overview tab ──────────────────────────────────────────────────────────────
function OverviewTab({ adv, userCanSeeCreds, userIsAdmin, user }) {
  const isApproverOrAdmin = user?.role === "admin" || user?.is_mis_approver;
  const isMerged          = adv.status === "merged";
  const [showManageManagers, setShowManageManagers] = useState(false);

  const showTracking = userCanSeeCreds &&
    (adv.tracking_panel_link || adv.panel_login_id || adv.has_panel_password);

  const { data: contactsRaw } = useContacts({ advertiser: adv.id });
  const contactCount = Array.isArray(contactsRaw)
    ? contactsRaw.length
    : (contactsRaw?.results?.length ?? 0);

  return (
    <div>
      {/* Pending approval panel — approver/admin only */}
      {isApproverOrAdmin && adv.is_pending && (
        <FullCard>
          <PendingApprovalPanel
            advertiser={adv}
            editableFields={[
              "full_name", "type", "email", "mobile",
              "region", "country", "city",
              "billing_entity", "billing_address",
            ]}
          />
        </FullCard>
      )}

      {/* Row 1 — Contact Info | Business Details */}
      <GridRow>
        <InfoCard title="Contact Info">
          <Row
            label="Contacts"
            customValue={
              <span style={{ fontSize: 12, color: "var(--accent)", fontWeight: 600 }}>
                {contactCount} contact{contactCount !== 1 ? "s" : ""}
              </span>
            }
          />
          <Row label="Email"    value={adv.email} isEmail />
          <Row label="Mobile"   value={adv.mobile} />
          <Row label="Landline" value={adv.landline} last />
        </InfoCard>

        <InfoCard title="Business Details">
          <Row label="Billing Entity"  value={adv.billing_entity} />
          <Row label="Tax ID"          value={adv.tax_id} />
          <Row label="Billing Address" value={adv.billing_address} />
          <Row label="Website"         value={adv.website} isLink last />
        </InfoCard>
      </GridRow>

      {/* Row 2 — Location */}
      <FullCard>
        <InfoCard title="Location">
          <Row label="Region"  value={adv.region_display ?? adv.region} />
          <Row label="Country" value={adv.country_name ?? adv.country} />
          <Row label="City"    value={adv.city} last />
        </InfoCard>
      </FullCard>

      {/* Row 3 — Tracking Panel (Ops/Admin/MIS Approver) */}
      {showTracking && (
        <FullCard>
          <InfoCard title="Tracking Panel">
            {adv.tracking_panel_link && (
              <Row label="Panel Link" value={adv.tracking_panel_link} isLink />
            )}
            <Row label="Login ID" value={adv.panel_login_id} />
            <Row
              label="Password"
              last
              customValue={
                <PasswordCell
                  hasPassword={adv.has_panel_password}
                  password={adv.panel_password}
                  allowReveal={userIsAdmin}
                />
              }
            />
          </InfoCard>
        </FullCard>
      )}

      {/* Row 4 — Audit */}
      {adv.created_by_name && (
        <FullCard>
          <InfoCard title="Audit">
            <Row label="Created By" value={adv.created_by_name} />
            <Row label="Created At" value={formatDateTime(adv.created_at)} />
            <Row label="Updated At" value={formatDateTime(adv.updated_at)} last />
          </InfoCard>
        </FullCard>
      )}

      {/* Row 5 — Managers (Approver/Admin only) */}
      {isApproverOrAdmin && (
        <FullCard>
          <div style={{
            background:   "var(--white)",
            border:       "1px solid var(--border)",
            borderRadius: 4,
            padding:      "16px 20px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <p style={{
                fontSize: 10, fontWeight: 700,
                textTransform: "uppercase", letterSpacing: "0.08em",
                color: "var(--accent)", margin: 0,
              }}>
                Managers ({adv.managers?.length || 0})
              </p>
              {!isMerged && (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowManageManagers(true)}
                >
                  Manage
                </button>
              )}
            </div>

            {adv.managers && adv.managers.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {adv.managers.map((m) => (
                  <div key={m.id} style={{
                    fontSize:     12,
                    padding:      "6px 10px",
                    background:   "var(--surface)",
                    borderRadius: 3,
                    color:        "var(--text)",
                  }}>
                    {m.full_name}{" "}
                    <span style={{ color: "var(--text3)" }}>· {m.email}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: "var(--text3)" }}>
                No managers assigned yet.
              </div>
            )}
          </div>
        </FullCard>
      )}

      {showManageManagers && (
        <ManageManagersModal
          advertiser={adv}
          onClose={() => setShowManageManagers(false)}
          onSaved={() => {}}
        />
      )}
    </div>
  );
}

// ── Activity tab ──────────────────────────────────────────────────────────────
const ACTION_META = {
  advertiser_created:          { icon: "✚", color: "#0A7838" },
  advertiser_updated:          { icon: "✎", color: "#1A5A9A" },
  advertiser_deleted:          { icon: "✕", color: "#C03030" },
  advertiser_approved:         { icon: "✓", color: "#0A7838" },
  advertiser_rejected:         { icon: "✗", color: "#8A1A1A" },
  advertiser_merged:           { icon: "⇒", color: "#6030A0" },
  advertiser_unmerged:         { icon: "↩", color: "#6030A0" },
  advertiser_reverted:         { icon: "↶", color: "#A06010" },
  advertiser_managers_updated: { icon: "👥", color: "#1A5A9A" },
  contact_assigned:            { icon: "👤", color: "#0A7838" },
  contact_transferred:         { icon: "↔", color: "#7A4A00" },
  contact_unassigned:          { icon: "○", color: "#8A1A1A" },
};

function describeActivity(entry) {
  if (entry.human_readable) return entry.human_readable;
  const m = entry.meta || {};
  switch (entry.action) {
    case "advertiser_created":
      return "created this advertiser";
    case "advertiser_updated": {
      const fields = m.changes ? Object.keys(m.changes).join(", ") : "details";
      return `updated ${fields}`;
    }
    case "advertiser_approved":
      return "approved the advertiser";
    case "advertiser_rejected":
      return `rejected the advertiser${m.reason ? `: ${m.reason}` : ""}`;
    case "advertiser_merged":
      return `merged "${m.merged_from_name || "a submission"}" into this advertiser`;
    case "advertiser_unmerged":
      return `unmerged the advertiser; ${m.contacts_restored || 0} contact(s) restored`;
    case "advertiser_reverted":
      return `reverted the advertiser to pending${m.reason ? `: ${m.reason}` : ""}`;
    case "advertiser_managers_updated": {
      const parts = [];
      if (m.added?.length)   parts.push(`added ${m.added.join(", ")}`);
      if (m.removed?.length) parts.push(`removed ${m.removed.join(", ")}`);
      return `updated managers — ${parts.join("; ") || "no changes"}`;
    }
    case "contact_assigned":
      return `assigned contact "${m.contact_name || "—"}" to ${m.new_owner || "—"}`;
    case "contact_transferred":
      return "transferred contact ownership";
    case "contact_unassigned":
      return "marked a contact unassigned";
    default:
      return (entry.action || "unknown").replace(/_/g, " ");
  }
}

function ActivityTab({ activity, loading }) {
  if (loading) return <Spinner center />;

  if (!activity.length) return (
    <div style={{
      padding: "32px 0", textAlign: "center",
      color: "var(--text3)", fontSize: 12,
    }}>
      No activity recorded for this advertiser yet.
    </div>
  );

  return (
    <div className="card" style={{ padding: "8px 20px" }}>
      {activity.map((entry, i) => {
        const meta = ACTION_META[entry.action] ?? { icon: "•", color: "var(--text3)" };
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
                <strong style={{ fontWeight: 600 }}>
                  {entry.actor_name || "System"}
                </strong>
                {" "}{describeActivity(entry)}
              </p>
              <p style={{ fontSize: 10, color: "var(--text3)", marginTop: 2 }}>
                {formatDateTime(entry.created_at)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Campaigns tab ─────────────────────────────────────────────────────────────
function CampaignsTab({ advertiserId }) {
  const navigate    = useNavigate();
  const [showCreate, setShowCreate] = useState(false);

  const { data: rawData, isLoading } = useCampaigns(
    advertiserId ? { advertiser: advertiserId } : {}
  );
  const campaigns = Array.isArray(rawData) ? rawData : (rawData?.results ?? []);

  const STATUS_STYLE = {
    pending:  { bg: "#FDF4E0", color: "#A06010", border: "#F0D080" },
    active:   { bg: "#E4F8EE", color: "#0A7838", border: "#80D8A8" },
    rejected: { bg: "#FCE8E8", color: "#8A1A1A", border: "#F0A8A8" },
    paused:   { bg: "#FDF4E0", color: "#7A4A00", border: "#F0D080" },
    inactive: { bg: "#FCE8E8", color: "#8A1A1A", border: "#F0A8A8" },
  };

  function StatusBadge({ status }) {
    const s = STATUS_STYLE[status] ?? STATUS_STYLE.inactive;
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: "2px 8px", borderRadius: 3, fontSize: 10,
        fontWeight: 600, background: s.bg, color: s.color,
        border: `1px solid ${s.border}`, textTransform: "capitalize",
      }}>
        <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
        {status ?? "—"}
      </span>
    );
  }

  if (isLoading) return <Spinner center />;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          + New Campaign
        </button>
      </div>

      {campaigns.length === 0 ? (
        <div style={{
          padding: "48px 0", textAlign: "center",
          border: "2px dashed var(--border)", borderRadius: 4,
          color: "var(--text3)",
        }}>
          <p style={{ fontSize: 36, marginBottom: 10 }}>📋</p>
          <p style={{ fontSize: 14, fontWeight: 600 }}>No campaigns yet</p>
          <p style={{ fontSize: 11, marginTop: 4 }}>
            Click "+ New Campaign" to add the first campaign for this advertiser.
          </p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Type</th>
                <th>Status</th>
                <th>Sales Manager</th>
                <th>Created At</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr
                  key={c.id}
                  style={{ cursor: "pointer" }}
                  onClick={() => navigate(`/campaigns/${c.id}`)}
                >
                  <td>
                    <p style={{ fontWeight: 600, fontSize: 12, color: "var(--text)" }}>
                      {c.campaign_name}
                    </p>
                  </td>
                  <td>
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: "2px 7px",
                      borderRadius: 3, background: "var(--surface)",
                      color: "var(--text2)", textTransform: "capitalize",
                    }}>
                      {c.campaign_type ?? "—"}
                    </span>
                  </td>
                  <td><StatusBadge status={c.status} /></td>
                  <td style={{ fontSize: 11, color: "var(--text2)" }}>
                    {c.sales_manager_name ?? (
                      <span style={{ fontStyle: "italic", color: "var(--text3)" }}>Unassigned</span>
                    )}
                  </td>
                  <td style={{ fontSize: 11, color: "var(--text2)" }}>
                    {formatDateTime(c.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <CampaignForm
          defaultAdvertiserId={advertiserId}
          onClose={() => setShowCreate(false)}
          onSaved={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}

// ── Contacts tab ─────────────────────────────────────────────────────────────
function ContactsTab({ advertiserId, user, managers = [], isApproverOrAdmin = false }) {
  const toast    = useToast();
  const isAdmin  = user?.role === "admin";
  const [showCreate,  setShowCreate]  = useState(false);
  const [editContact, setEditContact] = useState(null);
  const [confirmDel,  setConfirmDel]  = useState(null);

  const { data: rawData, isLoading } = useContacts({ advertiser: advertiserId });
  const contacts = Array.isArray(rawData) ? rawData : (rawData?.results ?? []);
  const deleteMutation = useDeleteContact();

  const { data: unassignedRaw } = useContacts(
    { advertiser: advertiserId, owner: "null" },
    { enabled: isApproverOrAdmin }
  );
  const unassignedContacts = Array.isArray(unassignedRaw)
    ? unassignedRaw
    : (unassignedRaw?.results ?? []);
  const assignMutation = useAssignContactOwner();

  const handleDelete = async () => {
    if (!confirmDel) return;
    try {
      await deleteMutation.mutateAsync(confirmDel.id);
      toast.success(`${confirmDel.name} deleted.`);
      setConfirmDel(null);
    } catch {
      toast.error("Could not delete contact.");
    }
  };

  if (isLoading) return <Spinner center />;

  return (
    <div>
      {isApproverOrAdmin && unassignedContacts.length > 0 && (
        <div style={{
          padding:      "12px 14px",
          background:   "#FFF8E1",
          border:       "1px solid #F0D080",
          borderRadius: 4,
          marginBottom: 16,
        }}>
          <p style={{
            fontSize: 10, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.08em",
            color: "#A06010", marginBottom: 10,
          }}>
            ⚠ Unassigned Contacts ({unassignedContacts.length})
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {unassignedContacts.map((c) => (
              <UnassignedContactRow
                key={c.id}
                contact={c}
                managers={managers}
                assignMutation={assignMutation}
              />
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          + Add Contact
        </button>
      </div>

      {contacts.length === 0 ? (
        <div style={{
          padding: "48px 0", textAlign: "center",
          border: "2px dashed var(--border)", borderRadius: 4,
          color: "var(--text3)",
        }}>
          <p style={{ fontSize: 36, marginBottom: 10 }}>📇</p>
          <p style={{ fontSize: 14, fontWeight: 600 }}>No contacts yet</p>
          <p style={{ fontSize: 11, marginTop: 4 }}>
            Click "+ Add Contact" to add a contact for this advertiser.
          </p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Designation</th>
                <th>Email</th>
                <th>Phone</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.id}>
                  <td>
                    <p style={{ fontWeight: 600, fontSize: 12, color: "var(--text)" }}>
                      {c.name}
                    </p>
                    {c.auto_created && (
                      <p style={{ fontSize: 9, color: "var(--text3)", fontStyle: "italic" }}>
                        auto-created
                      </p>
                    )}
                  </td>
                  <td style={{ fontSize: 11, color: "var(--text2)" }}>{c.designation || "—"}</td>
                  <td>
                    {c.email ? (
                      <a href={`mailto:${c.email}`} style={{ fontSize: 11, color: "var(--accent)" }}>
                        {c.email}
                      </a>
                    ) : (
                      <span style={{ fontSize: 11, color: "var(--text3)" }}>—</span>
                    )}
                  </td>
                  <td style={{ fontSize: 11, color: "var(--text2)" }}>{c.phone || "—"}</td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                      <button
                        onClick={() => setEditContact(c)}
                        style={{
                          padding: "3px 8px", borderRadius: 3, border: "1px solid var(--border)",
                          background: "none", fontSize: 10, fontWeight: 600,
                          color: "var(--text3)", cursor: "pointer", fontFamily: "inherit",
                        }}
                      >
                        Edit
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => setConfirmDel(c)}
                          style={{
                            padding: "3px 8px", borderRadius: 3, border: "1px solid var(--border)",
                            background: "none", fontSize: 10, fontWeight: 600,
                            color: "#C03030", cursor: "pointer", fontFamily: "inherit",
                          }}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <ContactForm
          defaultAdvertiser={advertiserId}
          onClose={() => setShowCreate(false)}
          onSaved={() => setShowCreate(false)}
        />
      )}

      {editContact && (
        <ContactForm
          contact={editContact}
          onClose={() => setEditContact(null)}
          onSaved={() => setEditContact(null)}
        />
      )}

      {confirmDel && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            background: "var(--white)", borderRadius: 6, padding: "24px 28px",
            maxWidth: 380, width: "90%", boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
          }}>
            <p style={{ fontWeight: 700, fontSize: 14, color: "var(--text)", marginBottom: 8 }}>
              Delete Contact?
            </p>
            <p style={{ fontSize: 12, color: "var(--text2)", marginBottom: 20 }}>
              Delete "{confirmDel.name}"? This action cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn btn-secondary" onClick={() => setConfirmDel(null)}>
                Cancel
              </button>
              <button
                className="btn"
                style={{ background: "#C03030", color: "#fff", border: "none" }}
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Unassigned contact row ────────────────────────────────────────────────────
function UnassignedContactRow({ contact, managers, assignMutation }) {
  const toast = useToast();
  const [targetId, setTargetId] = useState("");

  const handleAssign = async () => {
    if (!targetId) return;
    try {
      await assignMutation.mutateAsync({ id: contact.id, newOwnerId: targetId });
      toast.success(`${contact.name} assigned.`);
    } catch {
      toast.error("Could not assign contact.");
    }
  };

  return (
    <div style={{
      display:     "flex",
      alignItems:  "center",
      gap:         8,
      padding:     "8px 10px",
      background:  "var(--white)",
      borderRadius: 3,
      border:       "1px solid var(--border)",
      flexWrap:    "wrap",
    }}>
      <div style={{ flex: "1 1 160px", minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{contact.name}</div>
        {contact.email && (
          <div style={{ fontSize: 10, color: "var(--text3)" }}>{contact.email}</div>
        )}
      </div>
      <select
        value={targetId}
        onChange={(e) => setTargetId(e.target.value)}
        className="form-select"
        style={{ flex: "1 1 180px", maxWidth: 220, fontSize: 12 }}
      >
        <option value="">— Assign to —</option>
        {managers.map((m) => (
          <option key={m.id} value={m.id}>{m.full_name}</option>
        ))}
      </select>
      <button
        className="btn btn-primary btn-sm"
        disabled={!targetId || assignMutation.isPending}
        onClick={handleAssign}
      >
        Assign
      </button>
    </div>
  );
}

// ── Approval panels ───────────────────────────────────────────────────────────
function ApprovalPendingPanel({ createdByName }) {
  return (
    <div style={{
      padding: "12px 14px",
      borderRadius: 4,
      background: PENDING_TONE.bg,
      border: `1px solid ${PENDING_TONE.border}`,
      color: PENDING_TONE.color,
    }}>
      <p style={{
        fontSize: 11, fontWeight: 800, letterSpacing: "0.06em",
        textTransform: "uppercase", marginBottom: 4,
      }}>
        ⏳ Pending Approval
      </p>
      <p style={{ fontSize: 11, color: "var(--text2)" }}>
        Submitted by {createdByName || "—"} — review in the Overview tab below.
      </p>
    </div>
  );
}

function ApproverRejectedPanel({ rejectionNote }) {
  return (
    <div style={{
      padding: "12px 14px",
      borderRadius: 4,
      background: REJECTED_TONE.bg,
      border: `1px solid ${REJECTED_TONE.border}`,
      color: REJECTED_TONE.color,
    }}>
      <p style={{
        fontSize: 11, fontWeight: 800, letterSpacing: "0.06em",
        textTransform: "uppercase", marginBottom: 4,
      }}>
        ✗ Rejected
      </p>
      <p style={{ fontSize: 11, color: "var(--text2)" }}>
        <strong>Reason:</strong> {rejectionNote || "—"}
      </p>
    </div>
  );
}

function AwaitingApprovalPanel() {
  return (
    <div style={{
      padding: "14px 16px",
      borderRadius: 4,
      background: PENDING_TONE.bg,
      border: `1px solid ${PENDING_TONE.border}`,
      color: PENDING_TONE.color,
    }}>
      <p style={{
        fontSize: 11, fontWeight: 800, letterSpacing: "0.06em",
        textTransform: "uppercase", marginBottom: 6,
      }}>
        ⏳ Awaiting Approval
      </p>
      <p style={{ fontSize: 11, color: "var(--text2)", lineHeight: 1.5 }}>
        Your submission is under review by the APP.
      </p>
    </div>
  );
}

function SubmissionRejectedPanel({ rejectionNote }) {
  return (
    <div style={{
      padding: "14px 16px",
      borderRadius: 4,
      background: REJECTED_TONE.bg,
      border: `1px solid ${REJECTED_TONE.border}`,
      color: REJECTED_TONE.color,
    }}>
      <p style={{
        fontSize: 11, fontWeight: 800, letterSpacing: "0.06em",
        textTransform: "uppercase", marginBottom: 6,
      }}>
        ✗ Submission Rejected
      </p>
      <p style={{ fontSize: 11, color: "var(--text2)", marginBottom: 8 }}>
        <strong>Reason:</strong> {rejectionNote || "—"}
      </p>
      <p style={{ fontSize: 11, color: "var(--text2)", lineHeight: 1.5 }}>
        Please contact your APP.
      </p>
    </div>
  );
}

// ── Shared Overview helpers ───────────────────────────────────────────────────
function GridRow({ children }) {
  const isMobile = useIsMobile();
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
      gap: 14,
      marginBottom: 14,
    }}>
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
      background: "var(--white)",
      border: "1px solid var(--border)",
      borderRadius: 4,
      padding: "16px 20px",
    }}>
      <p style={{
        fontSize: 10, fontWeight: 700,
        textTransform: "uppercase", letterSpacing: "0.08em",
        color: "var(--accent)", marginBottom: 14,
      }}>
        {title}
      </p>
      {children}
    </div>
  );
}

function Row({ label, value, isEmail, isLink, last, customValue }) {
  const display = value === 0 ? "0" : (value || "—");
  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      padding: "6px 0",
      borderBottom: last ? "none" : "1px solid var(--border)",
      gap: 12,
    }}>
      <span style={{
        fontSize: 11, color: "var(--text3)",
        flexShrink: 0, minWidth: 120, paddingTop: 1,
      }}>
        {label}
      </span>
      {customValue !== undefined ? (
        <div style={{ textAlign: "right", flex: 1 }}>{customValue}</div>
      ) : isEmail && value ? (
        <a href={`mailto:${value}`} style={{
          fontSize: 12, color: "var(--accent)",
          textAlign: "right", wordBreak: "break-all",
        }}>{value}</a>
      ) : isLink && value ? (
        <a href={value} target="_blank" rel="noopener noreferrer" style={{
          fontSize: 12, color: "var(--accent)",
          textAlign: "right", wordBreak: "break-all",
        }}>{value} ↗</a>
      ) : (
        <span style={{
          fontSize: 12, color: "var(--text2)",
          textAlign: "right", wordBreak: "break-word",
        }}>{display}</span>
      )}
    </div>
  );
}

function PasswordCell({ hasPassword, password, allowReveal }) {
  const [show, setShow] = useState(false);
  if (!hasPassword) {
    return <span style={{ fontSize: 12, color: "var(--text2)" }}>—</span>;
  }
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 8,
      justifyContent: "flex-end",
    }}>
      <span style={{
        fontFamily: "monospace", fontSize: 14,
        letterSpacing: 2, color: "var(--text2)",
      }}>
        {allowReveal && show && password ? password : "••••••••"}
      </span>
      {allowReveal && password && (
        <button
          onClick={() => setShow((v) => !v)}
          style={{
            background: "none", border: "1px solid var(--border)",
            borderRadius: 3, padding: "1px 6px",
            fontSize: 9, fontWeight: 700, cursor: "pointer",
            color: "var(--text3)", fontFamily: "inherit",
          }}
        >
          {show ? "HIDE" : "SHOW"}
        </button>
      )}
    </div>
  );
}


// ── Unmerge confirm modal ─────────────────────────────────────────────────────
function UnmergeConfirmModal({ targetName, onCancel, onConfirm, loading }) {
  return (
    <div style={{
      position:   "fixed",
      inset:      0,
      background: "rgba(0,0,0,0.4)",
      display:    "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex:     300,
    }}>
      <div style={{
        background:   "var(--white)",
        borderRadius: 6,
        padding:      "28px 32px",
        maxWidth:     420,
        width:        "90%",
        boxShadow:    "0 8px 24px rgba(0,0,0,0.15)",
      }}>
        <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
          Unmerge Advertiser?
        </p>
        <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 20, lineHeight: 1.5 }}>
          This will move contacts back from{" "}
          <strong>{targetName || "the target advertiser"}</strong> to this advertiser,
          and reset its status to <strong>Pending</strong>.
          You can re-merge it later if needed.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="btn btn-secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={onConfirm} disabled={loading}>
            {loading ? "Unmerging…" : "Confirm Unmerge"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Revert-to-Pending confirm modal ──────────────────────────────────────────
function RevertConfirmModal({ name, reason, onReasonChange, onCancel, onConfirm, loading }) {
  return (
    <div style={{
      position:   "fixed",
      inset:      0,
      background: "rgba(0,0,0,0.4)",
      display:    "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex:     300,
    }}>
      <div style={{
        background:   "var(--white)",
        borderRadius: 6,
        padding:      "28px 32px",
        maxWidth:     440,
        width:        "90%",
        boxShadow:    "0 8px 24px rgba(0,0,0,0.15)",
      }}>
        <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
          Revert to Pending?
        </p>
        <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 14, lineHeight: 1.5 }}>
          This will move <strong>{name}</strong> back to <strong>Pending</strong> status.
          Managers and contacts stay unchanged. You can re-approve it later.
        </p>
        <div className="form-group" style={{ marginBottom: 20 }}>
          <label className="form-label" style={{ fontSize: 11 }}>Reason (optional)</label>
          <textarea
            className="form-input"
            rows={2}
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder="Why is this being reverted?"
            disabled={loading}
          />
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="btn btn-secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={onConfirm} disabled={loading}>
            {loading ? "Reverting…" : "Confirm Revert"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Delete confirm modal (detail page) ────────────────────────────────────────
function DeleteConfirmModal({ name, onCancel, onConfirm, loading }) {
  return (
    <div style={{
      position:   "fixed",
      inset:      0,
      background: "rgba(0,0,0,0.4)",
      display:    "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex:     300,
    }}>
      <div style={{
        background:   "var(--white)",
        borderRadius: 6,
        padding:      "28px 32px",
        maxWidth:     400,
        width:        "90%",
        boxShadow:    "0 8px 24px rgba(0,0,0,0.15)",
      }}>
        <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
          Delete Advertiser?
        </p>
        <p style={{
          fontSize: 13, color: "var(--text2)", marginBottom: 20,
          lineHeight: 1.5,
        }}>
          This will permanently delete <strong>{name}</strong> and
          all associated data. This action cannot be undone.
        </p>
        <div style={{
          display: "flex", gap: 10, justifyContent: "flex-end",
        }}>
          <button
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              padding:      "7px 16px",
              borderRadius: 3,
              border:       "none",
              background:   "#C03030",
              color:        "#fff",
              fontSize:     12,
              fontWeight:   600,
              cursor:       loading ? "not-allowed" : "pointer",
              fontFamily:   "inherit",
              opacity:      loading ? 0.7 : 1,
            }}
          >
            {loading ? "Deleting…" : "Yes, Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
