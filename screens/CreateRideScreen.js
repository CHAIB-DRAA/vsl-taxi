import React from 'react';
import { View, Text, Alert } from 'react-native';
import RideForm from '../components/RideForm';
import { createRide } from '../services/api';

const sanitizeString = (str) => str ? str.replace(/["']/g, '').trim() : '';

const CreateRideScreen = () => {
  // Ici on simule un chauffeur connecté
  const chauffeurId = "123456789abcdef"; // Remplace par l'ID réel de ton utilisateur

  const handleCreate = async (ride) => {
    if (!chauffeurId) {
      Alert.alert('Erreur', 'Utilisateur non connecté.');
      return;
    }

    try {
      const sendRide = async ({ patientName, startLocation, endLocation, date, type }) => {
        const payload = {
          patientName: sanitizeString(patientName),
          startLocation: sanitizeString(startLocation),
          endLocation: sanitizeString(endLocation),
          date,
          type,
          chauffeurId,
          isRoundTrip: !!ride.isRoundTrip,
        };
        console.log(`Envoi ${type} → backend :`, payload);
        const response = await createRide(payload);
        console.log(`Réponse ${type} :`, response);
      };

      // Créer course Aller
      await sendRide({
        patientName: ride.patientName,
        startLocation: ride.startLocation,
        endLocation: ride.endLocation,
        date: ride.date,
        type: 'Aller',
      });

      // Si Aller-Retour, créer course Retour
      if (ride.isRoundTrip && ride.returnDate) {
        await sendRide({
          patientName: ride.patientName,
          startLocation: ride.endLocation,
          endLocation: ride.startLocation,
          date: ride.returnDate,
          type: 'Retour',
        });
        Alert.alert('Succès', 'Courses Aller et Retour créées !');
      } else {
        Alert.alert('Succès', 'Course créée !');
      }
    } catch (err) {
      console.error('Erreur création course :', err);
      Alert.alert('Erreur', 'Impossible de créer la course. Vérifiez les champs.');
    }
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 10 }}>
        Créer une course
      </Text>
      <RideForm onCreate={handleCreate} />
    </View>
  );
};

export default CreateRideScreen;
