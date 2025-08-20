import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, FlatList, ActivityIndicator } from 'react-native';
import axios from 'axios';
import { supabase } from '../lib/supabase';

const API_URL = 'https://vsl-taxi.onrender.com/api/users'; // endpoint Mongo

export default function ContactsScreen() {
  const [contacts, setContacts] = useState([]);
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) setUserId(session.user.id);
    };
    fetchUser();
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/contacts/${userId}`);
      setContacts(response.data || []);
    } catch (err) {
      console.error('Erreur fetch contacts:', err.response?.data || err.message);
      Alert.alert('Erreur', 'Impossible de charger les contacts.');
    } finally {
      setLoading(false);
    }
  };

  const addContact = async () => {
    if (!newEmail.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un email.');
      return;
    }
    if (newEmail.trim() === userId) {
      Alert.alert('Erreur', 'Vous ne pouvez pas vous ajouter vous-même.');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/contacts`, {
        userId,
        email: newEmail.trim(),
      });
      setContacts(prev => [...prev, response.data]);
      setNewEmail('');
      Alert.alert('Succès', `Contact ajouté : ${response.data.fullName || response.data.email}`);
    } catch (err) {
      console.error('Erreur add contact:', err.response?.data || err.message);
      Alert.alert('Erreur', err.response?.data?.message || 'Impossible d’ajouter le contact.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 10 }}>Mes contacts</Text>

      <View style={{ flexDirection: 'row', marginBottom: 20 }}>
        <TextInput
          placeholder="Email du contact"
          value={newEmail}
          onChangeText={setNewEmail}
          style={{
            flex: 1,
            height: 50,
            borderColor: '#ccc',
            borderWidth: 1,
            borderRadius: 8,
            paddingHorizontal: 12,
            backgroundColor: '#fff',
          }}
        />
        <TouchableOpacity
          onPress={addContact}
          style={{
            marginLeft: 10,
            backgroundColor: '#4CAF50',
            paddingHorizontal: 20,
            justifyContent: 'center',
            borderRadius: 8,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>Ajouter</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#2196F3" />
      ) : (
        <FlatList
          data={contacts}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <View
              style={{
                padding: 15,
                borderBottomWidth: 1,
                borderBottomColor: '#eee',
                backgroundColor: '#fff',
                borderRadius: 8,
                marginBottom: 10,
              }}
            >
              <Text>{item.fullName || item.email}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}
