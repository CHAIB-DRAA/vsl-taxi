import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, ActivityIndicator, StyleSheet,
  Alert, TouchableOpacity, Modal, FlatList
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import axios from 'axios';
import moment from 'moment';
import 'moment/locale/fr';
import AsyncStorage from '@react-native-async-storage/async-storage';

moment.locale('fr');

const API_URL = 'https://vsl-taxi.onrender.com/api/rides';
const CONTACTS_API = 'https://vsl-taxi.onrender.com/api/contacts';

export default function AgendaScreen() {
  const [selectedDate, setSelectedDate] = useState(moment().format('YYYY-MM-DD'));
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [selectedRide, setSelectedRide] = useState(null);
  const [showCalendar, setShowCalendar] = useState(true);

  // --- Charger courses ---
  const fetchRides = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) return Alert.alert('Erreur', 'Token non trouvé, reconnectez-vous.');

      const res = await axios.get(`${API_URL}?date=${selectedDate}`, {
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

  // --- Charger contacts ---
  const fetchContacts = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await axios.get(CONTACTS_API, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setContacts(res.data || []);
    } catch (err) {
      console.error(err);
      Alert.alert('Erreur', 'Impossible de récupérer les contacts.');
    }
  };

  useEffect(() => {
    fetchRides();
    fetchContacts();
  }, [selectedDate]);

  // --- Partager course ---
  const handleShareRide = async (rideId, contactId) => {
    try {
      const token = await AsyncStorage.getItem('token');
      await axios.post(`${API_URL}/share`, { rideId, toUserId: contactId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      Alert.alert('Succès', 'Course partagée !');
      setShareModalVisible(false);
      fetchRides(); // rafraîchir les courses
    } catch (err) {
      console.error(err);
      Alert.alert('Erreur', 'Impossible de partager la course.');
    }
  };

  // --- Couleur selon type de course ---
  const getRideColor = (ride) => {
    if (ride.isShared && ride.sharedBy !== ride.chauffeurId) return '#FF9800'; // Partagée vers moi
    if (ride.isShared && ride.sharedBy === ride.chauffeurId) return '#2196F3'; // Je l’ai partagée
    if (ride.type === 'Aller') return '#4CAF50';
    if (ride.type === 'Retour') return '#607D8B';
    return '#888';
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.toggleCalendarBtn} onPress={() => setShowCalendar(!showCalendar)}>
        <Text style={styles.toggleCalendarText}>
          {showCalendar ? 'Masquer le calendrier' : 'Afficher le calendrier'}
        </Text>
      </TouchableOpacity>

      {showCalendar && (
        <Calendar
          onDayPress={(day) => setSelectedDate(day.dateString)}
          markedDates={{ [selectedDate]: { selected: true, marked: true, selectedColor: '#4CAF50' } }}
          theme={{ todayTextColor: '#FF9800', arrowColor: '#4CAF50', monthTextColor: '#000', textMonthFontWeight: 'bold' }}
        />
      )}

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
              <View key={ride._id} style={[styles.rideCard, { borderLeftColor: getRideColor(ride) }]}>
                <Text style={styles.rideText}>Client : {ride.patientName || ride.clientName}</Text>
                <Text style={styles.rideText}>Départ : {ride.startLocation}</Text>
                <Text style={styles.rideText}>Heure : {moment(ride.date).format('HH:mm')}</Text>

                {ride.isShared && ride.sharedBy !== ride.chauffeurId ? (
                  <Text style={[styles.sharedText, { color: '#FF9800' }]}>
                    Partagée par : {ride.sharedByName} ({ride.statusPartage})
                  </Text>
                ) : ride.isShared && ride.sharedBy === ride.chauffeurId ? (
                  <Text style={[styles.sharedText, { color: '#2196F3' }]}>
                    Partagée à : {ride.sharedToName}
                  </Text>
                ) : (
                  <Text style={[styles.statusText, { color: getRideColor(ride) }]}>{ride.type}</Text>
                )}

                <TouchableOpacity
                  style={styles.shareButton}
                  onPress={() => {
                    setSelectedRide(ride);
                    setShareModalVisible(true);
                  }}
                >
                  <Text style={styles.shareButtonText}>Partager</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* --- Modal partage --- */}
      <Modal visible={shareModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Partager la course avec :</Text>

            <FlatList
              data={contacts}
              keyExtractor={(item) => item._id}
              style={{ marginVertical: 10 }}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.contactButton}
                  onPress={() => handleShareRide(selectedRide._id, item._id)}
                >
                  <Text style={styles.contactText}>{item.fullName || item.email}</Text>
                </TouchableOpacity>
              )}
            />

            <TouchableOpacity style={styles.modalClose} onPress={() => setShareModalVisible(false)}>
              <Text style={styles.modalCloseText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: '#FFF' },
  toggleCalendarBtn: { marginBottom: 10, alignSelf: 'center' },
  toggleCalendarText: { color: '#4CAF50', fontWeight: 'bold' },
  title: { fontSize: 20, fontWeight: 'bold', marginVertical: 10, textAlign: 'center' },
  ridesList: { marginTop: 10 },
  rideCard: {
    backgroundColor: '#FFF', padding: 15, marginBottom: 12, borderRadius: 12,
    borderLeftWidth: 6, shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5, elevation: 3,
  },
  rideText: { fontSize: 16, marginBottom: 4 },
  statusText: { fontSize: 14, fontWeight: 'bold', marginTop: 4 },
  sharedText: { fontSize: 14, fontWeight: 'bold', marginTop: 4 },
  emptyText: { fontSize: 16, color: '#888', textAlign: 'center', marginTop: 20 },
  shareButton: { marginTop: 10, backgroundColor: '#FF9800', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  shareButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },

  // Modal style
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: '#FFF', borderRadius: 12, padding: 20, maxHeight: '70%', shadowColor: '#000', shadowOpacity: 0.15, shadowOffset: { width: 0, height: 3 }, shadowRadius: 6, elevation: 5 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  contactButton: { backgroundColor: '#4CAF50', paddingVertical: 12, paddingHorizontal: 15, borderRadius: 8 },
  contactText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  modalClose: { marginTop: 15, backgroundColor: '#FF5252', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  modalCloseText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
});
