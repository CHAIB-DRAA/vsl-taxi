import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

/**
 * CONFIGURATION
 */
const BASE_URL = 'https://vsl-taxi.onrender.com/api';
const SESSION_KEY = 'user_session';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 40000, 
  headers: { 'Content-Type': 'application/json' },
});

/** INTERCEPTEURS (Sécurité & Token) */
api.interceptors.request.use(
  async (config) => {
    try {
      const sessionData = await SecureStore.getItemAsync(SESSION_KEY);
      if (sessionData) {
        const { token } = JSON.parse(sessionData);
        if (token) config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (err) { console.error("🔒 Erreur Token:", err); }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn("⚠️ Session expirée ou invalide");
      // Ici tu pourrais ajouter une logique pour déconnecter l'user
    }
    return Promise.reject(error);
  }
);

// =========================================================
// 1. AUTHENTIFICATION & NOTIFICATIONS (Nouveau)
// =========================================================

export const login = (credentials) => api.post('/auth/login', credentials);
export const register = (userData) => api.post('/auth/register', userData);

// Envoi du Token de notification (Push)
export const updatePushToken = async (pushToken) => {
  return api.put('/auth/push-token', { pushToken });
};

// =========================================================
// 2. CONTACTS & UTILISATEURS
// =========================================================

export const getContacts = async () => {
  const res = await api.get('/contacts');
  return res.data;
};

export const searchUsers = async (emailQuery) => {
  const res = await api.get(`/contacts/search?q=${encodeURIComponent(emailQuery)}`);
  return res.data;
};

export const addContact = async (contactId) => {
  const res = await api.post('/contacts', { contactId });
  return res.data;
};

export const deleteContact = (contactId) => api.delete(`/contacts/${contactId}`);

// =========================================================
// 3. GESTION DES PATIENTS (Nouveau pour RideForm)
// =========================================================

export const getPatients = async () => {
  const res = await api.get('/patients');
  return res.data;
};

export const createPatient = async (patientData) => {
  // patientData = { fullName, address, phone }
  const res = await api.post('/patients', patientData);
  return res.data;
};

// =========================================================
// 4. GESTION DES COURSES (CRUD)
// =========================================================

export const getRides = async (date) => {
  const url = date ? `/rides?date=${date}` : '/rides';
  const res = await api.get(url);
  return res.data || [];
};

export const createRide = async (rideData) => {
  const res = await api.post('/rides', rideData);
  return res.data;
};

export const updateRide = async (id, data) => {
  const res = await api.patch(`/rides/${id}`, data);
  return res.data;
};

export const deleteRide = async (id) => {
  const res = await api.delete(`/rides/${id}`);
  return res.data;
};

// =========================================================
// 5. PARTAGE (RÉSEAU)
// =========================================================

export const shareRide = async (rideId, contactId, note = '') => {
  const response = await api.post(`/rides/${rideId}/share`, { 
    targetUserId: contactId,
    note: note 
  });
  return response.data;
};

// Correction : On utilise rideId, pas shareId, selon ton dernier contrôleur Backend



  export const updatePatient = async (id, data) => {
    const res = await api.put(`/patients/${id}`, data);
    return res.data;
  };
 // services/api.js

 export const respondToShare = async (rideId, action) => {
  // L'URL doit être '/rides/respond-share' (le /api est souvent ajouté auto par axios)
  return api.post('/rides/respond-share', { rideId, action });
};
  export const deletePatient = async (id) => {
    const res = await api.delete(`/patients/${id}`);
    return res.data;
  };

export default api;