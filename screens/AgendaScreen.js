import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, ActivityIndicator, StyleSheet,
  Alert, TouchableOpacity, Modal, TextInput, Image, ScrollView, KeyboardAvoidingView, Platform, Dimensions, Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import moment from 'moment';
import 'moment/locale/fr';

// Import Wrapper & Composants
import ScreenWrapper from '../components/ScreenWrapper';
import RideCard from '../components/RideCard'; 

// Contexte & API
import { useData } from '../contexts/DataContext'; 
import api, { updateRide, shareRide, deleteRide } from '../services/api';

const { height } = Dimensions.get('window');

// Config Calendrier FR
LocaleConfig.locales['fr'] = {
  monthNames: ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'],
  dayNames: ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'],
  dayNamesShort: ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'],
  today: "Aujourd'hui"
};
LocaleConfig.defaultLocale = 'fr';

export default function AgendaScreen({ navigation }) {
  const { allRides, contacts, loading, loadData, handleGlobalRespond } = useData();

  const [selectedDate, setSelectedDate] = useState(moment().format('YYYY-MM-DD'));
  const [showCalendar, setShowCalendar] = useState(true);
  
  // États Modals
  const [modals, setModals] = useState({ options: false, share: false, docs: false });
  const [activeRide, setActiveRide] = useState(null);
  
  // États Partage
  const [contactToShare, setContactToShare] = useState(null); 
  const [shareNote, setShareNote] = useState(''); 

  // États Docs & PMT
  const [patientDocs, setPatientDocs] = useState([]);
  const [allPMTs, setAllPMTs] = useState([]); 
  const [loadingDocs, setLoadingDocs] = useState(false);

  // États Fin de course & Facturation
  const [finishModal, setFinishModal] = useState(false);
  const [billingData, setBillingData] = useState({ kmReel: '', peage: '' });

  // --- 1. CHARGEMENT DES PMT ---
  useEffect(() => {
    fetchGlobalPMTs();
  }, [allRides]); 

  const fetchGlobalPMTs = async () => {
    try {
      const res = await api.get('/documents/pmts/all');
      setAllPMTs(res.data);
    } catch (err) {
      console.log("Info: Chargement PMT silencieux");
    }
  };

  // --- 2. CALCUL INTELLIGENT DU PMT ---
  const getPMTStatusForRide = (ride) => {
    const typesMedicaux = ['VSL', 'Ambulance', 'Taxi', 'Aller', 'Retour', 'Consultation'];
    if (!typesMedicaux.includes(ride.type) || ride.endTime) return null;

    const patientPMTs = allPMTs.filter(doc => doc.patientName === ride.patientName);
    
    if (patientPMTs.length === 0) {
        return { color: '#D32F2F', text: 'PMT MANQUANT (A RÉCUPÉRER)', icon: 'alert-circle' };
    }

    patientPMTs.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
    const lastPMT = patientPMTs[0];
    
    const pmtDate = new Date(lastPMT.uploadDate);
    const maxQuota = lastPMT.maxRides || 1; 

    if (maxQuota >= 1000) {
        return { color: '#4CAF50', text: 'PMT VALIDE (SÉRIE ILLIMITÉE)', icon: 'checkmark-circle' };
    }

    const ridesSincePMT = allRides.filter(r => {
        return r.patientName === ride.patientName && 
               new Date(r.date) >= pmtDate && 
               r.status !== 'Annulée';
    });

    let consumed = 0;
    ridesSincePMT.forEach(r => {
        if (r.isRoundTrip) consumed += 1;
        else consumed += 0.5;
    });

    const remaining = maxQuota - consumed;

    if (remaining <= 0) {
        return { color: '#D32F2F', text: `PMT ÉPUISÉ (${consumed}/${maxQuota}) - NOUVEAU BON REQUIS`, icon: 'warning' };
    }
    else if (remaining <= 1) {
        return { color: '#FF9800', text: `PMT BIENTÔT FINI (Reste ${remaining} AR)`, icon: 'alert-circle' };
    }
    else {
        return { color: '#4CAF50', text: `PMT DISPONIBLE (Reste ${remaining} AR)`, icon: 'document-text' };
    }
  };

  // --- 3. MAPPY & ACTIONS (CORRIGÉ AVEC LE HASH #) ---

  const openMappyRoute = () => {
    if (!activeRide) return;

    // Sécurité si adresses vides
    const startAddr = activeRide.startLocation || "";
    const endAddr = activeRide.endLocation || "";

    if (!startAddr || !endAddr) {
        return Alert.alert("Erreur", "Adresses manquantes pour le calcul.");
    }

    // Encodage propre des adresses pour les URL (espaces -> %20, etc.)
    const start = encodeURIComponent(startAddr);
    const end = encodeURIComponent(endAddr);

    // ✅ NOUVEAU FORMAT CORRIGÉ (avec # et /car)
    // Exemple : https://fr.mappy.com/itineraire#/voiture/Depart/Arrivee/car
    const url = `https://fr.mappy.com/itineraire#/voiture/${start}/${end}/car`;

    Linking.openURL(url).catch(err => {
      Alert.alert("Erreur", "Impossible d'ouvrir le navigateur.");
    });
  };

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

  // --- 4. AUTRES FONCTIONS ---
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

  const fetchRideDocuments = async (ride) => {
    if (!ride) return;
    try {
      setLoadingDocs(true);
      const res = await api.get(`/documents/by-ride/${ride._id}`);
      setPatientDocs(res.data);
      setModals({ options: false, share: false, docs: true });
    } catch (err) { Alert.alert("Info", "Erreur récupération dossier."); } 
    finally { setLoadingDocs(false); }
  };

  const finalizeShare = async () => {
    if (!activeRide || !contactToShare) return;
    try {
      await shareRide(activeRide._id, contactToShare.contactId._id, shareNote);
      setModals({ ...modals, share: false });
      setContactToShare(null); setShareNote('');
      loadData(true); Alert.alert('Succès', `Course envoyée.`);
    } catch (err) { Alert.alert('Échec', "Erreur partage."); }
  };

  const handleDelete = async () => {
    try { await deleteRide(activeRide._id); setModals({...modals, options:false}); loadData(true); }
    catch(e) { Alert.alert('Erreur', 'Suppression impossible'); }
  };

  const selectContactForShare = (contactItem) => { setContactToShare(contactItem); setShareNote(''); };
  const closeShareModal = () => { setModals({...modals, share: false}); setContactToShare(null); setShareNote(''); };

  // ================= RENDER =================
  return (
    <ScreenWrapper>
      
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Planning</Text>
        <View style={styles.headerRightButtons}>
            <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={[styles.iconButton, {marginRight: 10}]}>
              <Ionicons name="settings-outline" size={24} color="#333" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowCalendar(!showCalendar)} style={[styles.iconButton, {backgroundColor: '#FFF3E0'}]}>
              <Ionicons name={showCalendar ? "chevron-up" : "calendar-outline"} size={24} color="#FF6B00" />
            </TouchableOpacity>
        </View>
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

        {loading ? <ActivityIndicator color="#FF6B00" size="large" style={{marginTop: 50}} /> : (
          <FlatList
            data={dailyRides}
            keyExtractor={item => item._id}
            renderItem={({ item }) => {
              const pmtStatus = getPMTStatusForRide(item);
              return (
                <View style={styles.rideBlock}>
                  {/* ALERTE PMT */}
                  {pmtStatus && (
                    <View style={[styles.pmtHeader, { backgroundColor: pmtStatus.color }]}>
                      <Ionicons name={pmtStatus.icon} size={14} color="#FFF" />
                      <Text style={styles.pmtHeaderText}>{pmtStatus.text}</Text>
                    </View>
                  )}
                  <RideCard 
                    ride={item}
                    onStatusChange={handleStatusChange} 
                    onPress={(r) => { setActiveRide(r); setModals(prev => ({ ...prev, options: true })); }}
                    onShare={(r) => { setActiveRide(r); setModals(prev => ({ ...prev, share: true })); }}
                    onRespond={(ride, action) => handleGlobalRespond(ride._id, action)} 
                  />
                </View>
              );
            }}
            ListEmptyComponent={
                <View style={styles.emptyContainer}>
                    <Ionicons name="car-sport-outline" size={50} color="#DDD" />
                    <Text style={styles.emptyText}>Aucune course ce jour.</Text>
                </View>
            }
            refreshing={loading}
            onRefresh={() => { loadData(false); fetchGlobalPMTs(); }} 
            contentContainerStyle={{ padding: 15, paddingBottom: 160 }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* ================= MODALS ================= */}

      {/* 1. OPTIONS */}
      <Modal visible={modals.options} animationType="fade" transparent>
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setModals({ ...modals, options: false })} activeOpacity={1}>
          <View style={styles.optionSheet}>
            <View style={styles.sheetHandle} /> 
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
            <TouchableOpacity onPress={() => setModals({...modals, docs: false})} hitSlop={{top:10, bottom:10, left:10, right:10}}>
                <Ionicons name="close-circle" size={32} color="#999"/>
            </TouchableOpacity>
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
            <TouchableOpacity onPress={closeShareModal} hitSlop={{top:10, bottom:10, left:10, right:10}}>
                <Ionicons name="close" size={28} color="#333"/>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Partager la course</Text>
            <View style={{width: 28}} /> 
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
            <ScrollView contentContainerStyle={{padding: 20}} keyboardShouldPersistTaps="handled">
              <View style={styles.selectedContactHeader}>
                 <View style={styles.avatarPlaceholder}><Text style={styles.avatarText}>{contactToShare.contactId?.fullName?.charAt(0)}</Text></View>
                 <Text style={styles.selectedContactName}>Pour : {contactToShare.contactId?.fullName}</Text>
              </View>
              <Text style={styles.noteLabel}>Message (Optionnel) :</Text>
              <TextInput style={styles.noteInput} placeholder="Info..." multiline numberOfLines={3} value={shareNote} onChangeText={setShareNote} textAlignVertical="top"/>
              <TouchableOpacity style={styles.sendShareBtn} onPress={finalizeShare}>
                <Ionicons name="paper-plane" size={20} color="#FFF" style={{marginRight: 8}}/>
                <Text style={styles.sendShareText}>ENVOYER</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </KeyboardAvoidingView>
      </Modal>

      {/* 4. FIN DE COURSE (AVEC BOUTON MAPPY CORRIGÉ) */}
      <Modal visible={finishModal} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.finishCard}>
            <View style={styles.finishHeader}>
                <Text style={styles.finishTitle}>Fin de Course</Text>
                <TouchableOpacity onPress={() => setFinishModal(false)}>
                    <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
            </View>

            {/* BOUTON MAPPY AVEC BON FORMAT URL */}
            <TouchableOpacity style={styles.mappyBtn} onPress={openMappyRoute}>
                <View style={{flexDirection:'row', alignItems:'center'}}>
                    <Ionicons name="map" size={20} color="#FFF" style={{marginRight:8}} />
                    <Text style={{color:'#FFF', fontWeight:'bold'}}>VÉRIFIER KM (MAPPY)</Text>
                </View>
                <Ionicons name="open-outline" size={18} color="#FFF" />
            </TouchableOpacity>

            <Text style={styles.inputLabel}>Kilométrage réel (CPAM)</Text>
            <View style={styles.inputWrapper}><TextInput style={styles.input} placeholder="Ex: 25" keyboardType="numeric" value={billingData.kmReel} onChangeText={t => setBillingData({...billingData, kmReel: t})}/><Text style={styles.unitText}>km</Text></View>
            <Text style={styles.inputLabel}>Péages / Frais</Text>
            <View style={styles.inputWrapper}><TextInput style={styles.input} placeholder="Ex: 5.50" keyboardType="numeric" value={billingData.peage} onChangeText={t => setBillingData({...billingData, peage: t})}/><Text style={styles.unitText}>€</Text></View>
            <TouchableOpacity style={styles.confirmBtn} onPress={confirmFinishRide}><Text style={{color:'#FFF', fontWeight:'bold', fontSize: 16}}>VALIDER LA COURSE</Text></TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0', elevation: 2 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#1A1A1A' },
  headerRightButtons: { flexDirection: 'row', alignItems: 'center' },
  iconButton: { padding: 8, borderRadius: 12, backgroundColor: '#F5F5F5' },

  listContainer: { flex: 1, paddingHorizontal: 15, backgroundColor: '#F8F9FA' },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 15 },
  dateTitle: { fontSize: 18, fontWeight: '700', textTransform: 'capitalize', color: '#333' },
  countBadge: { backgroundColor: '#FF6B00', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 },
  countText: { color: '#FFF', fontWeight: 'bold' },
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 10, fontSize: 16 },

  // BLOC COURSE + ALERTE
  rideBlock: { marginBottom: 12 },
  pmtHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    marginBottom: -5,
    zIndex: 1, 
    alignSelf: 'flex-start',
    marginLeft: 10,
  },
  pmtHeaderText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 10,
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  
  // MODALS
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  optionSheet: { backgroundColor: '#FFF', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 25, paddingBottom: 40 },
  sheetHandle: { width: 40, height: 4, backgroundColor: '#DDD', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetTitle: { textAlign: 'center', fontWeight: 'bold', fontSize: 18, color: '#333', marginBottom: 25 },
  sheetBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderColor: '#F5F5F5' },
  sheetBtnText: { fontSize: 17, fontWeight: '500', color: '#333' },
  iconBox: { width: 44, height: 44, borderRadius: 22, justifyContent:'center', alignItems:'center', marginRight: 15 },

  docModalContainer: { flex: 1, backgroundColor: '#F2F2F2' },
  docCard: { backgroundColor: '#FFF', borderRadius: 16, marginBottom: 20, padding: 12, elevation: 2 },
  docTitle: { fontWeight: 'bold', marginBottom: 8, fontSize: 16 },
  docImage: { width: '100%', height: height * 0.35, borderRadius: 8 }, 
  contactRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 18, borderBottomWidth: 1, borderColor: '#EEE' },
  contactName: { fontSize: 17, fontWeight: '600', color: '#333' },
  selectedContactHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, backgroundColor:'#FFF3E0', padding: 12, borderRadius: 12 },
  selectedContactName: { fontSize: 17, fontWeight: 'bold', color: '#E65100', marginLeft: 10 },
  noteInput: { backgroundColor: '#FFF', borderRadius: 12, padding: 15, height: 120, marginBottom: 20, borderWidth: 1, borderColor: '#DDD', fontSize: 16 },
  sendShareBtn: { backgroundColor: '#FF6B00', padding: 18, borderRadius: 14, alignItems: 'center', flexDirection:'row', justifyContent:'center', elevation: 3 },
  sendShareText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },

  // FINISH CARD & MAPPY
  finishCard: { backgroundColor: '#FFF', padding: 25, borderTopLeftRadius: 25, borderTopRightRadius: 25 },
  finishHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  finishTitle: { fontSize: 20, fontWeight: 'bold' },
  mappyBtn: { backgroundColor: '#009688', padding: 12, borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#00796B', elevation: 2 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 8 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#DDD', borderRadius: 12, paddingHorizontal: 15, marginBottom: 20, height: 55, backgroundColor: '#FAFAFA' },
  input: { flex: 1, fontSize: 18, fontWeight: 'bold', color: '#333' },
  unitText: { fontSize: 16, color: '#999', fontWeight: 'bold' },
  confirmBtn: { backgroundColor: '#4CAF50', padding: 18, borderRadius: 14, alignItems: 'center', marginTop: 10, elevation: 2 },

  modalHeader: { padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#F0F0F0' },
  phoneInfoBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5E9', padding: 12, borderRadius: 12, marginBottom: 20 },
  phoneInfoText: { marginLeft: 10, fontSize: 14, color: '#2E7D32', flex: 1, fontWeight: '500' },
  noteLabel: { fontWeight: 'bold', color: '#555', marginBottom: 10, fontSize: 15 },
  avatarPlaceholder: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFE0B2', justifyContent:'center', alignItems:'center', marginRight: 10 },
  avatarText: { color: '#EF6C00', fontWeight: 'bold', fontSize: 20 },
});