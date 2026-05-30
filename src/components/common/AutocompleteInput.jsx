/**
 * components/common/AutocompleteInput.jsx
 *
 * Generic debounced autocomplete / combobox.
 *
 * Props:
 *   value        — currently selected item (any), or null
 *   onChange     — (item | null) => void  called on select or clear
 *   fetchFn      — (query: string) => Promise<item[]>
 *   getLabel     — (item) => string  — text shown in input when selected
 *   getSublabel  — (item) => string  — optional secondary text in dropdown row
 *   placeholder  — string
 *   disabled     — bool
 *   error        — string  — border turns red when truthy
 */
import { useState, useEffect, useRef } from "react";

export default function AutocompleteInput({
  value,
  onChange,
  fetchFn,
  getLabel,
  getSublabel,
  placeholder = "Search…",
  disabled    = false,
  error       = "",
}) {
  const [query,   setQuery]   = useState(value ? getLabel(value) : "");
  const [results, setResults] = useState([]);
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapRef  = useRef(null);
  const timerRef = useRef(null);

  // Sync display when value changes externally
  useEffect(() => {
    setQuery(value ? getLabel(value) : "");
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const runFetch = (q) => {
    clearTimeout(timerRef.current);
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const items = await fetchFn(q);
        setResults(Array.isArray(items) ? items : (items?.results ?? []));
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
  };

  const handleInputChange = (e) => {
    const q = e.target.value;
    setQuery(q);
    if (!q) { onChange(null); setResults([]); setOpen(false); return; }
    onChange(null);
    runFetch(q);
  };

  const handleSelect = (item) => {
    setQuery(getLabel(item));
    setResults([]);
    setOpen(false);
    onChange(item);
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setOpen(false);
    onChange(null);
  };

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <div style={{ position: "relative" }}>
        <input
          className="form-input"
          value={query}
          onChange={handleInputChange}
          onFocus={() => query && results.length && setOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          style={{
            width: "100%",
            paddingRight: query ? 28 : undefined,
            borderColor: error ? "var(--red)" : undefined,
          }}
        />
        {query && !disabled && (
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); handleClear(); }}
            style={{
              position: "absolute", right: 8, top: "50%",
              transform: "translateY(-50%)",
              background: "none", border: "none", cursor: "pointer",
              fontSize: 12, color: "var(--text3)", lineHeight: 1,
              fontFamily: "inherit",
            }}
          >
            ✕
          </button>
        )}
      </div>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 2px)", left: 0, width: "100%",
          background: "var(--white)", border: "1px solid var(--border)",
          borderRadius: 4, boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          maxHeight: 200, overflowY: "auto", zIndex: 60,
        }}>
          {loading && (
            <div style={{ padding: "8px 12px", fontSize: 11, color: "var(--text3)", fontStyle: "italic" }}>
              Searching…
            </div>
          )}
          {!loading && results.length === 0 && (
            <div style={{ padding: "8px 12px", fontSize: 11, color: "var(--text3)", fontStyle: "italic" }}>
              No results found
            </div>
          )}
          {!loading && results.map((item, i) => (
            <div
              key={i}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(item); }}
              style={{
                padding: "8px 12px", cursor: "pointer",
                borderBottom: i < results.length - 1 ? "1px solid var(--border)" : "none",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <p style={{ fontSize: 12, color: "var(--text)", fontWeight: 500 }}>
                {getLabel(item)}
              </p>
              {getSublabel && (
                <p style={{ fontSize: 10, color: "var(--text3)", marginTop: 1 }}>
                  {getSublabel(item)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
