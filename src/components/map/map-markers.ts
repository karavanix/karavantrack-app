import maplibregl from "maplibre-gl";

export type MarkerVariant = "pickup" | "dropoff" | "carrier";

const VARIANT_CONFIG: Record<MarkerVariant, { color: string; label: string; pulse: boolean }> = {
  pickup:  { color: "#16a34a", label: "Pickup",  pulse: false },
  dropoff: { color: "#dc2626", label: "Dropoff", pulse: false },
  carrier: { color: "#2563eb", label: "Carrier", pulse: true  },
};

/**
 * Creates a styled marker DOM element with a label and optional heading arrow.
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

  // ── Dot + heading container ──
  const dotContainer = document.createElement("div");
  dotContainer.style.cssText = "position: relative; width: 18px; height: 18px;";

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

  dotContainer.appendChild(dot);

  // ── Heading arrow (carrier only, hidden by default) ──
  if (variant === "carrier") {
    const arrow = document.createElement("div");
    arrow.className = "marker-heading-arrow";
    arrow.style.cssText = `
      position: absolute;
      top: -12px;
      left: 50%;
      transform: translateX(-50%) rotate(0deg);
      width: 0;
      height: 0;
      border-left: 5px solid transparent;
      border-right: 5px solid transparent;
      border-bottom: 10px solid ${color};
      filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));
      transition: transform 0.6s ease-out;
      display: none;
    `;
    dotContainer.appendChild(arrow);
  }

  wrapper.appendChild(dotContainer);

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

/**
 * Update the heading arrow rotation on a carrier marker.
 * `headingDeg` is degrees clockwise from north (0 = north, 90 = east).
 */
export function updateMarkerHeading(
  marker: maplibregl.Marker,
  headingDeg: number | null | undefined
) {
  const el = marker.getElement();
  const arrow = el.querySelector(".marker-heading-arrow") as HTMLElement | null;
  if (!arrow) return;

  if (headingDeg == null || headingDeg === 0) {
    arrow.style.display = "none";
    return;
  }

  arrow.style.display = "block";
  arrow.style.transform = `translateX(-50%) rotate(${headingDeg}deg)`;
}
