export default function PhoneInput({ value, onChange, placeholder = "Phone number", disabled = false }) {
  const parseValue = (val) => {
    if (!val) return { code: "", number: "" };
    const match = val.match(/^\+?(\d+)\s*(.*)$/);
    if (match) return { code: match[1], number: match[2] };
    return { code: "", number: val };
  };

  const { code, number } = parseValue(value || "");

  const update = (newCode, newNumber) => {
    const trimmedCode   = (newCode   || "").replace(/\D/g, "");
    const trimmedNumber = (newNumber || "").trim();

    if (!trimmedCode && !trimmedNumber) { onChange(""); return; }
    if (!trimmedCode) { onChange(trimmedNumber); return; }
    onChange(`+${trimmedCode} ${trimmedNumber}`.trim());
  };

  const handleCodeChange = (e) => {
    const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 4);
    update(digitsOnly, number);
  };

  return (
    <div style={{ display: "flex", alignItems: "stretch", width: "100%" }}>
      <div style={{
        display: "flex", alignItems: "center",
        border: "1px solid var(--border)", borderRight: "none",
        borderTopLeftRadius: 4, borderBottomLeftRadius: 4,
        background: disabled ? "var(--surface)" : "var(--white)",
        width: 80, flex: "0 0 80px", paddingLeft: 10, height: 30,
      }}>
        <span style={{
          color: "var(--text2)", fontSize: 13, fontWeight: 500,
          marginRight: 2, userSelect: "none",
        }}>
          +
        </span>
        <input
          type="text"
          inputMode="numeric"
          value={code}
          onChange={handleCodeChange}
          disabled={disabled}
          placeholder="91"
          style={{
            flex: 1, minWidth: 0, width: "100%", height: "100%",
            padding: "0 8px 0 2px", fontSize: 13,
            border: "none", outline: "none",
            background: "transparent", color: "var(--text1)",
          }}
        />
      </div>

      <input
        type="text"
        inputMode="numeric"
        value={number}
        onChange={(e) => update(code, e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          flex: 1, minWidth: 0, height: 30, padding: "0 12px", fontSize: 13,
          border: "1px solid var(--border)",
          borderTopLeftRadius: 0, borderBottomLeftRadius: 0,
          borderTopRightRadius: 4, borderBottomRightRadius: 4,
          background: disabled ? "var(--surface)" : "var(--white)",
          outline: "none", color: "var(--text1)",
        }}
      />
    </div>
  );
}
