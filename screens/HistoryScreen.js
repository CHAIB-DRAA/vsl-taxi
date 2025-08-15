import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { getRides, updateRide } from '../services/api';

const HistoryScreen = () => {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRides = async () => {
    try {
      setLoading(true);
      const data = await getRides();
      setRides(data);
    } catch (error) {
      console.error(error);
      Alert.alert('Erreur', 'Impossible de récupérer les courses.');
    } finally {
      setLoading(false);
    }
  };

  const toggleFacturation = async (rideId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'Facturé' ? 'Non facturé' : 'Facturé';
      await updateRide(rideId, { status: newStatus });
      Alert.alert('Succès', `Course mise à jour : ${newStatus}`);
      fetchRides(); // Rafraîchir la liste
    } catch (error) {
      console.error(error);
      Alert.alert('Erreur', 'Impossible de mettre à jour la course.');
    }
  };

  useEffect(() => {
    fetchRides();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.title}>{item.patientName}</Text>
      <Text>Date : {new Date(item.date).toLocaleDateString()}</Text>
      <Text>Départ : {item.startLocation}</Text>
      <Text>Arrivée : {item.endLocation}</Text>
      <Text>Distance : {item.distance} km</Text>
      <Text>Statut : {item.status || 'Non défini'}</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => toggleFacturation(item._id, item.status)}
      >
        <Text style={styles.buttonText}>
          {item.status === 'Facturé' ? 'Marquer non facturé' : 'Marquer facturé'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <FlatList
      data={rides}
      keyExtractor={(item) => item._id}
      renderItem={renderItem}
      contentContainerStyle={{ padding: 10 }}
    />
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
    borderRadius: 10,
    elevation: 3,
  },
  title: { fontWeight: 'bold', fontSize: 16, marginBottom: 5 },
  button: {
    backgroundColor: '#007BFF',
    padding: 10,
    marginTop: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: 'bold' },
});

export default HistoryScreen;
