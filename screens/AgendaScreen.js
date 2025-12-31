import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, ActivityIndicator, StyleSheet,
  Alert, TouchableOpacity, Modal, SafeAreaView, TextInput, Image, ScrollView, KeyboardAvoidingView, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import moment from 'moment';
import 'moment/locale/fr';

import RideCard from '../components/RideCard'; 
import api, { getRides, getContacts, updateRide, shareRide, deleteRide } from '../services/api';

LocaleConfig.locales['fr'] = {
  monthNames: ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'],
  dayNames: ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'],
  dayNamesShort: ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'],
  today: "Aujourd'hui"
};
LocaleConfig.defaultLocale = 'fr';

export default function AgendaScreen() {
  const [selectedDate, setSelectedDate] = useState(moment().format('YYYY-MM-DD'));
  const [allRides, setAllRides] = useState([]); 
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCalendar, setShowCalendar] = useState(true);

  // --- ÉTATS MODALS ---
  const [modals, setModals] = useState({ options: false, share: false, docs: false });
  const [activeRide, setActiveRide] = useState(null);

  // --- ÉTATS PARTAGE (Note) ---
  const [contactToShare, setContactToShare] = useState(null); 
  const [shareNote, setShareNote] = useState(''); 

  // --- ÉTATS DOCUMENTAIRES ---
  const [patientDocs, setPatientDocs] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  // --- ÉTATS CLÔTURE CPAM ---
  const [finishModal, setFinishModal] = useState(false);
  const [billingData, setBillingData] = useState({ kmReel: '', peage: '' });

  // 1. CHARGEMENT
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [ridesData, contactsData] = await Promise.all([getRides(), getContacts()]);
      setAllRides(ridesData || []);
      setContacts(contactsData || []);
    } catch (err) {
      console.error("Erreur Agenda:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // 2. DOCUMENTS
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

  // 3. CALENDRIER
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

  // 4. ACTIONS DE COURSE
  const handleStatusChange = async (ride, action) => {
    try {
      if (action === 'start') {
        await updateRide(ride._id, { startTime: new Date().toISOString() });
        loadData();
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
      loadData();
      Alert.alert("Succès", "Course terminée.");
    } catch (err) { Alert.alert("Erreur", "Echec clôture."); }
  };

  // 5. PARTAGE
  const selectContactForShare = (contactItem) => {
    setContactToShare(contactItem); 
    setShareNote(''); 
  };

  const finalizeShare = async () => {
    // 1. Vérification des données avant envoi
    if (!activeRide) return Alert.alert("Erreur", "Aucune course sélectionnée");
    if (!contactToShare || !contactToShare.contactId) return Alert.alert("Erreur", "Contact invalide");

    const targetUserId = contactToShare.contactId._id;
    const rideId = activeRide._id;

    console.log("Tentative de partage :", { rideId, targetUserId, shareNote });

    try {
      // 2. Appel API
      await shareRide(rideId, targetUserId, shareNote);
      
      // 3. Succès
      setModals({ ...modals, share: false });
      setContactToShare(null);
      setShareNote('');
      loadData(); // Rafraîchir l'agenda
      Alert.alert('Succès', `Course envoyée à ${contactToShare.contactId.fullName}`);

    } catch (err) { 
      // 4. Affichage de la VRAIE erreur
      console.error("Erreur Partage:", err);
      const message = err.response?.data?.message || "Erreur de connexion au serveur";
      Alert.alert('Échec du partage', message); 
    }
  };
  const handleDelete = async () => {
    try { await deleteRide(activeRide._id); setModals({...modals, options:false}); loadData(); }
    catch(e) { Alert.alert('Erreur', 'Suppression impossible'); }
  };

  const closeShareModal = () => {
    setModals({...modals, share: false});
    setContactToShare(null);
    setShareNote('');
  }

  return (
    <SafeAreaView style={styles.container}>
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

      {/* LISTE */}
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
                onRespond={() => {}} 
              />
            )}
            ListEmptyComponent={<Text style={styles.emptyText}>Aucune course ce jour.</Text>}
            refreshing={loading}
            onRefresh={loadData}
          />
        )}
      </View>

      {/* ================= MODALS ================= */}

      {/* 1. OPTIONS */}
      <Modal visible={modals.options} animationType="fade" transparent>
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setModals({ ...modals, options: false })} activeOpacity={1}>
          <View style={styles.optionSheet}>
            <Text style={styles.sheetTitle}>Gérer la course</Text>
            <TouchableOpacity style={styles.sheetBtn} onPress={() => fetchRideDocuments(activeRide)}>
              <View style={[styles.iconBox, {backgroundColor: '#E3F2FD'}]}><Ionicons name="folder-open" size={24} color="#1976D2" /></View>
              <Text style={styles.sheetBtnText}>Voir Dossier (Vitale/PMT)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sheetBtn} onPress={() => setModals({ options: false, share: true })}>
              <View style={[styles.iconBox, {backgroundColor: '#FFF3E0'}]}><Ionicons name="share-social" size={24} color="#EF6C00" /></View>
              <Text style={styles.sheetBtnText}>Partager à un collègue</Text>
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
              {patientDocs.length > 0 ? (
                patientDocs.map((doc, index) => (
                  <View key={index} style={styles.docCard}>
                    <View style={styles.docHeader}>
                      <Ionicons name={doc.type === 'CarteVitale' ? 'card' : 'document-text'} size={20} color={doc.type === 'PMT' ? '#FF6B00' : '#4CAF50'} />
                      <Text style={styles.docTitle}>{doc.type}</Text>
                      <Text style={styles.docDate}>{moment(doc.uploadDate).format('DD/MM/YYYY')}</Text>
                    </View>
                    <Image source={{ uri: doc.imageData }} style={styles.docImage} resizeMode="contain"/>
                  </View>
                ))
              ) : (
                <View style={styles.emptyDocs}>
                  <Ionicons name="folder-open-outline" size={50} color="#CCC" />
                  <Text style={styles.emptyText}>Aucun document.</Text>
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* 3. PARTAGE AVEC TÉLÉPHONE (AJOUTÉ ICI) */}
      <Modal visible={modals.share} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.modalHeader}>
            <View style={{flexDirection:'row', alignItems:'center'}}>
              {contactToShare && (
                <TouchableOpacity onPress={() => setContactToShare(null)} style={{marginRight: 10}}>
                  <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
              )}
              <Text style={styles.headerTitle}>{contactToShare ? "Confirmer" : "Envoyer à..."}</Text>
            </View>
            <TouchableOpacity onPress={closeShareModal}><Ionicons name="close" size={28} color="#333"/></TouchableOpacity>
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
              ListEmptyComponent={<Text style={styles.emptyText}>Aucun contact.</Text>}
            />
          ) : (
            <ScrollView contentContainerStyle={{padding: 20}}>
              {/* Header Contact */}
              <View style={styles.selectedContactHeader}>
                 <View style={styles.avatarPlaceholder}><Text style={styles.avatarText}>{contactToShare.contactId?.fullName?.charAt(0)}</Text></View>
                 <Text style={styles.selectedContactName}>Pour : {contactToShare.contactId?.fullName}</Text>
              </View>

              {/* ⚠️ INFO TÉLÉPHONE PATIENT (NOUVEAU BLOC) */}
              {activeRide && activeRide.patientPhone ? (
                 <View style={styles.phoneInfoBox}>
                    <Ionicons name="call" size={20} color="#4CAF50" />
                    <Text style={styles.phoneInfoText}>
                       Le numéro du patient ({activeRide.patientPhone}) sera transmis automatiquement.
                    </Text>
                 </View>
              ) : (
                 <View style={[styles.phoneInfoBox, {backgroundColor: '#FFEBEE'}]}>
                    <Ionicons name="alert-circle" size={20} color="#D32F2F" />
                    <Text style={[styles.phoneInfoText, {color: '#D32F2F'}]}>
                       Attention : Aucun numéro de téléphone enregistré pour ce patient.
                    </Text>
                 </View>
              )}

              <Text style={styles.noteLabel}>Message ou Note (Optionnel) :</Text>
              <TextInput 
                style={styles.noteInput}
                placeholder="Ex: Patient en fauteuil, 3ème étage, digicode 1234..."
                multiline
                numberOfLines={4}
                value={shareNote}
                onChangeText={setShareNote}
                textAlignVertical="top"
              />

              <TouchableOpacity style={styles.sendShareBtn} onPress={finalizeShare}>
                <Ionicons name="paper-plane" size={20} color="#FFF" style={{marginRight:10}} />
                <Text style={styles.sendShareText}>ENVOYER LA COURSE</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </KeyboardAvoidingView>
      </Modal>

      {/* 4. FIN DE COURSE */}
      <Modal visible={finishModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.finishCard}>
            <View style={styles.finishHeader}><Text style={styles.finishTitle}>Fin de Course</Text></View>
            <View style={styles.finishBody}>
              <Text style={styles.label}>Patient: {activeRide?.patientName}</Text>
              <Text style={styles.labelInput}>Kilomètres Réels</Text>
              <View style={styles.inputRow}><TextInput style={styles.input} placeholder="0" keyboardType="numeric" value={billingData.kmReel} onChangeText={t => setBillingData({...billingData, kmReel: t})}/><Text>km</Text></View>
              <Text style={styles.labelInput}>Péages</Text>
              <View style={styles.inputRow}><TextInput style={styles.input} placeholder="0.00" keyboardType="numeric" value={billingData.peage} onChangeText={t => setBillingData({...billingData, peage: t})}/><Text>€</Text></View>
              <View style={styles.btnRow}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setFinishModal(false)}><Text>Annuler</Text></TouchableOpacity>
                <TouchableOpacity style={styles.confirmBtn} onPress={confirmFinishRide}><Text style={{color:'#FFF', fontWeight:'bold'}}>VALIDER</Text></TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
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

  docModalContainer: { flex: 1, backgroundColor: '#F2F2F2' },
  docCard: { backgroundColor: '#FFF', borderRadius: 12, marginBottom: 20, overflow: 'hidden', elevation: 2 },
  docHeader: { flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: '#FAFAFA', borderBottomWidth: 1, borderColor: '#EEE' },
  docTitle: { flex: 1, marginLeft: 10, fontWeight: 'bold', color: '#333' },
  docDate: { fontSize: 12, color: '#999' },
  docImage: { width: '100%', height: 300, backgroundColor: '#000' },
  emptyDocs: { alignItems: 'center', marginTop: 50 },

  contactRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 1, borderColor: '#EEE' },
  avatarPlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFE0B2', justifyContent:'center', alignItems:'center', marginRight: 15 },
  avatarText: { color: '#EF6C00', fontWeight: 'bold', fontSize: 18 },
  contactName: { fontSize: 16, fontWeight: '500' },

  // STYLES PARTAGE MODIFIÉS
  selectedContactHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, backgroundColor:'#FFF3E0', padding: 10, borderRadius: 10 },
  selectedContactName: { fontSize: 18, fontWeight: 'bold', color: '#E65100' },
  
  // Style Box Info Téléphone (NOUVEAU)
  phoneInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9', // Vert clair
    padding: 12,
    borderRadius: 8,
    marginBottom: 20
  },
  phoneInfoText: { marginLeft: 10, fontSize: 13, color: '#2E7D32', flex: 1, fontWeight: '500' },

  noteLabel: { fontWeight: 'bold', color: '#555', marginBottom: 10 },
  noteInput: { backgroundColor: '#F5F5F5', borderRadius: 10, padding: 15, height: 120, fontSize: 16, marginBottom: 20, borderWidth: 1, borderColor: '#EEE' },
  sendShareBtn: { backgroundColor: '#FF6B00', padding: 18, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', elevation: 3 },
  sendShareText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },

  finishCard: { backgroundColor: '#FFF', borderRadius: 15, overflow: 'hidden', margin: 20 },
  finishHeader: { backgroundColor: '#4CAF50', padding: 15, alignItems: 'center' },
  finishTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  finishBody: { padding: 20 },
  label: { fontSize: 16, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  labelInput: { fontSize: 12, color: '#666', marginBottom: 5 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#DDD', borderRadius: 10, paddingHorizontal: 15, marginBottom: 15, height: 50, backgroundColor:'#F9F9F9' },
  input: { flex: 1, fontSize: 18, fontWeight: 'bold' },
  btnRow: { flexDirection: 'row', marginTop: 10 },
  cancelBtn: { padding: 15, flex: 1, alignItems: 'center' },
  confirmBtn: { backgroundColor: '#4CAF50', padding: 15, borderRadius: 10, flex: 1.5, alignItems: 'center' },
  modalHeader: { padding: 20, flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#FFF', borderBottomWidth:1, borderColor:'#EEE' }
});