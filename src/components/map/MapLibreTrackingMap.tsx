import { useEffect, useRef, useState } from "react";
import maplibregl, { LngLatBounds } from "maplibre-gl";
import { Protocol } from "pmtiles";
import "maplibre-gl/dist/maplibre-gl.css";
import { useThemeStore } from "@/stores/theme-store";

const STYLE_URL_DARK = "https://yool.hel1.your-objectstorage.com/styles/dark.json";
const STYLE_URL_LIGHT = "https://yool.hel1.your-objectstorage.com/styles/light.json";

const PLANNED_ROUTE_SOURCE_ID = "planned-route-source";
const PLANNED_ROUTE_LAYER_ID = "planned-route-layer";

const TRACK_SOURCE_ID = "track-source";
const TRACK_LAYER_ID = "track-layer";

let protocolRegistered = false;

export type LatLng = {
  lat: number;
  lng: number;
};

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

function createMarkerElement(color: string, pulse = false) {
  const el = document.createElement("div");
  el.style.width = "18px";
  el.style.height = "18px";
  el.style.borderRadius = "9999px";
  el.style.background = color;
  el.style.border = "3px solid white";
  el.style.boxShadow = "0 2px 10px rgba(0,0,0,0.25)";
  el.style.cursor = "pointer";

  if (pulse) {
    el.animate(
      [
        { transform: "scale(1)", opacity: "1" },
        { transform: "scale(1.18)", opacity: "0.75" },
        { transform: "scale(1)", opacity: "1" },
      ],
      {
        duration: 1400,
        iterations: Infinity,
      }
    );
  }

  return el;
}

export default function MapLibreTrackingMap({
  pickup,
  dropoff,
  carrierPosition,
  trackPoints,
  className,
  followCarrier = true,
}: Props) {
  const { theme } = useThemeStore();

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  const pickupMarkerRef = useRef<maplibregl.Marker | null>(null);
  const dropoffMarkerRef = useRef<maplibregl.Marker | null>(null);
  const carrierMarkerRef = useRef<maplibregl.Marker | null>(null);

  const hasInitiallyFittedRef = useRef(false);
  const hasCenteredCarrierRef = useRef(false);

  useEffect(() => {
    if (!protocolRegistered) {
      const protocol = new Protocol();
      maplibregl.addProtocol("pmtiles", protocol.tile);
      protocolRegistered = true;
    }

    if (!mapContainerRef.current || mapRef.current) return;

    const initialStyle = theme === "dark" ? STYLE_URL_DARK : STYLE_URL_LIGHT;

    const fallbackCenter: [number, number] = pickup
      ? [pickup.lng, pickup.lat]
      : dropoff
      ? [dropoff.lng, dropoff.lat]
      : carrierPosition
      ? [carrierPosition.lng, carrierPosition.lat]
      : [69.2401, 41.2995];

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: initialStyle,
      center: fallbackCenter,
      zoom: 12,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");

    const ensureSourcesAndLayers = () => {
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
    };

    map.on("load", () => {
      ensureSourcesAndLayers();
      setIsMapReady(true);
    });
    map.on("styledata", ensureSourcesAndLayers);

    mapRef.current = map;

    return () => {
      pickupMarkerRef.current?.remove();
      dropoffMarkerRef.current?.remove();
      carrierMarkerRef.current?.remove();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const nextStyle = theme === "dark" ? STYLE_URL_DARK : STYLE_URL_LIGHT;
    map.setStyle(nextStyle);
  }, [theme]);

    useEffect(() => {
        const map = mapRef.current;
        if (!map || !isMapReady) return;

        if (!pickup) {
            pickupMarkerRef.current?.remove();
            pickupMarkerRef.current = null;
            return;
        }

        const lngLat: [number, number] = [Number(pickup.lng), Number(pickup.lat)];

        if (!pickupMarkerRef.current) {
            pickupMarkerRef.current = new maplibregl.Marker({ element: createMarkerElement("#16a34a") })
            .setLngLat(lngLat)
            .addTo(map);
        } else {
            pickupMarkerRef.current.setLngLat(lngLat);
        }
    }, [pickup, isMapReady]);

useEffect(() => {
  const map = mapRef.current;
  if (!map || !isMapReady) return;

  if (!dropoff) {
    dropoffMarkerRef.current?.remove();
    dropoffMarkerRef.current = null;
    return;
  }

  const lngLat: [number, number] = [Number(dropoff.lng), Number(dropoff.lat)];

  if (!dropoffMarkerRef.current) {
    dropoffMarkerRef.current = new maplibregl.Marker({ element: createMarkerElement("#dc2626") })
      .setLngLat(lngLat)
      .addTo(map);
  } else {
    dropoffMarkerRef.current.setLngLat(lngLat);
  }
}, [dropoff, isMapReady]);

useEffect(() => {
  const map = mapRef.current;
  if (!map || !isMapReady) return;

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
    carrierMarkerRef.current = new maplibregl.Marker({ element: createMarkerElement("#2563eb", true) })
      .setLngLat(lngLat)
      .addTo(map);
  } else {
    carrierMarkerRef.current.setLngLat(lngLat);
  }
}, [carrierPosition, isMapReady]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) return;

    const source = map.getSource(PLANNED_ROUTE_SOURCE_ID) as
      | maplibregl.GeoJSONSource
      | undefined;

    if (!source) return;

    if (pickup && dropoff) {
      source.setData(getLineFeature([pickup, dropoff]));
    } else {
      source.setData(emptyFeatureCollection());
    }
  }, [pickup, dropoff, isMapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) return;

    const source = map.getSource(TRACK_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    if (!source) return;

    if (trackPoints.length > 1) {
      source.setData(getLineFeature(trackPoints));
    } else {
      source.setData(emptyFeatureCollection());
    }
  }, [trackPoints, isMapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || hasInitiallyFittedRef.current || !isMapReady) return;

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
  }, [pickup, dropoff, carrierPosition, trackPoints, isMapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !carrierPosition || !followCarrier || !isMapReady) return;

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
  }, [carrierPosition, followCarrier, isMapReady]);

  return <div ref={mapContainerRef} className={className ?? "h-full w-full"} />;
}