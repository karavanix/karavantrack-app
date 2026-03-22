import { useEffect, useRef, useCallback } from "react";
import maplibregl, { LngLatBounds } from "maplibre-gl";
import { useMapLibre, type LatLng } from "@/hooks/use-maplibre";
import { createMapMarker } from "@/components/map/map-markers";

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
  trackPoints: TrackPoint[];
  className?: string;
  followCarrier?: boolean;
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
  trackPoints,
  className,
  followCarrier = true,
}: Props) {
  const pickupMarkerRef = useRef<maplibregl.Marker | null>(null);
  const dropoffMarkerRef = useRef<maplibregl.Marker | null>(null);
  const carrierMarkerRef = useRef<maplibregl.Marker | null>(null);

  const hasInitiallyFittedRef = useRef(false);
  const hasCenteredCarrierRef = useRef(false);

  const fallbackCenter: [number, number] = pickup
    ? [pickup.lng, pickup.lat]
    : dropoff
    ? [dropoff.lng, dropoff.lat]
    : carrierPosition
    ? [carrierPosition.lng, carrierPosition.lat]
    : [69.2401, 41.2995];

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

  const { containerRef, mapRef, isReady } = useMapLibre({
    center: fallbackCenter,
    zoom: 12,
    onStyleReady: ensureSourcesAndLayers,
  });

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
  }, [carrierPosition, isReady, mapRef]);

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

  // ── Initial bounds fit ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || hasInitiallyFittedRef.current || !isReady) return;

    const points: [number, number][] = [];

    if (pickup) points.push([pickup.lng, pickup.lat]);
    if (dropoff) points.push([dropoff.lng, dropoff.lat]);
    if (carrierPosition) points.push([carrierPosition.lng, carrierPosition.lat]);
    for (const p of trackPoints) {
      points.push([p.lng, p.lat]);
    }

    if (points.length === 0) return;

    if (points.length === 1) {
      map.flyTo({
        center: points[0],
        zoom: 13,
        essential: true,
      });
      hasInitiallyFittedRef.current = true;
      return;
    }

    const bounds = new LngLatBounds(points[0], points[0]);
    for (const point of points.slice(1)) {
      bounds.extend(point);
    }

    map.fitBounds(bounds, {
      padding: 60,
      maxZoom: 14,
      duration: 800,
    });

    hasInitiallyFittedRef.current = true;
  }, [pickup, dropoff, carrierPosition, trackPoints, isReady, mapRef]);

  // ── Follow carrier ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !carrierPosition || !followCarrier || !isReady) return;

    const nextCenter: [number, number] = [carrierPosition.lng, carrierPosition.lat];

    if (!hasCenteredCarrierRef.current) {
      map.flyTo({
        center: nextCenter,
        zoom: Math.max(map.getZoom(), 14),
        essential: true,
      });
      hasCenteredCarrierRef.current = true;
      return;
    }

    map.easeTo({
      center: nextCenter,
      duration: 1200,
      essential: true,
    });
  }, [carrierPosition, followCarrier, isReady, mapRef]);

  // Cleanup markers on unmount
  useEffect(() => {
    return () => {
      pickupMarkerRef.current?.remove();
      dropoffMarkerRef.current?.remove();
      carrierMarkerRef.current?.remove();
    };
  }, []);

  return <div ref={containerRef} className={className ?? "h-full w-full"} />;
}