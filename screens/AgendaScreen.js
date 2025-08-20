import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { Calendar } from 'react-native-calendars';
import axios from 'axios';
import moment from 'moment';
import 'moment/locale/fr';
import AsyncStorage from '@react-native-async-storage/async-storage';

moment.locale('fr');

const API_URL = 'https://vsl-taxi.onrender.com/api/rides'; // <-- adapte ton URL backend

export default function AgendaScreen() {
  const [selectedDate, setSelectedDate] = useState(moment().format('YYYY-MM-DD'));
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(false);

  // Charger les courses du jour
  const fetchRides = async (date) => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token'); // récupère le JWT stocké
      if (!token) {
        Alert.alert('Erreur', 'Token non trouvé, veuillez vous reconnecter.');
        return;
      }
      const res = await axios.get(`${API_URL}?date=${date}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRides(res.data || []);
    } catch (err) {
      console.error(err);
      Alert.alert('Erreur', 'Impossible de charger les courses.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRides(selectedDate);
  }, [selectedDate]);

  return (
    <View style={styles.container}>
      <Calendar
        onDayPress={(day) => setSelectedDate(day.dateString)}
        markedDates={{
          [selectedDate]: { selected: true, marked: true, selectedColor: '#4CAF50' }
        }}
        theme={{
          todayTextColor: '#FF9800',
          arrowColor: '#4CAF50',
          monthTextColor: '#000',
          textMonthFontWeight: 'bold'
        }}
      />

      <Text style={styles.title}>
        Courses du {moment(selectedDate).format('DD MMMM YYYY')}
      </Text>

      {loading ? (
        <ActivityIndicator size="large" color="#4CAF50" style={{ marginTop: 20 }} />
      ) : (
        <ScrollView style={styles.ridesList}>
          {rides.length === 0 ? (
            <Text style={styles.emptyText}>Aucune course prévue.</Text>
          ) : (
            rides.map((ride) => (
              <View key={ride._id} style={styles.rideCard}>
                <Text style={styles.rideText}>Client : {ride.clientName}</Text>
                <Text style={styles.rideText}>Départ : {ride.startLocation}</Text>
                <Text style={styles.rideText}>Heure : {moment(ride.startTime).format('HH:mm')}</Text>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: '#FFF' },
  title: { fontSize: 18, fontWeight: 'bold', marginVertical: 10 },
  ridesList: { marginTop: 10 },
  rideCard: { backgroundColor: '#F5F5F5', padding: 10, marginBottom: 10, borderRadius: 8 },
  rideText: { fontSize: 16 },
  emptyText: { fontSize: 16, color: '#888', textAlign: 'center', marginTop: 20 }
});
