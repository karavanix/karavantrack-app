import { useEffect, useRef } from "react";
import maplibregl, { LngLatBounds } from "maplibre-gl";
import { Protocol } from "pmtiles";
import "maplibre-gl/dist/maplibre-gl.css";
import { useThemeStore } from "@/stores/theme-store";

const STYLE_URL_DARK = "https://yool.hel1.your-objectstorage.com/styles/dark.json";
const STYLE_URL_LIGHT = "https://yool.hel1.your-objectstorage.com/styles/light.json";

const ROUTE_SOURCE_ID = "route-source";
const ROUTE_LAYER_ID = "route-layer";

let protocolRegistered = false;

export type LatLng = {
  lat: number;
  lng: number;
};

type Props = {
  center?: LatLng;
  pickup: LatLng | null;
  dropoff: LatLng | null;
  mapMode: "pickup" | "dropoff";
  flyTarget: LatLng | null;
  onPickup: (point: LatLng) => void;
  onDropoff: (point: LatLng) => void;
  className?: string;
};

function getRouteGeoJSON(pickup: LatLng, dropoff: LatLng) {
  return {
    type: "FeatureCollection" as const,
    features: [
      {
        type: "Feature" as const,
        properties: {},
        geometry: {
          type: "LineString" as const,
          coordinates: [
            [pickup.lng, pickup.lat],
            [dropoff.lng, dropoff.lat],
          ],
        },
      },
    ],
  };
}

export default function MapLibrePickupMap({
  center,
  pickup,
  dropoff,
  mapMode,
  flyTarget,
  onPickup,
  onDropoff,
  className,
}: Props) {
  const { theme } = useThemeStore();

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  const pickupMarkerRef = useRef<maplibregl.Marker | null>(null);
  const dropoffMarkerRef = useRef<maplibregl.Marker | null>(null);

  const mapModeRef = useRef(mapMode);
  const onPickupRef = useRef(onPickup);
  const onDropoffRef = useRef(onDropoff);

  useEffect(() => {
    mapModeRef.current = mapMode;
  }, [mapMode]);

  useEffect(() => {
    onPickupRef.current = onPickup;
  }, [onPickup]);

  useEffect(() => {
    onDropoffRef.current = onDropoff;
  }, [onDropoff]);

  useEffect(() => {
    if (!protocolRegistered) {
      const protocol = new Protocol();
      maplibregl.addProtocol("pmtiles", protocol.tile);
      protocolRegistered = true;
    }

    if (!mapContainerRef.current || mapRef.current) return;

    const initialStyle = theme === "dark" ? STYLE_URL_DARK : STYLE_URL_LIGHT;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: initialStyle,
      center: center ? [center.lng, center.lat] : [69.2401, 41.2995],
      zoom: 12,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");

    map.on("click", (e) => {
      const point: LatLng = {
        lat: e.lngLat.lat,
        lng: e.lngLat.lng,
      };

      if (mapModeRef.current === "pickup") {
        onPickupRef.current(point);
      } else {
        onDropoffRef.current(point);
      }
    });

    const addRouteLayer = () => {
      if (!map.getSource(ROUTE_SOURCE_ID)) {
        map.addSource(ROUTE_SOURCE_ID, {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: [],
          },
        });
      }

      if (!map.getLayer(ROUTE_LAYER_ID)) {
        map.addLayer({
          id: ROUTE_LAYER_ID,
          type: "line",
          source: ROUTE_SOURCE_ID,
          layout: {
            "line-cap": "round",
            "line-join": "round",
          },
          paint: {
            "line-color": "#2563eb",
            "line-width": 4,
            "line-opacity": 0.9,
          },
        });
      }
    };

    map.on("load", addRouteLayer);
    map.on("styledata", addRouteLayer);

    mapRef.current = map;

    return () => {
      pickupMarkerRef.current?.remove();
      dropoffMarkerRef.current?.remove();
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
    if (!map) return;

    if (!pickup) {
      pickupMarkerRef.current?.remove();
      pickupMarkerRef.current = null;
      return;
    }

    if (!pickupMarkerRef.current) {
      pickupMarkerRef.current = new maplibregl.Marker({ color: "#16a34a" })
        .setLngLat([pickup.lng, pickup.lat])
        .addTo(map);
    } else {
      pickupMarkerRef.current.setLngLat([pickup.lng, pickup.lat]);
    }
  }, [pickup]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!dropoff) {
      dropoffMarkerRef.current?.remove();
      dropoffMarkerRef.current = null;
      return;
    }

    if (!dropoffMarkerRef.current) {
      dropoffMarkerRef.current = new maplibregl.Marker({ color: "#dc2626" })
        .setLngLat([dropoff.lng, dropoff.lat])
        .addTo(map);
    } else {
      dropoffMarkerRef.current.setLngLat([dropoff.lng, dropoff.lat]);
    }
  }, [dropoff]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const source = map.getSource(ROUTE_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    if (!source) return;

    if (pickup && dropoff) {
      source.setData(getRouteGeoJSON(pickup, dropoff));

      const bounds = new LngLatBounds(
        [pickup.lng, pickup.lat],
        [pickup.lng, pickup.lat]
      );

      bounds.extend([dropoff.lng, dropoff.lat]);

      map.fitBounds(bounds, {
        padding: 60,
        maxZoom: 14,
        duration: 800,
      });
    } else {
      source.setData({
        type: "FeatureCollection",
        features: [],
      });
    }
  }, [pickup, dropoff]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !flyTarget || (pickup && dropoff)) return;

    map.flyTo({
      center: [flyTarget.lng, flyTarget.lat],
      zoom: 15,
      essential: true,
    });
  }, [flyTarget, pickup, dropoff]);

  return <div ref={mapContainerRef} className={className ?? "h-full w-full"} />;
}