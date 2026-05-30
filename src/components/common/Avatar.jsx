/**
 * components/common/Avatar.jsx
 *
 * Square avatar with warm palette — matches reference demoCRM.jsx AVC array.
 * borderRadius: 3px (flat/editorial, not circular).
 */
import { initials } from "@/utils/formatters";

/* Exact palette from reference AVC array */
const PALETTE = [
  { bg: "#FDF0D8", color: "#A06010" },  // warm amber
  { bg: "#E0EEFA", color: "#1A60A8" },  // cool blue
  { bg: "#E0F8EC", color: "#0A7838" },  // green
  { bg: "#EEE0F8", color: "#6030A0" },  // purple
  { bg: "#FCE8E8", color: "#8A1818" },  // red
  { bg: "#E8F2FC", color: "#1A5A9A" },  // light blue
  { bg: "#E4F8EE", color: "#0A5A28" },  // light green
  { bg: "#FDF4E0", color: "#7A4A00" },  // ochre
];

function colorFromName(name = "") {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

export default function Avatar({ name, size = 28, style = {} }) {
  const { bg, color } = colorFromName(name);
  const fontSize = Math.floor(size * 0.36);

  return (
    <div
      className="avatar"
      style={{
        width:      size,
        height:     size,
        background: bg,
        color,
        fontSize,
        borderRadius: 3,   /* square, matching reference */
        letterSpacing: "-0.02em",
        ...style,
      }}
    >
      {initials(name)}
    </div>
  );
}