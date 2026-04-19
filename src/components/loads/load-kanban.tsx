import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { LoadCard } from "@/components/loads/load-card";
import { LoadDetailModal } from "@/components/loads/load-detail-modal";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import type { Load, LoadStats } from "@/types";

export const PHASE_COLUMNS = [
  {
    label: "New",
    statuses: ["created"],
    statsKeys: ["created"] as (keyof LoadStats)[],
    accent: "border-t-blue-400",
  },
  {
    label: "Assigned",
    statuses: ["assigned", "accepted"],
    statsKeys: ["assigned", "accepted"] as (keyof LoadStats)[],
    accent: "border-t-violet-400",
  },
  {
    label: "Pickup",
    statuses: ["picking_up", "picked_up"],
    statsKeys: ["picking_up", "picked_up"] as (keyof LoadStats)[],
    accent: "border-t-amber-400",
  },
  {
    label: "In Transit",
    statuses: ["in_transit", "dropping_off", "dropped_off"],
    statsKeys: ["in_transit", "dropping_off", "dropped_off"] as (keyof LoadStats)[],
    accent: "border-t-orange-400",
  },
  {
    label: "Delivered",
    statuses: ["confirmed"],
    statsKeys: ["confirmed"] as (keyof LoadStats)[],
    accent: "border-t-green-500",
  },
];

export interface PhaseLoads {
  loads: Load[];
  hasMore: boolean;
  loadingMore: boolean;
}

interface LoadKanbanProps {
  phaseData: Record<string, PhaseLoads>;
  cancelledLoads: Load[];
  cancelledHasMore: boolean;
  cancelledLoadingMore: boolean;
  stats: LoadStats | null;
  carrierMap: Record<string, string>;
  isLoading: boolean;
  onLoadMore: (phaseLabel: string, currentOffset: number) => void;
  onLoadMoreCancelled: (currentOffset: number) => void;
}

function phaseCount(phase: (typeof PHASE_COLUMNS)[number], stats: LoadStats | null, localCount: number): number {
  if (!stats) return localCount;
  return phase.statsKeys.reduce((sum, key) => {
    const val = stats[key];
    return sum + (typeof val === "number" ? val : 0);
  }, 0);
}

export function LoadKanban({
  phaseData,
  cancelledLoads,
  cancelledHasMore,
  cancelledLoadingMore,
  stats,
  carrierMap,
  isLoading,
  onLoadMore,
  onLoadMoreCancelled,
}: LoadKanbanProps) {
  const [cancelledOpen, setCancelledOpen] = useState(false);
  const [quickViewId, setQuickViewId] = useState<string | null>(null);

  const cancelledCount = stats?.canceled ?? cancelledLoads.length;

  if (isLoading && Object.keys(phaseData).length === 0) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size={28} />
      </div>
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 min-h-[60vh]">
      {PHASE_COLUMNS.map((phase) => {
        const data = phaseData[phase.label] ?? { loads: [], hasMore: false, loadingMore: false };
        const count = phaseCount(phase, stats, data.loads.length);

        return (
          <div
            key={phase.label}
            className={`flex-shrink-0 w-[300px] flex flex-col rounded-xl border bg-muted/30 border-t-2 ${phase.accent}`}
          >
            {/* Column header */}
            <div className="px-3 py-2.5 flex items-center justify-between border-b border-border/50">
              <p className="text-sm font-semibold">{phase.label}</p>
              <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-background border text-xs font-semibold px-1.5">
                {count}
              </span>
            </div>

            {/* Cards */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {data.loads.length === 0 ? (
                <p className="py-6 text-center text-[11px] text-muted-foreground/60">No loads</p>
              ) : (
                data.loads.map((load) => (
                  <LoadCard key={load.id} load={load} carrierMap={carrierMap} onQuickView={setQuickViewId} />
                ))
              )}

              {/* Load more */}
              {data.hasMore && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onLoadMore(phase.label, data.loads.length)}
                  disabled={data.loadingMore}
                  className="w-full gap-1.5 text-muted-foreground text-xs"
                >
                  {data.loadingMore ? (
                    <Spinner size={12} />
                  ) : (
                    <ChevronDown size={13} />
                  )}
                  {data.loadingMore ? "Loading…" : `Load more (${count - data.loads.length} remaining)`}
                </Button>
              )}
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
        className={`flex-shrink-0 flex flex-col rounded-xl border bg-muted/30 border-t-2 border-t-destructive transition-all duration-300 ${cancelledOpen ? "w-[300px]" : "w-[52px]"}`}
      >
        <button
          type="button"
          onClick={() => setCancelledOpen((o) => !o)}
          className="flex items-center justify-between px-3 py-2.5 border-b border-border/50 w-full text-left"
        >
          {cancelledOpen ? (
            <>
              <p className="text-sm font-semibold">Cancelled</p>
              <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-background border text-xs font-semibold px-1.5">
                {cancelledCount}
              </span>
            </>
          ) : (
            <div className="flex flex-col items-center w-full gap-1">
              <span className="text-[10px] font-semibold text-destructive/70">{cancelledCount}</span>
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
                <LoadCard key={load.id} load={load} carrierMap={carrierMap} onQuickView={setQuickViewId} />
              ))
            )}
            {cancelledHasMore && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onLoadMoreCancelled(cancelledLoads.length)}
                disabled={cancelledLoadingMore}
                className="w-full gap-1.5 text-muted-foreground text-xs"
              >
                {cancelledLoadingMore ? <Spinner size={12} /> : <ChevronDown size={13} />}
                {cancelledLoadingMore
                  ? "Loading…"
                  : `Load more (${cancelledCount - cancelledLoads.length} remaining)`}
              </Button>
            )}
          </div>
        )}
      </div>

      <LoadDetailModal loadId={quickViewId} onClose={() => setQuickViewId(null)} />
    </div>
  );
}
