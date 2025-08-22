import React, { useEffect, useState, useRef } from 'react';
import { 
  View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput, Switch, Platform, Animated 
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getRides } from '../services/api';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://vsl-taxi.onrender.com/api/rides';

// Fonction pour mettre à jour le statut d'une course
const updateRideStatus = async (rideId, newStatus) => {
  const token = await AsyncStorage.getItem('token');
  if (!token) throw new Error('Token manquant');

  const res = await axios.patch(`${API_URL}/${rideId}`, { status: newStatus }, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

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
      const validRides = data.filter(ride => !isNaN(new Date(ride.date)));
      setRides(validRides.sort((a,b)=> new Date(b.date) - new Date(a.date)));
    } catch (err) {
      console.error(err);
      Alert.alert('Erreur', 'Impossible de récupérer les courses.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRides(); }, []);

  const openModal = (ride) => {
    setSelectedRide(ride);
    const isFacture = ride.status === 'Facturé' ? 1 : 0;

    Animated.timing(backgroundAnim, {
      toValue: isFacture,
      duration: 300,
      useNativeDriver: false,
    }).start();

    setModalVisible(true);
  };

  const toggleStatus = async () => {
    if (!selectedRide) return;
  
    try {
      const newStatus = selectedRide.status === 'Facturé' ? 'Non facturé' : 'Facturé';
  
      // Appel API pour mettre à jour le statut
      const updatedRide = await updateRideStatus(selectedRide._id, newStatus);
  
      // Mettre à jour le ride sélectionné
      setSelectedRide({ ...updatedRide });
  
      // Mettre à jour la liste globale
      setRides(prev => prev.map(r => r._id === updatedRide._id ? { ...updatedRide } : r));
  
      // Animation badge
      Animated.timing(backgroundAnim, {
        toValue: newStatus === 'Facturé' ? 1 : 0,
        duration: 300,
        useNativeDriver: false,
      }).start();
  
    } catch (err) {
      console.error('Erreur toggleStatus:', err);
      Alert.alert('Erreur', 'Impossible de mettre à jour le statut.');
    }
  };

  const filteredRides = rides
    .filter(r => r.endTime)
    .filter(r => {
      const matchesPatient = r.patientName.toLowerCase().includes(searchPatient.toLowerCase());
      const matchesDate = selectedDate ? new Date(r.date).toDateString() === selectedDate.toDateString() : true;
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
    inputRange: [0,1],
    outputRange: ['#FFEBEE','#E0F7FA']
  });

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F5F5' }}>
      <TextInput
        placeholder="Rechercher par patient"
        value={searchPatient}
        onChangeText={setSearchPatient}
        style={styles.input}
      />

      <TouchableOpacity style={styles.dateButton} onPress={()=>setShowDatePicker(true)}>
        <Text style={styles.dateButtonText}>
          {selectedDate ? `Date : ${selectedDate.toLocaleDateString('fr-FR')}` : 'Sélectionner une date'}
        </Text>
      </TouchableOpacity>

      {showDatePicker && (
        <DateTimePicker
          value={selectedDate||new Date()}
          mode="date"
          display="default"
          onChange={(event,date)=>{
            setShowDatePicker(Platform.OS==='ios');
            if(date) setSelectedDate(date);
          }}
        />
      )}

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#1976D2"/></View>
      ):(
        <FlatList
          data={filteredRides}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.container}
          ListEmptyComponent={()=>(
            <View style={styles.center}><Text>Aucune course trouvée</Text></View>
          )}
        />
      )}

      <TouchableOpacity style={styles.floatingButton} onPress={fetchRides}>
        <Text style={styles.floatingButtonText}>⟳ Actualiser</Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={()=>setModalVisible(false)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>{selectedRide?.patientName}</Text>
            <View style={{flexDirection:'row', alignItems:'center', marginBottom:15}}>
              <Text style={{marginRight:10, fontWeight:'600', fontSize:16}}>Statut :</Text>
              <Switch
                value={selectedRide?.status === 'Facturé'}
                onValueChange={toggleStatus}
                trackColor={{ false:'#FFCDD2', true:'#B2EBF2' }}
                thumbColor={selectedRide?.status === 'Facturé' ? '#00ACC1' : '#F44336'}
                ios_backgroundColor="#FFFFD2"
                style={{ transform:[{scale:1.3}] }}
              />
              <Animated.View
                style={[styles.badge, {
                  backgroundColor: selectedRide ? backgroundAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['#F44336', '#00ACC1']
                  }) : '#F44336',
                  marginLeft:12
                }]}
              >
                <Text style={[styles.badgeText, { fontSize:14 }]}>
                  {selectedRide?.status}
                </Text>
              </Animated.View>
            </View>

            <Text style={styles.modalValue}>Départ : {selectedRide?.startLocation}</Text>
            <Text style={styles.modalValue}>Arrivée : {selectedRide?.endLocation}</Text>
            <Text style={styles.modalValue}>Date : {selectedRide ? new Date(selectedRide.date).toLocaleDateString('fr-FR') : '-'}</Text>

            <TouchableOpacity
              style={[styles.button, {backgroundColor:'#1976D2', marginTop:12}]}
              onPress={()=>setModalVisible(false)}
            >
              <Text style={styles.buttonText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container:{padding:12},
  center:{flex:1,justifyContent:'center',alignItems:'center'},
  input:{
    borderWidth:1,
    borderColor:'#bbb',
    padding:12,
    borderRadius:10,
    marginHorizontal:12,
    marginVertical:6,
    backgroundColor:'#fff',
    fontSize:16,
  },
  dateButton:{
    backgroundColor:'#1976D2',
    padding:12,
    borderRadius:10,
    marginHorizontal:12,
    marginVertical:6,
  },
  dateButtonText:{color:'#fff',fontWeight:'bold',fontSize:16,textAlign:'center'},
  card:{
    padding:18,
    marginVertical:6,
    borderRadius:12,
    elevation:3,
    shadowColor:'#000',
    shadowOffset:{width:0,height:1},
    shadowOpacity:0.2,
    shadowRadius:2,
  },
  cardHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:8},
  title:{fontWeight:'bold',fontSize:18},
  badge:{borderRadius:14,paddingHorizontal:12,paddingVertical:5,elevation:2},
  badgeText:{color:'#fff',fontWeight:'bold',fontSize:13},
  modalBackground:{flex:1,backgroundColor:'rgba(0,0,0,0.6)',justifyContent:'center',padding:16},
  modalContainer:{borderRadius:14,padding:20,maxHeight:'80%',backgroundColor:'#fff'},
  modalTitle:{fontSize:20,fontWeight:'bold',marginBottom:12,color:'#1976D2'},
  modalValue:{fontSize:15,color:'#333',marginBottom:4},
  floatingButton:{
    position:'absolute',
    bottom:24,
    right:24,
    backgroundColor:'#FF9800',
    paddingVertical:16,
    paddingHorizontal:22,
    borderRadius:50,
    elevation:6,
    flexDirection:'row',
    alignItems:'center',
  },
  floatingButtonText:{color:'#fff',fontWeight:'bold',marginLeft:8,fontSize:16},
  button:{padding:12,borderRadius:10,alignItems:'center'},
  buttonText:{color:'#fff',fontWeight:'bold',fontSize:16},
});

export default HistoryScreen;
