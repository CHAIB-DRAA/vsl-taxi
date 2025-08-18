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
  const response = await axios.post(API_URL, ride, config());
  return response.data;
};

export const startRideById = async (id) => {
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
