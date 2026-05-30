/**
 * components/leads/LeadInfo.jsx
 *
 * Two-column info grid: contact details on the left, deal info on the right.
 * Plus the assigned-to section at the bottom.
 */
import Avatar   from "@/components/common/Avatar";
import { RoleBadge, PriorityBadge } from "@/components/common/Badge";
import { formatDateTime, SOURCE_LABELS } from "@/utils/formatters";

export default function LeadInfo({ lead }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

      {/* Contact info */}
      <Section title="Contact Information">
        <Grid>
          <InfoItem label="Full Name"  value={lead.contact_name} />
          <InfoItem label="Email"
            value={lead.contact_email
              ? <a href={`mailto:${lead.contact_email}`}
                  style={{ color: "var(--accent)" }}>{lead.contact_email}</a>
              : null}
          />
          <InfoItem label="Phone"
            value={lead.contact_phone
              ? <a href={`tel:${lead.contact_phone}`}
                  style={{ color: "var(--accent)" }}>{lead.contact_phone}</a>
              : null}
          />
          <InfoItem label="Company" value={lead.company} />
          <InfoItem label="Website"
            value={lead.website
              ? <a href={lead.website} target="_blank" rel="noopener noreferrer"
                  style={{ color: "var(--accent)" }}>
                  {lead.website.replace(/^https?:\/\//, "")}
                </a>
              : null}
          />
        </Grid>
      </Section>

      <Divider />

      {/* Deal info */}
      <Section title="Deal Information">
        <Grid>
          <InfoItem label="Source"    value={SOURCE_LABELS[lead.source] ?? lead.source} />
          <InfoItem label="Priority"  value={<PriorityBadge priority={lead.priority} />} />
        </Grid>

        {/* Tags */}
        {lead.tag_list?.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <p style={{
              fontSize: 10, fontWeight: 700, color: "var(--text3)",
              textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6,
            }}>CRM Tags</p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {lead.tag_list.map((tag) => (
                <span key={tag} style={{
                  fontSize: 11, fontWeight: 600,
                  padding: "2px 9px", borderRadius: "var(--radius)",
                  background: "var(--accent-lt)",
                  border: "1px solid #F0D080",
                  color: "var(--accent)",
                }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        {lead.description && (
          <div style={{ marginTop: 14 }}>
            <p style={{
              fontSize: 10, fontWeight: 700, color: "var(--text3)",
              textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6,
            }}>Description</p>
            <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.6 }}>
              {lead.description}
            </p>
          </div>
        )}
      </Section>

      <Divider />

      {/* Ownership */}
      <Section title="Ownership">
        {/* Created By + Assigned To — explicit 2-column grid */}
        <div style={{
          // display:             "grid",
          // gridTemplateColumns: "1fr 1fr",
          gap:                 12,
          marginBottom:        16,
        }}>
          <div>
            <p style={{
              fontSize: 10, fontWeight: 700, color: "var(--text3)",
              textTransform: "uppercase", letterSpacing: "0.06em",
            }}>Created By</p>
            {lead.created_by_detail
              ? <UserChip user={lead.created_by_detail} />
              : <p style={{ fontSize: 13, color: "var(--text3)" }}>—</p>}
          </div>

          <div>
            <p style={{
              fontSize: 10, fontWeight: 700, color: "var(--text3)",
              textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 6,
            }}>Assigned To</p>
            {lead.assigned_to_detail
              ? <UserChip user={lead.assigned_to_detail} />
              : (
                <div style={{
                  padding:      "10px 12px",
                  background:   "#FEE2E2",
                  color:        "#991B1B",
                  borderRadius: 4,
                  fontSize:     12,
                  fontWeight:   600,
                }}>
                  Unassigned
                </div>
              )
            }
          </div>
        </div>

        {/* Timestamps — explicit 2-column grid */}
        <div style={{
          display:             "grid",
          gridTemplateColumns: "1fr 1fr",
          gap:                 12,
          paddingTop:          12,
          borderTop:           "1px solid var(--border)",
        }}>
          <div>
            <p style={{
              fontSize: 10, fontWeight: 700, color: "var(--text3)",
              textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3,
            }}>Created</p>
            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>
              {formatDateTime(lead.created_at)}
            </div>
          </div>
          <div>
            <p style={{
              fontSize: 10, fontWeight: 700, color: "var(--text3)",
              textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3,
            }}>Last Updated</p>
            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>
              {formatDateTime(lead.updated_at)}
            </div>
          </div>
        </div>
      </Section>

    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <div style={{ padding: "18px 20px" }}>
      <p style={{
        fontSize: 10, fontWeight: 700, color: "var(--text3)",
        textTransform: "uppercase", letterSpacing: "0.09em",
        marginBottom: 14,
        paddingBottom: 8,
        borderBottom: "1px solid var(--border)",
      }}>
        {title}
      </p>
      {children}
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: "var(--border)" }} />;
}

function Grid({ children }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 12,
    }}>
      {children}
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div>
      <p style={{
        fontSize: 10, fontWeight: 700, color: "var(--text3)",
        textTransform: "uppercase", letterSpacing: "0.06em",
        marginBottom: 3,
      }}>
        {label}
      </p>
      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>
        {value ?? <span style={{ color: "var(--text3)" }}>—</span>}
      </div>
    </div>
  );
}

function UserChip({ user }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: "var(--radius)", padding: "8px 12px",
    }}>
      <Avatar name={user.full_name} size={28} />
      <div>
        <p style={{ fontSize: 12, fontWeight: 700 }}>{user.full_name}</p>
        <p style={{ fontSize: 10, color: "var(--text3)" }}>{user.email}</p>
      </div>
      <div style={{ marginLeft: "auto" }}>
        <RoleBadge role={user.role} />
      </div>
    </div>
  );
}