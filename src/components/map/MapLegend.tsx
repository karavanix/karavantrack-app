import { useState } from "react";

type LegendItem = {
  type: "dot" | "line";
  color: string;
  label: string;
  dashed?: boolean;
};

const ITEMS: LegendItem[] = [
  { type: "dot",  color: "#16a34a", label: "Pickup" },
  { type: "dot",  color: "#dc2626", label: "Dropoff" },
  { type: "dot",  color: "#2563eb", label: "Carrier" },
  { type: "line", color: "#64748b", label: "Planned route", dashed: true },
  { type: "line", color: "#3b82f6", label: "Actual track" },
];

/**
 * Collapsible map legend overlay — positioned bottom-right.
 */
export function MapLegend() {
  const [open, setOpen] = useState(false);

  return (
    <div className="absolute bottom-3 right-3 z-10">
      {open ? (
        <div className="rounded-lg bg-white/90 dark:bg-gray-900/90 shadow-lg backdrop-blur-sm px-3 py-2.5 space-y-1.5 min-w-[140px]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Legend
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close legend"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {ITEMS.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              {item.type === "dot" ? (
                <span
                  className="inline-block h-2.5 w-2.5 shrink-0 rounded-full border border-white shadow-sm"
                  style={{ background: item.color }}
                />
              ) : (
                <svg width="16" height="4" className="shrink-0">
                  <line
                    x1="0" y1="2" x2="16" y2="2"
                    stroke={item.color}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeDasharray={item.dashed ? "4 3" : undefined}
                  />
                </svg>
              )}
              <span className="text-[11px] text-gray-700 dark:text-gray-300">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-lg bg-white/90 dark:bg-gray-900/90 shadow-lg backdrop-blur-sm px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
          title="Show map legend"
        >
          Legend
        </button>
      )}
    </div>
  );
}
