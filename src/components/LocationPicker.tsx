import { useState, useEffect, useRef } from 'react';
import { MapPin, Search, Loader2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface LocationPickerProps {
  lat?: number;
  lng?: number;
  address?: string;
  onLocationChange: (lat: number, lng: number, address: string) => void;
  compact?: boolean;
}

export default function LocationPicker({ lat, lng, address, onLocationChange, compact }: LocationPickerProps) {
  const { t } = useTranslation('farmer');
  const [mapLat, setMapLat] = useState(lat || 28.6139);
  const [mapLng, setMapLng] = useState(lng || 77.209);
  const [mapAddress, setMapAddress] = useState(address || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const mapInitialized = useRef(false);

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
    } catch {
      // ignore lookup errors for now
    }
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
    // Only initialize map once when showMap becomes true
    if (!showMap || mapInitialized.current || !mapRef.current) return;

    const loadMap = async () => {
      try {
        const L = await import('leaflet');

        // Configure marker icons
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        });

        if (!mapRef.current || leafletMap.current) return;

        const map = L.map(mapRef.current, { 
          scrollWheelZoom: true,
          dragging: true,
          tap: true
        }).setView([mapLat, mapLng], 13);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19,
          subdomains: 'abc',
          crossOrigin: true,
        }).addTo(map);

        const marker = L.marker([mapLat, mapLng], { draggable: true }).addTo(map);
        
        marker.on('dragend', async () => {
          const pos = marker.getLatLng();
          const newAddress = await reverseGeocode(pos.lat, pos.lng);
          setMapLat(pos.lat);
          setMapLng(pos.lng);
          setMapAddress(newAddress);
          onLocationChange(pos.lat, pos.lng, newAddress);
        });

        map.on('click', async (e: any) => {
          marker.setLatLng(e.latlng);
          const newAddress = await reverseGeocode(e.latlng.lat, e.latlng.lng);
          setMapLat(e.latlng.lat);
          setMapLng(e.latlng.lng);
          setMapAddress(newAddress);
          onLocationChange(e.latlng.lat, e.latlng.lng, newAddress);
        });

        leafletMap.current = map;
        markerRef.current = marker;
        mapInitialized.current = true;

        // Trigger map resize after CSS is applied to ensure tiles load
        setTimeout(() => {
          if (map && mapRef.current) {
            map.invalidateSize();
            // Ensure tiles are loaded
            map.eachLayer((layer: any) => {
              if (layer.redraw) layer.redraw();
            });
          }
        }, 150);
      } catch (error) {
        console.error('Failed to load map:', error);
        mapInitialized.current = false;
      }
    };

    void loadMap();

    return () => {
      // Only cleanup when map is hidden
      if (!showMap && leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
        markerRef.current = null;
        mapInitialized.current = false;
      }
    };
  }, [showMap]);

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium mb-1 block">{t('location.label')}</label>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={mapAddress}
          onChange={e => setMapAddress(e.target.value)}
          className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-sm"
          placeholder={t('location.placeholder')}
        />
        <button
          type="button"
          onClick={detectLocation}
          className="px-3 py-2 rounded-lg bg-muted text-xs font-medium flex items-center gap-1 hover:bg-secondary transition-colors"
        >
          <MapPin className="w-3 h-3" /> {t('location.auto')}
        </button>
        <button
          type="button"
          onClick={() => setShowMap(!showMap)}
          className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors ${showMap ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-secondary'}`}
        >
          {showMap ? <X className="w-3 h-3" /> : <MapPin className="w-3 h-3" />} {t('location.map')}
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
              placeholder={t('location.searchPlaceholder')}
            />
            <button
              type="button"
              onClick={searchLocation}
              disabled={searching}
              className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium flex items-center gap-1 hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {searching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />} {t('location.search')}
            </button>
          </div>
          <div
            ref={mapRef}
            className={`rounded-lg border border-border overflow-hidden w-full ${compact ? 'h-48' : 'h-64'}`}
            style={{ zIndex: 0, minHeight: compact ? '12rem' : '16rem' }}
          />
          <p className="text-[10px] text-muted-foreground">{t('location.mapHint')}</p>
        </div>
      )}
    </div>
  );
}
