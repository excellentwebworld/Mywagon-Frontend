import React, { useEffect, useRef } from 'react';
import { loadGoogleMaps } from './GoogleMapAddressField';
import { parseGooglePlace, type ParsedPlaceAddress } from '../../pages/AddressBook/utils/parseGooglePlaceAddress';

type Props = {
  lat: string;
  lng: string;
  address?: string;
  onLatLngChange?: (lat: string, lng: string) => void;
  onPlaceSelected?: (details: ParsedPlaceAddress) => void;
};

// Default center: Athens, Greece
const DEFAULT_LAT = 37.983819;
const DEFAULT_LNG = 23.727539;

export const LocationMapPreview: React.FC<Props> = ({
  lat,
  lng,
  address,
  onLatLngChange,
  onPlaceSelected,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapsKey = import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined;

  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);
  const hasCoords = Number.isFinite(latNum) && Number.isFinite(lngNum);

  const onLatLngChangeRef = useRef(onLatLngChange);
  const onPlaceSelectedRef = useRef(onPlaceSelected);
  onLatLngChangeRef.current = onLatLngChange;
  onPlaceSelectedRef.current = onPlaceSelected;

  useEffect(() => {
    if (!mapsKey || !containerRef.current) return;

    loadGoogleMaps(mapsKey)
      .then(() => {
        if (!containerRef.current || !(window as any).google) return;

        const google = (window as any).google;
        const initialLat = hasCoords ? latNum : DEFAULT_LAT;
        const initialLng = hasCoords ? lngNum : DEFAULT_LNG;

        const map = new google.maps.Map(containerRef.current, {
          center: { lat: initialLat, lng: initialLng },
          zoom: hasCoords ? 15 : 6,
          mapTypeControl: false,
          streetViewControl: false,
        });

        const marker = new google.maps.Marker({
          position: { lat: initialLat, lng: initialLng },
          map: map,
          draggable: true,
          title: address || 'Drag me to set location',
        });

        mapRef.current = map;
        markerRef.current = marker;

        const handleGeocode = (pos: any) => {
          const newLat = pos.lat().toFixed(6);
          const newLng = pos.lng().toFixed(6);
          onLatLngChangeRef.current?.(newLat, newLng);

          if (onPlaceSelectedRef.current) {
            const geocoder = new google.maps.Geocoder();
            geocoder.geocode({ location: pos }, (results: any, status: any) => {
              if (status === 'OK' && results && results[0]) {
                const place = results[0];
                const parsed = parseGooglePlace(place);
                if (parsed) {
                  onPlaceSelectedRef.current?.(parsed);
                }
              }
            });
          }
        };

        marker.addListener('dragend', () => {
          const pos = marker.getPosition();
          if (pos) handleGeocode(pos);
        });

        map.addListener('click', (e: any) => {
          const pos = e.latLng;
          if (pos) {
            marker.setPosition(pos);
            handleGeocode(pos);
          }
        });
      })
      .catch((err) => {
        console.error('Failed to load map:', err);
      });

    return () => {
      if (markerRef.current) {
        markerRef.current.setMap(null);
      }
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [mapsKey]);

  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker || !hasCoords) return;

    const currentPos = marker.getPosition();
    const currentLat = currentPos?.lat();
    const currentLng = currentPos?.lng();

    const diffLat = Math.abs((currentLat ?? 0) - latNum);
    const diffLng = Math.abs((currentLng ?? 0) - lngNum);

    if (diffLat > 0.0001 || diffLng > 0.0001) {
      const newPos = { lat: latNum, lng: lngNum };
      marker.setPosition(newPos);
      map.setCenter(newPos);
      map.setZoom(15);
    }
  }, [hasCoords, latNum, lngNum]);

  if (!mapsKey) {
    const fallbackLat = hasCoords ? latNum : DEFAULT_LAT;
    const fallbackLng = hasCoords ? lngNum : DEFAULT_LNG;
    const osmUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${fallbackLng - 0.008}%2C${fallbackLat - 0.005}%2C${fallbackLng + 0.008}%2C${fallbackLat + 0.005}&layer=mapnik&marker=${fallbackLat}%2C${fallbackLng}`;
    return (
      <div className="ab-map-preview">
        <div className="ab-map-preview-frame">
          <iframe title={address || 'Location map'} src={osmUrl} loading="lazy" />
        </div>
      </div>
    );
  }

  return (
    <div className="ab-map-preview">
      <div className="ab-map-preview-frame">
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      </div>
    </div>
  );
};
