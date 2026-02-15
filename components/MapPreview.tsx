import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

interface MapPreviewProps {
  lat: number;
  lng: number;
  label?: string;
}

const MapPreview: React.FC<MapPreviewProps> = ({ lat, lng, label }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.CircleMarker | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Initialize map
      const map = L.map(mapContainerRef.current, {
        center: [lat, lng],
        zoom: 13,
        zoomControl: false,
        attributionControl: false
      });

      // CartoDB Dark Matter Tiles (Perfect for Slate-950 theme)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19
      }).addTo(map);

      // Add a cool forensic-style marker
      const marker = L.circleMarker([lat, lng], {
        radius: 8,
        fillColor: '#22d3ee', // Cyan-400
        color: '#0891b2', // Cyan-600
        weight: 2,
        opacity: 1,
        fillOpacity: 0.6
      }).addTo(map);

      // Add a pulse effect (using a second larger circle with CSS animation class if possible, or just a static ring)
      L.circleMarker([lat, lng], {
        radius: 16,
        fillColor: '#22d3ee',
        color: 'transparent',
        weight: 0,
        fillOpacity: 0.2
      }).addTo(map);

      if (label) {
        marker.bindPopup(label).openPopup();
      }

      mapInstanceRef.current = map;
      markerRef.current = marker;
    } else {
      // Update existing map
      mapInstanceRef.current.setView([lat, lng], 13);
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      }
    }

    // Cleanup
    return () => {
      // We often don't want to destroy the map immediately in dev HMR, but for production safety:
      // mapInstanceRef.current?.remove();
      // mapInstanceRef.current = null;
    };
  }, [lat, lng, label]);

  return (
    <div ref={mapContainerRef} className="w-full h-full min-h-[250px] bg-slate-900 z-0" />
  );
};

export default MapPreview;