import React, { useState, useMemo, useEffect } from 'react';
import {
   FlatList, ActivityIndicator, StyleSheet,
  Alert, TouchableOpacity, Modal, TextInput, Image, ScrollView, 
  KeyboardAvoidingView, Platform, Dimensions, Linking, Vibration, StatusBar,
  View, Text
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
import { addRideToCalendar, syncBatchRides } from '../services/calendarService';
import { getDrivingDistance } from '../services/distanceService';
import api, { updateRide, shareRide, deleteRide } from '../services/api';
import { useData } from '../contexts/DataContext'; 

const { height, width } = Dimensions.get('window');

// --- CONFIG CALENDRIER ---
LocaleConfig.locales['fr'] = {
  monthNames: ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'],
  dayNames: ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'],
  dayNamesShort: ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'],
  today: "Aujourd'hui"
};
LocaleConfig.defaultLocale = 'fr';

// --- PALETTE DE COULEURS PRO ---
const THEME = {
  primary: '#FF6B00',      
  primaryLight: '#FFF3E0', 
  secondary: '#2E3A59',    
  bg: '#F8F9FA',           
  card: '#FFFFFF',         
  text: '#1F2937',         
  textLight: '#9CA3AF',    
  border: '#E5E7EB',       
  success: '#10B981',      
  danger: '#EF4444',       
  info: '#3B82F6',         
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
  const [distanceCalculating, setDistanceCalculating] = useState(false);

  // --- INITIALISATION ---
  useEffect(() => { 
    fetchGlobalPMTs();
    fetchGroups();
  }, [allRides]); 

  // --- API CALLS ---
  const fetchGlobalPMTs = async () => { try { const res = await api.get('/documents/pmts/all'); setAllPMTs(res.data); } catch (err) {} };
  const fetchGroups = async () => { try { const res = await api.get('/groups'); setMyGroups(res.data); } catch (e) {} };

  // --- 1. MAGIC PASTE ---
  const handleImportFromClipboard = async () => {
    const text = await Clipboard.getStringAsync();
    if (!text) return Alert.alert("Presse-papier vide", "Copiez d'abord le message.");
    setAnalyzing(true); 
    try {
        const response = await api.post('/ai/parse-ride', { text });
        let aiData = response.data; 
        let ridesFound = Array.isArray(aiData.rides) ? aiData.rides : (Array.isArray(aiData) ? aiData : [aiData]);
        
        if (ridesFound.length > 0) {
            const rideToEdit = ridesFound[0];
            Vibration.vibrate(50);
            navigation.navigate('AddRide', { importedData: rideToEdit }); 
            if (ridesFound.length > 1) Alert.alert("Info", "Plusieurs courses détectées. La première a été chargée.");
        } else {
             Alert.alert("Oups", "Aucune course claire trouvée.");
        }
    } catch (e) {
        Alert.alert("Erreur IA", "L'analyse a échoué.");
    } finally {
        setAnalyzing(false);
    }
  };

  // --- 2. SYNCHRO AGENDA ---
  const handleGlobalSync = () => {
    Alert.alert("Synchronisation Agenda", "Que voulez-vous ajouter au calendrier ?", [
        { text: "Annuler", style: "cancel" },
        { text: "Ce jour uniquement", onPress: () => syncBatchRides(dailyRides) },
        { text: "TOUTES les futures", style: "default", onPress: () => {
            const futureRides = allRides.filter(r => moment(r.date).isSameOrAfter(moment(), 'day') && r.status !== 'Annulée');
            syncBatchRides(futureRides);
        }}
    ]);
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
              const prefilledKm = (r.realDistance || r.distance) ? String(r.realDistance || r.distance) : '';
              setBillingData({ kmReel: prefilledKm, peage: r.tolls ? String(r.tolls) : '' }); 
              setFinishModal(true); 
          } 
      } catch (e) { Alert.alert('Erreur', "Action impossible."); } 
  };

  const handleCalculateDistanceForFinish = async () => {
    if (!activeRide?.startLocation || !activeRide?.endLocation) return Alert.alert("Info", "Adresses manquantes.");
    setDistanceCalculating(true);
    try {
      const result = await getDrivingDistance(activeRide.startLocation, activeRide.endLocation);
      if (result) setBillingData(prev => ({ ...prev, kmReel: String(result.distanceKm) }));
      else Alert.alert("Impossible", "Distance non calculable.");
    } catch (e) { Alert.alert("Erreur", "Calcul impossible."); }
    finally { setDistanceCalculating(false); }
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

  // --- GESTION DES DOCUMENTS ---
  const fetchRideDocuments = async (ride) => {
    if (!ride) return;
    try { 
        setLoadingDocs(true); 
        const res = await api.get(`/documents/by-ride/${ride._id}`); 
        setPatientDocs(res.data); 
        // ✅ ON OUVRE SEULEMENT DOCS, ON FERME LES AUTRES
        setModals({ options: false, share: false, docs: true }); 
    } 
    catch (e) { Alert.alert("Info", "Erreur dossier."); } 
    finally { setLoadingDocs(false); }
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
    try { 
        setUploading(true); 
        const f = new FormData(); 
        f.append('photo', { uri: uri, name: `scan.jpg`, type: 'image/jpeg' }); 
        f.append('patientName', activeRide.patientName); 
        f.append('docType', docType); 
        f.append('rideId', activeRide._id); 
        await api.post('/documents/upload', f, { headers: { 'Content-Type': 'multipart/form-data' }, transformRequest: d => d }); 
        Alert.alert("Succès", "Document ajouté !"); 
        fetchRideDocuments(activeRide); 
    } 
    catch (e) { Alert.alert("Erreur", "Echec envoi doc."); } 
    finally { setUploading(false); }
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

  // --- ACTIONS (RETOUR, PARTAGE, SUPPRESSION) ---
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

  const prepareReturnRide = () => { if (!activeRide) return; setReturnData({ date: moment(activeRide.date).format('YYYY-MM-DD'), time: '', startLocation: activeRide.endLocation, endLocation: activeRide.startLocation, type: 'Retour' }); setTempReturnDate(new Date()); setModals({ ...modals, options: false }); setReturnModal(true); };
  
  const confirmCreateReturn = async () => {
    if (!returnData.time) return Alert.alert("Erreur", "Heure requise.");
    try { const [h, m] = returnData.time.split(':'); const d = moment(returnData.date).hour(parseInt(h)).minute(parseInt(m)).toISOString(); const n = { patientName: activeRide.patientName, patientPhone: activeRide.patientPhone, startLocation: returnData.startLocation, endLocation: returnData.endLocation, type: 'Retour', date: d, status: 'Confirmée', isRoundTrip: false }; await api.post('/rides', n); setReturnModal(false); loadData(true); Alert.alert("Succès", "Retour planifié !"); } catch (e) { Alert.alert("Erreur", "Impossible."); }
  };

  const shareInternal = async (contactItem) => {
    if (!activeRide) return;
    try { 
        const recipientUserId = contactItem.contactId?._id; 
        const recipientName = contactItem.contactId?.fullName;
        if (!recipientUserId) return Alert.alert("Erreur", "Contact invalide.");

        await shareRide(activeRide._id, recipientUserId, shareNote); 
        setModals({ ...modals, share: false }); 
        setShareNote(''); 
        loadData(true); 
        Alert.alert('Succès', `Envoyé à ${recipientName}.`); 
    } catch (e) { Alert.alert('Erreur', "Échec de l'envoi."); }
  };
  
  const shareViaWhatsApp = () => {
    if (!activeRide) return;
    const date = moment(activeRide.date).format('DD/MM/YYYY');
    const time = moment(activeRide.startTime || activeRide.date).format('HH:mm');
    const msg = `📅 *Dispo Course*\n🗓 ${date} à *${time}*\n📍 ${activeRide.startLocation}\n🏁 ${activeRide.endLocation}\n🚑 ${activeRide.type}` + (shareNote ? `\n\n📝 ${shareNote}` : '');
    Linking.openURL(`whatsapp://send?text=${encodeURIComponent(msg)}`).catch(() => Alert.alert("Erreur", "WhatsApp absent."));
  };

  // --- GESTION GROUPES (CORRIGÉE POUR MULTI-GROUPES) ---
  const handleSaveGroup = async (groupData) => {
    try {
      const memberIds = groupData.members.map(m => (m.contactId && m.contactId._id) ? m.contactId._id : m._id);
      const payload = { name: groupData.name, members: memberIds };

      if (groupData._id) {
          // MODIFICATION
          const res = await api.put(`/groups/${groupData._id}`, payload);
          setMyGroups(prev => prev.map(g => g._id === groupData._id ? res.data : g));
          Alert.alert("Succès", "Groupe mis à jour !");
      } else {
          // CRÉATION (AJOUT À LA LISTE)
          const res = await api.post('/groups', payload);
          setMyGroups(prev => [...prev, res.data]);
          Alert.alert("Succès", "Nouveau groupe créé !");
      }
      setShowGroupCreator(false);
      setTimeout(() => setShowGroupList(true), 300);
    } catch (e) { Alert.alert("Erreur", "Sauvegarde impossible."); }
  };

  const handleDeleteGroup = async (groupId) => {
    try { 
        await api.delete(`/groups/${groupId}`); 
        setMyGroups(prev => prev.filter(g => g._id !== groupId)); 
    } catch (e) { Alert.alert("Erreur", "Impossible de supprimer."); }
  };

  // --- FILTRES & STATUS ---
  const markedDates = useMemo(() => { 
      const m={}; 
      allRides.forEach(r=>{ 
          const d=moment(r.date).format('YYYY-MM-DD'); 
          if(!m[d])m[d]={dots:[]}; 
          const c=r.isShared?'#FF9800':'#10B981'; 
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

  // --- RENDER HELPERS ---
  const renderSkeleton = () => (
      <View style={{marginTop: 20}}>
          {[1,2,3].map(i => (<View key={i} style={styles.skeletonCard}><View style={styles.skeletonLineShort}/><View style={styles.skeletonLineLong}/></View>))}
      </View>
  );

  const renderEmptyState = () => (
      <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}><Ionicons name="calendar-outline" size={48} color={THEME.primary} /></View>
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
      <StatusBar barStyle="dark-content" backgroundColor={THEME.bg} />
      
      {/* HEADER */}
      <View style={styles.header}>
        <View>
            <Text style={styles.headerTitle}>Mon Planning</Text>
            <Text style={styles.headerSubtitle}>{moment(selectedDate).format('dddd D MMMM').toUpperCase()}</Text>
        </View>
        <View style={styles.headerRightButtons}>
            <OffersNotification /> 
            <TouchableOpacity onPress={() => setShowCalendar(!showCalendar)} style={styles.calendarToggle}>
                <Ionicons name={showCalendar ? "chevron-up" : "calendar"} size={22} color={THEME.primary} />
            </TouchableOpacity>
        </View>
      </View>

      {/* CALENDRIER */}
      {showCalendar && (
          <View style={styles.calendarContainer}>
            <Calendar 
                onDayPress={(d) => setSelectedDate(d.dateString)} 
                markedDates={markedDates} 
                markingType={'multi-dot'} 
                theme={{ 
                    backgroundColor: THEME.card,
                    calendarBackground: THEME.card,
                    selectedDayBackgroundColor: THEME.primary,
                    selectedDayTextColor: '#ffffff',
                    todayTextColor: THEME.primary,
                    dayTextColor: THEME.text,
                    dotColor: THEME.primary,
                    arrowColor: THEME.primary,
                    monthTextColor: THEME.text,
                    textDayFontWeight: '500',
                    textMonthFontWeight: 'bold',
                    textDayHeaderFontWeight: '600'
                }} 
            />
          </View>
      )}

      {/* TOOLBAR */}
      <View style={styles.toolbar}>
          <TouchableOpacity onPress={handleImportFromClipboard} disabled={analyzing} style={styles.magicBtn}>
              {analyzing ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="sparkles" size={18} color="#FFF" />}
              <Text style={styles.magicBtnText}>Magic Paste</Text>
          </TouchableOpacity>
          <View style={{flexDirection:'row'}}>
            <TouchableOpacity onPress={() => setShowGroupList(true)} style={styles.iconBtn}>
                <Ionicons name="people" size={20} color={THEME.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.iconBtn}>
                <Ionicons name="settings-outline" size={20} color={THEME.text} />
            </TouchableOpacity>
          </View>
      </View>

      {/* LISTE COURSES */}
      <View style={styles.listContainer}>
        <View style={styles.listHeader}>
            <View style={{flexDirection:'row', alignItems:'center'}}>
              <Text style={styles.dateTitle}>{moment(selectedDate).format('D MMMM')}</Text>
              <View style={styles.countBadge}><Text style={styles.countText}>{dailyRides.length}</Text></View>
            </View>
            {dailyRides.length > 0 && (
              <TouchableOpacity onPress={handleGlobalSync} style={styles.syncBtn}>
                <Ionicons name="cloud-upload-outline" size={16} color={THEME.info} style={{marginRight: 6}} />
                <Text style={styles.syncBtnText}>Sync Tel</Text>
              </TouchableOpacity>
            )}
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
                    <View style={[styles.statusBadge, { backgroundColor: status.color, borderColor: status.color }]}>
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
      
      {/* OPTIONS : NOTE - Séparation stricte Share / Docs */}
      <RideOptionsModal 
        visible={modals.options}
        ride={activeRide}
        onClose={() => setModals({ ...modals, options: false })}
        onEdit={() => { setModals({ ...modals, options: false }); setTimeout(() => navigation.navigate('AddRide', { importedData: activeRide }), 100); }}
        onCreateReturn={() => { setModals({ ...modals, options: false }); setTimeout(() => { if(activeRide) { setReturnData(prev => ({...prev, startLocation: activeRide.endLocation, endLocation: activeRide.startLocation, date: moment(activeRide.date).format('YYYY-MM-DD')})); setReturnModal(true); }}, 100); }}
        onAddToCalendar={() => { addRideToCalendar(activeRide); setModals({ ...modals, options: false }); }}
        
        // 👇 SÉPARATION STRICTE
        onShare={() => setModals({ options: false, share: true, docs: false })} 
        onOpenDocs={() => fetchRideDocuments(activeRide)} 
        
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
                    <Text style={styles.inputLabel}>KM RÉELS</Text>
                    <View style={{flexDirection:'row', alignItems:'center'}}>
                      <TextInput style={[styles.sheetInput, {flex:1}]} placeholder="Ex: 25" placeholderTextColor="#CCC" keyboardType="numeric" value={billingData.kmReel} onChangeText={t => setBillingData({...billingData, kmReel: t})}/>
                      {activeRide?.startLocation && activeRide?.endLocation && (
                        <TouchableOpacity style={styles.autoDistanceBtn} onPress={handleCalculateDistanceForFinish} disabled={distanceCalculating}>
                          {distanceCalculating ? <ActivityIndicator size="small" color="#FFF"/> : <Ionicons name="navigate" size={18} color="#FFF"/>}
                        </TouchableOpacity>
                      )}
                    </View>
                </View>
                <View style={{flex:1}}>
                    <Text style={styles.inputLabel}>PÉAGES (€)</Text>
                    <TextInput style={styles.sheetInput} placeholder="0.00" placeholderTextColor="#CCC" keyboardType="numeric" value={billingData.peage} onChangeText={t => setBillingData({...billingData, peage: t})}/>
                </View>
            </View>
            <TouchableOpacity style={styles.confirmBtn} onPress={confirmFinishRide}>
                <Text style={styles.confirmBtnText}>TERMINER LA COURSE</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setFinishModal(false)} style={{marginTop:15, alignSelf:'center'}}>
                <Text style={{color:THEME.textLight, fontSize: 16}}>Annuler</Text>
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
                    <Ionicons name="time" size={24} color={THEME.primary} />
                    <Text style={{fontSize:22, fontWeight:'700', marginLeft:10, color: THEME.text}}>{returnData.time || "--:--"}</Text>
                </TouchableOpacity>
                {showTimePicker && (<DateTimePicker value={tempReturnDate} mode="time" is24Hour display="spinner" onChange={(e,d) => { setShowTimePicker(Platform.OS === 'ios'); if(d) { setTempReturnDate(d); setReturnData(p => ({...p, time: moment(d).format('HH:mm')})); } }} />)}
                <TouchableOpacity style={[styles.confirmBtn, {backgroundColor: THEME.primary}]} onPress={confirmCreateReturn}>
                    <Text style={styles.confirmBtnText}>VALIDER RETOUR</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setReturnModal(false)} style={{marginTop:15, alignSelf:'center'}}>
                    <Text style={{color:THEME.textLight, fontSize: 16}}>Annuler</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL PARTAGE */}
      <Modal visible={modals.share} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: THEME.card }}>
          <View style={styles.modalHeader}><Text style={styles.headerTitle}>Partager</Text><TouchableOpacity onPress={() => setModals({...modals, share: false})}><Ionicons name="close-circle" size={32} color={THEME.textLight}/></TouchableOpacity></View>
          <View style={{padding: 20, flex: 1}}>
             <TextInput style={styles.noteInput} placeholder="Ajouter une note (code, étage...)" placeholderTextColor={THEME.textLight} multiline numberOfLines={3} value={shareNote} onChangeText={setShareNote} textAlignVertical="top"/>
             <TouchableOpacity style={styles.whatsappBtn} onPress={shareViaWhatsApp}>
                <Ionicons name="logo-whatsapp" size={22} color="#FFF" style={{marginRight: 10}}/>
                <Text style={styles.whatsappText}>Envoyer par WhatsApp</Text>
             </TouchableOpacity>
             <Text style={styles.sectionTitle}>Ou via l'application :</Text>
             <FlatList 
               data={contacts || []} 
               keyExtractor={(item) => item._id} 
               renderItem={({ item }) => {
                 if (!item.contactId) return null;
                 return (
                   <TouchableOpacity style={styles.contactRow} onPress={() => shareInternal(item)}>
                     <View style={{flexDirection:'row', alignItems:'center'}}>
                        <View style={{width:40, height:40, borderRadius:20, backgroundColor: THEME.bg, alignItems:'center', justifyContent:'center', marginRight: 12}}>
                          <Text style={{fontWeight:'bold', color: THEME.primary}}>
                             {item.contactId.fullName ? item.contactId.fullName.charAt(0) : '?'}
                          </Text>
                        </View>
                        <Text style={styles.contactName}>{item.contactId.fullName}</Text>
                     </View>
                     <Ionicons name="paper-plane-outline" size={20} color={THEME.primary} />
                   </TouchableOpacity>
                 );
               }} 
               ListEmptyComponent={<Text style={{color:THEME.textLight, textAlign:'center', marginTop: 20}}>Aucun collègue enregistré.</Text>} 
             />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ✅ MODAL DOCS (SEPARÉ) */}
      <Modal visible={modals.docs} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.docModalContainer}>
          <View style={styles.modalHeader}>
              <Text style={styles.headerTitle}>Dossier Médical</Text>
              <TouchableOpacity onPress={() => setModals({...modals, docs: false})}><Ionicons name="close-circle" size={32} color={THEME.textLight}/></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{padding: 20}}>
              {loadingDocs ? <ActivityIndicator size="large" color={THEME.primary}/> : patientDocs.length === 0 ? 
                <View style={styles.emptyContainer}>
                    <Ionicons name="document-text-outline" size={50} color={THEME.textLight} />
                    <Text style={styles.emptyText}>Aucun document.</Text>
                </View> 
                : patientDocs.map((d, i) => (
                  <View key={i} style={styles.docCard}>
                      <View style={styles.docHeader}>
                        <Text style={styles.docTitle}>{d.type}</Text>
                        <Ionicons name="checkmark-circle" size={18} color={THEME.success} />
                      </View>
                      <Image source={{ uri: d.imageData }} style={styles.docImage} resizeMode="contain"/>
                  </View>
              ))}
              <View style={styles.addDocSection}>
                 <Text style={styles.sectionTitle}>Ajouter un document</Text>
                 <View style={styles.scanGrid}>
                    <View style={styles.scanColumn}><DocumentScannerButton title="BT" docType="PMT" color={THEME.primary} onScan={handleDocumentScanned} isLoading={uploading}/><TouchableOpacity style={styles.importBtn} onPress={() => pickFromGallery('PMT')}><Text style={styles.importText}>Galerie</Text></TouchableOpacity></View>
                    <View style={styles.scanColumn}><DocumentScannerButton title="Vitale" docType="CarteVitale" color={THEME.success} onScan={handleDocumentScanned} isLoading={uploading}/><TouchableOpacity style={styles.importBtn} onPress={() => pickFromGallery('CarteVitale')}><Text style={styles.importText}>Galerie</Text></TouchableOpacity></View>
                    <View style={styles.scanColumn}><DocumentScannerButton title="Mutuelle" docType="Mutuelle" color={THEME.info} onScan={handleDocumentScanned} isLoading={uploading}/><TouchableOpacity style={styles.importBtn} onPress={() => pickFromGallery('Mutuelle')}><Text style={styles.importText}>Galerie</Text></TouchableOpacity></View>
                 </View>
              </View>
          </ScrollView>
        </View>
      </Modal>

      {/* MODAL VERIF CPAM */}
      <Modal visible={btValidationModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.finishCard, {backgroundColor: '#FFF'}]}>
            <View style={styles.finishHeader}>
                <Text style={[styles.finishTitle, {color: THEME.text}]}>🛡️ Vérification CPAM</Text>
                <TouchableOpacity onPress={() => setBtValidationModal(false)}><Ionicons name="close" size={24} color={THEME.text} /></TouchableOpacity>
            </View>
            <Text style={styles.cpamWarning}>La date de prescription doit être antérieure ou égale à la date de la course.</Text>
            
            <TouchableOpacity onPress={() => setShowPrescriptionPicker(true)} style={styles.datePickerBtn}>
                <Ionicons name="calendar" size={20} color={THEME.primary} style={{marginRight:10}}/>
                <Text style={{fontSize:18, fontWeight:'bold', color: THEME.text}}>{moment(prescriptionDate).format('DD/MM/YYYY')}</Text>
            </TouchableOpacity>
            
            {showPrescriptionPicker && (<DateTimePicker value={prescriptionDate} mode="date" display="default" onChange={(event, date) => { if(Platform.OS === 'android') setShowPrescriptionPicker(false); if(date) setPrescriptionDate(date); }} />)}
            
            <View style={styles.comparisonRow}>
                <View>
                    <Text style={styles.compLabel}>COURSE</Text>
                    <Text style={styles.compValue}>{moment(activeRide?.date).format('DD/MM')}</Text>
                </View>
                <Ionicons name={moment(prescriptionDate).isAfter(moment(activeRide?.date)) ? "alert-circle" : "arrow-forward-circle"} size={30} color={moment(prescriptionDate).isAfter(moment(activeRide?.date)) ? THEME.danger : THEME.success} />
                <View>
                    <Text style={styles.compLabel}>PRESCRIPTION</Text>
                    <Text style={[styles.compValue, moment(prescriptionDate).isAfter(moment(activeRide?.date)) && {color:THEME.danger}]}>{moment(prescriptionDate).format('DD/MM')}</Text>
                </View>
            </View>
            
            <TouchableOpacity style={[styles.confirmBtn, {backgroundColor: THEME.primary}]} onPress={validateAndUploadBT}>
                <Text style={{color:'#FFF', fontWeight:'bold', fontSize: 16}}>VALIDER LE BT</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <IncomingOfferToast onRideAccepted={() => loadData(true)} />
    </ScreenWrapper>
  );
}

// ============================================================
// STYLE SHEET "PRO"
// ============================================================
const styles = StyleSheet.create({
  // --- HEADER ---
  header: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    paddingHorizontal: 20, paddingVertical: 15, backgroundColor: THEME.card, 
    elevation: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, 
    shadowOffset: {width:0, height:4}, zIndex: 10
  },
  headerTitle: { fontSize: 28, fontWeight: '800', color: THEME.text, letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, color: THEME.primary, fontWeight: '600', letterSpacing: 0.5 },
  headerRightButtons: { flexDirection: 'row', alignItems: 'center' },
  calendarToggle: { padding: 10, backgroundColor: THEME.bg, borderRadius: 12, marginLeft: 12 },

  // --- CALENDRIER ---
  calendarContainer: { 
    borderRadius: 24, overflow: 'hidden', margin: 15, backgroundColor: THEME.card,
    elevation: 8, shadowColor: THEME.primary, shadowOpacity: 0.15, shadowRadius: 15,
    shadowOffset: {width:0, height:8}
  },

  // --- TOOLBAR ---
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 20, marginTop: 5 },
  magicBtn: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: THEME.primary, 
    paddingVertical: 12, paddingHorizontal: 24, borderRadius: 30, elevation: 6,
    shadowColor: THEME.primary, shadowOpacity: 0.4, shadowOffset: {width:0, height:6}, shadowRadius: 8
  },
  magicBtnText: { color: '#FFF', fontWeight: '700', marginLeft: 8, fontSize: 15 },
  iconBtn: { padding: 12, backgroundColor: THEME.card, borderRadius: 14, marginLeft: 12, elevation: 2, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 3, shadowOffset: {width:0, height:2} },

  // --- LISTE ---
  listContainer: { flex: 1, paddingHorizontal: 20 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  dateTitle: { fontSize: 20, fontWeight: '800', textTransform: 'capitalize', color: THEME.text },
  syncBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EBF5FF', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
  syncBtnText: { color: THEME.info, fontWeight: '700', fontSize: 12 },
  countBadge: { backgroundColor: THEME.primaryLight, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, marginLeft: 8 },
  countText: { color: THEME.primary, fontWeight: '800', fontSize: 12 },
  rideWrapper: { marginBottom: 18 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, marginBottom: -10, zIndex: 1, marginLeft: 15, borderWidth: 1 },
  statusText: { fontSize: 10, fontWeight: '800', marginLeft: 4 },

  // --- EMPTY STATE ---
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyIconCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: THEME.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: THEME.text },
  emptyText: { fontSize: 15, color: THEME.textLight, marginTop: 8, textAlign: 'center', maxWidth: '70%' },
  emptyBtn: { marginTop: 30, paddingVertical: 12, paddingHorizontal: 24, borderWidth: 2, borderColor: THEME.primary, borderRadius: 30 },
  emptyBtnText: { color: THEME.primary, fontWeight: '700' },

  // --- SKELETON ---
  skeletonCard: { backgroundColor: THEME.card, padding: 20, borderRadius: 20, marginBottom: 15 },
  skeletonLineShort: { width: '40%', height: 16, backgroundColor: THEME.bg, borderRadius: 8, marginBottom: 12 },
  skeletonLineLong: { width: '80%', height: 16, backgroundColor: THEME.bg, borderRadius: 8 },

  // --- MODALS BASE ---
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: THEME.card, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 30, paddingBottom: 50, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 20, elevation: 20 },
  modalHandle: { width: 50, height: 6, backgroundColor: THEME.border, borderRadius: 3, alignSelf: 'center', marginBottom: 25 },
  bottomSheetTitle: { fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 30, color: THEME.text },
  
  // --- FORMS ---
  inputRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
  autoDistanceBtn: { marginLeft: 8, backgroundColor: '#2E7D32', width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  inputLabel: { fontSize: 12, fontWeight: '700', color: THEME.textLight, marginBottom: 8, letterSpacing: 1 },
  sheetInput: { backgroundColor: THEME.bg, borderRadius: 16, padding: 18, fontSize: 20, fontWeight: '700', textAlign: 'center', color: THEME.text },
  confirmBtn: { backgroundColor: THEME.success, padding: 20, borderRadius: 20, alignItems: 'center', shadowColor: THEME.success, shadowOpacity: 0.4, shadowOffset: {width:0, height:6}, shadowRadius: 10, elevation: 6 },
  confirmBtnText: { color: '#FFF', fontWeight: '800', fontSize: 16, letterSpacing: 0.5 },
  timeSelectBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: THEME.bg, padding: 24, borderRadius: 20, justifyContent: 'center', marginBottom: 30 },

  // --- DOCS MODAL ---
  docModalContainer: { flex: 1, backgroundColor: THEME.bg },
  modalHeader: { padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: THEME.card, borderBottomWidth: 1, borderColor: THEME.border },
  docCard: { backgroundColor: THEME.card, borderRadius: 20, marginBottom: 20, padding: 15, elevation: 4, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8 },
  docHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  docTitle: { fontWeight: '700', fontSize: 16, color: THEME.text },
  docImage: { width: '100%', height: height * 0.3, borderRadius: 12, backgroundColor: THEME.bg },
  addDocSection: { marginTop: 10, paddingTop: 20, borderTopWidth: 1, borderTopColor: THEME.border },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 20, color: THEME.text },
  scanGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  scanColumn: { alignItems: 'center', width: '31%' },
  importBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: THEME.bg, borderRadius: 20 },
  importText: { fontSize: 11, color: THEME.textLight, marginLeft: 4, fontWeight: '700' },

  // --- SHARE MODAL ---
  noteInput: { backgroundColor: THEME.bg, borderRadius: 16, padding: 18, height: 100, marginBottom: 20, borderWidth: 1, borderColor: THEME.border, fontSize: 16, color: THEME.text },
  whatsappBtn: { backgroundColor: '#25D366', padding: 18, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 30, elevation: 4, shadowColor: '#25D366', shadowOpacity: 0.3, shadowRadius: 8 },
  whatsappText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: THEME.text, marginBottom: 15 },
  contactRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 18, borderBottomWidth: 1, borderColor: THEME.border },
  contactName: { fontSize: 16, fontWeight: '600', color: THEME.text },

  // --- VERIFICATION CPAM ---
  finishCard: { width: '85%', borderRadius: 24, padding: 25, elevation: 10 },
  finishHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  finishTitle: { fontSize: 20, fontWeight: '800' },
  cpamWarning: { fontSize: 14, color: THEME.textLight, marginBottom: 20, lineHeight: 22, textAlign: 'center' },
  datePickerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: THEME.bg, borderRadius: 16, marginBottom: 25, borderWidth: 1, borderColor: THEME.border },
  comparisonRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginBottom: 30, backgroundColor: THEME.bg, padding: 15, borderRadius: 16 },
  compLabel: { fontSize: 10, color: THEME.textLight, fontWeight: '800', textAlign: 'center', marginBottom: 4 },
  compValue: { fontSize: 18, fontWeight: '800', color: THEME.text, textAlign: 'center' },
});