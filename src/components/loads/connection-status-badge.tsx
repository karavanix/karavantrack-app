import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { Clock, MapPinOff, WifiOff } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { formatClock, formatDuration } from "@/lib/format";
import type { ConnectionState, ConnectionStatus } from "@/types";

/** At or below this, a phone that isn't charging is about to die. */
const LOW_BATTERY = 0.15;

type ShownState = Exclude<ConnectionState, "not_started">;

const TONE: Record<ShownState, { pill: string; band: string }> = {
  moving: {
    pill: "border-success/30 bg-success/10 text-success hover:bg-success/15",
    band: "from-success/20",
  },
  stopped: {
    pill: "border-info/30 bg-info/10 text-info hover:bg-info/15",
    band: "from-info/20",
  },
  no_data: {
    pill: "border-warning/30 bg-warning/10 text-warning hover:bg-warning/15",
    band: "from-warning/20",
  },
  gps_disabled: {
    pill: "border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/15",
    band: "from-destructive/20",
  },
};

/** Re-renders every `everyMs`, for "N min ago" texts. */
function useNow(everyMs: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(id);
  }, [everyMs]);
  return now;
}

const minutesSince = (at: string, now: number) => (now - new Date(at).getTime()) / 60_000;

function ago(at: string, now: number, t: TFunction) {
  const minutes = minutesSince(at, now);
  return minutes < 1 ? t("conn_just_now") : t("conn_ago", { duration: formatDuration(minutes, t) });
}

interface StateView {
  label: string;
  title: string;
  /** How long the state lasts, under the title. */
  subtitle?: string;
  hint: string;
}

function describe(status: ConnectionStatus, state: ShownState, now: number, t: TFunction, lang: string): StateView {
  const clock = (at: string) => formatClock(at, lang, now);
  const lasting = (at: string) => formatDuration(minutesSince(at, now), t);

  switch (state) {
    case "moving":
      return { label: t("conn_moving"), title: t("conn_moving"), hint: t("conn_moving_hint") };
    case "stopped":
      return {
        label: status.since ? t("conn_stopped_since", { time: clock(status.since) }) : t("conn_stopped"),
        title: t("conn_stopped"),
        subtitle: status.since ? t("conn_for", { duration: lasting(status.since) }) : undefined,
        hint: t("conn_stopped_hint"),
      };
    case "no_data":
      return status.last_point_at
        ? {
            label: t("conn_no_data_since", { time: clock(status.last_point_at) }),
            title: t("conn_no_data"),
            subtitle: t("conn_for", { duration: lasting(status.last_point_at) }),
            hint: t("conn_no_data_hint"),
          }
        : { label: t("conn_no_data"), title: t("conn_no_data"), hint: t("conn_no_data_never_hint") };
    case "gps_disabled": {
      const denied = status.reason === "permission_denied";
      const title = denied ? t("conn_gps_permission") : t("conn_gps_off");
      return {
        label: title,
        title,
        subtitle: status.since ? t("conn_since", { time: clock(status.since) }) : undefined,
        hint: denied ? t("conn_gps_permission_hint") : t("conn_gps_off_hint"),
      };
    }
  }
}

function StateGlyph({ state, className }: { state: ShownState; className?: string }) {
  switch (state) {
    case "moving":
      return (
        <span className={cn("relative flex h-2 w-2", className)}>
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
        </span>
      );
    case "stopped":
      // The same "P" as the stop marker on the map.
      return (
        <span
          className={cn(
            "flex h-3.5 w-3.5 items-center justify-center rounded-[4px] bg-current text-[9px] font-black leading-none",
            className
          )}
        >
          <span className="text-background">P</span>
        </span>
      );
    case "no_data":
      return <WifiOff size={12} strokeWidth={2.5} className={className} />;
    case "gps_disabled":
      return <MapPinOff size={12} strokeWidth={2.5} className={className} />;
  }
}

function batteryColor(level: number, charging: boolean) {
  if (charging) return "text-success";
  if (level <= LOW_BATTERY) return "text-destructive";
  if (level <= 0.3) return "text-warning";
  return "text-success";
}

/** A battery drawn to scale: the fill animates when the level changes. */
function BatteryGlyph({ level, charging, size = 1 }: { level: number; charging: boolean; size?: number }) {
  const w = 22 * size;
  const h = 11 * size;
  const fill = Math.max(0.04, Math.min(1, level));
  const low = !charging && level <= LOW_BATTERY;
  return (
    <svg width={w + 2.5 * size} height={h} viewBox="0 0 24.5 11" className={batteryColor(level, charging)} aria-hidden>
      <rect x="0.75" y="0.75" width="20.5" height="9.5" rx="2.5" fill="none" stroke="currentColor" strokeOpacity="0.55" strokeWidth="1.5" />
      <rect x="22.25" y="3.5" width="1.75" height="4" rx="0.8" fill="currentColor" fillOpacity="0.55" />
      <rect
        x="2.25"
        y="2.25"
        width={17.5 * fill}
        height="6.5"
        rx="1.25"
        fill="currentColor"
        className={cn("transition-[width] duration-700 ease-out", (charging || low) && "animate-pulse")}
      />
      {charging && (
        <path d="M12.2 1.2 7.6 6h3l-1.4 3.8L14 5h-3z" className="fill-background" stroke="currentColor" strokeWidth="0.6" strokeLinejoin="round" />
      )}
    </svg>
  );
}

interface ConnectionStatusBadgeProps {
  status: ConnectionStatus | null;
}

/**
 * What the driver's phone is doing on the load — moving, standing since
 * HH:MM, silent, or with GPS off — plus its battery. Click for the details.
 * Renders nothing for not_started (the load isn't tracked).
 */
export function ConnectionStatusBadge({ status }: ConnectionStatusBadgeProps) {
  const { t, i18n } = useTranslation();
  const now = useNow(30_000);

  if (!status || status.state === "not_started") return null;
  const state = status.state;

  const view = describe(status, state, now, t, i18n.language);
  const tone = TONE[state];
  const battery = status.battery_level;
  const charging = status.is_charging ?? false;
  const percent = battery != null ? Math.round(battery * 100) : null;
  const lowBattery = battery != null && !charging && battery <= LOW_BATTERY;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
            "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            tone.pill
          )}
        >
          <StateGlyph state={state} />
          <span className="whitespace-nowrap">{view.label}</span>
          {battery != null && (
            <>
              <span className="h-3 w-px bg-current opacity-25" />
              <span className={cn("inline-flex items-center gap-1 tabular-nums", lowBattery && "text-destructive")}>
                <BatteryGlyph level={battery} charging={charging} />
                {percent}%
              </span>
            </>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent align="start" className="z-1100 w-80 overflow-hidden p-0">
        <div className={cn("flex items-start gap-3 bg-linear-to-b to-transparent px-4 pb-3 pt-4", tone.band)}>
          <div className={cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border", tone.pill)}>
            <StateGlyph state={state} className="scale-125" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight">{view.title}</p>
            {view.subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{view.subtitle}</p>}
          </div>
        </div>

        <div className="space-y-3 px-4 pb-4">
          <p className="text-xs leading-relaxed text-muted-foreground">{view.hint}</p>

          {status.last_point_at && (
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Clock size={12} />
                {t("conn_last_point")}
              </span>
              <span className="font-medium tabular-nums">
                {formatClock(status.last_point_at, i18n.language, now)}
                <span className="font-normal text-muted-foreground"> · {ago(status.last_point_at, now, t)}</span>
              </span>
            </div>
          )}

          {battery != null && (
            <div className="rounded-lg border bg-muted/40 p-3">
              <div className="flex items-center gap-3">
                <BatteryGlyph level={battery} charging={charging} size={1.6} />
                <div className="min-w-0">
                  <p className="text-lg font-bold leading-none tabular-nums">{percent}%</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {charging ? t("conn_charging") : t("conn_not_charging")}
                  </p>
                </div>
              </div>
              {lowBattery && <p className="mt-2 text-[11px] font-medium text-destructive">{t("conn_battery_low")}</p>}
              {status.last_point_at && (
                <p className="mt-2 text-[10px] text-muted-foreground">
                  {t("conn_battery_as_of", { time: formatClock(status.last_point_at, i18n.language, now) })}
                </p>
              )}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
