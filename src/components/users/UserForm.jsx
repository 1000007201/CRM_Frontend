/**
 * components/users/UserForm.jsx
 *
 * Create or edit a user (Admin only).
 * Now includes department field alongside role.
 *
 * Create mode: shows password + confirm password fields.
 * Edit mode:   hides password, shows activate/deactivate toggle.
 */
import { useState } from "react";
import Modal        from "@/components/common/Modal";
import { useToast } from "@/components/common/Toast";
import { useCreateUser, useUpdateUser, useManagers } from "@/hooks/useUsers";
import { useAuth } from "@/hooks/useAuth";
import { displayRole } from "@/utils/roles";
import { PERMISSIONS } from "@/utils/permissions";
import { useIsMobile } from "@/hooks/useIsMobile";
import PhoneInput from "@/components/common/PhoneInput";

const ROLE_OPTIONS = [
  { value: "member",  label: "Member"  },
  { value: "manager", label: "Manager" },
  { value: "admin",   label: "Admin"   },
];

const DEPT_OPTIONS = [
  { value: "sales",             label: "Sales"            },
  { value: "ad_operations",    label: "Ad Operations"    },
  { value: "delivery",          label: "Delivery"         },
  { value: "technical",         label: "Technical"        },
  { value: "execution",         label: "Execution"        },
  { value: "backend_operation", label: "Backend Operations" },
  { value: "hr",                label: "HR"               },
  { value: "finance",           label: "Finance"          },
];

const ROLE_HINTS = {
  admin:   "Full access — manages all users, leads, and assignments across all departments.",
  manager: "Team Lead — manages their team's leads and can assign leads within their department.",
  member:  "Individual contributor — can add leads and view/update only leads assigned to them.",
};

const EMPTY = {
  full_name:  "",
  email:      "",
  phone:      "",
  role:       "",
  department: "",
  manager:    "",
  password:   "",
  password2:  "",
  is_active:       true,
  is_mis_approver: false,
  permissions:     [],
};

function userToForm(u) {
  return {
    full_name:  u.full_name  ?? "",
    email:      u.email      ?? "",
    phone:      u.phone      ?? "",
    role:       u.role       ?? "",
    department: u.department ?? "",
    manager:    u.manager    ?? "",
    is_active:       u.is_active       ?? true,
    is_mis_approver: u.is_mis_approver ?? false,
    permissions:     u.permissions     ?? [],
    password:        "",
    password2:       "",
  };
}

export default function UserForm({ user = null, onClose, onSaved }) {
  const isEdit    = !!user;
  const toast     = useToast();
  const isMobile  = useIsMobile();
  const { user: currentUser } = useAuth();
  const isCurrentAdmin = currentUser?.role === "admin";

  const [form,   setForm]   = useState(isEdit ? userToForm(user) : EMPTY);
  const [errors, setErrors] = useState({});

  const { data: managers = [] } = useManagers();
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();

  const set = (k, v) => {
    setForm((f) => {
      const next = { ...f, [k]: v };
      // Admin gets no department
      if (k === "role" && v === "admin") next.department = "";
      return next;
    });
    if (errors[k]) setErrors((e) => ({ ...e, [k]: "" }));
  };

  // Preview label
  const previewLabel = form.role === "admin" ? "Admin" :
    displayRole({ role: form.role, department: form.department || null });

  // ── Validation ──────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.full_name.trim()) e.full_name  = "Full name is required.";
    if (!form.email.trim())     e.email      = "Email is required.";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email.";
    if (!form.role)             e.role       = "Role is required.";
    if (form.role !== "admin" && !form.department) e.department = "Department is required.";
    if (!form.phone || !form.phone.trim()) {
      e.phone = "Phone number is required.";
    } else {
      const match = form.phone.match(/^\+?(\d+)\s+(.+)$/);
      if (!match || !match[2].trim()) e.phone = "Please enter both country code and phone number.";
    }
    if (!isEdit) {
      if (!form.password)               e.password  = "Password is required.";
      else if (form.password.length < 8) e.password  = "Minimum 8 characters.";
      if (form.password !== form.password2) e.password2 = "Passwords do not match.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit ──────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validate()) return;

    const payload = {
      full_name:  form.full_name,
      email:      form.email,
      phone:      form.phone || undefined,
      role:       form.role,
      department: form.role === "admin" ? null : (form.department || null),
      manager:    form.role === "member" ? (form.manager || null) : null,
      is_active:        form.is_active,
      is_mis_approver:  form.is_mis_approver,
      permissions_input: form.permissions || [],
    };

    if (!isEdit) {
      payload.password  = form.password;
      payload.password2 = form.password2;
    }

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: user.id, data: payload });
        toast.success("User updated!");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("User created!");
      }
      onSaved?.();
      onClose();
    } catch (err) {
      const detail = err.response?.data;

      if (typeof detail === "object" && detail !== null && !Array.isArray(detail)) {
        const fieldErrors = {};
        const unmappedErrors = [];

        const fieldMap = {
          permissions:       "permissions",
          permissions_input: "permissions",
          non_field_errors:  "_general",
          detail:            "_general",
        };

        Object.entries(detail).forEach(([key, value]) => {
          const message = Array.isArray(value) ? String(value[0]) : String(value);
          const formField = fieldMap[key] || key;
          if (formField === "_general") {
            unmappedErrors.push(message);
          } else {
            fieldErrors[formField] = message;
          }
        });

        setErrors(fieldErrors);
        if (unmappedErrors.length > 0) toast.error(unmappedErrors.join(" "));
      } else if (typeof detail === "string") {
        toast.error(detail);
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    }
  };

  const isBusy       = createMutation.isPending || updateMutation.isPending;
  const showDept     = form.role !== "admin";
  const showManager  = form.role === "member";

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? "Edit User" : "Create User"}
      subtitle={isEdit ? `Editing: ${user.full_name}` : "Add a new user to the CRM"}
      size="md"
      footer={
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={isBusy}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={isBusy}>
            {isBusy ? "Saving…" : isEdit ? "Save Changes" : "Create User"}
          </button>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {errors._general && (
          <div style={{
            padding:    "10px 12px",
            background: "#FEE2E2",
            border:     "1px solid #FCA5A5",
            borderRadius: 3,
            color:      "#991B1B",
            fontSize:   13,
          }}>
            {errors._general}
          </div>
        )}

        {/* Full name */}
        <div className="form-group">
          <label className="form-label">Full Name *</label>
          <input className="form-input" value={form.full_name}
            onChange={(e) => set("full_name", e.target.value)}
            placeholder="e.g. Anjali Mehta" autoFocus />
          {errors.full_name && <p className="form-error">{errors.full_name}</p>}
        </div>

        {/* Email */}
        <div className="form-group">
          <label className="form-label">Email *</label>
          <input className="form-input" type="email" value={form.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="anjali@company.com"
            disabled={isEdit}
            style={isEdit ? { opacity: 0.6, cursor: "not-allowed" } : {}} />
          {errors.email && <p className="form-error">{errors.email}</p>}
          {isEdit && (
            <p style={{ fontSize: 10, color: "var(--text3)", marginTop: 2 }}>
              Email cannot be changed after creation.
            </p>
          )}
        </div>

        {/* Phone */}
        <div className="form-group">
          <label className="form-label">Phone *</label>
          <PhoneInput
            value={form.phone}
            onChange={(v) => set("phone", v)}
            placeholder="00000 00000"
          />
          {errors.phone && <p className="form-error">{errors.phone}</p>}
        </div>

        {/* Role + Department side by side */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
          <div className="form-group">
            <label className="form-label">Role *</label>
            <select className="form-select" value={form.role}
              onChange={(e) => set("role", e.target.value)}>
              <option value="" disabled>— Select role —</option>
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            {errors.role && <p className="form-error">{errors.role}</p>}
          </div>

          {showDept && (
            <div className="form-group">
              <label className="form-label">Department *</label>
              <select className="form-select" value={form.department}
                onChange={(e) => set("department", e.target.value)}>
                <option value="" disabled>— Select department —</option>
                {DEPT_OPTIONS.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
              {errors.department && <p className="form-error">{errors.department}</p>}
            </div>
          )}
        </div>

        {/* Display role preview */}
        {form.role && (
          <div style={{
            display:     "flex",
            alignItems:  "center",
            gap:         8,
            padding:     "7px 12px",
            background:  "var(--surface)",
            border:      "1px solid var(--border)",
            borderRadius: 3,
          }}>
            <span style={{ fontSize: 10, color: "var(--text3)" }}>Will display as:</span>
            <span style={{
              fontSize:     11,
              fontWeight:   700,
              padding:      "1px 8px",
              borderRadius: 3,
              background:   "var(--accent-lt)",
              color:        "var(--accent)",
              border:       "1px solid #F0D080",
            }}>
              {previewLabel}
            </span>
            <span style={{ fontSize: 10, color: "var(--text3)", flex: 1, textAlign: "right" }}>
              {ROLE_HINTS[form.role]}
            </span>
          </div>
        )}

        {/* Manager assignment — members only */}
        {showManager && (
          <div className="form-group">
            <label className="form-label">Reports To</label>
            <select className="form-select" value={form.manager}
              onChange={(e) => set("manager", e.target.value)}>
              <option value="">— No manager —</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name} ({displayRole(m)})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Active toggle — edit mode only */}
        {isEdit && (
          <div style={{
            display:    "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding:    "10px 12px",
            background: form.is_active ? "#E4F8EE" : "#FCE8E8",
            border:     `1px solid ${form.is_active ? "#80D8A8" : "#F0A8A8"}`,
            borderRadius: 3,
          }}>
            <div>
              <p style={{ fontSize: 12, fontWeight: 600,
                color: form.is_active ? "#0A5A28" : "#8A1A1A" }}>
                Account {form.is_active ? "Active" : "Deactivated"}
              </p>
              <p style={{ fontSize: 10, color: "var(--text3)", marginTop: 1 }}>
                {form.is_active
                  ? "User can log in and access the CRM."
                  : "User cannot log in. All their data is preserved."}
              </p>
            </div>
            <button
              onClick={() => set("is_active", !form.is_active)}
              className={form.is_active ? "btn btn-danger btn-sm" : "btn btn-primary btn-sm"}
            >
              {form.is_active ? "Deactivate" : "Reactivate"}
            </button>
          </div>
        )}

        {/* APP toggle — Admin only */}
        {isCurrentAdmin && (
          <div style={{
            display:      "flex",
            alignItems:   "center",
            justifyContent: "space-between",
            padding:      "10px 12px",
            background:   form.is_mis_approver ? "#EEE0F8" : "var(--surface)",
            border:       `1px solid ${form.is_mis_approver ? "#B080D8" : "var(--border)"}`,
            borderRadius: 3,
            transition:   "all 0.15s",
          }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 2 }}>
                <p style={{
                  fontSize: 12, fontWeight: 700,
                  color: form.is_mis_approver ? "#6030A0" : "var(--text)",
                }}>
                  APP
                </p>
                {form.is_mis_approver && (
                  <span style={{
                    fontSize: 9, fontWeight: 800, padding: "1px 6px",
                    borderRadius: 3, background: "#6030A0", color: "#fff",
                    letterSpacing: "0.04em",
                  }}>
                    ENABLED
                  </span>
                )}
              </div>
              <p style={{ fontSize: 10, color: "var(--text3)" }}>
                {form.is_mis_approver
                  ? "Can approve or reject Advertiser and Publisher submissions."
                  : "Enable to allow this user to approve Advertiser and Publisher submissions."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => set("is_mis_approver", !form.is_mis_approver)}
              style={{
                padding:      "4px 12px",
                borderRadius: 3,
                border:       `1px solid ${form.is_mis_approver ? "#B080D8" : "var(--border2)"}`,
                background:   form.is_mis_approver ? "#6030A0" : "var(--white)",
                color:        form.is_mis_approver ? "#fff" : "var(--text3)",
                fontSize:     10,
                fontWeight:   700,
                cursor:       "pointer",
                fontFamily:   "inherit",
                transition:   "all 0.13s",
                whiteSpace:   "nowrap",
                flexShrink:   0,
              }}
            >
              {form.is_mis_approver ? "✓ Enabled" : "Enable"}
            </button>
          </div>
        )}

        {/* Permissions — Admin only */}
        {isCurrentAdmin && (
          <div style={{ marginTop: 8 }}>
            <div style={{
              fontSize: 13, fontWeight: 600,
              color: "var(--text1)", marginBottom: 12,
            }}>
              Module Access Permissions
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
              {PERMISSIONS.map(({ key, label }) => {
                const isAdminUser = form.role === "admin";
                const isChecked   = isAdminUser ? true : (form.permissions?.includes(key) ?? false);
                return (
                  <label
                    key={key}
                    style={{
                      display:    "flex",
                      alignItems: "center",
                      gap:        8,
                      cursor:     isAdminUser ? "not-allowed" : "pointer",
                      opacity:    isAdminUser ? 0.6 : 1,
                      fontSize:   13,
                      color:      "var(--text1)",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={isAdminUser}
                      onChange={() => {
                        if (isAdminUser) return;
                        const current = form.permissions || [];
                        const updated = isChecked
                          ? current.filter((p) => p !== key)
                          : [...current, key];
                        set("permissions", updated);
                      }}
                    />
                    {label}
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* Password — create mode only */}
        {!isEdit && (
          <>
            <div style={{ height: 1, background: "var(--border)", margin: "4px 0" }} />
            <div className="form-group">
              <label className="form-label">Password *</label>
              <input className="form-input" type="password" value={form.password}
                onChange={(e) => set("password", e.target.value)}
                placeholder="Minimum 8 characters" />
              {errors.password && <p className="form-error">{errors.password}</p>}
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password *</label>
              <input className="form-input" type="password" value={form.password2}
                onChange={(e) => set("password2", e.target.value)}
                placeholder="Re-enter password" />
              {errors.password2 && <p className="form-error">{errors.password2}</p>}
            </div>
          </>
        )}

      </div>
    </Modal>
  );
}