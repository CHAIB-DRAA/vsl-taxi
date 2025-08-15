import React, { useEffect, useState, useRef } from 'react';
import { 
  View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Modal, Button, ScrollView, TextInput, Switch, Platform, Animated 
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getRides, updateRideStatus } from '../services/api';

const HistoryScreen = () => {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedRide, setSelectedRide] = useState(null);

  const [searchPatient, setSearchPatient] = useState('');
  const [selectedDate, setSelectedDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const backgroundAnim = useRef(new Animated.Value(0)).current;

  const fetchRides = async () => {
    try {
      setLoading(true);
      const data = await getRides();
      const validRides = data.filter(ride => {
        const d = new Date(ride.date);
        return !isNaN(d);
      });
      setRides(validRides.sort((a, b) => new Date(a.date) - new Date(b.date)));
    } catch (error) {
      console.error('Erreur récupération courses :', error);
      Alert.alert('Erreur', 'Impossible de récupérer les courses.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRides(); }, []);

  const openModal = (ride) => {
    setSelectedRide(ride);
    Animated.timing(backgroundAnim, {
      toValue: ride.status === 'Facturé' ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
    setModalVisible(true);
  };

  const toggleStatus = async () => {
    if (!selectedRide) return;
    try {
      const newStatus = selectedRide.status === 'Facturé' ? 'Non facturé' : 'Facturé';
      const updated = await updateRideStatus(selectedRide._id, newStatus);
      setSelectedRide(updated);
      setRides(prev => prev.map(r => r._id === updated._id ? updated : r));
      Animated.timing(backgroundAnim, {
        toValue: newStatus === 'Facturé' ? 1 : 0,
        duration: 300,
        useNativeDriver: false,
      }).start();
    } catch (error) {
      console.error(error);
      Alert.alert('Erreur', 'Impossible de mettre à jour le statut.');
    }
  };

  const filteredRides = rides
    .filter(ride => ride.endTime) // courses terminées
    .filter(ride => {
      const rideDate = new Date(ride.date);
      if (isNaN(rideDate)) return false;
      const matchesPatient = ride.patientName.toLowerCase().includes(searchPatient.toLowerCase());
      const matchesDate = selectedDate ? rideDate.toDateString() === selectedDate.toDateString() : true;
      return matchesPatient && matchesDate;
    });

  const renderItem = ({ item }) => {
    const backgroundColor = item.status === 'Facturé' ? '#E0F7FA' : '#FFEBEE';
    const badgeColor = item.status === 'Facturé' ? '#00ACC1' : '#F44336';
    return (
      <TouchableOpacity style={[styles.card, { backgroundColor }]} onPress={() => openModal(item)}>
        <View style={styles.cardHeader}>
          <Text style={styles.title}>{item.patientName}</Text>
          <View style={[styles.badge, { backgroundColor }]}>
            <Text style={[styles.badgeText, { color: badgeColor }]}>{item.status || 'Non défini'}</Text>
          </View>
        </View>
        <Text style={styles.modalValue}>Date : {new Date(item.date).toLocaleDateString('fr-FR')}</Text>
        <Text style={styles.modalValue}>Départ : {item.startLocation}</Text>
        <Text style={styles.modalValue}>Arrivée : {item.endLocation}</Text>
      </TouchableOpacity>
    );
  };

  const modalBackgroundColor = backgroundAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#FFEBEE', '#E0F7FA']
  });

  const badgeColorAnim = backgroundAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#F44336', '#00ACC1']
  });

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F5F5' }}>
      {/* Recherche patient */}
      <TextInput
        placeholder="Rechercher par patient"
        value={searchPatient}
        onChangeText={setSearchPatient}
        style={styles.input}
      />

      {/* Sélection date */}
      <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
        <Text style={styles.dateButtonText}>
          {selectedDate ? `Date : ${selectedDate.toLocaleDateString('fr-FR')}` : 'Sélectionner une date'}
        </Text>
      </TouchableOpacity>

      {showDatePicker && (
        <DateTimePicker
          value={selectedDate || new Date()}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowDatePicker(Platform.OS === 'ios');
            if (date) setSelectedDate(date);
          }}
        />
      )}

      {/* Liste */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1976D2" />
        </View>
      ) : (
        <FlatList
          data={filteredRides}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.container}
          ListEmptyComponent={() => (
            <View style={styles.center}>
              <Text>Aucune course trouvée.</Text>
            </View>
          )}
        />
      )}

      {/* Bouton flottant */}
      <TouchableOpacity style={styles.floatingButton} onPress={fetchRides}>
        <Text style={styles.floatingButtonText}>⟳ Actualiser</Text>
      </TouchableOpacity>

      {/* Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackground}>
          <Animated.View style={[styles.modalContainer, { backgroundColor: modalBackgroundColor }]}>
            <ScrollView>
              {selectedRide && (
                <>
                  <Text style={styles.modalTitle}>{selectedRide.patientName}</Text>

                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Date :</Text>
                    <Text style={styles.modalValue}>{new Date(selectedRide.date).toLocaleDateString('fr-FR')}</Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Départ :</Text>
                    <Text style={styles.modalValue}>{selectedRide.startLocation}</Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Arrivée :</Text>
                    <Text style={styles.modalValue}>{selectedRide.endLocation}</Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Type :</Text>
                    <Text style={styles.modalValue}>{selectedRide.type || 'Non défini'}</Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Début :</Text>
                    <Text style={styles.modalValue}>{selectedRide.startTime ? new Date(selectedRide.startTime).toLocaleDateString('fr-FR') : 'Non démarrée'}</Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Fin :</Text>
                    <Text style={styles.modalValue}>{selectedRide.endTime ? new Date(selectedRide.endTime).toLocaleDateString('fr-FR') : 'Non terminée'}</Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Distance :</Text>
                    <Text style={styles.modalValue}>{selectedRide.distance || 'Non renseignée'} km</Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 15 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 15 }}>
                  <Text style={{ marginRight: 10, fontWeight: '600', fontSize: 16 }}>Statu :</Text>
                  
                  <Switch
                    value={selectedRide.status === 'Facturé'}
                    onValueChange={toggleStatus}
                    trackColor={{ false: '#FFCDD2', true: '#B2EBF2' }}
                    thumbColor={selectedRide.status === 'Facturé' ? '#00ACC1' : '#F44336'}
                    ios_backgroundColor="#FFFFD2"
                    style={{ transform: [{ scale: 1.3 }] }}
                  />
                  
                  <Animated.View style={[styles.badge, { backgroundColor: badgeColorAnim, marginLeft: 12 }]}>
                    <Text style={[styles.badgeText, { fontSize: 14 }]}>{selectedRide.status}</Text>
                  </Animated.View>
                  </View>                    
                  </View>

                  <View style={{ marginTop: 20 }}>
                    <Button title="Fermer" onPress={() => setModalVisible(false)} color="#1976D2" />
                  </View>
                </>
              )}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  input: {
    borderWidth: 1,
    borderColor: '#bbb',
    padding: 12,
    borderRadius: 10,
    marginHorizontal: 12,
    marginVertical: 6,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  dateButton: {
    backgroundColor: '#1976D2',
    padding: 12,
    borderRadius: 10,
    marginHorizontal: 12,
    marginVertical: 6,
  },
  dateButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16, textAlign: 'center' },
  card: {
    padding: 18,
    marginVertical: 6,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontWeight: 'bold', fontSize: 18 },
  badge: { borderRadius: 14, paddingHorizontal: 12, paddingVertical: 5, elevation: 2 },
  badgeText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  modalBackground: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 16 },
  modalContainer: { borderRadius: 14, padding: 20, maxHeight: '80%', backgroundColor: '#fff' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 12, color: '#1976D2' },
  modalRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 6 },
  modalLabel: { fontWeight: '600', color: '#555', fontSize: 15 },
  modalValue: { fontSize: 15, color: '#333' },
  floatingButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#FF9800',
    paddingVertical: 16,
    paddingHorizontal: 22,
    borderRadius: 50,
    elevation: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  floatingButtonText: { color: '#fff', fontWeight: 'bold', marginLeft: 8, fontSize: 16 },
});

export default HistoryScreen;
