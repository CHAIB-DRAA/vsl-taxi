import React, { useEffect, useState } from 'react';
import { View, Text, Alert } from 'react-native';
import RideForm from '../components/RideForm';
import { createRide } from '../services/api';
import { supabase } from '../lib/supabase';

// Nettoyage des chaînes pour éviter injection ou caractères indésirables
const sanitizeString = (str) => str ? str.replace(/["']/g, '').trim() : '';

const CreateRideScreen = () => {
  const [chauffeurId, setChauffeurId] = useState(null);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (session?.user?.id) setChauffeurId(session.user.id);
      } catch (err) {
        console.error('Erreur session Supabase:', err);
        Alert.alert('Erreur', 'Impossible de récupérer l’utilisateur connecté.');
      }
    };
    fetchSession();
  }, []);

  const handleCreate = async (ride) => {
    if (!chauffeurId) {
      Alert.alert('Erreur', 'Utilisateur non connecté.');
      return;
    }

    try {
      // Fonction pour préparer et envoyer la course
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
        console.log(`Envoi ${type} → MongoDB :`, payload);
        const response = await createRide(payload);
        console.log(`Réponse MongoDB ${type} :`, response);
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
