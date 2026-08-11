import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { AlertTriangle, Calendar, Clock, MapPin, Navigation, Truck, XCircle } from "lucide-react";
import { api } from "@/lib/api";
import { Spinner } from "@/components/ui/spinner";
import { StatusBadge } from "@/components/status-badge";
import MapLibreTrackingMap from "@/components/map/MapLibreTrackingMap";
import { utcToLocalDisplay } from "@/lib/date-utils";
import type { PublicTrackingResponse, TrackPoint, TrackResponse } from "@/types";

const POLL_MS = 5000;
const TRACK_PAGE_SIZE = 1000;

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
  const { t } = useTranslation();

  const [state, setState] = useState<ViewState>(token ? "loading" : "invalid");
  const [data, setData] = useState<PublicTrackingResponse | null>(null);
  const [trackPoints, setTrackPoints] = useState<TrackPoint[]>([]);

  // Tracks how many points we've already fetched, so polling only pulls new ones.
  const trackPointsCountRef = useRef(0);

  const fetchTrackPage = useCallback(
    async (offset: number): Promise<TrackPoint[]> => {
      if (!token) return [];
      let allPoints: TrackPoint[] = [];
      let cursor = offset;
      // Paginate until we've consumed everything currently available.
      for (;;) {
        const { data } = await api.get<TrackResponse>(
          `/public/tracking/${token}/track?limit=${TRACK_PAGE_SIZE}&offset=${cursor}`
        );
        const points = data?.points ?? [];
        allPoints = allPoints.concat(points);
        cursor += points.length;
        if (points.length < TRACK_PAGE_SIZE) break;
      }
      return allPoints;
    },
    [token]
  );

  const fetchInitial = useCallback(async () => {
    if (!token) return;
    try {
      const { data: trackingData } = await api.get<PublicTrackingResponse>(
        `/public/tracking/${token}`
      );
      setData(trackingData);

      try {
        const points = await fetchTrackPage(0);
        trackPointsCountRef.current = points.length;
        setTrackPoints(points);
      } catch {
        setTrackPoints([]);
      }

      setState("loaded");
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        setState("invalid");
      } else {
        setState("error");
      }
    }
  }, [token, fetchTrackPage]);

  useEffect(() => {
    fetchInitial();
  }, [fetchInitial]);

  // ── Poll for fresh position + status every 5s ──
  useEffect(() => {
    if (!token || state !== "loaded") return;

    const interval = setInterval(async () => {
      try {
        const { data: trackingData } = await api.get<PublicTrackingResponse>(
          `/public/tracking/${token}`
        );
        setData(trackingData);

        try {
          const newPoints = await fetchTrackPage(trackPointsCountRef.current);
          if (newPoints.length > 0) {
            trackPointsCountRef.current += newPoints.length;
            setTrackPoints((prev) => prev.concat(newPoints));
          }
        } catch {
          // Keep showing the last known track on transient errors
        }
      } catch {
        // Keep showing the last known state on transient poll errors
      }
    }, POLL_MS);

    return () => clearInterval(interval);
  }, [token, state, fetchTrackPage]);

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
  const isTrackable = TRACKABLE_STATUSES.includes(load.status);

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
            trackPoints={trackPoints.map((p) => ({ lat: p.lat, lng: p.lng }))}
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
