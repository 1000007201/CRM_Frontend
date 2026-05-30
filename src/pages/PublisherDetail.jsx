/**
 * pages/PublisherDetail.jsx
 *
 * Full-width layout:
 *   Back nav
 *   Header section (avatar + name + specialization + location — status + actions — approval panel)
 *   Tab bar (Overview | Activity)
 *   Tab content (full width)
 *
 * Role-aware:
 *   Sales     → read-only, bank details hidden
 *   Ops       → full view including bank details
 *   Admin     → full view including bank details
 *   Approver  → can approve/reject pending publishers
 */
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQueryClient }        from "@tanstack/react-query";
import { useAuth }               from "@/hooks/useAuth";
import { useIsMobile }           from "@/hooks/useIsMobile";
import {
  usePublisher,
  useSetPublisherStatus,
  useApprovePublisher,
  useRejectPublisher,
  useUpdatePublisher,
  useDeletePublisher,
  usePublisherChoices,
  publisherKeys,
} from "@/hooks/usePublishers";
import { useSalesStaff }         from "@/hooks/useUsers";
import { publishersApi }         from "@/api/publishers";
import { useActivityList }       from "@/hooks/useActivity";
import Spinner                   from "@/components/common/Spinner";
import Avatar                    from "@/components/common/Avatar";
import Modal                     from "@/components/common/Modal";
import { useToast }              from "@/components/common/Toast";
import { hasPerm, canApprove }   from "@/utils/permissions";
import { formatDateTime }        from "@/utils/formatters";
import PublisherForm                   from "@/components/advertisers/PublisherForm";
import ManagePublisherManagersModal    from "@/components/publishers/ManagePublisherManagersModal";
import { COMMON_COUNTRIES }           from "@/utils/countries";

// ── Permission helpers ────────────────────────────────────────────────────────
const canManage = (user) => hasPerm(user, "publishers");

const canSeeBank = (user) =>
  user?.role === "admin" || user?.department === "operations";

// ── Status colours ────────────────────────────────────────────────────────────
const STATUS_STYLE = {
  active:           { bg: "#E4F8EE", color: "#0A5A28", border: "#80D8A8" },
  inactive:         { bg: "#FCE8E8", color: "#8A1A1A", border: "#F0A8A8" },
  paused:           { bg: "#FDF4E0", color: "#7A4A00", border: "#F0D080" },
  pending_approval: { bg: "#FDF4E0", color: "#A06010", border: "#F0D080" },
  rejected:         { bg: "#FCE8E8", color: "#8A1A1A", border: "#F0A8A8" },
};

const PENDING_TONE  = { bg: "#FDF4E0", color: "#A06010", border: "#F0D080" };
const APPROVED_TONE = { bg: "#E4F8EE", color: "#0A7838", border: "#80D8A8" };
const REJECTED_TONE = { bg: "#FCE8E8", color: "#8A1A1A", border: "#F0A8A8" };

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "activity", label: "Activity" },
];

// ── Page ──────────────────────────────────────────────────────────────────────
export default function PublisherDetailPage() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const { user }  = useAuth();
  const isMobile  = useIsMobile();
  const toast     = useToast();
  const userCanManage      = canManage(user);
  const userCanApprove     = canApprove(user);
  const userCanSeeBank     = canSeeBank(user);
  const userCanDelete      = user?.role === "admin";
  const isApproverOrAdmin  = user?.role === "admin" || user?.is_mis_approver === true;

  const [tab,                 setTab]                 = useState("overview");
  const [showEdit,            setShowEdit]            = useState(false);
  const [showReviewModal,     setShowReviewModal]     = useState(false);
  const [showDeleteConfirm,   setShowDeleteConfirm]   = useState(false);
  const [showManageManagers,  setShowManageManagers]  = useState(false);

  const queryClient = useQueryClient();

  const { data: pub, isLoading, isError } = usePublisher(id);
  const setStatus      = useSetPublisherStatus();
  const deleteMutation = useDeletePublisher();

  const { data: activityRaw, isLoading: actLoading } = useActivityList({
    module: "advertisers",
    page_size: 30,
  });
  const activityAll = activityRaw?.results ?? [];
  const activity = activityAll.filter(
    (a) => a.meta?.id === id || a.meta?.publisher_id === id
  );

  const handleStatusToggle = async () => {
    if (!pub) return;
    const next = pub.status === "active" ? "inactive" : "active";
    try {
      await setStatus.mutateAsync({ id: pub.id, status: next });
      toast.success(`Publisher marked ${next}`);
    } catch {
      toast.error("Could not update status.");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(pub.id);
      toast.success(`${pub.display_name ?? pub.full_name} deleted.`);
      navigate("/publishers");
    } catch {
      toast.error("Could not delete publisher.");
    }
  };

  if (isLoading) return <div style={{ padding: 40 }}><Spinner center /></div>;
  if (isError || !pub) return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <p style={{ color: "var(--text3)" }}>Publisher not found.</p>
      <button className="btn btn-secondary" style={{ marginTop: 12 }}
        onClick={() => navigate("/publishers")}>← Back</button>
    </div>
  );

  return (
    <div>
      {/* Back nav */}
      <button
        onClick={() => navigate("/publishers")}
        style={{
          background: "none", border: "none", cursor: "pointer",
          fontSize: 12, color: "var(--text3)", marginBottom: 14,
          display: "flex", alignItems: "center", gap: 5, fontFamily: "inherit",
        }}
      >
        ← Publishers
      </button>

      {/* Header section */}
      <HeaderSection
        pub={pub}
        userCanManage={userCanManage}
        userCanApprove={userCanApprove}
        userCanDelete={userCanDelete}
        onEdit={() => setShowEdit(true)}
        onStatusToggle={handleStatusToggle}
        statusPending={setStatus.isPending}
        onOpenReview={() => setShowReviewModal(true)}
        onDelete={() => setShowDeleteConfirm(true)}
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
          pub={pub}
          userCanManage={userCanManage}
          userCanSeeBank={userCanSeeBank}
          isApproverOrAdmin={isApproverOrAdmin}
          onManageManagers={() => setShowManageManagers(true)}
        />
      )}
      {tab === "activity" && <ActivityTab activity={activity} loading={actLoading} />}

      {/* Edit modal */}
      {showEdit && (
        <PublisherForm
          publisher={pub}
          onClose={() => setShowEdit(false)}
          onSaved={() => setShowEdit(false)}
        />
      )}

      {/* Review & Approve modal */}
      {showReviewModal && (
        <PublisherReviewModal
          pub={pub}
          onClose={() => setShowReviewModal(false)}
          onSaved={() => {
            setShowReviewModal(false);
            queryClient.invalidateQueries({ queryKey: publisherKeys.detail(id) });
          }}
        />
      )}

      {/* Delete confirm modal */}
      {showDeleteConfirm && (
        <DeleteConfirmModal
          name={pub.display_name ?? pub.full_name}
          onCancel={() => setShowDeleteConfirm(false)}
          onConfirm={handleDelete}
          loading={deleteMutation.isPending}
        />
      )}

      {/* Manage managers modal */}
      {showManageManagers && (
        <ManagePublisherManagersModal
          publisher={pub}
          onClose={() => setShowManageManagers(false)}
        />
      )}
    </div>
  );
}

// ── Header section ────────────────────────────────────────────────────────────
function HeaderSection({
  pub, userCanManage, userCanApprove, userCanDelete,
  onEdit, onStatusToggle, statusPending,
  onOpenReview, onDelete,
}) {
  const statusStyle  = STATUS_STYLE[pub.status] ?? STATUS_STYLE.inactive;
  const location     = [pub.city, pub.country_name ?? pub.country].filter(Boolean).join(", ");
  const displayName  = pub.display_name ?? pub.full_name;
  const specLabels   = pub.specialization_labels ?? pub.area_of_specialization ?? [];

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
        {/* Left: avatar + name + specs + location */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0, flex: "1 1 auto" }}>
          <Avatar name={displayName} size={48} />
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <h2 style={{
                fontSize: 20, fontWeight: 700, color: "var(--text)",
                lineHeight: 1.2, wordBreak: "break-word",
              }}>
                {displayName}
              </h2>
              {pub.display_id && (
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
                  {pub.display_id}
                </span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
              {specLabels.slice(0, 3).map((s) => (
                <span key={s} style={{
                  fontSize: 9, fontWeight: 700, padding: "2px 7px",
                  borderRadius: 10, background: "var(--accent-lt)",
                  color: "var(--accent)",
                  textTransform: "uppercase", letterSpacing: "0.04em",
                }}>
                  {s}
                </span>
              ))}
              {specLabels.length > 3 && (
                <span style={{ fontSize: 10, color: "var(--text3)" }}>
                  +{specLabels.length - 3}
                </span>
              )}
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
            {(pub.status ?? "").replace("_", " ")}
          </span>

          {userCanManage && (
            <>
              <button
                className="btn btn-secondary btn-sm"
                onClick={onEdit}
              >
                ✎ Edit
              </button>
              <button
                className="btn btn-sm"
                style={{
                  background: pub.status === "active" ? "#FCE8E8" : "#E4F8EE",
                  color:      pub.status === "active" ? "#8A1A1A" : "#0A5A28",
                  border:     `1px solid ${pub.status === "active" ? "#F0A8A8" : "#80D8A8"}`,
                }}
                onClick={onStatusToggle}
                disabled={statusPending}
              >
                {pub.status === "active" ? "⏸ Pause" : "▶ Activate"}
              </button>
            </>
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

      {/* Approval panel */}
      {userCanApprove && pub.status === "pending_approval" && (
        <div style={{ marginTop: 16 }}>
          <ApprovalPendingPanel
            createdByName={pub.created_by_name}
            onOpenReview={onOpenReview}
          />
        </div>
      )}

      {userCanApprove && pub.status === "rejected" && (
        <div style={{ marginTop: 16 }}>
          <ApproverRejectedPanel
            rejectionNote={pub.rejection_note}
            onOpenReview={onOpenReview}
          />
        </div>
      )}

      {!userCanApprove && pub.status === "pending_approval" && (
        <div style={{ marginTop: 16 }}><AwaitingApprovalPanel /></div>
      )}

      {!userCanApprove && pub.status === "rejected" && (
        <div style={{ marginTop: 16 }}>
          <SubmissionRejectedPanel rejectionNote={pub.rejection_note} />
        </div>
      )}

      {/* Approval stamp */}
      {pub.status === "active" && pub.approved_by_name && pub.approved_at && (
        <div style={{ marginTop: 14 }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "6px 10px", borderRadius: 3,
            background: APPROVED_TONE.bg,
            color: APPROVED_TONE.color,
            border: `1px solid ${APPROVED_TONE.border}`,
            fontSize: 11, fontWeight: 600,
          }}>
            ✓ Approved by {pub.approved_by_name} on {formatDateTime(pub.approved_at)}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Overview tab ──────────────────────────────────────────────────────────────
function OverviewTab({ pub, userCanManage, userCanSeeBank, isApproverOrAdmin, onManageManagers }) {
  const specLabels = pub.specialization_labels ?? pub.area_of_specialization ?? [];
  const showBank   = userCanSeeBank && pub.has_bank_details;
  const managers   = pub.managers ?? [];

  return (
    <div>
      {/* Row 1 — Contact Info | Specialization */}
      <GridRow>
        <InfoCard title="Contact Info">
          <Row label="Full Name" value={pub.full_name} />
          <Row label="Email"     value={pub.email} isEmail />
          <Row label="Mobile"    value={pub.mobile} />
          <Row label="Landline"  value={pub.landline} last />
        </InfoCard>

        <InfoCard title="Specialization">
          <Row
            label="Area"
            customValue={<SpecChips specs={specLabels} />}
          />
          <Row label="Past Campaigns" value={pub.past_campaigns} last />
        </InfoCard>
      </GridRow>

      {/* Row 2 — Location | Managers */}
      <GridRow>
        <InfoCard title="Location">
          <Row label="Region"  value={pub.region_display ?? pub.region} />
          <Row label="Country" value={pub.country_name ?? pub.country} />
          <Row label="City"    value={pub.city} />
          <Row label="Address" value={pub.address} last />
        </InfoCard>

        <InfoCard
          title="Managers"
          action={isApproverOrAdmin ? (
            <button
              onClick={onManageManagers}
              style={{
                fontSize: 11, fontWeight: 600, cursor: "pointer",
                background: "none", border: "1px solid var(--border2)",
                borderRadius: 3, padding: "3px 10px",
                color: "var(--accent)", fontFamily: "inherit",
              }}
            >
              Manage
            </button>
          ) : null}
        >
          {managers.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--text3)", fontStyle: "italic", padding: "6px 0" }}>
              No managers assigned
            </p>
          ) : (
            managers.map((m, i) => (
              <div key={m.id} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "6px 0",
                borderBottom: i < managers.length - 1 ? "1px solid var(--border)" : "none",
              }}>
                <Avatar name={m.full_name} size={30} />
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                    {m.full_name}
                  </p>
                  {m.display_role && (
                    <p style={{ fontSize: 11, color: "var(--text3)" }}>{m.display_role}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </InfoCard>
      </GridRow>

      {/* Row 3 — Business Details (Ops/Admin/MIS Approver) */}
      {userCanManage && (
        <FullCard>
          <InfoCard title="Business Details">
            <Row label="Tax ID"  value={pub.tax_id} />
            <Row label="Website" value={pub.website} isLink last />
          </InfoCard>
        </FullCard>
      )}

      {/* Row 4 — Bank Details (Ops/Admin only, only if has_bank_details) */}
      {showBank && (
        <FullCard>
          <InfoCard title="Bank Details">
            <Row label="Account Number" value={pub.bank_account_number} />
            <Row label="Account Name"   value={pub.account_name} />
            <Row label="Bank Name"      value={pub.bank_name} />
            <Row label="Branch"         value={pub.branch} />
            <Row label="IFSC Code"      value={pub.ifsc_code} />
            <Row label="SWIFT/BIC"      value={pub.swift_code} />
            <Row label="UPI ID"         value={pub.upi_id} last />
          </InfoCard>
        </FullCard>
      )}

      {/* Row 5 — Audit */}
      <FullCard>
        <InfoCard title="Audit">
          <Row label="Created By" value={pub.created_by_name} />
          <Row label="Created At" value={formatDateTime(pub.created_at)} />
          <Row label="Updated At" value={formatDateTime(pub.updated_at)} last />
        </InfoCard>
      </FullCard>
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
      No activity recorded for this publisher yet.
    </div>
  );

  const ACTION_ICON = {
    publisher_created: { icon: "✚", color: "#0A7838" },
    publisher_updated: { icon: "✎", color: "#1A5A9A" },
    publisher_deleted: { icon: "✕", color: "#C03030" },
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

// ── Approval panels ───────────────────────────────────────────────────────────
function ApprovalPendingPanel({ createdByName, onOpenReview }) {
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
        textTransform: "uppercase", marginBottom: 4,
      }}>
        ⏳ Pending Approval
      </p>
      <p style={{ fontSize: 11, color: "var(--text2)", marginBottom: 12 }}>
        Submitted by {createdByName || "—"}
      </p>
      <button
        className="btn btn-primary"
        onClick={onOpenReview}
        style={{ width: "100%", maxWidth: 520 }}
      >
        📋 Review & Approve
      </button>
    </div>
  );
}

function ApproverRejectedPanel({ rejectionNote, onOpenReview }) {
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
        ✗ Rejected
      </p>
      <p style={{ fontSize: 11, color: "var(--text2)", marginBottom: 12 }}>
        <strong>Reason:</strong> {rejectionNote || "—"}
      </p>
      <button
        className="btn btn-primary"
        onClick={onOpenReview}
        style={{ width: "100%", maxWidth: 520 }}
      >
        📋 Review & Re-approve
      </button>
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

function InfoCard({ title, children, action }) {
  return (
    <div style={{
      background: "var(--white)",
      border: "1px solid var(--border)",
      borderRadius: 4,
      padding: "16px 20px",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <p style={{
          fontSize: 10, fontWeight: 700,
          textTransform: "uppercase", letterSpacing: "0.08em",
          color: "var(--accent)", margin: 0,
        }}>
          {title}
        </p>
        {action}
      </div>
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

function SpecChips({ specs }) {
  if (!specs?.length) {
    return <span style={{ fontSize: 12, color: "var(--text2)" }}>—</span>;
  }
  return (
    <div style={{
      display: "flex", flexWrap: "wrap", gap: 4,
      justifyContent: "flex-end",
    }}>
      {specs.map((s) => (
        <span key={s} style={{
          fontSize: 9, fontWeight: 700, padding: "2px 8px",
          borderRadius: 10, background: "var(--accent-lt)",
          color: "var(--accent)",
          textTransform: "uppercase", letterSpacing: "0.04em",
        }}>
          {s}
        </span>
      ))}
    </div>
  );
}

function ManagerBlock({ manager, fallbackName }) {
  const name = manager?.full_name ?? fallbackName;
  if (!name) {
    return (
      <p style={{
        fontSize: 12, color: "var(--text3)",
        fontStyle: "italic", padding: "6px 0",
      }}>
        Unassigned
      </p>
    );
  }
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "4px 0" }}>
      <Avatar name={name} size={36} />
      <div style={{ minWidth: 0 }}>
        <p style={{
          fontSize: 14, fontWeight: 600, color: "var(--text)",
          wordBreak: "break-word",
        }}>
          {name}
        </p>
        {manager?.display_role && (
          <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>
            {manager.display_role}
          </p>
        )}
      </div>
    </div>
  );
}

// ── PublisherNameAutocomplete ────────────────────────────────────────────────
function PublisherNameAutocomplete({ value, onChange, excludeId, placeholder }) {
  const [results, setResults]   = useState([]);
  const [open, setOpen]         = useState(false);
  const [loading, setLoading]   = useState(false);
  const [searched, setSearched] = useState(false);
  const wrapRef = useRef(null);

  const query = (value ?? "").trim();

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setSearched(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await publishersApi.list({ search: query, status: "active" });
        const raw = Array.isArray(res.data) ? res.data : (res.data?.results ?? []);
        setResults(raw.filter((r) => r.id !== excludeId));
        setSearched(true);
      } catch {
        setResults([]);
        setSearched(true);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query, excludeId]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const showDropdown =
    open && query.length >= 2 && (loading || results.length > 0 || searched);

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <input
        type="text"
        className="form-input"
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        style={{ width: "100%" }}
      />

      {showDropdown && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 2px)",
          left: 0, right: 0,
          background: "var(--white)",
          border: "1px solid var(--border)",
          borderRadius: 4,
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          maxHeight: 200,
          overflowY: "auto",
          zIndex: 100,
        }}>
          {loading && (
            <div style={{
              padding: "10px 12px", fontSize: 10, color: "var(--text3)",
              fontStyle: "italic",
            }}>
              Searching…
            </div>
          )}

          {!loading && results.map((r) => (
            <div
              key={r.id}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(r.full_name);
                setOpen(false);
              }}
              style={{
                padding: "10px 12px",
                cursor: "pointer",
                borderBottom: "1px solid var(--border)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>
                {r.display_id && (
                  <span style={{
                    fontSize:      10,
                    fontWeight:    700,
                    color:         "var(--text3)",
                    background:    "var(--surface)",
                    border:        "1px solid var(--border)",
                    borderRadius:  3,
                    padding:       "0px 4px",
                    marginRight:   6,
                    letterSpacing: "0.04em",
                  }}>
                    {r.display_id}
                  </span>
                )}
                {r.full_name}
              </div>
              <div style={{ fontSize: 10, color: "var(--text3)" }}>
                {r.display_location && (
                  <span>{r.display_location}</span>
                )}
                {r.display_location && r.area_of_specialization?.length > 0 && (
                  <span> · </span>
                )}
                {r.area_of_specialization?.slice(0, 3).join(" · ")}
              </div>
            </div>
          ))}

          {!loading && searched && results.length === 0 && (
            <div style={{
              padding: "10px 12px",
              fontSize: 10,
              color: "var(--text3)",
              fontStyle: "italic",
            }}>
              No existing matches — type to use this name
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── PublisherReviewModal ──────────────────────────────────────────────────────
function PublisherReviewModal({ pub, onClose, onSaved }) {
  const toast = useToast();

  const [form, setForm] = useState({
    full_name:              pub.full_name              || "",
    company_name:           pub.company_name           || "",
    status:                 pub.status                 || "pending_approval",
    email:                  pub.email                  || "",
    mobile:                 pub.mobile                 || "",
    landline:               pub.landline               || "",
    area_of_specialization: pub.area_of_specialization ?? [],
    past_campaigns:         pub.past_campaigns         || "",
    sales_manager:          pub.sales_manager          || "",
    address:                pub.address                || "",
    region:                 pub.region                 || "",
    country:                pub.country                || "",
    city:                   pub.city                   || "",
    tax_id:                 pub.tax_id                 || "",
    website:                pub.website                || "",
    bank_account_number:    pub.bank_account_number    || "",
    account_name:           pub.account_name           || "",
    bank_name:              pub.bank_name              || "",
    branch:                 pub.branch                 || "",
    ifsc_code:              pub.ifsc_code              || "",
    swift_code:             pub.swift_code             || "",
    upi_id:                 pub.upi_id                 || "",
  });
  const [rejectionNote,  setRejectionNote]  = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectError,    setRejectError]    = useState("");
  const [isSaving,       setIsSaving]       = useState(false);

  const updateMutation  = useUpdatePublisher();
  const approveMutation = useApprovePublisher();
  const rejectMutation  = useRejectPublisher();
  const { data: choices } = usePublisherChoices();
  const { data: salesStaff = [] } = useSalesStaff();

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const toggleSpec = (value) => {
    const current = form.area_of_specialization;
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    set("area_of_specialization", next);
  };

  const specializations = choices?.specializations ?? [];
  const regions         = choices?.regions         ?? [];
  const statuses        = choices?.statuses        ?? [];

  const handleApprove = async () => {
    setIsSaving(true);
    try {
      await updateMutation.mutateAsync({ id: pub.id, data: { ...form } });
      await approveMutation.mutateAsync(pub.id);
      toast.success("Publisher reviewed and approved!");
      onSaved();
      onClose();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionNote.trim()) {
      setRejectError("Rejection reason is required");
      return;
    }
    setRejectError("");
    setIsSaving(true);
    try {
      await updateMutation.mutateAsync({ id: pub.id, data: { ...form } });
      await rejectMutation.mutateAsync({ id: pub.id, rejection_note: rejectionNote });
      toast.success("Publisher rejected.");
      onSaved();
      onClose();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const footer = (
    <div className="modal-footer">
      {!showRejectForm ? (
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </button>
          <button
            className="btn btn-sm"
            style={{
              background: "#FCE8E8", color: "#8A1A1A",
              border: "1px solid #F0A8A8",
            }}
            onClick={() => setShowRejectForm(true)}
            disabled={isSaving}
          >
            ✗ Reject
          </button>
          <button
            className="btn btn-primary"
            onClick={handleApprove}
            disabled={isSaving}
          >
            {isSaving ? "Saving…" : "✓ Approve"}
          </button>
        </>
      ) : (
        <>
          <button
            className="btn btn-secondary"
            onClick={() => {
              setShowRejectForm(false);
              setRejectionNote("");
              setRejectError("");
            }}
            disabled={isSaving}
          >
            Cancel Rejection
          </button>
          <button
            className="btn btn-sm"
            style={{
              background: "#FCE8E8", color: "#8A1A1A",
              border: "1px solid #F0A8A8",
            }}
            onClick={handleReject}
            disabled={isSaving}
          >
            {isSaving ? "Saving…" : "Confirm Reject"}
          </button>
        </>
      )}
    </div>
  );

  return (
    <Modal
      open
      onClose={isSaving ? () => {} : onClose}
      title="Review Publisher"
      subtitle={`Submitted by ${pub.created_by_name || "—"} · correct details before approving`}
      size="wide"
      footer={footer}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Section 1: Basic Info */}
        <ReviewSection title="Basic Information">
          <ReviewGrid cols={3}>
            <ReviewField label="Full Name *">
              <PublisherNameAutocomplete
                value={form.full_name}
                onChange={(v) => set("full_name", v)}
                excludeId={pub.id}
                placeholder="Publisher contact name"
              />
            </ReviewField>

            <ReviewField label="Company Name">
              <input
                className="form-input"
                value={form.company_name}
                onChange={(e) => set("company_name", e.target.value)}
                placeholder="Agency or company (if any)"
              />
            </ReviewField>

            <ReviewField label="Status">
              <select
                className="form-select"
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
              >
                {statuses.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </ReviewField>
          </ReviewGrid>
        </ReviewSection>

        {/* Section 2: Contact */}
        <ReviewSection title="Contact">
          <ReviewGrid cols={3}>
            <ReviewField label="Email ID">
              <input
                className="form-input"
                type="email"
                value={form.email}
                disabled
                style={{ opacity: 0.6, cursor: "not-allowed" }}
              />
              <p style={{ fontSize: 10, color: "var(--text3)", marginTop: 2 }}>
                Email cannot be changed after creation.
              </p>
            </ReviewField>

            <ReviewField label="Mobile *">
              <input
                className="form-input"
                value={form.mobile}
                onChange={(e) => set("mobile", e.target.value)}
                placeholder="+XX 00000 00000"
              />
            </ReviewField>

            <ReviewField label="Landline">
              <input
                className="form-input"
                value={form.landline}
                onChange={(e) => set("landline", e.target.value)}
                placeholder="+XX 00000 00000"
              />
            </ReviewField>
          </ReviewGrid>
        </ReviewSection>

        {/* Section 3: Specialization */}
        <ReviewSection title="Area of Specialization">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {specializations.map((spec) => {
              const selected = form.area_of_specialization.includes(spec.value);
              return (
                <button
                  key={spec.value}
                  type="button"
                  onClick={() => toggleSpec(spec.value)}
                  style={{
                    padding: "5px 12px",
                    borderRadius: 20,
                    border: `1.5px solid ${selected ? "var(--accent)" : "var(--border2)"}`,
                    background: selected ? "var(--accent-lt)" : "var(--surface)",
                    color: selected ? "var(--accent)" : "var(--text3)",
                    fontSize: 11,
                    fontWeight: selected ? 700 : 500,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    transition: "all 0.12s",
                    userSelect: "none",
                  }}
                >
                  {selected && "✓ "}{spec.label}
                </button>
              );
            })}
          </div>
          {form.area_of_specialization.length > 0 && (
            <p style={{ fontSize: 10, color: "var(--text3)", marginTop: 6 }}>
              {form.area_of_specialization.length} selected
            </p>
          )}
        </ReviewSection>

        {/* Section 4: Account Manager */}
        <ReviewSection title="Account Manager">
          <ReviewGrid cols={2}>
            <ReviewField label="Account / Sales Manager *">
              <select
                className="form-select"
                value={form.sales_manager}
                onChange={(e) => set("sales_manager", e.target.value)}
              >
                <option value="">— Select manager —</option>
                {salesStaff.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name} ({u.display_role ?? u.role})
                  </option>
                ))}
              </select>
            </ReviewField>

            <ReviewField label="Past Campaigns Reference">
              <textarea
                className="form-input"
                rows={2}
                value={form.past_campaigns}
                onChange={(e) => set("past_campaigns", e.target.value)}
                placeholder="Previous campaign names or portfolio URL"
                style={{ resize: "vertical" }}
              />
            </ReviewField>
          </ReviewGrid>
        </ReviewSection>

        {/* Section 5: Location */}
        <ReviewSection title="Location">
          <ReviewGrid cols={3}>
            <ReviewField label="Region *">
              <select
                className="form-select"
                value={form.region}
                onChange={(e) => set("region", e.target.value)}
              >
                <option value="">— Select region —</option>
                {regions.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </ReviewField>

            <ReviewField label="Country *">
              <select
                className="form-select"
                value={form.country}
                onChange={(e) => set("country", e.target.value)}
              >
                <option value="">— Select country —</option>
                {COMMON_COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
            </ReviewField>

            <ReviewField label="City">
              <input
                className="form-input"
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
                placeholder="e.g. Delhi"
              />
            </ReviewField>

            <ReviewField label="Address" fullWidth>
              <textarea
                className="form-input"
                rows={2}
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                placeholder="Full address"
                style={{ resize: "vertical" }}
              />
            </ReviewField>
          </ReviewGrid>
        </ReviewSection>

        {/* Section 6: Business Details */}
        <ReviewSection title="Business Details">
          <ReviewGrid cols={2}>
            <ReviewField label="Tax ID (GST / VAT / PAN) *">
              <input
                className="form-input"
                value={form.tax_id}
                onChange={(e) => set("tax_id", e.target.value)}
                placeholder="e.g. ABCDE1234F"
              />
            </ReviewField>

            <ReviewField label="Website">
              <input
                className="form-input"
                value={form.website}
                onChange={(e) => set("website", e.target.value)}
                placeholder="https://publisher-site.com"
              />
            </ReviewField>
          </ReviewGrid>
        </ReviewSection>

        {/* Section 7: Bank Details */}
        <ReviewSection title="Bank Details">
          <ReviewGrid cols={3}>
            <ReviewField label="Bank Account Number">
              <input
                className="form-input"
                value={form.bank_account_number}
                onChange={(e) => set("bank_account_number", e.target.value)}
                placeholder="Account number"
              />
            </ReviewField>

            <ReviewField label="Account Holder Name">
              <input
                className="form-input"
                value={form.account_name}
                onChange={(e) => set("account_name", e.target.value)}
                placeholder="Name on bank account"
              />
            </ReviewField>

            <ReviewField label="Bank Name">
              <input
                className="form-input"
                value={form.bank_name}
                onChange={(e) => set("bank_name", e.target.value)}
                placeholder="e.g. HDFC Bank"
              />
            </ReviewField>

            <ReviewField label="Branch">
              <input
                className="form-input"
                value={form.branch}
                onChange={(e) => set("branch", e.target.value)}
                placeholder="Branch name"
              />
            </ReviewField>

            <ReviewField label="IFSC Code">
              <input
                className="form-input"
                value={form.ifsc_code}
                onChange={(e) => set("ifsc_code", e.target.value.toUpperCase())}
                placeholder="e.g. HDFC0001234"
              />
            </ReviewField>

            <ReviewField label="SWIFT / BIC Code">
              <input
                className="form-input"
                value={form.swift_code}
                onChange={(e) => set("swift_code", e.target.value.toUpperCase())}
                placeholder="For international transfers"
              />
            </ReviewField>

            <ReviewField label="UPI ID">
              <input
                className="form-input"
                value={form.upi_id}
                onChange={(e) => set("upi_id", e.target.value)}
                placeholder="e.g. name@upi"
              />
            </ReviewField>
          </ReviewGrid>
        </ReviewSection>

        {/* Rejection note — only when rejecting */}
        {showRejectForm && (
          <ReviewSection title="Rejection Reason">
            <ReviewField label="Reason for Rejection *">
              <textarea
                className="form-input"
                rows={3}
                value={rejectionNote}
                onChange={(e) => {
                  setRejectionNote(e.target.value);
                  if (rejectError) setRejectError("");
                }}
                placeholder="Explain why this publisher is being rejected…"
                style={{ resize: "vertical" }}
              />
              {rejectError && (
                <p className="form-error">{rejectError}</p>
              )}
            </ReviewField>
          </ReviewSection>
        )}
      </div>
    </Modal>
  );
}

// ── Review modal helpers ──────────────────────────────────────────────────────
function ReviewSection({ title, children }) {
  return (
    <div>
      <p style={{
        fontSize: 11, fontWeight: 700, textTransform: "uppercase",
        letterSpacing: "0.08em", color: "var(--accent)", marginBottom: 10,
      }}>
        {title}
      </p>
      {children}
    </div>
  );
}

function ReviewGrid({ cols = 2, children }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gap: 12,
    }}>
      {children}
    </div>
  );
}

function ReviewField({ label, children, fullWidth }) {
  return (
    <div className="form-group" style={fullWidth ? { gridColumn: "1 / -1" } : undefined}>
      <label className="form-label">{label}</label>
      {children}
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
          Delete Publisher?
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
