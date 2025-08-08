import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, FlatList, Linking, Alert } from 'react-native';
import axios from 'axios';

const API_URL = 'http://10.228.22.58:5000/api/rides';
// Formulaire pour créer une course
const RideForm = ({ onCreate }) => {
  const [patientName, setPatientName] = useState('');
  const [date, setDate] = useState('');
  const [startLocation, setStartLocation] = useState('');
  const [endLocation, setEndLocation] = useState('');
  const [type, setType] = useState('');

  const handleCreateRide = () => {
    if (!patientName || !date || !startLocation || !endLocation || !type) {
      Alert.alert('Erreur', 'Merci de remplir tous les champs');
      return;
    }
    onCreate({
      patientName,
      date,
      startLocation,
      endLocation,
      type,
      startTime: null,
      endTime: null,
      distance: 0,
    });
    setPatientName('');
    setDate('');
    setStartLocation('');
    setEndLocation('');
    setType('');
  };

  return (
    <View style={styles.form}>
      <Text>Nom du patient</Text>
      <TextInput style={styles.input} value={patientName} onChangeText={setPatientName} />
      <Text>Date de la course</Text>
      <TextInput style={styles.input} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
      <Text>Départ</Text>
      <TextInput style={styles.input} value={startLocation} onChangeText={setStartLocation} />
      <Text>Arrivée</Text>
      <TextInput style={styles.input} value={endLocation} onChangeText={setEndLocation} />
      <Text>Type de course</Text>
      <TextInput style={styles.input} value={type} onChangeText={setType} />
      <Button title="Créer la course" onPress={handleCreateRide} />
    </View>
  );
};

// Liste des trajets passés avec démarrage et fin de course
const RideHistory = ({ rides, onStart, onFinish }) => (
  <FlatList
    data={rides}
    renderItem={({ item, index }) => (
      <View style={styles.ride}>
        <Text>Patient: {item.patientName}</Text>
        <Text>
          Date:{' '}
          {new Date(item.date).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })}
        </Text>
        <Text>Départ: {item.startLocation}</Text>
        <Text>Arrivée: {item.endLocation}</Text>
        <Text>Type: {item.type}</Text>
        <Text>
          Début de la course:{' '}
          {item.startTime
            ? new Date(item.startTime).toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'Non démarrée'}
        </Text>
        <Text>
          Fin de la course:{' '}
          {item.endTime
            ? new Date(item.endTime).toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'Non terminée'}
        </Text>
        <Text>Distance parcourue: {item.distance ? `${item.distance} km` : 'Non renseignée'}</Text>
        <View style={styles.buttonContainer}>
          {!item.startTime && <Button title="Démarrer la course" onPress={() => onStart(index)} />}
          {item.startTime && !item.endTime && <Button title="Finir la course" onPress={() => onFinish(index)} />}
        </View>
      </View>
    )}
    keyExtractor={(item, index) => item._id ?? index.toString()}
  />
);



const App = () => {
  const [rides, setRides] = useState([]);

  // Charger les courses depuis le backend au lancement
  useEffect(() => {
    async function fetchRides() {
      try {
        const response = await axios.get(API_URL);
        setRides(response.data);
      } catch (error) {
        Alert.alert('Erreur', 'Impossible de charger les courses.');
        console.error('Erreur chargement courses', error);
      }
    }
    fetchRides();
  }, []);

  // Fonction pour créer une course sur le backend
  const addRide = async (newRide) => {
    try {
      const response = await axios.post(API_URL, newRide);
      setRides([...rides, response.data]);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de créer la course.');
      console.error('Erreur création course backend', error);
    }
  };

  // Démarrer la course : set startTime + ouvrir Google Maps
  const startRide = async (index) => {
    const ride = rides[index];
    try {
      const response = await axios.patch(`${API_URL}/${ride._id}/start`);
      const updatedRides = [...rides];
      updatedRides[index] = response.data;
      setRides(updatedRides);

      const startLocation = encodeURIComponent(response.data.lieuDepart);
      const endLocation = encodeURIComponent(response.data.lieuArrivee);
      //const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${startLocation}&destination=${endLocation}`;
      //Linking.openURL(googleMapsUrl).catch(() => Alert.alert('Erreur', 'Impossible d’ouvrir Google Maps'));
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de démarrer la course.');
      console.error(error);
    }
  };


  // Finir la course : set endTime + distance fictive (à remplacer par API réelle)
  const finishRide = async (index) => {
    const ride = rides[index];
    try {
      const response = await axios.patch(`${API_URL}/${ride._id}/finish`, { distance: 10 });
      const updatedRides = [...rides];
      updatedRides[index] = response.data;
      setRides(updatedRides);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de terminer la course.');
      console.error(error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Application Chauffeur VSL</Text>
      <RideForm onCreate={addRide} />
      <Text style={styles.subtitle}>Historique des trajets</Text>
      <RideHistory rides={rides} onStart={startRide} onFinish={finishRide} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'flex-start', padding: 20, backgroundColor: '#f5f5f5' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  subtitle: { fontSize: 18, fontWeight: '600', marginTop: 20, marginBottom: 10 },
  form: { marginBottom: 20 },
  input: { height: 40, borderColor: '#ccc', borderWidth: 1, marginBottom: 10, paddingLeft: 10, borderRadius: 5 },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  ride: { backgroundColor: '#fff', padding: 10, marginBottom: 10, borderRadius: 5, borderWidth: 1, borderColor: '#ddd' },
});

export default App;
