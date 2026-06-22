import React from 'react';

type Props = {
  lat: string;
  lng: string;
  address?: string;
};

export const LocationMapPreview: React.FC<Props> = ({ lat, lng, address }) => {
  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);
  const hasCoords = Number.isFinite(latNum) && Number.isFinite(lngNum);
  const mapsKey = import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined;

  if (!hasCoords) {
    return (
      <div className="ab-map-preview ab-map-preview-empty">
        <p className="ab-field-hint">Select an address from suggestions to preview the map.</p>
      </div>
    );
  }

  const mapUrl = mapsKey
    ? `https://www.google.com/maps/embed/v1/place?key=${mapsKey}&q=${latNum},${lngNum}&zoom=15`
    : `https://www.openstreetmap.org/export/embed.html?bbox=${lngNum - 0.008}%2C${latNum - 0.005}%2C${lngNum + 0.008}%2C${latNum + 0.005}&layer=mapnik&marker=${latNum}%2C${lngNum}`;

  return (
    <div className="ab-map-preview">
      <label className="ab-label">Map</label>
      <div className="ab-map-preview-frame">
        <iframe title={address || 'Location map'} src={mapUrl} loading="lazy" />
      </div>
    </div>
  );
};
