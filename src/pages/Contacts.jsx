/**
 * pages/Contacts.jsx
 *
 * Contact list page.
 *
 * Features:
 *   - Search filter
 *   - Table: name, designation, email, phone, advertiser, owner (approver/admin)
 *   - Create / Edit via modal (ContactForm)
 *   - Delete (admin only)
 */
import { useState }    from "react";
import { useAuth }     from "@/hooks/useAuth";
import { useContacts, useDeleteContact, useSetContactStatus } from "@/hooks/useContacts";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useSortable } from "@/hooks/useSortable";
import SortableHeader  from "@/components/common/SortableHeader";
import IdBadge         from "@/components/common/IdBadge";
import Spinner          from "@/components/common/Spinner";
import EmptyState       from "@/components/common/EmptyState";
import { useToast }    from "@/components/common/Toast";
import ContactForm      from "@/components/contacts/ContactForm";

const toArray = (d) => Array.isArray(d) ? d : (d?.results ?? []);

// ── Action button ─────────────────────────────────────────────────────────────
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

// ── Contact status badge ──────────────────────────────────────────────────────
function ContactStatusBadge({ status }) {
  const cfg = {
    pending:  { bg: "#FFF8E1", color: "#7A5800", label: "Pending"  },
    approved: { bg: "#E4F8EE", color: "#0A5A28", label: "Approved" },
  }[status] || { bg: "#F0F0F0", color: "#666", label: status || "—" };

  return (
    <span style={{
      padding:       "2px 8px",
      borderRadius:  10,
      background:    cfg.bg,
      color:         cfg.color,
      fontSize:      10,
      fontWeight:    700,
      textTransform: "uppercase",
      whiteSpace:    "nowrap",
    }}>
      {cfg.label}
    </span>
  );
}

// ── Advertiser cell — name + pending badge ─────────────────────────────────────
function AdvertiserCell({ name, status }) {
  return (
    <span>
      {name || "—"}
      {status === "pending" && (
        <span style={{
          marginLeft:   6,
          padding:      "1px 6px",
          borderRadius: 8,
          background:   "#FFF8E1",
          color:        "#7A5800",
          fontSize:     9,
          fontWeight:   700,
        }}>
          PENDING
        </span>
      )}
    </span>
  );
}

// ── Contact status dropdown (approver/admin only) ─────────────────────────────
function ContactStatusDropdown({ contact }) {
  const toast = useToast();
  const setStatusMutation = useSetContactStatus(contact.id);
  const [pending, setPending] = useState(false);

  const handleChange = async (newStatus) => {
    if (newStatus === contact.status) return;
    setPending(true);
    try {
      await setStatusMutation.mutateAsync(newStatus);
      toast.success(`Marked as ${newStatus}`);
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to update status.");
    } finally {
      setPending(false);
    }
  };

  return (
    // <select
    //   value={contact.status || "pending"}
    //   onChange={(e) => handleChange(e.target.value)}
    //   disabled={pending}
    //   className="form-select"
    //   style={{ width: "85px", height: 30, fontSize: 12, padding: "0 8px" }}
    //   onClick={(e) => e.stopPropagation()}
    // >
    //   <option value="pending">Pending</option>
    //   <option value="approved">Approved</option>
    // </select>
  <select
    value={contact.status || "pending"}
    onChange={(e) => handleChange(e.target.value)}
    disabled={pending}
    onClick={(e) => e.stopPropagation()}
    style={{
      width: "85px",
      height: "26px",
      padding: "0 12px",
      borderRadius: "8px",
      border:
        contact.status === "approved"
          ? "1px solid #9fd5a8"
          : "1px solid #e5c97b",
      background:
        contact.status === "approved"
          ? "#eef9f0"
          : "#fff8e8",
      color:
        contact.status === "approved"
          ? "#2e7d32"
          : "#a66b00",
      fontSize: "11px",
      fontWeight: 500,
      cursor: pending ? "not-allowed" : "pointer",
      outline: "none",
      appearance: "none",
      WebkitAppearance: "none",
      MozAppearance: "none",
      transition: "all 0.2s ease",
      boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
      backgroundImage:
        "url(\"data:image/svg+xml;utf8,<svg fill='%238a6420' height='20' viewBox='0 0 20 20' width='20' xmlns='http://www.w3.org/2000/svg'><path d='M5 7l5 5 5-5z'/></svg>\")",
      backgroundRepeat: "no-repeat",
      backgroundPosition: "right 10px center",
      backgroundSize: "14px",
    }}
  >
    <option value="pending">Pending</option>
    <option value="approved">Approved</option>
  </select>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ContactsPage() {
  const { user }  = useAuth();
  const toast     = useToast();
  const isMobile  = useIsMobile();
  const isAdmin           = user?.role === "admin";
  const isApproverOrAdmin = user?.role === "admin" || user?.is_mis_approver;

  const [search,        setSearch]        = useState("");
  const [statusFilter,  setStatusFilter]  = useState("");
  const [selectedId,    setSelectedId]    = useState(null);
  const [showCreate,    setShowCreate]    = useState(false);
  const [editContact,   setEditContact]   = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const apiParams = {
    ...(search       && { search }),
    ...(statusFilter && { status: statusFilter }),
  };

  const { data: rawData, isLoading } = useContacts(apiParams);
  const contacts = toArray(rawData);
  const { sortedData, sortBy, sortDir, toggleSort } = useSortable(contacts, { column: "internal_id", dir: "desc" });

  const deleteMutation = useDeleteContact();

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteMutation.mutateAsync(confirmDelete.id);
      toast.success(`${confirmDelete.name} deleted.`);
      setConfirmDelete(null);
    } catch {
      toast.error("Could not delete contact.");
    }
  };

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
          <h1 className="page-title" style={isMobile ? { fontSize: 18 } : undefined}>Contacts</h1>
          <p className="page-subtitle">
            {isLoading
              ? "Loading…"
              : `${contacts.length} contact${contacts.length !== 1 ? "s" : ""}`
            }
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowCreate(true)}
          style={isMobile ? { minHeight: 44, fontSize: 14 } : undefined}
        >
          + New Contact
        </button>
      </div>

      {/* Filter bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
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
            style={{ border: "none", background: "none", outline: "none",
              fontSize: 12, width: 200, fontFamily: "inherit", height: "21px" }}
            placeholder="Search name, email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {isApproverOrAdmin && (
          <select
            className="form-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ flex: "0 0 160px", minWidth: 140 }}
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
          </select>
        )}

        {(search || statusFilter) && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => { setSearch(""); setStatusFilter(""); }}
            style={{ color: "var(--red)" }}
          >
            ✕ Clear
          </button>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <Spinner center />
      ) : contacts.length === 0 ? (
        <EmptyState
          icon="📇"
          title={search ? "No contacts match your search" : "No contacts yet"}
          subtitle={
            search
              ? "Try a different search term"
              : "Click '+ New Contact' to add your first contact"
          }
        />
      ) : isMobile ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {sortedData.map((c) => (
            <ContactMobileCard
              key={c.id}
              c={c}
              selected={selectedId === c.id}
              isAdmin={isAdmin}
              isApproverOrAdmin={isApproverOrAdmin}
              onSelect={() => { setSelectedId(c.id); setEditContact(c); }}
              onEdit={() => setEditContact(c)}
              onDelete={() => setConfirmDelete(c)}
            />
          ))}
        </div>
      ) : (
        <div className="table-wrap" style={{ overflowX: "auto" }}>
          <table style={{ minWidth: 1300 }}>
            <thead>
              <tr>
                <SortableHeader label="Contact ID" column="internal_id" sortBy={sortBy} sortDir={sortDir} onToggle={toggleSort} />
                <SortableHeader label="Name"       column="name"        sortBy={sortBy} sortDir={sortDir} onToggle={toggleSort} />
                <th>Email</th>
                <th>Phone</th>
                <th>WhatsApp</th>
                <th>LinkedIn</th>
                <th>Telegram</th>
                <th>Teams ID</th>
                <th>Advertiser</th>
                {isApproverOrAdmin && <th>Owner</th>}
                {isApproverOrAdmin && <SortableHeader label="Status" column="status" sortBy={sortBy} sortDir={sortDir} onToggle={toggleSort} />}
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  style={{
                    background: selectedId === c.id ? "var(--accent-lt)" : "var(--white)",
                    borderLeft: selectedId === c.id ? "3px solid var(--accent)" : "3px solid transparent",
                    cursor: "pointer",
                  }}
                >
                  <td><IdBadge id={c.internal_id} /></td>
                  <td>
                    <p style={{ fontWeight: 600, fontSize: 12, color: "var(--text)", whiteSpace: "nowrap" }}>
                      {c.name}
                    </p>
                    {c.auto_created && (
                      <p style={{ fontSize: 9, color: "var(--text3)", fontStyle: "italic" }}>
                        auto-created
                      </p>
                    )}
                  </td>
                  <td>
                    {c.email ? (
                      <a href={`mailto:${c.email}`} style={{ fontSize: 11, color: "var(--accent)", whiteSpace: "nowrap" }}>
                        {c.email}
                      </a>
                    ) : (
                      <span style={{ fontSize: 11, color: "var(--text3)" }}>—</span>
                    )}
                  </td>
                  <td style={{ fontSize: 11, color: "var(--text2)", whiteSpace: "nowrap" }}>
                    {c.phone || "—"}
                  </td>
                  <td style={{ fontSize: 11, color: "var(--text2)", whiteSpace: "nowrap" }}>
                    {c.whatsapp || "—"}
                  </td>
                  <td style={{ fontSize: 11, whiteSpace: "nowrap" }}>
                    {c.linkedin ? (
                      <a
                        href={c.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "var(--accent)" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        🔗 Link
                      </a>
                    ) : "—"}
                  </td>
                  <td style={{ fontSize: 11, color: "var(--text2)", whiteSpace: "nowrap" }}>
                    {c.telegram || "—"}
                  </td>
                  <td style={{ fontSize: 11, color: "var(--text2)", whiteSpace: "nowrap" }}>
                    {c.teams_id || "—"}
                  </td>
                  <td style={{ fontSize: 11, color: "var(--text2)", whiteSpace: "nowrap" }}>
                    <AdvertiserCell name={c.advertiser_name} status={c.advertiser_status} />
                  </td>
                  {isApproverOrAdmin && (
                    <td style={{ fontSize: 11, color: "var(--text2)", whiteSpace: "nowrap" }}>
                      {c.owner_name || "—"}
                    </td>
                  )}
                  {isApproverOrAdmin && (
                    <td onClick={(e) => e.stopPropagation()}>
                      <ContactStatusDropdown contact={c} />
                    </td>
                  )}
                  <td style={{ textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                      <ActionBtn
                        label="Edit"
                        color="var(--accent)"
                        onClick={() => setEditContact(c)}
                      />
                      {isAdmin && (
                        <ActionBtn
                          label="Delete"
                          color="#C03030"
                          onClick={() => setConfirmDelete(c)}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <ContactForm
          onClose={() => setShowCreate(false)}
          onSaved={() => setShowCreate(false)}
        />
      )}

      {/* Edit modal */}
      {editContact && (
        <ContactForm
          contact={editContact}
          onClose={() => setEditContact(null)}
          onSaved={() => setEditContact(null)}
        />
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 100,
          background: "rgba(0,0,0,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            background: "var(--white)", borderRadius: 6,
            padding: "24px 28px", maxWidth: 380, width: "90%",
            boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
          }}>
            <p style={{ fontWeight: 700, fontSize: 14, color: "var(--text)", marginBottom: 8 }}>
              Delete Contact?
            </p>
            <p style={{ fontSize: 12, color: "var(--text2)", marginBottom: 20 }}>
              Delete "{confirmDelete.name}"? This action cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn btn-secondary" onClick={() => setConfirmDelete(null)}>
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

// ── Mobile card ───────────────────────────────────────────────────────────────
function ContactMobileCard({
  c, selected, isAdmin, isApproverOrAdmin,
  onSelect, onEdit, onDelete,
}) {
  return (
    <div
      onClick={onSelect}
      style={{
        padding: "12px 14px",
        background: selected ? "var(--accent-lt)" : "var(--white)",
        border: "1px solid var(--border)",
        borderLeft: selected ? "3px solid var(--accent)" : "1px solid var(--border)",
        borderRadius: 4,
        cursor: "pointer",
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
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
          {isApproverOrAdmin && <ContactStatusBadge status={c.status} />}
          {c.auto_created && (
            <span style={{ fontSize: 9, color: "var(--text3)", fontStyle: "italic" }}>auto</span>
          )}
        </div>
      </div>
      <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 4 }}>
        <AdvertiserCell name={c.advertiser_name} status={c.advertiser_status} />
      </div>
      {isApproverOrAdmin && c.owner_name && (
        <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 4 }}>
          Owner: {c.owner_name}
        </div>
      )}
      <div style={{ fontSize: 11, color: "var(--text3)", display: "flex", gap: 10, flexWrap: "wrap" }}>
        {c.email    && <span style={{ wordBreak: "break-all" }}>📧 {c.email}</span>}
        {c.phone    && <span>📞 {c.phone}</span>}
        {c.whatsapp && <span>💬 {c.whatsapp}</span>}
        {c.telegram && <span>✈ {c.telegram}</span>}
        {c.teams_id && <span>🖥 {c.teams_id}</span>}
        {c.linkedin && (
          <a
            href={c.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--accent)", textDecoration: "none" }}
            onClick={(e) => e.stopPropagation()}
          >
            🔗 LinkedIn
          </a>
        )}
      </div>
      <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }} onClick={(e) => e.stopPropagation()}>
        {isApproverOrAdmin && <ContactStatusDropdown contact={c} />}
        <button
          onClick={onEdit}
          style={{
            flex: 1, minHeight: 36,
            background: "var(--white)", border: "1px solid var(--border)",
            borderRadius: 3, fontSize: 12, fontWeight: 600,
            color: "var(--accent)", cursor: "pointer", fontFamily: "inherit",
          }}
        >
          Edit
        </button>
        {isAdmin && (
          <button
            onClick={onDelete}
            style={{
              flex: 1, minHeight: 36,
              background: "var(--white)", border: "1px solid var(--border)",
              borderRadius: 3, fontSize: 12, fontWeight: 600,
              color: "#C03030", cursor: "pointer", fontFamily: "inherit",
            }}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
