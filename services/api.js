import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

let token = null;
const API_URL = 'https://vsl-taxi.onrender.com/api/rides';

// Définir manuellement le token (après login)
export const setToken = (t) => { token = t; };

// Récupérer le token (depuis la variable ou AsyncStorage)
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

// === Courses
export const getRides = async () => {
  const config = await getConfig();
  const response = await axios.get(API_URL, config);
  return response.data;
};

export const createRide = async (ride) => {
  const config = await getConfig();
  const response = await axios.post(API_URL, ride, config);
  return response.data;
};

export const updateRide = async (id, data) => {
  const config = await getConfig();
  const response = await axios.patch(`${API_URL}/${id}`, data, config);
  return response.data;
};

export const deleteRide = async (id) => {
  const config = await getConfig();
  const response = await axios.delete(`${API_URL}/${id}`, config);
  return response.data;
};

// === Statut
export const startRideById = async (id) => {
  if (!id) throw new Error('ID de course manquant');
  const config = await getConfig();
  const response = await axios.post(`${API_URL}/${id}/start`, {}, config);
  return response.data;
};

export const finishRideById = async (id, distance) => {
  if (!distance || isNaN(distance)) throw new Error('Distance invalide');
  const config = await getConfig();
  const response = await axios.post(`${API_URL}/${id}/end`, { distance: parseFloat(distance) }, config);
  return response.data;
};

// === Partage
export const shareRide = async (rideId, toUserId) => {
  const config = await getConfig();
  const response = await axios.post(`${API_URL}/share`, { rideId, toUserId }, config);
  return response.data;
};

export const respondToShare = async (shareId, action) => {
  if (!['accepted', 'declined'].includes(action)) throw new Error('Action invalide');
  const config = await getConfig();
  const response = await axios.post(`${API_URL}/share/respond`, { shareId, action }, config);
  return response.data;
};
