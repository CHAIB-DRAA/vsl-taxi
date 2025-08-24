import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://vsl-taxi.onrender.com/api/contacts';
const USERS_URL = 'https://vsl-taxi.onrender.com/api/user/search';

// Récupérer config Axios avec token
const getConfig = async () => {
  const token = await AsyncStorage.getItem('token');
  if (!token) throw new Error('Token manquant');
  return { headers: { Authorization: `Bearer ${token}` } };
};

// --- Contacts ---
export const getContacts = async () => {
  const config = await getConfig();
  const res = await axios.get(API_URL, config);
  return res.data;
};

export const addContact = async (contactId) => {
  const config = await getConfig();
  const res = await axios.post(API_URL, { contactId }, config);
  return res.data;
};

export const deleteContact = async (contactId) => {
  const config = await getConfig();
  const res = await axios.delete(`${API_URL}/${contactId}`, config);
  return res.data;
};

// --- Utilisateurs (recherche) ---
// --- Utilisateurs (recherche) ---
export const searchUsers = async (query = '') => {
  const config = await getConfig();
  const url = `https://vsl-taxi.onrender.com/api/user/search${query ? `?q=${encodeURIComponent(query)}` : ''}`;
  const res = await axios.get(url, config);
  return res.data;
};
