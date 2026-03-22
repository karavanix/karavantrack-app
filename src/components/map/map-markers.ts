import maplibregl from "maplibre-gl";

export type MarkerVariant = "pickup" | "dropoff" | "carrier";

const VARIANT_CONFIG: Record<MarkerVariant, { color: string; label: string; pulse: boolean }> = {
  pickup:  { color: "#16a34a", label: "Pickup",  pulse: false },
  dropoff: { color: "#dc2626", label: "Dropoff", pulse: false },
  carrier: { color: "#2563eb", label: "Carrier", pulse: true  },
};

/**
 * Creates a styled marker DOM element with an optional label tooltip.
 */
function createMarkerElement(variant: MarkerVariant) {
  const { color, label, pulse } = VARIANT_CONFIG[variant];

  const wrapper = document.createElement("div");
  wrapper.style.display = "flex";
  wrapper.style.flexDirection = "column";
  wrapper.style.alignItems = "center";
  wrapper.style.cursor = "pointer";

  // ── Label ──
  const tag = document.createElement("span");
  tag.textContent = label;
  tag.style.cssText = `
    font-size: 10px;
    font-weight: 600;
    line-height: 1;
    padding: 2px 6px;
    border-radius: 4px;
    background: rgba(0,0,0,0.72);
    color: #fff;
    white-space: nowrap;
    margin-bottom: 4px;
    pointer-events: none;
  `;
  wrapper.appendChild(tag);

  // ── Dot ──
  const dot = document.createElement("div");
  dot.style.cssText = `
    width: 18px;
    height: 18px;
    border-radius: 9999px;
    background: ${color};
    border: 3px solid white;
    box-shadow: 0 2px 10px rgba(0,0,0,0.25);
  `;

  if (pulse) {
    dot.animate(
      [
        { transform: "scale(1)",    opacity: "1" },
        { transform: "scale(1.25)", opacity: "0.7" },
        { transform: "scale(1)",    opacity: "1" },
      ],
      { duration: 1400, iterations: Infinity }
    );
  }

  wrapper.appendChild(dot);

  return wrapper;
}

/**
 * Create a MapLibre Marker with consistent styling and a label.
 */
export function createMapMarker(
  variant: MarkerVariant,
  lngLat: [number, number]
) {
  return new maplibregl.Marker({
    element: createMarkerElement(variant),
    anchor: "bottom",
  }).setLngLat(lngLat);
}
