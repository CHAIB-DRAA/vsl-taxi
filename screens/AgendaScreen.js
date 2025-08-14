import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ActivityIndicator, Alert, TouchableOpacity, ScrollView, LayoutAnimation, UIManager, Platform, Modal, TextInput, Button } from 'react-native';
import { getRides, updateRide, deleteRide } from '../services/api';
import { Calendar } from 'react-native-calendars';
import moment from 'moment';
import 'moment/locale/fr';

moment.locale('fr');

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental &&
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const typeColors = {
  de: '#FF5722',
  vers: '#4CAF50',
  autre: '#2196F3',
};

const AgendaScreen = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(moment().format('YYYY-MM-DD'));
  const [markedDates, setMarkedDates] = useState({});
  const [showCalendar, setShowCalendar] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedRide, setSelectedRide] = useState(null);
  const [formData, setFormData] = useState({ patientName: '', startLocation: '', endLocation: '', type: '', date: '' });

  const scrollRef = useRef();

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const data = await getRides();
      const validEvents = data
        .map(item => {
          const d = new Date(item.date);
          if (isNaN(d)) return null;
          return { ...item, date: d.toISOString() };
        })
        .filter(Boolean)
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      setEvents(validEvents);
      updateMarkedDates(validEvents);
    } catch (error) {
      Alert.alert('Erreur', "Impossible de charger l'agenda");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const updateMarkedDates = (data) => {
    const marks = {};
    data.forEach(ride => {
      const dateKey = moment(ride.date).format('YYYY-MM-DD');
      if (!marks[dateKey]) marks[dateKey] = { dots: [] };
      const existingColors = marks[dateKey].dots.map(d => d.color);
      if (!existingColors.includes(typeColors[ride.type] || typeColors.autre)) {
        marks[dateKey].dots.push({ color: typeColors[ride.type] || typeColors.autre });
      }
    });
    if (!marks[selectedDate]) marks[selectedDate] = { selected: true };
    else marks[selectedDate].selected = true;
    setMarkedDates(marks);
  };

  const groupByDate = (data) => {
    const grouped = {};
    data.forEach(item => {
      const d = new Date(item.date);
      if (!isNaN(d)) {
        const dateKey = moment(d).format('YYYY-MM-DD');
        if (!grouped[dateKey]) grouped[dateKey] = [];
        grouped[dateKey].push(item);
      }
    });
    return grouped;
  };

  const groupedEvents = groupByDate(events);

  const formatTime = date => (date ? moment(date).format('HH:mm') : '');

  const toggleCalendar = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowCalendar(!showCalendar);
  };

  const openRideModal = (ride) => {
    setSelectedRide(ride);
    setFormData({
      patientName: ride.patientName,
      startLocation: ride.startLocation,
      endLocation: ride.endLocation,
      type: ride.type,
      date: ride.date,
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    try {
      await updateRide(selectedRide._id, formData);
      Alert.alert('Succès', 'Course mise à jour');
      setModalVisible(false);
      fetchEvents();
    } catch (error) {
      Alert.alert('Erreur', "Impossible de mettre à jour la course");
      console.error(error);
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      "Supprimer la course",
      "Voulez-vous vraiment supprimer cette course ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteRide(selectedRide._id);
              Alert.alert('Succès', 'Course supprimée');
              setModalVisible(false);
              fetchEvents();
            } catch (error) {
              Alert.alert('Erreur', "Impossible de supprimer la course");
              console.error(error);
            }
          }
        }
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f0f2f5' }}>
      {loading ? (
        <ActivityIndicator size="large" color="#2196F3" style={{ marginTop: 50 }} />
      ) : (
        <>
          <TouchableOpacity
            onPress={toggleCalendar}
            style={{
              backgroundColor: '#2196F3',
              padding: 10,
              margin: 10,
              borderRadius: 8,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>
              {showCalendar ? 'Masquer le calendrier' : 'Afficher le calendrier'}
            </Text>
          </TouchableOpacity>

          {showCalendar && (
            <Calendar
              markingType="multi-dot"
              markedDates={markedDates}
              onDayPress={(day) => setSelectedDate(day.dateString)}
              theme={{
                selectedDayBackgroundColor: '#2196F3',
                todayTextColor: '#2196F3',
              }}
              style={{ marginBottom: 10 }}
            />
          )}

          {Object.keys(groupedEvents).length === 0 ? (
            <Text style={{ textAlign: 'center', marginTop: 20, fontSize: 16, color: '#777' }}>
              Aucune course planifiée
            </Text>
          ) : (
            <ScrollView contentContainerStyle={{ padding: 20 }} ref={scrollRef}>
              {Object.keys(groupedEvents).map(date => (
                <View key={date} style={{ marginBottom: 30 }}>
                  <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 10 }}>
                    {moment(date, 'YYYY-MM-DD').format('dddd D MMMM YYYY')}
                  </Text>
                  {groupedEvents[date].map(item => (
                    <TouchableOpacity key={item._id} onPress={() => openRideModal(item)}>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 15 }}>
                        <View style={{
                          width: 12,
                          height: 12,
                          borderRadius: 6,
                          backgroundColor: typeColors[item.type] || typeColors.autre,
                          marginTop: 8,
                          marginRight: 15,
                        }} />
                        <View style={{
                          flex: 1,
                          backgroundColor: '#fff',
                          padding: 15,
                          borderRadius: 12,
                          shadowColor: '#000',
                          shadowOpacity: 0.1,
                          shadowOffset: { width: 0, height: 2 },
                          shadowRadius: 5,
                          elevation: 3,
                        }}>
                          <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 5 }}>
                            {item.patientName}
                          </Text>
                          <Text style={{ color: '#555', marginBottom: 3 }}>
                            Départ : {item.startLocation}
                          </Text>
                          <Text style={{ color: '#555', marginBottom: 3 }}>
                            Arrivée : {item.endLocation}
                          </Text>
                          <Text style={{ color: '#555', marginBottom: 3 }}>
                            Heure : {formatTime(item.date)}
                          </Text>
                          <Text style={{ color: '#555', fontStyle: 'italic' }}>
                            Type : {item.type}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </ScrollView>
          )}
        </>
      )}

      {/* Modal détail / modification */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={{ flex:1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding:20 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 12, padding:20 }}>
            <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 10 }}>Modifier la course</Text>
            <TextInput
              placeholder="Nom du patient"
              value={formData.patientName}
              onChangeText={text => setFormData({...formData, patientName: text})}
              style={{ borderWidth:1, borderColor:'#ccc', borderRadius:8, padding:10, marginBottom:10 }}
            />
            <TextInput
              placeholder="Départ"
              value={formData.startLocation}
              onChangeText={text => setFormData({...formData, startLocation: text})}
              style={{ borderWidth:1, borderColor:'#ccc', borderRadius:8, padding:10, marginBottom:10 }}
            />
            <TextInput
              placeholder="Arrivée"
              value={formData.endLocation}
              onChangeText={text => setFormData({...formData, endLocation: text})}
              style={{ borderWidth:1, borderColor:'#ccc', borderRadius:8, padding:10, marginBottom:10 }}
            />
            <TextInput
              placeholder="Type"
              value={formData.type}
              onChangeText={text => setFormData({...formData, type: text})}
              style={{ borderWidth:1, borderColor:'#ccc', borderRadius:8, padding:10, marginBottom:10 }}
            />
            <TextInput
              placeholder="Date (YYYY-MM-DD HH:mm)"
              value={moment(formData.date).format('YYYY-MM-DD HH:mm')}
              onChangeText={text => setFormData({...formData, date: new Date(text).toISOString()})}
              style={{ borderWidth:1, borderColor:'#ccc', borderRadius:8, padding:10, marginBottom:10 }}
            />

            <View style={{ flexDirection:'row', justifyContent:'space-between', marginTop:10 }}>
              <Button title="Enregistrer" onPress={handleSave} />
              <Button title="Supprimer" color="red" onPress={handleDelete} />
              <Button title="Fermer" color="#555" onPress={()=>setModalVisible(false)} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Bouton Actualiser */}
      <TouchableOpacity
        onPress={fetchEvents}
        style={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          backgroundColor: '#FF9800',
          padding: 12,
          borderRadius: 50,
          elevation: 5,
        }}
      >
        <Text style={{ color: '#fff', fontWeight: 'bold', textAlign: 'center' }}>Actualiser</Text>
      </TouchableOpacity>
    </View>
  );
};

export default AgendaScreen;
