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
  const config = await getConfig();
  const { data: { user } } = await supabase.auth.getUser();
  const fromUserId = user.id;

  const response = await axios.post(
    `${API_URL}/shareRide`,
    { rideId, fromUserId, toUserId, newChauffeurId: toUserId }, // ajouter newChauffeurId
    config
  );

  return response.data;
};


export const updateRideStatus = async (id, status) => {
  if (!id) throw new Error('ID de course manquant');
  if (!status) throw new Error('Status manquant');

  const config = await getConfig();

  try {
    const response = await axios.patch(`${API_URL}/${id}`, { status }, config);
    return response.data; // retourne la course mise à jour
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const code = err.response?.status;
      if (code === 403) throw new Error('Non autorisé : vous ne pouvez pas modifier cette course');
      if (code === 404) throw new Error('Course introuvable');
      if (code === 500) throw new Error('Erreur serveur');
    }
    throw err; // autre erreur
  }
};