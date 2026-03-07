import axios from "axios";

// ──── Configuration ────

const GEOCODING_URL =
  import.meta.env.VITE_GEOCODING_URL || "/geocoding";

const geocoder = axios.create({
  baseURL: GEOCODING_URL,
  timeout: 5000,
});

// ──── Types ────

export interface PhotonGeometry {
  type: string;
  coordinates: [number, number]; // [lng, lat]
}

export interface PhotonProperties {
  name?: string;
  country?: string;
  countrycode?: string;
  state?: string;
  county?: string;
  city?: string;
  district?: string;
  street?: string;
  housenumber?: string;
  postcode?: string;
  osm_key?: string;
  osm_value?: string;
  osm_type?: string;
  osm_id?: number;
  extent?: [number, number, number, number];
}

export interface PhotonFeature {
  type: string;
  geometry: PhotonGeometry;
  properties: PhotonProperties;
}

export interface PhotonResponse {
  type: string;
  features: PhotonFeature[];
}

// ──── API Functions ────

export interface SearchOptions {
  limit?: number;
  lang?: string;
  lat?: number;
  lon?: number;
  layer?: string;
}

/**
 * Forward geocoding — search places by free-form text.
 */
export async function searchPlaces(
  query: string,
  opts: SearchOptions = {}
): Promise<PhotonFeature[]> {
  const { limit = 5, lang, lat, lon, layer } = opts;
  const params: Record<string, string | number> = { q: query, limit };
  if (lang) params.lang = lang;
  if (lat !== undefined && lon !== undefined) {
    params.lat = lat;
    params.lon = lon;
  }
  if (layer) params.layer = layer;

  const { data } = await geocoder.get<PhotonResponse>("/api", { params });
  return data.features ?? [];
}

/**
 * Reverse geocoding — find place name from coordinates.
 */
export async function reverseGeocode(
  lat: number,
  lon: number,
  lang?: string
): Promise<PhotonFeature | null> {
  const params: Record<string, string | number> = { lat, lon, limit: 1 };
  if (lang) params.lang = lang;

  const { data } = await geocoder.get<PhotonResponse>("/reverse", { params });
  return data.features?.[0] ?? null;
}

// ──── Helpers ────

/**
 * Build a human-readable address string from Photon feature properties.
 * Example output: "Tashkent International Airport, Tashkent, Uzbekistan"
 */
export function formatPhotonFeature(feature: PhotonFeature): string {
  const p = feature.properties;
  const parts: string[] = [];

  if (p.name) parts.push(p.name);

  // Street + housenumber
  if (p.street) {
    const street = p.housenumber ? `${p.street} ${p.housenumber}` : p.street;
    if (!parts.includes(street)) parts.push(street);
  }

  // City / district
  const locality = p.city || p.district || p.county;
  if (locality && !parts.includes(locality)) parts.push(locality);

  // Country
  if (p.country && !parts.includes(p.country)) parts.push(p.country);

  return parts.join(", ") || "Unknown location";
}

/**
 * Extract lat/lng from a Photon feature geometry.
 */
export function getFeatureLatLng(feature: PhotonFeature): {
  lat: number;
  lng: number;
} {
  const [lng, lat] = feature.geometry.coordinates;
  return { lat, lng };
}
