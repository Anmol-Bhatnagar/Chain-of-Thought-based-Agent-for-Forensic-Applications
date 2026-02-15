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

      const map = L.map(mapContainerRef.current, {
        center: [lat, lng],
        zoom: 13,
        zoomControl: false,
        attributionControl: false
      });


      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19
      }).addTo(map);


      const marker = L.circleMarker([lat, lng], {
        radius: 8,
        fillColor: '#22d3ee',
        color: '#0891b2',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.6
      }).addTo(map);


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

      mapInstanceRef.current.setView([lat, lng], 13);
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      }
    }


    return () => {



    };
  }, [lat, lng, label]);

  return (
    <div ref={mapContainerRef} className="w-full h-full min-h-[250px] bg-slate-900 z-0" />
  );
};

export default MapPreview;
