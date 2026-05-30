/**
 * components/common/Toast.jsx
 *
 * Lightweight toast system.
 *
 * 1. Wrap your app (or a subtree) with <ToastProvider>
 * 2. Call useToast() anywhere to get { success, error, info }
 *
 * Example:
 *   const toast = useToast();
 *   toast.success("Lead created!");
 *   toast.error("Something went wrong.");
 */
import {
  createContext, useContext, useState, useCallback, useEffect,
} from "react";

// ── Context ───────────────────────────────────────────────────────────────────

const ToastContext = createContext(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const add = useCallback((message, type = "success") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    success: (msg) => add(msg, "success"),
    error:   (msg) => add(msg, "error"),
    info:    (msg) => add(msg, "info"),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-container">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onClose={() => remove(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ── Single toast item ─────────────────────────────────────────────────────────

function ToastItem({ toast, onClose }) {
  const colors = {
    success: { bg: "#059669", icon: "✓" },
    error:   { bg: "#dc2626", icon: "✕" },
    info:    { bg: "#3A80D0", icon: "i" },
  };
  const { bg, icon } = colors[toast.type] ?? colors.info;

  return (
    <div
      style={{
        display:       "flex",
        alignItems:    "center",
        gap:           10,
        background:    bg,
        color:         "#fff",
        padding:       "11px 16px",
        borderRadius:  10,
        fontSize:      13,
        fontWeight:    500,
        boxShadow:     "0 8px 24px rgba(15,23,42,.15)",
        animation:     "toast-in .2s ease",
        pointerEvents: "all",
        maxWidth:       360,
        cursor:        "pointer",
      }}
      onClick={onClose}
    >
      <span style={{
        width: 20, height: 20, borderRadius: "50%",
        background: "rgba(255,255,255,.25)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, fontWeight: 700, flexShrink: 0,
      }}>
        {icon}
      </span>
      <span style={{ flex: 1 }}>{toast.message}</span>
    </div>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be inside <ToastProvider>");
  return ctx;
}

/* Add this keyframe to your index.css if not already present:
   @keyframes toast-in {
     from { opacity: 0; transform: translateY(8px); }
     to   { opacity: 1; transform: none; }
   }
*/