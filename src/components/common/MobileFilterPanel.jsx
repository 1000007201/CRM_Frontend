/**
 * components/common/MobileFilterPanel.jsx
 *
 * Right-side slide-in overlay that holds filter controls on mobile.
 * Pass filter inputs as children. Provides Clear / Apply footer actions.
 */
export default function MobileFilterPanel({ children, onClose, onClear, onApply }) {
  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.45)",
          zIndex: 90,
        }}
      />
      <div style={{
        position: "fixed",
        top: 0, bottom: 0, right: 0,
        width: 320, maxWidth: "90vw",
        background: "var(--white)",
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
        boxShadow: "-2px 0 8px rgba(0,0,0,0.15)",
      }}>
        <div style={{
          padding: "14px 16px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          minHeight: 56,
        }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>Filters</div>
          <button
            onClick={onClose}
            style={{
              width: 36, height: 36, border: "none", background: "none",
              fontSize: 18, cursor: "pointer", color: "var(--text)",
              fontFamily: "inherit",
            }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {children}
          </div>
        </div>

        <div style={{
          padding: 12,
          borderTop: "1px solid var(--border)",
          display: "flex",
          gap: 8,
        }}>
          <button
            onClick={onClear}
            style={{
              flex: 1, minHeight: 44,
              background: "var(--white)",
              border: "1px solid var(--border2)",
              borderRadius: 3,
              fontSize: 14, fontWeight: 600,
              color: "var(--text)",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Clear
          </button>
          <button
            onClick={onApply}
            style={{
              flex: 2, minHeight: 44,
              background: "var(--accent)",
              color: "#fff",
              border: "none",
              borderRadius: 3,
              fontSize: 14, fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Apply Filters
          </button>
        </div>
      </div>
    </>
  );
}
