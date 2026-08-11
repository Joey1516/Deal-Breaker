import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { reverseGeocodeAddress, searchAddress } from '../lib/api';

export default function LocationMapPicker({ initialCoords, onConfirm, onClose }) {
  const mapElRef = useRef(null);
  const mapRef = useRef(null);
  const [center, setCenter] = useState(initialCoords || { lat: 20, lon: 0 });
  const [resolved, setResolved] = useState(null);
  const [resolving, setResolving] = useState(false);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const map = L.map(mapElRef.current, { zoomControl: true, attributionControl: true }).setView(
      [center.lat, center.lon],
      initialCoords ? 15 : 3
    );
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;

    function handleMoveEnd() {
      const c = map.getCenter();
      setCenter({ lat: c.lat, lon: c.lng });
    }
    map.on('moveend', handleMoveEnd);

    // Fixes Leaflet's "grey tiles" bug that happens when it initializes inside a
    // just-opened modal, before the container has its final layout size.
    setTimeout(() => map.invalidateSize(), 50);

    return () => map.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setResolving(true);
    const timeoutId = setTimeout(() => {
      reverseGeocodeAddress(center.lat, center.lon)
        .then(setResolved)
        .catch(() => setResolved(null))
        .finally(() => setResolving(false));
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [center]);

  useEffect(() => {
    if (query.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    setSearching(true);
    const timeoutId = setTimeout(() => {
      searchAddress(query)
        .then(setSuggestions)
        .catch(() => setSuggestions([]))
        .finally(() => setSearching(false));
    }, 450);
    return () => clearTimeout(timeoutId);
  }, [query]);

  function flyTo(lat, lon) {
    mapRef.current.setView([lat, lon], 16);
    setQuery('');
    setSuggestions([]);
  }

  function useMyLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => flyTo(pos.coords.latitude, pos.coords.longitude),
      () => {},
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  function confirm() {
    if (!resolved) return;
    onConfirm({
      displayName: resolved.displayName,
      countryCode: resolved.countryCode,
      lat: center.lat,
      lon: center.lon,
    });
  }

  return (
    <div className="map-modal-overlay" onClick={onClose}>
      <div className="map-modal glass" onClick={(e) => e.stopPropagation()}>
        <div className="map-modal-header">
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for a place, then fine-tune with the pin…"
            aria-label="Search for a place"
          />
          <button type="button" className="map-icon-btn" onClick={useMyLocation} title="Use my current location">
            🧭
          </button>
          <button type="button" className="map-icon-btn" onClick={onClose} title="Close" aria-label="Close">
            ✕
          </button>
        </div>

        {searching && <p className="loading-hint">Searching…</p>}
        {suggestions.length > 0 && (
          <ul className="address-suggestions map-modal-suggestions">
            {suggestions.map((s, i) => (
              <li key={i}>
                <button type="button" onClick={() => flyTo(Number(s.lat), Number(s.lon))}>
                  {s.displayName}
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="map-container-wrap">
          <div className="map-container" ref={mapElRef} />
          <div className="map-pin" aria-hidden="true">
            📍
          </div>
        </div>

        <div className="map-modal-footer">
          <p className="map-resolved-address">
            {resolving ? 'Locating…' : resolved?.displayName || 'Move the map to place the pin on your location'}
          </p>
          <button type="button" className="btn-primary" disabled={!resolved || resolving} onClick={confirm}>
            Confirm this location
          </button>
        </div>
      </div>
    </div>
  );
}
