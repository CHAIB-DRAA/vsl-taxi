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
import RideCreatorModal from '../components/RideCreatorModal'; 

// --- SERVICES & CONTEXTE ---
import { syncDailyRidesToCalendar, addRideToCalendar } from '../services/calendarService';
import api, { updateRide, shareRide, deleteRide } from '../services/api';
import { useData } from '../contexts/DataContext'; 

const { height, width } = Dimensions.get('window');

// --- CONFIG CALENDRIER FR ---
LocaleConfig.locales['fr'] = {
  monthNames: ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'],
  dayNames: ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'],
  dayNamesShort: ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'],
  today: "Aujourd'hui"
};
LocaleConfig.defaultLocale = 'fr';

// --- COULEURS THÈME ---
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
  
  // 3. ÉTATS IA & FILE D'ATTENTE
  const [showRideCreator, setShowRideCreator] = useState(false);
  const [importedRideData, setImportedRideData] = useState(null);
  const [analyzing, setAnalyzing] = useState(false); 
  const [rideQueue, setRideQueue] = useState([]); 

  // 4. MODALS
  const [modals, setModals] = useState({ options: false, share: false, docs: false });
  const [finishModal, setFinishModal] = useState(false); 
  const [returnModal, setReturnModal] = useState(false); 
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [showGroupCreator, setShowGroupCreator] = useState(false);
  const [showGroupList, setShowGroupList] = useState(false); 
  const [editingGroup, setEditingGroup] = useState(null); 
  
  // 5. DONNÉES LOCALES & DOCS
  const [myGroups, setMyGroups] = useState([]); 
  const [patientDocs, setPatientDocs] = useState([]);
  const [allPMTs, setAllPMTs] = useState([]); 

  // 6. FORMULAIRES TEMPORAIRES
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

  // --- GESTIONNAIRE DE FILE D'ATTENTE (ROBOT) ---
  useEffect(() => {
    if (!showRideCreator && rideQueue.length > 0) {
        const nextRideToValidate = rideQueue[0];
        setImportedRideData(nextRideToValidate);
        setTimeout(() => setShowRideCreator(true), 300);
    }
    if (!showRideCreator && rideQueue.length === 0 && importedRideData) {
        setImportedRideData(null); 
    }
  }, [rideQueue, showRideCreator]);

  // --- API CALLS ---
  const fetchGlobalPMTs = async () => { try { const res = await api.get('/documents/pmts/all'); setAllPMTs(res.data); } catch (err) {} };
  const fetchGroups = async () => { try { const res = await api.get('/groups'); setMyGroups(res.data); } catch (e) {} };

  // --- ACTIONS LOGISTIQUE ---
 // --- DANS AgendaScreen.js ---

 const handleImportFromClipboard = async () => {
  const text = await Clipboard.getStringAsync();
  
  if (!text) {
      return Alert.alert("Presse-papier vide", "Copiez d'abord le message.");
  }

  setAnalyzing(true); 

  try {
      const response = await api.post('/ai/parse-ride', { text });
      let aiData = response.data; 

      // Normalisation (au cas où l'IA renvoie un tableau ou un objet unique)
      let ridesFound = [];
      if (aiData.rides && Array.isArray(aiData.rides)) {
          ridesFound = aiData.rides;
      } else if (Array.isArray(aiData)) {
          ridesFound = aiData;
      } else {
          ridesFound = [aiData];
      }
      
      if (ridesFound.length > 0) {
          // On prend la première course trouvée
          const rideToEdit = ridesFound[0];
          
          Vibration.vibrate(50);
          
          // 👇 LA MODIFICATION EST ICI : On navigue vers l'écran de création
          // On passe les données via 'importedData'
          navigation.navigate('AddRide', { importedData: rideToEdit }); 
          
          if (ridesFound.length > 1) {
              Alert.alert("Info", "Plusieurs courses détectées. La première a été chargée pour modification.");
          }
      } else {
           Alert.alert("Oups", "Aucune course claire trouvée dans le texte.");
      }

  } catch (e) {
      console.error(e);
      Alert.alert("Erreur IA", "L'analyse a échoué.");
  } finally {
      setAnalyzing(false);
  }
};
  const handleSaveRide = async (rideData) => {
      try {
          const fullDate = moment(selectedDate).set({
              hour: moment(rideData.date).hour(),
              minute: moment(rideData.date).minute()
          }).toISOString();

          if (rideData._id) {
              await api.put(`/rides/${rideData._id}`, { ...rideData, date: fullDate });
              Alert.alert("Mise à jour", "La course a été modifiée.");
              setShowRideCreator(false);
              setImportedRideData(null); 
          } else {
              await api.post('/rides', { ...rideData, date: fullDate, status: 'Confirmée' });
              setRideQueue(prev => prev.slice(1)); 
              setShowRideCreator(false);
          }
          loadData(true); 
      } catch (e) { Alert.alert("Erreur", "Sauvegarde impossible."); }
  };

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

  const handleDelete = async () => {
    if (!activeRide) return;
    Alert.alert(
      "Supprimer",
      "Voulez-vous vraiment supprimer cette course ?",
      [
        { text: "Annuler", style: "cancel" },
        { 
          text: "Supprimer", 
          style: "destructive", 
          onPress: async () => {
            try {
              await deleteRide(activeRide._id);
              setModals({ ...modals, options: false });
              loadData(true);
              Vibration.vibrate(50);
            } catch (e) {
              Alert.alert("Erreur", "Impossible de supprimer.");
            }
          }
        }
      ]
    );
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

  // --- GESTION GROUPES (C'est ici que c'était manquant) ---
  
  // 1. Sauvegarder un groupe (Création ou Modif)
  const handleSaveGroup = async (groupData) => {
    try {
      // On s'assure d'envoyer uniquement les IDs des membres
      const memberIds = groupData.members.map(m => (m.contactId && m.contactId._id) ? m.contactId._id : m._id);
      const payload = { name: groupData.name, members: memberIds };

      if (groupData._id) {
          // Modification
          const res = await api.put(`/groups/${groupData._id}`, payload);
          setMyGroups(prev => prev.map(g => g._id === groupData._id ? res.data : g));
          Alert.alert("Succès", "Groupe modifié !");
      } else {
          // Création
          const res = await api.post('/groups', payload);
          setMyGroups(prev => [...prev, res.data]);
          Alert.alert("Succès", "Groupe créé !");
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Erreur", "Impossible de sauvegarder le groupe.");
    }
  };

  // 2. Supprimer un groupe
  const handleDeleteGroup = async (groupId) => {
    try { 
        await api.delete(`/groups/${groupId}`); 
        setMyGroups(prev => prev.filter(g => g._id !== groupId)); 
        Alert.alert("Supprimé", "Le groupe a été supprimé."); 
    } catch (e) { 
        Alert.alert("Erreur", "Impossible de supprimer."); 
    }
  };

  // --- FILTRES & HELPERS ---
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
            setTimeout(() => { setImportedRideData(activeRide); setShowRideCreator(true); }, 200);
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

      {/* RIDE CREATOR (CREATE / EDIT) */}
      <RideCreatorModal 
        visible={showRideCreator}
        onClose={() => {
            if (importedRideData && !importedRideData._id) setRideQueue(prev => prev.slice(1));
            setShowRideCreator(false);
            setImportedRideData(null);
        }}
        initialData={importedRideData}
        onSave={handleSaveRide}
      />

      {/* GESTION GROUPE (FIX CORRIGÉ : props onSaveGroup et onDelete maintenant liées) */}
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

      {/* FIN DE COURSE (KM & PÉAGE) */}
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

                <TouchableOpacity style={[styles.confirmBtn, {backgroundColor: THEME.primary}]} onPress={async () => {
                    if(!returnData.time) return Alert.alert("Erreur", "Heure requise");
                    const [h, m] = returnData.time.split(':');
                    const d = moment(returnData.date).hour(parseInt(h)).minute(parseInt(m)).toISOString();
                    await api.post('/rides', { 
                        patientName: activeRide.patientName, patientPhone: activeRide.patientPhone,
                        startLocation: returnData.startLocation, endLocation: returnData.endLocation,
                        type: 'Retour', date: d, status: 'Confirmée'
                    });
                    setReturnModal(false); loadData(true); Alert.alert("Succès", "Retour créé !");
                }}>
                    <Text style={styles.confirmBtnText}>VALIDER RETOUR</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setReturnModal(false)} style={{marginTop:15, alignSelf:'center'}}>
                    <Text style={{color:'#888'}}>Annuler</Text>
                </TouchableOpacity>
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
  docCard: { backgroundColor: '#FFF', borderRadius: 16, marginBottom: 20, padding: 12, elevation: 2 },
  docTitle: { fontWeight: 'bold', marginBottom: 8, fontSize: 16, color: '#333' },
  docImage: { width: '100%', height: height * 0.35, borderRadius: 8, backgroundColor: '#EEE' },
  addDocSection: { marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#DDD' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#333' },
  scanGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  scanColumn: { alignItems: 'center', width: '30%' },
  importBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 8, padding: 6, backgroundColor: '#E0E0E0', borderRadius: 20 },
  importText: { fontSize: 10, color: '#555', marginLeft: 4, fontWeight: 'bold' }
});