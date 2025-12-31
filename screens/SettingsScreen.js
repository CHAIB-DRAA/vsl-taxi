import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Modal, Alert, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';

// Import des écrans
import ContactsScreen from './ContactScreen'; 
import PatientsScreen from './PatientsScreen'; // <--- NOUVEAU

export default function SettingsScreen({ navigation, onLogout }) {
  const [showContacts, setShowContacts] = useState(false);
  const [showPatients, setShowPatients] = useState(false); // <--- NOUVEAU STATE

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion', 'Voulez-vous vraiment vous déconnecter ?',
      [{ text: 'Annuler', style: 'cancel' }, { text: 'Déconnexion', style: 'destructive', onPress: async () => { try { await SecureStore.deleteItemAsync('user_session'); if (onLogout) onLogout(); } catch (err) { console.error("Erreur", err); } } }]
    );
  };

  const options = [
    { id: '1', label: 'Mon compte', icon: 'person-outline', onPress: () => Alert.alert('Profil', 'Fonctionnalité à venir') },
    { id: '2', label: 'Mes contacts', icon: 'people-outline', onPress: () => setShowContacts(true) },
    
    // 👇 AJOUTE CETTE LIGNE
    { id: '5', label: 'Mes Patients', icon: 'medkit-outline', onPress: () => setShowPatients(true) },
    
    { id: '3', label: 'Paramètres app', icon: 'settings-outline', onPress: () => Alert.alert('Réglages') },
    { id: '4', label: 'Déconnexion', icon: 'log-out-outline', onPress: handleLogout, color: '#FF5252' },
  ];

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={item.onPress} activeOpacity={0.7}>
      <View style={styles.cardContent}>
        <Ionicons name={item.icon} size={22} color={item.color || "#FF6B00"} style={styles.icon} />
        <Text style={[styles.label, item.color && { color: item.color }]}>{item.label}</Text>
        <Ionicons name="chevron-forward-outline" size={18} color="#CCC" />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Mon Profil</Text>
      
      <FlatList
        data={options}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingVertical: 10 }}
      />

      {/* MODAL CONTACTS */}
      <Modal visible={showContacts} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowContacts(false)} style={styles.closeButton}><Ionicons name="close" size={28} color="#333" /></TouchableOpacity>
          <Text style={styles.modalTitle}>Mes Contacts</Text>
          <View style={{ width: 28 }} /> 
        </View>
        <ContactsScreen />
      </Modal>

      {/* 👇 MODAL PATIENTS (NOUVEAU) */}
      <Modal visible={showPatients} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowPatients(false)} style={styles.closeButton}><Ionicons name="close" size={28} color="#333" /></TouchableOpacity>
          <Text style={styles.modalTitle}>Mes Patients</Text>
          <View style={{ width: 28 }} /> 
        </View>
        <PatientsScreen />
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { fontSize: 26, fontWeight: 'bold', color: '#333', marginTop: 20, marginBottom: 10, marginLeft: 20 },
  card: { backgroundColor: '#fff', marginHorizontal: 20, marginVertical: 6, borderRadius: 15, paddingVertical: 18, paddingHorizontal: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardContent: { flexDirection: 'row', alignItems: 'center' },
  icon: { marginRight: 15 },
  label: { flex: 1, fontSize: 16, fontWeight: '500', color: '#444' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#EEE', backgroundColor: '#FFF' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  closeButton: { padding: 5 }
});