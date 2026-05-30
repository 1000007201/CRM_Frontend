/**
 * Permission utility helpers.
 * Use these instead of checking user.role or user.department directly.
 */

export const PERMISSIONS = [
  { key: "sales_crm",   label: "Sales CRM"        },
  { key: "advertisers", label: "Advertisers"       },
  { key: "publishers",  label: "Publishers"        },
  { key: "campaigns",   label: "Campaigns"         },
  { key: "users",       label: "User Management"   },
  { key: "tags",        label: "CRM Tags"          },
];

/**
 * Check if a user has a specific permission.
 * Admin always returns true.
 */
export const hasPerm = (user, permission) => {
  if (!user) return false;
  if (user.role === "admin") return true;
  return Array.isArray(user.permissions) && user.permissions.includes(permission);
};

/**
 * Check if user can approve/reject records.
 */
export const canApprove = (user) => {
  if (!user) return false;
  if (user.role === "admin") return true;
  return user.is_mis_approver === true;
};
