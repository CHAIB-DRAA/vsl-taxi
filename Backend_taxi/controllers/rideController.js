import axios from 'axios';
import { supabase } from '../lib/supabase';

let token = null;
const API_URL = 'https://vsl-taxi.onrender.com/api/rides';

// -----------------------------
// Gestion du token
// -----------------------------
export const setToken = (t) => { token = t; };

const getToken = async () => {
  if (token) return token;
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
// Mettre à jour une course (status, info, etc.)
// -----------------------------
export const updateRide = async (rideId, data) => {
  const config = await getConfig();
  const response = await axios.patch(`${API_URL}/${rideId}`, data, config);
  return response.data;
};

// -----------------------------
// Supprimer une course
// -----------------------------
export const deleteRide = async (rideId) => {
  const config = await getConfig();
  const response = await axios.delete(`${API_URL}/${rideId}`, config);
  return response.data;
};

// -----------------------------
// Démarrer / Terminer une course
// -----------------------------
export const startRideById = async (id) => {
  const config = await getConfig();
  const response = await axios.patch(`${API_URL}/${id}/start`, {}, config);
  return response.data;
};

export const finishRideById = async (id, distance) => {
  if (!distance || isNaN(distance)) throw new Error('Distance invalide');
  const config = await getConfig();
  const response = await axios.patch(`${API_URL}/${id}/end`, { distance: parseFloat(distance) }, config);
  return response.data;
};

// -----------------------------
// Partager une course
// -----------------------------
export const shareRide = async (rideId, toUserId) => {
  if (!rideId || !toUserId) throw new Error('rideId ou toUserId manquant');

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error('Utilisateur non connecté');

  const fromUserId = user.id;
  const config = await getConfig();
  const response = await axios.post(`${API_URL}/shareRide`, { rideId, fromUserId, toUserId }, config);
  return response.data;
};
