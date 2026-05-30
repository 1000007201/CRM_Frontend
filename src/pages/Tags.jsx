/**
 * pages/Tags.jsx
 *
 * Tag management page.
 *
 * Features:
 *   - Search filter
 *   - Table (desktop) / Cards (mobile) showing name + lead count + actions
 *   - Rename via modal
 *   - Merge into another tag via modal (only when ≥2 tags exist)
 *   - Delete (only enabled when lead_count === 0)
 */
import { useState } from "react";
import { useTags, useRenameTag, useMergeTag, useDeleteTag } from "@/hooks/useTags";
import { useIsMobile } from "@/hooks/useIsMobile";
import Modal from "@/components/common/Modal";
import Spinner from "@/components/common/Spinner";
import EmptyState from "@/components/common/EmptyState";
import { useToast } from "@/components/common/Toast";

const toArray = (d) => (Array.isArray(d) ? d : (d?.results ?? []));

// ── Action button ─────────────────────────────────────────────────────────────
function ActionBtn({ label, color, onClick, disabled }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      disabled={disabled}
      style={{
        padding: "3px 8px", borderRadius: 3,
        border: `1px solid ${hov && !disabled ? color + "60" : "var(--border)"}`,
        background: hov && !disabled ? color + "10" : "none",
        fontSize: 10, fontWeight: 600,
        color: disabled ? "var(--text3)" : (hov ? color : "var(--text3)"),
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "all 0.12s",
        whiteSpace: "nowrap", fontFamily: "inherit",
      }}
    >
      {label}
    </button>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function TagsPage() {
  const isMobile = useIsMobile();
  const toast    = useToast();

  const [search,        setSearch]        = useState("");
  const [renameTag,     setRenameTag]     = useState(null);
  const [mergeTag,      setMergeTag]      = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const apiParams = search ? { search } : {};
  const { data: rawData, isLoading } = useTags(apiParams);
  const tags = toArray(rawData);

  const deleteMutation = useDeleteTag();

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteMutation.mutateAsync(confirmDelete.id);
      toast.success(`CRM tag "${confirmDelete.name}" deleted.`);
      setConfirmDelete(null);
    } catch (err) {
      const detail = err.response?.data?.detail ?? err.response?.data?.error;
      toast.error(detail ?? "Could not delete CRM tag.");
    }
  };

  const hasFilters = !!search;
  const canMerge   = tags.length >= 2;

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
          <h1 className="page-title" style={isMobile ? { fontSize: 18 } : undefined}>CRM Tags</h1>
          <p className="page-subtitle">
            {isLoading
              ? "Loading…"
              : `${tags.length} CRM tag${tags.length !== 1 ? "s" : ""}`
            }
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        {isMobile ? (
          <input
            type="text"
            placeholder="Search CRM tags…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1, padding: "10px 12px",
              border: "1px solid var(--border)", borderRadius: 3,
              fontSize: 14, minHeight: 40, fontFamily: "inherit", outline: "none",
            }}
          />
        ) : (
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
              placeholder="Search CRM tags…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        )}

        {hasFilters && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setSearch("")}
            style={{ color: "var(--red)" }}
          >
            ✕ Clear
          </button>
        )}
      </div>

      {/* Table / Cards */}
      {isLoading ? (
        <Spinner center />
      ) : tags.length === 0 ? (
        <EmptyState
          icon="🏷"
          title={hasFilters ? "No CRM tags match your search" : "No CRM tags yet"}
          subtitle={
            hasFilters
              ? "Try clearing the search"
              : "CRM tags are auto-created when leads are added with an Event/Conference or Network source."
          }
        />
      ) : isMobile ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {tags.map((t) => (
            <div
              key={t.id}
              style={{
                padding: "12px 14px",
                background: "var(--white)",
                border: "1px solid var(--border)",
                borderRadius: 4,
                boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
              }}
            >
              <div style={{
                fontSize: 14, fontWeight: 600, color: "var(--text)",
                marginBottom: 4, wordBreak: "break-word",
              }}>
                {t.name}
              </div>
              <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 10 }}>
                {t.lead_count ?? 0} lead{(t.lead_count ?? 0) !== 1 ? "s" : ""}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={() => setRenameTag(t)}
                  style={{
                    flex: 1, minHeight: 36,
                    background: "var(--white)", border: "1px solid var(--border)",
                    borderRadius: 3, fontSize: 12, fontWeight: 600,
                    color: "var(--accent)", cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  Rename
                </button>
                {canMerge && (
                  <button
                    onClick={() => setMergeTag(t)}
                    style={{
                      flex: 1, minHeight: 36,
                      background: "var(--white)", border: "1px solid var(--border)",
                      borderRadius: 3, fontSize: 12, fontWeight: 600,
                      color: "var(--text2)", cursor: "pointer", fontFamily: "inherit",
                    }}
                  >
                    Merge
                  </button>
                )}
                <button
                  onClick={() => setConfirmDelete(t)}
                  disabled={(t.lead_count ?? 0) > 0}
                  style={{
                    flex: 1, minHeight: 36,
                    background: "var(--white)", border: "1px solid var(--border)",
                    borderRadius: 3, fontSize: 12, fontWeight: 600,
                    color: (t.lead_count ?? 0) > 0 ? "var(--text3)" : "#C03030",
                    cursor: (t.lead_count ?? 0) > 0 ? "not-allowed" : "pointer",
                    opacity: (t.lead_count ?? 0) > 0 ? 0.5 : 1,
                    fontFamily: "inherit",
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>CRM Tag Name</th>
                <th>Leads</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tags.map((t) => {
                const used = (t.lead_count ?? 0) > 0;
                return (
                  <tr key={t.id}>
                    <td>
                      <p style={{ fontWeight: 600, fontSize: 12, color: "var(--text)" }}>
                        {t.name}
                      </p>
                    </td>
                    <td style={{ fontSize: 12, color: "var(--text2)" }}>
                      {t.lead_count ?? 0}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                        <ActionBtn
                          label="Rename"
                          color="var(--accent)"
                          onClick={() => setRenameTag(t)}
                        />
                        {canMerge && (
                          <ActionBtn
                            label="Merge"
                            color="#1A5A9A"
                            onClick={() => setMergeTag(t)}
                          />
                        )}
                        <ActionBtn
                          label="Delete"
                          color="#C03030"
                          onClick={() => setConfirmDelete(t)}
                          disabled={used}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Rename modal */}
      {renameTag && (
        <RenameTagModal
          tag={renameTag}
          onClose={() => setRenameTag(null)}
        />
      )}

      {/* Merge modal */}
      {mergeTag && (
        <MergeTagModal
          tag={mergeTag}
          allTags={tags}
          onClose={() => setMergeTag(null)}
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
              Delete CRM Tag?
            </p>
            <p style={{ fontSize: 12, color: "var(--text2)", marginBottom: 20 }}>
              Delete tag "{confirmDelete.name}"? This action cannot be undone.
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

// ── Rename modal ──────────────────────────────────────────────────────────────
function RenameTagModal({ tag, onClose }) {
  const toast = useToast();
  const [name, setName] = useState(tag.name);
  const [error, setError] = useState("");
  const renameMutation = useRenameTag();

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) { setError("Name is required."); return; }
    if (trimmed === tag.name) { onClose(); return; }
    try {
      await renameMutation.mutateAsync({ id: tag.id, name: trimmed });
      toast.success("CRM tag renamed!");
      onClose();
    } catch (err) {
      const detail = err.response?.data;
      if (typeof detail === "object" && detail?.name) {
        setError(Array.isArray(detail.name) ? detail.name[0] : String(detail.name));
      } else if (typeof detail === "object" && detail?.detail) {
        setError(detail.detail);
      } else {
        toast.error("Could not rename CRM tag.");
      }
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Rename CRM Tag"
      subtitle={`Editing: ${tag.name}`}
      footer={
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={renameMutation.isPending}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={renameMutation.isPending}>
            {renameMutation.isPending ? "Saving…" : "Save"}
          </button>
        </div>
      }
    >
      <div className="form-group">
        <label className="form-label">New name *</label>
        <input
          className="form-input"
          value={name}
          onChange={(e) => { setName(e.target.value); if (error) setError(""); }}
          placeholder="Enter new CRM tag name"
          autoFocus
        />
        {error && <p className="form-error">{error}</p>}
        <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 6 }}>
          All {tag.lead_count ?? 0} lead{(tag.lead_count ?? 0) !== 1 ? "s" : ""} using this CRM tag will be updated.
        </p>
      </div>
    </Modal>
  );
}

// ── Merge modal ───────────────────────────────────────────────────────────────
function MergeTagModal({ tag, allTags, onClose }) {
  const toast = useToast();
  const [targetId, setTargetId] = useState("");
  const [error, setError] = useState("");
  const mergeMutation = useMergeTag();

  const otherTags = allTags.filter((t) => t.id !== tag.id);

  const handleSubmit = async () => {
    if (!targetId) { setError("Please select a target tag."); return; }
    try {
      await mergeMutation.mutateAsync({ id: tag.id, targetId });
      toast.success("CRM tag merged successfully!");
      onClose();
    } catch (err) {
      const detail = err.response?.data?.detail ?? err.response?.data?.error;
      if (detail) setError(typeof detail === "string" ? detail : "Could not merge CRM tag.");
      else toast.error("Could not merge CRM tag.");
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Merge CRM Tag"
      subtitle={`Merging: ${tag.name}`}
      footer={
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={mergeMutation.isPending}>
            Cancel
          </button>
          <button
            className="btn"
            style={{ background: "#C03030", color: "#fff", border: "none" }}
            onClick={handleSubmit}
            disabled={mergeMutation.isPending}
          >
            {mergeMutation.isPending ? "Merging…" : "Merge"}
          </button>
        </div>
      }
    >
      <div className="form-group">
        <label className="form-label">Target tag *</label>
        <select
          className="form-select"
          value={targetId}
          onChange={(e) => { setTargetId(e.target.value); if (error) setError(""); }}
        >
          <option value="">Select target CRM tag</option>
          {otherTags.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.lead_count ?? 0} leads)
            </option>
          ))}
        </select>
        {error && <p className="form-error">{error}</p>}
      </div>

      <div style={{
        marginTop: 16,
        padding: "10px 14px",
        background: "#FDF4E0",
        border: "1px solid #F0D080",
        borderRadius: 3,
        fontSize: 12,
        color: "#7A4A00",
      }}>
        <strong>⚠ This cannot be undone.</strong>
        <p style={{ marginTop: 4 }}>
          This will move {tag.lead_count ?? 0} lead{(tag.lead_count ?? 0) !== 1 ? "s" : ""} to the selected tag.
          The CRM tag "{tag.name}" will be deleted.
        </p>
      </div>
    </Modal>
  );
}
