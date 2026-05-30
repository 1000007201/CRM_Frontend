/**
 * pages/Dashboard.jsx
 *
 * Role-aware dashboard. User filter is shared via UserFilterContext.
 *
 * Selection modes (driven by UserFilterBar):
 *   Nothing selected  — default view (org-wide for admin, team for manager, own for member)
 *   Single user       — that user's leads / tasks / activity
 *   Multiple users    — combined filter passed as assigned_to
 */
import { useMemo }     from "react";
import { useNavigate } from "react-router-dom";
import { useAuth }     from "@/hooks/useAuth";
import { useLeadStats, useLeads, useMyLeads } from "@/hooks/useLeads";
import { useRecentActivity, useUserActivity } from "@/hooks/useActivity";
import { useWorkload }                        from "@/hooks/useAssignments";
import { useTasks, useOverdueTasks,
         useUpcomingTasks }                   from "@/hooks/useTasks";
import { isAdmin, isAdminOrManager,
         displayRole }                        from "@/utils/roles";
import { useUserFilter }                      from "@/context/UserFilterContext";

import StatCard            from "@/components/dashboard/StatCard";
import PipelineOverview    from "@/components/dashboard/PipelineOverview";
import RecentLeads         from "@/components/dashboard/RecentLeads";
import ActivityFeed        from "@/components/dashboard/ActivityFeed";
import TeamWorkload        from "@/components/dashboard/TeamWorkload";
import UnassignedAlert     from "@/components/dashboard/UnassignedAlert";
import TaskDashboardWidget from "@/components/dashboard/TaskDashboardWidget";
import UserFilterBar       from "@/components/common/UserFilterBar";

const toArr = (d) => Array.isArray(d) ? d : (d?.results ?? []);

export default function DashboardPage() {
  const { user }    = useAuth();
  const navigate    = useNavigate();
  const isAdminUser = isAdmin(user);
  const isAdminMgr  = isAdminOrManager(user);

  // ── Shared user filter ────────────────────────────────────────────────────
  const { selectedIds, team } = useUserFilter();
  const selectedArr  = useMemo(() => [...selectedIds], [selectedIds]);
  const isUV         = selectedIds.size === 1;           // single-user view
  const hasSelection = selectedIds.size > 0;
  const assignedTo   = hasSelection ? selectedArr.join(",") : null;
  const uid          = isUV ? selectedArr[0] : null;     // used for user-scoped hooks

  // For display when exactly one user is selected
  const viewingUser = isUV ? (team.find((t) => t.id === uid) ?? null) : null;

  // ── Stats ──────────────────────────────────────────────────────────────────
  const { data: stats, isLoading: statsLoading, isFetching: statsFetching } = useLeadStats(assignedTo);

  // ── Leads ──────────────────────────────────────────────────────────────────
  const leadsFilter = assignedTo
    ? { assigned_to: assignedTo, page_size: 5 }
    : { page_size: 5 };

  const { data: leadsData, isLoading: leadsLoading1 } = useLeads(leadsFilter);
  const { data: myData,    isLoading: myLoading }      = useMyLeads({ page_size: 5 });

  const leads        = toArr(isAdminMgr ? leadsData : myData);
  const leadsLoading = isAdminMgr ? leadsLoading1 : myLoading;

  // ── Activity ───────────────────────────────────────────────────────────────
  const { data: orgActivity,  isLoading: actLoad1 } = useRecentActivity(15);
  const { data: userActivity, isLoading: actLoad2 } = useUserActivity(uid, 15);

  const activityData = isUV ? (userActivity ?? []) : (orgActivity ?? []);
  const actLoading   = isUV ? actLoad2 : actLoad1;

  // ── Tasks ──────────────────────────────────────────────────────────────────
  const taskFilter = assignedTo ? { assigned_to: assignedTo } : {};

  const { data: uvOverdueRaw  = [], isLoading: uvOL } = useTasks(
    hasSelection
      ? { ...taskFilter, overdue: "true", page_size: 50 }
      : { overdue: "true", page_size: 0 }
  );
  const { data: uvUpcomingRaw = [], isLoading: uvUL } = useTasks(
    hasSelection
      ? { ...taskFilter, page_size: 50 }
      : { page_size: 0 }
  );

  const { data: defOverdue  = [], isLoading: defOL } = useOverdueTasks();
  const { data: defUpcoming = [], isLoading: defUL } = useUpcomingTasks();

  const shownOverdue  = hasSelection ? toArr(uvOverdueRaw)  : defOverdue;
  const shownUpcoming = hasSelection ? toArr(uvUpcomingRaw) : defUpcoming;
  const tasksLoading  = hasSelection ? (uvOL || uvUL) : (defOL || defUL);

  // ── Workload ───────────────────────────────────────────────────────────────
  const { data: workload, isLoading: wlLoading } = useWorkload();
  const showWorkload = isAdminMgr && !hasSelection;

  // ── KPIs ───────────────────────────────────────────────────────────────────
  const kpiLoading   = statsLoading || statsFetching || tasksLoading;
  const overdueCount = shownOverdue.length;

  const userKpis = isUV && viewingUser ? [
    {
      label:   "Total Leads",
      value:   stats?.total_leads ?? null,
      color:   "#1A5A9A", icon: "◈",
      sub:     `Assigned to ${viewingUser.full_name.split(" ")[0]}`,
      onClick: () => navigate(`/leads?assigned_to=${uid}`),
    },
    {
      label:   "Converted",
      value:   stats?.converted ?? stats?.won ?? null,
      color:   "#18A858", icon: "✓",
      sub:     "Closed deals",
    },
    {
      label:   "Active",
      value:   stats
        ? Math.max(0, (stats.total_leads ?? 0) - (stats.converted ?? stats.won ?? 0) - (stats.lost ?? 0))
        : null,
      color:   "#E08818", icon: "⚡",
      sub:     "In progress",
    },
    {
      label:   "Overdue Tasks",
      value:   tasksLoading ? null : overdueCount,
      color:   overdueCount > 0 ? "#C03030" : "#18A858",
      icon:    "☐",
      sub:     overdueCount > 0 ? "Need attention" : "All caught up",
    },
  ] : null;

  const adminKpis = [
    {
      label:   "Total Leads",
      value:   stats?.total_leads ?? null,
      color:   "#1A5A9A", icon: "◈",
      sub:     hasSelection ? "Filtered leads" : "All pipeline leads",
      onClick: () => navigate("/leads"),
    },
    {
      label:   "Converted Deals",
      value:   stats?.converted ?? stats?.won ?? null,
      color:   "#18A858", icon: "✓",
      sub:     "Closed successfully",
      onClick: () => navigate("/leads?stage=converted"),
    },
    {
      label:   "Unassigned",
      value:   stats?.unassigned ?? null,
      color:   "#C08010", icon: "⚠",
      sub:     "Need assignment",
      onClick: () => navigate("/leads?assigned_to=none"),
    },
    {
      label:   "Overdue Tasks",
      value:   tasksLoading ? null : overdueCount,
      color:   overdueCount > 0 ? "#C03030" : "#18A858",
      icon:    "☐",
      sub:     overdueCount > 0 ? "Need attention" : "All caught up",
      onClick: () => navigate("/tasks"),
    },
  ];

  const myLeads  = toArr(myData);
  const myActive = myLeads.filter((l) => !["converted", "lost"].includes(l.stage));

  const memberKpis = [
    {
      label:   "My Leads",
      value:   myLeads.length,
      color:   "#1A5A9A", icon: "◈",
      sub:     "Assigned to me",
      onClick: () => navigate("/leads"),
    },
    {
      label:   "Active",
      value:   myActive.length,
      color:   "#E08818", icon: "⚡",
      sub:     "In progress",
    },
    {
      label:   "Converted",
      value:   myLeads.filter((l) => l.stage === "converted").length,
      color:   "#18A858", icon: "✓",
      sub:     "Closed deals",
    },
    {
      label:   "Overdue Tasks",
      value:   tasksLoading ? null : overdueCount,
      color:   overdueCount > 0 ? "#C03030" : "#18A858",
      icon:    "☐",
      sub:     overdueCount > 0 ? "Need attention" : "All caught up",
      onClick: () => navigate("/tasks"),
    },
  ];

  const kpis = userKpis ?? (isAdminMgr ? adminKpis : memberKpis);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {isUV && viewingUser
              ? `${viewingUser.full_name}'s Dashboard`
              : `Good ${greeting()}, ${user?.full_name?.split(" ")[0]} 👋`
            }
          </h1>
          <p className="page-subtitle">
            {isUV && viewingUser
              ? `Viewing data for ${viewingUser.full_name} · ${displayRole(viewingUser)}`
              : hasSelection
              ? `Filtered view — ${selectedArr.length} team member${selectedArr.length > 1 ? "s" : ""} selected`
              : isAdminMgr
              ? "Here's what's happening across your pipeline today."
              : "Here's a summary of your leads and activity."
            }
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => navigate("/leads")}>
          + Add Lead
        </button>
      </div>

      {/* Shared user filter bar */}
      <UserFilterBar />

      {/* Unassigned alert — default admin view only */}
      {isAdminUser && !hasSelection && (
        <UnassignedAlert count={stats?.unassigned} />
      )}

      {/* KPI cards */}
      <div className="stat-grid" style={{ marginBottom: 16 }}>
        {kpis.map((kpi) => (
          <StatCard
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            color={kpi.color}
            icon={kpi.icon}
            sub={kpi.sub}
            loading={kpiLoading}
            onClick={kpi.onClick}
          />
        ))}
      </div>

      {/* Pipeline overview */}
      <PipelineOverview stats={stats} loading={statsLoading} />

      {/* Recent leads + Activity */}
      <div style={{
        display:             "grid",
        gridTemplateColumns: "1fr 340px",
        gap:                 16,
        marginBottom:        16,
        alignItems:          "start",
      }}>
        <RecentLeads leads={leads} loading={leadsLoading} />
        <ActivityFeed
          activities={activityData}
          loading={actLoading}
          showViewAll={isAdminMgr && !hasSelection}
        />
      </div>

      {/* Task widget + Team workload */}
      <div style={{
        display:             "grid",
        gridTemplateColumns: showWorkload ? "1fr 1fr" : "1fr",
        gap:                 16,
        marginBottom:        16,
        alignItems:          "start",
      }}>
        <TaskDashboardWidget
          overdue={shownOverdue}
          upcoming={shownUpcoming}
          loading={tasksLoading}
        />
        {showWorkload && (
          <TeamWorkload workload={workload} loading={wlLoading} />
        )}
      </div>
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Morning";
  if (h < 17) return "Afternoon";
  return "Evening";
}
