import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://vsl-taxi.onrender.com/api/rides';

// Headers avec token JWT
const getAuthHeaders = async () => {
  const token = await AsyncStorage.getItem('token');
  return { headers: { Authorization: `Bearer ${token}` } };
};

// Auth
export const registerUser = async (userData) => {
  const res = await axios.post(`${API_URL}/auth/register`, userData);
  return res.data;
};

export const loginUser = async (credentials) => {
  const res = await axios.post(`${API_URL}/auth/login`, credentials);
  await AsyncStorage.setItem('token', res.data.token);
  return res.data;
};

// Rides
export const getRides = async () => {
  const headers = await getAuthHeaders();
  const res = await axios.get(`${API_URL}/rides`, headers);
  return res.data;
};

export const createRide = async (ride) => {
  const headers = await getAuthHeaders();
  const res = await axios.post(`${API_URL}/rides`, ride, headers);
  return res.data;
};

export const updateRide = async (id, ride) => {
  const headers = await getAuthHeaders();
  const res = await axios.patch(`${API_URL}/rides/${id}`, ride, headers);
  return res.data;
};

export const deleteRide = async (id) => {
  const headers = await getAuthHeaders();
  const res = await axios.delete(`${API_URL}/rides/${id}`, headers);
  return res.data;
};
