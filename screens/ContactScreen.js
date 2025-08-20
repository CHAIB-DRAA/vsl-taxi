import React, { useEffect, useState } from 'react';
import { 
  View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet, Alert, ScrollView, TextInput 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_URL = 'https://vsl-taxi.onrender.com/api';

export default function ContactsScreen() {
  const [users, setUsers] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Récupérer token
  const getToken = async () => {
    const token = await AsyncStorage.getItem('token');
    if (!token) throw new Error('Token manquant');
    return token;
  };

  // Charger tous les utilisateurs (sauf soi-même)
  const fetchUsers = async () => {
    try {
      const token = await getToken();
      const res = await axios.get(`${API_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(res.data);
    } catch (err) {
      console.error(err);
      Alert.alert('Erreur', err.response?.data?.error || err.message);
    }
  };

  // Charger mes contacts
  const fetchContacts = async () => {
    try {
      const token = await getToken();
      const res = await axios.get(`${API_URL}/contacts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setContacts(res.data);
    } catch (err) {
      console.error(err);
      Alert.alert('Erreur', err.response?.data?.error || err.message);
    }
  };

  // Ajouter un contact
  const addContact = async (contactId) => {
    try {
      const token = await getToken();
      await axios.post(`${API_URL}/contacts`, { contactId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      Alert.alert('Succès', 'Contact ajouté !');
      fetchContacts();
    } catch (err) {
      console.error(err);
      Alert.alert('Erreur', err.response?.data?.error || err.message);
    }
  };

  // Supprimer un contact
  const removeContact = async (contactId) => {
    try {
      const token = await getToken();
      await axios.delete(`${API_URL}/contacts/${contactId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      Alert.alert('Succès', 'Contact supprimé !');
      fetchContacts();
    } catch (err) {
      console.error(err);
      Alert.alert('Erreur', err.response?.data?.error || err.message);
    }
  };

  useEffect(() => {
    Promise.all([fetchUsers(), fetchContacts()]).finally(() => setLoading(false));
  }, []);

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <ActivityIndicator size="large" color="#4CAF50" style={{ flex: 1, justifyContent: 'center' }} />;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Mes contacts</Text>
      {contacts.length === 0 ? (
        <Text style={styles.emptyText}>Vous n'avez aucun contact pour le moment.</Text>
      ) : (
        <FlatList
          data={contacts}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <View style={styles.contactCard}>
              <View>
                <Text style={styles.contactName}>{item.contactId.name}</Text>
                <Text style={styles.contactEmail}>{item.contactId.email}</Text>
              </View>
              <TouchableOpacity onPress={() => removeContact(item.contactId._id)} style={styles.deleteButton}>
                <Text style={styles.deleteText}>Supprimer</Text>
              </TouchableOpacity>
            </View>
          )}
          style={{ marginBottom: 20 }}
        />
      )}

      <Text style={styles.header}>Ajouter un contact</Text>
      <TextInput
        placeholder="Rechercher par nom ou email"
        style={styles.searchInput}
        value={search}
        onChangeText={setSearch}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
        {filteredUsers.map(user => (
          <TouchableOpacity
            key={user._id}
            style={styles.addButton}
            onPress={() => addContact(user._id)}
          >
            <Text style={styles.addText}>{user.name}</Text>
            <Text style={styles.addEmail}>{user.email}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: '#fff' },
  header: { fontSize: 20, fontWeight: 'bold', color: '#222', marginBottom: 10 },
  emptyText: { fontSize: 16, color: '#888', textAlign: 'center', marginVertical: 20 },
  contactCard: { 
    backgroundColor: '#F5F5F5', padding: 12, borderRadius: 10, marginBottom: 10, 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' 
  },
  contactName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  contactEmail: { fontSize: 14, color: '#555' },
  deleteButton: { backgroundColor: '#FF3B30', padding: 6, borderRadius: 8 },
  deleteText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  searchInput: { 
    backgroundColor: '#F5F5F5', padding: 10, borderRadius: 8, fontSize: 14, marginBottom: 10 
  },
  addButton: { backgroundColor: '#4CAF50', padding: 12, borderRadius: 10, marginRight: 10, width: 150 },
  addText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  addEmail: { color: '#fff', fontSize: 12, marginTop: 2 },
});
