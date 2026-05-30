import { useState, useRef, useEffect, useMemo } from "react";

/**
 * Reusable autocomplete combobox.
 *
 * Props:
 *   - options:       array of { id, label, sublabel? } — sublabel shown smaller below label
 *   - value:         currently selected ID (or null/"")
 *   - onChange:      (newId) => void   — called when user picks an option
 *   - placeholder:   string
 *   - disabled:      bool
 *   - emptyMessage:  string shown when no matches
 *   - getLabel:      optional fn (option) => string — defaults to option.label
 *   - filterFn:      optional fn (option, query) => bool — defaults to label contains query
 */
export default function Autocomplete({
  options       = [],
  value         = "",
  onChange,
  placeholder   = "Type to search…",
  disabled      = false,
  emptyMessage  = "No matches found.",
  getLabel,
  filterFn,
  hideWhenEmpty = false,
}) {
  const [query,     setQuery]     = useState("");
  const [isOpen,    setIsOpen]    = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const wrapperRef = useRef(null);
  const inputRef   = useRef(null);

  const labelOf = getLabel || ((o) => o?.label || "");

  // Sync input text with selected value when value changes externally
  useEffect(() => {
    if (value) {
      const selected = options.find(o => o.id === value);
      if (selected) setQuery(labelOf(selected));
    } else {
      setQuery("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, options.length]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
        setHighlight(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter options based on query
  const filteredOptions = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    if (filterFn) return options.filter(o => filterFn(o, query));
    return options.filter(o => {
      const lbl = labelOf(o).toLowerCase();
      const sub = (o.sublabel || "").toLowerCase();
      return lbl.includes(q) || sub.includes(q);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, options]);

  const selectOption = (option) => {
    onChange?.(option.id);
    setQuery(labelOf(option));
    setIsOpen(false);
    setHighlight(-1);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setIsOpen(true);
        setHighlight(0);
        e.preventDefault();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight(prev => Math.min(prev + 1, filteredOptions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight(prev => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlight >= 0 && filteredOptions[highlight]) {
        selectOption(filteredOptions[highlight]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setHighlight(-1);
    }
  };

  const handleInputChange = (e) => {
    setQuery(e.target.value);
    setIsOpen(true);
    setHighlight(filteredOptions.length > 0 ? 0 : -1);

    // Clear underlying value if input doesn't exactly match the selected option's label
    if (value) {
      const selected = options.find(o => o.id === value);
      if (selected && labelOf(selected) !== e.target.value) {
        onChange?.(null);
      }
    }
  };

  const shouldShowDropdown =
    isOpen && !disabled && (!hideWhenEmpty || query.trim().length > 0);

  return (
    <div ref={wrapperRef} style={{ position: "relative" }}>
      <input
        ref={inputRef}
        type="text"
        className="form-input"
        value={query}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
      />

      {shouldShowDropdown && (
        <div style={{
          position:     "absolute",
          top:          "calc(100% + 2px)",
          left:         0,
          right:        0,
          maxHeight:    240,
          overflowY:    "auto",
          background:   "var(--white)",
          border:       "1px solid var(--border)",
          borderRadius: 3,
          boxShadow:    "0 4px 12px rgba(0,0,0,0.08)",
          zIndex:       100,
        }}>
          {filteredOptions.length === 0 ? (
            <div style={{
              padding:   "10px 12px",
              fontSize:  12,
              color:     "var(--text3)",
              textAlign: "center",
            }}>
              {emptyMessage}
            </div>
          ) : (
            filteredOptions.map((opt, idx) => (
              <div
                key={opt.id}
                onClick={() => selectOption(opt)}
                onMouseEnter={() => setHighlight(idx)}
                style={{
                  padding:      "8px 12px",
                  cursor:       "pointer",
                  fontSize:     13,
                  background:   highlight === idx ? "var(--accent-lt, #EEF2FF)" : "var(--white)",
                  color:        highlight === idx ? "var(--accent)" : "var(--text1, var(--text))",
                  borderBottom: idx < filteredOptions.length - 1 ? "1px solid rgba(0,0,0,0.04)" : "none",
                }}
              >
                <div style={{ fontWeight: highlight === idx ? 600 : 500 }}>
                  {labelOf(opt)}
                </div>
                {opt.sublabel && (
                  <div style={{
                    fontSize:  11,
                    color:     highlight === idx ? "var(--accent)" : "var(--text3)",
                    marginTop: 2,
                    opacity:   0.85,
                  }}>
                    {opt.sublabel}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
