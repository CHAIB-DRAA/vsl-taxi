import React, { useEffect, useState } from 'react';
import { View, Text, Alert } from 'react-native';
import RideForm from '../components/RideForm';
import { createRide } from '../services/api';
import { supabase } from '../lib/supabase';

const sanitizeString = (str) => str ? str.replace(/["']/g, '').trim() : '';

const CreateRideScreen = () => {
  const [chauffeurId, setChauffeurId] = useState(null);

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error(error);
        return;
      }
      if (session?.user?.id) setChauffeurId(session.user.id);
    };
    fetchSession();
  }, []);

  const handleCreate = async (ride) => {
    if (!chauffeurId) {
      Alert.alert('Erreur', 'Impossible de récupérer l’utilisateur connecté.');
      return;
    }

    try {
      // Préparer la course Aller
      const allerRide = {
        patientName: sanitizeString(ride.patientName),
        startLocation: sanitizeString(ride.startLocation),
        endLocation: sanitizeString(ride.endLocation),
        date: ride.date,
        type: 'Aller',
        chauffeurId,
        isRoundTrip: ride.isRoundTrip || false,
      };

      console.log('Envoi Aller → MongoDB :', allerRide);
      const responseAller = await createRide(allerRide);
      console.log('Réponse MongoDB Aller :', responseAller);

      // Si Aller-Retour, préparer la course Retour
      if (ride.isRoundTrip && ride.returnDate) {
        const retourRide = {
          ...ride,
          startLocation: ride.endLocation,
          endLocation: ride.startLocation,
          type: 'Retour',
          date: new Date(ride.returnDate).toISOString(),
          patientName: ride.patientName,
          chauffeurId: chauffeurId || null,
        };
        console.log('Course retour envoyée:', retourRide);
        

        console.log('Envoi Retour → MongoDB :', retourRide);
        const responseRetour = await createRide(retourRide);
        console.log('Réponse MongoDB Retour :', responseRetour);

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
