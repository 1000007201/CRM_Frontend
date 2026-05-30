export default function IdBadge({ id }) {
  if (!id) return <span style={{ color: "var(--text3)" }}>—</span>;
  return (
    <span style={{
      display:      "inline-block",
      padding:      "2px 8px",
      background:   "var(--surface)",
      border:       "1px solid var(--border)",
      borderRadius: 4,
      fontFamily:   "monospace",
      fontSize:     11,
      fontWeight:   600,
      color:        "var(--text2)",
      whiteSpace:   "nowrap",
    }}>
      {id}
    </span>
  );
}
