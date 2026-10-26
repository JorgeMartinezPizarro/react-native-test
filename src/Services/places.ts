import { SEARCH_URL } from '../config';
import { LatLng } from '../Utils/geo';

export interface Place {
  id: string;
  name: string;
  address: string;
  /** OSM key/value, e.g. "amenity"/"cafe" — used to pick an icon */
  kind: string;
  category: string;
  coordinate: LatLng;
}

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    osm_type?: string;
    osm_id?: number;
    osm_key?: string;
    osm_value?: string;
    name?: string;
    street?: string;
    housenumber?: string;
    locality?: string;
    district?: string;
    city?: string;
    state?: string;
    country?: string;
  };
}

/** Search places by text, biased towards `near` when given */
export async function searchPlaces(query: string, near: LatLng | null, signal?: AbortSignal): Promise<Place[]> {
  const params = [`q=${encodeURIComponent(query)}`, 'limit=8'];
  if (near) params.push(`lat=${near.latitude.toFixed(5)}`, `lon=${near.longitude.toFixed(5)}`);

  const res = await fetch(`${SEARCH_URL}?${params.join('&')}`, { signal });
  if (!res.ok) throw new Error(`Search failed (${res.status})`);
  const data: { features: PhotonFeature[] } = await res.json();

  // The same place often comes back several times (building, shop, entrance…)
  const seen = new Set<string>();
  return data.features.map(toPlace).filter(place => {
    const key = `${place.name}|${place.address}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function toPlace({ geometry, properties: p }: PhotonFeature, index: number): Place {
  const street = [p.street, p.housenumber].filter(Boolean).join(' ');
  const name = p.name || street || p.city || 'Lugar sin nombre';
  const parts = [street, p.locality || p.district, p.city, p.country].filter(
    (part, i, all): part is string => !!part && part !== name && all.indexOf(part) === i
  );

  return {
    id: `${p.osm_type ?? ''}${p.osm_id ?? index}`,
    name,
    address: parts.slice(0, 3).join(', '),
    kind: p.osm_key ?? '',
    category: p.osm_value ?? '',
    coordinate: { latitude: geometry.coordinates[1], longitude: geometry.coordinates[0] },
  };
}
