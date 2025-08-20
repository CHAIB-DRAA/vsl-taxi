import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// URL de base de ton backend
const API_URL = 'https://vsl-taxi.onrender.com/api/rides';

// --- Gestion du token ---
let token = null;

// Définir le token manuellement (après login)
export const setToken = (t) => {
  token = t;
};

// Récupérer le token (variable ou AsyncStorage)
const getToken = async () => {
  if (token) return token;
  const t = await AsyncStorage.getItem('token');
  if (!t) throw new Error('Token manquant');
  return t;
};

// Config Axios avec Authorization
const getConfig = async () => {
  const t = await getToken();
  return { headers: { Authorization: `Bearer ${t}` } };
};

// ---------------------------
// CRUD Courses
// ---------------------------

// Créer une course
export const createRide = async (ride) => {
  try {
    const config = await getConfig();
    const res = await axios.post(API_URL, ride, config); // POST sur /api/rides
    return res.data;
  } catch (err) {
    console.error('Erreur API createRide:', err.response?.data || err.message);
    throw err;
  }
};

// Récupérer toutes les courses (propres + partagées)
export const getRides = async () => {
  try {
    const config = await getConfig();
    const res = await axios.get(API_URL, config);
    return res.data;
  } catch (err) {
    console.error('Erreur API getRides:', err.response?.data || err.message);
    throw err;
  }
};

// Mettre à jour une course
export const updateRide = async (id, data) => {
  const config = await getConfig();
  const res = await axios.patch(`${API_URL}/${id}`, data, config);
  return res.data;
};

// Supprimer une course
export const deleteRide = async (id) => {
  const config = await getConfig();
  const res = await axios.delete(`${API_URL}/${id}`, config);
  return res.data;
};

// ---------------------------
// Statut course
// ---------------------------

// Démarrer une course
export const startRideById = async (id) => {
  const config = await getConfig();
  const res = await axios.post(`${API_URL}/${id}/start`, {}, config);
  return res.data;
};

// Terminer une course
export const finishRideById = async (id, distance) => {
  if (!distance || isNaN(distance)) throw new Error('Distance invalide');
  const config = await getConfig();
  const res = await axios.post(`${API_URL}/${id}/end`, { distance: parseFloat(distance) }, config);
  return res.data;
};

// ---------------------------
// Partage de course
// ---------------------------

// Partager une course
export const shareRide = async (rideId, toUserId) => {
  const config = await getConfig();
  const res = await axios.post(`${API_URL}/share`, { rideId, toUserId }, config);
  return res.data;
};

// Répondre à un partage
export const respondToShare = async (shareId, action) => {
  if (!['accepted', 'declined'].includes(action)) throw new Error('Action invalide');
  const config = await getConfig();
  const res = await axios.post(`${API_URL}/share/respond`, { shareId, action }, config);
  return res.data;
};




export const getContacts = async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) throw new Error('Token manquant');

    const res = await axios.get(API_URL, {
      headers: { Authorization: `Bearer ${token}` }
    });

    return res.data;
  } catch (err) {
    console.error('Erreur getContacts:', err.response?.data || err.message);
    return [];
  }
};