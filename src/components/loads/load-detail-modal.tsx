import { Dialog, DialogContent } from "@/components/ui/dialog";
import { LoadDetailView } from "@/components/loads/load-detail-view";

interface LoadDetailModalProps {
  loadId: string | null;
  onClose: () => void;
}

export function LoadDetailModal({ loadId, onClose }: LoadDetailModalProps) {
  return (
    <Dialog open={!!loadId} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-[94vw] w-full h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
        {loadId && (
          <LoadDetailView loadId={loadId} isModal onClose={onClose} />
        )}
      </DialogContent>
    </Dialog>
  );
}
