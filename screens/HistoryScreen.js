import React, { useEffect, useState, useRef } from 'react';
import { 
  View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput, Switch, Platform, Animated 
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getRides } from '../services/api';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://vsl-taxi.onrender.com/api/rides';

const HistoryScreen = () => {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedRide, setSelectedRide] = useState(null);

  const [searchPatient, setSearchPatient] = useState('');
  const [selectedDate, setSelectedDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const [activeTab, setActiveTab] = useState('myRides'); // 'myRides' ou 'sharedRides'

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

  useEffect(() => { fetchRides();
   }, []);

  const openModal = (ride) => {
    setSelectedRide(ride);
    Animated.timing(backgroundAnim, {
      toValue: ride.statuFacturation === 'Facturé' ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
    setModalVisible(true);
  };

  const toggleFacturation = async () => {
    if (!selectedRide) return;

    try {
      const newStatus = selectedRide.statuFacturation === 'Facturé' ? 'Non facturé' : 'Facturé';
      const token = await AsyncStorage.getItem('token');

      const res = await axios.put(
        `${API_URL}/${selectedRide._id}/facturation`,
        { statuFacturation: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const updatedRide = res.data;
      setSelectedRide(updatedRide);
      setRides(prev => prev.map(r => r._id === updatedRide._id ? updatedRide : r));
    } catch (err) {
      console.error('Erreur toggleFacturation:', err);
      Alert.alert('Erreur', 'Impossible de modifier la facturation.');
    }
  };

  // Filtrage par onglet
  const myRides = rides
    .filter(r => r.endTime)
    .filter(r => !r.isShared);

  const sharedRides = rides
    .filter(r => r.isShared && (r.statusPartage === 'pending' || r.statusPartage === 'accepted'));
    const filteredRides = (activeTab === 'myRides' ? myRides : sharedRides)
    .filter(r => r.patientName.toLowerCase().includes(searchPatient.toLowerCase()))
    .filter(r => selectedDate ? new Date(r.date).toDateString() === selectedDate.toDateString() : true);
  const renderItem = ({ item }) => {
    const backgroundColor = item.statuFacturation === 'Facturé' ? '#E0F7FA' : '#FFEBEE';
    const badgeColor = item.statuFacturation === 'Facturé' ? '#00ACC1' : '#F44336';
    console.log(item )

    const sharedText = activeTab === 'sharedRides'
  ? (item.sharedBy 
      ? `Partagée par : ${item.sharedByName}` 
      : 'Partagée par : -')
  : '';



    return (
      <TouchableOpacity style={[styles.card, { backgroundColor }]} onPress={() => openModal(item)}>
        <View style={styles.cardHeader}>
          <Text style={styles.title}>{item.patientName}</Text>
          {activeTab === 'myRides' && (
            <View style={[styles.badge, { backgroundColor }]}>
              <Text style={[styles.badgeText, { color: badgeColor }]}>{item.statuFacturation || 'Non facturé'}</Text>
            </View>
          )}
        </View>

        <Text style={styles.modalValue}>Date : {new Date(item.date).toLocaleDateString('fr-FR')}</Text>
        <Text style={styles.modalValue}>Départ : {item.startLocation}</Text>
        <Text style={styles.modalValue}>Arrivée : {item.endLocation}</Text>


        {activeTab === 'sharedRides' && (
          <Text style={[styles.sharedText, { color: '#555' }]}>{sharedText}</Text>
        )}
      </TouchableOpacity>
    );
  };

  const modalBackgroundColor = backgroundAnim.interpolate({
    inputRange: [0,1],
    outputRange: ['#FFEBEE','#E0F7FA']
  });

  const badgeColorAnim = backgroundAnim.interpolate({
    inputRange: [0,1],
    outputRange: ['#F44336','#00ACC1']
  });

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F5F5' }}>
      {/* Recherche */}
      <TextInput
        placeholder="Rechercher par patient"
        value={searchPatient}
        onChangeText={setSearchPatient}
        style={styles.input}
      />

      {/* Date picker */}
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

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab==='myRides' && styles.activeTab]}
          onPress={()=>setActiveTab('myRides')}
        >
          <Text style={styles.tabText}>Mes courses</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab==='sharedRides' && styles.activeTab]}
          onPress={()=>setActiveTab('sharedRides')}
        >
          <Text style={styles.tabText}>Courses partagées</Text>
        </TouchableOpacity>
      </View>

      {/* Liste des courses */}
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#1976D2"/></View>
      ) : (
        <FlatList
          data={filteredRides}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 14 }}
          ListEmptyComponent={()=>(
            <View style={styles.center}><Text>Aucune course trouvée</Text></View>
          )}
        />
      )}

      {/* Actualiser */}
      <TouchableOpacity style={styles.floatingButton} onPress={fetchRides}>
        <Text style={styles.floatingButtonText}>Actualiser</Text>
      </TouchableOpacity>

      {/* Modal course */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'center', alignItems:'center', padding:20 }}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>{selectedRide?.patientName}</Text>

            {/* Infos visibles pour toutes les courses */}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Départ :</Text>
              <Text style={styles.infoValue}>{selectedRide?.startLocation ?? '-'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Arrivée :</Text>
              <Text style={styles.infoValue}>{selectedRide?.endLocation ?? '-'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Date :</Text>
              <Text style={styles.infoValue}>
                {selectedRide ? new Date(selectedRide.date).toLocaleDateString('fr-FR') : '-'}
              </Text>
            </View>

           
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Heure départ :</Text>
                  <Text style={styles.infoValue}>
                    {selectedRide?.startTime 
                      ? new Date(selectedRide.startTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', hour12: false }) 
                      : '-'}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Heure arrivée :</Text>
                  <Text style={styles.infoValue}>
                    {selectedRide?.endTime 
                      ? new Date(selectedRide.endTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', hour12: false }) 
                      : '-'}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Distance :</Text>
                  <Text style={styles.infoValue}>{selectedRide?.distance ? `${selectedRide.distance} km` : '-'}</Text>
                </View>

                <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginTop:20, paddingVertical:10, borderTopWidth:1, borderColor:'#eee' }}>
                  <Text style={{ fontWeight:'600', fontSize:16, color:'#444' }}>Facturation :</Text>
                  <View style={{ flexDirection:'row', alignItems:'center' }}>
                    <Switch
                      value={selectedRide?.statuFacturation === 'Facturé'}
                      onValueChange={toggleFacturation}
                      trackColor={{ false:'#FFCDD2', true:'#B2EBF2' }}
                      thumbColor={selectedRide?.statuFacturation === 'Facturé' ? '#00ACC1' : '#F44336'}
                      ios_backgroundColor="#FFFFD2"
                      style={{ transform:[{scale:1.2}] }}
                    />
                    <Text style={{ marginLeft: 10, fontWeight:'600', fontSize:14, color:'#333' }}>
                      {selectedRide?.statuFacturation}
                    </Text>
                  </View>
                </View>
              
           

           -

            {/* Bouton fermer */}
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={{ backgroundColor:'#00ACC1', paddingVertical:12, borderRadius:12, marginTop:20, alignItems:'center' }}
            >
              <Text style={{ color:'#fff', fontSize:16, fontWeight:'600' }}>Fermer</Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  center: { flex:1, justifyContent:'center', alignItems:'center' },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    padding: 14,
    borderRadius: 14,
    marginHorizontal: 14,
    marginVertical: 8,
    backgroundColor: '#fff',
    fontSize: 16,
    elevation: 2
  },
  dateButton: { backgroundColor: '#00796B', padding: 14, borderRadius: 14, marginHorizontal: 14, marginVertical: 6, elevation: 3 },
  dateButtonText: { color:'#fff', fontWeight:'bold', fontSize:16, textAlign:'center' },
  card: { padding: 20, marginVertical: 8, borderRadius: 16, backgroundColor:'#fff', elevation:4, shadowColor:'#000', shadowOffset:{width:0,height:2}, shadowOpacity:0.15, shadowRadius:4 },
  cardHeader: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:10 },
  title: { fontWeight:'700', fontSize:17, color:'#333' },
  badge: { borderRadius:20, paddingHorizontal:14, paddingVertical:6, backgroundColor:'#F1F1F1' },
  badgeText: { fontWeight:'700', fontSize:13 },
  floatingButton: { position:'absolute', bottom:28, right:28, backgroundColor:'#FF7043', paddingVertical:16, paddingHorizontal:24, borderRadius:50, elevation:7 },
  floatingButtonText: { color:'#fff', fontWeight:'700', fontSize:16 },
  tabs: { flexDirection:'row', marginHorizontal:14, marginBottom:6, borderRadius:8, overflow:'hidden' },
  tabButton: { flex:1, padding:12, backgroundColor:'#E0E0E0', alignItems:'center' },
  activeTab: { backgroundColor:'#00796B' },
  tabText: { color:'#fff', fontWeight:'700' },
  modalContainer: { width:'100%', backgroundColor:'#fff', borderRadius:20, padding:20 },
  modalTitle: { fontSize:20, fontWeight:'700', marginBottom:12, textAlign:'center', color:'#333' },
  infoRow: { flexDirection:'row', justifyContent:'space-between', paddingVertical:8, borderBottomWidth:0.5, borderBottomColor:'#ddd' },
  infoLabel: { fontSize:16, color:'#555', fontWeight:'600' },
  infoValue: { fontSize:16, color:'#111', fontWeight:'400', flexShrink:1, textAlign:'right' },
  modalValue: { fontSize:15, color:'#333', marginBottom:8 },
});

export default HistoryScreen;
