import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  ScrollView, Alert, Switch, KeyboardAvoidingView, Platform, Modal, FlatList, ActivityIndicator 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

// Composants & Services
import AddressAutocomplete from '../components/AddressAutocomplete'; 
import { createRide, getPatients, createPatient } from '../services/api';

// 🏥 LISTE RAPIDE (TOULOUSE & ENVIRONS)
const TOULOUSE_HOSPITALS = [
  "CHU Purpan", "CHU Rangueil", "Oncopole (IUCT)", 
  "Clinique Pasteur", "Clinique des Cèdres", "Clinique Rive Gauche",
  "Hôpital Pierre-Paul Riquet", "Clinique Médipôle Garonne", 
  "Clinique Saint-Exupéry", "Hôpital Joseph Ducuing"
];

export default function CreateRideScreen({ navigation }) {
  // --- STATES DE BASE ---
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState(''); 
  const [patientAddressMem, setPatientAddressMem] = useState(''); // Mémoire pour l'inversion intelligente
  
  const [startLocation, setStartLocation] = useState('');
  const [endLocation, setEndLocation] = useState('');
  
  // --- DATES & HEURES (Gestion Android Pro) ---
  const [date, setDate] = useState(new Date()); 
  const [returnDate, setReturnDate] = useState(new Date()); 
  
  const [dateMode, setDateMode] = useState('start'); // 'start' ou 'return'
  const [pickerMode, setPickerMode] = useState('date'); // 'date' ou 'time'
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const [type, setType] = useState('Aller');
  const [isRoundTrip, setIsRoundTrip] = useState(false);
  const [loading, setLoading] = useState(false);

  // --- RECHERCHE PATIENT ---
  const [allPatients, setAllPatients] = useState([]);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // --- MODAL NOUVEAU PATIENT ---
  const [modalVisible, setModalVisible] = useState(false);
  const [newPatient, setNewPatient] = useState({ fullName: '', phone: '', address: '' });

  // 1. CHARGEMENT INITIAL
  useEffect(() => { loadPatients(); }, []);
  
  const loadPatients = async () => {
    try {
      const data = await getPatients();
      setAllPatients(data || []);
    } catch (err) { console.log("Erreur chargement patients"); }
  };

  // 2. AUTO-COMPLÉTION PATIENT
  const handleNameChange = (text) => {
    setPatientName(text);
    if (text.length > 0) {
      const filtered = allPatients.filter(p => 
        p.fullName.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredPatients(filtered);
      setShowSuggestions(true);
    } else { 
      setShowSuggestions(false); 
    }
  };

  // 🧠 CŒUR DU SYSTÈME : SÉLECTION PATIENT INTELLIGENTE
  const selectPatient = (patient) => {
    console.log("Sélection:", patient.fullName);
    
    setPatientName(patient.fullName);
    setPatientPhone(patient.phone || '');
    setPatientAddressMem(patient.address || ''); // Important pour la logique Aller/Retour

    // Logique de placement d'adresse
    if (patient.address) {
      if (type === 'Retour') {
        // Retour : Le patient rentre chez lui (Destination)
        setEndLocation(patient.address);
        // On ne touche pas au départ (ça peut être l'hôpital déjà sélectionné)
      } else {
        // Aller : On part de chez le patient (Départ)
        setStartLocation(patient.address);
        // On ne touche pas à l'arrivée
      }
    }
    setShowSuggestions(false);
  };

  // 🧠 CHANGEMENT DE TYPE (Inversion automatique)
  const handleTypeChange = (newType) => {
    setType(newType);

    // Si on a des adresses remplies, on propose une inversion intelligente
    if (startLocation && endLocation) {
        // Swap simple : On inverse départ et arrivée
        const temp = startLocation;
        setStartLocation(endLocation);
        setEndLocation(temp);
    } else if (patientAddressMem) {
        // Si une seule adresse est mise (celle du patient), on la déplace
        if (newType === 'Retour') {
            setEndLocation(patientAddressMem);
            if (startLocation === patientAddressMem) setStartLocation('');
        } else {
            setStartLocation(patientAddressMem);
            if (endLocation === patientAddressMem) setEndLocation('');
        }
    }
  };

  // 🧠 SÉLECTION HÔPITAL RAPIDE
  const selectHospital = (hospital) => {
    // Ajoute "Toulouse" automatiquement pour aider le GPS si besoin
    const fullHospitalAddress = hospital.includes("Toulouse") ? hospital : `${hospital}, Toulouse`;

    if (type === 'Retour') {
        setStartLocation(fullHospitalAddress);
    } else {
        setEndLocation(fullHospitalAddress);
    }
  };

  // 🔁 FONCTION MANUELLE : INVERSER ADRESSES
  const swapAddresses = () => {
    const temp = startLocation;
    setStartLocation(endLocation);
    setEndLocation(temp);
  };

  // GESTION DATE PICKER (ANTI-CRASH ANDROID)
  const openDatePicker = (target) => {
    setDateMode(target);
    if (Platform.OS === 'ios') setPickerMode('datetime');
    else setPickerMode('date');
    setShowDatePicker(true);
  };

  const onChangeDate = (event, selectedDate) => {
    if (event.type === 'dismissed') { setShowDatePicker(false); return; }
    
    const currentDate = selectedDate || (dateMode === 'start' ? date : returnDate);
    if (Platform.OS === 'android') setShowDatePicker(false);

    if (dateMode === 'start') {
      setDate(currentDate);
      if (currentDate > returnDate) setReturnDate(currentDate);
    } else {
      if (currentDate < date) Alert.alert("Erreur", "Le retour ne peut pas être avant l'aller.");
      else setReturnDate(currentDate);
    }

    if (Platform.OS === 'android' && pickerMode === 'date') {
      setPickerMode('time');
      setTimeout(() => setShowDatePicker(true), 100);
    }
  };

  // SAUVEGARDE NOUVEAU PATIENT
  const saveNewPatient = async () => {
    if (!newPatient.fullName) return Alert.alert("Erreur", "Nom requis");
    try {
      const saved = await createPatient(newPatient);
      setAllPatients([...allPatients, saved]);
      selectPatient(saved);
      setModalVisible(false);
      setNewPatient({ fullName: '', phone: '', address: '' });
      Alert.alert("Succès", "Patient créé !");
    } catch (err) { Alert.alert("Erreur", "Impossible de créer le patient"); }
  };

  // VALIDATION FINALE
  const handleCreate = async () => {
    if (!patientName || !startLocation || !endLocation) return Alert.alert('Attention', 'Veuillez remplir le patient et les adresses.');
    
    try {
      setLoading(true);
      const rideData = {
        patientName, patientPhone, startLocation, endLocation,
        date: date.toISOString(),
        returnDate: isRoundTrip ? returnDate.toISOString() : null, 
        type, isRoundTrip
      };
      await createRide(rideData);
      Alert.alert('Succès', 'Course ajoutée au planning.');
      // Reset complet
      setPatientName(''); setPatientPhone(''); setPatientAddressMem(''); 
      setStartLocation(''); setEndLocation(''); setIsRoundTrip(false); 
      navigation.navigate('Agenda'); 
    } catch (error) { Alert.alert('Erreur', "Echec de l'enregistrement."); } 
    finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
      <ScrollView style={styles.container} contentContainerStyle={{paddingBottom: 60}} keyboardShouldPersistTaps="handled">
        
        <Text style={styles.headerTitle}>Nouvelle Course</Text>

        {/* --- BLOC 1 : PATIENT (Z-INDEX ÉLEVÉ INDISPENSABLE) --- */}
        <View style={[styles.cardSection, { zIndex: 100 }]}> 
          <View style={styles.rowHeader}>
            <Text style={styles.sectionLabel}>CLIENT / PATIENT</Text>
            <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
              <Ionicons name="person-add" size={14} color="#FFF" />
              <Text style={styles.addBtnText}>Nouveau</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.inputContainer}>
            <Ionicons name="search" size={20} color="#999" style={{marginRight: 10}} />
            <TextInput 
              style={styles.mainInput} 
              placeholder="Nom du patient..." 
              value={patientName} 
              onChangeText={handleNameChange}
            />
            {patientName.length > 0 && (
                <TouchableOpacity onPress={() => {setPatientName(''); setShowSuggestions(false);}}>
                    <Ionicons name="close-circle" size={18} color="#CCC" />
                </TouchableOpacity>
            )}
          </View>

          {/* Badge Téléphone */}
          {patientPhone ? (
             <View style={styles.phoneBadge}>
                <Ionicons name="checkmark-circle" size={14} color="#2E7D32" />
                <Text style={styles.phoneText}>Tél : {patientPhone}</Text>
             </View>
          ) : null}

          {/* Liste Suggestions */}
          {showSuggestions && (
            <View style={styles.suggestionsList}>
              <FlatList
                data={filteredPatients}
                keyExtractor={(item, index) => item._id || index.toString()}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.suggestionRow} onPress={() => selectPatient(item)}>
                    <Text style={styles.suggName}>{item.fullName}</Text>
                    <Text style={styles.suggDetail}>{item.address ? "🏠 " + item.address : "Pas d'adresse"}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}
        </View>

        {/* --- BLOC 2 : TYPE DE TRANSPORT --- */}
        <View style={styles.cardSection}>
           <Text style={styles.sectionLabel}>TYPE DE MISSION</Text>
           <View style={styles.typeGrid}>
              {['Aller', 'Retour', 'Consultation', 'Hospit', 'HDJ'].map((t) => (
                <TouchableOpacity 
                    key={t} 
                    style={[styles.typeChip, type === t && styles.typeChipActive]} 
                    onPress={() => handleTypeChange(t)}
                >
                    <Text style={[styles.typeText, type === t && styles.typeTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
           </View>
        </View>

        {/* --- BLOC 3 : ITINÉRAIRE --- */}
        <View style={[styles.cardSection, { zIndex: 90 }]}>
          <Text style={styles.sectionLabel}>ITINÉRAIRE & LIEUX</Text>

          {/* Raccourcis Hôpitaux */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 15}} contentContainerStyle={{paddingRight:10}}>
            {TOULOUSE_HOSPITALS.map((h, i) => (
              <TouchableOpacity key={i} style={styles.hospitalChip} onPress={() => selectHospital(h)}>
                <Text style={styles.hospitalText}>{h}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Inputs Départ / Arrivée */}
          <View style={styles.routeContainer}>
             <View style={styles.routeInputWrapper}>
                <AddressAutocomplete placeholder="Départ (Ex: Domicile)" icon="navigate-circle" value={startLocation} onSelect={setStartLocation} />
             </View>
             
             {/* Bouton Swap */}
             <TouchableOpacity style={styles.swapBtn} onPress={swapAddresses}>
                <Ionicons name="swap-vertical" size={20} color="#FF6B00" />
             </TouchableOpacity>

             <View style={styles.routeInputWrapper}>
                <AddressAutocomplete placeholder="Destination (Ex: Clinique...)" icon="flag" value={endLocation} onSelect={setEndLocation} />
             </View>
          </View>
        </View>

        {/* --- BLOC 4 : DATES --- */}
        <View style={styles.cardSection}>
          <Text style={styles.sectionLabel}>PLANNING</Text>
          
          <TouchableOpacity style={styles.dateTimeCard} onPress={() => openDatePicker('start')}>
             <View style={{flexDirection:'row', alignItems:'center'}}>
                <Ionicons name="calendar" size={24} color="#FF6B00" />
                <View style={{marginLeft: 15}}>
                    <Text style={{fontSize:12, color:'#888'}}>DÉPART LE</Text>
                    <Text style={{fontSize:16, fontWeight:'bold', color:'#333'}}>
                        {date.toLocaleDateString('fr-FR')} <Text style={{fontWeight:'normal'}}>à</Text> {date.toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}
                    </Text>
                </View>
             </View>
             <Ionicons name="create-outline" size={20} color="#CCC" />
          </TouchableOpacity>

          {/* Switch Retour */}
          <View style={styles.roundTripRow}>
             <Text style={{fontSize:15, fontWeight:'500'}}>Programmer un retour ?</Text>
             <Switch value={isRoundTrip} onValueChange={setIsRoundTrip} trackColor={{ false: "#DDD", true: "#FF6B00" }} />
          </View>

          {isRoundTrip && (
            <TouchableOpacity style={[styles.dateTimeCard, {borderColor: '#1976D2'}]} onPress={() => openDatePicker('return')}>
                <View style={{flexDirection:'row', alignItems:'center'}}>
                    <Ionicons name="return-down-back" size={24} color="#1976D2" />
                    <View style={{marginLeft: 15}}>
                        <Text style={{fontSize:12, color:'#1976D2', fontWeight:'bold'}}>RETOUR LE</Text>
                        <Text style={{fontSize:16, fontWeight:'bold', color:'#333'}}>
                            {returnDate.toLocaleDateString('fr-FR')} à {returnDate.toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
          )}
        </View>

        {/* BOUTON VALIDATION */}
        <TouchableOpacity 
            style={[styles.validateBtn, loading && {opacity: 0.6}]} 
            onPress={handleCreate} 
            disabled={loading}
        >
            {loading ? <ActivityIndicator color="#FFF" /> : (
                <>
                    <Text style={styles.validateText}>VALIDER LA COURSE</Text>
                    <Ionicons name="checkmark-done" size={24} color="#FFF" style={{marginLeft: 10}} />
                </>
            )}
        </TouchableOpacity>

        {/* --- MODAL CRÉATION PATIENT RAPIDE --- */}
        <Modal visible={modalVisible} animationType="fade" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalBody}>
              <Text style={styles.modalHeader}>Ajouter un Patient</Text>
              <TextInput style={styles.modalInput} placeholder="Nom Complet" value={newPatient.fullName} onChangeText={t => setNewPatient({...newPatient, fullName: t})} />
              <TextInput style={styles.modalInput} placeholder="Adresse (Facultatif)" value={newPatient.address} onChangeText={t => setNewPatient({...newPatient, address: t})} />
              <TextInput style={styles.modalInput} placeholder="Téléphone (Facultatif)" keyboardType="phone-pad" value={newPatient.phone} onChangeText={t => setNewPatient({...newPatient, phone: t})} />
              
              <View style={styles.modalActions}>
                 <TouchableOpacity onPress={() => setModalVisible(false)} style={{padding:10}}><Text style={{color:'#666'}}>Annuler</Text></TouchableOpacity>
                 <TouchableOpacity onPress={saveNewPatient} style={styles.modalSaveBtn}><Text style={{color:'#FFF', fontWeight:'bold'}}>Créer</Text></TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* DATE PICKER CACHÉ */}
        {showDatePicker && (
            <DateTimePicker 
                value={dateMode === 'start' ? date : returnDate} 
                mode={pickerMode} is24Hour={true} display="default" 
                onChange={onChangeDate} minimumDate={dateMode === 'start' ? new Date() : date} 
            />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F8', padding: 15 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#1A1A1A', marginBottom: 20, marginTop: 10, marginLeft: 5 },
  
  // SECTIONS CARDS
  cardSection: { backgroundColor: '#FFF', borderRadius: 16, padding: 15, marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#9E9E9E', marginBottom: 10, letterSpacing: 0.5 },
  
  // PATIENT
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  addBtn: { flexDirection: 'row', backgroundColor: '#FF6B00', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, alignItems: 'center' },
  addBtnText: { color: '#FFF', fontSize: 11, fontWeight: 'bold', marginLeft: 4 },
  
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9F9F9', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, borderWidth: 1, borderColor: '#EEE' },
  mainInput: { flex: 1, fontSize: 16, color: '#333' },
  
  phoneBadge: { flexDirection:'row', alignItems:'center', marginTop: 8, backgroundColor: '#E8F5E9', alignSelf:'flex-start', paddingHorizontal:8, paddingVertical:4, borderRadius:6 },
  phoneText: { color: '#2E7D32', fontSize: 12, fontWeight: '600', marginLeft: 5 },

  suggestionsList: { position: 'absolute', top: 85, left: 15, right: 15, backgroundColor: '#FFF', borderRadius: 8, maxHeight: 180, elevation: 10, shadowColor:'#000', shadowOpacity:0.2, shadowRadius:10, zIndex: 999 },
  suggestionRow: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  suggName: { fontWeight: 'bold', fontSize: 15, color: '#333' },
  suggDetail: { fontSize: 12, color: '#666', marginTop: 2 },

  // TYPES
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#EEE' },
  typeChipActive: { backgroundColor: '#FFF3E0', borderColor: '#FF6B00' },
  typeText: { fontSize: 13, color: '#666', fontWeight: '600' },
  typeTextActive: { color: '#E65100' },

  // ROUTE
  hospitalChip: { backgroundColor: '#E1F5FE', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, marginRight: 8 },
  hospitalText: { color: '#0277BD', fontSize: 12, fontWeight: '600' },
  
  routeContainer: { position: 'relative' },
  routeInputWrapper: { marginBottom: 10 },
  swapBtn: { position: 'absolute', right: 20, top: 45, zIndex: 10, backgroundColor: '#FFF', padding: 6, borderRadius: 20, elevation: 3, shadowColor:'#000', shadowOpacity:0.1 },

  // DATES
  dateTimeCard: { flexDirection: 'row', justifyContent:'space-between', alignItems: 'center', backgroundColor: '#F9F9F9', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#EEE', marginBottom: 10 },
  roundTripRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 10, paddingHorizontal: 5 },

  // BOUTON FINAL
  validateBtn: { backgroundColor: '#1A1A1A', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 18, borderRadius: 16, marginTop: 10, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  validateText: { color: '#FFF', fontSize: 16, fontWeight: '800', letterSpacing: 1 },

  // MODAL
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalBody: { width: '85%', backgroundColor: '#FFF', borderRadius: 20, padding: 25, elevation: 10 },
  modalHeader: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  modalInput: { backgroundColor: '#F5F5F5', padding: 12, borderRadius: 10, marginBottom: 12, fontSize: 16 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  modalSaveBtn: { backgroundColor: '#FF6B00', paddingVertical: 12, paddingHorizontal: 25, borderRadius: 10 },
});