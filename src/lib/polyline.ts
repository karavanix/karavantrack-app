/**
 * Decodes an encoded polyline (the Google / @mapbox/polyline algorithm) into
 * `[lng, lat]` pairs, ready for GeoJSON. The backend encodes route geometry
 * with precision 6 ("polyline6"), latitude first in each pair.
 */
export function decodePolyline(encoded: string, precision = 6): [number, number][] {
  const factor = 10 ** precision;
  const coords: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  const nextDelta = () => {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encoded.length);
    return result & 1 ? ~(result >>> 1) : result >>> 1;
  };

  while (index < encoded.length) {
    lat += nextDelta();
    lng += nextDelta();
    coords.push([lng / factor, lat / factor]);
  }

  return coords;
}
