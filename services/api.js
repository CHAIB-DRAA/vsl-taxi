import axios from 'axios';
import { supabase } from '../lib/supabase';

let token = null; // Token manuel optionnel, peut être mis à jour via setToken
const API_URL = 'https://vsl-taxi.onrender.com/api/rides';

// -----------------------------
// Gestion du token
// -----------------------------
export const setToken = (t) => {
  token = t;
};

const getToken = async () => {
  if (token) return token; // si token manuel défini, on l’utilise
  const { data: sessionData } = await supabase.auth.getSession();
  return sessionData?.session?.access_token || null;
};

const getConfig = async () => {
  const t = await getToken();
  if (!t) throw new Error('Token manquant');
  return { headers: { Authorization: `Bearer ${t}` } };
};

// -----------------------------
// Récupérer toutes les courses
// -----------------------------
export const getRides = async () => {
  const config = await getConfig();
  const response = await axios.get(API_URL, config);
  return response.data;
};

// -----------------------------
// Créer une course
// -----------------------------
export const createRide = async (ride) => {
  const config = await getConfig();
  const response = await axios.post(API_URL, ride, config);
  return response.data;
};

// -----------------------------
// Démarrer une course
// -----------------------------
export const startRideById = async (id) => {
  if (!id) throw new Error('ID de course manquant');
  const config = await getConfig();
  const response = await axios.patch(`${API_URL}/${id}/start`, {}, config);
  return response.data;
};

// -----------------------------
// Terminer une course avec distance
// -----------------------------
export const finishRideById = async (id, distance) => {
  if (!distance || isNaN(distance)) throw new Error('Distance invalide');
  const config = await getConfig();
  const response = await axios.patch(`${API_URL}/${id}/end`, { distance: parseFloat(distance) }, config);
  return response.data;
};

// -----------------------------
// Mettre à jour une course (status, etc.)
// -----------------------------
export const updateRide = async (id, data) => {
  const config = await getConfig();
  const response = await axios.patch(`${API_URL}/${id}`, data, config);
  return response.data;
};

// -----------------------------
// Partager une course avec un autre utilisateur
// -----------------------------
export const shareRide = async (rideId, toUserId) => {
  if (!rideId || !toUserId) throw new Error('rideId ou toUserId manquant');

  const config = await getConfig();

  // Récupérer l'utilisateur connecté pour fromUserId
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error('Utilisateur non connecté');

  const fromUserId = user.id;

  const response = await axios.post(
    `${API_URL}/shareRide`,
    { rideId, fromUserId, toUserId },
    config
  );

  return response.data;
};
