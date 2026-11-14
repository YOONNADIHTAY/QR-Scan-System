import { toGoogleEmbedQueryUrl, toGoogleEmbedUrl } from '../utils/maps';

export default function GoogleMapEmbed({
  latitude,
  longitude,
  query = '',
  zoom = 16,
  title = 'Map',
  className = '',
}) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  const hasCoords = !Number.isNaN(lat) && !Number.isNaN(lng);
  const src = hasCoords
    ? toGoogleEmbedUrl(lat, lng, zoom)
    : toGoogleEmbedQueryUrl(query, zoom);

  if (!src) return null;

  return (
    <div className={`google-map-frame ${className}`.trim()}>
      <iframe
        title={title}
        src={src}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
    </div>
  );
}
