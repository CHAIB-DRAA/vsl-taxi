import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  ScrollView, Alert, Switch, KeyboardAvoidingView, Platform, Modal, FlatList 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

import AddressAutocomplete from '../components/AddressAutocomplete'; 
import { createRide, getPatients, createPatient } from '../services/api';

export default function CreateRideScreen({ navigation }) {
  // --- STATES ---
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState(''); 
  
  const [startLocation, setStartLocation] = useState('');
  const [endLocation, setEndLocation] = useState('');
  
  // --- GESTION DES DATES (Aller & Retour) ---
  const [date, setDate] = useState(new Date()); // Date Aller
  const [returnDate, setReturnDate] = useState(new Date()); // Date Retour
  
  // Correction Crash Android : On gère le mode (date vs time)
  const [dateMode, setDateMode] = useState('start'); // 'start' ou 'return' (Quelle variable on modifie ?)
  const [pickerMode, setPickerMode] = useState('date'); // 'date' ou 'time' (Quel écran on affiche ?)
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const [type, setType] = useState('Aller');
  const [isRoundTrip, setIsRoundTrip] = useState(false);
  const [loading, setLoading] = useState(false);

  // --- STATES INTELLIGENCE PATIENT ---
  const [allPatients, setAllPatients] = useState([]);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // --- MODALS ---
  const [modalVisible, setModalVisible] = useState(false);
  const [newPatient, setNewPatient] = useState({ fullName: '', phone: '', address: '' });

  // CHARGEMENT
  useEffect(() => { loadPatients(); }, []);
  const loadPatients = async () => {
    try {
      const data = await getPatients();
      setAllPatients(data || []);
    } catch (err) { console.log("Erreur chargement patients"); }
  };

  // AUTO-COMPLÉTION
  const handleNameChange = (text) => {
    setPatientName(text);
    if (text.length > 1) {
      const filtered = allPatients.filter(p => p.fullName && p.fullName.toLowerCase().includes(text.toLowerCase()));
      setFilteredPatients(filtered);
      setShowSuggestions(filtered.length > 0);
    } else { setShowSuggestions(false); }
  };

  const selectPatient = (patient) => {
    setPatientName(patient.fullName);
    if (patient.phone) setPatientPhone(patient.phone);
    else setPatientPhone('');
    if (patient.address) setStartLocation(patient.address);
    setShowSuggestions(false);
  };

  // NOUVEAU PATIENT
  const saveNewPatient = async () => {
    if (!newPatient.fullName) return Alert.alert("Erreur", "Nom requis");
    try {
      const saved = await createPatient(newPatient);
      setAllPatients([...allPatients, saved]);
      setPatientName(saved.fullName);
      setPatientPhone(saved.phone);
      setStartLocation(saved.address);
      setModalVisible(false);
      setNewPatient({ fullName: '', phone: '', address: '' });
      Alert.alert("Succès", "Fiche créée !");
    } catch (err) { Alert.alert("Erreur", "Problème création"); }
  };

  // --- LOGIQUE DATE PICKER (CORRIGÉE POUR ANDROID) ---
  const openDatePicker = (target) => {
    setDateMode(target); // On cible 'start' ou 'return'
    
    if (Platform.OS === 'ios') {
      setPickerMode('datetime'); // iOS supporte date+heure
    } else {
      setPickerMode('date'); // Android doit commencer par la date
    }
    setShowDatePicker(true);
  };

  const onChangeDate = (event, selectedDate) => {
    // Si l'utilisateur annule
    if (event.type === 'dismissed') {
      setShowDatePicker(false);
      return;
    }

    const currentDate = selectedDate || (dateMode === 'start' ? date : returnDate);

    // Sur Android, le picker se ferme après sélection
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    // 1. Sauvegarde de la date/heure choisie
    if (dateMode === 'start') {
      setDate(currentDate);
      // Si la nouvelle date de départ est après le retour, on pousse le retour
      if (currentDate > returnDate) {
          setReturnDate(currentDate);
      }
    } else {
      // Mode retour
      if (currentDate < date) {
        Alert.alert("Attention", "Le retour ne peut pas être avant l'aller.");
        // On ne met pas à jour pour éviter l'incohérence
      } else {
        setReturnDate(currentDate);
      }
    }

    // 2. CHAÎNAGE ANDROID : Date -> puis Heure
    if (Platform.OS === 'android' && pickerMode === 'date') {
      setPickerMode('time'); // On passe en mode heure
      // Petit délai pour rouvrir le picker proprement
      setTimeout(() => setShowDatePicker(true), 100);
    }
  };

  // CRÉATION COURSE
  const handleCreate = async () => {
    if (!patientName || !startLocation || !endLocation) return Alert.alert('Erreur', 'Champs manquants.');

    try {
      setLoading(true);
      const rideData = {
        patientName,
        patientPhone,
        startLocation,
        endLocation,
        date: date.toISOString(),
        returnDate: isRoundTrip ? returnDate.toISOString() : null, 
        type,
        isRoundTrip
      };

      await createRide(rideData);
      
      Alert.alert('Succès', 'Course enregistrée.');
      // Reset
      setPatientName(''); setPatientPhone(''); setStartLocation(''); setEndLocation('');
      setIsRoundTrip(false); 
      navigation.navigate('Agenda'); 

    } catch (error) { Alert.alert('Erreur', "Echec création."); } 
    finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
      <ScrollView style={styles.container} contentContainerStyle={{paddingBottom: 40}} keyboardShouldPersistTaps="handled">
        
        <Text style={styles.headerTitle}>Nouvelle Course</Text>

        {/* SECTION PATIENT */}
        <View style={[styles.section, { zIndex: 10 }]}> 
          <View style={styles.rowHeader}>
            <Text style={styles.label}>Patient</Text>
            <TouchableOpacity style={styles.createBtn} onPress={() => setModalVisible(true)}>
              <Ionicons name="add" size={16} color="#FF6B00" />
              <Text style={styles.createBtnText}>Nouveau</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.inputRow}>
            <Ionicons name="person-outline" size={20} color="#666" style={styles.icon} />
            <TextInput style={styles.input} placeholder="Rechercher nom..." value={patientName} onChangeText={handleNameChange} />
            {patientName.length > 0 && (
                <TouchableOpacity onPress={() => {setPatientName(''); setShowSuggestions(false);}}><Ionicons name="close-circle" size={18} color="#CCC" /></TouchableOpacity>
            )}
          </View>
          {patientPhone ? (<View style={{flexDirection:'row', marginTop:5, alignItems:'center'}}><Ionicons name="call" size={14} color="#4CAF50" /><Text style={{fontSize:12, color:'#4CAF50', marginLeft:5, fontWeight:'bold'}}>Tél récupéré : {patientPhone}</Text></View>) : null}
          
          {showSuggestions && (
            <View style={styles.suggestionsBox}>
              <FlatList
                data={filteredPatients}
                keyExtractor={(item, index) => item._id || index.toString()}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.suggestionItem} onPress={() => selectPatient(item)}>
                    <Text style={{fontWeight:'bold', color:'#333'}}>{item.fullName}</Text>
                    <Text style={{fontSize:11, color:'#666'}}>{item.address} {item.phone ? `• 📞 ${item.phone}` : ''}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}
        </View>

        {/* ITINÉRAIRE */}
        <View style={styles.section}>
          <Text style={styles.label}>Itinéraire</Text>
          <View style={{ zIndex: 5, marginBottom: 10 }}>
            <AddressAutocomplete placeholder="Lieu de prise en charge" icon="navigate-circle" value={startLocation} onSelect={setStartLocation} />
          </View>
          <View style={{ zIndex: 4 }}>
            <AddressAutocomplete placeholder="Lieu de destination" icon="flag-outline" value={endLocation} onSelect={setEndLocation} />
          </View>
        </View>

        {/* --- SECTION PLANIFICATION (DATES) --- */}
        <View style={styles.section}>
          <Text style={styles.label}>Date et Heure</Text>
          
          {/* BOUTON DATE ALLER */}
          <TouchableOpacity style={styles.dateBtn} onPress={() => openDatePicker('start')}>
            <Ionicons name="calendar-outline" size={20} color="#FF6B00" />
            <View>
                <Text style={styles.dateLabelMini}>Départ le :</Text>
                <Text style={styles.dateText}>{date.toLocaleDateString('fr-FR')} à {date.toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}</Text>
            </View>
          </TouchableOpacity>

          {/* SWITCH ALLER-RETOUR */}
          <View style={styles.switchRowInside}>
             <Text style={styles.switchLabel}>Ajouter un Retour ?</Text>
             <Switch value={isRoundTrip} onValueChange={setIsRoundTrip} trackColor={{ false: "#767577", true: "#FF6B00" }} />
          </View>

          {/* BOUTON DATE RETOUR */}
          {isRoundTrip && (
            <TouchableOpacity style={[styles.dateBtn, styles.returnBtn]} onPress={() => openDatePicker('return')}>
                <Ionicons name="calendar" size={20} color="#1976D2" />
                <View>
                    <Text style={styles.dateLabelMini}>Retour le :</Text>
                    <Text style={styles.dateText}>{returnDate.toLocaleDateString('fr-FR')} à {returnDate.toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}</Text>
                </View>
            </TouchableOpacity>
          )}

          {/* LE PICKER CACHÉ & CONFIGURÉ */}
          {showDatePicker && (
            <DateTimePicker 
                value={dateMode === 'start' ? date : returnDate} 
                mode={pickerMode} // Dynamique (date puis time sur Android)
                is24Hour={true}
                display="default" 
                onChange={onChangeDate} 
                minimumDate={dateMode === 'start' ? new Date() : date} 
            />
          )}
        </View>

        {/* TYPE TRANSPORT */}
        <View style={styles.section}>
          <Text style={styles.label}>Type de transport</Text>
          <View style={styles.typeRow}>
            {['Aller', 'Retour', 'Consultation', 'Hospit', 'HDJ'].map((t) => (
              <TouchableOpacity key={t} style={[styles.typeBadge, type === t && styles.typeSelected]} onPress={() => setType(t)}>
                <Text style={[styles.typeText, type === t && styles.typeTextSelected]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* BOUTON VALIDER */}
        <TouchableOpacity style={[styles.submitBtn, loading && { opacity: 0.7 }]} onPress={handleCreate} disabled={loading}>
          <Text style={styles.submitText}>{loading ? "Enregistrement..." : "Confirmer la course"}</Text>
          <Ionicons name="checkmark-circle" size={24} color="#FFF" style={{ marginLeft: 10 }} />
        </TouchableOpacity>

        {/* MODAL PATIENT */}
        <Modal visible={modalVisible} animationType="slide" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Nouveau Patient</Text>
              <View style={styles.modalField}><Text style={styles.modalLabel}>Nom Complet *</Text><TextInput style={styles.modalInput} placeholder="Ex: Mme Dupont" value={newPatient.fullName} onChangeText={t => setNewPatient({...newPatient, fullName: t})} /></View>
              <View style={styles.modalField}><Text style={styles.modalLabel}>Adresse</Text><TextInput style={styles.modalInput} placeholder="Ex: 12 Rue des Lilas..." value={newPatient.address} onChangeText={t => setNewPatient({...newPatient, address: t})} /></View>
              <View style={styles.modalField}><Text style={styles.modalLabel}>Téléphone</Text><TextInput style={styles.modalInput} placeholder="Ex: 06 12 34 56 78" keyboardType="phone-pad" value={newPatient.phone} onChangeText={t => setNewPatient({...newPatient, phone: t})} /></View>
              <View style={styles.modalButtons}>
                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalBtnCancel}><Text style={{color:'#666', fontWeight:'bold'}}>Annuler</Text></TouchableOpacity>
                <TouchableOpacity onPress={saveNewPatient} style={styles.modalBtnSave}><Text style={{color:'#FFF', fontWeight:'bold'}}>Enregistrer</Text></TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA', padding: 20 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 20, marginTop: 10 },
  section: { marginBottom: 20 },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  label: { fontSize: 14, fontWeight: '600', color: '#666', marginLeft: 5 },
  createBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF3E0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  createBtnText: { color: '#FF6B00', fontWeight: 'bold', fontSize: 12, marginLeft: 4 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, paddingHorizontal: 15, paddingVertical: 12, borderWidth: 1, borderColor: '#EEE' },
  input: { flex: 1, marginLeft: 10, fontSize: 16 },
  suggestionsBox: { backgroundColor: '#FFF', borderRadius: 8, borderWidth: 1, borderColor: '#DDD', maxHeight: 150, elevation: 5, marginTop: -5, zIndex: 100 },
  suggestionItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  
  // DATES STYLES
  dateBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#FF6B00', marginBottom: 10 },
  returnBtn: { borderColor: '#1976D2', marginTop: 10 },
  dateLabelMini: { fontSize: 10, color:'#888', marginLeft: 10, textTransform:'uppercase' },
  dateText: { marginLeft: 10, fontSize: 16, color: '#333', fontWeight: '500' },
  
  switchRowInside: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F0F0F0', padding: 10, borderRadius: 8, marginVertical: 5 },
  switchLabel: { fontSize: 14, fontWeight: '500', color: '#333' },

  typeRow: { flexDirection: 'row', flexWrap: 'wrap' },
  typeBadge: { paddingVertical: 10, paddingHorizontal: 15, margin: 4, backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1, borderColor: '#EEE' },
  typeSelected: { backgroundColor: '#FF6B00', borderColor: '#FF6B00' },
  typeText: { color: '#666', fontWeight: '500' },
  typeTextSelected: { color: '#FFF', fontWeight: 'bold' },
  
  submitBtn: { backgroundColor: '#4CAF50', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 18, borderRadius: 15, shadowColor: '#4CAF50', shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  submitText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 20, padding: 25, elevation: 10 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#333' },
  modalField: { marginBottom: 15 },
  modalLabel: { fontSize: 12, color: '#666', marginBottom: 5, fontWeight: '600' },
  modalInput: { backgroundColor: '#F5F5F5', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#EEE', fontSize: 16 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  modalBtnCancel: { padding: 15, flex: 1, alignItems: 'center' },
  modalBtnSave: { backgroundColor: '#FF6B00', padding: 15, borderRadius: 10, flex: 1, alignItems: 'center', marginLeft: 10 }
});