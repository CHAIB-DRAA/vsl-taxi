import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Modal, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ContactScreen from './ContactScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SettingsScreen() {
  const [showContacts, setShowContacts] = useState(false);
  const [token, setToken] = useState(null);

  // Récupérer le token JWT stocké (ex: après login)
  useEffect(() => {
    const getToken = async () => {
      const storedToken = await AsyncStorage.getItem('token');
      setToken(storedToken);
    };
    getToken();
  }, []);

  const handleSignOut = async () => {
    await AsyncStorage.removeItem('token');
    Alert.alert('Déconnexion', 'Vous avez été déconnecté.');
    setToken(null);
  };

  const options = [
    { label: 'Paramètres', icon: 'settings-outline', onPress: () => Alert.alert('Paramètres') },
    { label: 'Mon compte', icon: 'person-outline', onPress: () => Alert.alert('Mon compte') },
    { label: 'Mes contacts', icon: 'people-outline', onPress: () => setShowContacts(true) },
    { label: 'Déconnexion', icon: 'log-out-outline', onPress: handleSignOut },
  ];

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={item.onPress} activeOpacity={0.7}>
      <View style={styles.cardContent}>
        <Ionicons name={item.icon} size={24} color="#007bff" style={styles.icon} />
        <Text style={styles.label}>{item.label}</Text>
        <Ionicons name="chevron-forward-outline" size={20} color="#ccc" />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Mon Profil</Text>
      <FlatList
        data={options}
        renderItem={renderItem}
        keyExtractor={(item, index) => index.toString()}
        contentContainerStyle={{ paddingBottom: 20 }}
      />

      <Modal visible={showContacts} animationType="slide">
        {token ? (
          <ContactScreen token={token} />
        ) : (
          <Text style={{ padding: 20 }}>Chargement...</Text>
        )}
        <TouchableOpacity onPress={() => setShowContacts(false)} style={{ padding: 20 }}>
          <Text style={{ color: 'red', textAlign: 'center', fontWeight: 'bold' }}>Fermer</Text>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa' },
  header: { fontSize: 24, fontWeight: 'bold', color: '#222', marginTop: 30, marginBottom: 20, marginLeft: 20 },
  card: { backgroundColor: '#fff', marginHorizontal: 20, marginVertical: 8, borderRadius: 12, paddingVertical: 15, paddingHorizontal: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3 },
  cardContent: { flexDirection: 'row', alignItems: 'center' },
  icon: { marginRight: 15 },
  label: { flex: 1, fontSize: 16, color: '#333' },
});
