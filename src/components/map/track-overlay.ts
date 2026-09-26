import type maplibregl from "maplibre-gl";
import type { ExpressionSpecification, GeoJSONSource } from "maplibre-gl";
import type { Feature, FeatureCollection, LineString, Point } from "geojson";
import { decodePolyline } from "@/lib/polyline";
import type { LoadRoute, TrackPoint } from "@/types";

/**
 * The track drawn on the load map: the route matched to roads (GET /route),
 * or the raw points while there's no route yet, plus the live tail up to the
 * carrier marker.
 *
 * Three sources, split by how often they change: route lines (every minute
 * at most), route points — stops and gap labels (same), and the live tail
 * (every position update, so it's kept tiny and separate from a route that
 * can be hundreds of km long).
 */

const LINES_SOURCE = "yool-track-lines";
const POINTS_SOURCE = "yool-track-points";
const TAIL_SOURCE = "yool-track-tail";

const CASING_LAYER = "yool-track-casing";
const TAIL_CASING_LAYER = "yool-track-tail-casing";
const GAP_LAYER = "yool-track-gap";
const LINE_LAYER = "yool-track-line";
const TAIL_LAYER = "yool-track-tail";
const ARROWS_LAYER = "yool-track-arrows";
const GAP_LABELS_LAYER = "yool-track-gap-labels";
export const STOPS_LAYER = "yool-track-stops";

const ARROW_IMAGE = "yool-track-arrow";
const STOP_IMAGE = "yool-track-stop";

/**
 * matched / raw / gap come from the route; "track" is the raw points drawn
 * the old way while there's no route (404: not matched yet or matching off).
 */
export type TrackLineKind = "matched" | "raw" | "gap" | "track";

export type TrackLineProps = { kind: TrackLineKind };

export type TrackPointProps =
  | { kind: "stop"; started_at: string; ended_at: string; minutes: number }
  | { kind: "gap"; minutes: number; label: string };

type LngLat = [number, number];

// ── Colors ──
// The map's "theme" global state is set by useMapLibre on load and on every
// theme switch, so the layers restyle themselves without setPaintProperty.

const isDark: ExpressionSpecification = ["==", ["global-state", "theme"], "dark"];

function byTheme(dark: string, light: string): ExpressionSpecification {
  return ["case", isDark, dark, light];
}

const TRACK_BLUE = byTheme("#3b82f6", "#2563eb");
const TRACK_GREY = byTheme("#94a3b8", "#64748b");
const CASING = byTheme("#0f172a", "#ffffff");

// ── Widths ──
// Thin on an overview of the whole trip, navigator-thick up close.

const WIDTH_ZOOMS = [8, 12, 16, 19];
const MAIN_WIDTHS = [2.5, 4, 8, 12];
const RAW_WIDTHS = [1.5, 2.5, 4, 5];
const TAIL_WIDTHS = [2, 3, 4.5, 6];
const GAP_WIDTHS = [1.5, 2, 2.5, 3];
const CASING_EXTRA = 3;

function widthByZoom(
  widths: number[] | ((i: number) => ExpressionSpecification | number)
): ExpressionSpecification {
  const at = (i: number) => (typeof widths === "function" ? widths(i) : widths[i]);
  return ["interpolate", ["linear"], ["zoom"], ...WIDTH_ZOOMS.flatMap((z, i) => [z, at(i)])] as ExpressionSpecification;
}

/** Track line width: raw segments are thinner than the matched track. */
function trackWidth(extra = 0) {
  return widthByZoom((i) => ["match", ["get", "kind"], "raw", RAW_WIDTHS[i] + extra, MAIN_WIDTHS[i] + extra]);
}

// ── Data ──

function minutesBetween(from: string, to: string) {
  return Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60000);
}

function lineFeature(kind: TrackLineKind, coordinates: LngLat[]): Feature<LineString, TrackLineProps> {
  return { type: "Feature", properties: { kind }, geometry: { type: "LineString", coordinates } };
}

function pointFeature(props: TrackPointProps, coordinates: LngLat): Feature<Point, TrackPointProps> {
  return { type: "Feature", properties: props, geometry: { type: "Point", coordinates } };
}

export type RouteOverlay = {
  lines: FeatureCollection<LineString, TrackLineProps>;
  points: FeatureCollection<Point, TrackPointProps>;
  /** Where the drawn track ends: the live tail starts here. */
  end: LngLat | null;
  /** Track points recorded after this are the live tail; null = none are. */
  tailAfter: string | null;
};

/**
 * Builds the route part of the overlay. Without a route, draws the raw track
 * points as one line, like before matching existed.
 */
export function buildRouteOverlay(
  route: LoadRoute | null,
  trackPoints: Pick<TrackPoint, "lat" | "lng">[],
  gapLabel: (minutes: number) => string
): RouteOverlay {
  const lines: Feature<LineString, TrackLineProps>[] = [];
  const points: Feature<Point, TrackPointProps>[] = [];

  if (!route || route.segments.length === 0) {
    const coords = trackPoints.map((p): LngLat => [p.lng, p.lat]);
    if (coords.length > 1) lines.push(lineFeature("track", coords));
    return {
      lines: { type: "FeatureCollection", features: lines },
      points: { type: "FeatureCollection", features: points },
      end: coords.at(-1) ?? null,
      tailAfter: null,
    };
  }

  let end: LngLat | null = null;
  for (const seg of route.segments) {
    const coords = decodePolyline(seg.geometry);
    if (coords.length === 0) continue;
    end = coords[coords.length - 1];

    const minutes = minutesBetween(seg.started_at, seg.ended_at);
    if (seg.kind === "stop") {
      points.push(pointFeature(
        { kind: "stop", started_at: seg.started_at, ended_at: seg.ended_at, minutes },
        coords[0]
      ));
      continue;
    }
    if (coords.length < 2) continue;
    lines.push(lineFeature(seg.kind, coords));

    if (seg.kind === "gap") {
      const [a, b] = [coords[0], coords[coords.length - 1]];
      points.push(pointFeature(
        { kind: "gap", minutes, label: gapLabel(minutes) },
        [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
      ));
    }
  }

  return {
    lines: { type: "FeatureCollection", features: lines },
    points: { type: "FeatureCollection", features: points },
    end,
    tailAfter: route.matched_until ?? route.segments[route.segments.length - 1].ended_at,
  };
}

/**
 * The live tail: from the end of the drawn track through the points the
 * matcher hasn't covered yet, up to the carrier marker. Drawn raw, in blue —
 * it isn't "the matcher failed", it's "not processed yet".
 */
export function buildTail(
  overlay: RouteOverlay,
  trackPoints: Pick<TrackPoint, "lat" | "lng" | "recorded_at">[],
  carrier: { lat: number; lng: number } | null
): FeatureCollection<LineString> {
  const coords: LngLat[] = [];
  if (overlay.end) coords.push(overlay.end);
  if (overlay.tailAfter) {
    // Points are oldest first and the tail is short: scan from the end.
    const after = new Date(overlay.tailAfter).getTime();
    let from = trackPoints.length;
    while (from > 0 && new Date(trackPoints[from - 1].recorded_at).getTime() > after) from--;
    for (const p of trackPoints.slice(from)) coords.push([p.lng, p.lat]);
  }
  if (carrier) coords.push([carrier.lng, carrier.lat]);

  return {
    type: "FeatureCollection",
    features: coords.length > 1
      ? [{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: coords } }]
      : [],
  };
}

// ── Images ──
// Drawn on a canvas at 2x, so no sprite files are needed.

function drawImage(size: number, draw: (ctx: CanvasRenderingContext2D, px: number) => void) {
  const px = size * 2;
  const canvas = document.createElement("canvas");
  canvas.width = px;
  canvas.height = px;
  const ctx = canvas.getContext("2d")!;
  draw(ctx, px);
  return ctx.getImageData(0, 0, px, px);
}

/**
 * A filled arrowhead pointing right: along the line for line-placed symbols.
 * It's 8px tall in the 16px image; icon-size keeps it at about 2/3 of the line
 * width, so blue always shows around it (touching the white casing, it would
 * read as a break in the line).
 */
function arrowImage() {
  return drawImage(16, (ctx, px) => {
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(px * 0.3, px * 0.25);
    ctx.lineTo(px * 0.7, px * 0.5);
    ctx.lineTo(px * 0.3, px * 0.75);
    ctx.closePath();
    ctx.fill();
  });
}

/** A "P" parking badge. */
function stopImage() {
  return drawImage(20, (ctx, px) => {
    const r = px / 2;
    ctx.beginPath();
    ctx.arc(r, r, r - px * 0.06, 0, Math.PI * 2);
    ctx.fillStyle = "#334155";
    ctx.fill();
    ctx.lineWidth = px * 0.1;
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${px * 0.55}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("P", r, r + px * 0.03);
  });
}

// ── Sources & layers ──

const EMPTY: FeatureCollection = { type: "FeatureCollection", features: [] };

/**
 * Adds the overlay's images, sources and layers where missing. Safe to call
 * on every `styledata`: after a theme switch the sources and layers are
 * carried over by useMapLibre, but images may need re-adding.
 */
export function ensureTrackOverlay(map: maplibregl.Map) {
  if (!map.hasImage(ARROW_IMAGE)) map.addImage(ARROW_IMAGE, arrowImage(), { pixelRatio: 2 });
  if (!map.hasImage(STOP_IMAGE)) map.addImage(STOP_IMAGE, stopImage(), { pixelRatio: 2 });

  for (const id of [LINES_SOURCE, POINTS_SOURCE, TAIL_SOURCE]) {
    if (!map.getSource(id)) map.addSource(id, { type: "geojson", data: EMPTY });
  }

  const addLayer = (layer: maplibregl.AddLayerObject) => {
    if (!map.getLayer(layer.id)) map.addLayer(layer);
  };
  const round = { "line-cap": "round", "line-join": "round" } as const;
  const notGap: ExpressionSpecification = ["!=", ["get", "kind"], "gap"];

  // Casing: a wider line under the track, so it reads on any basemap.
  addLayer({
    id: CASING_LAYER, type: "line", source: LINES_SOURCE, filter: notGap, layout: round,
    paint: { "line-color": CASING, "line-width": trackWidth(CASING_EXTRA), "line-opacity": 0.9 },
  });
  addLayer({
    id: TAIL_CASING_LAYER, type: "line", source: TAIL_SOURCE, layout: round,
    paint: {
      "line-color": CASING,
      "line-width": widthByZoom(TAIL_WIDTHS.map((w) => w + CASING_EXTRA)),
      "line-opacity": 0.9,
    },
  });
  addLayer({
    id: GAP_LAYER, type: "line", source: LINES_SOURCE, filter: ["==", ["get", "kind"], "gap"],
    layout: { "line-cap": "butt" },
    paint: { "line-color": TRACK_GREY, "line-width": widthByZoom(GAP_WIDTHS), "line-dasharray": [3, 2] },
  });
  addLayer({
    id: LINE_LAYER, type: "line", source: LINES_SOURCE, filter: notGap, layout: round,
    paint: {
      "line-color": ["match", ["get", "kind"], "raw", TRACK_GREY, TRACK_BLUE],
      "line-width": trackWidth(),
    },
  });
  addLayer({
    id: TAIL_LAYER, type: "line", source: TAIL_SOURCE, layout: round,
    paint: { "line-color": TRACK_BLUE, "line-width": widthByZoom(TAIL_WIDTHS) },
  });
  // Direction arrows along the blue track, once it's thick enough to hold
  // them; sized to stay inside the line.
  addLayer({
    id: ARROWS_LAYER, type: "symbol", source: LINES_SOURCE, minzoom: 15,
    filter: ["in", ["get", "kind"], ["literal", ["matched", "track"]]],
    layout: {
      "symbol-placement": "line",
      "symbol-spacing": 80,
      "icon-image": ARROW_IMAGE,
      "icon-size": ["interpolate", ["linear"], ["zoom"], 15, 0.57, 16, 0.65, 19, 0.97],
      "icon-allow-overlap": true,
      "icon-ignore-placement": true,
    },
  });
  // "No data N min" in the middle of a gap; hidden when it collides.
  addLayer({
    id: GAP_LABELS_LAYER, type: "symbol", source: POINTS_SOURCE,
    filter: ["==", ["get", "kind"], "gap"],
    layout: {
      "text-field": ["get", "label"],
      "text-font": ["Noto Sans Medium"],
      "text-size": 11,
      "text-max-width": 30,
    },
    paint: {
      "text-color": byTheme("#e2e8f0", "#334155"),
      "text-halo-color": CASING,
      "text-halo-width": 1.5,
    },
  });
  addLayer({
    id: STOPS_LAYER, type: "symbol", source: POINTS_SOURCE,
    filter: ["==", ["get", "kind"], "stop"],
    layout: { "icon-image": STOP_IMAGE, "icon-allow-overlap": true },
  });
}

export function setTrackOverlayData(
  map: maplibregl.Map,
  overlay: Pick<RouteOverlay, "lines" | "points">
) {
  (map.getSource(LINES_SOURCE) as GeoJSONSource | undefined)?.setData(overlay.lines);
  (map.getSource(POINTS_SOURCE) as GeoJSONSource | undefined)?.setData(overlay.points);
}

export function setTrackTailData(map: maplibregl.Map, tail: FeatureCollection<LineString>) {
  (map.getSource(TAIL_SOURCE) as GeoJSONSource | undefined)?.setData(tail);
}
