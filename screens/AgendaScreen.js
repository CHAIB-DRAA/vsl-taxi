import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, FlatList, ActivityIndicator, StyleSheet,
  Alert, TouchableOpacity, Modal, SafeAreaView, TextInput, Image, ScrollView, KeyboardAvoidingView, Platform, Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import moment from 'moment';
import 'moment/locale/fr';

// 👇 IMPORT DE TON NOUVEAU COMPOSANT
import ScreenWrapper from '../components/ScreenWrapper';

import RideCard from '../components/RideCard'; 
import { useData } from '../contexts/DataContext'; 
import api, { updateRide, shareRide, deleteRide } from '../services/api';

// Config Calendrier
LocaleConfig.locales['fr'] = {
  monthNames: ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'],
  dayNames: ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'],
  dayNamesShort: ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'],
  today: "Aujourd'hui"
};
LocaleConfig.defaultLocale = 'fr';

export default function AgendaScreen() {
  const { allRides, contacts, loading, loadData, handleGlobalRespond } = useData();

  const [selectedDate, setSelectedDate] = useState(moment().format('YYYY-MM-DD'));
  const [showCalendar, setShowCalendar] = useState(true);
  
  const [modals, setModals] = useState({ options: false, share: false, docs: false });
  const [activeRide, setActiveRide] = useState(null);
  
  const [contactToShare, setContactToShare] = useState(null); 
  const [shareNote, setShareNote] = useState(''); 

  const [patientDocs, setPatientDocs] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  const [finishModal, setFinishModal] = useState(false);
  const [billingData, setBillingData] = useState({ kmReel: '', peage: '' });

  // --- CALCULS ---
  const markedDates = useMemo(() => {
    const marks = {};
    allRides.forEach(ride => {
      const day = moment(ride.date).format('YYYY-MM-DD');
      if (!marks[day]) marks[day] = { dots: [] };
      const dotColor = ride.isShared ? '#FF9800' : '#4CAF50';
      if (!marks[day].dots.find(d => d.color === dotColor)) marks[day].dots.push({ key: ride._id, color: dotColor });
    });
    marks[selectedDate] = { ...marks[selectedDate], selected: true, selectedColor: '#FF6B00' };
    return marks;
  }, [allRides, selectedDate]);

  const dailyRides = useMemo(() => {
    return allRides.filter(r => 
      moment(r.date).format('YYYY-MM-DD') === selectedDate &&
      (!r.isShared || r.statusPartage !== 'refused') 
    ).sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [allRides, selectedDate]);


  // --- ACTIONS ---
  const handleStatusChange = async (ride, action) => {
    try {
      if (action === 'start') {
        await updateRide(ride._id, { startTime: new Date().toISOString() });
        loadData(true);
      } else if (action === 'finish') {
        setActiveRide(ride);
        setBillingData({ kmReel: '', peage: '' });
        setFinishModal(true);
      }
    } catch (err) { Alert.alert('Erreur', "Action impossible."); }
  };

  const confirmFinishRide = async () => {
    if (!billingData.kmReel) return Alert.alert("Erreur", "KM requis.");
    try {
      await updateRide(activeRide._id, {
        endTime: new Date().toISOString(),
        realDistance: parseFloat(billingData.kmReel),
        tolls: parseFloat(billingData.peage) || 0,
        status: 'Terminée'
      });
      setFinishModal(false);
      loadData(true);
      Alert.alert("Succès", "Course terminée.");
    } catch (err) { Alert.alert("Erreur", "Echec clôture."); }
  };

  const fetchRideDocuments = async (ride) => {
    if (!ride) return;
    try {
      setLoadingDocs(true);
      const res = await api.get(`/documents/by-ride/${ride._id}`);
      setPatientDocs(res.data);
      setModals({ options: false, share: false, docs: true });
    } catch (err) {
      Alert.alert("Info", "Impossible de récupérer le dossier patient.");
    } finally {
      setLoadingDocs(false);
    }
  };

  const finalizeShare = async () => {
    if (!activeRide) return Alert.alert("Erreur", "Aucune course sélectionnée");
    if (!contactToShare || !contactToShare.contactId) return Alert.alert("Erreur", "Contact invalide");

    const targetUserId = contactToShare.contactId._id;
    const rideId = activeRide._id;

    try {
      await shareRide(rideId, targetUserId, shareNote);
      setModals({ ...modals, share: false });
      setContactToShare(null);
      setShareNote('');
      loadData(true);
      Alert.alert('Succès', `Course envoyée à ${contactToShare.contactId.fullName}`);
    } catch (err) { 
      const message = err.response?.data?.message || "Erreur de connexion";
      Alert.alert('Échec du partage', message); 
    }
  };

  const handleDelete = async () => {
    try { 
        await deleteRide(activeRide._id); 
        setModals({...modals, options:false}); 
        loadData(true);
    }
    catch(e) { Alert.alert('Erreur', 'Suppression impossible'); }
  };

  const selectContactForShare = (contactItem) => {
    setContactToShare(contactItem); 
    setShareNote(''); 
  };
  const closeShareModal = () => {
    setModals({...modals, share: false});
    setContactToShare(null);
    setShareNote('');
  };

  return (
    // 👇 LE WRAPPER GÈRE LA BARRE DU HAUT
    <ScreenWrapper>
      
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Planning</Text>
        <TouchableOpacity onPress={() => setShowCalendar(!showCalendar)}>
          <Ionicons name={showCalendar ? "chevron-up" : "calendar-outline"} size={24} color="#FF6B00" />
        </TouchableOpacity>
      </View>

      {/* CALENDRIER */}
      {showCalendar && (
        <Calendar
          onDayPress={(day) => setSelectedDate(day.dateString)}
          markedDates={markedDates}
          markingType={'multi-dot'}
          theme={{ todayTextColor: '#FF6B00', selectedDayBackgroundColor: '#FF6B00', arrowColor: '#FF6B00' }}
        />
      )}

      {/* LISTE DES COURSES */}
      <View style={styles.listContainer}>
        <View style={styles.listHeader}>
          <Text style={styles.dateTitle}>{moment(selectedDate).format('dddd D MMMM')}</Text>
          <View style={styles.countBadge}><Text style={styles.countText}>{dailyRides.length}</Text></View>
        </View>

        {loading ? <ActivityIndicator color="#FF6B00" /> : (
          <FlatList
            data={dailyRides}
            keyExtractor={item => item._id}
            renderItem={({ item }) => (
              <RideCard 
                ride={item}
                onStatusChange={handleStatusChange} 
                onPress={(r) => { setActiveRide(r); setModals(prev => ({ ...prev, options: true })); }}
                onShare={(r) => { setActiveRide(r); setModals(prev => ({ ...prev, share: true })); }}
                onRespond={(ride, action) => handleGlobalRespond(ride._id, action)} 
              />
            )}
            ListEmptyComponent={<Text style={styles.emptyText}>Aucune course ce jour.</Text>}
            refreshing={loading}
            onRefresh={() => loadData(false)}
            
            // 👇 C'EST ICI LA CLÉ POUR LES BOUTONS DU BAS 👇
            // On met un grand paddingBottom pour que la dernière carte remonte au-dessus des boutons Android
            contentContainerStyle={{ padding: 15, paddingBottom: 120 }}
          />
        )}
      </View>

      {/* ================= MODALS LOCALES ================= */}

      {/* 1. OPTIONS */}
      <Modal visible={modals.options} animationType="fade" transparent>
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setModals({ ...modals, options: false })} activeOpacity={1}>
          <View style={styles.optionSheet}>
            <Text style={styles.sheetTitle}>Gérer la course</Text>
            <TouchableOpacity style={styles.sheetBtn} onPress={() => fetchRideDocuments(activeRide)}>
              <View style={[styles.iconBox, {backgroundColor: '#E3F2FD'}]}><Ionicons name="folder-open" size={24} color="#1976D2" /></View>
              <Text style={styles.sheetBtnText}>Voir Dossier</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sheetBtn} onPress={() => setModals({ options: false, share: true })}>
              <View style={[styles.iconBox, {backgroundColor: '#FFF3E0'}]}><Ionicons name="share-social" size={24} color="#EF6C00" /></View>
              <Text style={styles.sheetBtnText}>Partager</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sheetBtn} onPress={handleDelete}>
              <View style={[styles.iconBox, {backgroundColor: '#FFEBEE'}]}><Ionicons name="trash" size={24} color="#D32F2F" /></View>
              <Text style={[styles.sheetBtnText, { color: '#D32F2F' }]}>Supprimer</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 2. DOCS */}
      <Modal visible={modals.docs} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.docModalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.headerTitle}>Dossier Patient</Text>
            <TouchableOpacity onPress={() => setModals({...modals, docs: false})}><Ionicons name="close-circle" size={30} color="#999"/></TouchableOpacity>
          </View>
          {loadingDocs ? <ActivityIndicator size="large" color="#FF6B00" style={{marginTop:50}}/> : (
            <ScrollView contentContainerStyle={{padding: 20}}>
              {patientDocs.map((doc, index) => (
                  <View key={index} style={styles.docCard}>
                    <Text style={styles.docTitle}>{doc.type}</Text>
                    <Image source={{ uri: doc.imageData }} style={styles.docImage} resizeMode="contain"/>
                  </View>
              ))}
              {patientDocs.length === 0 && <Text style={styles.emptyText}>Aucun document.</Text>}
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* 3. PARTAGE */}
      <Modal visible={modals.share} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeShareModal}><Ionicons name="close" size={28} color="#333"/></TouchableOpacity>
            <Text style={styles.headerTitle}>Partager la course</Text>
          </View>
          {!contactToShare ? (
            <FlatList
              data={contacts}
              keyExtractor={(item) => item._id}
              contentContainerStyle={{padding: 20}}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.contactRow} onPress={() => selectContactForShare(item)}>
                  <View style={{flexDirection:'row', alignItems:'center'}}>
                    <View style={styles.avatarPlaceholder}><Text style={styles.avatarText}>{item.contactId?.fullName?.charAt(0)}</Text></View>
                    <Text style={styles.contactName}>{item.contactId?.fullName || "Chauffeur"}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#CCC" />
                </TouchableOpacity>
              )}
            />
          ) : (
            <ScrollView contentContainerStyle={{padding: 20}}>
              <View style={styles.selectedContactHeader}>
                 <View style={styles.avatarPlaceholder}><Text style={styles.avatarText}>{contactToShare.contactId?.fullName?.charAt(0)}</Text></View>
                 <Text style={styles.selectedContactName}>Pour : {contactToShare.contactId?.fullName}</Text>
              </View>

              {activeRide && activeRide.patientPhone ? (
                 <View style={styles.phoneInfoBox}>
                    <Ionicons name="call" size={20} color="#4CAF50" />
                    <Text style={styles.phoneInfoText}>N° patient transmis auto.</Text>
                 </View>
              ) : (
                 <View style={[styles.phoneInfoBox, {backgroundColor: '#FFEBEE'}]}>
                    <Ionicons name="alert-circle" size={20} color="#D32F2F" />
                    <Text style={[styles.phoneInfoText, {color: '#D32F2F'}]}>Attention : Pas de n° enregistré.</Text>
                 </View>
              )}

              <Text style={styles.noteLabel}>Message (Optionnel) :</Text>
              <TextInput style={styles.noteInput} placeholder="Code porte, étage..." multiline numberOfLines={3} value={shareNote} onChangeText={setShareNote} />
              
              <TouchableOpacity style={styles.sendShareBtn} onPress={finalizeShare}>
                <Ionicons name="paper-plane" size={20} color="#FFF" style={{marginRight: 8}}/>
                <Text style={styles.sendShareText}>ENVOYER</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </KeyboardAvoidingView>
      </Modal>

      {/* 4. FIN DE COURSE */}
      <Modal visible={finishModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.finishCard}>
            <Text style={styles.finishTitle}>Fin de Course</Text>
            <TextInput style={styles.input} placeholder="KM Réels" keyboardType="numeric" value={billingData.kmReel} onChangeText={t => setBillingData({...billingData, kmReel: t})}/>
            <TextInput style={styles.input} placeholder="Péages (€)" keyboardType="numeric" value={billingData.peage} onChangeText={t => setBillingData({...billingData, peage: t})}/>
            <View style={styles.btnRow}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setFinishModal(false)}><Text>Annuler</Text></TouchableOpacity>
                <TouchableOpacity style={styles.confirmBtn} onPress={confirmFinishRide}><Text style={{color:'#FFF'}}>VALIDER</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  // Plus besoin de padding ici, ScreenWrapper gère le fond et le haut
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, backgroundColor: '#FFF' },
  headerTitle: { fontSize: 22, fontWeight: 'bold' },
  listContainer: { flex: 1, paddingHorizontal: 15 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 15 },
  dateTitle: { fontSize: 18, fontWeight: '600', textTransform: 'capitalize' },
  countBadge: { backgroundColor: '#FF6B00', borderRadius: 12, paddingHorizontal: 10, justifyContent:'center' },
  countText: { color: '#FFF', fontWeight: 'bold' },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 20 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  optionSheet: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  sheetTitle: { textAlign: 'center', fontWeight: 'bold', color: '#999', marginBottom: 20 },
  sheetBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderColor: '#F5F5F5' },
  iconBox: { width: 40, height: 40, borderRadius: 20, justifyContent:'center', alignItems:'center', marginRight: 15 },
  sheetBtnText: { fontSize: 16, fontWeight: '500', color: '#333' },

  // Styles Docs & Share
  docModalContainer: { flex: 1, backgroundColor: '#F2F2F2' },
  docCard: { backgroundColor: '#FFF', borderRadius: 12, marginBottom: 20, padding: 10 },
  docTitle: { fontWeight: 'bold', marginBottom: 5 },
  docImage: { width: '100%', height: 200 },
  contactRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 1, borderColor: '#EEE' },
  contactName: { fontSize: 16, fontWeight: '500' },
  selectedContactName: { fontSize: 18, fontWeight: 'bold', color: '#E65100', marginBottom: 10 },
  noteInput: { backgroundColor: '#F5F5F5', borderRadius: 10, padding: 15, height: 100, marginBottom: 20 },
  sendShareBtn: { backgroundColor: '#FF6B00', padding: 15, borderRadius: 10, alignItems: 'center', flexDirection:'row', justifyContent:'center' },
  sendShareText: { color: '#FFF', fontWeight: 'bold' },
  finishCard: { backgroundColor: '#FFF', padding: 20, borderRadius: 15, margin: 20 },
  finishTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 10, marginBottom: 15, fontSize: 16 },
  btnRow: { flexDirection: 'row', justifyContent: 'space-between' },
  cancelBtn: { padding: 15 },
  confirmBtn: { backgroundColor: '#4CAF50', padding: 15, borderRadius: 10 },
  modalHeader: { padding: 20, flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#FFF' },
  phoneInfoBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5E9', padding: 12, borderRadius: 8, marginBottom: 20 },
  phoneInfoText: { marginLeft: 10, fontSize: 13, color: '#2E7D32', flex: 1 },
  noteLabel: { fontWeight: 'bold', color: '#555', marginBottom: 10 },
  avatarPlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFE0B2', justifyContent:'center', alignItems:'center', marginRight: 15 },
  avatarText: { color: '#EF6C00', fontWeight: 'bold', fontSize: 18 },
  selectedContactHeader: { flexDirection: 'row',