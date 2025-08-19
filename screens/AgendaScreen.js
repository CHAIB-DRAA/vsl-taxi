import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, ScrollView, LayoutAnimation, UIManager, Platform, Alert } from 'react-native';
import { Calendar } from 'react-native-calendars';
import moment from 'moment';
import 'moment/locale/fr';
import { supabase } from '../lib/supabase';
import { getRides, updateRide, deleteRide, shareRide, respondToSharedRide } from '../services/api';

import RideCard from '../components/RideCard';
import RideModal from '../components/RideModal';
import ShareRideModal from '../components/ShareRideModal';

moment.locale('fr');
if (Platform.OS === 'android') UIManager.setLayoutAnimationEnabledExperimental?.(true);

const typeColors = { Aller: '#FF5722', Retour: '#4CAF50', autre: '#2196F3' };

const AgendaScreen = ({ userId }) => {
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

  // 🔹 Fetch contacts
  const fetchContacts = async () => {
    const { data, error } = await supabase.from('profiles').select('id, full_name, email');
    if (error) console.error('Erreur fetch contacts:', error);
    else setContacts(data || []);
  };

  // 🔹 Fetch all rides sans distinction
  const fetchAllRides = async () => {
    setLoading(true);
    try {
      const data = await getRides(userId); // API renvoie toutes les courses
      setRides(data || []);
      updateMarkedDates(data || []);
    } catch (err) {
      console.error(err);
      Alert.alert('Erreur', "Impossible de charger l'agenda");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllRides();
    fetchContacts();
  }, []);

  // 🔹 Update marked dates
  const updateMarkedDates = (ridesList) => {
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
  };

  const groupedRides = rides.reduce((acc, ride) => {
    const day = moment(ride.date).format('YYYY-MM-DD');
    acc[day] = acc[day] || [];
    acc[day].push(ride);
    return acc;
  }, {});

  const toggleCalendar = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowCalendar(prev => !prev);
  };

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
      await updateRide(selectedRide._id, formData);
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
            await deleteRide(selectedRide._id);
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

  const shareRideWithContact = async (ride, contact) => {
    try {
      await shareRide(ride._id, contact.id);
      setShareModalVisible(false);
      fetchAllRides();
      Alert.alert('Partagé', `Course partagée avec ${contact.full_name || contact.email}`);
    } catch (err) {
      console.error('Erreur shareRide:', err);
      Alert.alert('Erreur', 'Impossible de partager la course.');
    }
  };

  const respondSharedRide = async (rideShareId, action) => {
    try {
      await respondToSharedRide(rideShareId, action);
      fetchAllRides();
    } catch (err) {
      console.error(err);
      Alert.alert('Erreur', "Impossible de répondre à la course partagée");
    }
  };

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
            <Text style={{ textAlign: 'center', marginTop: 20, fontSize: 16, color: '#777' }}>Aucune course ce jour</Text>
          ) : (
            <ScrollView contentContainerStyle={{ padding: 20 }} ref={scrollRef}>
              {groupedRides[selectedDate].map(ride => (
                <RideCard
                  key={ride._id}
                  ride={ride}
                  onPress={openRideModal}
                  onShare={r => { setSelectedShareRide(r); setShareModalVisible(true); }}
                  onRespond={respondSharedRide}
                />
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

      {/* Modals */}
      <RideModal
        visible={rideModalVisible}
        ride={selectedRide}
        formData={formData}
        setFormData={setFormData}
        onSave={handleSaveRide}
        onDelete={handleDeleteRide}
        onClose={() => setRideModalVisible(false)}
      />

      <ShareRideModal
        visible={shareModalVisible}
        contacts={contacts}
        onSelectContact={contact => shareRideWithContact(selectedShareRide, contact)}
        onClose={() => setShareModalVisible(false)}
      />
    </View>
  );
};

export default AgendaScreen;

