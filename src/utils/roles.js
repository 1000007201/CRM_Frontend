/**
 * utils/roles.js
 *
 * Single source of truth for role names, department names,
 * display labels, and permission checks.
 *
 * Role     = permission level (what the user can do)
 * Department = which team they belong to
 *
 * Display label = role + department combined:
 *   admin   + null      → "Admin"
 *   manager + sales     → "Sales TL"
 *   manager + hr        → "HR Manager"
 *   member  + sales     → "Sales Member"
 *   member  + finance   → "Finance Member"
 */

// ── Role constants ─────────────────────────────────────────────────────────────
export const ROLES = {
  ADMIN:   "admin",
  MANAGER: "manager",
  MEMBER:  "member",
};

// ── Department constants ───────────────────────────────────────────────────────
export const DEPARTMENTS = {
  SALES:             "sales",
  HR:                "hr",
  FINANCE:           "finance",
  OPERATIONS:        "operations",
  AD_OPERATIONS:     "ad_operations",
  DELIVERY:          "delivery",
  TECHNICAL:         "technical",
  EXECUTION:         "execution",
  BACKEND_OPERATION: "backend_operation",
};

// ── Simple role labels (fallback when no department available) ─────────────────
export const ROLE_LABELS = {
  admin:   "Admin",
  manager: "TL",
  member:  "Member",
};

// ── Department labels ──────────────────────────────────────────────────────────
export const DEPT_LABELS = {
  sales:             "Sales",
  hr:                "HR",
  finance:           "Finance",
  operations:        "Operations",
  ad_operations:     "Ad Operations",
  delivery:          "Delivery",
  technical:         "Technical",
  execution:         "Execution",
  backend_operation: "Backend Operations",
};

/**
 * displayRole(user) — human-readable role + department label.
 *
 * Uses the backend-computed display_role if available (preferred),
 * otherwise computes it client-side from role + department fields.
 *
 * Examples:
 *   { role: "admin" }                    → "Admin"
 *   { role: "manager", department: "sales" }  → "Sales TL"
 *   { role: "manager", department: "hr" }     → "HR Manager"
 *   { role: "member",  department: "sales" }  → "Sales Member"
 *   { role: "member",  department: "finance"} → "Finance Member"
 */
export const displayRole = (user) => {
  if (!user) return "";

  // Use backend-computed value if present
  if (user.display_role) return user.display_role;

  // Fallback: compute client-side
  if (user.role === ROLES.ADMIN) return "Admin";

  const deptLabel = user.department
    ? (DEPT_LABELS[user.department] ?? user.department)
    : "";

  if (user.role === ROLES.MANAGER) {
    const suffix = user.department === DEPARTMENTS.SALES ? "TL" : "Manager";
    return deptLabel ? `${deptLabel} ${suffix}` : suffix;
  }

  if (user.role === ROLES.MEMBER) {
    return deptLabel ? `${deptLabel} Member` : "Member";
  }

  return user.role;
};

// ── Permission helpers ─────────────────────────────────────────────────────────
// Each takes a user object: { role, department, id, ... }

export const isAdmin = (user) =>
  user?.role === ROLES.ADMIN;

export const isManager = (user) =>
  user?.role === ROLES.MANAGER;

export const isMember = (user) =>
  user?.role === ROLES.MEMBER;

/** Backwards-compatible alias — still works where isSalesEmployee was used */
export const isSalesEmployee = isMember;

export const isAdminOrManager = (user) =>
  isAdmin(user) || isManager(user);

/** Department helpers */
export const isSalesDept = (user) =>
  user?.department === DEPARTMENTS.SALES;

export const isHrDept = (user) =>
  user?.department === DEPARTMENTS.HR;

export const isFinanceDept = (user) =>
  user?.department === DEPARTMENTS.FINANCE;

/** Can this user assign leads to others? */
export const canAssignLeads = (user) =>
  isAdminOrManager(user);

/** Can this user create/manage other users? Admin only. */
export const canManageUsers = (user) =>
  isAdmin(user);

/** Can this user delete leads? */
export const canDeleteLeads = (user) =>
  isAdminOrManager(user);

/** Can this user see the org-wide activity log? */
export const canViewOrgActivity = (user) =>
  isAdminOrManager(user);

/** Can this user see reports/stats? */
export const canViewReports = (user) =>
  isAdminOrManager(user);