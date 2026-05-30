/**
 * pages/BulkUpload.jsx
 *
 * Admin-only bulk lead upload — 3 screens:
 *
 *  Screen 1: UPLOAD
 *    - File dropzone (.csv / .xlsx / .xls)
 *    - Column format hint
 *    - Template download link
 *    - "Preview Import" button
 *
 *  Screen 2: PREVIEW
 *    - Summary bar: X valid, Y raw leads, Z skipped
 *    - Colour-coded table of all parsed rows
 *    - "Back" to re-upload
 *    - "Confirm Import" to create leads
 *
 *  Screen 3: SUMMARY
 *    - ✓ X leads imported
 *    - ⚠ Y raw leads (unmatched emails)
 *    - ✗ Z rows skipped
 *    - "View Leads" → /leads
 *    - "Upload Another" → resets to Screen 1
 *    - Past imports history table
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import FileDropzone from "@/components/bulk/FileDropzone";
import PreviewTable from "@/components/bulk/PreviewTable";
import Spinner      from "@/components/common/Spinner";
import { useToast } from "@/components/common/Toast";
import { useBulkPreview, useBulkConfirm, useBulkHistory } from "@/hooks/useLeads";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useAuth }    from "@/hooks/useAuth";
import { leadsApi }   from "@/api/leads";
import { formatDateTime } from "@/utils/formatters";

// ── Screen constants ───────────────────────────────────────────────────────────
const SCREEN = { UPLOAD: "upload", PREVIEW: "preview", SUMMARY: "summary" };

// ── Template download (auth API → fallback to CSV) ────────────────────────────
const CSV_FALLBACK =
  "company,contact_name,contact_email,phone,website,source,tag,stage,priority,assignee_email,notes\n";

async function downloadTemplate() {
  try {
    const response = await leadsApi.bulkTemplate();
    const blob = new Blob([response.data]);
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = "leads-template.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    // Fallback: plain CSV header
    const blob = new Blob([CSV_FALLBACK], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = "leads-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
}

export default function BulkUploadPage() {
  const navigate    = useNavigate();
  const toast       = useToast();
  const isMobile    = useIsMobile();
  const { user }    = useAuth();
  const isAdminUser = user?.role === "admin";
  const isManager   = user?.role === "manager";
  const isMember    = !isAdminUser && !isManager;

  const downloadSampleCSV = () => {
    const headers = ["company", "contact_name", "email", "phone", "website", "source", "stage", "priority", "tag", "assigned_to", "notes"];
    const sampleRows = isMember
      ? [
          ["Acme Corp", "John Doe", "john@acme.com", "+91 9876543210", "acme.com", "linkedin", "new", "medium", "", "", "Interested in CRM"],
          ["Beta Inc",  "Jane Roe", "jane@beta.com", "+91 9876543211", "beta.com", "referral", "contact_attempted", "high", "", "", ""],
        ]
      : isManager
      ? [
          ["Acme Corp", "John Doe", "john@acme.com", "", "", "linkedin", "new", "high", "", "teammate@example.com", ""],
          ["Beta Inc",  "Jane Roe", "jane@beta.com", "", "", "referral", "new", "medium", "", "", ""],
        ]
      : [
          ["Acme Corp", "John Doe", "john@acme.com", "", "", "linkedin", "raw", "high", "", "", ""],
          ["Beta Inc",  "Jane Roe", "jane@beta.com", "", "", "referral", "new", "medium", "", "anysales@example.com", ""],
        ];
    const csv = [headers, ...sampleRows]
      .map(row => row.map(cell => `"${(cell || "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = "leads-sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Screen state ───────────────────────────────────────────────────────────
  const [screen,      setScreen]      = useState(SCREEN.UPLOAD);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewData,  setPreviewData]  = useState(null);  // response from /preview/
  const [summaryData,  setSummaryData]  = useState(null);  // response from /confirm/

  // ── Mutations ──────────────────────────────────────────────────────────────
  const previewMutation = useBulkPreview();
  const confirmMutation = useBulkConfirm();

  // ── Past history ───────────────────────────────────────────────────────────
  const { data: history = [], isLoading: historyLoading } = useBulkHistory();

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handlePreview = async () => {
    if (!selectedFile) return;
    try {
      const data = await previewMutation.mutateAsync(selectedFile);
      setPreviewData(data);
      setScreen(SCREEN.PREVIEW);
    } catch (err) {
      const msg =
        err.response?.data?.error ??
        err.response?.data?.detail ??
        "Could not parse file. Please check the format and try again.";
      toast.error(msg);
    }
  };

  const handleConfirm = async () => {
    if (!previewData?.import_id) return;
    try {
      const data = await confirmMutation.mutateAsync(previewData.import_id);
      const skipped = data.skipped_count ?? 0;
      const msg = skipped > 0
        ? `Imported ${data.imported_count} leads. Skipped ${skipped} invalid rows.`
        : `Imported ${data.imported_count} leads successfully!`;
      toast.success(msg);
      setSummaryData(data);
      setScreen(SCREEN.SUMMARY);
    } catch (err) {
      toast.error(
        err.response?.data?.error ??
        err.response?.data?.detail ??
        "Could not confirm import."
      );
    }
  };

  const handleReset = () => {
    setScreen(SCREEN.UPLOAD);
    setSelectedFile(null);
    setPreviewData(null);
    setSummaryData(null);
    previewMutation.reset();
    confirmMutation.reset();
  };

  // ── Step indicator ─────────────────────────────────────────────────────────
  const STEPS = ["Upload File", "Preview", "Done"];
  const stepIdx = { upload: 0, preview: 1, summary: 2 }[screen];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Bulk Lead Upload</h1>
          <p className="page-subtitle">
            Import leads from a CSV or Excel file
          </p>
        </div>
        <button
          className="btn btn-secondary btn-sm"
          onClick={downloadTemplate}
        >
          ↓ Download Template
        </button>
      </div>

      {/* Step indicator */}
      <div style={{
        display:      "flex",
        alignItems:   "center",
        marginBottom: 24,
        gap:          0,
      }}>
        {STEPS.map((step, i) => (
          <div key={step} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : 0 }}>
            {/* Step dot + label */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{
                width:        28,
                height:       28,
                borderRadius: "50%",
                background:   i < stepIdx  ? "#18A858"
                            : i === stepIdx ? "var(--accent)"
                            : "var(--border2)",
                display:      "flex",
                alignItems:   "center",
                justifyContent: "center",
                fontSize:     12,
                fontWeight:   700,
                color:        i <= stepIdx ? "#fff" : "var(--text3)",
                transition:   "all 0.2s",
              }}>
                {i < stepIdx ? "✓" : i + 1}
              </div>
              <span style={{
                fontSize:   10,
                fontWeight: i === stepIdx ? 700 : 400,
                color:      i === stepIdx ? "var(--accent)" : "var(--text3)",
                whiteSpace: "nowrap",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}>
                {step}
              </span>
            </div>
            {/* Connector */}
            {i < STEPS.length - 1 && (
              <div style={{
                flex:       1,
                height:     2,
                background: i < stepIdx ? "#18A858" : "var(--border)",
                margin:     "0 8px",
                marginBottom: 20,
                transition: "background 0.3s",
              }} />
            )}
          </div>
        ))}
      </div>

      {/* ── SCREEN 1: UPLOAD ── */}
      {screen === SCREEN.UPLOAD && (
        <div style={{ maxWidth: isMobile ? "100%" : 600 }}>

          {/* Role-aware upload rules */}
          <div style={{
            padding:      12,
            background:   "#FFF8E1",
            border:       "1px solid #E0B84A",
            borderRadius: 4,
            marginBottom: 14,
            fontSize:     12,
            color:        "#7A5800",
          }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Upload Rules for You</div>
            {isAdminUser && (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                <li>Default stage: <strong>Raw</strong> (or set per row)</li>
                <li>Assignee: leave blank for unassigned, or enter any team member's email</li>
                <li>All stages allowed</li>
              </ul>
            )}
            {isManager && (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                <li>Default stage: <strong>New</strong> (or set per row)</li>
                <li>Assignee: leave blank for self, or enter your team member's email</li>
                <li>Stage <strong>Raw</strong> not allowed</li>
              </ul>
            )}
            {isMember && (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                <li>Default stage: <strong>New</strong> (or set per row)</li>
                <li>All leads will be assigned to <strong>you</strong> automatically</li>
                <li>Stage <strong>Raw</strong> not allowed</li>
              </ul>
            )}
          </div>

          {/* Generic field reference */}
          <div style={{
            padding:      "10px 12px",
            background:   "#EBF4FF",
            border:       "1px solid #93C5FD",
            borderRadius: 3,
            fontSize:     12,
            color:        "#1E40AF",
            marginBottom: 16,
            lineHeight:   1.6,
          }}>
            <p style={{ fontWeight: 700, marginBottom: 4 }}>ℹ Column reference</p>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li>Either <strong>company</strong> or <strong>contact_name</strong> is required per row.</li>
              <li><strong>source</strong> is required — valid: <code>linkedin</code>, <code>referral</code>, <code>event_conference</code>, <code>network</code>.</li>
              <li><strong>tag</strong> is required when source is <code>event_conference</code> or <code>network</code>.</li>
              <li><strong>assignee_email</strong> must match an active user's email address.</li>
            </ul>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={downloadTemplate}
            >
              ⬇ Download Template (.xlsx)
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={downloadSampleCSV}
            >
              ⬇ Download Sample CSV
            </button>
          </div>

          <div className="card" style={{ padding: "20px 24px", marginBottom: 16 }}>
            <h2 className="card-title" style={{ marginBottom: 16 }}>
              Select File
            </h2>
            <FileDropzone
              onFile={setSelectedFile}
              disabled={previewMutation.isPending}
            />
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button
              className="btn btn-primary"
              onClick={handlePreview}
              disabled={!selectedFile || previewMutation.isPending}
            >
              {previewMutation.isPending ? (
                <><Spinner size={14} /> Parsing file…</>
              ) : (
                "Preview Import →"
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── SCREEN 2: PREVIEW ── */}
      {screen === SCREEN.PREVIEW && previewData && (
        <div>
          {/* Summary bar */}
          <div className="card" style={{ padding: "16px 20px", marginBottom: 16 }}>
            <div style={{
              display:    "flex",
              alignItems: "center",
              gap:        16,
              flexWrap:   "wrap",
            }}>
              <div>
                <p style={{ fontSize: 9, fontWeight: 700, color: "var(--text3)",
                  textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>
                  File
                </p>
                <p style={{ fontSize: 13, fontWeight: 600 }}>{previewData.file_name}</p>
              </div>
              <div style={{ width: 1, height: 32, background: "var(--border)" }} />
              <SummaryChip label="Total Rows"   value={previewData.total_rows}       color="var(--text2)" />
              <SummaryChip label="Will Import"  value={previewData.will_import_count ?? previewData.valid_count} color="#18A858" />
              {previewData.raw_lead_count > 0 && (
                <SummaryChip label="Raw Leads"  value={previewData.raw_lead_count}   color="#C08010" />
              )}
              {(previewData.rejected_count ?? previewData.skipped_count ?? 0) > 0 && (
                <SummaryChip label="Rejected"   value={previewData.rejected_count ?? previewData.skipped_count} color="#C03030" />
              )}
            </div>

            {/* Unmatched email warning */}
            {previewData.unmatched_emails?.length > 0 && (
              <div style={{
                marginTop:    12,
                padding:      "9px 12px",
                background:   "#FDF4E0",
                border:       "1px solid #F0D080",
                borderRadius: 3,
                fontSize:     12,
                color:        "#7A4A00",
              }}>
                <strong>⚠ {previewData.unmatched_emails.length} unmatched email{previewData.unmatched_emails.length !== 1 ? "s" : ""}:</strong>{" "}
                {previewData.unmatched_emails.join(", ")} — these leads will be imported as raw (unassigned).
              </div>
            )}
          </div>

          {/* Preview table */}
          <div className="card" style={{ padding: "16px 20px", marginBottom: 16 }}>
            <PreviewTable rows={previewData.rows ?? []} />
          </div>

          {/* Rejection notice */}
          {(previewData.rejected_count ?? previewData.skipped_count ?? 0) > 0 && (
            <div style={{
              marginBottom: 12,
              padding:      "10px 12px",
              background:   "#FFF8E1",
              border:       "1px solid #E0B84A",
              borderRadius: 4,
              fontSize:     12,
              color:        "#7A5800",
            }}>
              <strong>{previewData.rejected_count ?? previewData.skipped_count} row(s) will be skipped</strong> due to
              validation errors. Fix the issues and re-upload, or proceed to import only the valid rows.
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, justifyContent: "space-between" }}>
            <button className="btn btn-secondary" onClick={handleReset}>
              ← Upload Different File
            </button>
            <button
              className="btn btn-primary"
              onClick={handleConfirm}
              disabled={
                !(previewData.will_import_count ?? previewData.valid_count) ||
                confirmMutation.isPending
              }
            >
              {confirmMutation.isPending ? (
                <><Spinner size={14} /> Importing…</>
              ) : (
                `Confirm Import (${previewData.will_import_count ?? previewData.valid_count} leads) →`
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── SCREEN 3: SUMMARY ── */}
      {screen === SCREEN.SUMMARY && summaryData && (
        <div style={{ maxWidth: 540 }}>
          <div className="card" style={{ padding: "28px 28px", marginBottom: 16, textAlign: "center" }}>
            {/* Success icon */}
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>
              Import Complete!
            </h2>
            <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 24 }}>
              {summaryData.file_name}
            </p>

            {/* Result breakdown */}
            <div style={{
              display:  "flex",
              gap:      1,
              border:   "1px solid var(--border)",
              borderRadius: 3,
              overflow: "hidden",
              marginBottom: 20,
            }}>
              <ResultCell
                icon="✓"
                label="Imported"
                value={summaryData.imported_count}
                color="#18A858"
                bg="#E4F8EE"
              />
              {summaryData.raw_lead_count > 0 && (
                <ResultCell
                  icon="⚠"
                  label="Raw Leads"
                  value={summaryData.raw_lead_count}
                  color="#C08010"
                  bg="#FDF4E0"
                />
              )}
              {summaryData.skipped_count > 0 && (
                <ResultCell
                  icon="✗"
                  label="Skipped"
                  value={summaryData.skipped_count}
                  color="#C03030"
                  bg="#FCE8E8"
                />
              )}
            </div>

            {/* Raw lead note */}
            {summaryData.raw_lead_count > 0 && (
              <div style={{
                padding:      "10px 14px",
                background:   "#FDF4E0",
                border:       "1px solid #F0D080",
                borderRadius: 3,
                fontSize:     12,
                color:        "#7A4A00",
                textAlign:    "left",
                marginBottom: 16,
              }}>
                <strong>{summaryData.raw_lead_count} raw lead{summaryData.raw_lead_count !== 1 ? "s" : ""}</strong> were
                imported without an assignee. These are visible to Admin only and can be
                assigned from the Leads page.
              </div>
            )}

            {/* Skipped rows detail */}
            {summaryData.skipped_rows?.length > 0 && (
              <div style={{
                padding:      "10px 14px",
                background:   "#FCE8E8",
                border:       "1px solid #F0A8A8",
                borderRadius: 3,
                fontSize:     12,
                color:        "#8A1A1A",
                textAlign:    "left",
                marginBottom: 16,
              }}>
                <strong>Skipped rows:</strong>
                <ul style={{ margin: "6px 0 0 16px", padding: 0 }}>
                  {summaryData.skipped_rows.map((r) => (
                    <li key={r.row_number} style={{ marginBottom: 2 }}>
                      Row {r.row_number}: {r.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Per-row errors (new format: errors[]) */}
            {summaryData.errors?.length > 0 && (
              <div style={{
                padding:      10,
                background:   "#FEE2E2",
                border:       "1px solid #FCA5A5",
                borderRadius: 4,
                fontSize:     12,
                color:        "#991B1B",
                textAlign:    "left",
                marginBottom: 16,
              }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>
                  {summaryData.errors.length} row(s) failed:
                </div>
                {summaryData.errors.map((err, idx) => (
                  <div key={idx} style={{ marginBottom: 4 }}>
                    Row {err.row}: {Array.isArray(err.errors) ? err.errors.join(", ") : err.errors}
                  </div>
                ))}
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button
                className="btn btn-secondary"
                onClick={handleReset}
              >
                Upload Another
              </button>
              <button
                className="btn btn-primary"
                onClick={() => navigate("/leads")}
              >
                View Leads →
              </button>
            </div>
          </div>

          {/* Past imports history */}
          {history.length > 0 && (
            <div className="card">
              <div className="card-header">
                <span className="card-title">Import History</span>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>File</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th style={{ textAlign: "right" }}>Imported</th>
                      <th style={{ textAlign: "right" }}>Skipped</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.slice(0, 10).map((log) => (
                      <tr key={log.id}>
                        <td style={{ fontSize: 12 }}>{log.file_name}</td>
                        <td style={{ fontSize: 11, color: "var(--text3)" }}>
                          {formatDateTime(log.created_at)}
                        </td>
                        <td>
                          <span style={{
                            fontSize:     10,
                            fontWeight:   500,
                            padding:      "1px 6px",
                            borderRadius: 3,
                            background:   log.status === "completed" ? "#E4F8EE"
                                        : log.status === "rejected"  ? "#FCE8E8"
                                        : "#FDF4E0",
                            color:        log.status === "completed" ? "#0A5A28"
                                        : log.status === "rejected"  ? "#8A1A1A"
                                        : "#7A4A00",
                            border:       `1px solid ${
                              log.status === "completed" ? "#80D8A8"
                              : log.status === "rejected"  ? "#F0A8A8"
                              : "#F0D080"
                            }`,
                          }}>
                            {log.status}
                          </span>
                        </td>
                        <td style={{ textAlign: "right", fontSize: 12, fontWeight: 600,
                          color: "#0A5A28" }}>
                          {log.imported_count ?? "—"}
                        </td>
                        <td style={{ textAlign: "right", fontSize: 12, color: "#C03030" }}>
                          {log.skipped_count > 0 ? log.skipped_count : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
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

function ResultCell({ icon, label, value, color, bg }) {
  return (
    <div style={{
      flex:       1,
      padding:    "14px 12px",
      background: bg,
      textAlign:  "center",
      borderRight: "1px solid var(--border)",
    }}>
      <p style={{ fontSize: 22, fontWeight: 700, color, marginBottom: 2, lineHeight: 1 }}>
        {icon} {value}
      </p>
      <p style={{ fontSize: 10, fontWeight: 600, color,
        textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </p>
    </div>
  );
}