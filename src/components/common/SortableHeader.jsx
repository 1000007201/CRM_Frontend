export default function SortableHeader({ label, column, sortBy, sortDir, onToggle, style = {} }) {
  const isActive  = sortBy === column;
  const indicator = isActive ? (sortDir === "asc" ? "▲" : "▼") : "↕";

  return (
    <th
      onClick={() => onToggle(column)}
      style={{
        cursor:     "pointer",
        userSelect: "none",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
        {label}
        <span style={{
          fontSize: 10,
          color:    isActive ? "var(--accent)" : "var(--text3)",
          opacity:  isActive ? 1 : 0.4,
        }}>
          {indicator}
        </span>
      </span>
    </th>
  );
}
