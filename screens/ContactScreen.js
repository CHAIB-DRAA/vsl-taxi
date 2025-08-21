import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CONTACTS_URL = 'https://vsl-taxi.onrender.com/api/contacts';
const USERS_URL = 'https://vsl-taxi.onrender.com/api/user/search';

export default function ContactsScreen() {
  const [users, setUsers] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Récupérer le token
  const getToken = async () => {
    return await AsyncStorage.getItem('token');
  };

  // Charger les contacts
  const fetchContacts = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const res = await axios.get(CONTACTS_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setContacts(res.data);
    } catch (err) {
      console.error(err);
      Alert.alert('Erreur', 'Impossible de charger les contacts.');
    } finally {
      setLoading(false);
    }
  };

  // Charger les utilisateurs (sauf soi-même) avec recherche
  const fetchUsers = async (query = '') => {
    try {
      setLoading(true);
      const token = await getToken();
      const url = `${USERS_URL}${query ? `?search=${query}` : ''}`;
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(res.data);
    } catch (err) {
      console.error(err);
      Alert.alert('Erreur', 'Impossible de charger les utilisateurs.');
    } finally {
      setLoading(false);
    }
  };

  // Ajouter un contact
  const addContact = async (contactId) => {
    try {
      const token = await getToken();
      await axios.post(
        CONTACTS_URL,
        { contactId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Alert.alert('Succès', 'Contact ajouté !');
      fetchContacts();
    } catch (err) {
      console.error(err);
      Alert.alert('Erreur', err.response?.data?.error || 'Impossible d’ajouter le contact.');
    }
  };

  // Supprimer un contact
  const deleteContact = async (contactId) => {
    try {
      const token = await getToken();
      await axios.delete(`${CONTACTS_URL}/${contactId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      Alert.alert('Succès', 'Contact supprimé !');
      fetchContacts();
    } catch (err) {
      console.error(err);
      Alert.alert('Erreur', err.response?.data?.error || 'Impossible de supprimer le contact.');
    }
  };

  // Charger au montage
  useEffect(() => {
    fetchContacts();
    fetchUsers();
  }, []);

  // Recherche
  const handleSearch = (text) => {
    setSearch(text);
    fetchUsers(text);
  };

  if (loading) return <ActivityIndicator size="large" color="#4CAF50" style={{ flex: 1 }} />;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Mes contacts</Text>
      <FlatList
        data={contacts}
        keyExtractor={(item) => item._id}
        ListEmptyComponent={<Text>Aucun contact ajouté.</Text>}
        renderItem={({ item }) => (
          <View style={styles.contactItem}>
            <Text>{item.fullName || item.email}</Text>
            <TouchableOpacity
              onPress={() => deleteContact(item.contactId._id)}
              style={styles.deleteButton}
            >
              <Text style={styles.deleteText}>Supprimer</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      <Text style={[styles.header, { marginTop: 20 }]}>Ajouter un contact</Text>
      <TextInput
        style={styles.input}
        placeholder="Rechercher par email ou nom"
        value={search}
        onChangeText={handleSearch}
      />
      <FlatList
        data={users}
        keyExtractor={(item) => item._id}
        ListEmptyComponent={<Text>Aucun utilisateur trouvé.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => addContact(item._id)}
          >
            <Text style={styles.addText}>{item.fullName || item.email}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: '#FFF' },
  header: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  contactItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F5F5F5',
    padding: 10,
    marginBottom: 8,
    borderRadius: 8,
  },
  deleteButton: { backgroundColor: '#FF5252', padding: 5, borderRadius: 5 },
  deleteText: { color: '#FFF', fontWeight: 'bold' },
  input: {
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  addButton: {
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  addText: { color: '#FFF', fontWeight: 'bold' },
});
