/**
 * components/common/Modal.jsx
 *
 * Usage:
 *   <Modal
 *     open={showModal}
 *     onClose={() => setShowModal(false)}
 *     title="Add Lead"
 *     subtitle="Fill in the details below"
 *     size="wide"          // "sm" | "md" (default) | "wide"
 *     footer={<>...</>}
 *   >
 *     <p>Body content here</p>
 *   </Modal>
 *
 * Closes ONLY via the ✕ button or any action button that calls onClose.
 * Backdrop click and ESC key are intentionally disabled.
 */
import { useIsMobile } from "@/hooks/useIsMobile";

export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  size = "md",
  footer,
  children,
}) {
  const isMobile = useIsMobile();

  if (!open) return null;

  const sizeClass = { sm: "modal-sm", md: "", wide: "modal-wide" }[size] ?? "";

  const overlayMobileStyle = isMobile ? { padding: "12px" } : null;
  const modalMobileStyle   = isMobile ? {
    width:     "calc(100vw - 24px)",
    maxWidth:  "calc(100vw - 24px)",
    maxHeight: "calc(100vh - 24px)",
    margin:    "0",
    overflowY: "auto",
  } : null;

  return (
    <div
      className="modal-overlay"
      style={overlayMobileStyle ?? undefined}
    >
      <div className={`modal ${sizeClass}`} style={modalMobileStyle ?? undefined}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <h2 className="modal-title">{title}</h2>
            {subtitle && <p className="modal-subtitle">{subtitle}</p>}
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">{children}</div>

        {/* Optional footer */}
        {footer && <div style={{ padding: isMobile ? "0 14px 14px" : "0 22px 20px" }}>{footer}</div>}
      </div>
    </div>
  );
}
