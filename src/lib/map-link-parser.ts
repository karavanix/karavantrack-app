/**
 * Parse coordinates from map service share links.
 *
 * Supported services: Google Maps, Apple Maps, Yandex Maps, 2GIS, raw coordinates.
 */

export interface ParsedCoords {
  lat: number;
  lng: number;
}

// ──── Individual Parsers ────

function parseGoogleMaps(text: string): ParsedCoords | null {
  // Pattern 1: /@lat,lng,zoom
  const atMatch = text.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (atMatch) {
    return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
  }

  // Pattern 2: ?q=lat,lng or &query=lat,lng
  const qMatch = text.match(/[?&](?:q|query)=(-?\d+\.?\d*)[,+](-?\d+\.?\d*)/);
  if (qMatch) {
    return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };
  }

  // Pattern 3: !3d=lat!4d=lng (data parameter)
  const dataMatch = text.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/);
  if (dataMatch) {
    return { lat: parseFloat(dataMatch[1]), lng: parseFloat(dataMatch[2]) };
  }

  return null;
}

function parseAppleMaps(text: string): ParsedCoords | null {
  // ?ll=lat,lng or ?sll=lat,lng
  const match = text.match(/[?&]s?ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (match) {
    return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
  }
  return null;
}

function parseYandexMaps(text: string): ParsedCoords | null {
  // ?ll=lng,lat (Yandex uses lng,lat order!)
  const llMatch = text.match(/[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (llMatch) {
    return { lat: parseFloat(llMatch[2]), lng: parseFloat(llMatch[1]) };
  }

  // ?text=lat,lng
  const textMatch = text.match(/[?&]text=(-?\d+\.?\d*)[,%20]+(-?\d+\.?\d*)/);
  if (textMatch) {
    return { lat: parseFloat(textMatch[1]), lng: parseFloat(textMatch[2]) };
  }

  // /geo/.../lat,lng or coordinates in the path
  const geoMatch = text.match(
    /yandex\.[a-z]+\/maps\/[^?]*?(-?\d+\.?\d*),(-?\d+\.?\d*)/
  );
  if (geoMatch) {
    return { lat: parseFloat(geoMatch[1]), lng: parseFloat(geoMatch[2]) };
  }

  return null;
}

function parse2Gis(text: string): ParsedCoords | null {
  // ?m=lng,lat (2GIS uses lng,lat order)
  const mMatch = text.match(/[?&]m=(-?\d+\.?\d*)[,%2C]+(-?\d+\.?\d*)/);
  if (mMatch) {
    return { lat: parseFloat(mMatch[2]), lng: parseFloat(mMatch[1]) };
  }

  // Coordinates in path: /69.279,41.311/
  const pathMatch = text.match(/2gis\.[a-z.]+\/[^?]*\/(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (pathMatch) {
    return { lat: parseFloat(pathMatch[2]), lng: parseFloat(pathMatch[1]) };
  }

  return null;
}

function parseRawCoords(text: string): ParsedCoords | null {
  // lat, lng — just two numbers separated by comma/space
  const trimmed = text.trim();
  const match = trimmed.match(/^(-?\d+\.?\d*)\s*[,\s]\s*(-?\d+\.?\d*)$/);
  if (match) {
    return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
  }
  return null;
}

// ──── Validation ────

function isValidCoords(coords: ParsedCoords): boolean {
  return (
    coords.lat >= -90 &&
    coords.lat <= 90 &&
    coords.lng >= -180 &&
    coords.lng <= 180 &&
    !isNaN(coords.lat) &&
    !isNaN(coords.lng)
  );
}

// ──── Detection ────

type MapService = "google" | "apple" | "yandex" | "2gis" | "raw" | null;

export function detectMapService(text: string): MapService {
  if (/google\.\w+\/maps|maps\.google\.\w+|goo\.gl\/maps|maps\.app\.goo\.gl/i.test(text)) {
    return "google";
  }
  if (/maps\.apple\.com/i.test(text)) return "apple";
  if (/yandex\.\w+\/maps/i.test(text)) return "yandex";
  if (/2gis\.\w+/i.test(text)) return "2gis";
  // Check if it's raw coords
  if (/^-?\d+\.?\d*\s*[,\s]\s*-?\d+\.?\d*$/.test(text.trim())) return "raw";
  return null;
}

// ──── Main Parser ────

export interface ParseMapLinkResult {
  coords: ParsedCoords;
  service: MapService;
}

/**
 * Try to extract lat/lng from a pasted text.
 * Returns null if the text doesn't match any known map link format.
 */
export function parseMapLink(text: string): ParseMapLinkResult | null {
  const service = detectMapService(text);
  let coords: ParsedCoords | null = null;

  switch (service) {
    case "google":
      coords = parseGoogleMaps(text);
      break;
    case "apple":
      coords = parseAppleMaps(text);
      break;
    case "yandex":
      coords = parseYandexMaps(text);
      break;
    case "2gis":
      coords = parse2Gis(text);
      break;
    case "raw":
      coords = parseRawCoords(text);
      break;
    default:
      return null;
  }

  if (coords && isValidCoords(coords)) {
    return { coords, service };
  }
  return null;
}

/**
 * Human-readable label for the map service.
 */
export function getServiceLabel(service: MapService): string {
  switch (service) {
    case "google":
      return "Google Maps";
    case "apple":
      return "Apple Maps";
    case "yandex":
      return "Yandex Maps";
    case "2gis":
      return "2GIS";
    case "raw":
      return "coordinates";
    default:
      return "";
  }
}
