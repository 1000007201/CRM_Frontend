import Spinner    from "@/components/common/Spinner";
import EmptyState from "@/components/common/EmptyState";
import { getStageInfo, ACTIVE_STAGE_VALUES } from "@/utils/leadConstants";

export default function UserWorkloadPanel({ workload = [], loading }) {
  return (
    <div style={{
      padding:      14,
      background:   "var(--white)",
      border:       "1px solid var(--border)",
      borderRadius: 6,
    }}>
      <div style={{
        display:        "flex",
        justifyContent: "space-between",
        alignItems:     "center",
        marginBottom:   12,
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
          Team Workload
        </div>
        <div style={{ fontSize: 11, color: "var(--text3)" }}>
          {workload.length} reps
        </div>
      </div>

      {loading ? (
        <Spinner center />
      ) : workload.length === 0 ? (
        <EmptyState icon="◈" title="No workload data" subtitle="Assign leads to see rep workload" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {workload.map((rep) => (
            <WorkloadCard key={rep.user.id} member={rep} />
          ))}
        </div>
      )}
    </div>
  );
}

function WorkloadCard({ member }) {
  const initial = member.user.full_name?.charAt(0).toUpperCase() || "?";
  const won  = member.by_stage?.converted ?? 0;
  const lost = member.by_stage?.lost      ?? 0;

  return (
    <div style={{
      padding:       12,
      background:    "var(--white)",
      border:        "1px solid var(--border)",
      borderRadius:  6,
      display:       "flex",
      flexDirection: "column",
      gap:           10,
    }}>
      {/* Header — avatar + name / email */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{
          width:          28,
          height:         28,
          borderRadius:   "50%",
          background:     "var(--accent-lt, #FFF3E0)",
          color:          "var(--accent)",
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          fontSize:       12,
          fontWeight:     700,
          flexShrink:     0,
        }}>
          {initial}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize:     13,
            fontWeight:   600,
            color:        "var(--text)",
            overflow:     "hidden",
            textOverflow: "ellipsis",
            whiteSpace:   "nowrap",
          }}>
            {member.user.full_name}
          </div>
          <div style={{
            fontSize:     11,
            color:        "var(--text3)",
            overflow:     "hidden",
            textOverflow: "ellipsis",
            whiteSpace:   "nowrap",
          }}>
            {member.user.email}
          </div>
        </div>
      </div>

      {/* Stats row — TOTAL / WON / LOST */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
        <StatCell label="TOTAL" value={member.total} color="var(--text)"  />
        <StatCell label="WON"   value={won}           color="#0A5A28"     />
        <StatCell label="LOST"  value={lost}          color="#991B1B"     />
      </div>

      {/* Stage breakdown chips */}
      {ACTIVE_STAGE_VALUES.some(s => member.by_stage?.[s]) && (
        <div style={{
          display:    "flex",
          flexWrap:   "wrap",
          gap:        4,
          paddingTop: 8,
          borderTop:  "1px solid var(--border)",
        }}>
          {ACTIVE_STAGE_VALUES.map(stage => {
            const count = member.by_stage?.[stage] ?? 0;
            if (!count) return null;
            const meta = getStageInfo(stage);
            return (
              <span key={stage} style={{
                padding:      "3px 8px",
                background:   meta.bg     || "var(--surface)",
                color:        meta.color  || "var(--text2)",
                border:       `1px solid ${meta.border || "var(--border)"}`,
                borderRadius: 10,
                fontSize:     10,
                fontWeight:   500,
              }}>
                {meta.label}: {count}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatCell({ label, value, color }) {
  return (
    <div style={{
      padding:      "6px 4px",
      background:   "var(--surface)",
      border:       "1px solid var(--border)",
      borderRadius: 4,
      textAlign:    "center",
    }}>
      <div style={{
        fontSize:     9,
        color:        "var(--text3)",
        fontWeight:   600,
        marginBottom: 2,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
      }}>
        {label}
      </div>
      <div style={{
        fontSize:   16,
        fontWeight: 700,
        color,
        lineHeight: 1,
      }}>
        {value}
      </div>
    </div>
  );
}
