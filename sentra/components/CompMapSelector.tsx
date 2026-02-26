"use client";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const markerIcon = new L.Icon({
  iconUrl: "/marker-icon.png",
  shadowUrl: "/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface MapSelectorProps {
  lat: number;
  lon: number;
  onChange: (lat: number, lon: number) => void;
}

function LocationMarker({ lat, lon, onChange }: MapSelectorProps) {
  useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng);
    },
  });

  return <Marker position={[lat, lon]} icon={markerIcon} />;
}

export default function MapSelector({ lat, lon, onChange }: MapSelectorProps) {

  return (
    <div className="w-full h-full" style={{ minHeight: 300 }}>
      <MapContainer
        key={`${lat},${lon}`}
        center={[lat, lon]}
        zoom={12}
        style={{ width: "100%", height: "100%", zIndex: 1 }}

      >
        <TileLayer
          attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker lat={lat} lon={lon} onChange={onChange} />
      </MapContainer>
    </div>
  );
}