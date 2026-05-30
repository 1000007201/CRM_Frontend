/**
 * components/layout/AppLayout.jsx
 *
 * Layout:
 *  ┌──────────────────────────────────────────────────────┐
 *  │ 🔺 CRMX │ DASHBOARD PIPELINE LEADS TASKS ...│[User]  │ ← Navbar
 *  ├──────────────────────────────────────────────────────┤
 *  │▦ Sales  │                                            │
 *  │  CRM    │  Page content                              │ ← Body
 *  │[◀ Hide] │                                            │
 *  └──────────────────────────────────────────────────────┘
 *
 * Sidebar states:
 *   Expanded  (160px) — icon + label + "◀ Hide" button
 *   Collapsed  (48px) — icon only + tooltip on hover + "▶" button
 *
 * Responsive:
 *   Desktop  >1024px — sidebar expanded by default, collapsible
 *   iPad    768-1024 — sidebar collapsed by default
 *   Mobile    <768px — sidebar hidden, hamburger → slide drawer
 */
import { useState, useEffect, useRef } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth, useChangePassword }  from "@/hooks/useAuth";
import { isAdmin, isAdminOrManager, displayRole } from "@/utils/roles";
import { hasPerm } from "@/utils/permissions";
import { initials } from "@/utils/formatters";
import { isImpersonating, getAdminAccessToken, getUserFromToken } from "@/utils/token";
import { useSwitcherList } from "@/hooks/useUsers";
import styles            from "./AppLayout.module.css";
import NotificationBell  from "@/components/common/NotificationBell";

// ── Module definitions ────────────────────────────────────────────────────────
const MODULES = [
  {
    id:    "sales-crm",
    icon:  "📊",
    label: "Sales CRM",
    visibleFor: (user) => hasPerm(user, "sales_crm") || hasPerm(user, "tags"),
    nav: [
      { to: "/dashboard",   label: "Dashboard",   visibleFor: (u) => hasPerm(u, "sales_crm") },
      { to: "/leads",       label: "Leads",       visibleFor: (u) => hasPerm(u, "sales_crm") },
      { to: "/pipeline",    label: "Pipeline",    visibleFor: (u) => hasPerm(u, "sales_crm") },
      { to: "/tasks",       label: "Tasks",       visibleFor: (u) => hasPerm(u, "sales_crm") },
      { to: "/activity",    label: "Activity",    visibleFor: (u) => hasPerm(u, "sales_crm"), roles: ["admin", "manager"] },
      { to: "/tags",        label: "CRM Tags",    visibleFor: (u) => hasPerm(u, "tags") },
      { to: "/bulk-upload", label: "Bulk Upload", visibleFor: (u) => hasPerm(u, "sales_crm") },
    ],
  },
  {
    id:    "contacts",
    icon:  "📇",
    label: "Contacts",
    visibleFor: (user) => hasPerm(user, "advertisers"),
    nav: [
      { to: "/contacts", label: "Contacts", roles: null },
    ],
  },
  {
    id:    "advertisers",
    icon:  "📢",
    label: "Advertisers",
    visibleFor: (user) => hasPerm(user, "advertisers"),
    nav: [
      { to: "/advertisers", label: "Advertisers", roles: null },
    ],
  },
  {
    id:    "publishers",
    icon:  "🤝",
    label: "Publishers",
    visibleFor: (user) => hasPerm(user, "publishers"),
    nav: [
      { to: "/publishers", label: "Publishers", roles: null },
    ],
  },
  {
    id:    "campaigns",
    icon:  "📋",
    label: "Campaigns",
    visibleFor: (user) => hasPerm(user, "campaigns"),
    nav: [
      { to: "/campaigns", label: "Campaigns", roles: null },
    ],
  },
  {
    id:    "users",
    icon:  "👥",
    label: "Users",
    visibleFor: (user) => hasPerm(user, "users"),
    nav: [
      { to: "/users", label: "Users", roles: ["admin"] },
    ],
  },
];

// ---Image URL--------

const IMAGE_URL = "/images/NimaDesk.jpg";

// Avatar warm palette
const PALETTE = [
  { bg: "#FDF0D8", color: "#A06010" },
  { bg: "#E0EEFA", color: "#1A60A8" },
  { bg: "#E0F8EC", color: "#0A7838" },
  { bg: "#EEE0F8", color: "#6030A0" },
];

function avatarStyle(name = "") {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return PALETTE[Math.abs(h) % PALETTE.length];
}

function roleColor(role) {
  return { admin: "#7A7A6E", manager: "#E08818", member: "#1A60A8" }[role] ?? "#9A9A8E";
}

// Detect iPad on initial load
const isIpad = () =>
  typeof window !== "undefined" && window.innerWidth >= 768 && window.innerWidth <= 1024;

export default function AppLayout() {
  const { user, logout, switchToUser } = useAuth();
  const navigate          = useNavigate();
  const location          = useLocation();
  const { data: switcherUsers, isLoading: switcherLoading } = useSwitcherList();

  // Determine active module from current route
  const activeModuleId =
    location.pathname.startsWith("/advertisers")
      ? "advertisers"
      : location.pathname.startsWith("/publishers")
      ? "publishers"
      : location.pathname.startsWith("/campaigns")
      ? "campaigns"
      : location.pathname.startsWith("/users")
      ? "users"
      : location.pathname.startsWith("/contacts")
      ? "contacts"
      : location.pathname.startsWith("/tags")
      ? "sales-crm"
      : "sales-crm";

  const visibleModules = MODULES.filter(
    (mod) => mod.visibleFor?.(user) ?? true
  );

  const activeModule =
    visibleModules.find((m) => m.id === activeModuleId) ??
    visibleModules[0];
  // NOTE: early return for empty visibleModules is placed AFTER all hooks
  // below so React's hook call count stays stable across renders (e.g. during
  // admin → employee impersonation).

  // ── Sidebar collapse ──────────────────────────────────────────────────────
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try {
      const saved = localStorage.getItem("sidebar_open");
      if (saved !== null) return saved === "true";
    } catch {}
    return !isIpad();  // collapsed by default on iPad
  });

  const toggleSidebar = () => {
    setSidebarOpen((v) => {
      const next = !v;
      try { localStorage.setItem("sidebar_open", String(next)); } catch {}
      return next;
    });
  };

  // ── Mobile breakpoint detection ───────────────────────────────────────────
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" && window.innerWidth < 768
  );
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  // ── Mobile drawer ─────────────────────────────────────────────────────────
  const [drawerOpen,           setDrawerOpen]           = useState(false);
  const [expandedModuleId,     setExpandedModuleId]     = useState(null);
  const [switchUserPanelOpen,  setSwitchUserPanelOpen]  = useState(false);

  // Close drawer + reset mobile sub-state on route change
  useEffect(() => {
    setDrawerOpen(false);
    setExpandedModuleId(null);
    setSwitchUserPanelOpen(false);
  }, [location.pathname]);

  // Reset drawer sub-state whenever drawer closes
  useEffect(() => {
    if (!drawerOpen) {
      setExpandedModuleId(null);
      setSwitchUserPanelOpen(false);
    }
  }, [drawerOpen]);

  // ── User dropdown ─────────────────────────────────────────────────────────
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // ── Change password ───────────────────────────────────────────────────────
  const [changePwOpen, setChangePwOpen] = useState(false);
  const [pwForm,    setPwForm]    = useState({ current: "", new: "", confirm: "" });
  const [pwErrors,  setPwErrors]  = useState({});
  const [showPw,    setShowPw]    = useState({ current: false, new: false, confirm: false });
  const [pwSuccess, setPwSuccess] = useState(false);
  const changePwMutation = useChangePassword();

  const handlePwClose = () => {
    setChangePwOpen(false);
    setPwForm({ current: "", new: "", confirm: "" });
    setPwErrors({});
    setShowPw({ current: false, new: false, confirm: false });
    setPwSuccess(false);
    changePwMutation.reset();
  };

  const handlePwSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!pwForm.current)             errs.current = "Required";
    if (!pwForm.new)                 errs.new     = "Required";
    else if (pwForm.new.length < 8)  errs.new     = "Minimum 8 characters";
    if (!pwForm.confirm)             errs.confirm = "Required";
    else if (pwForm.new !== pwForm.confirm) errs.confirm = "Passwords do not match";
    if (Object.keys(errs).length) { setPwErrors(errs); return; }

    try {
      await changePwMutation.mutateAsync({ old_password: pwForm.current, new_password: pwForm.new });
      setPwSuccess(true);
    } catch (err) {
      const detail = err?.response?.data;
      if (typeof detail === "object") {
        const mapped = {};
        if (detail.old_password) mapped.current = Array.isArray(detail.old_password) ? detail.old_password[0] : detail.old_password;
        if (detail.new_password) mapped.new     = Array.isArray(detail.new_password) ? detail.new_password[0] : detail.new_password;
        if (detail.detail)       mapped._general = detail.detail;
        setPwErrors(mapped);
      } else {
        setPwErrors({ _general: "Something went wrong. Please try again." });
      }
    }
  };

  useEffect(() => {
    const handle = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  // ── Early return AFTER all hooks have been called ────────────────────────
  // (placed here so hook count stays stable when user switches identity)
  if (!visibleModules.length || !activeModule) return null;

  const handleLogout = async () => {
    setDropdownOpen(false);
    setDrawerOpen(false);
    await logout();
    navigate("/login", { replace: true });
  };

  const handleBackToAdmin = () => {
    const adminToken = getAdminAccessToken();
    if (!adminToken) return;
    const adminUser = getUserFromToken(adminToken);
    if (adminUser?.id) switchToUser(adminUser.id);
  };

  const visibleNav = activeModule.nav.filter((item) => {
    if (item.visibleFor && !item.visibleFor(user)) return false;
    if (item.roles && !item.roles.includes(user?.role)) return false;
    return true;
  });

  const av = avatarStyle(user?.full_name);

  // ── Change Password Modal — shared JSX (used by both mobile + desktop) ────
  const changePwModal = changePwOpen && (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: "20px 24px 0", borderBottom: "1px solid var(--border)", paddingBottom: 16, marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Change Password</h3>
        </div>
        {pwSuccess ? (
          <div style={{ padding: "24px", textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <p style={{ fontSize: 15, fontWeight: 600, margin: "0 0 6px" }}>Password updated!</p>
            <p style={{ fontSize: 13, color: "var(--text3)", margin: "0 0 24px" }}>Your password has been changed successfully.</p>
            <button
              onClick={handlePwClose}
              style={{
                padding: "8px 24px", background: "var(--accent)", border: "none",
                borderRadius: 4, color: "#fff", fontWeight: 600, cursor: "pointer",
                fontSize: 13, fontFamily: "inherit",
              }}
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handlePwSubmit} style={{ padding: "0 24px 24px" }}>
            {pwErrors._general && (
              <div style={{
                background: "#FDE8E8", border: "1px solid #F5C6C6", borderRadius: 4,
                color: "#C04040", fontSize: 13, padding: "8px 12px", marginBottom: 16,
              }}>
                {pwErrors._general}
              </div>
            )}
            {[
              { key: "current", label: "Current Password" },
              { key: "new",     label: "New Password" },
              { key: "confirm", label: "Confirm New Password" },
            ].map(({ key, label }) => (
              <div key={key} style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text2)", marginBottom: 4 }}>
                  {label}
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPw[key] ? "text" : "password"}
                    value={pwForm[key]}
                    onChange={(e) => { setPwForm((f) => ({ ...f, [key]: e.target.value })); setPwErrors((er) => ({ ...er, [key]: undefined })); }}
                    style={{
                      width: "100%", boxSizing: "border-box",
                      padding: "8px 36px 8px 10px",
                      border: `1px solid ${pwErrors[key] ? "#C04040" : "var(--border)"}`,
                      borderRadius: 4, fontSize: 13, fontFamily: "inherit",
                      background: "var(--surface)", color: "var(--text)",
                      outline: "none",
                    }}
                    autoComplete={key === "current" ? "current-password" : "new-password"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => ({ ...s, [key]: !s[key] }))}
                    style={{
                      position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                      background: "none", border: "none", cursor: "pointer",
                      fontSize: 14, color: "var(--text3)", padding: 0, lineHeight: 1,
                    }}
                    tabIndex={-1}
                  >
                    {showPw[key] ? "🙈" : "👁"}
                  </button>
                </div>
                {pwErrors[key] && (
                  <p style={{ margin: "4px 0 0", fontSize: 11, color: "#C04040" }}>{pwErrors[key]}</p>
                )}
              </div>
            ))}
            <div className="modal-footer" style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                type="button"
                onClick={handlePwClose}
                style={{
                  padding: "8px 16px", background: "none",
                  border: "1px solid var(--border)", borderRadius: 4,
                  fontSize: 13, cursor: "pointer", fontFamily: "inherit", color: "var(--text)",
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={changePwMutation.isPending}
                style={{
                  padding: "8px 20px", background: "var(--accent)", border: "none",
                  borderRadius: 4, color: "#fff", fontWeight: 600,
                  fontSize: 13, cursor: changePwMutation.isPending ? "not-allowed" : "pointer",
                  fontFamily: "inherit", opacity: changePwMutation.isPending ? 0.7 : 1,
                }}
              >
                {changePwMutation.isPending ? "Saving…" : "Update Password"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );

  // ── MOBILE LAYOUT ─────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <>
        {/* Mobile shell */}
        <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
          {/* Top bar */}
          <header style={{
            position:   "sticky",
            top:        0,
            zIndex:     50,
            height:     56,
            background: "var(--white)",
            borderBottom: "1px solid var(--border)",
            display:    "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding:    "0 16px",
          }}>
            <button
              onClick={() => setDrawerOpen(true)}
              style={{
                width: 44, height: 44, border: "none", background: "none",
                fontSize: 22, cursor: "pointer", padding: 0, color: "var(--text)",
                fontFamily: "inherit",
              }}
              aria-label="Open menu"
            >
              ☰
            </button>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>
              SuperAd Media CRM
            </div>
            <button
              onClick={() => setDrawerOpen(true)}
              style={{
                width: 36, height: 36, borderRadius: "50%",
                background: av.bg, color: av.color,
                border: "none", fontSize: 13, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
              aria-label="Open menu"
            >
              {initials(user?.full_name)}
            </button>
          </header>

          {/* Impersonation banner */}
          {isImpersonating() && (
            <div style={{
              background:   "#FDF3DC",
              borderBottom: "1px solid #E0B84A",
              color:        "#7A5800",
              fontSize:     12,
              padding:      "8px 16px",
              display:      "flex",
              alignItems:   "center",
              justifyContent: "space-between",
              flexWrap:     "wrap",
              gap:          8,
            }}>
              <span style={{ flex: 1, minWidth: 0 }}>
                👁 Viewing as {user?.full_name}
              </span>
              <button
                onClick={handleBackToAdmin}
                style={{
                  background:   "none",
                  border:       "1px solid #E0B84A",
                  borderRadius: 3,
                  color:        "#7A5800",
                  fontSize:     11,
                  padding:      "4px 10px",
                  cursor:       "pointer",
                  minHeight:    32,
                  flexShrink:   0,
                  fontFamily:   "inherit",
                }}
              >
                ← Back to Admin
              </button>
            </div>
          )}

          {/* Main content */}
          <main style={{ padding: "12px" }}>
            <Outlet />
          </main>
        </div>

        {/* Drawer + Switch User Panel */}
        {drawerOpen && (
          <>
            {/* Backdrop */}
            <div
              onClick={() => setDrawerOpen(false)}
              style={{
                position:   "fixed",
                inset:      0,
                background: "rgba(0,0,0,0.45)",
                zIndex:     90,
              }}
            />

            {/* Drawer */}
            <aside style={{
              position:   "fixed",
              top:        0,
              left:       0,
              bottom:     0,
              width:      280,
              maxWidth:   "85vw",
              background: "var(--white)",
              zIndex:     100,
              display:    "flex",
              flexDirection: "column",
              boxShadow:  "2px 0 8px rgba(0,0,0,0.15)",
              animation:  "slideIn 0.2s ease-out",
            }}>
              {/* Drawer header */}
              <div style={{
                padding:    "16px 20px",
                borderBottom: "1px solid var(--border)",
                fontWeight: 700,
                fontSize:   16,
                color:      "var(--text)",
              }}>
                SuperAd Media CRM
              </div>

              {/* Module list */}
              <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
                {visibleModules.map((mod) => (
                  <MobileModuleItem
                    key={mod.id}
                    module={mod}
                    user={user}
                    isActive={activeModuleId === mod.id}
                    expanded={expandedModuleId === mod.id}
                    onToggleExpand={() =>
                      setExpandedModuleId(expandedModuleId === mod.id ? null : mod.id)
                    }
                    onNavigate={(path) => {
                      navigate(path);
                      setDrawerOpen(false);
                    }}
                  />
                ))}
              </div>

              {/* Bottom user section */}
              <div style={{
                borderTop: "1px solid var(--border)",
                padding:   "12px",
                background: "var(--surface)",
              }}>
                <div style={{
                  display:    "flex",
                  alignItems: "center",
                  gap:        10,
                  padding:    "8px 4px",
                  marginBottom: 8,
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%",
                    background: av.bg, color: av.color,
                    fontSize: 12, fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    {initials(user?.full_name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 13, fontWeight: 600, color: "var(--text)",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {user?.full_name}
                    </div>
                    <div style={{
                      fontSize: 11, color: "var(--text3)",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {user?.email}
                    </div>
                  </div>
                </div>

                <MobileDrawerAction
                  icon="🔑"
                  label="Change Password"
                  onClick={() => {
                    setChangePwOpen(true);
                    setDrawerOpen(false);
                  }}
                />

                {(user?.role === "admin" || isImpersonating()) && (
                  <MobileDrawerAction
                    icon="🔄"
                    label="Switch User"
                    rightIcon="▸"
                    onClick={() => setSwitchUserPanelOpen(true)}
                  />
                )}

                <MobileDrawerAction
                  icon="⏻"
                  label="Logout"
                  onClick={handleLogout}
                  danger
                />
              </div>
            </aside>

            {/* Switch User Sub-Panel */}
            {switchUserPanelOpen && (
              <MobileSwitchUserPanel
                users={switcherUsers}
                loading={switcherLoading}
                currentUser={user}
                onSelect={(u) => {
                  switchToUser(u.id);
                  setSwitchUserPanelOpen(false);
                  setDrawerOpen(false);
                }}
                onBack={() => setSwitchUserPanelOpen(false)}
              />
            )}
          </>
        )}

        {/* Change password modal */}
        {changePwModal}
      </>
    );
  }

  return (
    <div className={styles.shell}>

      {/* ── TOP NAVBAR ── */}
      <header className={styles.navbar}>

        {/* Hamburger — mobile only */}
        <button
          className={styles.hamburger}
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
        >
          ☰
        </button>

        {/* Logo */}
        <div className={styles.logo}>
          <img src={IMAGE_URL} alt="CRMX" className={styles.logoMark}/>
          {/* <div className={styles.logoMark}>
            <svg width="22" height="20" viewBox="0 0 22 20">
              <polygon points="11,0 22,20 0,20" fill="none" stroke="#7A7A6E" strokeWidth="2.5"/>
              <polygon points="11,0 22,20 11,20" fill="#E08818" opacity="0.9"/>
            </svg>
          </div>
          <span className={styles.logoName}>CRM<strong>X</strong></span> */}
        </div>

        {/* Nav tabs — hidden when module has only one item */}
        <nav className={styles.navTabs}>
          {visibleNav.length > 1 && visibleNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [styles.navTab, isActive ? styles.navTabActive : ""].join(" ")
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Notification bell */}
        <NotificationBell />

        {/* User dropdown */}
        <div className={styles.navRight} ref={dropdownRef}>
          <button
            className={styles.userBtn}
            onClick={() => setDropdownOpen((v) => !v)}
          >
            <div
              className={styles.userAvatar}
              style={{ background: av.bg, color: av.color }}
            >
              {initials(user?.full_name)}
            </div>
            <div className={styles.userMeta}>
              <span className={styles.userName}>{user?.full_name}</span>
              <span
                className={styles.rolePill}
                style={{
                  background: roleColor(user?.role) + "18",
                  color:      roleColor(user?.role),
                  border:     `1px solid ${roleColor(user?.role)}44`,
                }}
              >
                {displayRole(user)}
              </span>
            </div>
            <span className={styles.chevron}>▾</span>
          </button>

          {dropdownOpen && (
            <div className={styles.userDropdown}>
              <div className={styles.dropdownItem}>
                <div
                  className={styles.userAvatar}
                  style={{ background: av.bg, color: av.color, width: 32, height: 32, fontSize: 12 }}
                >
                  {initials(user?.full_name)}
                </div>
                <div>
                  <p className={styles.dropdownItemName}>{user?.full_name}</p>
                  <p className={styles.dropdownItemRole}>{user?.email}</p>
                </div>
              </div>
              <div className={styles.dropdownDivider} />

              <button
                className={styles.logoutItem}
                style={{ color: "var(--text)" }}
                onClick={() => { setDropdownOpen(false); setChangePwOpen(true); }}
              >
                🔑 &nbsp;Change Password
              </button>

              <div className={styles.dropdownDivider} />

              {/* ── User switcher (admin only) ── */}
              {(user?.role === "admin" || isImpersonating()) && (
                <>
                  <div style={{
                    padding:       "6px 12px 4px",
                    fontSize:      11,
                    color:         "var(--text3)",
                    fontWeight:    600,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}>
                    Switch to user
                  </div>

                  <div style={{ maxHeight: 240, overflowY: "auto" }}>
                    {switcherLoading && (
                      <div style={{ padding: "8px 12px", fontSize: 12, color: "var(--text3)" }}>
                        Loading...
                      </div>
                    )}

                    {["admin", "manager", "other"].map((group) => {
                      const groupUsers = (switcherUsers || []).filter((u) =>
                        group === "other"
                          ? u.role !== "admin" && u.role !== "manager"
                          : u.role === group
                      );
                      if (!groupUsers.length) return null;
                      return (
                        <div key={group}>
                          {groupUsers.map((u) => {
                            const isActive = u.id === user?.id;
                            const uAv = avatarStyle(u.full_name);
                            return (
                              <button
                                key={u.id}
                                onClick={() => { switchToUser(u.id); setDropdownOpen(false); }}
                                style={{
                                  width:      "100%",
                                  display:    "flex",
                                  alignItems: "center",
                                  gap:        8,
                                  padding:    "6px 12px",
                                  background: isActive ? "var(--accent)18" : "none",
                                  border:     "none",
                                  cursor:     "pointer",
                                  textAlign:  "left",
                                  fontFamily: "inherit",
                                }}
                              >
                                <div style={{
                                  width:          24,
                                  height:         24,
                                  borderRadius:   "50%",
                                  background:     uAv.bg,
                                  color:          uAv.color,
                                  fontSize:       10,
                                  fontWeight:     700,
                                  display:        "flex",
                                  alignItems:     "center",
                                  justifyContent: "center",
                                  flexShrink:     0,
                                }}>
                                  {initials(u.full_name)}
                                </div>
                                <span style={{
                                  fontSize:   13,
                                  fontWeight: isActive ? 700 : 400,
                                  color:      "var(--text)",
                                  flex:       1,
                                }}>
                                  {u.full_name}
                                </span>
                                <span style={{
                                  fontSize:   10,
                                  padding:    "1px 6px",
                                  borderRadius: 10,
                                  background: roleColor(u.role) + "18",
                                  color:      roleColor(u.role),
                                  border:     `1px solid ${roleColor(u.role)}44`,
                                }}>
                                  {u.role}
                                </span>
                              </button>
                            );
                          })}
                          <div style={{ height: 1, background: "var(--border)", margin: "2px 0" }} />
                        </div>
                      );
                    })}
                  </div>

                  <div className={styles.dropdownDivider} />
                </>
              )}

              <button className={styles.logoutItem} onClick={handleLogout}>
                ⏻ &nbsp;Logout
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ── IMPERSONATION BANNER ── */}
      {isImpersonating() && (
        <div style={{
          background:    "#FDF3DC",
          borderBottom:  "1px solid #E0B84A",
          color:         "#7A5800",
          fontSize:      12,
          padding:       "6px 20px",
          display:       "flex",
          alignItems:    "center",
          justifyContent: "space-between",
        }}>
          <span>👁 Viewing as {user?.full_name} ({displayRole(user)})</span>
          <button
            onClick={handleBackToAdmin}
            style={{
              background:   "none",
              border:       "1px solid #E0B84A",
              borderRadius: 3,
              color:        "#7A5800",
              fontSize:     11,
              padding:      "2px 8px",
              cursor:       "pointer",
              fontFamily:   "inherit",
            }}
          >
            ← Back to Admin
          </button>
        </div>
      )}

      {/* ── BODY ── */}
      <div className={styles.body}>

        {/* ── MODULE SIDEBAR ── */}
        <aside
          className={[
            styles.sidebar,
            !sidebarOpen ? styles.sidebarCollapsed : "",
            !sidebarOpen ? styles.showTooltip : "",
          ].join(" ")}
        >
          {/* Module items */}
          <div className={styles.moduleList}>
            {visibleModules.map((mod) => (
              <button
                key={mod.id}
                onClick={() => navigate(mod.nav[0]?.to ?? "/")}
                className={[
                  sidebarOpen ? styles.moduleItem : styles.moduleItemCollapsed,
                  mod.id === activeModuleId ? styles.moduleItemActive : "",
                ].join(" ")}
                data-tooltip={mod.label}
                title={mod.label}
              >
                <span className={styles.moduleIcon}>{mod.icon}</span>
                <span className={styles.moduleLabel}>{mod.label}</span>
              </button>
            ))}
          </div>

          {/* Collapse toggle — always visible */}
          <button
            className={styles.collapseBtn}
            onClick={toggleSidebar}
            title={sidebarOpen ? "Collapse panel" : "Expand panel"}
          >
            <span className={styles.collapseBtnIcon}>
              {sidebarOpen ? "◀" : "▶"}
            </span>
            <span className={styles.collapseBtnLabel}>
              {sidebarOpen ? "Hide" : ""}
            </span>
          </button>
        </aside>

        {/* ── MAIN CONTENT ── */}
        <main className={styles.main}>
          <Outlet />
        </main>
      </div>

      {/* ── MOBILE DRAWER OVERLAY ── */}
      {drawerOpen && (
        <div
          className={styles.drawerOverlay}
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* ── CHANGE PASSWORD MODAL ── */}
      {changePwOpen && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: "20px 24px 0", borderBottom: "1px solid var(--border)", paddingBottom: 16, marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Change Password</h3>
            </div>

            {pwSuccess ? (
              <div style={{ padding: "24px", textAlign: "center" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                <p style={{ fontSize: 15, fontWeight: 600, margin: "0 0 6px" }}>Password updated!</p>
                <p style={{ fontSize: 13, color: "var(--text3)", margin: "0 0 24px" }}>Your password has been changed successfully.</p>
                <button
                  onClick={handlePwClose}
                  style={{
                    padding: "8px 24px", background: "var(--accent)", border: "none",
                    borderRadius: 4, color: "#fff", fontWeight: 600, cursor: "pointer",
                    fontSize: 13, fontFamily: "inherit",
                  }}
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handlePwSubmit} style={{ padding: "0 24px 24px" }}>
                {pwErrors._general && (
                  <div style={{
                    background: "#FDE8E8", border: "1px solid #F5C6C6", borderRadius: 4,
                    color: "#C04040", fontSize: 13, padding: "8px 12px", marginBottom: 16,
                  }}>
                    {pwErrors._general}
                  </div>
                )}

                {[
                  { key: "current", label: "Current Password" },
                  { key: "new",     label: "New Password" },
                  { key: "confirm", label: "Confirm New Password" },
                ].map(({ key, label }) => (
                  <div key={key} style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text2)", marginBottom: 4 }}>
                      {label}
                    </label>
                    <div style={{ position: "relative" }}>
                      <input
                        type={showPw[key] ? "text" : "password"}
                        value={pwForm[key]}
                        onChange={(e) => { setPwForm((f) => ({ ...f, [key]: e.target.value })); setPwErrors((er) => ({ ...er, [key]: undefined })); }}
                        style={{
                          width: "100%", boxSizing: "border-box",
                          padding: "8px 36px 8px 10px",
                          border: `1px solid ${pwErrors[key] ? "#C04040" : "var(--border)"}`,
                          borderRadius: 4, fontSize: 13, fontFamily: "inherit",
                          background: "var(--surface)", color: "var(--text)",
                          outline: "none",
                        }}
                        autoComplete={key === "current" ? "current-password" : "new-password"}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw((s) => ({ ...s, [key]: !s[key] }))}
                        style={{
                          position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                          background: "none", border: "none", cursor: "pointer",
                          fontSize: 14, color: "var(--text3)", padding: 0, lineHeight: 1,
                        }}
                        tabIndex={-1}
                      >
                        {showPw[key] ? "🙈" : "👁"}
                      </button>
                    </div>
                    {pwErrors[key] && (
                      <p style={{ margin: "4px 0 0", fontSize: 11, color: "#C04040" }}>{pwErrors[key]}</p>
                    )}
                  </div>
                ))}

                <div className="modal-footer" style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
                  <button
                    type="button"
                    onClick={handlePwClose}
                    style={{
                      padding: "8px 16px", background: "none",
                      border: "1px solid var(--border)", borderRadius: 4,
                      fontSize: 13, cursor: "pointer", fontFamily: "inherit", color: "var(--text)",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={changePwMutation.isPending}
                    style={{
                      padding: "8px 20px", background: "var(--accent)", border: "none",
                      borderRadius: 4, color: "#fff", fontWeight: 600,
                      fontSize: 13, cursor: changePwMutation.isPending ? "not-allowed" : "pointer",
                      fontFamily: "inherit", opacity: changePwMutation.isPending ? 0.7 : 1,
                    }}
                  >
                    {changePwMutation.isPending ? "Saving…" : "Update Password"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── MOBILE DRAWER ── */}
      <div className={[styles.drawer, drawerOpen ? styles.drawerOpen : ""].join(" ")}>
        <div className={styles.drawerHeader}>
          <svg width="22" height="20" viewBox="0 0 22 20">
            <polygon points="11,0 22,20 0,20" fill="none" stroke="#7A7A6E" strokeWidth="2.5"/>
            <polygon points="11,0 22,20 11,20" fill="#E08818" opacity="0.9"/>
          </svg>
          <span className={styles.logoName}>CRM<strong>X</strong></span>
        </div>

        <nav className={styles.drawerNav}>
          {visibleNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setDrawerOpen(false)}
              className={({ isActive }) =>
                [styles.drawerNavItem, isActive ? styles.drawerNavItemActive : ""].join(" ")
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div style={{ marginTop: "auto", padding: "12px 16px", borderTop: "1px solid var(--border)" }}>
          <button
            onClick={handleLogout}
            style={{
              width: "100%", padding: "8px",
              background: "#180808", border: "1px solid #401010",
              borderRadius: 3, color: "#C04040",
              fontSize: 12, cursor: "pointer",
              fontFamily: "inherit", fontWeight: 500,
            }}
          >
            ⏻ Logout
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Mobile helper components ─────────────────────────────────────────────────

function MobileModuleItem({ module, user, isActive, expanded, onToggleExpand, onNavigate }) {
  const navItems = module.nav.filter((n) => {
    if (n.visibleFor && !n.visibleFor(user)) return false;
    if (n.roles && !n.roles.includes(user?.role)) return false;
    return true;
  });
  const hasMultipleNavs = navItems.length > 1;

  return (
    <div>
      <div
        onClick={() => {
          if (hasMultipleNavs) onToggleExpand();
          else if (navItems[0]) onNavigate(navItems[0].to);
        }}
        style={{
          display:    "flex",
          alignItems: "center",
          gap:        12,
          padding:    "14px 20px",
          minHeight:  48,
          background: isActive ? "var(--accent-lt)" : "transparent",
          borderLeft: isActive ? "3px solid var(--accent)" : "3px solid transparent",
          cursor:     "pointer",
          fontSize:   14,
          fontWeight: isActive ? 600 : 500,
          color:      isActive ? "var(--accent)" : "var(--text)",
        }}
      >
        <span style={{ fontSize: 18 }}>{module.icon}</span>
        <span style={{ flex: 1 }}>{module.label}</span>
        {hasMultipleNavs && (
          <span style={{
            fontSize: 12,
            transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 0.15s",
            display: "inline-block",
          }}>
            ▸
          </span>
        )}
      </div>

      {hasMultipleNavs && expanded && (
        <div style={{ background: "var(--surface)" }}>
          {navItems.map((n) => (
            <div
              key={n.to}
              onClick={() => onNavigate(n.to)}
              style={{
                padding:   "12px 20px 12px 52px",
                minHeight: 44,
                fontSize:  13,
                color:     "var(--text2)",
                cursor:    "pointer",
              }}
            >
              {n.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MobileDrawerAction({ icon, label, rightIcon, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      style={{
        width:      "100%",
        display:    "flex",
        alignItems: "center",
        gap:        12,
        padding:    "10px 12px",
        minHeight:  44,
        background: "none",
        border:     "none",
        borderRadius: 3,
        cursor:     "pointer",
        fontSize:   13,
        color:      danger ? "#C04040" : "var(--text)",
        textAlign:  "left",
        fontFamily: "inherit",
      }}
    >
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {rightIcon && <span style={{ fontSize: 12, color: "var(--text3)" }}>{rightIcon}</span>}
    </button>
  );
}

function MobileSwitchUserPanel({ users, loading, currentUser, onSelect, onBack }) {
  const grouped = {
    admin:   (users || []).filter((u) => u.role === "admin"),
    manager: (users || []).filter((u) => u.role === "manager"),
    other:   (users || []).filter((u) => u.role !== "admin" && u.role !== "manager"),
  };

  return (
    <aside style={{
      position:   "fixed",
      top:        0,
      left:       0,
      bottom:     0,
      width:      280,
      maxWidth:   "85vw",
      background: "var(--white)",
      zIndex:     110,
      display:    "flex",
      flexDirection: "column",
      boxShadow:  "2px 0 8px rgba(0,0,0,0.15)",
      animation:  "slideIn 0.2s ease-out",
    }}>
      <div style={{
        display:    "flex",
        alignItems: "center",
        gap:        12,
        padding:    "12px 16px",
        borderBottom: "1px solid var(--border)",
        minHeight:  56,
      }}>
        <button
          onClick={onBack}
          style={{
            width: 36, height: 36, border: "none", background: "none",
            fontSize: 18, cursor: "pointer", padding: 0, color: "var(--text)",
            fontFamily: "inherit",
          }}
          aria-label="Back"
        >
          ←
        </button>
        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>
          Switch User
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {loading && (
          <div style={{ padding: "16px", fontSize: 12, color: "var(--text3)" }}>
            Loading…
          </div>
        )}

        {!loading && Object.entries(grouped).map(([group, list]) => {
          if (!list.length) return null;
          const groupLabel =
            group === "admin"   ? "Admins"   :
            group === "manager" ? "Managers" :
                                  "Members";
          return (
            <div key={group}>
              <div style={{
                padding:       "12px 16px 4px",
                fontSize:      10,
                fontWeight:    700,
                color:         "var(--text3)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}>
                {groupLabel}
              </div>
              {list.map((u) => {
                const isActive = u.id === currentUser?.id;
                const uAv = avatarStyle(u.full_name);
                return (
                  <button
                    key={u.id}
                    onClick={() => onSelect(u)}
                    style={{
                      width:      "100%",
                      display:    "flex",
                      alignItems: "center",
                      gap:        10,
                      padding:    "12px 16px",
                      minHeight:  56,
                      background: isActive ? "var(--accent-lt)" : "none",
                      border:     "none",
                      cursor:     "pointer",
                      textAlign:  "left",
                      fontFamily: "inherit",
                    }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%",
                      background: uAv.bg, color: uAv.color,
                      fontSize: 12, fontWeight: 700,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}>
                      {initials(u.full_name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13,
                        fontWeight: isActive ? 700 : 500,
                        color: "var(--text)",
                      }}>
                        {u.full_name}
                        {isActive && (
                          <span style={{
                            marginLeft: 6,
                            fontSize:   10,
                            color:      "var(--accent)",
                          }}>
                            ✓ current
                          </span>
                        )}
                      </div>
                      <div style={{
                        fontSize: 11,
                        color:    "var(--text3)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}>
                        {u.role}{u.department ? ` · ${u.department}` : ""}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </aside>
  );
}