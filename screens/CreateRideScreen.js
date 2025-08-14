import React from 'react';
import { View, Text } from 'react-native';
import RideForm from '../components/RideForm';
import { createRide } from '../services/api';

const CreateRideScreen = () => {
  const handleCreate = async (ride) => {
    try {
      await createRide(ride);
      alert('Course créée !');
    } catch (err) {
      alert('Erreur lors de la création de la course.');
    }
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 10 }}>Créer une course</Text>
      <RideForm onCreate={handleCreate} />
    </View>
  );
};

export default CreateRideScreen;
