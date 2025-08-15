import axios from 'axios';

const API_URL = 'https://vsl-taxi.onrender.com/api/rides';

export const getRides = async () => {
  const response = await axios.get(API_URL);
  return response.data;
};

export const createRide = async (ride) => {
  const response = await axios.post(API_URL, ride);
  return response.data;
};

export const startRideById = async (id) => {
  const response = await axios.patch(`${API_URL}/${id}/start`);
  return response.data;
};

export const finishRideById = async (id, data) => {
  const response = await axios.patch(`${API_URL}/${id}/finish`, data);
  return response.data;
};


export const updateRide = async (id, ride) => {
  const response = await axios.patch(`${API_URL}/${id}`, ride);
  return response.data;
};

export const deleteRide = async (id) => {
  const response = await axios.delete(`${API_URL}/${id}`);
  return response.data;
};

// Met à jour uniquement le statut (facturé ou non)
export const updateRideStatus = async (id, status) => {
  const response = await axios.patch(`${API_URL}/${id}`, { status });
  return response.data;
};
