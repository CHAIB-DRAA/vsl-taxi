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

  // --- Fetch courses ---
  const fetchRides = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) return Alert.alert('Erreur', 'Token non trouvé, reconnectez-vous.');

      const res = await axios.get(`${API_URL}?date=${selectedDate}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const ridesData = res.data || [];
      const visibleRides = ridesData.filter(r => !r.statusPartage || r.statusPartage !== 'declined');

      console.log('📊 Courses récupérées:', visibleRides);

      setRides(visibleRides);
      markRidesOnCalendar(visibleRides);
    } catch (err) {
      console.error(err);
      Alert.alert('Erreur', 'Impossible de charger les courses.');
    } finally {
      setLoading(false);
    }
  };

  // --- Fetch contacts ---
  const fetchContacts = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await axios.get(CONTACTS_API, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setContacts(res.data || []);
      console.log('📤 Contacts récupérés:', res.data);
    } catch (err) {
      console.error(err);
      Alert.alert('Erreur', 'Impossible de récupérer les contacts.');
    }
  };

  useEffect(() => {
    fetchRides();
    fetchContacts();
  }, [selectedDate]);

  // --- Partager une course ---
  const handleShareRide = async (rideId, contact) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await axios.post(`${API_URL}/share`, { rideId, toUserId: contact.userId }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('📤 Résultat partage:', res.data);

      if (res.data.share) {
        Alert.alert('Succès', 'Course partagée !');
        setShareModalVisible(false);
        fetchRides();
      } else {
        Alert.alert('Erreur', res.data.message);
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Erreur', 'Impossible de partager la course.');
    }
  };

  // --- Accepter / Refuser un partage ---
  const respondToShare = async (shareId, action) => {
    try {
      const token = await AsyncStorage.getItem('token');
      await axios.post(SHARE_API, { shareId, action }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setRides(prev => prev.map(r => {
        if (r.shareId === shareId) {
          if (action === 'declined') return null;
          return { ...r, statusPartage: action };
        }
        return r;
      }).filter(Boolean));

      console.log(`🔄 Partage ${action}:`, shareId);
    } catch (err) {
      console.error(err);
      Alert.alert('Erreur', 'Impossible de répondre au partage.');
    }
  };

  // --- Marquer les jours avec dots ---
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

      <Text style={styles.title}>
        Courses du {moment(selectedDate).format('DD MMMM YYYY')}
      </Text>

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

              {/* Accept / Refuse */}
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

              {/* Bouton partager */}
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
                  onPress={() => handleShareRide(selectedRide._id, item)}
                >
                  <Text style={styles.contactText}>{item.fullName || item.email}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={{ textAlign: 'center', marginTop: 10, color: '#888' }}>
                  Aucun contact disponible
                </Text>
              }
            />

            <TouchableOpacity
              style={[styles.shareButton, { backgroundColor: '#888', marginTop: 10 }]}
              onPress={() => setShareModalVisible(false)}
            >
              <Text style={styles.shareButtonText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10, backgroundColor: '#F5F5F5' },
  toggleButton: { padding: 10, backgroundColor: '#4CAF50', borderRadius: 8, marginBottom: 10 },
  toggleButtonText: { color: '#fff', textAlign: 'center', fontWeight: 'bold' },
  title: { fontSize: 18, fontWeight: 'bold', marginVertical: 10 },
  ridesList: { flex: 1 },
  rideCard: { padding: 10, borderLeftWidth: 5, borderRadius: 6, backgroundColor: '#fff', marginBottom: 10 },
  rideText: { fontSize: 14, marginBottom: 2 },
  sharedText: { fontSize: 12, fontWeight: 'bold', marginTop: 2 },
  shareButton: { padding: 8, backgroundColor: '#2196F3', borderRadius: 6, marginTop: 5 },
  shareButtonText: { color: '#fff', textAlign: 'center', fontWeight: 'bold' },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#00000099' },
  modalContent: { width: '90%', backgroundColor: '#fff', padding: 15, borderRadius: 8 },
  modalTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  contactButton: { padding: 10, backgroundColor: '#E0E0E0', borderRadius: 6 },
  contactText: { fontSize: 14 }
});
