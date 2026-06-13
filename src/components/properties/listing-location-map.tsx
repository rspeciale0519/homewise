"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

interface ListingLocationMapProps {
  latitude: number | null | undefined;
  longitude: number | null | undefined;
  address: string;
  city: string;
  state: string;
  zip: string;
}

export function ListingLocationMap({
  latitude,
  longitude,
  address,
  city,
  state,
  zip,
}: ListingLocationMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const hasCoordinates = latitude != null && longitude != null;

  useEffect(() => {
    if (!token || !hasCoordinates || !mapContainer.current || mapRef.current) return;

    mapboxgl.accessToken = token;
    const center: [number, number] = [longitude, latitude];

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center,
      zoom: 14,
      cooperativeGestures: true,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    new mapboxgl.Marker({ color: "#dc2626" })
      .setLngLat(center)
      .setPopup(
        new mapboxgl.Popup({ offset: 28, maxWidth: "240px" }).setHTML(
          `<div style="font-family:sans-serif">
            <p style="font-weight:600;font-size:13px;margin:0">${escapeHtml(address)}</p>
            <p style="font-size:12px;margin:2px 0 0;color:#64748b">${escapeHtml(`${city}, ${state} ${zip}`)}</p>
          </div>`
        )
      )
      .addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [token, hasCoordinates, latitude, longitude, address, city, state, zip]);

  if (!token || !hasCoordinates) {
    return (
      <div className="bg-slate-100 rounded-xl aspect-[16/9] flex items-center justify-center">
        <div className="text-center">
          <svg className="h-12 w-12 text-slate-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="text-sm text-slate-500 font-medium">{address}</p>
          <p className="text-xs text-slate-400">{city}, {state} {zip}</p>
        </div>
      </div>
    );
  }

  return <div ref={mapContainer} className="rounded-xl overflow-hidden aspect-[16/9]" />;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
