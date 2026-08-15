export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8787';

// Sends the ID token Google issued client-side to the backend, which verifies its
// signature/audience before trusting the email inside it — never trust the JWT's
// contents without that check, since anyone can hand the frontend a forged one.
export async function verifyGoogleCredential(credential) {
  let res;
  try {
    res = await fetch(`${API_BASE}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential }),
    });
  } catch {
    throw new Error(`Can't reach the backend at ${API_BASE}. Is the backend server running?`);
  }
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Google sign-in verification failed');
  }
  return data;
}

export async function compareProduct(query, country, coords) {
  let res;
  try {
    res = await fetch(`${API_BASE}/api/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, country, lat: coords?.lat, lon: coords?.lon }),
    });
  } catch {
    throw new Error(`Can't reach the backend at ${API_BASE}. Is the backend server running?`);
  }
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

export async function getTrendingDeals(country) {
  let res;
  try {
    res = await fetch(`${API_BASE}/api/trending?country=${encodeURIComponent(country)}`);
  } catch {
    throw new Error(`Can't reach the backend at ${API_BASE}. Is the backend server running?`);
  }
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

export async function reverseGeocodeAddress(lat, lon) {
  const res = await fetch(`${API_BASE}/api/geocode/reverse?lat=${lat}&lon=${lon}`);
  if (!res.ok) throw new Error('reverse geocode failed');
  return res.json();
}

export async function searchAddress(query) {
  let res;
  try {
    res = await fetch(`${API_BASE}/api/geocode/search?q=${encodeURIComponent(query)}`);
  } catch {
    throw new Error(`Can't reach the backend at ${API_BASE}.`);
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Address search failed');
  return data.suggestions;
}

export async function sendBrookMessage(messages, { country, coords, savedDealsSummary } = {}) {
  let res;
  try {
    res = await fetch(`${API_BASE}/api/brook/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        country,
        lat: coords?.lat,
        lon: coords?.lon,
        savedDealsSummary,
      }),
    });
  } catch {
    throw new Error(`Can't reach the backend at ${API_BASE}. Is the backend server running?`);
  }
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}
