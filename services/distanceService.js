/**
 * Service de calcul automatique de distance routière
 * Utilise : API Adresse (data.gouv.fr) pour géocodage + OSRM pour itinéraire
 */

import axios from 'axios';

const GEOCODE_URL = 'https://api-adresse.data.gouv.fr/search';
const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving';

/**
 * Géocode une adresse → retourne { lat, lon } ou null
 */
export const geocodeAddress = async (address) => {
  if (!address || address.trim().length < 3) return null;
  try {
    const res = await axios.get(GEOCODE_URL, {
      params: { q: address.trim(), limit: 1 },
      timeout: 8000
    });
    const features = res.data?.features || [];
    if (features.length === 0) return null;
    const [lon, lat] = features[0].geometry?.coordinates || [];
    return lat && lon ? { lat, lon } : null;
  } catch (e) {
    console.warn('Geocoding error:', e?.message);
    return null;
  }
};

/**
 * Calcule la distance routière (km) entre deux adresses
 * Retourne { distanceKm, durationMin } ou null en cas d'erreur
 */
export const getDrivingDistance = async (startAddress, endAddress) => {
  if (!startAddress || !endAddress) return null;

  try {
    // Géocoder les deux adresses
    const [startCoords, endCoords] = await Promise.all([
      geocodeAddress(startAddress),
      geocodeAddress(endAddress)
    ]);

    if (!startCoords || !endCoords) return null;

    // Appel OSRM : coordonnées au format lon,lat
    const coordsStr = `${startCoords.lon},${startCoords.lat};${endCoords.lon},${endCoords.lat}`;
    const url = `${OSRM_URL}/${coordsStr}?overview=false`;

    const res = await axios.get(url, { timeout: 10000 });
    const route = res.data?.routes?.[0];

    if (!route) return null;

    // OSRM renvoie distance en mètres, durée en secondes
    const distanceKm = Math.round((route.distance / 1000) * 10) / 10; // 1 décimale
    const durationMin = Math.round(route.duration / 60);

    return { distanceKm, durationMin };
  } catch (e) {
    console.warn('OSRM routing error:', e?.message);
    return null;
  }
};

/**
 * Version avec coordonnées déjà connues (évite le géocodage)
 */
export const getDrivingDistanceFromCoords = async (startCoords, endCoords) => {
  if (!startCoords?.lat || !startCoords?.lon || !endCoords?.lat || !endCoords?.lon) return null;

  try {
    const coordsStr = `${startCoords.lon},${startCoords.lat};${endCoords.lon},${endCoords.lat}`;
    const url = `${OSRM_URL}/${coordsStr}?overview=false`;
    const res = await axios.get(url, { timeout: 10000 });
    const route = res.data?.routes?.[0];
    if (!route) return null;

    const distanceKm = Math.round((route.distance / 1000) * 10) / 10;
    const durationMin = Math.round(route.duration / 60);
    return { distanceKm, durationMin };
  } catch (e) {
    console.warn('OSRM routing error:', e?.message);
    return null;
  }
};
