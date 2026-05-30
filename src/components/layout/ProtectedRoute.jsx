/**
 * components/layout/ProtectedRoute.jsx
 *
 * Wraps a route and enforces:
 *   1. User must be authenticated (redirects to /login if not)
 *   2. Optionally: user must have one of the allowed roles
 *      (redirects to /unauthorized if role doesn't match)
 *
 * Usage:
 *   <ProtectedRoute>                          — auth only
 *   <ProtectedRoute roles={["admin"]}         — admin only
 *   <ProtectedRoute roles={["admin","manager"]} — admin or manager
 */
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export default function ProtectedRoute({ roles }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  // Still hydrating tokens from storage — render nothing yet
  if (isLoading) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: "100vh", fontFamily: "sans-serif", color: "#94a3b8",
      }}>
        Loading…
      </div>
    );
  }

  // Not authenticated → send to login, preserve intended destination
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role check — if roles array provided, user's role must be in it
  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // All good — render the child route
  return <Outlet />;
}