import React from 'react';
import { View, Text, Alert } from 'react-native';
import RideForm from '../components/RideForm';
import { createRide } from '../services/api';

const CreateRideScreen = () => {
  const handleCreate = async (ride) => {
    try {
      if (ride.isRoundTrip && ride.returnDate) {
        // Course Aller
        await createRide({
          patientName: ride.patientName,
          startLocation: ride.startLocation,
          endLocation: ride.endLocation,
          type: 'Aller',
          date: ride.date,
        });

        // Course Retour
        await createRide({
          patientName: ride.patientName,
          startLocation: ride.endLocation,
          endLocation: ride.startLocation,
          type: 'Retour',
          date: ride.returnDate,
        });

        Alert.alert('Succès', 'Courses Aller et Retour créées !');
      } else {
        await createRide({
          patientName: ride.patientName,
          startLocation: ride.startLocation,
          endLocation: ride.endLocation,
          type: 'Aller',
          date: ride.date,
        });

        Alert.alert('Succès', 'Course créée !');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Erreur', 'Erreur lors de la création de la course.');
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
