import axios from 'axios';

let token = null;

// Stocker le token après login
export const setToken = (t) => { token = t; };

const config = () => ({
  headers: { Authorization: `Bearer ${token}` }
});

const API_URL = 'https://vsl-taxi.onrender.com/api/rides';


export const getRides = async () => {
  const response = await axios.get(API_URL, config());
  return response.data;
};

export const createRide = async (ride) => {
  console.log('Envoi Aller → MongoDB :', { ...ride, chauffeurId: 'token sera ajouté côté backend' });
  const response = await axios.post(API_URL, ride, config());
  console.log('Réponse MongoDB :', response.data);
  return response.data;
};


// Démarrer une course
export const startRideById = async (id) => {
  if (!token) throw new Error('Token non défini');
  if (!id) throw new Error('ID de course manquant');
  const response = await axios.patch(`${API_URL}/start/${id}`, {}, config());
  return response.data;
};

export const finishRideById = async (id, data) => {
  const response = await axios.patch(`${API_URL}/end/${id}`, data, config());
  return response.data;
};

export const updateRideStatus = async (id, status) => {
  const response = await axios.patch(`${API_URL}/${id}`, { status }, config());
  return response.data;
};
