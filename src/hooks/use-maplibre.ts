import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { Protocol } from "pmtiles";
import "maplibre-gl/dist/maplibre-gl.css";
import { useThemeStore } from "@/stores/theme-store";

const STYLE_URL_DARK = "https://yool.hel1.your-objectstorage.com/styles/dark.json";
const STYLE_URL_LIGHT = "https://yool.hel1.your-objectstorage.com/styles/light.json";

let protocolRegistered = false;

function ensureProtocol() {
  if (protocolRegistered) return;
  const protocol = new Protocol();
  maplibregl.addProtocol("pmtiles", protocol.tile);
  protocolRegistered = true;
}

export function getStyleUrl(theme: string) {
  return theme === "dark" ? STYLE_URL_DARK : STYLE_URL_LIGHT;
}

export type LatLng = {
  lat: number;
  lng: number;
};

interface UseMapLibreOptions {
  center?: [number, number];
  zoom?: number;
  /** Called once after the first `load` event fires. */
  onReady?: (map: maplibregl.Map) => void;
  /** Called after every `styledata` event (including the first load). */
  onStyleReady?: (map: maplibregl.Map) => void;
}

/**
 * Shared hook for MapLibre GL map lifecycle.
 *
 * Handles PMTiles protocol registration, map creation, navigation control,
 * theme switching, and cleanup. Returns a container ref, the map instance,
 * readiness flag, and any error.
 */
export function useMapLibre(opts: UseMapLibreOptions = {}) {
  const { center = [69.2401, 41.2995], zoom = 12, onReady, onStyleReady } = opts;
  const { theme } = useThemeStore();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stable refs for callbacks so callers don't need to memoize
  const onReadyRef = useRef(onReady);
  const onStyleReadyRef = useRef(onStyleReady);
  useEffect(() => { onReadyRef.current = onReady; }, [onReady]);
  useEffect(() => { onStyleReadyRef.current = onStyleReady; }, [onStyleReady]);

  // Stable ref for initial values so the init effect has no deps
  const initRef = useRef({ center, zoom, theme });

  useEffect(() => {
    ensureProtocol();
    if (!containerRef.current || mapRef.current) return;

    const { center: c, zoom: z, theme: t } = initRef.current;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: getStyleUrl(t),
      center: c,
      zoom: z,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");

    map.on("load", () => {
      onStyleReadyRef.current?.(map);
      setIsReady(true);
      setError(null);
      onReadyRef.current?.(map);
    });

    map.on("styledata", () => {
      onStyleReadyRef.current?.(map);
    });

    map.on("error", (e) => {
      const msg = e.error?.message || "Map failed to load";
      // Only set error for fatal issues (style/tile loading), not per-tile glitches
      if (!isReady) {
        setError(msg);
      }
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Theme switching
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setStyle(getStyleUrl(theme));
  }, [theme]);

  return { containerRef, mapRef, isReady, error };
}
