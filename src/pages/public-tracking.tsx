import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { AlertTriangle, Calendar, Clock, MapPin, Navigation, Route, Truck, XCircle } from "lucide-react";
import { api } from "@/lib/api";
import { Spinner } from "@/components/ui/spinner";
import { StatusBadge } from "@/components/status-badge";
import { ConnectionStatusBadge } from "@/components/loads/connection-status-badge";
import MapLibreTrackingMap from "@/components/map/MapLibreTrackingMap";
import { utcToLocalDisplay } from "@/lib/date-utils";
import { formatDistance } from "@/lib/format";
import { useLoadTrack } from "@/hooks/use-load-track";
import type { PublicTrackingResponse } from "@/types";

// The phone sends its points in batches about once a minute.
const POLL_MS = 15_000;

const TRACKABLE_STATUSES = [
  "assigned",
  "accepted",
  "picking_up",
  "picked_up",
  "in_transit",
  "dropping_off",
  "dropped_off",
];

type ViewState = "loading" | "invalid" | "error" | "loaded";

export default function PublicTrackingPage() {
  const { token } = useParams<{ token: string }>();
  const { t, i18n } = useTranslation();

  const [state, setState] = useState<ViewState>(token ? "loading" : "invalid");
  const [data, setData] = useState<PublicTrackingResponse | null>(null);

  const isTrackable = data != null && TRACKABLE_STATUSES.includes(data.load.status);
  const { trackPoints, route } = useLoadTrack({
    basePath: token && data ? `/public/tracking/${token}` : null,
    live: isTrackable,
  });

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    api
      .get<PublicTrackingResponse>(`/public/tracking/${token}`)
      .then(({ data: trackingData }) => {
        if (cancelled) return;
        setData(trackingData);
        setState("loaded");
      })
      .catch((err) => {
        if (cancelled) return;
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          setState("invalid");
        } else {
          setState("error");
        }
      });
    return () => { cancelled = true; };
  }, [token]);

  // ── Poll for fresh position + status ──
  useEffect(() => {
    if (!token || state !== "loaded") return;

    const interval = setInterval(async () => {
      try {
        const { data: trackingData } = await api.get<PublicTrackingResponse>(
          `/public/tracking/${token}`
        );
        setData(trackingData);
      } catch {
        // Keep showing the last known state on transient poll errors
      }
    }, POLL_MS);

    return () => clearInterval(interval);
  }, [token, state]);

  if (state === "loading") {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3">
        <Spinner size={28} />
        <p className="text-sm text-muted-foreground">{t("tracking_page_loading")}</p>
      </div>
    );
  }

  if (state === "invalid") {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <XCircle size={28} />
        </div>
        <h1 className="text-lg font-semibold">{t("tracking_page_invalid_link")}</h1>
        <p className="text-sm text-muted-foreground">{t("tracking_page_invalid_link_desc")}</p>
      </div>
    );
  }

  if (state === "error" || !data) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle size={28} />
        </div>
        <h1 className="text-lg font-semibold">{t("common_error")}</h1>
        <p className="text-sm text-muted-foreground">{t("tracking_page_error_desc")}</p>
      </div>
    );
  }

  const { load, position } = data;

  const pickup =
    load.pickup?.lat != null && load.pickup?.lng != null
      ? { lat: load.pickup.lat, lng: load.pickup.lng }
      : null;
  const dropoff =
    load.dropoff?.lat != null && load.dropoff?.lng != null
      ? { lat: load.dropoff.lat, lng: load.dropoff.lng }
      : null;
  const carrierPosition = position ? { lat: position.lat, lng: position.lng } : null;

  return (
    <div className="flex h-screen flex-col">
      <header className="shrink-0 border-b px-4 py-3 lg:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Truck size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <img src="/logo.svg" alt="Yool" className="h-4 w-4" />
              <span className="text-xs font-semibold text-muted-foreground">Yool</span>
            </div>
            <h1 className="truncate text-base font-bold tracking-tight">{load.title}</h1>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <StatusBadge status={load.status} />
            {isTrackable && <ConnectionStatusBadge status={data.connection ?? null} />}
            {load.reference_id && (
              <code className="text-[11px] text-muted-foreground">#{load.reference_id}</code>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col lg:flex-row min-h-0">
        <div className="h-[320px] lg:h-auto lg:flex-1 border-b lg:border-b-0 lg:border-r">
          <MapLibreTrackingMap
            className="h-full w-full"
            pickup={pickup}
            dropoff={dropoff}
            carrierPosition={carrierPosition}
            carrierHeading={position?.heading_deg}
            trackPoints={trackPoints}
            route={route}
            trackable={isTrackable}
          />
        </div>

        <div className="w-full overflow-y-auto lg:w-[360px]">
          <div className="space-y-4 p-4 lg:p-6">
            <section className="space-y-1.5">
              <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Navigation size={12} className="text-green-500" />
                {t("load_detail_pickup")}
              </h2>
              <p className="text-sm font-medium">
                {load.pickup?.address || t("load_detail_no_description")}
              </p>
              {load.pickup?.at && (
                <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Clock size={10} />
                  {utcToLocalDisplay(load.pickup.at)}
                </p>
              )}
            </section>

            <hr className="border-border" />

            <section className="space-y-1.5">
              <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <MapPin size={12} className="text-red-500" />
                {t("load_detail_dropoff")}
              </h2>
              <p className="text-sm font-medium">
                {load.dropoff?.address || t("load_detail_no_description")}
              </p>
              {load.dropoff?.at && (
                <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Clock size={10} />
                  {utcToLocalDisplay(load.dropoff.at)}
                </p>
              )}
            </section>

            {route && (
              <>
                <hr className="border-border" />
                <section className="space-y-1.5">
                  <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <Route size={12} />
                    {t("route_distance_driven")}
                  </h2>
                  <p className="text-sm font-medium tabular-nums">
                    {formatDistance(route.distance_m, i18n.language, t)}
                  </p>
                </section>
              </>
            )}

            {isTrackable && position?.recorded_at && (
              <>
                <hr className="border-border" />
                <section className="space-y-1.5">
                  <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <Calendar size={12} />
                    {t("tracking_page_last_update")}
                  </h2>
                  <p className="text-sm">{utcToLocalDisplay(position.recorded_at)}</p>
                </section>
              </>
            )}

            {!isTrackable && (
              <p className="text-xs text-muted-foreground">{t("tracking_page_not_trackable")}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
