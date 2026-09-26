import { useEffect, useRef, useState } from "react";
import maplibregl, { type LayerSpecification, type StyleSpecification } from "maplibre-gl";
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

/**
 * setStyle swaps the whole style, which drops the sources and layers added at
 * runtime (tracks, routes) along with their data. Carry them over into the
 * next style at the same place in the layer order. Also sets the "theme"
 * global state that runtime layers use to pick their colors.
 */
function carryOverRuntimeLayers(
  prev: StyleSpecification | undefined,
  next: StyleSpecification,
  theme: string
): StyleSpecification {
  const state = { ...next.state, theme: { default: theme } };
  if (!prev) return { ...next, state };

  const sources = { ...next.sources };
  const runtimeSources = new Set<string>();
  for (const [id, source] of Object.entries(prev.sources)) {
    if (id in sources) continue;
    sources[id] = source;
    runtimeSources.add(id);
  }

  const isRuntime = (layer: LayerSpecification) =>
    "source" in layer && typeof layer.source === "string" && runtimeSources.has(layer.source);
  const nextIds = new Set(next.layers.map((l) => l.id));
  const layers = [...next.layers];
  prev.layers.forEach((layer, i) => {
    if (!isRuntime(layer)) return;
    // Insert before the first basemap layer that followed it before.
    const anchor = prev.layers.slice(i + 1).find((l) => nextIds.has(l.id));
    const at = anchor ? layers.findIndex((l) => l.id === anchor.id) : layers.length;
    layers.splice(at, 0, layer);
  });

  return { ...next, sources, layers, state };
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
  const appliedThemeRef = useRef(theme);

  useEffect(() => {
    ensureProtocol();
    if (!containerRef.current || mapRef.current) return;

    const { center: c, zoom: z, theme: t } = initRef.current;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: getStyleUrl(t),
      center: c,
      zoom: z,
      // ── Performance & UX tweaks ──
      fadeDuration: 0,          // Tiles appear instantly; no slow fade-in on load
      renderWorldCopies: false, // Only one world copy — saves GPU on logistics maps
      maxPitch: 0,              // Keep map flat; these are 2D tracking maps
      pitchWithRotate: false,   // Prevent accidental pitch from pinch-rotate
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");

    map.on("load", () => {
      map.setGlobalStateProperty("theme", appliedThemeRef.current);
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

  // Theme switching. The map was created with the initial theme's style, so
  // only a real change swaps it.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || appliedThemeRef.current === theme) return;
    appliedThemeRef.current = theme;
    map.setStyle(getStyleUrl(theme), {
      transformStyle: (prev, next) => carryOverRuntimeLayers(prev, next, theme),
    });
  }, [theme]);

  return { containerRef, mapRef, isReady, error };
}
