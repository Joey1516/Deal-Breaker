import { reverseGeocodeAddress } from './api';

const COUNTRIES = [
  { code: 'us', name: 'United States' },
  { code: 'gb', name: 'United Kingdom' },
  { code: 'in', name: 'India' },
  { code: 'ca', name: 'Canada' },
  { code: 'au', name: 'Australia' },
  { code: 'de', name: 'Germany' },
  { code: 'fr', name: 'France' },
  { code: 'ae', name: 'UAE' },
  { code: 'sg', name: 'Singapore' },
  { code: 'jp', name: 'Japan' },
];

async function reverseGeocode(lat, lon, accuracy) {
  const data = await reverseGeocodeAddress(lat, lon);
  if (!data.countryCode) throw new Error('no country in reverse geocode response');
  return {
    countryCode: data.countryCode.toLowerCase(),
    countryName: data.countryName,
    city: data.city || null,
    region: data.region || null,
    fullAddress: data.displayName || null,
    lat,
    lon,
    accuracy: accuracy ?? null,
    source: 'gps',
  };
}

async function ipLocate() {
  const res = await fetch('https://ipwho.is/');
  if (!res.ok) throw new Error('ip lookup failed');
  const data = await res.json();
  if (!data.success || !data.country_code) throw new Error('ip lookup returned no country');
  return {
    countryCode: data.country_code.toLowerCase(),
    countryName: data.country,
    city: data.city || null,
    region: data.region || null,
    fullAddress: null,
    lat: data.latitude ?? null,
    lon: data.longitude ?? null,
    accuracy: null,
    source: 'ip',
  };
}

function getBrowserPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('geolocation unsupported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos.coords),
      (err) => reject(err),
      { timeout: 8000, enableHighAccuracy: true }
    );
  });
}

export async function detectLocation() {
  try {
    const coords = await getBrowserPosition();
    return await reverseGeocode(coords.latitude, coords.longitude, coords.accuracy);
  } catch {
    try {
      return await ipLocate();
    } catch {
      return {
        countryCode: 'us',
        countryName: 'United States',
        city: null,
        region: null,
        fullAddress: null,
        lat: null,
        lon: null,
        accuracy: null,
        source: 'default',
      };
    }
  }
}

export { COUNTRIES };
