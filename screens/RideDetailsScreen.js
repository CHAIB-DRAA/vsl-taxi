import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet, ActivityIndicator } from 'react-native';
import { getRideById, deleteRideById } from '../services/api';

const RideDetailsScreen = ({ route, navigation }) => {
  const { id } = route.params;
  const [ride, setRide] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRide = async () => {
      try {
        const data = await getRideById(id);
        setRide(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchRide();
  }, [id]);

  const handleDelete = async () => {
    try {
      await deleteRideById(id);
      navigation.goBack();
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) return <ActivityIndicator size="large" color="#0000ff" />;

  if (!ride) return <Text>Course introuvable</Text>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{ride.patientName}</Text>
      <Text>Date : {new Date(ride.date).toLocaleString()}</Text>
      <Text>Départ : {ride.startLocation}</Text>
      <Text>Arrivée : {ride.endLocation}</Text>
      <Text>Type : {ride.type}</Text>

      <Button title="Modifier" onPress={() => navigation.navigate('EditRide', { id })} />
      <Button title="Supprimer" color="red" onPress={handleDelete} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 }
});

export default RideDetailsScreen;
