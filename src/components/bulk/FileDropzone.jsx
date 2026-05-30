/**
 * components/bulk/FileDropzone.jsx
 *
 * Drag-and-drop file upload area.
 * Accepts .csv, .xlsx, .xls only.
 * Shows file name + size after selection.
 * Calls onFile(file) when a valid file is chosen.
 */
import { useState, useRef } from "react";

const ACCEPTED = [".csv", ".xlsx", ".xls"];
const ACCEPT_MIME = [
  "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
].join(",");

function formatBytes(bytes) {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getExt(name = "") {
  return "." + name.split(".").pop().toLowerCase();
}

export default function FileDropzone({ onFile, disabled = false }) {
  const inputRef         = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [selected, setSelected] = useState(null);
  const [error,    setError]    = useState("");

  const validate = (file) => {
    if (!file) return "No file selected.";
    const ext = getExt(file.name);
    if (!ACCEPTED.includes(ext))
      return `Unsupported file type "${ext}". Please upload a .csv, .xlsx, or .xls file.`;
    if (file.size === 0)
      return "The file is empty.";
    if (file.size > 10 * 1024 * 1024)
      return `File too large (${formatBytes(file.size)}). Maximum size is 10 MB.`;
    return "";
  };

  const handleFile = (file) => {
    const err = validate(file);
    if (err) { setError(err); setSelected(null); return; }
    setError("");
    setSelected(file);
    onFile(file);
  };

  const onInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = ""; // reset so same file can be re-selected
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const ext = selected ? getExt(selected.name) : null;
  const extColor = {
    ".csv":  "#0A7838",
    ".xlsx": "#0A5A28",
    ".xls":  "#0A4A20",
  }[ext] ?? "#5A5A50";

  return (
    <div>
      {/* Drop zone */}
      <div
        onClick={() => !disabled && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        style={{
          border:        `2px dashed ${dragging ? "var(--accent)" : error ? "#F0A8A8" : "var(--border2)"}`,
          borderRadius:  4,
          padding:       "36px 24px",
          textAlign:     "center",
          cursor:        disabled ? "not-allowed" : "pointer",
          background:    dragging ? "var(--accent-lt)"
                        : selected ? "#E4F8EE"
                        : "var(--surface)",
          transition:    "all 0.15s",
          opacity:       disabled ? 0.6 : 1,
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_MIME + ",.csv,.xlsx,.xls"}
          onChange={onInputChange}
          style={{ display: "none" }}
          disabled={disabled}
        />

        {selected ? (
          /* File selected state */
          <div>
            <div style={{
              display:        "inline-flex",
              alignItems:     "center",
              gap:            10,
              background:     "var(--white)",
              border:         "1px solid var(--border)",
              borderRadius:   3,
              padding:        "10px 16px",
              marginBottom:   12,
            }}>
              {/* File type badge */}
              <span style={{
                fontSize:      10,
                fontWeight:    700,
                padding:       "3px 7px",
                borderRadius:  3,
                background:    "#E4F8EE",
                color:         extColor,
                border:        "1px solid #80D8A8",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}>
                {ext?.replace(".", "")}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                {selected.name}
              </span>
              <span style={{ fontSize: 11, color: "var(--text3)" }}>
                {formatBytes(selected.size)}
              </span>
            </div>
            <p style={{ fontSize: 11, color: "var(--text3)" }}>
              Click to change file
            </p>
          </div>
        ) : (
          /* Empty state */
          <div>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📂</div>
            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>
              {dragging ? "Drop your file here" : "Drop your file here or click to browse"}
            </p>
            <p style={{ fontSize: 11, color: "var(--text3)", marginBottom: 12 }}>
              Supported formats: <strong>.csv</strong>, <strong>.xlsx</strong>, <strong>.xls</strong>
            </p>
            <p style={{ fontSize: 10, color: "var(--text3)" }}>
              Maximum file size: 10 MB
            </p>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{
          marginTop:    8,
          padding:      "8px 12px",
          background:   "#FCE8E8",
          border:       "1px solid #F0A8A8",
          borderRadius: 3,
          fontSize:     12,
          color:        "#8A1A1A",
        }}>
          ⚠ {error}
        </div>
      )}

      {/* Format hint */}
      <div style={{
        marginTop:  12,
        padding:    "10px 14px",
        background: "var(--surface)",
        border:     "1px solid var(--border)",
        borderRadius: 3,
      }}>
        <p style={{
          fontSize:      9,
          fontWeight:    700,
          color:         "var(--text3)",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          marginBottom:  6,
        }}>
          Required Column
        </p>
        <p style={{ fontSize: 12, color: "var(--text2)", marginBottom: 6 }}>
          <strong style={{ color: "var(--text)" }}>contact_name</strong> — all other columns are optional
        </p>
        <p style={{
          fontSize:      9,
          fontWeight:    700,
          color:         "var(--text3)",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          marginBottom:  4,
          marginTop:     8,
        }}>
          Optional Columns
        </p>
        <p style={{ fontSize: 11, color: "var(--text3)", lineHeight: 1.7 }}>
          title · contact_email · contact_phone · company · stage · priority ·
          source · description · assigned_to (email) · tags · website
        </p>
      </div>
    </div>
  );
}