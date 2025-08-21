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
const SHARE_API = 'https://vsl-taxi.onrender.com/api/rides/respond';

export default function AgendaScreen() {
  const [selectedDate, setSelectedDate] = useState(moment().format('YYYY-MM-DD'));
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [selectedRide, setSelectedRide] = useState(null);
  const [markedDates, setMarkedDates] = useState({});
  const [showCalendar, setShowCalendar] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);

  // --- Config pour axios ---
  const getConfig = async () => {
    const token = await AsyncStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  // --- Fetch user ID ---
  const fetchCurrentUser = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;
      const decoded = JSON.parse(atob(token.split('.')[1])); // si JWT classique
      setCurrentUserId(decoded.id);
    } catch (err) {
      console.error('fetchCurrentUser error:', err);
    }
  };

  // --- Fetch courses ---
  const fetchRides = async () => {
    try {
      setLoading(true);
      const config = await getConfig();
      const res = await axios.get(`${API_URL}?date=${selectedDate}`, config);
      const ridesData = res.data || [];

      // Filtrer les partages refusés
      const visibleRides = ridesData.filter(r => !r.statusPartage || r.statusPartage !== 'declined');
      console.log('📦 Courses visibles:', visibleRides);
      setRides(visibleRides);
      markRidesOnCalendar(visibleRides);
    } catch (err) {
      console.error('Erreur fetchRides:', err.response?.data || err.message);
      Alert.alert('Erreur', 'Impossible de charger les courses.');
    } finally {
      setLoading(false);
    }
  };

  // --- Fetch contacts ---
  const fetchContacts = async () => {
    try {
      const config = await getConfig();
      const res = await axios.get(CONTACTS_API, config);
      // Filtrer pour ne jamais inclure soi-même
      const filtered = res.data.filter(c => c.userId !== currentUserId);
      console.log('📤 Contacts chargés:', filtered);
      setContacts(filtered);
    } catch (err) {
      console.error('Erreur fetchContacts:', err.response?.data || err.message);
      Alert.alert('Erreur', 'Impossible de récupérer les contacts.');
    }
  };

  useEffect(() => {
    fetchCurrentUser().then(() => {
      fetchRides();
      fetchContacts();
    });
  }, [selectedDate]);

  // --- Partager une course ---
  const handleShareRide = async (rideId, toUserId) => {
    try {
      if (toUserId === currentUserId) return Alert.alert('Erreur', 'Vous ne pouvez pas partager la course à vous-même.');

      const config = await getConfig();
      const res = await axios.post(`${API_URL}/share`, { rideId, toUserId }, config);

      console.log('✅ Partage réponse API:', res.data);

      if (res.data.share) {
        Alert.alert('Succès', 'Course partagée !');
        setShareModalVisible(false);
        fetchRides(); // recharge les courses
      } else {
        Alert.alert('Erreur', res.data.message);
      }
    } catch (err) {
      console.error('Erreur handleShareRide:', err.response?.data || err.message);
      Alert.alert('Erreur', 'Impossible de partager la course.');
    }
  };

  // --- Accepter / Refuser un partage ---
  const respondToShare = async (shareId, action) => {
    try {
      const config = await getConfig();
      await axios.post(SHARE_API, { shareId, action }, config);

      setRides(prev => prev.map(r => {
        if (r.shareId === shareId) {
          if (action === 'declined') return null;
          return { ...r, statusPartage: action };
        }
        return r;
      }).filter(Boolean));

      fetchRides();
    } catch (err) {
      console.error('Erreur respondToShare:', err.response?.data || err.message);
      Alert.alert('Erreur', 'Impossible de répondre au partage.');
    }
  };

  // --- Marquer le calendrier ---
  const markRidesOnCalendar = (ridesList) => {
    const marks = {};
    ridesList.forEach(ride => {
      const day = moment(ride.date).format('YYYY-MM-DD');
      if (!marks[day]) marks[day] = { dots: [] };
      if (!ride.isShared) marks[day].dots.push({ key: `${ride._id}-own`, color: '#4CAF50' });
      else if (ride.isShared && ride.sharedBy && !ride.sharedToName)
        marks[day].dots.push({ key: `${ride._id}-toMe`, color: '#FF9800' });
      else if (ride.isShared && ride.sharedToName)
        marks[day].dots.push({ key: `${ride._id}-byMe`, color: '#2196F3' });
    });

    if (!marks[selectedDate]) marks[selectedDate] = { dots: [] };
    marks[selectedDate].selected = true;
    marks[selectedDate].selectedColor = '#4CAF50';
    setMarkedDates(marks);
  };

  const getRideColor = (ride) => {
    if (ride.isShared && ride.sharedBy && !ride.sharedToName) return '#FF9800';
    if (ride.isShared && ride.sharedToName) return '#2196F3';
    if (ride.type === 'Aller') return '#4CAF50';
    if (ride.type === 'Retour') return '#607D8B';
    return '#888';
  };

  const getSharedText = (ride) => {
    if (ride.isShared && ride.sharedBy && !ride.sharedToName)
      return `Partagée par : ${ride.sharedByName} (${ride.statusPartage})`;
    if (ride.isShared && ride.sharedToName)
      return `Partagée à : ${ride.sharedToName} (${ride.statusPartage})`;
    return ride.type;
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.toggleButton}
        onPress={() => setShowCalendar(prev => !prev)}
      >
        <Text style={styles.toggleButtonText}>{showCalendar ? 'Masquer le calendrier' : 'Afficher le calendrier'}</Text>
      </TouchableOpacity>

      {showCalendar && (
        <Calendar
          onDayPress={(day) => setSelectedDate(day.dateString)}
          markedDates={markedDates}
          markingType={'multi-dot'}
          theme={{
            todayTextColor: '#FF9800',
            arrowColor: '#4CAF50',
            monthTextColor: '#000',
            textMonthFontWeight: 'bold'
          }}
        />
      )}

      <Text style={styles.title}>Courses du {moment(selectedDate).format('DD MMMM YYYY')}</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#4CAF50" style={{ marginTop: 20 }} />
      ) : (
        <ScrollView style={styles.ridesList}>
          {rides.length === 0 ? (
            <Text style={styles.emptyText}>Aucune course prévue.</Text>
          ) : rides.map((ride) => (
            <View
              key={ride._id + (ride.isShared ? (ride.sharedToName ? '-byMe' : '-toMe') : '-own')}
              style={[styles.rideCard, { borderLeftColor: getRideColor(ride) }]}
            >
              <Text style={styles.rideText}>Client : {ride.patientName || ride.clientName}</Text>
              <Text style={styles.rideText}>Départ : {ride.startLocation}</Text>
              <Text style={styles.rideText}>Heure : {moment(ride.date).format('HH:mm')}</Text>

              <Text style={[styles.sharedText, { color: getRideColor(ride) }]}>
                {getSharedText(ride)}
              </Text>

              {ride.isShared && ride.sharedBy && !ride.sharedToName && ride.statusPartage === 'pending' && (
                <View style={{ flexDirection: 'row', marginTop: 5 }}>
                  <TouchableOpacity
                    style={[styles.shareButton, { backgroundColor: '#4CAF50', flex: 1, marginRight: 5 }]}
                    onPress={() => respondToShare(ride.shareId, 'accepted')}
                  >
                    <Text style={styles.shareButtonText}>Accepter</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.shareButton, { backgroundColor: '#FF5252', flex: 1, marginLeft: 5 }]}
                    onPress={() => respondToShare(ride.shareId, 'declined')}
                  >
                    <Text style={styles.shareButtonText}>Refuser</Text>
                  </TouchableOpacity>
                </View>
              )}

              {!ride.sharedToName && !ride.isShared && (
                <TouchableOpacity
                  style={styles.shareButton}
                  onPress={() => {
                    setSelectedRide(ride);
                    setShareModalVisible(true);
                  }}
                >
                  <Text style={styles.shareButtonText}>Partager</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      {/* Modal partage */}
      <Modal visible={shareModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Partager la course avec :</Text>

            <FlatList
              data={contacts}
              keyExtractor={(item) => item.userId}
              style={{ marginVertical: 10 }}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.contactButton}
                  onPress={() => handleShareRide(selectedRide._id, item.userId)}
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

// --- Styles ---
const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: '#FFF' },
  toggleButton: { backgroundColor: '#607D8B', padding: 10, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
  toggleButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  title: { fontSize: 20, fontWeight: 'bold', marginVertical: 10, textAlign: 'center' },
  ridesList: { marginTop: 10 },
  rideCard: {
    backgroundColor: '#FFF', padding: 15, marginBottom: 12, borderRadius: 12,
    borderLeftWidth: 6, shadowColor: '#000', shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 }, shadowRadius: 5, elevation: 3,
  },
  rideText: { fontSize: 16, marginBottom: 4 },
  sharedText: { fontSize: 14, fontWeight: 'bold', marginTop: 4 },
  emptyText: { fontSize: 16, color: '#888', textAlign: 'center', marginTop: 20 },
  shareButton: { marginTop: 10, backgroundColor: '#FF9800', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  shareButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: '#FFF', borderRadius: 12, padding: 20, maxHeight: '70%', shadowColor: '#000', shadowOpacity: 0.15, shadowOffset: { width: 0, height: 3 }, shadowRadius: 6, elevation: 5 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  contactButton: { backgroundColor: '#4CAF50', paddingVertical: 12, paddingHorizontal: 15, borderRadius: 8 },
  contactText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  modalClose: { marginTop: 15, backgroundColor: '#FF5252', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  modalCloseText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
});
