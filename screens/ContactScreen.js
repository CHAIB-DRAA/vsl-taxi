import React, { useState, useEffect } from 'react';
import { View, TextInput, Button, FlatList, Text, StyleSheet, Alert } from 'react-native';
import axios from 'axios';

const API_URL = 'https://vsl-taxi.onrender.com/api/users';

export default function ContactsScreen({ route }) {
  const { userId } = route.params;
  const [contacts, setContacts] = useState([]);
  const [newEmail, setNewEmail] = useState('');

  const fetchContacts = async () => {
    try {
      const { data } = await axios.get(API_URL, { params: { supabaseId: userId } });
      setContacts(data);
    } catch (err) {
      console.error('Fetch contacts error:', err.response?.data || err.message);
    }
  };

  const addContact = async () => {
    if (!newEmail.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un email');
      return;
    }
    try {
      const { data } = await axios.post(`${API_URL}/addContact`, { userId, contactEmail: newEmail });
      Alert.alert('Succès', 'Contact ajouté');
      setNewEmail('');
      fetchContacts();
    } catch (err) {
      console.error('Add contact error:', err.response?.data || err.message);
      Alert.alert('Erreur', err.response?.data?.error || 'Impossible d’ajouter le contact');
    }
  };

  useEffect(() => { fetchContacts(); }, []);

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Email du contact"
        value={newEmail}
        onChangeText={setNewEmail}
      />
      <Button title="Ajouter contact" onPress={addContact} />

      <FlatList
        data={contacts}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => <Text style={styles.contact}>{item.fullName || item.email}</Text>}
        style={{ marginTop: 20 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, marginTop: 40 },
  input: {
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 12,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  contact: {
    fontSize: 16,
    paddingVertical: 8,
    borderBottomColor: '#eee',
    borderBottomWidth: 1,
  },
});
