import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, ActivityIndicator, StyleSheet,
  Alert, TouchableOpacity, Modal, TextInput, Image, ScrollView, KeyboardAvoidingView, Platform, Dimensions, Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import moment from 'moment';
import 'moment/locale/fr';
import OffersNotification from '../components/OffersNotification'; 
// --- SERVICE CALENDRIER ---
import { syncDailyRidesToCalendar, addRideToCalendar } from '../services/calendarService';

// --- MODULES SPÉCIFIQUES ---
import DateTimePicker from '@react-native-community/datetimepicker'; 
import * as ImagePicker from 'expo-image-picker'; 

// --- COMPOSANTS ---
import ScreenWrapper from '../components/ScreenWrapper';
import RideCard from '../components/RideCard'; 
import DocumentScannerButton from '../components/DocumentScannerButton'; 
import RideOptionsModal from '../components/RideOptionsModal';

// 👇 AJOUT DES NOUVEAUX COMPOSANTS
import DispatchModal from '../components/DispatchModal'; 
import GroupCreatorModal from '../components/GroupCreatorModal'; 

// --- CONTEXTE & API ---
import { useData } from '../contexts/DataContext'; 
import api, { updateRide, shareRide, deleteRide } from '../services/api';

const { height } = Dimensions.get('window');

// --- CONFIGURATION DU CALENDRIER ---
LocaleConfig.locales['fr'] = {
  monthNames: ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'],
  dayNames: ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'],
  dayNamesShort: ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'],
  today: "Aujourd'hui"
};
LocaleConfig.defaultLocale = 'fr';

export default function AgendaScreen({ navigation }) {
  // 1. CONTEXTE
  const { allRides, contacts, loading, loadData, handleGlobalRespond } = useData();

  // 2. ÉTATS AGENDA
  const [selectedDate, setSelectedDate] = useState(moment().format('YYYY-MM-DD'));
  const [showCalendar, setShowCalendar] = useState(true);
  const [activeRide, setActiveRide] = useState(null); 
  
  // 3. MODALS EXISTANTS
  const [modals, setModals] = useState({ options: false, share: false, docs: false });
  const [finishModal, setFinishModal] = useState(false); 
  const [returnModal, setReturnModal] = useState(false); 

  // 👇 4. NOUVEAUX ÉTATS (DISPATCH & GROUPES)
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [showGroupCreator, setShowGroupCreator] = useState(false);
  const [myGroups, setMyGroups] = useState([]); // Liste des groupes créés

  // --- ÉTATS VALIDATION BT (CPAM) ---
  const [btValidationModal, setBtValidationModal] = useState(false);
  const [prescriptionDate, setPrescriptionDate] = useState(new Date());
  const [showPrescriptionPicker, setShowPrescriptionPicker] = useState(false);
  const [tempScanUri, setTempScanUri] = useState(null); 

  // 5. RETOUR & TIMEPICKER
  const [returnData, setReturnData] = useState({ date: '', time: '', startLocation: '', endLocation: '', type: 'Retour' });
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempReturnDate, setTempReturnDate] = useState(new Date());

  // 6. PARTAGE
  const [shareNote, setShareNote] = useState(''); 

  // 7. DOCS & PMT
  const [patientDocs, setPatientDocs] = useState([]);
  const [allPMTs, setAllPMTs] = useState([]); 
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [uploading, setUploading] = useState(false);

  // 8. CLÔTURE
  const [billingData, setBillingData] = useState({ kmReel: '', peage: '' });

  // --- CHARGEMENT BT/PMT ---
  useEffect(() => { fetchGlobalPMTs(); }, [allRides]); 
  const fetchGlobalPMTs = async () => { try { const res = await api.get('/documents/pmts/all'); setAllPMTs(res.data); } catch (err) {} };

  // --- LOGIQUE BT STATUS ---
  const getPMTStatusForRide = (ride) => {
    const typesMedicaux = ['VSL', 'Ambulance', 'Taxi', 'Aller', 'Retour', 'Consultation'];
    if (!typesMedicaux.includes(ride.type) || ride.endTime) return null;

    const patientPMTs = allPMTs.filter(doc => doc.patientName === ride.patientName);
    
    // Cas 1 : Aucun BT
    if (patientPMTs.length === 0) {
        return { color: '#D32F2F', text: 'BT MANQUANT (À RÉCUPÉRER)', icon: 'alert-circle' };
    }

    // On prend le plus récent
    patientPMTs.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
    const lastPMT = patientPMTs[0];
    const max = lastPMT.maxRides || 1; 

    // Cas 2 : Série illimitée
    if (max >= 1000) {
        return { color: '#4CAF50', text: 'BT VALIDE (SÉRIE)', icon: 'checkmark-circle' };
    }

    // Cas 3 : Calcul consommation
    const ridesSince = allRides.filter(r => r.patientName === ride.patientName && new Date(r.date) >= new Date(lastPMT.uploadDate) && r.status !== 'Annulée');
    let consumed = 0; ridesSince.forEach(r => consumed += (r.isRoundTrip ? 1 : 0.5));
    const remaining = max - consumed;

    if (remaining <= 0) return { color: '#D32F2F', text: `BT ÉPUISÉ (${consumed}/${max})`, icon: 'warning' };
    if (remaining <= 1) return { color: '#FF9800', text: `BT FINISSANT (Reste ${remaining})`, icon: 'alert-circle' };
    return { color: '#4CAF50', text: `BT OK (Reste ${remaining})`, icon: 'document-text' };
  };

  // --- GESTION DOCS ---
  const fetchRideDocuments = async (ride) => {
    if (!ride) return;
    try { setLoadingDocs(true); const res = await api.get(`/documents/by-ride/${ride._id}`); setPatientDocs(res.data); setModals({ ...modals, options: false, docs: true }); } 
    catch (e) { Alert.alert("Info", "Erreur dossier."); } finally { setLoadingDocs(false); }
  };

  // 1. INTERCEPTION DU SCAN POUR VALIDATION BT
  const handleDocumentScanned = async (uri, docType) => {
    if (docType === 'PMT') {
      setTempScanUri(uri);
      setPrescriptionDate(new Date(activeRide.date)); // Date par défaut = date course
      setBtValidationModal(true);
    } else {
      await uploadDocument(uri, docType);
    }
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
    } 
    catch (e) { Alert.alert("Erreur", "Galerie inaccessible"); }
  };

  // 2. LOGIQUE VALIDATION CPAM (ANTÉRIORITÉ)
  const validateAndUploadBT = async () => {
    const rideDate = moment(activeRide.date).startOf('day');
    const prescDate = moment(prescriptionDate).startOf('day');

    if (prescDate.isAfter(rideDate)) {
      Alert.alert(
        "❌ RISQUE DE REJET CPAM",
        "Attention : La date de prescription est POSTÉRIEURE à la date de la course.\n\nLa CPAM refusera le paiement.\n\nÊtes-vous sûr de vouloir envoyer ce BT ?",
        [
          { text: "Corriger la date", style: "cancel" },
          { text: "Forcer l'envoi", style: 'destructive', onPress: () => finalizeUploadBT() }
        ]
      );
      return;
    }
    finalizeUploadBT();
  };

  const finalizeUploadBT = async () => {
    setBtValidationModal(false);
    if (tempScanUri) {
        await uploadDocument(tempScanUri, 'PMT');
        setTempScanUri(null);
    }
  };

  const uploadDocument = async (uri, docType) => {
    if (!activeRide) return;
    try { setUploading(true); const f = new FormData(); f.append('photo', { uri: uri, name: `scan.jpg`, type: 'image/jpeg' }); f.append('patientName', activeRide.patientName); f.append('docType', docType); f.append('rideId', activeRide._id); await api.post('/documents/upload', f, { headers: { 'Content-Type': 'multipart/form-data' }, transformRequest: d => d }); Alert.alert("Succès", "Document ajouté !"); fetchRideDocuments(activeRide); } 
    catch (e) { Alert.alert("Erreur", "Echec."); } finally { setUploading(false); }
  };

  // --- RETOUR ---
  const prepareReturnRide = () => { if (!activeRide) return; setReturnData({ date: moment(activeRide.date).format('YYYY-MM-DD'), time: '', startLocation: activeRide.endLocation, endLocation: activeRide.startLocation, type: 'Retour' }); setTempReturnDate(new Date()); setModals({ ...modals, options: false }); setReturnModal(true); };
  const onReturnTimeChange = (event, selectedDate) => { if (Platform.OS === 'android') setShowTimePicker(false); if (selectedDate) { setTempReturnDate(selectedDate); setReturnData(prev => ({ ...prev, time: moment(selectedDate).format('HH:mm') })); } };
  const confirmCreateReturn = async () => {
    if (!returnData.time) return Alert.alert("Erreur", "Heure requise.");
    try { const [h, m] = returnData.time.split(':'); const d = moment(returnData.date).hour(parseInt(h)).minute(parseInt(m)).toISOString(); const n = { patientName: activeRide.patientName, patientPhone: activeRide.patientPhone, startLocation: returnData.startLocation, endLocation: returnData.endLocation, type: 'Retour', date: d, status: 'Confirmée', isRoundTrip: false }; await api.post('/rides', n); setReturnModal(false); loadData(true); Alert.alert("Succès", "Retour planifié !"); } catch (e) { Alert.alert("Erreur", "Impossible."); }
  };

  // --- PARTAGE ---
  const shareInternal = async (contact) => {
    if (!activeRide) return;
    try { await shareRide(activeRide._id, contact.contactId._id, shareNote); setModals({ ...modals, share: false }); setShareNote(''); loadData(true); Alert.alert('Succès', `Envoyé à ${contact.contactId.fullName}.`); } catch (e) { Alert.alert('Erreur', "Échec."); }
  };
  const shareViaWhatsApp = () => {
    if (!activeRide) return;
    const date = moment(activeRide.date).format('DD/MM/YYYY');
    const time = moment(activeRide.startTime || activeRide.date).format('HH:mm');
    let msg = `📅 *Dispo Course*\n🗓 ${date} à *${time}*\n📍 DEPART: ${activeRide.startLocation}\n🏁 ARRIVEE: ${activeRide.endLocation}\n🚑 ${activeRide.type}`;
    if (shareNote) msg += `\n\n📝 *Note:* ${shareNote}`;
    Linking.openURL(`whatsapp://send?text=${encodeURIComponent(msg)}`).catch(() => Alert.alert("Erreur", "WhatsApp non installé."));
  };

  // --- ACTIONS (MAPPY, CLOTURE) ---
  const openMappyRoute = () => { if (!activeRide) return; const s = encodeURIComponent(activeRide.startLocation||""); const e = encodeURIComponent(activeRide.endLocation||""); Linking.openURL(`https://fr.mappy.com/itineraire#/voiture/${s}/${e}/car`).catch(()=>Alert.alert("Err","Mappy HS")); };
  const handleStatusChange = async (r, a) => { try { if (a === 'start') { await updateRide(r._id, { startTime: new Date().toISOString() }); loadData(true); } else if (a === 'finish') { setActiveRide(r); setBillingData({ kmReel: '', peage: '' }); setFinishModal(true); } } catch (e) { Alert.alert('Erreur', "Impossible."); } };
  const confirmFinishRide = async () => { if (!billingData.kmReel) return Alert.alert("Erreur", "KM requis."); try { await updateRide(activeRide._id, { endTime: new Date().toISOString(), realDistance: parseFloat(billingData.kmReel), tolls: parseFloat(billingData.peage) || 0, status: 'Terminée' }); setFinishModal(false); loadData(true); Alert.alert("Succès", "Terminée."); } catch (e) { Alert.alert("Erreur", "Echec."); } };
  const handleDelete = async () => { try { await deleteRide(activeRide._id); setModals({...modals, options:false}); loadData(true); } catch(e){} };

  // --- FILTRES LISTE ---
  const markedDates = useMemo(() => { const m={}; allRides.forEach(r=>{ const d=moment(r.date).format('YYYY-MM-DD'); if(!m[d])m[d]={dots:[]}; const c=r.isShared?'#FF9800':'#4CAF50'; if(!m[d].dots.find(dot=>dot.color===c))m[d].dots.push({key:r._id,color:c}); }); m[selectedDate]={...m[selectedDate],selected:true,selectedColor:'#FF6B00'}; return m; }, [allRides, selectedDate]);
  const dailyRides = useMemo(() => allRides.filter(r => moment(r.date).format('YYYY-MM-DD') === selectedDate && (!r.isShared || r.statusPartage !== 'refused')).sort((a, b) => new Date(a.date) - new Date(b.date)), [allRides, selectedDate]);

  // ACTION SYNC
  const handleSyncDay = () => {
    syncDailyRidesToCalendar(dailyRides);
  };

  // ============================================================
  // RENDU
  // ============================================================
  return (
    <ScreenWrapper>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Planning</Text>
        <View style={styles.headerRightButtons}>
        <OffersNotification />
            <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={[styles.iconButton, {marginRight: 10}]}>
                <Ionicons name="settings-outline" size={24} color="#333" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowCalendar(!showCalendar)} style={[styles.iconButton, {backgroundColor: '#FFF3E0'}]}>
                <Ionicons name={showCalendar ? "chevron-up" : "calendar-outline"} size={24} color="#FF6B00" />
            </TouchableOpacity>
        </View>
      </View>

      {/* CALENDRIER */}
      {showCalendar && <Calendar onDayPress={(d) => setSelectedDate(d.dateString)} markedDates={markedDates} markingType={'multi-dot'} theme={{ todayTextColor: '#FF6B00', selectedDayBackgroundColor: '#FF6B00', arrowColor: '#FF6B00' }} />}

      {/* LISTE */}
      <View style={styles.listContainer}>
        <View style={styles.listHeader}>
            <Text style={styles.dateTitle}>{moment(selectedDate).format('dddd D MMMM')}</Text>
            
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                {/* BOUTON SYNC GOOGLE */}
                {dailyRides.length > 0 && (
                  <TouchableOpacity onPress={handleSyncDay} style={styles.syncBtn}>
                    <Ionicons name="logo-google" size={16} color="#FFF" style={{marginRight: 4}} />
                    <Text style={styles.syncBtnText}>Sync</Text>
                  </TouchableOpacity>
                )}
                <View style={styles.countBadge}><Text style={styles.countText}>{dailyRides.length}</Text></View>
            </View>
        </View>
        
        {loading ? <ActivityIndicator color="#FF6B00" size="large" style={{marginTop: 50}} /> : (
          <FlatList 
            data={dailyRides} 
            keyExtractor={i => i._id} 
            renderItem={({ item }) => {
              const s = getPMTStatusForRide(item);
              return (
                <View style={styles.rideBlock}>
                  {/* ALERTE BT (ex-PMT) */}
                  {s && (
                    <View style={[styles.pmtHeader, { backgroundColor: s.color }]}>
                        <Ionicons name={s.icon} size={14} color="#FFF" />
                        <Text style={styles.pmtHeaderText}>{s.text}</Text>
                    </View>
                  )}
                  <RideCard ride={item} onStatusChange={handleStatusChange} onPress={(r) => { setActiveRide(r); setModals(prev => ({ ...prev, options: true })); }} onShare={(r) => { setActiveRide(r); setModals(prev => ({ ...prev, share: true })); }} onRespond={(r, a) => handleGlobalRespond(r._id, a)} />
                </View>
              );
            }} 
            ListEmptyComponent={
                <View style={styles.emptyContainer}>
                    <Ionicons name="car-sport-outline" size={50} color="#DDD" />
                    <Text style={styles.emptyText}>Aucune course.</Text>
                </View>
            }
            refreshing={loading} 
            onRefresh={() => { loadData(false); fetchGlobalPMTs(); }} 
            contentContainerStyle={{ padding: 15, paddingBottom: 160 }} 
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* 👇 INTEGRATION DU NOUVEAU COMPOSANT : RideOptionsModal + DISPATCH 👇 */}
      <RideOptionsModal 
        visible={modals.options}
        ride={activeRide}
        onClose={() => setModals({ ...modals, options: false })}
        
        // Actions
        onCreateReturn={() => {
            setModals({ ...modals, options: false }); 
            setTimeout(() => prepareReturnRide(), 100); 
        }}
        
        onAddToCalendar={() => {
            addRideToCalendar(activeRide);
            setModals({ ...modals, options: false });
        }}
        
        onOpenDocs={() => fetchRideDocuments(activeRide)}
        onShare={() => setModals({ options: false, share: true })}
        onDelete={handleDelete}

        // Action DISPATCH (Sous-traitance)
        onDispatch={() => {
            setModals({ ...modals, options: false });
            setTimeout(() => setShowDispatchModal(true), 100);
        }}
      />

      {/* MODAL DISPATCH (Bourse d'échange) */}
      <DispatchModal 
        visible={showDispatchModal}
        onClose={() => setShowDispatchModal(false)}
        ride={activeRide}
        contacts={contacts}
        groups={myGroups} // On passe les groupes
        onCreateGroup={() => {
            setShowDispatchModal(false);
            setTimeout(() => setShowGroupCreator(true), 200);
        }}
        onSuccess={() => loadData(true)}
      />

      {/* MODAL CRÉATION GROUPE */}
      <GroupCreatorModal 
        visible={showGroupCreator}
        onClose={() => {
            setShowGroupCreator(false);
            setTimeout(() => setShowDispatchModal(true), 200);
        }}
        contacts={contacts}
        onSaveGroup={(newGroup) => setMyGroups([...myGroups, newGroup])}
      />
      {/* 👆 -------------------------------------------------- 👆 */}

      {/* MODAL PARTAGE */}
      <Modal visible={modals.share} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor:'#FFF' }}>
          <View style={styles.modalHeader}>
            <Text style={styles.headerTitle}>Partager</Text>
            <TouchableOpacity onPress={() => setModals({...modals, share: false})}>
                <Ionicons name="close-circle" size={32} color="#999"/>
            </TouchableOpacity>
          </View>
          
          <View style={{padding: 20, flex: 1}}>
             <Text style={styles.inputLabel}>Message / Note (Optionnel)</Text>
             <TextInput 
                style={styles.noteInput} 
                placeholder="Ex: Attention escaliers, patient valide..." 
                multiline 
                numberOfLines={3} 
                value={shareNote} 
                onChangeText={setShareNote} 
                textAlignVertical="top"
             />

             <TouchableOpacity style={styles.whatsappBtn} onPress={shareViaWhatsApp}>
                <Ionicons name="logo-whatsapp" size={24} color="#FFF" style={{marginRight: 10}}/>
                <Text style={styles.whatsappText}>Envoyer sur Groupe WhatsApp</Text>
             </TouchableOpacity>

             <View style={styles.dividerRow}>
                <View style={styles.line} /><Text style={styles.orText}>OU INTERNE</Text><View style={styles.line} />
             </View>

             <FlatList
               data={contacts}
               keyExtractor={(item) => item._id}
               renderItem={({ item }) => (
                 <TouchableOpacity style={styles.contactRow} onPress={() => shareInternal(item)}>
                   <View style={{flexDirection:'row', alignItems:'center'}}>
                     <View style={styles.avatarPlaceholder}><Text style={styles.avatarText}>{item.contactId?.fullName?.charAt(0)}</Text></View>
                     <Text style={styles.contactName}>{item.contactId?.fullName}</Text>
                   </View>
                   <Ionicons name="paper-plane-outline" size={24} color="#4CAF50" />
                 </TouchableOpacity>
               )}
               ListEmptyComponent={<Text style={{color:'#999', fontStyle:'italic'}}>Aucun contact enregistré.</Text>}
             />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL DOCS */}
      <Modal visible={modals.docs} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.docModalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.headerTitle}>Dossier</Text>
            <TouchableOpacity onPress={() => setModals({...modals, docs: false})}>
                <Ionicons name="close-circle" size={32} color="#999"/>
            </TouchableOpacity>
          </View>
          
          <ScrollView contentContainerStyle={{padding: 20}}>
              {loadingDocs && <ActivityIndicator size="large" color="#FF6B00"/>}
              
              {!loadingDocs && patientDocs.length === 0 && <Text style={styles.emptyText}>Aucun document.</Text>}

              {!loadingDocs && patientDocs.map((d, i) => (
                  <View key={i} style={styles.docCard}>
                    <Text style={styles.docTitle}>{d.type === 'PMT' ? 'Bon de Transport (BT)' : d.type}</Text>
                    <Image source={{ uri: d.imageData }} style={styles.docImage} resizeMode="contain"/>
                  </View>
              ))}

              <View style={styles.addDocSection}>
                 <Text style={styles.sectionTitle}>Ajouter un document</Text>
                 <View style={styles.scanGrid}>
                    {/* BT */}
                    <View style={styles.scanColumn}>
                        <DocumentScannerButton title="BT" docType="PMT" color="#FF6B00" onScan={handleDocumentScanned} isLoading={uploading}/>
                        <TouchableOpacity style={styles.importBtn} onPress={() => pickFromGallery('PMT')}>
                            <Ionicons name="image" size={14} color="#666"/>
                            <Text style={styles.importText}>Galerie</Text>
                        </TouchableOpacity>
                    </View>
                    {/* VITALE */}
                    <View style={styles.scanColumn}>
                        <DocumentScannerButton title="Vitale" docType="CarteVitale" color="#4CAF50" onScan={handleDocumentScanned} isLoading={uploading}/>
                        <TouchableOpacity style={styles.importBtn} onPress={() => pickFromGallery('CarteVitale')}>
                            <Ionicons name="image" size={14} color="#666"/>
                            <Text style={styles.importText}>Galerie</Text>
                        </TouchableOpacity>
                    </View>
                    {/* MUTUELLE */}
                    <View style={styles.scanColumn}>
                        <DocumentScannerButton title="Mutuelle" docType="Mutuelle" color="#2196F3" onScan={handleDocumentScanned} isLoading={uploading}/>
                        <TouchableOpacity style={styles.importBtn} onPress={() => pickFromGallery('Mutuelle')}>
                            <Ionicons name="image" size={14} color="#666"/>
                            <Text style={styles.importText}>Galerie</Text>
                        </TouchableOpacity>
                    </View>
                 </View>
              </View>
          </ScrollView>
        </View>
      </Modal>

      {/* 👇 MODAL DE VALIDATION CPAM (BT) 👇 */}
      <Modal visible={btValidationModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.finishCard, {backgroundColor: '#FFF3E0'}]}>
            <View style={styles.finishHeader}>
                <Text style={[styles.finishTitle, {color: '#E65100'}]}>🛡️ Vérification CPAM</Text>
                <TouchableOpacity onPress={() => setBtValidationModal(false)}>
                    <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
            </View>

            <Text style={styles.cpamWarning}>
              Pour éviter un rejet, vérifiez la date inscrite par le médecin sur le Bon de Transport (BT).
            </Text>

            <Text style={styles.inputLabel}>Date de Prescription (sur le papier) :</Text>
            
            <TouchableOpacity onPress={() => setShowPrescriptionPicker(true)} style={[styles.inputWrapper, {borderColor: '#FF9800', backgroundColor: '#FFF'}]}>
                <Ionicons name="calendar" size={20} color="#E65100" style={{marginRight:10}}/>
                <Text style={{fontSize:18, fontWeight:'bold', color: '#333'}}>{moment(prescriptionDate).format('DD/MM/YYYY')}</Text>
            </TouchableOpacity>

            {showPrescriptionPicker && (
                <DateTimePicker value={prescriptionDate} mode="date" display="default"
                    onChange={(event, date) => { if(Platform.OS === 'android') setShowPrescriptionPicker(false); if(date) setPrescriptionDate(date); }}
                />
            )}

            <View style={styles.comparisonRow}>
                <View><Text style={styles.compLabel}>Date Course</Text><Text style={styles.compValue}>{moment(activeRide?.date).format('DD/MM')}</Text></View>
                <Ionicons name={moment(prescriptionDate).isAfter(moment(activeRide?.date)) ? "alert-circle" : "arrow-forward-circle"} size={30} color={moment(prescriptionDate).isAfter(moment(activeRide?.date)) ? "red" : "green"} />
                <View><Text style={styles.compLabel}>Date Prescr.</Text><Text style={[styles.compValue, moment(prescriptionDate).isAfter(moment(activeRide?.date)) && {color:'red'}]}>{moment(prescriptionDate).format('DD/MM')}</Text></View>
            </View>

            <TouchableOpacity style={[styles.confirmBtn, {backgroundColor: '#E65100'}]} onPress={validateAndUploadBT}><Text style={{color:'#FFF', fontWeight:'bold', fontSize: 16}}>VALIDER LE BT</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL FIN */}
      <Modal visible={finishModal} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.finishCard}>
            <View style={styles.finishHeader}>
                <Text style={styles.finishTitle}>Fin de Course</Text>
                <TouchableOpacity onPress={() => setFinishModal(false)}>
                    <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
            </View>
            
            <TouchableOpacity style={styles.mappyBtn} onPress={openMappyRoute}>
                <View style={{flexDirection:'row', alignItems:'center'}}>
                    <Ionicons name="map" size={20} color="#FFF" style={{marginRight:8}} />
                    <Text style={{color:'#FFF', fontWeight:'bold'}}>VÉRIFIER KM (MAPPY)</Text>
                </View>
                <Ionicons name="open-outline" size={18} color="#FFF" />
            </TouchableOpacity>

            <Text style={styles.inputLabel}>Km Réel</Text>
            <View style={styles.inputWrapper}>
                <TextInput style={styles.input} placeholder="Ex: 25" keyboardType="numeric" value={billingData.kmReel} onChangeText={t => setBillingData({...billingData, kmReel: t})}/>
                <Text style={styles.unitText}>km</Text>
            </View>

            <Text style={styles.inputLabel}>Péages</Text>
            <View style={styles.inputWrapper}>
                <TextInput style={styles.input} placeholder="Ex: 5.50" keyboardType="numeric" value={billingData.peage} onChangeText={t => setBillingData({...billingData, peage: t})}/>
                <Text style={styles.unitText}>€</Text>
            </View>
            
            <TouchableOpacity style={styles.confirmBtn} onPress={confirmFinishRide}>
                <Text style={{color:'#FFF', fontWeight:'bold', fontSize: 16}}>VALIDER</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL RETOUR */}
      <Modal visible={returnModal} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
            <View style={styles.finishCard}>
                <View style={styles.finishHeader}>
                    <Text style={styles.finishTitle}>Planifier Retour</Text>
                    <TouchableOpacity onPress={() => setReturnModal(false)}>
                        <Ionicons name="close" size={24} color="#333" />
                    </TouchableOpacity>
                </View>

                <Text style={styles.inputLabel}>Heure de départ</Text>
                <TouchableOpacity onPress={() => setShowTimePicker(true)} style={[styles.inputWrapper, {justifyContent:'flex-start'}]}>
                    <Ionicons name="time-outline" size={20} color="#666" style={{marginRight:10}}/>
                    <Text style={{fontSize:18, fontWeight:'bold', color: returnData.time ? '#333' : '#999'}}>
                        {returnData.time || "Choisir l'heure"}
                    </Text>
                </TouchableOpacity>

                {showTimePicker && (
                    <DateTimePicker
                        value={tempReturnDate}
                        mode="time"
                        is24Hour={true}
                        display="default"
                        onChange={onReturnTimeChange}
                    />
                )}

                <Text style={styles.inputLabel}>Départ</Text>
                <View style={[styles.inputWrapper, {backgroundColor:'#FFF'}]}>
                    <Ionicons name="navigate-circle" size={20} color="#4CAF50" style={{marginRight:10}}/>
                    <TextInput style={[styles.input, {fontSize:14}]} value={returnData.startLocation} onChangeText={t => setReturnData({...returnData, startLocation: t})} multiline/></View>
                <Text style={styles.inputLabel}>Destination</Text>
                <View style={[styles.inputWrapper, {backgroundColor:'#FFF'}]}>
                    <Ionicons name="flag" size={20} color="#FF6B00" style={{marginRight:10}}/>
                    <TextInput style={[styles.input, {fontSize:14}]} value={returnData.endLocation} onChangeText={t => setReturnData({...returnData, endLocation: t})} multiline/></View>
                <TouchableOpacity style={[styles.confirmBtn, {backgroundColor: '#2196F3'}]} onPress={confirmCreateReturn}>
                    <Text style={{color:'#FFF', fontWeight:'bold', fontSize: 16}}>VALIDER RETOUR</Text>
                </TouchableOpacity>
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
  
  rideBlock: { marginBottom: 12 },
  pmtHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, paddingHorizontal: 12, borderTopLeftRadius: 10, borderTopRightRadius: 10, marginBottom: -5, zIndex: 1, alignSelf: 'flex-start', marginLeft: 10 },
  pmtHeaderText: { color: '#FFF', fontWeight: 'bold', fontSize: 10, marginLeft: 6, letterSpacing: 0.5 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  finishCard: { backgroundColor: '#FFF', padding: 25, borderTopLeftRadius: 25, borderTopRightRadius: 25 },
  finishHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  finishTitle: { fontSize: 20, fontWeight: 'bold' },
  
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
  importText: { fontSize: 10, color: '#555', marginLeft: 4, fontWeight: 'bold' },

  inputLabel: { fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 8 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#DDD', borderRadius: 12, paddingHorizontal: 15, marginBottom: 20, height: 55, backgroundColor: '#FAFAFA' },
  input: { flex: 1, fontSize: 18, fontWeight: 'bold', color: '#333' },
  unitText: { fontSize: 16, color: '#999', fontWeight: 'bold' },
  confirmBtn: { backgroundColor: '#4CAF50', padding: 18, borderRadius: 14, alignItems: 'center', marginTop: 10, elevation: 2 },
  mappyBtn: { backgroundColor: '#009688', padding: 12, borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#00796B', elevation: 2 },

  noteInput: { backgroundColor: '#F5F5F5', borderRadius: 12, padding: 15, height: 80, marginBottom: 15, borderWidth: 1, borderColor: '#DDD', fontSize: 16 },
  whatsappBtn: { backgroundColor: '#25D366', padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20, elevation: 2 },
  whatsappText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  line: { flex: 1, height: 1, backgroundColor: '#DDD' },
  orText: { marginHorizontal: 10, color: '#999', fontSize: 12, fontWeight: 'bold' },
  contactRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 1, borderColor: '#EEE' },
  contactName: { fontSize: 16, fontWeight: '600', color: '#333', marginLeft: 10 },
  avatarPlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E3F2FD', justifyContent:'center', alignItems:'center' },
  avatarText: { color: '#1976D2', fontWeight: 'bold', fontSize: 18 },

  // SYNC BUTTON
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4285F4', // Bleu Google
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 10,
    elevation: 2
  },
  syncBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12
  },

  // STYLES VALIDATION BT
  cpamWarning: { fontSize: 13, color: '#5D4037', marginBottom: 20, lineHeight: 20 },
  comparisonRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginVertical: 20, backgroundColor: '#FFE0B2', padding: 10, borderRadius: 10 },
  compLabel: { fontSize: 10, color: '#E65100', fontWeight: 'bold', textAlign: 'center' },
  compValue: { fontSize: 18, fontWeight: 'bold', color: '#333', textAlign: 'center' },
});