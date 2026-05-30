/**
 * components/dashboard/TeamWorkload.jsx
 *
 * Shows each sales employee's lead count with a mini bar
 * representing their share of the total workload.
 * Only rendered for Admin and Manager roles.
 */
import Avatar from "@/components/common/Avatar";
import Spinner from "@/components/common/Spinner";
import EmptyState from "@/components/common/EmptyState";
import { getStageInfo, ACTIVE_STAGE_VALUES } from "@/utils/leadConstants";

const ACTIVE_STAGES = ACTIVE_STAGE_VALUES;

export default function TeamWorkload({ workload, loading }) {
  if (loading) return (
    <div className="card">
      <div className="card-header"><h2 className="card-title">Team Workload</h2></div>
      <Spinner center />
    </div>
  );

  const maxTotal = Math.max(...(workload?.map((w) => w.total) ?? [1]), 1);

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">Team Workload</h2>
        <span style={{ fontSize: 11, color: "var(--text3)" }}>
          {workload?.length ?? 0} reps
        </span>
      </div>

      {!workload?.length ? (
        <EmptyState icon="◎" title="No team members" subtitle="Add sales employees to see workload" />
      ) : (
        <div style={{ padding: "8px 0" }}>
          {workload.map((rep) => {
            const pct = Math.round((rep.total / maxTotal) * 100);

            return (
              <div
                key={rep.user.id}
                style={{
                  padding: "12px 20px",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                {/* Rep header row */}
                <div style={{
                  display: "flex", alignItems: "center",
                  justifyContent: "space-between", marginBottom: 8,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Avatar name={rep.user.full_name} size={28} />
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 600 }}>
                        {rep.user.full_name}
                      </p>
                      <p style={{ fontSize: 10, color: "var(--text3)" }}>
                        {rep.user.email}
                      </p>
                    </div>
                  </div>
                  <span style={{
                    fontSize: 16, fontWeight: 700, color: "var(--accent)",
                  }}>
                    {rep.total}
                  </span>
                </div>

                {/* Progress bar */}
                <div style={{
                  height: 5, background: "var(--border)",
                  borderRadius: 99, overflow: "hidden", marginBottom: 8,
                }}>
                  <div style={{
                    height: "100%", width: `${pct}%`,
                    background: "var(--accent)",
                    borderRadius: 99, transition: "width 0.4s ease",
                  }} />
                </div>

                {/* Stage breakdown dots */}
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {ACTIVE_STAGES.map((stage) => {
                    const count = rep.by_stage?.[stage] ?? 0;
                    if (!count) return null;
                    const meta = getStageInfo(stage);
                    return (
                      <div
                        key={stage}
                        style={{
                          display: "flex", alignItems: "center", gap: 4,
                          fontSize: 10, color: meta.color,
                          background: meta.bg,
                          padding: "2px 7px", borderRadius: 99,
                        }}
                      >
                        <span style={{
                          width: 5, height: 5, borderRadius: "50%",
                          background: meta.color, flexShrink: 0,
                        }} />
                        {meta.label}: {count}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}