import { useState } from "react";
import { StageBadge }     from "@/components/common/Badge";
import { useToast }       from "@/components/common/Toast";
import { useChangeStage } from "@/hooks/useLeads";
import { STAGE_META }     from "@/utils/formatters";
import { isAdminOrManager } from "@/utils/roles";
import { useAuth }          from "@/hooks/useAuth";

const STAGES = Object.keys(STAGE_META);
const STAGE_FALLBACK = { label: "Unknown", color: "#6B7280", bg: "#F3F4F6", border: "#D1D5DB" };

export default function StageSelect({ lead }) {
  const { user }  = useAuth();
  const toast     = useToast();
  const canEdit   = isAdminOrManager(user);
  const [busy, setBusy] = useState(false);
  const changeMutation  = useChangeStage();

  if (!lead) return null;
  if (!canEdit) return <StageBadge stage={lead.stage} />;

  const handleChange = async (e) => {
    const newStage = e.target.value;
    if (newStage === lead.stage) return;
    setBusy(true);
    try {
      await changeMutation.mutateAsync({ id: lead.id, stage: newStage });
      toast.success(`Stage → ${STAGE_META[newStage]?.label ?? newStage}`);
    } catch {
      toast.error("Could not update stage.");
    } finally {
      setBusy(false);
    }
  };

  const meta = STAGE_META[lead.stage] ?? STAGE_FALLBACK;

  return (
    <select
      value={lead.stage ?? ""}
      onChange={handleChange}
      disabled={busy}
      onClick={(e) => e.stopPropagation()}
      style={{
        padding:      "2px 7px",
        borderRadius: 3,
        border:       `1px solid ${meta.border ?? (meta.color || "#9CA3AF") + "60"}`,
        background:   meta.bg    ?? "#F3F4F6",
        color:        meta.color ?? "#6B7280",
        fontSize:     10,
        fontWeight:   500,
        cursor:       "pointer",
        outline:      "none",
        opacity:      busy ? 0.6 : 1,
        transition:   "opacity 0.12s",
        fontFamily:   "inherit",
      }}
    >
      {STAGES.map((s) => (
        <option key={s} value={s}>{STAGE_META[s]?.label ?? s}</option>
      ))}
    </select>
  );
}