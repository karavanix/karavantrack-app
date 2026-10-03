import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { api } from "@/lib/api";
import type { LoadRoute, TrackPoint, TrackResponse } from "@/types";

/** New points also come over the WS on the load page; this is the fallback. */
const TRACK_POLL_MS = 30_000;
/** The backend re-matches a moving load at most once a minute. */
const ROUTE_POLL_MS = 60_000;

interface UseLoadTrackOptions {
  /** `/loads/{id}` or `/public/tracking/{token}`; null = nothing to load. */
  basePath: string | null;
  /** Keep pulling new points and the re-matched route while the load moves. */
  live: boolean;
}

const ms = (at: string) => new Date(at).getTime();

/**
 * The load's route matched to roads and the raw points the route doesn't
 * cover yet (the live tail). The route is null until the backend has matched
 * the track (or when matching is off); then the points are the whole track.
 *
 * The route covers the track up to its matched_until, so only the points
 * after it are fetched: /track?after=matched_until, then ?after=the newest
 * point shown. Points the route has since covered are dropped. A late point
 * from the phone's offline queue lands before the newest one shown and gets
 * drawn by the next re-match.
 */
export function useLoadTrack({ basePath, live }: UseLoadTrackOptions) {
  const [trackPoints, setTrackPoints] = useState<TrackPoint[]>([]);
  const [route, setRoute] = useState<LoadRoute | null>(null);
  /** recorded_at of the newest point shown, as the server sent it. */
  const newestRef = useRef<string | null>(null);

  /** Appends points newer than the newest shown, e.g. from the WS. */
  const addPoints = useCallback((points: TrackPoint[]) => {
    const fresh: TrackPoint[] = [];
    for (const p of points) {
      if (newestRef.current !== null && ms(p.recorded_at) <= ms(newestRef.current)) continue;
      fresh.push(p);
      newestRef.current = p.recorded_at;
    }
    if (fresh.length > 0) setTrackPoints((prev) => prev.concat(fresh));
  }, []);

  useEffect(() => {
    if (!basePath) return;
    let cancelled = false;
    let pulling = false;
    newestRef.current = null;

    const fetchTrack = async (after: string | null) => {
      const query = after ? `?after=${encodeURIComponent(after)}` : "";
      const { data } = await api.get<TrackResponse>(`${basePath}/track${query}`);
      return data?.points ?? [];
    };

    /** The route, null when there's none (404), undefined on other errors. */
    const fetchRoute = async (): Promise<LoadRoute | null | undefined> => {
      try {
        const { data } = await api.get<LoadRoute>(`${basePath}/route`);
        return data;
      } catch (err) {
        return axios.isAxiosError(err) && err.response?.status === 404 ? null : undefined;
      }
    };

    const applyRoute = (next: LoadRoute | null) => {
      // Same updated_at = not re-matched since: keep the object, so the
      // map doesn't redraw the whole route every minute.
      setRoute((prev) => (prev?.updated_at === next?.updated_at ? prev : next));
      if (!next?.matched_until) return;
      const until = ms(next.matched_until);
      setTrackPoints((prev) => {
        const kept = prev.filter((p) => ms(p.recorded_at) > until);
        return kept.length === prev.length ? prev : kept;
      });
    };

    // The route first: it tells how much of the track needs no raw points.
    // The first pull replaces whatever was shown for a previous basePath.
    const start = async () => {
      pulling = true;
      try {
        const first = await fetchRoute();
        if (cancelled) return;
        if (first !== undefined) setRoute(first);
        const points = await fetchTrack(first?.matched_until ?? null);
        if (cancelled) return;
        setTrackPoints(points);
        newestRef.current = points.length > 0 ? points[points.length - 1].recorded_at : null;
      } catch {
        // The next poll retries
      } finally {
        pulling = false;
      }
    };

    const pullTrack = async () => {
      if (pulling) return;
      pulling = true;
      try {
        const points = await fetchTrack(newestRef.current);
        if (!cancelled) addPoints(points);
      } catch {
        // Keep showing the last known track on transient errors
      } finally {
        pulling = false;
      }
    };

    const pullRoute = async () => {
      const next = await fetchRoute();
      if (!cancelled && next !== undefined) applyRoute(next);
    };

    start();
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
  }, [basePath, live, addPoints]);

  return { trackPoints, route, addPoints };
}
