/**
 * components/common/Spinner.jsx
 */

export default function Spinner({ center = false, size = 20 }) {
  const el = (
    <div
      className="spinner"
      style={{ width: size, height: size }}
    />
  );
  if (center) {
    return <div className="spinner-center">{el}</div>;
  }
  return el;
}