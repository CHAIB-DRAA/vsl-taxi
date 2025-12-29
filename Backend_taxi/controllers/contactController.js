import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  ActivityIndicator, Alert, StyleSheet, SafeAreaView, Keyboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getContacts, addContact, deleteContact, searchUsers } from '../services/api';

export default function ContactsScreen() {
  const [contacts, setContacts] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState({ contacts: true, search: false });

  // 1. Charger les contacts (Structure Populée)
  const fetchContacts = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, contacts: true }));
      const data = await getContacts();
      // data est un tableau d'objets Contact avec contactId rempli par populate
      setContacts(data || []);
    } catch (err) {
      console.error('Erreur getContacts:', err);
    } finally {
      setLoading(prev => ({ ...prev, contacts: false }));
    }
  }, []);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  // 2. Recherche d'utilisateurs
  const handleSearch = async () => {
    if (searchText.length < 3) return;
    Keyboard.dismiss();
    try {
      setLoading(prev => ({ ...prev, search: true }));
      const results = await searchUsers(searchText);
      setSearchResults(results || []);
    } catch (err) {
      Alert.alert('Erreur', 'Recherche impossible');
    } finally {
      setLoading(prev => ({ ...prev, search: false }));
    }
  };

  // 3. Ajouter un contact
  const onAdd = async (userId) => {
    try {
      await addContact(userId);
      Alert.alert('Succès', 'Chauffeur ajouté !');
      setSearchText('');
      setSearchResults([]);
      fetchContacts();
    } catch (err) {
      const msg = err.response?.data?.error || 'Erreur lors de l’ajout';
      Alert.alert('Action refusée', msg);
    }
  };

  // 4. Supprimer un contact
  const onDelete = (id, name) => {
    Alert.alert('Supprimer', `Retirer ${name} de vos contacts ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        try {
          // Note: On passe le contactId._id au backend pour correspondre à ton findOneAndDelete
          await deleteContact(id);
          fetchContacts();
        } catch (e) { Alert.alert('Erreur', 'Suppression impossible'); }
      }}
    ]);
  };

  const renderContact = ({ item }) => (
    <View style={styles.contactCard}>
      <View style={styles.contactInfo}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(item.contactId?.fullName || item.email || "?").charAt(0).toUpperCase()}
          </Text>
        </View>
        <View>
          {/* On utilise les données populées du backend */}
          <Text style={styles.contactName}>{item.contactId?.fullName || "Chauffeur"}</Text>
          <Text style={styles.contactEmail}>{item.contactId?.email || item.email}</Text>
        </View>
      </View>
      <TouchableOpacity onPress={() => onDelete(item.contactId?._id, item.contactId?.fullName)}>
        <Ionicons name="trash-outline" size={22} color="#FF5252" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchSection}>
        <Text style={styles.sectionLabel}>Rechercher un collègue</Text>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Email du chauffeur..."
            value={searchText}
            onChangeText={setSearchText}
            autoCapitalize="none"
          />
          <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
            {loading.search ? <ActivityIndicator color="#FFF" /> : <Ionicons name="search" size={20} color="#FFF" />}
          </TouchableOpacity>
        </View>

        {searchResults.map(user => (
          <View key={user._id} style={styles.resultCard}>
            <Text style={styles.resultText}>{user.email}</Text>
            <TouchableOpacity style={styles.addBtn} onPress={() => onAdd(user._id)}>
              <Text style={styles.addBtnText}>Ajouter</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <View style={styles.listSection}>
        <Text style={styles.sectionLabel}>Mes Contacts ({contacts.length})</Text>
        {loading.contacts ? (
          <ActivityIndicator size="large" color="#FF6B00" />
        ) : (
          <FlatList
            data={contacts}
            keyExtractor={item => item._id}
            renderItem={renderContact}
            ListEmptyComponent={<Text style={styles.emptyText}>Aucun contact trouvé.</Text>}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  searchSection: { padding: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#EEE' },
  sectionLabel: { fontSize: 12, fontWeight: 'bold', color: '#999', textTransform: 'uppercase', marginBottom: 10 },
  searchRow: { flexDirection: 'row', alignItems: 'center' },
  searchInput: { flex: 1, backgroundColor: '#F1F3F5', padding: 12, borderRadius: 10, marginRight: 10, fontSize: 16 },
  searchBtn: { backgroundColor: '#FF6B00', width: 48, height: 48, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  resultCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, padding: 12, backgroundColor: '#FFF4ED', borderRadius: 10, borderLeftWidth: 4, borderLeftColor: '#FF6B00' },
  resultText: { fontWeight: '500', color: '#333' },
  addBtn: { backgroundColor: '#4CAF50', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
  addBtnText: { color: '#FFF', fontWeight: 'bold' },
  listSection: { flex: 1, padding: 20 },
  contactCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', padding: 15, borderRadius: 15, marginBottom: 12, elevation: 2 },
  contactInfo: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#607D8B', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: '#FFF', fontWeight: 'bold' },
  contactName: { fontWeight: 'bold', color: '#333', fontSize: 15 },
  contactEmail: { color: '#888', fontSize: 13 },
  emptyText: { textAlign: 'center', color: '#AAA', marginTop: 30 }
});