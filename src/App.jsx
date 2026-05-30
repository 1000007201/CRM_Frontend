/**
 * src/App.jsx
 *
 * Route tree for the full CRM.
 *
 * Modules:
 *   Sales CRM   → /dashboard, /leads, /pipeline, /tasks, /activity, /users, /bulk-upload
 *   Advertisers → /advertisers, /advertisers/:id, /publishers, /publishers/:id
 *
 * Future modules:
 *   HR          → /hr/...
 *   Finance     → /finance/...
 */
import { Routes, Route, Navigate, Outlet } from "react-router-dom";

import { useAuth }              from "@/hooks/useAuth";
import ProtectedRoute           from "@/components/layout/ProtectedRoute";
import AppLayout                from "@/components/layout/AppLayout";
import { UserFilterProvider }   from "@/context/UserFilterContext";

// ── Sales CRM pages ───────────────────────────────────────────────────────────
import LoginPage        from "@/pages/Login";
import SignupPage       from "@/pages/Signup";
import UnauthorizedPage from "@/pages/Unauthorized";
import DashboardPage    from "@/pages/Dashboard";
import LeadsPage        from "@/pages/Leads";
import LeadDetailPage   from "@/pages/LeadDetail";
import PipelinePage     from "@/pages/Pipeline";
import ActivityPage     from "@/pages/Activity";
import UsersPage        from "@/pages/Users";
import TasksPage        from "@/pages/Tasks";
import BulkUploadPage   from "@/pages/BulkUpload";

// ── Advertisers module pages ───────────────────────────────────────────────────
import AdvertisersPage      from "@/pages/Advertisers";
import AdvertiserDetailPage from "@/pages/AdvertiserDetail";
import PublishersPage       from "@/pages/Publishers";
import PublisherDetailPage  from "@/pages/PublisherDetail";

// ── Campaigns module pages ────────────────────────────────────────────────────
import CampaignsPage            from "@/pages/Campaigns";
import CampaignDetailPage       from "@/pages/CampaignDetail";
import CampaignBulkUploadPage   from "@/pages/CampaignBulkUpload";

// ── Contacts module pages ─────────────────────────────────────────────────────
import ContactsPage        from "@/pages/Contacts";

// ── Tags module pages ─────────────────────────────────────────────────────────
import TagsPage            from "@/pages/Tags";

function SmartRedirect() {
  const { user } = useAuth();
  const getHomePage = (user) => {
    if (!user) return "/login";
    if (user?.department === "operations") return "/advertisers";
    return "/dashboard";
  };
  return <Navigate to={getHomePage(user)} replace />;
}

export default function App() {
  return (
    <Routes>
      {/* ── Public ── */}
      <Route path="/login"        element={<LoginPage />} />
      <Route path="/signup"       element={<SignupPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="/"             element={<SmartRedirect />} />

      {/* ── Protected: any authenticated user ── */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>

          {/* ── Sales CRM — shared UserFilterContext ── */}
          <Route element={<UserFilterProvider><Outlet /></UserFilterProvider>}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/leads"     element={<LeadsPage />} />
            <Route path="/leads/:id" element={<LeadDetailPage />} />
            <Route path="/pipeline"  element={<PipelinePage />} />
            <Route path="/tasks"     element={<TasksPage />} />

            {/* Admin + Manager */}
            <Route element={<ProtectedRoute roles={["admin", "manager"]} />}>
              <Route path="/activity" element={<ActivityPage />} />
            </Route>

            {/* Admin only */}
            <Route element={<ProtectedRoute roles={["admin"]} />}>
              <Route path="/users" element={<UsersPage />} />
            </Route>

            {/* Admin + Manager + Member (sales_crm) */}
            <Route element={<ProtectedRoute roles={["admin", "manager", "member"]} />}>
              <Route path="/bulk-upload" element={<BulkUploadPage />} />
            </Route>
          </Route>

          {/* ── Advertisers module — all authenticated users ── */}
          {/* Sales team sees read-only view of their assigned records */}
          {/* Operations + Admin can create/edit */}
          <Route path="/advertisers"     element={<AdvertisersPage />} />
          <Route path="/advertisers/:id" element={<AdvertiserDetailPage />} />
          <Route path="/publishers"      element={<PublishersPage />} />
          <Route path="/publishers/:id"  element={<PublisherDetailPage />} />
          <Route path="/campaigns"                element={<CampaignsPage />} />
          <Route path="/campaigns/bulk-upload"    element={<CampaignBulkUploadPage />} />
          <Route path="/campaigns/:id"            element={<CampaignDetailPage />} />
          <Route path="/contacts"        element={<ContactsPage />} />
          <Route path="/tags"            element={<TagsPage />} />

        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}