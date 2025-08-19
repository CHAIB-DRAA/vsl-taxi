import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, ScrollView, LayoutAnimation, UIManager, Platform, Alert, Linking } from 'react-native';
import { Calendar } from 'react-native-calendars';
import moment from 'moment';
import 'moment/locale/fr';
import { supabase } from '../lib/supabase';
import { getRides, updateRide, deleteRide, shareRide, respondSharedRide } from '../services/api';
import RideCard from '../components/RideCard';
import RideModal from '../components/RideModal';
import ShareRideModal from '../components/ShareRideModal';

moment.locale('fr');
if (Platform.OS === 'android') UIManager.setLayoutAnimationEnabledExperimental?.(true);

const typeColors = { Aller: '#FF5722', Retour: '#4CAF50', autre: '#2196F3' };

const AgendaScreen = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(moment().format('YYYY-MM-DD'));
  const [markedDates, setMarkedDates] = useState({});
  const [showCalendar, setShowCalendar] = useState(true);

  const [rideModalVisible, setRideModalVisible] = useState(false);
  const [selectedRide, setSelectedRide] = useState(null);
  const [rideFormData, setRideFormData] = useState({ patientName: '', startLocation: '', endLocation: '', type: '', date: '' });

  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [selectedShareRide, setSelectedShareRide] = useState(null);
  const [contacts, setContacts] = useState([]);

  const scrollRef = useRef();

  const fetchContacts = async () => {
    const { data, error } = await supabase.from('profiles').select('id, full_name, email');
    if (error) console.error(error); else setContacts(data || []);
  };

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const data = await getRides();
      const formatted = (data || []).map(item => ({ ...item, date: new Date(item.date).toISOString(), isShared: !!item.shared })).sort((a, b) => new Date(a.date) - new Date(b.date));
      setEvents(formatted);
      updateMarkedDates(formatted);
    } catch (err) { console.error(err); Alert.alert('Erreur', "Impossible de charger l'agenda"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchEvents(); fetchContacts(); }, []);

  const updateMarkedDates = (rides) => {
    const marks = {};
    rides.forEach(r => {
      const day = moment(r.date).format('YYYY-MM-DD');
      if (!marks[day]) marks[day] = { dots: [] };
      const color = typeColors[r.type] || typeColors.autre;
      if (!marks[day].dots.find(d => d.color === color)) marks[day].dots.push({ color });
    });
    if (!marks[selectedDate]) marks[selectedDate] = {};
    marks[selectedDate].selected = true;
    setMarkedDates(marks);
  };

  const groupedEvents = events.reduce((acc, ride) => { const day = moment(ride.date).format('YYYY-MM-DD'); acc[day] = acc[day] || []; acc[day].push(ride); return acc; }, {});

  const toggleCalendar = () => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setShowCalendar(prev => !prev); };

  const openRideModal = ride => { setSelectedRide(ride); setRideFormData({ patientName: ride.patientName, startLocation: ride.startLocation, endLocation: ride.endLocation, type: ride.type, date: ride.date }); setRideModalVisible(true); };
  const handleSaveRide = async () => { await updateRide(selectedRide._id, rideFormData); setRideModalVisible(false); fetchEvents(); };
  const handleDeleteRide = async () => { await deleteRide(selectedRide._id); setRideModalVisible(false); fetchEvents(); };
  const shareRideWithContact = async (contact) => { await shareRide(selectedShareRide._id, contact.id); setShareModalVisible(false); fetchEvents(); };

  const handleSharedRideResponse = async (ride, accept = true) => { await respondSharedRide(ride._id, accept); fetchEvents(); };

  return (
    <View style={{ flex: 1, backgroundColor: '#f0f2f5' }}>
      {loading ? <ActivityIndicator size="large" color="#2196F3" style={{ marginTop: 50 }} /> :
        <>
          <TouchableOpacity onPress={toggleCalendar} style={{ backgroundColor: '#2196F3', padding: 10, margin: 10, borderRadius: 8, alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>{showCalendar ? 'Masquer le calendrier' : 'Afficher le calendrier'}</Text>
          </TouchableOpacity>

          {showCalendar && <Calendar markingType="multi-dot" markedDates={markedDates} onDayPress={day => setSelectedDate(day.dateString)} theme={{ selectedDayBackgroundColor: '#2196F3', todayTextColor: '#2196F3' }} style={{ marginBottom: 10 }} />}

          {(groupedEvents[selectedDate] || []).length === 0 ?
            <Text style={{ textAlign: 'center', marginTop: 20, fontSize: 16, color: '#777' }}>Aucune course ce jour</Text> :
            <ScrollView contentContainerStyle={{ padding: 20 }} ref={scrollRef}>
              {groupedEvents[selectedDate].map((ride, index) =>
                <RideCard
                  key={`${ride._id}-${index}`}
                  ride={ride}
                  onPress={openRideModal}
                  onShare={(ride) => { setSelectedShareRide(ride); setShareModalVisible(true); }}
                  onAccept={handleSharedRideResponse}
                  onRefuse={(ride) => handleSharedRideResponse(ride, false)}
                />
              )}
            </ScrollView>
          }
        </>
      }

      <TouchableOpacity onPress={fetchEvents} style={{ position: 'absolute', bottom: 20, right: 20, backgroundColor: '#FF9800', padding: 12, borderRadius: 50, elevation: 5 }}>
        <Text style={{ color: '#fff', fontWeight: 'bold', textAlign: 'center' }}>Actualiser</Text>
      </TouchableOpacity>

      <RideModal
        visible={rideModalVisible}
        onClose={() => setRideModalVisible(false)}
        rideData={rideFormData}
        setRideData={setRideFormData}
        onSave={handleSaveRide}
        onDelete={handleDeleteRide}
      />

      <ShareRideModal
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
        contacts={contacts}
        onShare={shareRideWithContact}
      />
    </View>
  );
};

export default AgendaScreen;
