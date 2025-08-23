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
import { getContacts, addContact, deleteContact, searchUsers } from '../services/contactService';

export default function ContactsScreen() {
  const [contacts, setContacts] = useState([]);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Charger contacts
  const fetchContacts = async () => {
    try {
      setLoadingContacts(true);
      const data = await getContacts();
      setContacts(data);
    } catch (err) {
      console.error('❌ Erreur getContacts:', err.response?.data || err.message);
      Alert.alert('Erreur', 'Impossible de charger les contacts.');
    } finally {
      setLoadingContacts(false);
    }
  };

  // Vérifier si le texte est un email valide partiel
  const isEmailFormat = (text) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{0,}$/; // ex: example@example.
    return emailRegex.test(text);
  };

  // Rechercher utilisateurs seulement si le texte ressemble à un email
  const fetchUsers = async (query = '') => {
    if (!query || !isEmailFormat(query)) {
      setUsers([]);
      return;
    }
    try {
      setLoadingUsers(true);
      const data = await searchUsers(query);
      setUsers(data);
    } catch (err) {
      console.error('❌ Erreur searchUsers:', err.response?.data || err.message);
      Alert.alert('Erreur', 'Impossible de charger les utilisateurs.');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSearch = (text) => {
    setSearch(text);
    fetchUsers(text);
  };

  // Ajouter un contact
  const handleAddContact = async (contactId) => {
    try {
      await addContact(contactId);
      Alert.alert('Succès', 'Contact ajouté !');
      fetchContacts();
      setSearch('');
      setUsers([]);
    } catch (err) {
      console.error('❌ Erreur addContact:', err.response?.data || err.message);
      Alert.alert('Erreur', err.response?.data?.error || 'Impossible d’ajouter le contact.');
    }
  };

  // Supprimer un contact
  const handleDeleteContact = async (contactId) => {
    try {
      await deleteContact(contactId);
      Alert.alert('Succès', 'Contact supprimé !');
      fetchContacts();
    } catch (err) {
      console.error('❌ Erreur deleteContact:', err.response?.data || err.message);
      Alert.alert('Erreur', err.response?.data?.error || 'Impossible de supprimer le contact.');
    }
  };

  // Initial load des contacts seulement
  useEffect(() => {
    fetchContacts();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Mes contacts</Text>

      {loadingContacts ? (
        <ActivityIndicator size="large" color="#4CAF50" />
      ) : (
        <FlatList
          data={contacts}
          keyExtractor={(item) => item._id}
          ListEmptyComponent={<Text>Aucun contact ajouté.</Text>}
          renderItem={({ item }) => (
            <View style={styles.contactItem}>
              <Text>{item.fullName || item.email}</Text>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteContact(item.contactId._id)}
              >
                <Text style={styles.deleteText}>Supprimer</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      <Text style={[styles.header, { marginTop: 20 }]}>Ajouter un contact</Text>
      <TextInput
        style={styles.input}
        placeholder="Rechercher par email (ex: example@example.)"
        value={search}
        onChangeText={handleSearch}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      {loadingUsers && <ActivityIndicator size="small" color="#4CAF50" />}
      
      <FlatList
        data={users}
        keyExtractor={(item) => item._id}
        ListEmptyComponent={!search ? null : <Text>Aucun utilisateur trouvé.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => handleAddContact(item._id)}
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
