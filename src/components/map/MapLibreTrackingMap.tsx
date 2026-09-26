import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import maplibregl, { LngLatBounds, type MapLayerMouseEvent } from "maplibre-gl";
import { useMapLibre, type LatLng } from "@/hooks/use-maplibre";
import { createMapMarker, updateMarkerHeading } from "@/components/map/map-markers";
import { MapOverlay } from "@/components/map/MapOverlay";
import { MapLegend } from "@/components/map/MapLegend";
import {
  STOPS_LAYER,
  buildRouteOverlay,
  buildTail,
  ensureTrackOverlay,
  setTrackOverlayData,
  setTrackTailData,
  type TrackPointProps,
} from "@/components/map/track-overlay";
import { formatDuration } from "@/lib/format";
import type { LoadRoute, TrackPoint } from "@/types";

export type { LatLng };

const PLANNED_ROUTE_SOURCE_ID = "planned-route-source";
const PLANNED_ROUTE_LAYER_ID = "planned-route-layer";

type MapTrackPoint = Pick<TrackPoint, "lat" | "lng" | "recorded_at">;

const NO_POINTS: MapTrackPoint[] = [];

type Props = {
  pickup: LatLng | null;
  dropoff: LatLng | null;
  carrierPosition: LatLng | null;
  carrierHeading?: number | null;
  /** Raw track points, oldest first (useLoadTrack flips /track's order). */
  trackPoints: MapTrackPoint[];
  /** The track matched to roads; null until matched or with matching off. */
  route?: LoadRoute | null;
  className?: string;
  /** If true, the follow-carrier toggle is shown and starts enabled */
  trackable?: boolean;
};

function emptyFeatureCollection() {
  return {
    type: "FeatureCollection" as const,
    features: [],
  };
}

function getLineFeature(points: LatLng[]) {
  if (points.length < 2) return emptyFeatureCollection();

  return {
    type: "FeatureCollection" as const,
    features: [
      {
        type: "Feature" as const,
        properties: {},
        geometry: {
          type: "LineString" as const,
          coordinates: points.map((p) => [p.lng, p.lat]),
        },
      },
    ],
  };
}

export default function MapLibreTrackingMap({
  pickup,
  dropoff,
  carrierPosition,
  carrierHeading,
  trackPoints,
  route = null,
  className,
  trackable = false,
}: Props) {
  const { t, i18n } = useTranslation();
  const [following, setFollowing] = useState(true);

  const pickupMarkerRef = useRef<maplibregl.Marker | null>(null);
  const dropoffMarkerRef = useRef<maplibregl.Marker | null>(null);
  const carrierMarkerRef = useRef<maplibregl.Marker | null>(null);

  const hasInitiallyFittedRef = useRef(false);
  const hasCenteredCarrierRef = useRef(false);
  /** True while a programmatic camera move is in progress */
  const isProgrammaticMoveRef = useRef(false);

  /**
   * Pre-compute the initial map center from ALL available points so the map
   * starts as close to the final view as possible — minimising the camera
   * distance the subsequent instant fitBounds has to cover.
   * useMemo with [] deps captures only the initial render's props (stable).
   */
  const initialCenter = useMemo<[number, number]>(() => {
    const pts: [number, number][] = [];
    if (pickup)          pts.push([pickup.lng, pickup.lat]);
    if (dropoff)         pts.push([dropoff.lng, dropoff.lat]);
    if (carrierPosition) pts.push([carrierPosition.lng, carrierPosition.lat]);
    if (pts.length === 0) return [69.2401, 41.2995];
    const lngs = pts.map((p) => p[0]);
    const lats  = pts.map((p) => p[1]);
    return [
      (Math.min(...lngs) + Math.max(...lngs)) / 2,
      (Math.min(...lats) + Math.max(...lats)) / 2,
    ];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep a stable ref so the map init hook doesn't change on re-renders
  const fallbackCenterRef = useRef<[number, number]>(initialCenter);

  const ensureSourcesAndLayers = useCallback((map: maplibregl.Map) => {
    if (!map.getSource(PLANNED_ROUTE_SOURCE_ID)) {
      map.addSource(PLANNED_ROUTE_SOURCE_ID, {
        type: "geojson",
        data: emptyFeatureCollection(),
      });
    }

    if (!map.getLayer(PLANNED_ROUTE_LAYER_ID)) {
      map.addLayer({
        id: PLANNED_ROUTE_LAYER_ID,
        type: "line",
        source: PLANNED_ROUTE_SOURCE_ID,
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        // Fine dots, so the straight pickup → dropoff line isn't mistaken
        // for a dashed gap in the track.
        paint: {
          "line-color": ["case", ["==", ["global-state", "theme"], "dark"], "#94a3b8", "#64748b"],
          "line-width": 2.5,
          "line-opacity": 0.6,
          "line-dasharray": [0, 2],
        },
      });
    }

    ensureTrackOverlay(map);
  }, []);

  const { containerRef, mapRef, isReady, error } = useMapLibre({
    center: fallbackCenterRef.current,
    zoom: 12,
    onStyleReady: ensureSourcesAndLayers,
  });

  // ── Disable follow when user drags the map ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const onDragStart = () => {
      if (!isProgrammaticMoveRef.current) {
        setFollowing(false);
      }
    };

    map.on("dragstart", onDragStart);
    return () => { map.off("dragstart", onDragStart); };
  }, [mapRef, isReady]);

  // ── Pickup marker ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isReady) return;

    if (!pickup) {
      pickupMarkerRef.current?.remove();
      pickupMarkerRef.current = null;
      return;
    }

    const lngLat: [number, number] = [Number(pickup.lng), Number(pickup.lat)];

    if (!pickupMarkerRef.current) {
      pickupMarkerRef.current = createMapMarker("pickup", lngLat)
        .addTo(map);
    } else {
      pickupMarkerRef.current.setLngLat(lngLat);
    }
  }, [pickup, isReady, mapRef]);

  // ── Dropoff marker ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isReady) return;

    if (!dropoff) {
      dropoffMarkerRef.current?.remove();
      dropoffMarkerRef.current = null;
      return;
    }

    const lngLat: [number, number] = [Number(dropoff.lng), Number(dropoff.lat)];

    if (!dropoffMarkerRef.current) {
      dropoffMarkerRef.current = createMapMarker("dropoff", lngLat)
        .addTo(map);
    } else {
      dropoffMarkerRef.current.setLngLat(lngLat);
    }
  }, [dropoff, isReady, mapRef]);

  // ── Carrier marker ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isReady) return;

    if (!carrierPosition) {
      carrierMarkerRef.current?.remove();
      carrierMarkerRef.current = null;
      return;
    }

    const lngLat: [number, number] = [
      Number(carrierPosition.lng),
      Number(carrierPosition.lat),
    ];

    if (!carrierMarkerRef.current) {
      carrierMarkerRef.current = createMapMarker("carrier", lngLat)
        .addTo(map);
    } else {
      carrierMarkerRef.current.setLngLat(lngLat);
    }

    updateMarkerHeading(carrierMarkerRef.current, carrierHeading);
  }, [carrierPosition, carrierHeading, isReady, mapRef]);

  // ── Planned route line ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isReady) return;

    const source = map.getSource(PLANNED_ROUTE_SOURCE_ID) as
      | maplibregl.GeoJSONSource
      | undefined;

    if (!source) return;

    if (pickup && dropoff) {
      source.setData(getLineFeature([pickup, dropoff]));
    } else {
      source.setData(emptyFeatureCollection());
    }
  }, [pickup, dropoff, isReady, mapRef]);

  // ── Track: the matched route, or the raw points while there's none ──
  // With a route the raw points only feed the live tail, so new points
  // don't re-decode the whole route.
  const fallbackPoints = route ? NO_POINTS : trackPoints;
  const overlay = useMemo(
    () => buildRouteOverlay(route, fallbackPoints, (minutes) =>
      t("map_gap_label", { duration: formatDuration(minutes, t) })
    ),
    [route, fallbackPoints, t]
  );

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isReady) return;
    setTrackOverlayData(map, overlay);
  }, [overlay, isReady, mapRef]);

  // ── Live tail: end of the drawn track → unmatched points → carrier ──
  const carrierLat = carrierPosition?.lat;
  const carrierLng = carrierPosition?.lng;
  const tail = useMemo(
    () => buildTail(
      overlay,
      trackPoints,
      carrierLat != null && carrierLng != null ? { lat: carrierLat, lng: carrierLng } : null
    ),
    [overlay, trackPoints, carrierLat, carrierLng]
  );

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isReady) return;
    setTrackTailData(map, tail);
  }, [tail, isReady, mapRef]);

  // ── Stop tooltips: on hover, or on tap for touch screens ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isReady) return;

    const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 12 });
    const show = (e: MapLayerMouseEvent) => {
      const feature = e.features?.[0];
      if (!feature || feature.geometry.type !== "Point") return;
      const props = feature.properties as TrackPointProps;
      if (props.kind !== "stop") return;
      const hhmm = (at: string) =>
        new Date(at).toLocaleTimeString(i18n.language, { hour: "2-digit", minute: "2-digit" });
      const range = `${hhmm(props.started_at)}–${hhmm(props.ended_at)}`;
      popup
        .setLngLat(feature.geometry.coordinates as [number, number])
        .setText(`${t("map_stop_tooltip", { duration: formatDuration(props.minutes, t) })} · ${range}`)
        .addTo(map);
      map.getCanvas().style.cursor = "pointer";
    };
    const hide = () => {
      popup.remove();
      map.getCanvas().style.cursor = "";
    };

    map.on("mouseenter", STOPS_LAYER, show);
    map.on("click", STOPS_LAYER, show);
    map.on("mouseleave", STOPS_LAYER, hide);
    return () => {
      map.off("mouseenter", STOPS_LAYER, show);
      map.off("click", STOPS_LAYER, show);
      map.off("mouseleave", STOPS_LAYER, hide);
      popup.remove();
    };
  }, [isReady, mapRef, t, i18n.language]);

  // ── Initial bounds fit (runs once when map becomes ready) ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isReady || hasInitiallyFittedRef.current) return;

    // Collect all available points at this moment
    const points: [number, number][] = [];
    if (pickup) points.push([pickup.lng, pickup.lat]);
    if (dropoff) points.push([dropoff.lng, dropoff.lat]);
    if (carrierPosition) points.push([carrierPosition.lng, carrierPosition.lat]);
    for (const p of trackPoints) {
      points.push([p.lng, p.lat]);
    }

    if (points.length === 0) return;

    hasInitiallyFittedRef.current = true;

    if (points.length === 1) {
      // jumpTo is instant — no animation — user sees the final state immediately
      isProgrammaticMoveRef.current = true;
      map.jumpTo({ center: points[0], zoom: 13 });
      isProgrammaticMoveRef.current = false;
      return;
    }

    const bounds = new LngLatBounds(points[0], points[0]);
    for (const point of points.slice(1)) {
      bounds.extend(point);
    }

    // duration: 0 = instant snap to final view, no zoom-in/zoom-out animation
    isProgrammaticMoveRef.current = true;
    map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 0 });
    map.once("moveend", () => { isProgrammaticMoveRef.current = false; });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady]);

  // ── Follow carrier ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !carrierPosition || !following || !isReady) return;

    const nextCenter: [number, number] = [carrierPosition.lng, carrierPosition.lat];

    isProgrammaticMoveRef.current = true;

    if (!hasCenteredCarrierRef.current) {
      // First time we see the carrier — jump instantly, no dramatic flyTo sweep.
      // The initial fitBounds already positioned the camera near the route;
      // jumpTo just re-centers on the carrier without re-zooming the whole map.
      map.jumpTo({
        center: nextCenter,
        zoom: Math.max(map.getZoom(), 14),
      });
      hasCenteredCarrierRef.current = true;
      isProgrammaticMoveRef.current = false;
    } else {
      // Subsequent live position updates — short ease so movement feels smooth
      // but not laggy. 400ms is fast enough to feel real-time.
      map.easeTo({
        center: nextCenter,
        duration: 400,
        essential: true,
      });
      map.once("moveend", () => { isProgrammaticMoveRef.current = false; });
    }
  }, [carrierPosition, following, isReady, mapRef]);

  // Cleanup markers on unmount
  useEffect(() => {
    return () => {
      pickupMarkerRef.current?.remove();
      dropoffMarkerRef.current?.remove();
      carrierMarkerRef.current?.remove();
    };
  }, []);

  const showFollowButton = trackable && carrierPosition;

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className={className ?? "h-full w-full"} />
      <MapOverlay isReady={isReady} error={error} />
      <MapLegend hasRoute={route != null} />

      {showFollowButton && (
        <button
          type="button"
          onClick={() => setFollowing((f) => !f)}
          className={`
            absolute bottom-3 left-3 z-10
            flex items-center gap-1.5
            rounded-lg px-3 py-1.5
            text-xs font-semibold
            shadow-lg backdrop-blur-sm
            transition-colors duration-150
            ${following
              ? "bg-blue-600/90 text-white hover:bg-blue-700/90"
              : "bg-white/90 text-gray-700 hover:bg-white dark:bg-gray-900/90 dark:text-gray-200 dark:hover:bg-gray-800/90"
            }
          `}
          title={following ? "Following carrier — click to pan freely" : "Click to follow carrier"}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {following ? (
              /* Crosshair icon */
              <>
                <circle cx="12" cy="12" r="4" />
                <line x1="12" y1="2" x2="12" y2="6" />
                <line x1="12" y1="18" x2="12" y2="22" />
                <line x1="2" y1="12" x2="6" y2="12" />
                <line x1="18" y1="12" x2="22" y2="12" />
              </>
            ) : (
              /* Move/pan icon */
              <>
                <polyline points="5 9 2 12 5 15" />
                <polyline points="9 5 12 2 15 5" />
                <polyline points="15 19 12 22 9 19" />
                <polyline points="19 9 22 12 19 15" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <line x1="12" y1="2" x2="12" y2="22" />
              </>
            )}
          </svg>
          {following ? "Following" : "Free pan"}
        </button>
      )}
    </div>
  );
}