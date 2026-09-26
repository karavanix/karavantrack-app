import { useEffect, useState } from "react";
import axios from "axios";
import { api } from "@/lib/api";
import type { LoadRoute, TrackPoint, TrackResponse } from "@/types";

/** Page size for the first load; later pulls expect only a few new points. */
const TRACK_PAGE_SIZE = 1000;
const TRACK_UPDATE_PAGE_SIZE = 50;
/** The live tail runs to the carrier marker anyway, which updates faster. */
const TRACK_POLL_MS = 30_000;
/** The backend re-matches a moving load at most once a minute. */
const ROUTE_POLL_MS = 60_000;

interface UseLoadTrackOptions {
  /** `/loads/{id}` or `/public/tracking/{token}`; null = nothing to load. */
  basePath: string | null;
  /** Keep pulling new points and the re-matched route while the load moves. */
  live: boolean;
}

/**
 * The load's raw track points and its route matched to roads. The route is
 * null until the backend has matched the track (or when matching is off); the
 * map then draws the raw points.
 */
export function useLoadTrack({ basePath, live }: UseLoadTrackOptions) {
  const [trackPoints, setTrackPoints] = useState<TrackPoint[]>([]);
  const [route, setRoute] = useState<LoadRoute | null>(null);

  useEffect(() => {
    if (!basePath) return;
    let cancelled = false;
    let loadedOnce = false;
    let newestAt = -Infinity;
    let pulling = false;

    // /track returns points newest first. Read pages from the newest end
    // until reaching a point already shown (on the first pull: everything),
    // then flip them to oldest first. The first pull replaces whatever was
    // shown for a previous basePath.
    const pullTrack = async () => {
      if (pulling) return;
      pulling = true;
      try {
        const fresh: TrackPoint[] = [];
        const pageSize = loadedOnce ? TRACK_UPDATE_PAGE_SIZE : TRACK_PAGE_SIZE;
        for (let offset = 0; ; offset += pageSize) {
          const { data } = await api.get<TrackResponse>(
            `${basePath}/track?limit=${pageSize}&offset=${offset}`
          );
          const points = data?.points ?? [];
          const known = points.findIndex((p) => new Date(p.recorded_at).getTime() <= newestAt);
          fresh.push(...(known === -1 ? points : points.slice(0, known)));
          if (known !== -1 || points.length < pageSize) break;
        }
        if (cancelled) return;
        fresh.reverse();
        if (fresh.length > 0) newestAt = new Date(fresh[fresh.length - 1].recorded_at).getTime();
        if (!loadedOnce) setTrackPoints(fresh);
        else if (fresh.length > 0) setTrackPoints((prev) => prev.concat(fresh));
        loadedOnce = true;
      } catch {
        // Keep showing the last known track on transient errors
      } finally {
        pulling = false;
      }
    };

    const pullRoute = async () => {
      try {
        const { data } = await api.get<LoadRoute>(`${basePath}/route`);
        // Same updated_at = not re-matched since: keep the object, so the
        // map doesn't redraw the whole route every minute.
        if (!cancelled) setRoute((prev) => (prev?.updated_at === data.updated_at ? prev : data));
      } catch (err) {
        // 404: not matched yet or matching is off. Other errors keep the
        // last known route.
        if (!cancelled && axios.isAxiosError(err) && err.response?.status === 404) {
          setRoute(null);
        }
      }
    };

    pullTrack();
    pullRoute();
    if (!live) {
      return () => { cancelled = true; };
    }

    const trackTimer = setInterval(pullTrack, TRACK_POLL_MS);
    const routeTimer = setInterval(pullRoute, ROUTE_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(trackTimer);
      clearInterval(routeTimer);
    };
  }, [basePath, live]);

  return { trackPoints, route };
}
