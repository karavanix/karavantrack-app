import { useEffect, useRef, useState, useCallback } from "react";
import maplibregl, { LngLatBounds } from "maplibre-gl";
import { useMapLibre, type LatLng } from "@/hooks/use-maplibre";
import { createMapMarker, updateMarkerHeading } from "@/components/map/map-markers";
import { MapOverlay } from "@/components/map/MapOverlay";
import { MapLegend } from "@/components/map/MapLegend";

export type { LatLng };

const PLANNED_ROUTE_SOURCE_ID = "planned-route-source";
const PLANNED_ROUTE_LAYER_ID = "planned-route-layer";

const TRACK_SOURCE_ID = "track-source";
const TRACK_LAYER_ID = "track-layer";

type TrackPoint = {
  lat: number;
  lng: number;
};

type Props = {
  pickup: LatLng | null;
  dropoff: LatLng | null;
  carrierPosition: LatLng | null;
  carrierHeading?: number | null;
  trackPoints: TrackPoint[];
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
  className,
  trackable = false,
}: Props) {
  const [following, setFollowing] = useState(true);

  const pickupMarkerRef = useRef<maplibregl.Marker | null>(null);
  const dropoffMarkerRef = useRef<maplibregl.Marker | null>(null);
  const carrierMarkerRef = useRef<maplibregl.Marker | null>(null);

  const hasInitiallyFittedRef = useRef(false);
  const hasCenteredCarrierRef = useRef(false);
  /** True while a programmatic camera move is in progress */
  const isProgrammaticMoveRef = useRef(false);

  // Stable ref — only uses the *initial* prop values for map center
  const fallbackCenterRef = useRef<[number, number]>(
    pickup
      ? [pickup.lng, pickup.lat]
      : dropoff
      ? [dropoff.lng, dropoff.lat]
      : carrierPosition
      ? [carrierPosition.lng, carrierPosition.lat]
      : [69.2401, 41.2995]
  );

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
        paint: {
          "line-color": "#64748b",
          "line-width": 2,
          "line-opacity": 0.45,
          "line-dasharray": [4, 4],
        },
      });
    }

    if (!map.getSource(TRACK_SOURCE_ID)) {
      map.addSource(TRACK_SOURCE_ID, {
        type: "geojson",
        data: emptyFeatureCollection(),
      });
    }

    if (!map.getLayer(TRACK_LAYER_ID)) {
      map.addLayer({
        id: TRACK_LAYER_ID,
        type: "line",
        source: TRACK_SOURCE_ID,
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-color": "#3b82f6",
          "line-width": 3,
          "line-opacity": 0.85,
        },
      });
    }
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

  // ── Actual track line ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isReady) return;

    const source = map.getSource(TRACK_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    if (!source) return;

    if (trackPoints.length > 1) {
      source.setData(getLineFeature(trackPoints));
    } else {
      source.setData(emptyFeatureCollection());
    }
  }, [trackPoints, isReady, mapRef]);

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
      isProgrammaticMoveRef.current = true;
      map.flyTo({ center: points[0], zoom: 13, essential: true });
      map.once("moveend", () => { isProgrammaticMoveRef.current = false; });
      return;
    }

    const bounds = new LngLatBounds(points[0], points[0]);
    for (const point of points.slice(1)) {
      bounds.extend(point);
    }

    isProgrammaticMoveRef.current = true;
    map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 800 });
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
      map.flyTo({
        center: nextCenter,
        zoom: Math.max(map.getZoom(), 14),
        essential: true,
      });
      hasCenteredCarrierRef.current = true;
    } else {
      map.easeTo({
        center: nextCenter,
        duration: 1200,
        essential: true,
      });
    }

    map.once("moveend", () => { isProgrammaticMoveRef.current = false; });
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
      <MapLegend />

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