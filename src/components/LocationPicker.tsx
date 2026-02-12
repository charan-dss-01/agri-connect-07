import { useState, useEffect, useRef } from 'react';
import { MapPin, Search, Loader2, X } from 'lucide-react';

interface LocationPickerProps {
  lat?: number;
  lng?: number;
  address?: string;
  onLocationChange: (lat: number, lng: number, address: string) => void;
  compact?: boolean;
}

export default function LocationPicker({ lat, lng, address, onLocationChange, compact }: LocationPickerProps) {
  const [mapLat, setMapLat] = useState(lat || 28.6139);
  const [mapLng, setMapLng] = useState(lng || 77.209);
  const [mapAddress, setMapAddress] = useState(address || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);
  const markerRef = useRef<any>(null);

  const reverseGeocode = async (latitude: number, longitude: number) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
      const data = await res.json();
      return data.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    } catch {
      return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    }
  };

  const searchLocation = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1`);
      const data = await res.json();
      if (data.length > 0) {
        const newLat = parseFloat(data[0].lat);
        const newLng = parseFloat(data[0].lon);
        const newAddress = data[0].display_name;
        setMapLat(newLat);
        setMapLng(newLng);
        setMapAddress(newAddress);
        onLocationChange(newLat, newLng, newAddress);
        if (leafletMap.current) {
          leafletMap.current.setView([newLat, newLng], 13);
          if (markerRef.current) markerRef.current.setLatLng([newLat, newLng]);
        }
      }
    } catch { /* ignore */ }
    setSearching(false);
  };

  const detectLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const newLat = pos.coords.latitude;
      const newLng = pos.coords.longitude;
      const newAddress = await reverseGeocode(newLat, newLng);
      setMapLat(newLat);
      setMapLng(newLng);
      setMapAddress(newAddress);
      onLocationChange(newLat, newLng, newAddress);
      if (leafletMap.current) {
        leafletMap.current.setView([newLat, newLng], 13);
        if (markerRef.current) markerRef.current.setLatLng([newLat, newLng]);
      }
    });
  };

  useEffect(() => {
    if (!showMap || !mapRef.current || mapLoaded) return;
    
    const loadMap = async () => {
      const L = await import('leaflet');
      await import('leaflet/dist/leaflet.css');

      // Fix default icon
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      const map = L.map(mapRef.current!).setView([mapLat, mapLng], 10);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
      }).addTo(map);

      const marker = L.marker([mapLat, mapLng], { draggable: true }).addTo(map);
      marker.on('dragend', async () => {
        const pos = marker.getLatLng();
        const addr = await reverseGeocode(pos.lat, pos.lng);
        setMapLat(pos.lat);
        setMapLng(pos.lng);
        setMapAddress(addr);
        onLocationChange(pos.lat, pos.lng, addr);
      });

      map.on('click', async (e: any) => {
        marker.setLatLng(e.latlng);
        const addr = await reverseGeocode(e.latlng.lat, e.latlng.lng);
        setMapLat(e.latlng.lat);
        setMapLng(e.latlng.lng);
        setMapAddress(addr);
        onLocationChange(e.latlng.lat, e.latlng.lng, addr);
      });

      leafletMap.current = map;
      markerRef.current = marker;
      setMapLoaded(true);

      // Fix map render
      setTimeout(() => map.invalidateSize(), 100);
    };

    loadMap();

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
        markerRef.current = null;
        setMapLoaded(false);
      }
    };
  }, [showMap]);

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium mb-1 block">Location</label>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={mapAddress}
          onChange={e => setMapAddress(e.target.value)}
          className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-sm"
          placeholder="Search or click map to set location"
        />
        <button
          type="button"
          onClick={detectLocation}
          className="px-3 py-2 rounded-lg bg-muted text-xs font-medium flex items-center gap-1 hover:bg-secondary transition-colors"
        >
          <MapPin className="w-3 h-3" /> Auto
        </button>
        <button
          type="button"
          onClick={() => setShowMap(!showMap)}
          className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors ${showMap ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-secondary'}`}
        >
          {showMap ? <X className="w-3 h-3" /> : <MapPin className="w-3 h-3" />} Map
        </button>
      </div>

      {showMap && (
        <div className="space-y-2 animate-fade-in">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && searchLocation()}
              className="flex-1 px-3 py-1.5 rounded-lg border border-input bg-background text-xs"
              placeholder="Search location..."
            />
            <button
              type="button"
              onClick={searchLocation}
              disabled={searching}
              className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium flex items-center gap-1 hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {searching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />} Search
            </button>
          </div>
          <div
            ref={mapRef}
            className={`rounded-lg border border-border overflow-hidden ${compact ? 'h-48' : 'h-64'}`}
            style={{ zIndex: 0 }}
          />
          <p className="text-[10px] text-muted-foreground">Click on map or drag marker to set location</p>
        </div>
      )}
    </div>
  );
}
