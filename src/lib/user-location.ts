import * as Location from 'expo-location';

export type UserLocation = {
  latitude: number;
  longitude: number;
  city: string | null;
  district: string | null;
  region: string | null;
  country: string | null;
  label: string;
};

export async function getUserLocation(requestPermission = true): Promise<UserLocation | null> {
  try {
    let permission = await Location.getForegroundPermissionsAsync();

    if (permission.status !== 'granted' && requestPermission && permission.canAskAgain) {
      permission = await Location.requestForegroundPermissionsAsync();
    }

    if (permission.status !== 'granted') return null;

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const places = await Location.reverseGeocodeAsync({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    });
    const place = places[0];
    const city = place?.city || place?.subregion || place?.district || null;
    const district = place?.district || place?.subregion || null;
    const region = place?.region || null;
    const country = place?.country || null;
    const label = city || district || region || country || 'Near you';

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      city,
      district,
      region,
      country,
      label,
    };
  } catch {
    return null;
  }
}

export function eventMatchesUserLocation(
  event: { location?: string | null; venue?: string | null },
  userLocation: UserLocation | null,
) {
  if (!userLocation) return false;

  const haystack = `${event.location || ''} ${event.venue || ''}`.toLowerCase();
  const candidates = [userLocation.city, userLocation.district, userLocation.region]
    .map((value) => String(value || '').trim().toLowerCase())
    .filter((value) => value.length >= 3);

  return candidates.some((value) => haystack.includes(value));
}
