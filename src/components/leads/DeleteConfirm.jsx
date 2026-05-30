import { useNavigate } from "react-router-dom";
import Modal           from "@/components/common/Modal";
import { useToast }    from "@/components/common/Toast";
import { useDeleteLead } from "@/hooks/useLeads";

export default function DeleteConfirm({ lead, onClose, redirectAfter = false }) {
  const toast    = useToast();
  const navigate = useNavigate();
  const deleteMutation = useDeleteLead();

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(lead.id);
      toast.success("Lead deleted.");
      onClose();
      if (redirectAfter) navigate("/leads");
    } catch {
      toast.error("Could not delete lead. Please try again.");
    }
  };

  const label = lead.contact_name || lead.company || "this lead";

  return (
    <Modal
      open
      onClose={onClose}
      title="Delete Lead"
      size="sm"
      footer={
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={deleteMutation.isPending}>
            Cancel
          </button>
          <button
            className="btn btn-danger"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? "Deleting…" : "Delete"}
          </button>
        </div>
      }
    >
      <p style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.6 }}>
        Are you sure you want to delete <strong>{label}</strong>?
        This action cannot be undone.
      </p>
    </Modal>
  );
}
