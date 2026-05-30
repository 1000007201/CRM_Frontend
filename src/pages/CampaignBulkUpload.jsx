/**
 * pages/CampaignBulkUpload.jsx
 *
 * Admin / Approver-only bulk campaign upload — two screens:
 *
 *  Screen 1: UPLOAD
 *    - File picker (.csv / .xlsx / .xls)
 *    - Template download
 *    - "Preview Import" button
 *
 *  Screen 2: PREVIEW
 *    - Summary bar: total, will create, will update, rejected
 *    - "Show only errors" toggle
 *    - Colour-coded table of all parsed rows
 *    - "← Upload Different File" / "Confirm Import (N)" buttons
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth }   from "@/hooks/useAuth";
import { useToast }  from "@/components/common/Toast";
import { campaignsApi } from "@/api/campaigns";
import Spinner from "@/components/common/Spinner";

const SCREEN = { UPLOAD: "upload", PREVIEW: "preview" };

const STEPS = ["Upload File", "Preview & Confirm"];
const stepIdx = { upload: 0, preview: 1 };

export default function CampaignBulkUpload() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast    = useToast();

  const isAdminOrApprover = user?.role === "admin" || user?.is_mis_approver === true;

  const [screen,         setScreen]         = useState(SCREEN.UPLOAD);
  const [file,           setFile]           = useState(null);
  const [preview,        setPreview]        = useState(null);
  const [uploading,      setUploading]      = useState(false);
  const [confirming,     setConfirming]     = useState(false);
  const [showOnlyErrors, setShowOnlyErrors] = useState(false);

  if (!isAdminOrApprover) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <p style={{ fontSize: 24, marginBottom: 12 }}>🔒</p>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Access Restricted</h2>
        <p style={{ fontSize: 13, color: "var(--text3)" }}>
          Bulk campaign upload is only available to admins and approvers.
        </p>
        <button className="btn btn-secondary" style={{ marginTop: 16 }}
          onClick={() => navigate("/campaigns")}>
          ← Back to Campaigns
        </button>
      </div>
    );
  }

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(null);
    setShowOnlyErrors(false);
  };

  const handleUpload = async () => {
    if (!file) { toast.error("Select a file first."); return; }
    setUploading(true);
    try {
      const res = await campaignsApi.bulkUploadPreview(file);
      setPreview(res.data);
      setScreen(SCREEN.PREVIEW);
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.detail || "Failed to parse file.");
    } finally {
      setUploading(false);
    }
  };

  const handleConfirm = async () => {
    if (!file) return;
    setConfirming(true);
    try {
      const res = await campaignsApi.bulkUploadConfirm(file);
      const created = res.data.created ?? res.data.created_count ?? 0;
      const updated = res.data.updated ?? res.data.updated_count ?? 0;
      const skipped = res.data.rejected ?? res.data.rejected_count ?? res.data.skipped ?? 0;
      toast.success(
        `Created: ${created}, Updated: ${updated}${skipped > 0 ? `, Skipped: ${skipped}` : ""}`
      );
      navigate("/campaigns");
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.detail || "Failed to import.");
    } finally {
      setConfirming(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const res  = await campaignsApi.downloadTemplate();
      const blob = new Blob([res.data]);
      const url  = window.URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = "campaigns_upload_template.xlsx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to download template.");
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setShowOnlyErrors(false);
    setScreen(SCREEN.UPLOAD);
  };

  const visibleRows = preview
    ? (showOnlyErrors ? preview.rows.filter((r) => !r.will_apply) : preview.rows)
    : [];

  const validCount = preview
    ? (preview.will_create_count ?? 0) + (preview.will_update_count ?? 0)
    : 0;

  const currentStep = stepIdx[screen];

  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Bulk Campaign Upload</h1>
          <p className="page-subtitle">
            Import campaigns from CSV or Excel. Create new or update existing.
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={handleDownloadTemplate}>
          ↓ Download Template
        </button>
      </div>

      {/* Step indicator */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: 24, gap: 0 }}>
        {STEPS.map((step, i) => (
          <div key={step} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : 0 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                background: i < currentStep ? "#18A858" : i === currentStep ? "var(--accent)" : "var(--border2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 700,
                color: i <= currentStep ? "#fff" : "var(--text3)",
                transition: "all 0.2s",
              }}>
                {i < currentStep ? "✓" : i + 1}
              </div>
              <span style={{
                fontSize: 10, fontWeight: i === currentStep ? 700 : 400,
                color: i === currentStep ? "var(--accent)" : "var(--text3)",
                whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: "0.05em",
              }}>
                {step}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{
                flex: 1, height: 2,
                background: i < currentStep ? "#18A858" : "var(--border)",
                margin: "0 8px", marginBottom: 20, transition: "background 0.3s",
              }} />
            )}
          </div>
        ))}
      </div>

      {/* ── SCREEN 1: UPLOAD ── */}
      {screen === SCREEN.UPLOAD && (
        <div style={{ maxWidth: 560 }}>
          {/* Info box */}
          <div style={{
            padding: "10px 14px", background: "#EBF4FF",
            border: "1px solid #93C5FD", borderRadius: 3,
            fontSize: 12, color: "#1E40AF", marginBottom: 16, lineHeight: 1.6,
          }}>
            <p style={{ fontWeight: 700, marginBottom: 4 }}>ℹ Column reference</p>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li><strong>name</strong> is required for every row.</li>
              <li><strong>category</strong> and <strong>campaign_type</strong> must match valid choices.</li>
              <li>Set <strong>internal_id</strong> to update an existing campaign; leave blank to create.</li>
              <li><strong>advertiser_id</strong> — internal ID of the linked advertiser.</li>
            </ul>
          </div>

          <div className="card" style={{ padding: "24px 24px", marginBottom: 16 }}>
            <p style={{
              fontSize: 11, fontWeight: 700, textTransform: "uppercase",
              letterSpacing: "0.08em", color: "var(--accent)", marginBottom: 14,
            }}>
              Select File
            </p>

            <div style={{
              border: "2px dashed var(--border)", borderRadius: 4,
              padding: "32px 24px", textAlign: "center",
            }}>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                id="campaign-bulk-file"
                style={{ display: "none" }}
              />
              <label htmlFor="campaign-bulk-file" style={{
                display: "inline-block", padding: "8px 18px",
                background: "var(--accent)", color: "#fff",
                borderRadius: 4, cursor: "pointer", fontWeight: 600, fontSize: 13,
              }}>
                Choose File (.csv / .xlsx)
              </label>
              {file && (
                <p style={{ marginTop: 12, fontSize: 13, color: "var(--text)" }}>
                  Selected: <strong>{file.name}</strong>
                </p>
              )}
              {!file && (
                <p style={{ marginTop: 8, fontSize: 11, color: "var(--text3)" }}>
                  or drag and drop a file here
                </p>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "space-between", alignItems: "center" }}>
            <button className="btn btn-secondary" onClick={() => navigate("/campaigns")}>
              ← Back
            </button>
            <button
              className="btn btn-primary"
              onClick={handleUpload}
              disabled={!file || uploading}
            >
              {uploading ? <><Spinner size={14} /> Parsing…</> : "Preview Import →"}
            </button>
          </div>
        </div>
      )}

      {/* ── SCREEN 2: PREVIEW ── */}
      {screen === SCREEN.PREVIEW && preview && (
        <div>
          {/* Summary bar */}
          <div className="card" style={{ padding: "16px 20px", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
              <div>
                <p style={{ fontSize: 9, fontWeight: 700, color: "var(--text3)",
                  textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>
                  File
                </p>
                <p style={{ fontSize: 13, fontWeight: 600 }}>
                  {preview.filename || file.name}
                </p>
              </div>
              <div style={{ width: 1, height: 32, background: "var(--border)" }} />
              <SummaryChip label="Total Rows"  value={preview.total_rows}           color="var(--text2)" />
              <SummaryChip label="Will Create" value={preview.will_create_count ?? 0} color="#0A5A28" />
              <SummaryChip label="Will Update" value={preview.will_update_count ?? 0} color="#1E40AF" />
              {(preview.rejected_count ?? 0) > 0 && (
                <SummaryChip label="Rejected" value={preview.rejected_count} color="#991B1B" />
              )}
            </div>
          </div>

          {/* Show errors toggle */}
          {(preview.rejected_count ?? 0) > 0 && (
            <label style={{
              display: "flex", alignItems: "center", gap: 6,
              fontSize: 12, marginBottom: 10, cursor: "pointer",
            }}>
              <input
                type="checkbox"
                checked={showOnlyErrors}
                onChange={(e) => setShowOnlyErrors(e.target.checked)}
              />
              Show only rows with errors ({preview.rejected_count})
            </label>
          )}

          {/* Rejection notice */}
          {(preview.rejected_count ?? 0) > 0 && (
            <div style={{
              marginBottom: 12, padding: "10px 12px",
              background: "#FFF8E1", border: "1px solid #E0B84A",
              borderRadius: 4, fontSize: 12, color: "#7A5800",
            }}>
              <strong>{preview.rejected_count} row(s) will be skipped</strong> due to validation
              errors. Fix the issues and re-upload, or proceed to import only the valid rows.
            </div>
          )}

          {/* Preview table */}
          <div className="card" style={{ padding: "16px 20px", marginBottom: 14, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
              <thead>
                <tr style={{ background: "var(--surface)" }}>
                  {["Row", "Status", "Internal ID", "Name", "Advertiser", "Category", "Type", "Issues"].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: "24px", textAlign: "center", fontSize: 12, color: "var(--text3)" }}>
                      {showOnlyErrors ? "No rows with errors." : "No rows to display."}
                    </td>
                  </tr>
                ) : visibleRows.map((row) => (
                  <tr key={row.row_number} style={{
                    background: row.will_apply ? "var(--white)" : "#FEF2F2",
                  }}>
                    <td style={tdStyle}>{row.row_number}</td>
                    <td style={tdStyle}>
                      {row.action === "create" && row.will_apply && (
                        <ActionBadge label="+ Create" bg="#E4F8EE" color="#0A5A28" />
                      )}
                      {row.action === "update" && row.will_apply && (
                        <ActionBadge label="↻ Update" bg="#DBEAFE" color="#1E40AF" />
                      )}
                      {!row.will_apply && (
                        <ActionBadge label="✗ Rejected" bg="#FEE2E2" color="#991B1B" />
                      )}
                    </td>
                    <td style={tdStyle}>{row.data?.internal_id || row.data?.id || "—"}</td>
                    <td style={tdStyle}>
                      {row.data?.name || row.computed?.existing_campaign_name || "—"}
                    </td>
                    <td style={tdStyle}>
                      {row.computed?.advertiser_name || row.data?.advertiser_id || "—"}
                    </td>
                    <td style={tdStyle}>{row.data?.category || "—"}</td>
                    <td style={tdStyle}>{row.data?.type || row.data?.campaign_type || "—"}</td>
                    <td style={tdStyle}>
                      {row.errors?.length > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          {row.errors.map((e, i) => (
                            <div key={i} style={{ fontSize: 11, color: "#991B1B" }}>✗ {e}</div>
                          ))}
                        </div>
                      )}
                      {row.warnings?.length > 0 && (
                        <div style={{
                          display: "flex", flexDirection: "column", gap: 2,
                          marginTop: row.errors?.length ? 4 : 0,
                        }}>
                          {row.warnings.map((w, i) => (
                            <div key={i} style={{ fontSize: 11, color: "#7A5800" }}>⚠ {w}</div>
                          ))}
                        </div>
                      )}
                      {(!row.errors?.length && !row.warnings?.length) && (
                        <span style={{ color: "var(--text3)" }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <button className="btn btn-secondary" onClick={handleReset}>
              ← Upload Different File
            </button>
            <button
              className="btn btn-primary"
              onClick={handleConfirm}
              disabled={confirming || validCount === 0}
            >
              {confirming
                ? <><Spinner size={14} /> Importing…</>
                : `Confirm Import (${validCount}) →`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SummaryChip({ label, value, color }) {
  return (
    <div>
      <p style={{ fontSize: 9, fontWeight: 700, color: "var(--text3)",
        textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>
        {label}
      </p>
      <p style={{ fontSize: 20, fontWeight: 700, color, lineHeight: 1, letterSpacing: "-0.02em" }}>
        {value}
      </p>
    </div>
  );
}

function ActionBadge({ label, bg, color }) {
  return (
    <span style={{
      padding: "2px 8px", background: bg, color,
      borderRadius: 10, fontSize: 10, fontWeight: 700,
      textTransform: "uppercase", whiteSpace: "nowrap",
    }}>
      {label}
    </span>
  );
}

const thStyle = {
  padding: "8px 10px",
  borderBottom: "1px solid var(--border)",
  fontSize: 11,
  fontWeight: 700,
  color: "var(--text2)",
  textAlign: "left",
  whiteSpace: "nowrap",
};

const tdStyle = {
  padding: "8px 10px",
  borderBottom: "1px solid var(--border)",
  fontSize: 12,
  verticalAlign: "top",
  textAlign: "left",
};
