"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

// Dynamically import the entire map component to avoid SSR issues
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);

// Create a component that uses useMapEvents hook
// This must be inside MapContainer
const MapClickHandler = dynamic(
  () =>
    import("react-leaflet").then((mod) => {
      return function MapClickHandler({
        onMapClick,
      }: {
        onMapClick: (lat: number, lng: number) => void;
      }) {
        mod.useMapEvents({
          click: (e: any) => {
            onMapClick(e.latlng.lat, e.latlng.lng);
          },
        });
        return null;
      };
    }),
  { ssr: false }
);

// Component to get map instance reference
const MapRefHandler = dynamic(
  () =>
    import("react-leaflet").then((mod) => {
      return function MapRefHandler({
        onMapReady,
      }: {
        onMapReady: (map: any) => void;
      }) {
        const map = mod.useMap();
        useEffect(() => {
          onMapReady(map);
        }, [map, onMapReady]);
        return null;
      };
    }),
  { ssr: false }
);

interface MapPickerProps {
  coordinates: string;
  onCoordinatesChange: (coordinates: string) => void;
  required?: boolean;
  cityName?: string;
  neighborhoodName?: string;
  countryName?: string;
}

export default function MapPicker({
  coordinates,
  onCoordinatesChange,
  required = false,
  cityName,
  neighborhoodName,
  countryName,
}: MapPickerProps) {
  // Parse coordinates
  const [position, setPosition] = useState<[number, number]>([4.7110, -74.0721]); // Default to Bogotá
  const [mounted, setMounted] = useState(false);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [lastGeocodedAddress, setLastGeocodedAddress] = useState<string>("");

  // Parse initial coordinates
  useEffect(() => {
    if (coordinates) {
      const parts = coordinates.split(",");
      if (parts.length === 2) {
        const parsedLat = parseFloat(parts[0].trim());
        const parsedLng = parseFloat(parts[1].trim());
        if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
          setPosition([parsedLat, parsedLng]);
        }
      }
    }
  }, []);

  // Update position when coordinates change externally
  useEffect(() => {
    if (coordinates) {
      const parts = coordinates.split(",");
      if (parts.length === 2) {
        const parsedLat = parseFloat(parts[0].trim());
        const parsedLng = parseFloat(parts[1].trim());
        if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
          setPosition([parsedLat, parsedLng]);
          if (mapInstance) {
            mapInstance.setView([parsedLat, parsedLng], mapInstance.getZoom());
          }
        }
      }
    }
  }, [coordinates, mapInstance]);

  const geocodeAddress = async (address: string) => {
    try {
      // Use OpenStreetMap Nominatim geocoding API (free, no API key required)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
        {
          headers: {
            "User-Agent": "Saldellos App", // Required by Nominatim
          },
        }
      );

      if (!response.ok) {
        throw new Error("Geocoding failed");
      }

      const data = await response.json();
      
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        
        if (!isNaN(lat) && !isNaN(lon)) {
          const newPosition: [number, number] = [lat, lon];
          setPosition(newPosition);
          onCoordinatesChange(`${lat},${lon}`);
          
          // Update map view if map instance is available
          if (mapInstance) {
            mapInstance.setView(newPosition, 13);
          }
        }
      }
    } catch (error) {
      console.error("Error geocoding address:", error);
      // Silently fail - user can still manually set coordinates
    }
  };

  // Geocode when city and neighborhood are provided
  useEffect(() => {
    if (cityName && neighborhoodName && cityName.trim() && neighborhoodName.trim()) {
      const addressString = `${neighborhoodName}, ${cityName}${countryName ? `, ${countryName}` : ""}`;
      
      // Only geocode if address changed
      if (addressString !== lastGeocodedAddress) {
        setLastGeocodedAddress(addressString);
        geocodeAddress(addressString);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityName, neighborhoodName, countryName]);

  // Load Leaflet and fix marker icon on client side only
  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      // Fix marker icon
      import("leaflet").then((L) => {
        const defaultIcon = L.default.icon({
          iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
          iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
          shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41],
        });

        L.default.Marker.prototype.options.icon = defaultIcon;
        setLeafletLoaded(true);
      }).catch((err) => {
        console.error("Error loading Leaflet:", err);
        setLeafletLoaded(true); // Still allow map to render
      });
    }
  }, []);

  const handleMarkerDrag = (e: any) => {
    const { lat, lng } = e.target.getLatLng();
    const newPosition: [number, number] = [lat, lng];
    setPosition(newPosition);
    onCoordinatesChange(`${lat},${lng}`);
  };

  const handleMapClick = (lat: number, lng: number) => {
    const newPosition: [number, number] = [lat, lng];
    setPosition(newPosition);
    onCoordinatesChange(`${lat},${lng}`);
  };

  if (!mounted || !leafletLoaded) {
    return (
      <div className="w-full h-64 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Cargando mapa...
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="w-full h-64 rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
        <MapContainer
          center={position}
          zoom={13}
          style={{ height: "100%", width: "100%", zIndex: 0 }}
          className="z-0"
          key={`${position[0]}-${position[1]}`} // Force re-render when position changes significantly
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            subdomains="abcd"
            maxZoom={20}
            minZoom={1}
            // Use higher quality tiles with retina support
            detectRetina={true}
          />
          <Marker
            position={position}
            draggable={true}
            eventHandlers={{
              dragend: handleMarkerDrag,
            }}
          />
          <MapClickHandler onMapClick={handleMapClick} />
          <MapRefHandler onMapReady={setMapInstance} />
        </MapContainer>
      </div>
      <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
        Coordenadas: {position[0].toFixed(6)}, {position[1].toFixed(6)}
      </div>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        Arrastra el marcador o haz clic en el mapa para seleccionar la ubicación
      </p>
      {required && !coordinates && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
          Por favor selecciona una ubicación en el mapa
        </p>
      )}
    </div>
  );
}
