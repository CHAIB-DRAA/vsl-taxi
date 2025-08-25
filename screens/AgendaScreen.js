import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, ScrollView, ActivityIndicator, StyleSheet,
  Alert, TouchableOpacity, Modal, FlatList, TextInput, Animated
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
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

  const [shareModalVisible, setShareModalVisible] = useState(false); // Modal bouton partager
  const [rideOptionsModalVisible, setRideOptionsModalVisible] = useState(false);
  const [selectedRide, setSelectedRide] = useState(null);

  const [incomingShareModalVisible, setIncomingShareModalVisible] = useState(false); // Modal forcé
  const [incomingShareRide, setIncomingShareRide] = useState(null);

  const [editMode, setEditMode] = useState(false);
  const [markedDates, setMarkedDates] = useState({});
  const [showCalendar, setShowCalendar] = useState(true);

  const [editPatientName, setEditPatientName] = useState('');
  const [editStartLocation, setEditStartLocation] = useState('');
  const [editDateTime, setEditDateTime] = useState('');

  // --- Fetch rides ---
  const fetchRides = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) return Alert.alert('Erreur', 'Token non trouvé, reconnectez-vous.');

      const res = await axios.get(`${API_URL}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const ridesData = res.data || [];

      const dateRides = ridesData.filter(r =>
        new Date(r.date).toDateString() === new Date(selectedDate).toDateString()
      );

      const visibleRides = dateRides.filter(r => {
        if (!r.isShared) return true;
        if (r.isShared && (r.statusPartage === 'accepted' || r.statusPartage === 'pending')) return true;
        return false;
      });

      setRides(visibleRides);
      markRidesOnCalendar(ridesData);

      // --- Vérifier partages reçus pour le modal forcé ---
      const pendingRide = ridesData.find(
        r => r.isShared && r.sharedBy && !r.sharedToName && r.statusPartage === 'pending' && !r.endTime
      );
      if (pendingRide) {
        setIncomingShareRide(pendingRide);
        setIncomingShareModalVisible(true);
      } else {
        setIncomingShareModalVisible(false);
      }

    } catch (err) {
      console.error('Erreur fetchRides:', err);
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
    } catch (err) {
      console.error('Erreur fetchContacts:', err);
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
      const toUserId = contact.contactId?._id;
      if (!toUserId) return Alert.alert('Erreur', 'ID du chauffeur manquant.');

      const token = await AsyncStorage.getItem('token');
      const res = await axios.post(`${API_URL}/share`, { rideId, toUserId }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.rideShare) {
        Alert.alert('Succès', `Course partagée avec ${contact.fullName || contact.email} !`);
        setShareModalVisible(false);
        fetchRides();
      } else {
        Alert.alert('Erreur', res.data.message);
      }
    } catch (err) {
      console.error('Erreur handleShareRide:', err.response?.data || err.message);
      Alert.alert('Erreur', 'Impossible de partager la course.');
    }
  };

  // --- Accepter / Refuser un partage ---
  const respondToShare = async (rideShareId, accept) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await axios.post(SHARE_API,
        { rideShareId, accept },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setRides(prev =>
        prev.map(r => {
          if (r.shareId === rideShareId) {
            if (!accept) return { ...r, statusPartage: 'refused', isShared: false };
            return { ...r, statusPartage: 'accepted', isShared: true, chauffeurId: res.data.ride.chauffeurId };
          }
          return r;
        }).filter(r => r.statusPartage !== 'refused')
      );
      setIncomingShareModalVisible(false);
    } catch (err) {
      console.error('Erreur respondToShare:', err.response?.data || err.message);
      Alert.alert('Erreur', 'Impossible de répondre au partage.');
    }
  };

  // --- Marquer uniquement les jours avec courses ---
  const markRidesOnCalendar = (ridesList) => {
    const marks = {};
    const visibleRides = ridesList.filter(ride =>
      !ride.isShared || ride.statusPartage === 'accepted'
    );
    visibleRides.forEach(ride => {
      const day = moment(ride.date).format('YYYY-MM-DD');
      if (!marks[day]) marks[day] = { dots: [] };
      let dot = !ride.isShared
        ? { key: `${ride._id}-own`, color: '#4CAF50' }
        : { key: `${ride._id}-toMe`, color: '#FF9800' };
      if (!marks[day].dots.some(d => d.key === dot.key)) marks[day].dots.push(dot);
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

  const AnimatedBadge = ({ visible }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
      Animated.timing(fadeAnim, {
        toValue: visible ? 1 : 0,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, [visible]);
    if (!visible) return null;
    return (
      <Animated.View style={[styles.finishedBadge, { opacity: fadeAnim }]}>
        <Text style={styles.finishedBadgeText}>Terminée</Text>
      </Animated.View>
    );
  };

  const handleDeleteRide = async (ride) => {
    Alert.alert(
      'Supprimer',
      `Voulez-vous supprimer la course "${ride.patientName}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer', style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              await axios.delete(`${API_URL}/${ride._id}`, { headers: { Authorization: `Bearer ${token}` } });
              Alert.alert('Supprimé', 'Course supprimée.');
              fetchRides();
              setRideOptionsModalVisible(false);
            } catch (err) {
              console.error(err);
              Alert.alert('Erreur', 'Impossible de supprimer la course.');
            }
          }
        }
      ]
    );
  };

  const handleEditRide = async () => {
    if (!editPatientName || !editStartLocation || !editDateTime) {
      return Alert.alert('Erreur', 'Veuillez remplir tous les champs.');
    }
    try {
      const token = await AsyncStorage.getItem('token');
      await axios.put(`${API_URL}/${selectedRide._id}`, {
        patientName: editPatientName,
        startLocation: editStartLocation,
        date: editDateTime
      }, { headers: { Authorization: `Bearer ${token}` } });

      Alert.alert('Succès', 'Course modifiée avec succès.');
      fetchRides();
      setEditMode(false);
      setRideOptionsModalVisible(false);
    } catch (err) {
      console.error(err);
      Alert.alert('Erreur', 'Impossible de modifier la course.');
    }
  };

  const openOptionsModal = (ride) => {
    setSelectedRide(ride);
    setEditPatientName(ride.patientName);
    setEditStartLocation(ride.startLocation);
    setEditDateTime(moment(ride.date).format('YYYY-MM-DDTHH:mm'));
    setEditMode(false);
    setRideOptionsModalVisible(true);
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
          {rides.map((ride) => {
            const isFinished = !!ride.endTime;
            return (
              <View key={ride._id} style={[
                styles.rideCard,
                { borderLeftColor: getRideColor(ride) },
                isFinished && styles.finishedRideCard
              ]}>
                {isFinished && <AnimatedBadge visible={isFinished} />}

                <Text style={[styles.rideText, isFinished && styles.finishedText]}>Client : {ride.patientName || ride.clientName}</Text>
                <Text style={[styles.rideText, isFinished && styles.finishedText]}>Départ : {ride.startLocation}</Text>
                <Text style={[styles.rideText, isFinished && styles.finishedText]}>Heure : {moment(ride.date).format('HH:mm')}</Text>
                <Text style={[styles.sharedText, { color: getRideColor(ride) }, isFinished && styles.finishedText]}>
                  {getSharedText(ride)}
                </Text>
                {!isFinished &&
                <TouchableOpacity style={styles.editIcon} onPress={() => openOptionsModal(ride)}>
                  <Icon name="edit" size={24} color="#FF9800" />
                </TouchableOpacity>}

                {ride.isShared && ride.sharedBy && !ride.sharedToName && ride.statusPartage === 'pending' && !isFinished && (
                  <View style={{ flexDirection: 'row', marginTop: 5 }}>
                    <TouchableOpacity style={[styles.shareButton, { backgroundColor: '#4CAF50', flex: 1, marginRight: 5 }]} onPress={() => respondToShare(ride.shareId, true)}>
                      <Text style={styles.shareButtonText}>Accepter</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.shareButton, { backgroundColor: '#FF5252', flex: 1, marginLeft: 5 }]} onPress={() => respondToShare(ride.shareId, false)}>
                      <Text style={styles.shareButtonText}>Refuser</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {!ride.sharedToName && !ride.isShared && !isFinished && (
                  <View style={{ flexDirection: 'row', marginTop: 5, justifyContent: 'space-between', alignItems: 'center' }}>
                    <TouchableOpacity style={[styles.shareButton, { flex: 1, marginRight: 5 }]} onPress={() => { setSelectedRide(ride); setShareModalVisible(true); }}>
                      <Text style={styles.shareButtonText}>Partager</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* --- Modal Partage normal --- */}
      <Modal visible={shareModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Partager la course avec :</Text>
            <FlatList
              data={contacts}
              keyExtractor={(item) => item.userId}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.contactButton}
                  onPress={() => handleShareRide(selectedRide._id, item)}
                >
                  <Text style={styles.contactText}>{item.fullName || item.email}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={[styles.shareButton, { backgroundColor: '#888', marginTop: 10 }]} onPress={() => setShareModalVisible(false)}>
              <Text style={styles.shareButtonText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* --- Modal forcé partage reçu --- */}
      <Modal
        visible={incomingShareModalVisible}
        transparent={true}
        animationType="fade"
        presentationStyle="overFullScreen"
        statusBarTranslucent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Course partagée</Text>
            {incomingShareRide && (
              <>
                <Text style={{ marginBottom: 10 }}>
                  {incomingShareRide.sharedByName} vous propose une course :
                </Text>
                <Text>Client : {incomingShareRide.patientName || incomingShareRide.clientName}</Text>
                <Text>Départ : {incomingShareRide.startLocation}</Text>
                <Text>Heure : {moment(incomingShareRide.date).format('HH:mm')}</Text>
              </>
            )}

            <View style={{ flexDirection: 'row', marginTop: 20 }}>
              <TouchableOpacity
                style={[styles.shareButton, { backgroundColor: '#FF5252', flex: 1, marginRight: 5 }]}
                onPress={() => respondToShare(incomingShareRide.shareId, false)}
              >
                <Text style={styles.shareButtonText}>Refuser</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.shareButton, { backgroundColor: '#4CAF50', flex: 1, marginLeft: 5 }]}
                onPress={() => respondToShare(incomingShareRide.shareId, true)}
              >
                <Text style={styles.shareButtonText}>Accepter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* --- Modal Options Modifier / Supprimer --- */}
      <Modal visible={rideOptionsModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {editMode ? (
              <>
                <Text style={styles.modalTitle}>Modifier la course</Text>
                <TextInput style={styles.input} placeholder="Nom du client" value={editPatientName} onChangeText={setEditPatientName} />
                <TextInput style={styles.input} placeholder="Lieu de départ" value={editStartLocation} onChangeText={setEditStartLocation} />
                <TextInput style={styles.input} placeholder="Date & Heure (YYYY-MM-DDTHH:mm)" value={editDateTime} onChangeText={setEditDateTime} />
                <TouchableOpacity style={[styles.shareButton, { backgroundColor: '#FF9800' }]} onPress={handleEditRide}>
                  <Text style={styles.shareButtonText}>Enregistrer</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.shareButton, { backgroundColor: '#888' }]} onPress={() => setEditMode(false)}>
                  <Text style={styles.shareButtonText}>Annuler</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.modalTitle}>Options pour la course</Text>
                <TouchableOpacity style={[styles.shareButton, { backgroundColor: '#FF9800' }]} onPress={() => setEditMode(true)}>
                  <Text style={styles.shareButtonText}>Modifier</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.shareButton, { backgroundColor: '#FF5252' }]} onPress={() => handleDeleteRide(selectedRide)}>
                  <Text style={styles.shareButtonText}>Supprimer</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.shareButton, { backgroundColor: '#888' }]} onPress={() => setRideOptionsModalVisible(false)}>
                  <Text style={styles.shareButtonText}>Annuler</Text>
                </TouchableOpacity>
              </>
            )}
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
  contactText: { fontSize: 14 },
  emptyText: { textAlign: 'center', marginTop: 20, color: '#888' },
  finishedRideCard: { backgroundColor: '#F0F0F0', borderWidth: 1, borderColor: '#FF9800', borderRadius: 8, opacity: 0.85, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5 },
  finishedText: { color: '#888' },
  finishedBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: '#FF9800', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 5, zIndex: 10 },
  finishedBadgeText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 8, marginBottom: 10 },
  editIcon: { position: 'absolute', top: 8, right: 8, zIndex: 10, padding: 4 }
});
