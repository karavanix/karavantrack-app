import { useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { LoadCard } from "@/components/loads/load-card";
import type { Load, LoadStats } from "@/types";

// Column definitions with phase grouping
const KANBAN_COLUMNS = [
  // Planning phase
  { status: "created",      label: "Created",      group: "Planning" },
  { status: "assigned",     label: "Assigned",     group: "Planning" },
  { status: "accepted",     label: "Accepted",     group: "Planning" },
  // Pickup phase
  { status: "picking_up",   label: "Picking Up",   group: "Pickup" },
  { status: "picked_up",    label: "Picked Up",    group: "Pickup" },
  // Transit phase
  { status: "in_transit",   label: "In Transit",   group: "Transit" },
  // Delivery phase
  { status: "dropping_off", label: "Dropping Off", group: "Delivery" },
  { status: "dropped_off",  label: "Dropped Off",  group: "Delivery" },
  // Done
  { status: "confirmed",    label: "Confirmed",    group: "Done" },
] as const;

type KanbanStatus = (typeof KANBAN_COLUMNS)[number]["status"];

// Phase colour accent classes
const GROUP_ACCENT: Record<string, string> = {
  Planning:  "border-t-blue-400",
  Pickup:    "border-t-amber-400",
  Transit:   "border-t-orange-400",
  Delivery:  "border-t-indigo-400",
  Done:      "border-t-green-500",
  Cancelled: "border-t-destructive",
};

interface LoadKanbanProps {
  loads: Load[];
  stats: LoadStats | null;
  carrierMap: Record<string, string>;
  isLoading: boolean;
}

export function LoadKanban({ loads, stats, carrierMap, isLoading }: LoadKanbanProps) {
  const [cancelledOpen, setCancelledOpen] = useState(false);

  // Group loads by status
  const byStatus: Record<string, Load[]> = {};
  for (const load of loads) {
    if (!byStatus[load.status]) byStatus[load.status] = [];
    byStatus[load.status].push(load);
  }

  const cancelledLoads = byStatus["cancelled"] ?? [];
  const cancelledCount = stats?.canceled ?? cancelledLoads.length;

  // Derive count for a column: prefer stats (real-time from server), fall back to local array length
  const colCount = (status: KanbanStatus): number => {
    if (stats) {
      const key = status as keyof LoadStats;
      const val = stats[key];
      return typeof val === "number" ? val : (byStatus[status]?.length ?? 0);
    }
    return byStatus[status]?.length ?? 0;
  };

  if (isLoading && loads.length === 0) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size={28} />
      </div>
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 min-h-[60vh]">
      {KANBAN_COLUMNS.map((col, idx) => {
        const colLoads = byStatus[col.status] ?? [];
        const count = colCount(col.status as KanbanStatus);
        const accentClass = GROUP_ACCENT[col.group] ?? "";

        // Show group label when group changes
        const prevGroup = idx > 0 ? KANBAN_COLUMNS[idx - 1].group : null;
        const isGroupStart = col.group !== prevGroup;

        return (
          <div key={col.status} className="flex gap-3">
            {/* Group separator line */}
            {isGroupStart && idx > 0 && (
              <div className="flex items-stretch">
                <div className="w-px bg-border/50 my-2" />
              </div>
            )}
            <div
              className={`flex-shrink-0 w-[270px] flex flex-col rounded-xl border bg-muted/30 border-t-2 ${accentClass}`}
            >
              {/* Column header */}
              <div className="px-3 py-2.5 flex items-center justify-between border-b border-border/50">
                <div>
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">
                    {col.group}
                  </span>
                  <p className="text-sm font-semibold leading-tight">{col.label}</p>
                </div>
                <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-background border text-xs font-semibold px-1.5">
                  {count}
                </span>
              </div>

              {/* Cards */}
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {colLoads.length === 0 ? (
                  <p className="py-6 text-center text-[11px] text-muted-foreground/60">
                    No loads
                  </p>
                ) : (
                  colLoads.map((load) => (
                    <LoadCard key={load.id} load={load} carrierMap={carrierMap} />
                  ))
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Separator before cancelled */}
      <div className="flex items-stretch">
        <div className="w-px bg-border/50 my-2" />
      </div>

      {/* Cancelled column — collapsible */}
      <div
        className={`flex-shrink-0 flex flex-col rounded-xl border bg-muted/30 border-t-2 ${GROUP_ACCENT["Cancelled"]} transition-all duration-300 ${cancelledOpen ? "w-[270px]" : "w-[52px]"}`}
      >
        <button
          type="button"
          onClick={() => setCancelledOpen((o) => !o)}
          className="flex items-center justify-between px-3 py-2.5 border-b border-border/50 w-full text-left"
        >
          {cancelledOpen ? (
            <>
              <div>
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Done</span>
                <p className="text-sm font-semibold leading-tight">Cancelled</p>
              </div>
              <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-background border text-xs font-semibold px-1.5">
                {cancelledCount}
              </span>
            </>
          ) : (
            <div className="flex flex-col items-center w-full gap-1">
              <span className="text-[10px] font-semibold text-destructive/70">
                {cancelledCount}
              </span>
              <span
                style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
                className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest"
              >
                Cancelled
              </span>
            </div>
          )}
        </button>

        {cancelledOpen && (
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {cancelledLoads.length === 0 ? (
              <p className="py-6 text-center text-[11px] text-muted-foreground/60">No loads</p>
            ) : (
              cancelledLoads.map((load) => (
                <LoadCard key={load.id} load={load} carrierMap={carrierMap} />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
