/**
 * components/bulk/PreviewTable.jsx
 *
 * Per-row preview for bulk lead uploads.
 * Expects `rows` from /bulk-upload/preview/:
 *   { row_number, will_import, errors, warnings, data, computed }
 *
 * - Every row shown with "Will Import" / "Rejected" status
 * - Errors (blocking) in red, warnings (non-blocking) in amber
 * - Computed values (stage, assignee, tag) show what will actually be saved
 * - "Show only errors" toggle for large files
 */
import { useState } from "react";
import { useIsMobile } from "@/hooks/useIsMobile";

const cellStyle = {
  padding:      "8px 10px",
  borderBottom: "1px solid var(--border)",
  fontSize:     12,
  verticalAlign: "top",
  textAlign:    "left",
};

export default function PreviewTable({ rows = [] }) {
  const isMobile       = useIsMobile();
  const [showOnlyErrors, setShowOnlyErrors] = useState(false);

  const errorCount  = rows.filter((r) => !r.will_import).length;
  const visibleRows = showOnlyErrors ? rows.filter((r) => !r.will_import) : rows;

  if (rows.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text3)", fontSize: 13 }}>
        No rows to display.
      </div>
    );
  }

  return (
    <div>
      {/* "Show errors only" toggle */}
      {errorCount > 0 && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "flex-end",
          marginBottom: 10,
        }}>
          <label style={{
            display: "flex", alignItems: "center", gap: 6,
            fontSize: 12, cursor: "pointer", color: "var(--text2)", userSelect: "none",
          }}>
            <input
              type="checkbox"
              checked={showOnlyErrors}
              onChange={(e) => setShowOnlyErrors(e.target.checked)}
              style={{ cursor: "pointer" }}
            />
            Show only rows with errors ({errorCount})
          </label>
        </div>
      )}

      {isMobile ? (
        <MobileCards rows={visibleRows} />
      ) : (
        <DesktopGrid rows={visibleRows} />
      )}
    </div>
  );
}

// ── Desktop table ─────────────────────────────────────────────────────────────

function DesktopGrid({ rows }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{
        width: "100%", borderCollapse: "collapse",
        fontSize: 12, minWidth: 960,
      }}>
        <thead>
          <tr style={{ background: "var(--surface)" }}>
            <th style={cellStyle}>Row</th>
            <th style={cellStyle}>Status</th>
            <th style={cellStyle}>Company</th>
            <th style={cellStyle}>Contact</th>
            <th style={cellStyle}>Email</th>
            <th style={cellStyle}>Source</th>
            <th style={cellStyle}>Stage</th>
            <th style={cellStyle}>Assigned To</th>
            <th style={cellStyle}>Tag</th>
            <th style={cellStyle}>Issues</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.row_number}
              style={{ background: row.will_import ? "var(--white)" : "#FEF2F2" }}
            >
              <td style={{ ...cellStyle, fontSize: 11, color: "var(--text3)", fontWeight: 600 }}>
                {row.row_number}
              </td>
              <td style={cellStyle}>
                <StatusPill ok={row.will_import} />
              </td>
              <td style={cellStyle}>{row.data?.company  || <Dash />}</td>
              <td style={{ ...cellStyle, fontWeight: 600 }}>{row.data?.contact_name || <Dash />}</td>
              <td style={{ ...cellStyle, color: "var(--text3)" }}>{row.data?.email   || <Dash />}</td>
              <td style={cellStyle}>{row.data?.source   || <Dash />}</td>
              <td style={cellStyle}>{row.computed?.stage       || <Dash />}</td>
              <td style={cellStyle}>{row.computed?.assigned_to || <Dash />}</td>
              <td style={cellStyle}>{row.computed?.tag         || <Dash />}</td>
              <td style={cellStyle}>
                <IssuesCell errors={row.errors} warnings={row.warnings} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Mobile cards ──────────────────────────────────────────────────────────────

function MobileCards({ rows }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {rows.map((row) => (
        <div
          key={row.row_number}
          style={{
            padding:      "10px 12px",
            border:       `1px solid ${row.will_import ? "var(--border)" : "#FCA5A5"}`,
            borderRadius: 4,
            background:   row.will_import ? "var(--white)" : "#FEF2F2",
          }}
        >
          <div style={{
            display: "flex", justifyContent: "space-between",
            alignItems: "flex-start", gap: 8, marginBottom: 6,
          }}>
            <div>
              <span style={{ fontSize: 10, color: "var(--text3)", fontWeight: 600 }}>
                Row {row.row_number}
              </span>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginTop: 2 }}>
                {row.data?.contact_name || row.data?.company || "—"}
              </div>
              {row.data?.company && row.data?.contact_name && (
                <div style={{ fontSize: 11, color: "var(--text3)" }}>{row.data.company}</div>
              )}
            </div>
            <StatusPill ok={row.will_import} />
          </div>
          <div style={{
            fontSize: 11, color: "var(--text2)",
            display: "flex", gap: 8, flexWrap: "wrap",
            marginBottom: (row.errors?.length || row.warnings?.length) ? 6 : 0,
          }}>
            {row.data?.source       && <span>Source: {row.data.source}</span>}
            {row.computed?.stage    && <span>Stage: {row.computed.stage}</span>}
            {row.computed?.assigned_to && <span>To: {row.computed.assigned_to}</span>}
          </div>
          <IssuesCell errors={row.errors} warnings={row.warnings} />
        </div>
      ))}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusPill({ ok }) {
  return ok ? (
    <span style={{
      display: "inline-block", padding: "2px 8px",
      borderRadius: 10, fontSize: 10, fontWeight: 700,
      background: "#E4F8EE", color: "#0A5A28", border: "1px solid #80D8A8",
      whiteSpace: "nowrap",
    }}>
      ✓ Will Import
    </span>
  ) : (
    <span style={{
      display: "inline-block", padding: "2px 8px",
      borderRadius: 10, fontSize: 10, fontWeight: 700,
      background: "#FEE2E2", color: "#991B1B", border: "1px solid #FCA5A5",
      whiteSpace: "nowrap",
    }}>
      ✗ Rejected
    </span>
  );
}

function IssuesCell({ errors = [], warnings = [] }) {
  if (!errors.length && !warnings.length) {
    return <span style={{ color: "var(--text3)" }}>—</span>;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {errors.map((err, i) => (
        <div key={i} style={{ fontSize: 11, color: "#991B1B" }}>✗ {err}</div>
      ))}
      {warnings.map((warn, i) => (
        <div key={i} style={{ fontSize: 11, color: "#7A5800" }}>⚠ {warn}</div>
      ))}
    </div>
  );
}

function Dash() {
  return <span style={{ color: "var(--text3)" }}>—</span>;
}
