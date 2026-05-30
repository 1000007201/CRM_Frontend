/**
 * components/dashboard/PipelineOverview.jsx
 *
 * Renders a row of mini-cards — one per pipeline stage —
 * showing count and total value. Clicking a stage navigates
 * to the Leads page pre-filtered to that stage.
 */
import { useNavigate } from "react-router-dom";
import { STAGES, getStageInfo } from "@/utils/leadConstants";
import { useIsMobile } from "@/hooks/useIsMobile";
import Spinner from "@/components/common/Spinner";

export default function PipelineOverview({ stats, loading }) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="card-header">
        <h2 className="card-title">Pipeline Overview</h2>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => navigate("/pipeline")}
        >
          Full Kanban →
        </button>
      </div>

      {loading ? (
        <Spinner center />
      ) : (
        <div style={{
          display:             "grid",
          gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
          gap:                 10,
          padding:             "14px 16px",
        }}>
          {STAGES.map((stage) => {
            const meta  = getStageInfo(stage.value);
            const row   = stats?.by_stage?.find((s) => s.stage === stage.value);
            const count = row?.count ?? 0;

            return (
              <div
                key={stage.value}
                onClick={() => navigate(`/leads?stage=${stage.value}`)}
                style={{
                  padding:       "14px 12px",
                  background:    "var(--white)",
                  border:        "1px solid var(--border)",
                  borderRadius:  4,
                  minHeight:     72,
                  display:       "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  cursor:        "pointer",
                  transition:    "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = (meta?.color || "#9CA3AF") + "60";
                  e.currentTarget.style.transform   = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.transform   = "";
                }}
              >
                <p style={{
                  fontSize:      10,
                  fontWeight:    700,
                  color:         meta?.color || "#9CA3AF",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom:  6,
                }}>
                  {meta?.label || stage.value}
                </p>
                <p style={{
                  fontSize:   24,
                  fontWeight: 700,
                  color:      "var(--text)",
                  lineHeight: 1,
                }}>
                  {count}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}