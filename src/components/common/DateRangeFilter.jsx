export default function DateRangeFilter({
  fromDate,
  toDate,
  onFromChange,
  onToChange,
  label = "Created",
}) {
  return (
    <div style={{
      display:    "flex",
      alignItems: "center",
      gap:        6,
      flexWrap:   "wrap",
    }}>
      <span style={{
        fontSize:      11,
        fontWeight:    600,
        color:         "var(--text3)",
        textTransform: "uppercase",
        whiteSpace:    "nowrap",
      }}>
        {label}
      </span>

      <input
        type="date"
        value={fromDate || ""}
        onChange={(e) => onFromChange(e.target.value)}
        max={toDate || undefined}
        style={{
          height:       30,
          padding:      "0 8px",
          fontSize:     12,
          border:       "1px solid var(--border2)",
          borderRadius: 3,
          background:   "var(--white)",
          outline:      "none",
          fontFamily:   "inherit",
          width:        130,
        }}
      />

      <span style={{ fontSize: 11, color: "var(--text3)" }}>to</span>

      <input
        type="date"
        value={toDate || ""}
        onChange={(e) => onToChange(e.target.value)}
        min={fromDate || undefined}
        style={{
          height:       30,
          padding:      "0 8px",
          fontSize:     12,
          border:       "1px solid var(--border2)",
          borderRadius: 3,
          background:   "var(--white)",
          outline:      "none",
          fontFamily:   "inherit",
          width:        130,
        }}
      />

      {(fromDate || toDate) && (
        <button
          type="button"
          onClick={() => { onFromChange(""); onToChange(""); }}
          title="Clear date range"
          style={{
            height:       30,
            padding:      "0 8px",
            fontSize:     11,
            border:       "1px solid var(--border)",
            borderRadius: 3,
            background:   "var(--surface)",
            color:        "var(--text2)",
            cursor:       "pointer",
            fontFamily:   "inherit",
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}
