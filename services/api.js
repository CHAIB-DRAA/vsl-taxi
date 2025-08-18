import axios from 'axios';

let token = null;

// Stocker le token après login
export const setToken = (t) => { token = t; };

const config = () => ({
  headers: { Authorization: `Bearer ${token}` }
});

const API_URL = 'https://vsl-taxi.onrender.com/api/rides';

// Récupérer les courses
export const getRides = async () => {
  const response = await axios.get(API_URL, config());
  return response.data;
};

// Créer une course
export const createRide = async (ride) => {
  console.log('Envoi Aller → MongoDB :', { ...ride });
  const response = await axios.post(API_URL, ride, config());
  console.log('Réponse MongoDB :', response.data);
  return response.data;
};

// Démarrer une course
export const startRideById = async (id) => {
  if (!token) throw new Error('Token non défini');
  if (!id) throw new Error('ID de course manquant');
  const response = await axios.patch(`${API_URL}/${id}/start`, {}, config());
  return response.data;
};

// Terminer une course avec distance
export const finishRideById = async (id, distance) => {
  if (!distance || isNaN(distance)) throw new Error('Distance invalide');
  const response = await axios.patch(`${API_URL}/${id}/end`, { distance: parseFloat(distance) }, config());
  return response.data;
};

// Mettre à jour le statut
export const updateRideStatus = async (id, status) => {
  const response = await axios.patch(`${API_URL}/${id}`, { status }, config());
  return response.data;
};
