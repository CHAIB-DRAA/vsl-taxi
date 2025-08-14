import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, TextInput, TouchableOpacity, Alert, FlatList } from 'react-native';
import { getRides, startRideById, finishRideById } from '../services/api';
import DateTimePicker from '@react-native-community/datetimepicker';

const HistoryScreen = () => {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(false);

  const [searchPatient, setSearchPatient] = useState('');
  const [selectedDate, setSelectedDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const fetchRides = async () => {
    setLoading(true);
    try {
      const data = await getRides();
      // Trier par date croissante
      data.sort((a, b) => new Date(a.date) - new Date(b.date));
      setRides(data);
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de charger les courses.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRides();
  }, []);

  const startRide = async (rideId) => {
    try {
      const data = await startRideById(rideId);
      setRides(prev => prev.map(r => (r._id === rideId ? data : r)));
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de démarrer la course.');
      console.error(err);
    }
  };

  const finishRide = async (rideId) => {
    try {
      const data = await finishRideById(rideId, { distance: 10 });
      setRides(prev => prev.map(r => (r._id === rideId ? data : r)));
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de terminer la course.');
      console.error(err);
    }
  };

  const confirmFinishRide = (rideId) => {
    Alert.alert(
      'Confirmer',
      'Voulez-vous vraiment terminer cette course ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Terminer', onPress: () => finishRide(rideId) },
      ]
    );
  };

  const filteredRides = rides.filter(ride => {
    const matchesPatient = ride.patientName.toLowerCase().includes(searchPatient.toLowerCase());
    const matchesDate = selectedDate ? new Date(ride.date).toDateString() === selectedDate.toDateString() : true;
    return matchesPatient && matchesDate;
  });

  const renderRide = ({ item }) => {
    const formatDateTime = date => {
      if (!date) return 'Non renseignée';
      const d = new Date(date);
      return d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    return (
      <View style={{
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 5,
        elevation: 3,
      }}>
        <Text style={{ fontWeight: 'bold', fontSize: 16 }}>{item.patientName}</Text>
        <Text>Date & heure : {formatDateTime(item.date)}</Text>
        <Text>Départ : {item.startLocation}</Text>
        <Text>Arrivée : {item.endLocation}</Text>
        <Text>Type : {item.type}</Text>
        <Text>Début : {item.startTime ? formatDateTime(item.startTime) : 'Non démarrée'}</Text>
        <Text>Fin : {item.endTime ? formatDateTime(item.endTime) : 'Non terminée'}</Text>
        <Text>Distance : {item.distance ? `${item.distance} km` : 'Non renseignée'}</Text>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
          {!item.startTime && (
            <TouchableOpacity
              onPress={() => startRide(item._id)}
              style={{ backgroundColor: '#4CAF50', padding: 10, borderRadius: 8 }}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Démarrer</Text>
            </TouchableOpacity>
          )}
          {item.startTime && !item.endTime && (
            <TouchableOpacity
              onPress={() => confirmFinishRide(item._id)}
              style={{ backgroundColor: '#F44336', padding: 10, borderRadius: 8 }}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Finir</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, padding: 20, backgroundColor: '#f5f5f5' }}>
      <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 15 }}>Historique des courses</Text>

      <TextInput
        placeholder="Rechercher par patient"
        value={searchPatient}
        onChangeText={setSearchPatient}
        style={{
          borderWidth: 1,
          borderColor: '#ccc',
          padding: 10,
          borderRadius: 8,
          marginBottom: 10,
          backgroundColor: '#fff',
        }}
      />

      <TouchableOpacity
        onPress={() => setShowDatePicker(true)}
        style={{ backgroundColor: '#2196F3', padding: 10, borderRadius: 8, marginBottom: 10 }}
      >
        <Text style={{ color: '#fff', fontWeight: 'bold', textAlign: 'center' }}>
          {selectedDate ? `Date : ${selectedDate.toLocaleDateString()}` : 'Sélectionner une date'}
        </Text>
      </TouchableOpacity>

      {showDatePicker && (
        <DateTimePicker
          value={selectedDate || new Date()}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowDatePicker(false);
            if (date) setSelectedDate(date);
          }}
        />
      )}

      <TouchableOpacity
        onPress={fetchRides}
        style={{ backgroundColor: '#FF9800', padding: 10, borderRadius: 8, marginBottom: 15 }}
      >
        <Text style={{ color: '#fff', fontWeight: 'bold', textAlign: 'center' }}>Actualiser</Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={filteredRides}
          renderItem={renderRide}
          keyExtractor={item => item._id}
        />
      )}
    </View>
  );
};

export default HistoryScreen;
