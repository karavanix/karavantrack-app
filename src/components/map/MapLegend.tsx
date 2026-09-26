import { useState } from "react";
import { useTranslation } from "react-i18next";

type LegendItem = {
  type: "dot" | "line" | "stop";
  color: string;
  label: string;
  dash?: string;
  /** Only meaningful once the track is matched to roads. */
  routeOnly?: boolean;
};

const ITEMS: LegendItem[] = [
  { type: "dot",  color: "#16a34a", label: "map_legend_pickup" },
  { type: "dot",  color: "#dc2626", label: "map_legend_dropoff" },
  { type: "dot",  color: "#2563eb", label: "map_legend_carrier" },
  { type: "line", color: "#64748b", label: "map_legend_planned", dash: "0.1 4" },
  { type: "line", color: "#2563eb", label: "map_legend_track" },
  { type: "line", color: "#94a3b8", label: "map_legend_raw", routeOnly: true },
  { type: "line", color: "#94a3b8", label: "map_legend_gap", dash: "4 3", routeOnly: true },
  { type: "stop", color: "#334155", label: "map_legend_stop", routeOnly: true },
];

/**
 * Collapsible map legend overlay — positioned bottom-right.
 */
export function MapLegend({ hasRoute = false }: { hasRoute?: boolean }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <div className="absolute bottom-3 right-3 z-10">
      {open ? (
        <div className="rounded-lg bg-white/90 dark:bg-gray-900/90 shadow-lg backdrop-blur-sm px-3 py-2.5 space-y-1.5 min-w-[140px]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {t("map_legend")}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label={t("map_legend_hide")}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {ITEMS.filter((item) => hasRoute || !item.routeOnly).map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              {item.type === "dot" && (
                <span
                  className="inline-block h-2.5 w-2.5 shrink-0 rounded-full border border-white shadow-sm"
                  style={{ background: item.color }}
                />
              )}
              {item.type === "line" && (
                <svg width="16" height="4" className="shrink-0">
                  <line
                    x1="1" y1="2" x2="15" y2="2"
                    stroke={item.color}
                    strokeWidth="2.5"
                    strokeLinecap={item.dash?.startsWith("0.1") ? "round" : "butt"}
                    strokeDasharray={item.dash}
                  />
                </svg>
              )}
              {item.type === "stop" && (
                <span
                  className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border border-white text-[8px] font-bold text-white shadow-sm"
                  style={{ background: item.color }}
                >
                  P
                </span>
              )}
              <span className="text-[11px] text-gray-700 dark:text-gray-300">
                {t(item.label)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-lg bg-white/90 dark:bg-gray-900/90 shadow-lg backdrop-blur-sm px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
          title={t("map_legend_show")}
        >
          {t("map_legend")}
        </button>
      )}
    </div>
  );
}
