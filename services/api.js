import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://vsl-taxi.onrender.com/api/rides';

const axiosInstance = axios.create({
  baseURL: API_URL,
});
export const registerUser = async (userData) => {
  const response = await axios.post(`${API_URL}/register`, userData);
  return response.data;
};
// Intercepteur pour ajouter le token à chaque requête
axiosInstance.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export const getRides = async () => {
  const response = await axiosInstance.get('/');
  return response.data;
};

export const createRide = async (ride) => {
  const response = await axiosInstance.post('/', ride);
  return response.data;
};

export const startRideById = async (id) => {
  const response = await axiosInstance.patch(`/${id}/start`);
  return response.data;
};

export const finishRideById = async (id, data) => {
  const response = await axiosInstance.patch(`/${id}/finish`, data);
  return response.data;
};

export const updateRide = async (id, ride) => {
  const response = await axiosInstance.patch(`/${id}`, ride);
  return response.data;
};

export const deleteRide = async (id) => {
  const response = await axiosInstance.delete(`/${id}`);
  return response.data;
};

// Met à jour uniquement le statut (facturé ou non)
export const updateRideStatus = async (id, status) => {
  const response = await axiosInstance.patch(`/${id}`, { status });
  return response.data;
};
