import axios from 'axios';
import { supabase } from '../lib/supabase';

const API_URL = 'https://vsl-taxi.onrender.com/api/contacts';

const getConfig = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return { headers: { Authorization: `Bearer ${session?.access_token}` } };
};

export const addContactMongo = async (profile) => {
  const config = await getConfig();
  const response = await axios.post(API_URL, {
    contactId: profile.id,
    email: profile.email,
    fullName: profile.full_name,
  }, config);
  return response.data;
};

export const getContactsMongo = async () => {
  const config = await getConfig();
  const response = await axios.get(API_URL, config);
  return response.data;
};

export const deleteContactMongo = async (contactId) => {
  const config = await getConfig();
  const response = await axios.delete(`${API_URL}/${contactId}`, config);
  return response.data;
};
