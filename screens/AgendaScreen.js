import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, ActivityIndicator, StyleSheet,
  Alert, TouchableOpacity, Modal, TextInput, Image, ScrollView, 
  KeyboardAvoidingView, Platform, Dimensions, Linking, Vibration, StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import moment from 'moment';
import 'moment/locale/fr';
import * as Clipboard from 'expo-clipboard';
import DateTimePicker from '@react-native-community/datetimepicker'; 
import * as ImagePicker from 'expo-image-picker'; 

// --- COMPOSANTS ---
import IncomingOfferToast from '../components/IncomingOfferToast';
import ScreenWrapper from '../components/ScreenWrapper';
import RideCard from '../components/RideCard'; 
import DocumentScannerButton from '../components/DocumentScannerButton'; 
import RideOptionsModal from '../components/RideOptionsModal';
import OffersNotification from '../components/OffersNotification'; 
import DispatchModal from '../components/DispatchModal'; 
import GroupCreatorModal from '../components/GroupCreatorModal'; 
import GroupListModal from '../components/GroupListModal'; 

// --- SERVICES & CONTEXTE ---
// 👇 J'ai ajouté syncBatchRides ici
import { addRideToCalendar, syncBatchRides } from '../services/calendarService';
import api, { updateRide, shareRide, deleteRide } from '../services/api';
import { useData } from '../contexts/DataContext'; 

const { height } = Dimensions.get('window');

// --- CONFIG CALENDRIER ---
LocaleConfig.locales['fr'] = {
  monthNames: ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'],
  dayNames: ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'],
  dayNamesShort: ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'],
  today: "Aujourd'hui"
};
LocaleConfig.defaultLocale = 'fr';

const THEME = {
  primary: '#FF6B00',
  bg: '#F4F6F8',
  card: '#FFFFFF',
  text: '#1A1A1A',
  textLight: '#888888',
  border: '#E0E0E0'
};

export default function AgendaScreen({ navigation }) {
  // 1. CONTEXTE & DATA
  const { allRides, contacts, loading, loadData, handleGlobalRespond } = useData();

  // 2. ÉTATS UI
  const [selectedDate, setSelectedDate] = useState(moment().format('YYYY-MM-DD'));
  const [showCalendar, setShowCalendar] = useState(true);
  const [activeRide, setActiveRide] = useState(null);
  const [analyzing, setAnalyzing] = useState(false); 

  // 3. MODALS
  const [modals, setModals] = useState({ options: false, share: false, docs: false });
  const [finishModal, setFinishModal] = useState(false); 
  const [returnModal, setReturnModal] = useState(false); 
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [showGroupCreator, setShowGroupCreator] = useState(false);
  const [showGroupList, setShowGroupList] = useState(false); 
  const [editingGroup, setEditingGroup] = useState(null); 
  
  // 4. DONNÉES LOCALES & DOCS
  const [myGroups, setMyGroups] = useState([]); 
  const [patientDocs, setPatientDocs] = useState([]);
  const [allPMTs, setAllPMTs] = useState([]); 

  // 5. FORMULAIRES TEMPORAIRES
  const [btValidationModal, setBtValidationModal] = useState(false);
  const [prescriptionDate, setPrescriptionDate] = useState(new Date());
  const [showPrescriptionPicker, setShowPrescriptionPicker] = useState(false);
  const [tempScanUri, setTempScanUri] = useState(null); 
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [returnData, setReturnData] = useState({ date: '', time: '', startLocation: '', endLocation: '', type: 'Retour' });
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempReturnDate, setTempReturnDate] = useState(new Date());
  const [shareNote, setShareNote] = useState(''); 
  const [billingData, setBillingData] = useState({ kmReel: '', peage: '' });

  // --- INITIALISATION ---
  useEffect(() => { 
    fetchGlobalPMTs();
    fetchGroups();
  }, [allRides]); 

  // --- API CALLS ---
  const fetchGlobalPMTs = async () => { try { const res = await api.get('/documents/pmts/all'); setAllPMTs(res.data); } catch (err) {} };
  const fetchGroups = async () => { try { const res = await api.get('/groups'); setMyGroups(res.data); } catch (e) {} };

  // --- 1. MAGIC PASTE -> CREATE SCREEN ---
  const handleImportFromClipboard = async () => {
    const text = await Clipboard.getStringAsync();
    
    if (!text) return Alert.alert("Presse-papier vide", "Copiez d'abord le message.");

    setAnalyzing(true); 

    try {
        const response = await api.post('/ai/parse-ride', { text });
        let aiData = response.data; 

        let ridesFound = [];
        if (aiData.rides && Array.isArray(aiData.rides)) ridesFound = aiData.rides;
        else if (Array.isArray(aiData)) ridesFound = aiData;
        else ridesFound = [aiData];
        
        if (ridesFound.length > 0) {
            const rideToEdit = ridesFound[0];
            Vibration.vibrate(50);
            navigation.navigate('AddRide', { importedData: rideToEdit }); 
            
            if (ridesFound.length > 1) {
                Alert.alert("Info", "Plusieurs courses détectées. La première a été chargée.");
            }
        } else {
             Alert.alert("Oups", "Aucune course claire trouvée.");
        }

    } catch (e) {
        Alert.alert("Erreur IA", "L'analyse a échoué.");
    } finally {
        setAnalyzing(false);
    }
  };

  // --- 2. SYNCHRO INTELLIGENTE (AJOUTÉE ICI) ---
  const handleGlobalSync = () => {
    Alert.alert(
      "Synchronisation Agenda",
      "Que voulez-vous ajouter au calendrier de votre téléphone ?",
      [
        { text: "Annuler", style: "cancel" },
        { 
            text: "Ce jour uniquement", 
            onPress: () => syncBatchRides(dailyRides) 
        },
        { 
            text: "TOUTES les futures", 
            style: "default", 
            onPress: () => {
                const futureRides = allRides.filter(r => moment(r.date).isSameOrAfter(moment(), 'day') && r.status !== 'Annulée');
                syncBatchRides(futureRides);
            }
        }
      ]
    );
  };

  // --- GESTION ÉTAT COURSE ---
  const handleStatusChange = async (r, a) => { 
      try { 
          if (a === 'start') { 
              await updateRide(r._id, { startTime: new Date().toISOString() }); 
              Vibration.vibrate(50);
              loadData(true); 
          } else if (a === 'finish') { 
              setActiveRide(r); 
              setBillingData({ kmReel: '', peage: '' }); 
              setFinishModal(true); 
          } 
      } catch (e) { Alert.alert('Erreur', "Action impossible."); } 
  };

  const confirmFinishRide = async () => { 
      if (!billingData.kmReel) return Alert.alert("Oubli", "Veuillez entrer les KM."); 
      try { 
          await updateRide(activeRide._id, { 
              endTime: new Date().toISOString(), 
              realDistance: parseFloat(billingData.kmReel), 
              tolls: parseFloat(billingData.peage) || 0, 
              status: 'Terminée' 
          }); 
          setFinishModal(false); 
          loadData(true); 
          Vibration.vibrate([0, 100, 50, 100]); 
      } catch (e) { Alert.alert("Erreur", "Echec clôture."); } 
  };

  const handleDelete = async () => {
    if (!activeRide) return;
    Alert.alert("Supprimer", "Voulez-vous vraiment supprimer cette course ?",
      [{ text: "Annuler", style: "cancel" }, 
       { text: "Supprimer", style: "destructive", onPress: async () => {
            try { await deleteRide(activeRide._id); setModals({ ...modals, options: false }); loadData(true); Vibration.vibrate(50); } 
            catch (e) { Alert.alert("Erreur", "Impossible de supprimer."); }
       }}]
    );
  };

  // --- GESTION GROUPES ---
  const handleSaveGroup = async (groupData) => {
    try {
      const memberIds = groupData.members.map(m => (m.contactId && m.contactId._id) ? m.contactId._id : m._id);
      const payload = { name: groupData.name, members: memberIds };
      if (groupData._id) {
          const res = await api.put(`/groups/${groupData._id}`, payload);
          setMyGroups(prev => prev.map(g => g._id === groupData._id ? res.data : g));
          Alert.alert("Succès", "Groupe modifié !");
      } else {
          const res = await api.post('/groups', payload);
          setMyGroups(prev => [...prev, res.data]);
          Alert.alert("Succès", "Groupe créé !");
      }
    } catch (e) { Alert.alert("Erreur", "Sauvegarde impossible."); }
  };

  const handleDeleteGroup = async (groupId) => {
    try { await api.delete(`/groups/${groupId}`); setMyGroups(prev => prev.filter(g => g._id !== groupId)); Alert.alert("Supprimé", "Groupe supprimé."); } 
    catch (e) { Alert.alert("Erreur", "Impossible."); }
  };

  // --- FILTRES & STATUS ---
  const markedDates = useMemo(() => { 
      const m={}; 
      allRides.forEach(r=>{ 
          const d=moment(r.date).format('YYYY-MM-DD'); 
          if(!m[d])m[d]={dots:[]}; 
          const c=r.isShared?'#FF9800':'#4CAF50'; 
          if(!m[d].dots.find(dot=>dot.color===c))m[d].dots.push({key:r._id,color:c}); 
      }); 
      m[selectedDate]={...m[selectedDate],selected:true,selectedColor: THEME.primary}; 
      return m; 
  }, [allRides, selectedDate]);

  const dailyRides = useMemo(() => 
      allRides.filter(r => moment(r.date).format('YYYY-MM-DD') === selectedDate && (!r.isShared || r.statusPartage !== 'refused'))
      .sort((a, b) => new Date(a.date) - new Date(b.date)), 
  [allRides, selectedDate]);

  const getPMTStatus = (ride) => {
    const medicalTypes = ['VSL', 'Ambulance', 'Taxi', 'Aller', 'Retour', 'Consultation'];
    if (!medicalTypes.includes(ride.type) || ride.endTime) return null;
    const docs = allPMTs.filter(d => d.patientName === ride.patientName);
    if (docs.length === 0) return { color: '#FFEBEE', text: 'BT MANQUANT', textColor: '#D32F2F', icon: 'alert-circle' };
    return { color: '#E8F5E9', text: 'BT OK', textColor: '#2E7D32', icon: 'checkbox' };
  };

  // --- ACTIONS DOCUMENTS ---
  const fetchRideDocuments = async (ride) => {
    if (!ride) return;
    try { setLoadingDocs(true); const res = await api.get(`/documents/by-ride/${ride._id}`); setPatientDocs(res.data); setModals({ ...modals, options: false, docs: true }); } 
    catch (e) { Alert.alert("Info", "Erreur dossier."); } finally { setLoadingDocs(false); }
  };

  const handleDocumentScanned = async (uri, docType) => {
    if (docType === 'PMT') {
      setTempScanUri(uri);
      setPrescriptionDate(new Date(activeRide.date));
      setBtValidationModal(true);
    } else {
      await uploadDocument(uri, docType);
    }
  };

  const uploadDocument = async (uri, docType) => {
    if (!activeRide) return;
    try { setUploading(true); const f = new FormData(); f.append('photo', { uri: uri, name: `scan.jpg`, type: 'image/jpeg' }); f.append('patientName', activeRide.patientName); f.append('docType', docType); f.append('rideId', activeRide._id); await api.post('/documents/upload', f, { headers: { 'Content-Type': 'multipart/form-data' }, transformRequest: d => d }); Alert.alert("Succès", "Document ajouté !"); fetchRideDocuments(activeRide); } 
    catch (e) { Alert.alert("Erreur", "Echec envoi doc."); } finally { setUploading(false); }
  };

  const pickFromGallery = async (docType) => {
    try {
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.8 });
      if (!r.canceled) {
        if (docType === 'PMT') {
            setTempScanUri(r.assets[0].uri);
            setPrescriptionDate(new Date(activeRide.date));
            setBtValidationModal(true);
        } else {
            await uploadDocument(r.assets[0].uri, docType);
        }
      }
    } catch (e) { Alert.alert("Erreur", "Galerie inaccessible"); }
  };

  const validateAndUploadBT = async () => {
    const rideDate = moment(activeRide.date).startOf('day');
    const prescDate = moment(prescriptionDate).startOf('day');
    if (prescDate.isAfter(rideDate)) {
      Alert.alert("❌ RISQUE DE REJET", "Prescription POSTÉRIEURE à la course.\nContinuer ?", [{ text: "Non", style: "cancel" }, { text: "Forcer", style: 'destructive', onPress: () => finalizeUploadBT() }]);
      return;
    }
    finalizeUploadBT();
  };

  const finalizeUploadBT = async () => {
    setBtValidationModal(false);
    if (tempScanUri) { await uploadDocument(tempScanUri, 'PMT'); setTempScanUri(null); }
  };

  // --- ACTIONS (RETOUR, PARTAGE, MAPPY) ---
  const prepareReturnRide = () => { if (!activeRide) return; setReturnData({ date: moment(activeRide.date).format('YYYY-MM-DD'), time: '', startLocation: activeRide.endLocation, endLocation: activeRide.startLocation, type: 'Retour' }); setTempReturnDate(new Date()); setModals({ ...modals, options: false }); setReturnModal(true); };
  const onReturnTimeChange = (event, selectedDate) => { if (Platform.OS === 'android') setShowTimePicker(false); if (selectedDate) { setTempReturnDate(selectedDate); setReturnData(prev => ({ ...prev, time: moment(selectedDate).format('HH:mm') })); } };
  
  const confirmCreateReturn = async () => {
    if (!returnData.time) return Alert.alert("Erreur", "Heure requise.");
    try { const [h, m] = returnData.time.split(':'); const d = moment(returnData.date).hour(parseInt(h)).minute(parseInt(m)).toISOString(); const n = { patientName: activeRide.patientName, patientPhone: activeRide.patientPhone, startLocation: returnData.startLocation, endLocation: returnData.endLocation, type: 'Retour', date: d, status: 'Confirmée', isRoundTrip: false }; await api.post('/rides', n); setReturnModal(false); loadData(true); Alert.alert("Succès", "Retour planifié !"); } catch (e) { Alert.alert("Erreur", "Impossible."); }
  };

  const shareInternal = async (contact) => {
    if (!activeRide) return;
    try { await shareRide(activeRide._id, contact.contactId._id, shareNote); setModals({ ...modals, share: false }); setShareNote(''); loadData(true); Alert.alert('Succès', `Envoyé à ${contact.contactId.fullName}.`); } catch (e) { Alert.alert('Erreur', "Échec."); }
  };
  
  const shareViaWhatsApp = () => {
    if (!activeRide) return;
    const date = moment(activeRide.date).format('DD/MM/YYYY');
    const time = moment(activeRide.startTime || activeRide.date).format('HH:mm');
    const msg = `📅 *Dispo Course*\n🗓 ${date} à *${time}*\n📍 ${activeRide.startLocation}\n🏁 ${activeRide.endLocation}\n🚑 ${activeRide.type}` + (shareNote ? `\n\n📝 ${shareNote}` : '');
    Linking.openURL(`whatsapp://send?text=${encodeURIComponent(msg)}`).catch(() => Alert.alert("Erreur", "WhatsApp absent."));
  };

  const openMappyRoute = () => {
    if (!activeRide) return;
    const s = encodeURIComponent(activeRide.startLocation || "");
    const e = encodeURIComponent(activeRide.endLocation || "");
    Linking.openURL(`https://fr.mappy.com/itineraire#/voiture/${s}/${e}/car`).catch(() => Alert.alert("Erreur", "Impossible d'ouvrir Mappy"));
  };

  // --- RENDER HELPERS ---
  const renderSkeleton = () => (
      <View style={{marginTop: 20}}>
          {[1,2,3].map(i => (
              <View key={i} style={styles.skeletonCard}>
                  <View style={styles.skeletonLineShort}/>
                  <View style={styles.skeletonLineLong}/>
              </View>
          ))}
      </View>
  );

  const renderEmptyState = () => (
      <View style={styles.emptyContainer}>
          <Image source={{uri: 'https://cdn-icons-png.flaticon.com/512/7486/7486744.png'}} style={styles.emptyImage} />
          <Text style={styles.emptyTitle}>Journée Libre</Text>
          <Text style={styles.emptyText}>Aucune course prévue pour le moment.</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={handleImportFromClipboard}>
              <Text style={styles.emptyBtnText}>Coller une course</Text>
          </TouchableOpacity>
      </View>
  );

  // ============================================================
  // RENDU PRINCIPAL
  // ============================================================
  return (
    <ScreenWrapper style={{backgroundColor: THEME.bg}}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      
      {/* --- HEADER --- */}
      <View style={styles.header}>
        <View>
            <Text style={styles.headerTitle}>Mon Planning</Text>
            <Text style={styles.headerSubtitle}>{moment(selectedDate).format('dddd D MMMM')}</Text>
        </View>
        <View style={styles.headerRightButtons}>
            <OffersNotification /> 
            <TouchableOpacity onPress={() => setShowCalendar(!showCalendar)} style={styles.calendarToggle}>
                <Ionicons name={showCalendar ? "chevron-up" : "calendar"} size={22} color={THEME.primary} />
            </TouchableOpacity>
        </View>
      </View>

      {/* --- CALENDRIER REPLIABLE --- */}
      {showCalendar && (
          <View style={styles.calendarContainer}>
            <Calendar 
                onDayPress={(d) => setSelectedDate(d.dateString)} 
                markedDates={markedDates} 
                markingType={'multi-dot'} 
                theme={{ 
                    todayTextColor: THEME.primary, 
                    selectedDayBackgroundColor: THEME.primary, 
                    arrowColor: THEME.primary,
                    textMonthFontWeight: 'bold',
                    textDayHeaderFontWeight: '600'
                }} 
            />
          </View>
      )}

      {/* --- TOOLBAR ACTIONS RAPIDES --- */}
      <View style={styles.toolbar}>
          <TouchableOpacity onPress={handleImportFromClipboard} disabled={analyzing} style={styles.magicBtn}>
              {analyzing ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="sparkles" size={20} color="#FFF" />}
              <Text style={styles.magicBtnText}>Magic Paste</Text>
          </TouchableOpacity>
          
          <View style={{flexDirection:'row'}}>
            <TouchableOpacity onPress={() => setShowGroupList(true)} style={styles.iconBtn}>
                <Ionicons name="people" size={22} color="#555" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.iconBtn}>
                <Ionicons name="settings-outline" size={22} color="#555" />
            </TouchableOpacity>
          </View>
      </View>

      {/* --- LISTE DES COURSES --- */}
      <View style={styles.listContainer}>
        {/* EN-TÊTE LISTE AVEC BOUTON SYNC RESTAURÉ 👇 */}
        <View style={styles.listHeader}>
            <Text style={styles.dateTitle}>{moment(selectedDate).format('dddd D MMMM')}</Text>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                
                {/* 🟢 BOUTON SYNC PRÉSENT ICI */}
                {dailyRides.length > 0 && (
                  <TouchableOpacity onPress={handleGlobalSync} style={styles.syncBtn}>
                    <Ionicons name="calendar-outline" size={16} color="#FFF" style={{marginRight: 4}} />
                    <Text style={styles.syncBtnText}>Export</Text>
                  </TouchableOpacity>
                )}

                <View style={styles.countBadge}><Text style={styles.countText}>{dailyRides.length}</Text></View>
            </View>
        </View>

        {loading ? renderSkeleton() : (
          <FlatList 
            data={dailyRides} 
            keyExtractor={i => i._id} 
            contentContainerStyle={{ paddingBottom: 150 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={renderEmptyState}
            renderItem={({ item }) => {
              const status = getPMTStatus(item);
              return (
                <View style={styles.rideWrapper}>
                  {status && (
                    <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
                        <Ionicons name={status.icon} size={12} color={status.textColor} />
                        <Text style={[styles.statusText, {color: status.textColor}]}>{status.text}</Text>
                    </View>
                  )}
                  <RideCard 
                    ride={item} 
                    onStatusChange={handleStatusChange} 
                    onPress={(r) => { setActiveRide(r); setModals(prev => ({ ...prev, options: true })); }} 
                    onRespond={(r, a) => handleGlobalRespond(r._id, a)} 
                  />
                </View>
              );
            }} 
            refreshing={loading} 
            onRefresh={() => loadData(false)}
          />
        )}
      </View>

      {/* ================= MODALS ================= */}
      
      {/* OPTIONS */}
      <RideOptionsModal 
        visible={modals.options}
        ride={activeRide}
        onClose={() => setModals({ ...modals, options: false })}
        onEdit={() => {
            setModals({ ...modals, options: false });
            setTimeout(() => navigation.navigate('AddRide', { importedData: activeRide }), 100);
        }}
        onCreateReturn={() => { setModals({ ...modals, options: false }); setTimeout(() => { if(activeRide) { setReturnData(prev => ({...prev, startLocation: activeRide.endLocation, endLocation: activeRide.startLocation, date: moment(activeRide.date).format('YYYY-MM-DD')})); setReturnModal(true); }}, 100); }}
        onAddToCalendar={() => { addRideToCalendar(activeRide); setModals({ ...modals, options: false }); }}
        onOpenDocs={() => fetchRideDocuments(activeRide)}
        onShare={() => setModals({ options: false, share: true })}
        onDelete={handleDelete}
        onDispatch={() => { setModals({ ...modals, options: false }); setTimeout(() => setShowDispatchModal(true), 100); }}
      />

      {/* DISPATCH GROUPE */}
      <DispatchModal 
        visible={showDispatchModal}
        onClose={() => setShowDispatchModal(false)}
        ride={activeRide}
        contacts={contacts}
        groups={myGroups} 
        onCreateGroup={() => { setShowDispatchModal(false); setTimeout(() => { setEditingGroup(null); setShowGroupCreator(true); }, 200); }}
        onSuccess={() => loadData(true)}
      />

      {/* GESTION GROUPE */}
      <GroupListModal 
        visible={showGroupList}
        onClose={() => setShowGroupList(false)}
        groups={myGroups}
        onCreateNew={() => { setEditingGroup(null); setShowGroupList(false); setTimeout(() => setShowGroupCreator(true), 200); }}
        onEdit={(group) => { setEditingGroup(group); setShowGroupList(false); setTimeout(() => setShowGroupCreator(true), 200); }}
        onDelete={handleDeleteGroup}
      />
      <GroupCreatorModal 
        visible={showGroupCreator}
        groupToEdit={editingGroup} 
        onClose={() => { setShowGroupCreator(false); setTimeout(() => setShowGroupList(true), 200); }}
        contacts={contacts}
        onSaveGroup={handleSaveGroup} 
      />

      {/* FIN DE COURSE */}
      <Modal visible={finishModal} animationType="fade" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.bottomSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.bottomSheetTitle}>Fin de Course</Text>
            <View style={styles.inputRow}>
                <View style={{flex:1, marginRight:10}}>
                    <Text style={styles.inputLabel}>Km Réels</Text>
                    <TextInput style={styles.sheetInput} placeholder="Ex: 25" keyboardType="numeric" value={billingData.kmReel} onChangeText={t => setBillingData({...billingData, kmReel: t})}/>
                </View>
                <View style={{flex:1}}>
                    <Text style={styles.inputLabel}>Péages (€)</Text>
                    <TextInput style={styles.sheetInput} placeholder="0.00" keyboardType="numeric" value={billingData.peage} onChangeText={t => setBillingData({...billingData, peage: t})}/>
                </View>
            </View>
            <TouchableOpacity style={styles.confirmBtn} onPress={confirmFinishRide}>
                <Text style={styles.confirmBtnText}>TERMINER LA COURSE</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setFinishModal(false)} style={{marginTop:15, alignSelf:'center'}}>
                <Text style={{color:'#888'}}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* PLANIFIER RETOUR */}
      <Modal visible={returnModal} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
            <View style={styles.bottomSheet}>
                <View style={styles.modalHandle} />
                <Text style={styles.bottomSheetTitle}>Planifier le Retour</Text>
                <TouchableOpacity onPress={() => setShowTimePicker(true)} style={styles.timeSelectBtn}>
                    <Ionicons name="time" size={24} color="#333" />
                    <Text style={{fontSize:20, fontWeight:'bold', marginLeft:10}}>{returnData.time || "--:--"}</Text>
                </TouchableOpacity>
                {showTimePicker && (<DateTimePicker value={tempReturnDate} mode="time" is24Hour display="spinner" onChange={(e,d) => { setShowTimePicker(Platform.OS === 'ios'); if(d) { setTempReturnDate(d); setReturnData(p => ({...p, time: moment(d).format('HH:mm')})); } }} />)}
                <TouchableOpacity style={[styles.confirmBtn, {backgroundColor: THEME.primary}]} onPress={confirmCreateReturn}>
                    <Text style={styles.confirmBtnText}>VALIDER RETOUR</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setReturnModal(false)} style={{marginTop:15, alignSelf:'center'}}>
                    <Text style={{color:'#888'}}>Annuler</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL PARTAGE */}
      <Modal visible={modals.share} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor:'#FFF' }}>
          <View style={styles.modalHeader}><Text style={styles.headerTitle}>Partager</Text><TouchableOpacity onPress={() => setModals({...modals, share: false})}><Ionicons name="close-circle" size={32} color="#999"/></TouchableOpacity></View>
          <View style={{padding: 20, flex: 1}}>
             <TextInput style={styles.noteInput} placeholder="Note (Optionnel)..." multiline numberOfLines={3} value={shareNote} onChangeText={setShareNote} textAlignVertical="top"/>
             
             {/* 🟢 BOUTON WHATSAPP */}
             <TouchableOpacity style={styles.whatsappBtn} onPress={shareViaWhatsApp}>
                <Ionicons name="logo-whatsapp" size={24} color="#FFF" style={{marginRight: 10}}/>
                <Text style={styles.whatsappText}>WhatsApp</Text>
             </TouchableOpacity>

             <FlatList data={contacts} keyExtractor={(item) => item._id} renderItem={({ item }) => (
                 <TouchableOpacity style={styles.contactRow} onPress={() => shareInternal(item)}>
                   <Text style={styles.contactName}>{item.contactId?.fullName}</Text>
                   <Ionicons name="paper-plane-outline" size={24} color="#4CAF50" />
                 </TouchableOpacity>
               )} ListEmptyComponent={<Text style={{color:'#999'}}>Aucun contact.</Text>} />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* DOCS MODAL */}
      <Modal visible={modals.docs} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.docModalContainer}>
          <View style={styles.modalHeader}>
              <Text style={styles.headerTitle}>Dossier Médical</Text>
              <TouchableOpacity onPress={() => setModals({...modals, docs: false})}><Ionicons name="close-circle" size={32} color="#999"/></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{padding: 20}}>
              {loadingDocs ? <ActivityIndicator size="large" color="#FF6B00"/> : patientDocs.length === 0 ? <Text style={styles.emptyText}>Aucun document.</Text> : patientDocs.map((d, i) => (
                  <View key={i} style={styles.docCard}><Text style={styles.docTitle}>{d.type}</Text><Image source={{ uri: d.imageData }} style={styles.docImage} resizeMode="contain"/></View>
              ))}
              <View style={styles.addDocSection}>
                 <Text style={styles.sectionTitle}>Ajouter un document</Text>
                 <View style={styles.scanGrid}>
                    <View style={styles.scanColumn}><DocumentScannerButton title="BT" docType="PMT" color="#FF6B00" onScan={handleDocumentScanned} isLoading={uploading}/><TouchableOpacity style={styles.importBtn} onPress={() => pickFromGallery('PMT')}><Text style={styles.importText}>Galerie</Text></TouchableOpacity></View>
                    <View style={styles.scanColumn}><DocumentScannerButton title="Vitale" docType="CarteVitale" color="#4CAF50" onScan={handleDocumentScanned} isLoading={uploading}/><TouchableOpacity style={styles.importBtn} onPress={() => pickFromGallery('CarteVitale')}><Text style={styles.importText}>Galerie</Text></TouchableOpacity></View>
                    <View style={styles.scanColumn}><DocumentScannerButton title="Mutuelle" docType="Mutuelle" color="#2196F3" onScan={handleDocumentScanned} isLoading={uploading}/><TouchableOpacity style={styles.importBtn} onPress={() => pickFromGallery('Mutuelle')}><Text style={styles.importText}>Galerie</Text></TouchableOpacity></View>
                 </View>
              </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={btValidationModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.finishCard, {backgroundColor: '#FFF3E0'}]}>
            <View style={styles.finishHeader}><Text style={[styles.finishTitle, {color: '#E65100'}]}>🛡️ Vérification CPAM</Text><TouchableOpacity onPress={() => setBtValidationModal(false)}><Ionicons name="close" size={24} color="#333" /></TouchableOpacity></View>
            <Text style={styles.cpamWarning}>Vérifiez la date de prescription.</Text>
            <TouchableOpacity onPress={() => setShowPrescriptionPicker(true)} style={[styles.inputWrapper, {borderColor: '#FF9800', backgroundColor: '#FFF'}]}><Ionicons name="calendar" size={20} color="#E65100" style={{marginRight:10}}/><Text style={{fontSize:18, fontWeight:'bold', color: '#333'}}>{moment(prescriptionDate).format('DD/MM/YYYY')}</Text></TouchableOpacity>
            {showPrescriptionPicker && (<DateTimePicker value={prescriptionDate} mode="date" display="default" onChange={(event, date) => { if(Platform.OS === 'android') setShowPrescriptionPicker(false); if(date) setPrescriptionDate(date); }} />)}
            <View style={styles.comparisonRow}><Text style={styles.compValue}>Course: {moment(activeRide?.date).format('DD/MM')}</Text><Ionicons name={moment(prescriptionDate).isAfter(moment(activeRide?.date)) ? "alert-circle" : "arrow-forward-circle"} size={30} color={moment(prescriptionDate).isAfter(moment(activeRide?.date)) ? "red" : "green"} /><Text style={[styles.compValue, moment(prescriptionDate).isAfter(moment(activeRide?.date)) && {color:'red'}]}>Prescr: {moment(prescriptionDate).format('DD/MM')}</Text></View>
            <TouchableOpacity style={[styles.confirmBtn, {backgroundColor: '#E65100'}]} onPress={validateAndUploadBT}><Text style={{color:'#FFF', fontWeight:'bold', fontSize: 16}}>VALIDER LE BT</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      <IncomingOfferToast onRideAccepted={() => loadData(true)} />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  // HEADER
  header: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    padding: 20, paddingTop: 10, backgroundColor: '#FFF', 
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0' 
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: THEME.text },
  headerSubtitle: { fontSize: 14, color: THEME.textLight, textTransform: 'capitalize', marginTop: 2 },
  headerRightButtons: { flexDirection: 'row', alignItems: 'center' },
  calendarToggle: { padding: 8, backgroundColor: '#FFF3E0', borderRadius: 12, marginLeft: 10 },

  // CALENDRIER
  calendarContainer: { borderRadius: 20, overflow: 'hidden', margin: 15, elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },

  // TOOLBAR
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 10 },
  magicBtn: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: THEME.primary, 
    paddingVertical: 10, paddingHorizontal: 20, borderRadius: 25, elevation: 4,
    shadowColor: THEME.primary, shadowOpacity: 0.4, shadowOffset: {width:0, height:4}
  },
  magicBtnText: { color: '#FFF', fontWeight: 'bold', marginLeft: 8 },
  iconBtn: { padding: 10, backgroundColor: '#FFF', borderRadius: 12, marginLeft: 10, elevation: 1 },

  // LISTE
  listContainer: { flex: 1, paddingHorizontal: 15 },
  
  // 👇 STYLE LIST HEADER AVEC LE BOUTON SYNC
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 15 },
  dateTitle: { fontSize: 18, fontWeight: '700', textTransform: 'capitalize', color: '#333' },
  
  syncBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#4285F4', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, marginRight: 10, elevation: 2 },
  syncBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },

  countBadge: { backgroundColor: '#FF6B00', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 },
  countText: { color: '#FFF', fontWeight: 'bold' },

  rideWrapper: { marginBottom: 15 },
  statusBadge: { 
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', 
    paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, marginBottom: -8, 
    zIndex: 1, marginLeft: 10 
  },
  statusText: { fontSize: 10, fontWeight: 'bold', marginLeft: 4 },

  // EMPTY STATE
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyImage: { width: 100, height: 100, opacity: 0.6, marginBottom: 20 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  emptyText: { fontSize: 14, color: '#888', marginTop: 5 },
  emptyBtn: { marginTop: 20, paddingVertical: 10, paddingHorizontal: 20, borderWidth: 1, borderColor: THEME.primary, borderRadius: 20 },
  emptyBtnText: { color: THEME.primary, fontWeight: 'bold' },

  // SKELETON
  skeletonCard: { backgroundColor: '#FFF', padding: 20, borderRadius: 15, marginBottom: 10 },
  skeletonLineShort: { width: '40%', height: 15, backgroundColor: '#F0F0F0', borderRadius: 4, marginBottom: 10 },
  skeletonLineLong: { width: '80%', height: 15, backgroundColor: '#F0F0F0', borderRadius: 4 },

  // MODALS & SHEETS
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: '#FFF', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 25, paddingBottom: 40 },
  modalHandle: { width: 40, height: 5, backgroundColor: '#DDD', borderRadius: 3, alignSelf: 'center', marginBottom: 20 },
  bottomSheetTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  inputRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  inputLabel: { fontSize: 12, fontWeight: 'bold', color: '#666', marginBottom: 5 },
  sheetInput: { backgroundColor: '#F5F5F5', borderRadius: 12, padding: 15, fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  confirmBtn: { backgroundColor: '#4CAF50', padding: 18, borderRadius: 15, alignItems: 'center', shadowColor: "#4CAF50", shadowOpacity: 0.3, shadowOffset: {width:0, height:4} },
  confirmBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  
  timeSelectBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', padding: 20, borderRadius: 15, justifyContent: 'center', marginBottom: 20 },

  // DOCS MODAL SPECIFIC
  docModalContainer: { flex: 1, backgroundColor: '#F2F2F2' },
  modalHeader: { padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#F0F0F0' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' }, 
  docCard: { backgroundColor: '#FFF', borderRadius: 16, marginBottom: 20, padding: 12, elevation: 2 },
  docTitle: { fontWeight: 'bold', marginBottom: 8, fontSize: 16, color: '#333' },
  docImage: { width: '100%', height: height * 0.35, borderRadius: 8, backgroundColor: '#EEE' },
  addDocSection: { marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#DDD' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#333' },
  scanGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  scanColumn: { alignItems: 'center', width: '30%' },
  importBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 8, padding: 6, backgroundColor: '#E0E0E0', borderRadius: 20 },
  importText: { fontSize: 10, color: '#555', marginLeft: 4, fontWeight: 'bold' },

  // STYLE WHATSAPP BTN
  noteInput: { backgroundColor: '#F5F5F5', borderRadius: 12, padding: 15, height: 80, marginBottom: 15, borderWidth: 1, borderColor: '#DDD', fontSize: 16 },
  whatsappBtn: { backgroundColor: '#25D366', padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20, elevation: 2 },
  whatsappText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  contactRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 1, borderColor: '#EEE' },
  contactName: { fontSize: 16, fontWeight: '600', color: '#333', marginLeft: 10 },
  cpamWarning: { fontSize: 13, color: '#5D4037', marginBottom: 20, lineHeight: 20 },
  comparisonRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginVertical: 20, backgroundColor: '#FFE0B2', padding: 10, borderRadius: 10 },
  compLabel: { fontSize: 10, color: '#E65100', fontWeight: 'bold', textAlign: 'center' },
  compValue: { fontSize: 18, fontWeight: 'bold', color: '#333', textAlign: 'center' },
  mappyBtn: { backgroundColor: '#009688', padding: 12, borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#00796B', elevation: 2 },
});