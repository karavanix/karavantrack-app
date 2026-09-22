import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Clock, ImageOff } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { utcToLocalDisplay } from "@/lib/date-utils";
import type { LoadHistoryEntry } from "@/types";

interface LoadHistoryTimelineProps {
  history: LoadHistoryEntry[];
}

// POD photos attached to a status change (see phase-5-product-features):
// optional on every driver action, so most entries have none. Rendered as a
// thumbnail row that opens a full-size lightbox on click.
export function LoadHistoryTimeline({ history }: LoadHistoryTimelineProps) {
  const { t } = useTranslation();
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  if (history.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("load_detail_history_empty")}</p>;
  }

  // Newest first — matches how the kanban/status changes read top-down.
  const sorted = [...history].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <>
      <ol className="space-y-4">
        {sorted.map((entry) => (
          <li key={entry.id} className="relative border-l-2 border-border pl-4">
            <div className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-primary" />
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={entry.to_status} />
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Clock size={10} />
                {utcToLocalDisplay(entry.created_at)}
              </span>
            </div>
            {entry.note && (
              <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                {entry.note}
              </p>
            )}
            {entry.attachments.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {entry.attachments.map((att) =>
                  att.url ? (
                    <button
                      key={att.id}
                      type="button"
                      onClick={() => setLightboxUrl(att.url!)}
                      className="h-16 w-16 shrink-0 overflow-hidden rounded-md border border-border transition-opacity hover:opacity-80"
                    >
                      <img
                        src={att.url}
                        alt={t("load_detail_history_photo_alt")}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </button>
                  ) : (
                    <div
                      key={att.id}
                      title={t("load_detail_history_photo_unavailable")}
                      className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md border border-dashed border-border text-muted-foreground"
                    >
                      <ImageOff size={16} />
                    </div>
                  )
                )}
              </div>
            )}
          </li>
        ))}
      </ol>

      <Dialog open={!!lightboxUrl} onOpenChange={(open) => !open && setLightboxUrl(null)}>
        <DialogContent className="max-w-3xl border-none bg-transparent p-2 shadow-none">
          {lightboxUrl && (
            <img
              src={lightboxUrl}
              alt={t("load_detail_history_photo_alt")}
              className="max-h-[80vh] w-full rounded-lg object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
