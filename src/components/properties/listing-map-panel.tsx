"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { Property } from "@/providers/property-provider";
import { formatPrice } from "@/lib/format";

interface ListingMapPanelProps {
  properties: Property[];
  onBoundsChange: (bounds: { north: number; south: number; east: number; west: number }) => void;
  onPolygonDraw?: (polygon: [number, number][]) => void;
  center?: [number, number];
  zoom?: number;
}

const CENTRAL_FL_CENTER: [number, number] = [-81.38, 28.54];
const DEFAULT_ZOOM = 9;

export function ListingMapPanel({
  properties,
  onBoundsChange,
  center = CENTRAL_FL_CENTER,
  zoom = DEFAULT_ZOOM,
}: ListingMapPanelProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [showSearchArea, setShowSearchArea] = useState(false);
  const boundsRef = useRef<{ north: number; south: number; east: number; west: number } | null>(null);

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  const handleSearchArea = useCallback(() => {
    if (boundsRef.current) {
      onBoundsChange(boundsRef.current);
      setShowSearchArea(false);
    }
  }, [onBoundsChange]);

  useEffect(() => {
    if (!token || !mapContainer.current || mapRef.current) return;

    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center,
      zoom,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    map.on("load", () => {
      map.addSource("listings", {
        type: "geojson",
        data: toGeoJSON(properties),
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      });

      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "listings",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": ["step", ["get", "point_count"], "#1e3a5f", 10, "#dc2626", 30, "#f59e0b"],
          "circle-radius": ["step", ["get", "point_count"], 20, 10, 30, 30, 40],
        },
      });

      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "listings",
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
          "text-size": 12,
        },
        paint: { "text-color": "#ffffff" },
      });

      map.addLayer({
        id: "unclustered-point",
        type: "circle",
        source: "listings",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": "#1e3a5f",
          "circle-radius": 8,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });
    });

    map.on("click", "clusters", (e) => {
      const features = map.queryRenderedFeatures(e.point, { layers: ["clusters"] });
      const feature = features[0];
      if (!feature || feature.geometry.type !== "Point") return;
      const clusterId = feature.properties?.cluster_id as number;
      const source = map.getSource("listings") as mapboxgl.GeoJSONSource;
      source.getClusterExpansionZoom(clusterId, (err, zoomLevel) => {
        if (err || zoomLevel == null) return;
        map.easeTo({
          center: feature.geometry.type === "Point"
            ? (feature.geometry.coordinates as [number, number])
            : center,
          zoom: zoomLevel,
        });
      });
    });

    map.on("click", "unclustered-point", (e) => {
      const feature = e.features?.[0];
      if (!feature || feature.geometry.type !== "Point") return;
      const props = feature.properties;
      if (!props) return;
      const coords = feature.geometry.coordinates as [number, number];

      new mapboxgl.Popup({ offset: 15, maxWidth: "240px" })
        .setLngLat(coords)
        .setHTML(
          `<div style="font-family:sans-serif">
            <p style="font-weight:700;font-size:16px;margin:0 0 4px">${props.price as string}</p>
            <p style="font-size:13px;margin:0;color:#334155">${props.address as string}</p>
            <p style="font-size:12px;margin:2px 0 0;color:#64748b">${props.beds as string} bd | ${props.baths as string} ba | ${props.sqft as string} sqft</p>
            <a href="/properties/${props.id as string}" style="font-size:12px;color:#1e3a5f;font-weight:600;display:inline-block;margin-top:6px">View Details →</a>
          </div>`
        )
        .addTo(map);
    });

    map.on("mouseenter", "clusters", () => { map.getCanvas().style.cursor = "pointer"; });
    map.on("mouseleave", "clusters", () => { map.getCanvas().style.cursor = ""; });
    map.on("mouseenter", "unclustered-point", () => { map.getCanvas().style.cursor = "pointer"; });
    map.on("mouseleave", "unclustered-point", () => { map.getCanvas().style.cursor = ""; });

    map.on("moveend", () => {
      const b = map.getBounds();
      if (!b) return;
      boundsRef.current = {
        north: b.getNorth(),
        south: b.getSouth(),
        east: b.getEast(),
        west: b.getWest(),
      };
      setShowSearchArea(true);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const source = map.getSource("listings") as mapboxgl.GeoJSONSource | undefined;
    if (source) {
      source.setData(toGeoJSON(properties));
    }
  }, [properties]);

  if (!token) {
    return (
      <div className="w-full h-full bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <svg className="h-12 w-12 text-slate-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <p className="text-sm text-slate-500 font-medium">Map requires Mapbox token</p>
          <p className="text-xs text-slate-400 mt-1">Set NEXT_PUBLIC_MAPBOX_TOKEN in .env.local</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />
      {showSearchArea && (
        <button
          onClick={handleSearchArea}
          className="absolute top-4 left-1/2 -translate-x-1/2 z-10 px-4 py-2 bg-white rounded-full shadow-lg border border-slate-200 text-sm font-semibold text-navy-700 hover:bg-navy-50 transition-colors"
        >
          Search this area
        </button>
      )}
    </div>
  );
}

function toGeoJSON(properties: Property[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: properties
      .filter((p) => p.latitude && p.longitude)
      .map((p) => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [p.longitude!, p.latitude!],
        },
        properties: {
          id: p.id,
          price: formatPrice(p.price),
          address: `${p.address}, ${p.city}`,
          beds: p.beds,
          baths: p.baths,
          sqft: p.sqft.toLocaleString(),
        },
      })),
  };
}
