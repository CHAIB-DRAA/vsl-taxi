import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, 
  Alert, SafeAreaView, Modal, ScrollView, TextInput 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import 'moment/locale/fr';

// Modules natifs pour PDF
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

// API
import api, { getRides, updateRide } from '../services/api'; 

// Composant Scanner
import DocumentScannerButton from '../components/DocumentScannerButton'; 

export default function HistoryScreen({ navigation }) {
  // --- ÉTATS GLOBAUX ---
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState(moment());
  const [searchText, setSearchText] = useState('');

  // --- ÉTATS DU MODAL & DOCS ---
  const [selectedRide, setSelectedRide] = useState(null);
  const [patientDocs, setPatientDocs] = useState([]); 
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [uploading, setUploading] = useState(false);

  // --- ÉTATS ÉDITION (Modifier la course) ---
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ 
    realDistance: '', 
    tolls: '',
    endTime: '' // Pour modifier l'heure d'arrivée
  });

  // ============================================================
  // 1. CHARGEMENT ET ACTIONS
  // ============================================================

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const allRides = await getRides();
      // On garde uniquement les courses TERMINÉES
      const history = allRides.filter(r => r.status === 'Terminée');      
      history.sort((a, b) => new Date(b.date) - new Date(a.date));
      setRides(history);
    } catch(e) { 
      console.error("Erreur historique:", e); 
    } finally { 
      setLoading(false); 
    }
  }, []);
  
  useEffect(() => { loadHistory(); }, [loadHistory]);

  // --- SUPPRIMER UNE COURSE ---
  const handleDeleteRide = () => {
    Alert.alert(
      "Supprimer la course",
      "Cette action est irréversible. Voulez-vous continuer ?",
      [
        { text: "Annuler", style: "cancel" },
        { 
          text: "Supprimer", 
          style: "destructive", 
          onPress: async () => {
            try {
              await api.delete(`/rides/${selectedRide._id}`);
              setSelectedRide(null); 
              loadHistory(); 
              Alert.alert("Succès", "Course supprimée.");
            } catch (err) {
              Alert.alert("Erreur", "Impossible de supprimer.");
            }
          }
        }
      ]
    );
  };

  // --- MODE ÉDITION ---
  const toggleEditMode = () => {
    if (!isEditing) {
      // 1. On active l'édition et on charge les données actuelles
      setEditData({
        // Si realDistance n'existe pas encore, on prend 'distance'
        realDistance: String(selectedRide.realDistance || selectedRide.distance || 0),
        tolls: String(selectedRide.tolls || 0),
        // On charge l'heure de fin si elle existe (format HH:mm)
        endTime: selectedRide.endTime ? moment(selectedRide.endTime).format('HH:mm') : ''
      });
      setIsEditing(true);
    } else {
      setIsEditing(false); // Annuler
    }
  };

  const saveEdit = async () => {
    try {
      setUploading(true);
      const updates = {
        realDistance: parseFloat(editData.realDistance) || 0,
        tolls: parseFloat(editData.tolls) || 0
      };

      // 🕒 Mise à jour de l'heure de fin (endTime)
      if (editData.endTime && editData.endTime.includes(':')) {
        const [hours, minutes] = editData.endTime.split(':');
        // On part de la date de la course
        const baseDate = moment(selectedRide.date);
        
        // On construit la nouvelle date de fin
        const newEndTime = baseDate
                              .hour(parseInt(hours))
                              .minute(parseInt(minutes))
                              .toISOString();
        
        updates.endTime = newEndTime; // C'est ici qu'on met à jour le bon champ JSON
      }

      await updateRide(selectedRide._id, updates);
      
      // Mise à jour locale (pour affichage immédiat sans recharger)
      const updatedRide = { ...selectedRide, ...updates };
      setSelectedRide(updatedRide);
      setRides(prev => prev.map(r => r._id === updatedRide._id ? updatedRide : r));

      setIsEditing(false);
      setUploading(false);
      Alert.alert("Succès", "Course modifiée.");
    } catch (err) {
      setUploading(false);
      Alert.alert("Erreur", "Mise à jour échouée (Vérifiez le format Heure).");
    }
  };

  // ============================================================
  // 2. LOGIQUE MÉTIER
  // ============================================================

  const filteredRides = useMemo(() => {
    return rides.filter(r => {
      const sameMonth = moment(r.date).format('MM-YYYY') === currentDate.format('MM-YYYY');
      if (searchText.length === 0) return sameMonth;
      const query = searchText.toLowerCase();
      return sameMonth && (
        (r.patientName && r.patientName.toLowerCase().includes(query)) || 
        (r.startLocation && r.startLocation.toLowerCase().includes(query)) ||
        (r.endLocation && r.endLocation.toLowerCase().includes(query))
      );
    });
  }, [rides, currentDate, searchText]);

  const stats = useMemo(() => {
    return filteredRides.reduce((acc, curr) => ({ 
      km: acc.km + (curr.realDistance || curr.distance || 0), 
      peage: acc.peage + (curr.tolls || 0), 
      count: acc.count + 1 
    }), { km: 0, peage: 0, count: 0 });
  }, [filteredRides]);

  useEffect(() => {
    if (selectedRide) fetchSmartDocuments();
  }, [selectedRide]);

  const fetchSmartDocuments = async () => {
    try {
      setLoadingDocs(true);
      const res = await api.get(`/documents/by-ride/${selectedRide._id}`);
      setPatientDocs(res.data);
    } catch (err) { console.error(err); } finally { setLoadingDocs(false); }
  };

  const handleDocumentScanned = async (uri, docType) => {
    await uploadDocument(uri, docType);
  };

  const uploadDocument = async (uri, docType) => {
    if (!selectedRide) return;
    try {
      setUploading(true); 
      const formData = new FormData();
      const fileName = `scan_${docType}_${moment().format('HHmmss')}.jpg`;
      formData.append('photo', { uri: uri, name: fileName, type: 'image/jpeg' });
      formData.append('patientName', selectedRide.patientName);
      formData.append('docType', docType);
      formData.append('rideId', selectedRide._id);
      
      await api.post('/documents/upload', formData, { 
        headers: { 'Content-Type': 'multipart/form-data' }, 
        transformRequest: (data) => data 
      });
      
      Alert.alert("Succès", "Document ajouté !");
      fetchSmartDocuments(); 
    } catch (error) { Alert.alert("Erreur", "Echec de l'envoi."); } finally { setUploading(false); }
  };

  const generatePDF = async () => {
    if (!selectedRide) return;
    try {
      setUploading(true);
      const docs = patientDocs;
      let imagesHtml = docs.length > 0 ? `<h3>Pièces Jointes (${docs.length})</h3>` : `<p><em>Aucun document.</em></p>`;
      docs.forEach(doc => {
        imagesHtml += `<div style="margin-bottom: 20px; border: 1px solid #ccc; padding: 10px; page-break-inside: avoid;"><p><strong>${doc.type}</strong></p><img src="${doc.imageData}" style="width: 100%; max-height: 800px; object-fit: contain;" /></div>`;
      });
      const html = `<html><body style="font-family: Helvetica; padding: 30px;">
            <h1 style="color: #FF6B00;">Fiche Transport</h1>
            <p>Date : <strong>${moment(selectedRide.date).format('DD/MM/YYYY')}</strong></p>
            <div style="background: #f5f5f5; padding: 15px; margin-bottom: 20px;">
                <p><strong>Patient:</strong> ${selectedRide.patientName}</p>
                <p><strong>Trajet:</strong> ${selectedRide.startLocation} ➔ ${selectedRide.endLocation}</p>
            </div>
            <div><strong>Distance:</strong> ${selectedRide.realDistance || 0} km | <strong>Péages:</strong> ${selectedRide.tolls || 0} €</div>
            <hr/><div style="margin-top:30px;">${imagesHtml}</div></body></html>`;
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (err) { Alert.alert("Erreur PDF", "Impossible de générer le fichier."); } finally { setUploading(false); }
  };

  const toggleBillingStatus = async (ride) => {
     try {
      const newStatus = ride.statuFacturation === 'Facturé' ? 'Non facturé' : 'Facturé';
      const updatedRides = rides.map(r => r._id === ride._id ? { ...r, statuFacturation: newStatus } : r);
      setRides(updatedRides);
      if (selectedRide && selectedRide._id === ride._id) setSelectedRide({ ...selectedRide, statuFacturation: newStatus });
      await updateRide(ride._id, { statuFacturation: newStatus });
    } catch (err) { Alert.alert("Erreur", "Impossible de changer le statut."); loadHistory(); }
  };

  const changeMonth = (dir) => setCurrentDate(prev => moment(prev).add(dir, 'months'));

  // ============================================================
  // 3. RENDU
  // ============================================================

  const renderItem = ({ item }) => {
    const isBilled = item.statuFacturation === 'Facturé';
    const isShared = item.isShared;
    return (
      <TouchableOpacity style={[styles.card, isShared && styles.cardShared]} onPress={() => { setIsEditing(false); setSelectedRide(item); }} activeOpacity={0.7}>
        {isShared && <View style={styles.sharedTag}><Ionicons name="arrow-undo-circle" size={16} color="#EF6C00" /><Text style={styles.sharedText}>Reçu</Text></View>}
        <View style={styles.cardContent}>
          <View style={styles.dateCol}><Text style={styles.dayText}>{moment(item.date).format('DD')}</Text><Text style={styles.monthText}>{moment(item.date).format('MMM')}</Text></View>
          <View style={styles.detailsCol}>
            <Text style={styles.patientName}>{item.patientName}</Text>
            <Text style={styles.rideTypeSmall}>{item.type} {item.isRoundTrip ? '⇄' : '→'}</Text>
            <View style={styles.metaRow}>
              <View style={styles.badgeInfo}><Ionicons name="speedometer-outline" size={12} color="#555" /><Text style={styles.badgeText}>{item.realDistance || item.distance || 0} km</Text></View>
              <View style={[styles.badgeInfo, {backgroundColor: isBilled ? '#E8F5E9' : '#FFEBEE'}]}><Text style={[styles.badgeText, {color: isBilled ? '#2E7D32' : '#C62828'}]}>{isBilled ? "Facturé" : "À faire"}</Text></View>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#CCC" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Historique</Text>
        <View style={styles.searchBar}><Ionicons name="search" size={20} color="#999" /><TextInput style={styles.searchInput} placeholder="Chercher..." value={searchText} onChangeText={setSearchText} placeholderTextColor="#999" />{searchText.length > 0 && <TouchableOpacity onPress={() => setSearchText('')}><Ionicons name="close-circle" size={20} color="#CCC" /></TouchableOpacity>}</View>
        <View style={styles.monthSelector}><TouchableOpacity onPress={() => changeMonth(-1)} style={styles.arrowBtn}><Ionicons name="chevron-back" size={24} color="#333" /></TouchableOpacity><Text style={styles.currentMonth}>{currentDate.format('MMMM YYYY')}</Text><TouchableOpacity onPress={() => changeMonth(1)} style={styles.arrowBtn}><Ionicons name="chevron-forward" size={24} color="#333" /></TouchableOpacity></View>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}><Text style={styles.summaryValue}>{stats.count}</Text><Text style={styles.summaryLabel}>Courses</Text></View>
        <View style={styles.divider} />
        <View style={styles.summaryItem}><Text style={styles.summaryValue}>{stats.km} km</Text><Text style={styles.summaryLabel}>Total</Text></View>
        <View style={styles.summaryItem}><Text style={styles.summaryValue}>{stats.peage} €</Text><Text style={styles.summaryLabel}>Frais</Text></View>
      </View>

      {loading ? <ActivityIndicator size="large" color="#FF6B00" style={{marginTop: 50}} /> : (
        <FlatList data={filteredRides} keyExtractor={i => i._id} renderItem={renderItem} contentContainerStyle={styles.listContent} ListEmptyComponent={<Text style={styles.emptyText}>Aucune course trouvée.</Text>} />
      )}

      {/* MODAL DETAIL */}
      <Modal visible={!!selectedRide} animationType="slide" presentationStyle="pageSheet">
        {selectedRide && (
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setSelectedRide(null)}><Ionicons name="close-circle" size={30} color="#999" /></TouchableOpacity>
              <Text style={styles.modalTitle}>Détails Course</Text>
              
              <View style={{flexDirection: 'row', gap: 15}}>
                {/* Bouton Edit */}
                {!isEditing ? (
                   <TouchableOpacity onPress={toggleEditMode}><Ionicons name="pencil" size={24} color="#2196F3" /></TouchableOpacity>
                ) : (
                   <TouchableOpacity onPress={saveEdit}><Ionicons name="checkmark-circle" size={28} color="#4CAF50" /></TouchableOpacity>
                )}
                {/* Bouton Delete */}
                <TouchableOpacity onPress={handleDeleteRide}><Ionicons name="trash" size={24} color="#D32F2F" /></TouchableOpacity>
              </View>
            </View>

            <ScrollView contentContainerStyle={styles.modalContent}>
              
              {selectedRide.isShared && (
                <View style={styles.sharedAlert}><Text style={{color: '#E65100', fontWeight: 'bold'}}>Partagée par {selectedRide.sharedByName}</Text></View>
              )}

              {/* Patient */}
              <View style={styles.detailSection}>
                 <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center'}}>
                   <View><Text style={styles.detailLabel}>Patient</Text><Text style={styles.detailValueBig}>{selectedRide.patientName}</Text></View>
                   <View style={[styles.bigTypeBadge, { backgroundColor: selectedRide.type === 'Ambulance' ? '#FFEBEE' : '#E3F2FD' }]}>
                      <Text style={{color: selectedRide.type === 'Ambulance' ? '#D32F2F' : '#1976D2', fontWeight:'bold'}}>{selectedRide.type}</Text>
                   </View>
                </View>
              </View>

              {/* 🕒 HORAIRES (CORRIGÉS AVEC startTime / endTime) */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>🕒 Horaires {isEditing && "(Édition)"}</Text>
                
                <View style={styles.timeRow}>
                  {/* Départ (startTime ou date) */}
                  <View style={{ alignItems: 'center' }}>
                    <Text style={styles.timeValue}>
                      {moment(selectedRide.startTime || selectedRide.date).format('HH:mm')}
                    </Text>
                    <Text style={styles.timeLabel}>Départ</Text>
                  </View>

                  <Ionicons name="arrow-forward" size={24} color="#CCC" />

                  {/* Arrivée (endTime) */}
                  <View style={{ alignItems: 'center' }}>
                    {isEditing ? (
                      <TextInput 
                        style={styles.editInputTime}
                        value={editData.endTime}
                        onChangeText={t => setEditData({...editData, endTime: t})}
                        placeholder="HH:MM"
                        keyboardType="numbers-and-punctuation"
                      />
                    ) : (
                      <Text style={styles.timeValue}>
                        {(() => {
                            if (selectedRide.endTime) return moment(selectedRide.endTime).format('HH:mm');
                            // Fallback ancien champ
                            if (selectedRide.arrivalDate) return moment(selectedRide.arrivalDate).format('HH:mm');
                            return '--:--';
                        })()}
                      </Text>
                    )}
                    <Text style={styles.timeLabel}>Arrivée</Text>
                  </View>
                  
                  {/* Durée (Calculée) */}
                  {!isEditing && (selectedRide.endTime || selectedRide.arrivalDate) && (
                    <View style={{ alignItems: 'center', backgroundColor:'#F5F5F5', padding:5, borderRadius:5 }}>
                      <Text style={[styles.timeValue, {fontSize:16, color:'#555'}]}>
                        {(() => {
                            const start = moment(selectedRide.startTime || selectedRide.date);
                            const end = moment(selectedRide.endTime || selectedRide.arrivalDate);
                            return end.diff(start, 'minutes');
                        })()}
                      </Text>
                      <Text style={styles.timeLabel}>min</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Itinéraire */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>📍 Itinéraire</Text>
                <View style={styles.addressLine}><Ionicons name="navigate-circle" size={22} color="#4CAF50" /><Text style={styles.addressText}>{selectedRide.startLocation}</Text></View>
                <View style={{height:20, borderLeftWidth:1, borderLeftColor:'#DDD', marginLeft:10, marginVertical:5}} />
                <View style={styles.addressLine}><Ionicons name="flag" size={22} color="#FF6B00" /><Text style={styles.addressText}>{selectedRide.endLocation}</Text></View>
              </View>

              {/* Facturation */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>⏱ Facturation {isEditing && "(Édition)"}</Text>
                <View style={styles.statsRow}>
                   {/* Distance */}
                   <View style={styles.statBox}>
                     {isEditing ? (
                        <TextInput style={styles.editInput} value={editData.realDistance} onChangeText={t => setEditData({...editData, realDistance: t})} keyboardType="numeric"/>
                     ) : <Text style={styles.statBoxValue}>{selectedRide.realDistance || selectedRide.distance || 0}</Text>}
                     <Text style={styles.statBoxLabel}>km réels</Text>
                   </View>
                   {/* Péage */}
                   <View style={styles.statBox}>
                     {isEditing ? (
                        <TextInput style={styles.editInput} value={editData.tolls} onChangeText={t => setEditData({...editData, tolls: t})} keyboardType="numeric"/>
                     ) : <Text style={styles.statBoxValue}>{selectedRide.tolls || 0}</Text>}
                     <Text style={styles.statBoxLabel}>€ Péages</Text>
                   </View>
                </View>
                {isEditing ? (
                   <TouchableOpacity style={[styles.billingBtn, {backgroundColor: '#2196F3'}]} onPress={saveEdit}><Text style={styles.billingBtnText}>ENREGISTRER</Text></TouchableOpacity>
                ) : (
                   <TouchableOpacity style={[styles.billingBtn, selectedRide.statuFacturation === 'Facturé' ? styles.billingBtnGreen : styles.billingBtnRed]} onPress={() => toggleBillingStatus(selectedRide)}>
                      <Text style={styles.billingBtnText}>{selectedRide.statuFacturation === 'Facturé' ? "FACTURÉ (OK)" : "MARQUER FACTURÉ"}</Text>
                   </TouchableOpacity>
                )}
              </View>

              {/* Documents */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>📸 Dossier</Text>
                {loadingDocs ? <ActivityIndicator size="small" color="#999" /> : (
                  <View style={{marginBottom:15}}>
                    {patientDocs.length > 0 ? patientDocs.map((doc, idx) => (
                      <View key={idx} style={styles.docRow}><Ionicons name="document-text" size={18} color="#FF6B00" /><Text style={styles.docText}>{doc.type} ({moment(doc.uploadDate).format('DD/MM')})</Text></View>
                    )) : <Text style={styles.noDocText}>Aucun document.</Text>}
                  </View>
                )}
                <View style={styles.scanGrid}>
                  <DocumentScannerButton title="PMT" docType="PMT" color="#FF6B00" onScan={handleDocumentScanned} isLoading={uploading}/>
                  <DocumentScannerButton title="Vitale" docType="CarteVitale" color="#4CAF50" onScan={handleDocumentScanned} isLoading={uploading}/>
                  <DocumentScannerButton title="Mutuelle" docType="Mutuelle" color="#2196F3" onScan={handleDocumentScanned} isLoading={uploading}/>
                </View>
                <TouchableOpacity style={styles.pdfBtn} onPress={generatePDF}><Ionicons name="document-text" size={20} color="#FFF" style={{marginRight:10}} /><Text style={styles.pdfBtnText}>GÉNÉRER PDF</Text></TouchableOpacity>
              </View>

            </ScrollView>
          </View>
        )}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { backgroundColor: '#FFF', padding: 20 },
  headerTitle: { fontSize: 24, fontWeight: 'bold' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, marginTop: 15 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16, color: '#333' },
  monthSelector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F0F0F0', borderRadius: 12, marginTop:15 },
  arrowBtn: { padding: 10 },
  currentMonth: { fontSize: 16, fontWeight: 'bold', textTransform: 'capitalize' },
  summaryCard: { flexDirection: 'row', backgroundColor: '#FF6B00', margin: 15, borderRadius: 16, padding: 15, justifyContent: 'space-between', elevation: 3 },
  summaryItem: { alignItems: 'center', flex: 1 },
  summaryValue: { fontSize: 18, fontWeight: 'bold', color: '#FFF' },
  summaryLabel: { fontSize: 11, color: 'rgba(255,255,255,0.8)' },
  divider: { width: 1, height: 25, backgroundColor: 'rgba(255,255,255,0.3)' },
  listContent: { paddingHorizontal: 15, paddingBottom: 20 },
  card: { backgroundColor: '#FFF', borderRadius: 12, marginBottom: 10, elevation: 2, overflow: 'hidden' },
  cardShared: { borderLeftWidth: 4, borderLeftColor: '#FF9800', backgroundColor: '#FFF8E1' },
  cardContent: { flexDirection: 'row', alignItems: 'center', padding: 15, paddingTop: 15 },
  sharedTag: { position: 'absolute', top: 5, right: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, borderWidth: 1, borderColor: '#FFE0B2', zIndex: 10 },
  sharedText: { fontSize: 10, color: '#EF6C00', fontWeight: 'bold', marginLeft: 4 },
  dateCol: { alignItems: 'center', paddingRight: 15, borderRightWidth: 1, borderRightColor: '#F0F0F0' },
  dayText: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  monthText: { fontSize: 12, color: '#999', textTransform: 'uppercase' },
  detailsCol: { flex: 1, paddingHorizontal: 15 },
  patientName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  rideTypeSmall: { fontSize: 12, color: '#FF6B00', fontWeight:'bold', marginBottom:5 },
  metaRow: { flexDirection: 'row' },
  badgeInfo: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 8 },
  badgeText: { fontSize: 11, fontWeight: '600', color: '#555', marginLeft: 4 },
  modalContainer: { flex: 1, backgroundColor: '#F2F2F2' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#FFF' },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  modalContent: { padding: 20 },
  detailSection: { backgroundColor: '#FFF', padding: 20, borderRadius: 16, marginBottom: 15 },
  detailLabel: { fontSize: 12, color: '#666', textTransform: 'uppercase' },
  detailValueBig: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  bigTypeBadge: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 10 },
  sharedAlert: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: '#FFF3E0', borderRadius: 16, marginBottom: 15, borderWidth:1, borderColor:'#FFE0B2' },
  scanGrid: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 },
  docRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F9F9F9' },
  docText: { marginLeft: 10, fontSize: 14, color: '#333' },
  noDocText: { fontStyle: 'italic', color: '#999', fontSize: 12 },
  pdfBtn: { backgroundColor: '#333', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 15, borderRadius: 12, marginTop: 15 },
  pdfBtnText: { color: '#FFF', fontWeight: 'bold', marginLeft: 10 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 15, color: '#333', borderBottomWidth: 1, borderBottomColor: '#F0F0F0', paddingBottom: 10 },
  
  // STYLES HORAIRES
  timeRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom:15, alignItems:'center' },
  timeValue: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  timeLabel: { fontSize: 10, color: '#888', textAlign:'center', textTransform:'uppercase' },

  statsRow: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor:'#F9F9F9', padding:10, borderRadius:10 },
  statBox: { alignItems:'center', minWidth: 80 },
  statBoxValue: { fontSize: 18, fontWeight: 'bold', color:'#333' },
  statBoxLabel: { fontSize: 11, color:'#666' },
  addressLine: { flexDirection: 'row', alignItems: 'center' },
  addressText: { marginLeft: 10, fontSize: 14, color: '#444', flex: 1 },
  billingBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 18, borderRadius: 12, marginTop: 10 },
  billingBtnRed: { backgroundColor: '#D32F2F' },
  billingBtnGreen: { backgroundColor: '#388E3C' },
  billingBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  emptyText: { textAlign: 'center', marginTop: 10, color: '#999' },
  
  // STYLE EDITION
  editInput: { borderBottomWidth: 2, borderBottomColor: '#2196F3', fontSize: 18, fontWeight: 'bold', textAlign: 'center', minWidth: 60, padding: 5, color: '#2196F3' },
  editInputTime: { borderBottomWidth: 2, borderBottomColor: '#2196F3', fontSize: 22, fontWeight: 'bold', textAlign: 'center', minWidth: 80, padding: 5, color: '#2196F3' }
});