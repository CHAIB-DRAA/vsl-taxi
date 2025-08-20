import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  Alert,
  LayoutAnimation,
  UIManager,
  Platform,
  TextInput,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import moment from 'moment';
import 'moment/locale/fr';
import axios from 'axios';
import { supabase } from '../lib/supabase';

moment.locale('fr');
if (Platform.OS === 'android') UIManager.setLayoutAnimationEnabledExperimental?.(true);

const API_URL = 'https://vsl-taxi.onrender.com/api/rides';

const typeColors = {
  Aller: '#FF5722',
  Retour: '#4CAF50',
  autre: '#2196F3',
};

const AgendaScreen = () => {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(moment().format('YYYY-MM-DD'));
  const [markedDates, setMarkedDates] = useState({});
  const [showCalendar, setShowCalendar] = useState(true);

  const [rideModalVisible, setRideModalVisible] = useState(false);
  const [selectedRide, setSelectedRide] = useState(null);
  const [formData, setFormData] = useState({ patientName: '', startLocation: '', endLocation: '', type: '', date: '' });

  const [contacts, setContacts] = useState([]);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [selectedShareRide, setSelectedShareRide] = useState(null);

  const scrollRef = useRef();

  // ---------------- Config Axios avec token Supabase ----------------
  const getConfig = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Token manquant');
    return { headers: { Authorization: `Bearer ${session.access_token}` } };
  }, []);

  // ---------------- Fetch contacts ----------------
  const fetchContacts = useCallback(async () => {
    const { data, error } = await supabase.from('profiles').select('id, full_name, email');
    if (error) console.error('Erreur fetch contacts:', error);
    else setContacts(data || []);
  }, []);

  // ---------------- Fetch rides ----------------
  const fetchAllRides = useCallback(async () => {
    setLoading(true);
    try {
      const config = await getConfig();
      const { data } = await axios.get(API_URL, config);
      setRides(data || []);
      updateMarkedDates(data || []);
    } catch (err) {
      console.error('Erreur fetch rides:', err.response?.data || err.message);
      Alert.alert('Erreur', "Impossible de charger l'agenda");
    } finally {
      setLoading(false);
    }
  }, [getConfig]);

  // ---------------- Marked dates ----------------
  const updateMarkedDates = useCallback((ridesList) => {
    const marks = {};
    ridesList.forEach(r => {
      const day = moment(r.date).format('YYYY-MM-DD');
      if (!marks[day]) marks[day] = { dots: [] };
      const color = typeColors[r.type] || typeColors.autre;
      if (!marks[day].dots.find(d => d.color === color)) marks[day].dots.push({ color });
    });
    marks[selectedDate] = marks[selectedDate] || {};
    marks[selectedDate].selected = true;
    setMarkedDates(marks);
  }, [selectedDate]);

  const groupedRides = rides.reduce((acc, ride) => {
    const day = moment(ride.date).format('YYYY-MM-DD');
    acc[day] = acc[day] || [];
    acc[day].push(ride);
    return acc;
  }, {});

  // ---------------- Toggle calendar ----------------
  const toggleCalendar = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowCalendar(prev => !prev);
  };

  // ---------------- Ride Modal ----------------
  const openRideModal = ride => {
    setSelectedRide(ride);
    setFormData({
      patientName: ride.patientName,
      startLocation: ride.startLocation,
      endLocation: ride.endLocation,
      type: ride.type,
      date: ride.date,
    });
    setRideModalVisible(true);
  };

  const handleSaveRide = async () => {
    try {
      const config = await getConfig();
      await axios.patch(`${API_URL}/${selectedRide._id}`, formData, config);
      Alert.alert('Succès', 'Course mise à jour');
      setRideModalVisible(false);
      fetchAllRides();
    } catch (err) {
      console.error(err);
      Alert.alert('Erreur', "Impossible de mettre à jour la course");
    }
  };

  const handleDeleteRide = async () => {
    Alert.alert('Confirmer', 'Voulez-vous vraiment supprimer cette course ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            const config = await getConfig();
            await axios.delete(`${API_URL}/${selectedRide._id}`, config);
            Alert.alert('Supprimé', 'Course supprimée');
            setRideModalVisible(false);
            fetchAllRides();
          } catch (err) {
            console.error(err);
            Alert.alert('Erreur', 'Impossible de supprimer la course');
          }
        },
      },
    ]);
  };

  // ---------------- Share Ride ----------------
  const shareRideWithContact = async (ride, contact) => {
    try {
      const config = await getConfig();
      await axios.post(`${API_URL}/shareRide`, { rideId: ride._id, toUserId: contact.id }, config);
      setShareModalVisible(false);
      setSelectedShareRide(null);
      fetchAllRides();
      Alert.alert('Partagé', `Course partagée avec ${contact.full_name || contact.email}`);
    } catch (err) {
      console.error('Erreur shareRide:', err.response?.data || err.message);
      Alert.alert('Erreur', 'Impossible de partager la course.');
    }
  };

  const respondSharedRide = async (rideShareId, action) => {
    try {
      const config = await getConfig();
      await axios.patch(`${API_URL}/respondSharedRide/${rideShareId}`, { action }, config);
      fetchAllRides();
    } catch (err) {
      console.error(err);
      Alert.alert('Erreur', "Impossible de répondre à la course partagée");
    }
  };

  useEffect(() => {
    fetchAllRides();
    fetchContacts();
  }, []);

  // ---------------- RideCard ----------------
  const RideCard = ({ ride }) => {
    const [loadingAction, setLoadingAction] = useState(false);
    const isFinished = !!ride.endTime;
    const isStarted = !!ride.startTime;

    const handleStartRide = async () => {
      setLoadingAction(true);
      try {
        const config = await getConfig();
        await axios.patch(`${API_URL}/${ride._id}/start`, {}, config);
        Alert.alert('Succès', 'Course démarrée');
        fetchAllRides();
      } catch (err) {
        console.error(err);
        Alert.alert('Erreur', "Impossible de démarrer la course");
      } finally {
        setLoadingAction(false);
      }
    };

    const handleFinishRide = async () => {
      Alert.prompt(
        'Terminer la course',
        'Entrez la distance parcourue (km)',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Terminer',
            onPress: async (distance) => {
              if (!distance || isNaN(distance)) {
                Alert.alert('Erreur', 'Distance invalide');
                return;
              }
              setLoadingAction(true);
              try {
                const config = await getConfig();
                await axios.patch(`${API_URL}/${ride._id}/end`, { distance: parseFloat(distance) }, config);
                Alert.alert('Succès', 'Course terminée');
                fetchAllRides();
              } catch (err) {
                console.error(err);
                Alert.alert('Erreur', "Impossible de terminer la course");
              } finally {
                setLoadingAction(false);
              }
            },
          },
        ],
        'plain-text',
        '',
        'numeric'
      );
    };

    return (
      <View style={{ marginBottom: 15 }}>
        <TouchableOpacity onPress={() => !ride.isShared && openRideModal(ride)} disabled={loadingAction || ride.isShared}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <View
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: typeColors[ride.type] || typeColors.autre,
                marginTop: 8,
                marginRight: 15,
              }}
            />
            <View
              style={{
                flex: 1,
                backgroundColor: isFinished ? '#e0e0e0' : '#fff',
                padding: 15,
                borderRadius: 12,
                shadowColor: '#000',
                shadowOpacity: 0.1,
                shadowOffset: { width: 0, height: 2 },
                shadowRadius: 5,
                elevation: 3,
              }}
            >
              {isFinished && (
                <View
                  style={{
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    backgroundColor: '#4CAF50',
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 4,
                    zIndex: 10,
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>Terminée</Text>
                </View>
              )}

              <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 5, color: isFinished ? '#777' : '#000' }}>
                {ride.patientName}
                {ride.isShared && (
                  <Text style={{ fontSize: 12, color: '#FF5722', fontWeight: 'bold' }}> (Partagée)</Text>
                )}
              </Text>

              <Text style={{ color: isFinished ? '#777' : '#555', marginBottom: 3 }}>Départ : {ride.startLocation}</Text>
              <Text style={{ color: isFinished ? '#777' : '#555', marginBottom: 3 }}>Arrivée : {ride.endLocation}</Text>
              <Text style={{ color: isFinished ? '#777' : '#555', marginBottom: 3 }}>Heure : {ride.date ? moment(ride.date).format('HH:mm') : ''}</Text>
              <Text style={{ color: isFinished ? '#777' : '#555', fontStyle: 'italic' }}>Type : {ride.type}</Text>

              {!ride.isShared && !isFinished && (
                <View style={{ flexDirection: 'row', marginTop: 10, justifyContent: 'space-between' }}>
                  {!isStarted && (
                    <TouchableOpacity
                      onPress={handleStartRide}
                      style={{ flex: 1, backgroundColor: '#2196F3', padding: 8, borderRadius: 6, marginRight: 5, alignItems: 'center' }}
                      disabled={loadingAction}
                    >
                      <Text style={{ color: '#fff', fontWeight: 'bold' }}>Démarrer</Text>
                    </TouchableOpacity>
                  )}
                  {isStarted && (
                    <TouchableOpacity
                      onPress={handleFinishRide}
                      style={{ flex: 1, backgroundColor: '#4CAF50', padding: 8, borderRadius: 6, marginLeft: 5, alignItems: 'center' }}
                      disabled={loadingAction}
                    >
                      <Text style={{ color: '#fff', fontWeight: 'bold' }}>Terminer</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {!ride.isShared && !isFinished && (
                <TouchableOpacity
                  style={{ marginTop: 8, backgroundColor: '#25D366', padding: 8, borderRadius: 6, alignItems: 'center' }}
                  onPress={() => {
                    setSelectedShareRide(ride);
                    setShareModalVisible(true);
                  }}
                  disabled={loadingAction}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Partager</Text>
                </TouchableOpacity>
              )}

              {ride.isShared && ride.statusPartage === 'pending' && (
                <View style={{ flexDirection: 'row', marginTop: 10, justifyContent: 'space-between' }}>
                  <TouchableOpacity
                    onPress={() => respondSharedRide(ride._id, 'accepted')}
                    style={{ flex: 1, backgroundColor: '#4CAF50', padding: 8, borderRadius: 6, marginRight: 5, alignItems: 'center' }}
                  >
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>Accepter</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => respondSharedRide(ride._id, 'refused')}
                    style={{ flex: 1, backgroundColor: 'red', padding: 8, borderRadius: 6, marginLeft: 5, alignItems: 'center' }}
                  >
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>Refuser</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  // ---------------- Share Modal ----------------
  const ShareRideModal = ({ visible, contacts, onSelectContact, onClose }) => (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
        <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>Partager la course</Text>
          {contacts.map(contact => (
            <TouchableOpacity
              key={contact.id}
              onPress={() => onSelectContact(contact)}
              style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' }}
            >
              <Text>{contact.full_name || contact.email}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={onClose} style={{ marginTop: 10 }}>
            <Text style={{ textAlign: 'center', color: 'red', fontWeight: 'bold' }}>Fermer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#f0f2f5' }}>
      {loading ? (
        <ActivityIndicator size="large" color="#2196F3" style={{ marginTop: 50 }} />
      ) : (
        <>
          <TouchableOpacity
            onPress={toggleCalendar}
            style={{ backgroundColor: '#2196F3', padding: 10, margin: 10, borderRadius: 8, alignItems: 'center' }}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>
              {showCalendar ? 'Masquer le calendrier' : 'Afficher le calendrier'}
            </Text>
          </TouchableOpacity>

          {showCalendar && (
            <Calendar
              markingType="multi-dot"
              markedDates={markedDates}
              onDayPress={day => setSelectedDate(day.dateString)}
              theme={{ selectedDayBackgroundColor: '#2196F3', todayTextColor: '#2196F3' }}
              style={{ marginBottom: 10 }}
            />
          )}

          {(groupedRides[selectedDate] || []).length === 0 ? (
            <Text style={{ textAlign: 'center', marginTop: 20, fontSize: 16, color: '#777' }}>
              Aucune course ce jour
            </Text>
          ) : (
            <ScrollView contentContainerStyle={{ padding: 20 }} ref={scrollRef}>
              {groupedRides[selectedDate].map(ride => (
                <RideCard key={ride._id} ride={ride} />
              ))}
            </ScrollView>
          )}
        </>
      )}

      {/* Actualiser */}
      <TouchableOpacity
        onPress={fetchAllRides}
        style={{ position: 'absolute', bottom: 20, right: 20, backgroundColor: '#FF9800', padding: 12, borderRadius: 50, elevation: 5 }}
      >
        <Text style={{ color: '#fff', fontWeight: 'bold', textAlign: 'center' }}>Actualiser</Text>
      </TouchableOpacity>

      {/* Modal Partage */}
      <ShareRideModal
        visible={shareModalVisible}
        contacts={contacts}
        onSelectContact={contact => {
          if (selectedShareRide) shareRideWithContact(selectedShareRide, contact);
        }}
        onClose={() => {
          setShareModalVisible(false);
          setSelectedShareRide(null);
        }}
      />
    </View>
  );
};

export default AgendaScreen;
