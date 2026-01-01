import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView, Modal, ScrollView, TextInput 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import 'moment/locale/fr';

// Modules natifs
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

// API
import api, { getRides, updateRide } from '../services/api'; 

// 👇 IMPORT DU NOUVEAU COMPOSANT
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
  const [uploading, setUploading] = useState(false); // État global d'upload pour bloquer l'UI

  // ============================================================
  // 1. CHARGEMENT ET FILTRES
  // ============================================================

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const allRides = await getRides();
      
      // On garde UNIQUEMENT les courses terminées
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

  // Filtres (Mois + Recherche Texte)
  const filteredRides = useMemo(() => {
    return rides.filter(r => {
      const sameMonth = moment(r.date).format('MM-YYYY') === currentDate.format('MM-YYYY');
      if (searchText.length === 0) return sameMonth;

      const query = searchText.toLowerCase();
      const matchesSearch = 
        (r.patientName && r.patientName.toLowerCase().includes(query)) || 
        (r.startLocation && r.startLocation.toLowerCase().includes(query)) ||
        (r.endLocation && r.endLocation.toLowerCase().includes(query));

      return sameMonth && matchesSearch;
    });
  }, [rides, currentDate, searchText]);

  // Calculs Comptables (Stats du mois affiché)
  const stats = useMemo(() => {
    return filteredRides.reduce((acc, curr) => ({ 
      km: acc.km + (curr.realDistance || 0), 
      peage: acc.peage + (curr.tolls || 0), 
      count: acc.count + 1 
    }), { km: 0, peage: 0, count: 0 });
  }, [filteredRides]);

  // ============================================================
  // 2. GESTION DES DOCUMENTS
  // ============================================================

  // Charge les docs dès qu'on ouvre une course
  useEffect(() => {
    if (selectedRide) {
      fetchSmartDocuments();
    }
  }, [selectedRide]);

  const fetchSmartDocuments = async () => {
    try {
      setLoadingDocs(true);
      const res = await api.get(`/documents/by-ride/${selectedRide._id}`);
      setPatientDocs(res.data);
    } catch (err) {
      console.error("Erreur chargement docs", err);
    } finally {
      setLoadingDocs(false);
    }
  };

  /**
   * Cette fonction est appelée par le composant <DocumentScannerButton />
   * une fois que l'utilisateur a pris la photo et l'a validée.
   */
  const handleDocumentScanned = async (uri, docType) => {
    await uploadDocument(uri, docType);
  };

  const uploadDocument = async (uri, docType) => {
    if (!selectedRide) return;
    try {
      setUploading(true); // Active le loader global ou local
      
      const formData = new FormData();
      const fileName = `scan_${docType}_${moment().format('HHmmss')}.jpg`;

      formData.append('photo', { uri: uri, name: fileName, type: 'image/jpeg' });
      formData.append('patientName', selectedRide.patientName);
      formData.append('docType', docType);
      formData.append('rideId', selectedRide._id);

      await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        transformRequest: (data) => data,
      });
      
      Alert.alert("Succès", "Document ajouté au dossier !");
      fetchSmartDocuments(); // Rafraîchissement

    } catch (error) {
      Alert.alert("Erreur", "Echec de l'envoi.");
    } finally { 
      setUploading(false); 
    }
  };

  // ============================================================
  // 3. GÉNÉRATION PDF
  // ============================================================

  const generatePDF = async () => {
    if (!selectedRide) return;
    try {
      setUploading(true);
      const docs = patientDocs;

      let imagesHtml = '';
      if (docs.length > 0) {
        imagesHtml = `<h3>Pièces Jointes (${docs.length})</h3>`;
        docs.forEach(doc => {
          imagesHtml += `
            <div style="margin-bottom: 20px; border: 1px solid #ccc; padding: 10px; page-break-inside: avoid;">
              <p><strong>${doc.type}</strong> <span style="font-size:12px; color:#666;">(Ajouté le ${moment(doc.uploadDate).format('DD/MM/YYYY')})</span></p>
              <img src="${doc.imageData}" style="width: 100%; max-height: 800px; object-fit: contain;" />
            </div>
          `;
        });
      } else {
        imagesHtml = `<p><em>Aucun document numérisé pour ce dossier.</em></p>`;
      }

      const html = `
        <html>
          <body style="font-family: Helvetica, sans-serif; padding: 30px; color: #333;">
            <h1 style="color: #FF6B00; border-bottom: 2px solid #FF6B00;">Fiche de Transport VSL</h1>
            <p>Date : <strong>${moment(selectedRide.date).format('dddd D MMMM YYYY')}</strong></p>
            
            <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <p><strong>Patient:</strong> ${selectedRide.patientName}</p>
                <p><strong>Trajet:</strong> ${selectedRide.startLocation} ➔ ${selectedRide.endLocation}</p>
            </div>

            <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                <div><strong>Distance:</strong> ${selectedRide.realDistance || 0} km</div>
                <div><strong>Péages:</strong> ${selectedRide.tolls || 0} €</div>
            </div>

            <hr/>
            <div style="margin-top:30px;">
              ${imagesHtml}
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });

    } catch (err) {
      Alert.alert("Erreur PDF", "Impossible de générer le fichier.");
    } finally {
      setUploading(false);
    }
  };

  // ============================================================
  // 4. RENDU (UI)
  // ============================================================

  const toggleBillingStatus = async (ride) => {
     try {
      const newStatus = ride.statuFacturation === 'Facturé' ? 'Non facturé' : 'Facturé';
      const updatedRides = rides.map(r => r._id === ride._id ? { ...r, statuFacturation: newStatus } : r);
      setRides(updatedRides);
      if (selectedRide && selectedRide._id === ride._id) setSelectedRide({ ...selectedRide, statuFacturation: newStatus });
      await updateRide(ride._id, { statuFacturation: newStatus });
    } catch (err) { Alert.alert("Erreur", "Impossible de changer le statut."); loadHistory(); }
  };

  const changeMonth = (direction) => setCurrentDate(prev => moment(prev).add(direction, 'months'));

  const renderItem = ({ item }) => {
    const isBilled = item.statuFacturation === 'Facturé';
    const isShared = item.isShared;

    return (
      <TouchableOpacity 
        style={[styles.card, isShared && styles.cardShared]} 
        onPress={() => setSelectedRide(item)} 
        activeOpacity={0.7}
      >
        {isShared && (
          <View style={styles.sharedTag}>
            <Ionicons name="arrow-undo-circle" size={16} color="#EF6C00" />
            <Text style={styles.sharedText}>Reçu de : {item.sharedByName || "Collègue"}</Text>
          </View>
        )}
        <View style={styles.cardContent}>
          <View style={styles.dateCol}>
            <Text style={styles.dayText}>{moment(item.date).format('DD')}</Text>
            <Text style={styles.monthText}>{moment(item.date).format('MMM')}</Text>
          </View>
          <View style={styles.detailsCol}>
            <Text style={styles.patientName}>{item.patientName}</Text>
            <Text style={styles.rideTypeSmall}>{item.type} {item.isRoundTrip ? '⇄' : '→'}</Text>
            <View style={styles.metaRow}>
              <View style={styles.badgeInfo}><Ionicons name="speedometer-outline" size={12} color="#555" /><Text style={styles.badgeText}>{item.realDistance || 0} km</Text></View>
              <View style={[styles.badgeInfo, {backgroundColor: isBilled ? '#E8F5E9' : '#FFEBEE'}]}>
                <Text style={[styles.badgeText, {color: isBilled ? '#2E7D32' : '#C62828'}]}>{isBilled ? "Facturé" : "À faire"}</Text>
              </View>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#CCC" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Historique</Text>
        
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput 
            style={styles.searchInput} placeholder="Patient, ville..." value={searchText} onChangeText={setSearchText} placeholderTextColor="#999" 
          />
          {searchText.length > 0 && <TouchableOpacity onPress={() => setSearchText('')}><Ionicons name="close-circle" size={20} color="#CCC" /></TouchableOpacity>}
        </View>

        <View style={styles.monthSelector}>
            <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.arrowBtn}><Ionicons name="chevron-back" size={24} color="#333" /></TouchableOpacity>
            <Text style={styles.currentMonth}>{currentDate.format('MMMM YYYY')}</Text>
            <TouchableOpacity onPress={() => changeMonth(1)} style={styles.arrowBtn}><Ionicons name="chevron-forward" size={24} color="#333" /></TouchableOpacity>
        </View>
      </View>

      {/* DASHBOARD */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}><Text style={styles.summaryValue}>{stats.count}</Text><Text style={styles.summaryLabel}>Courses</Text></View>
        <View style={styles.divider} />
        <View style={styles.summaryItem}><Text style={styles.summaryValue}>{stats.km} km</Text><Text style={styles.summaryLabel}>Total</Text></View>
        <View style={styles.summaryItem}><Text style={styles.summaryValue}>{stats.peage} €</Text><Text style={styles.summaryLabel}>Frais</Text></View>
      </View>

      {/* LISTE */}
      {loading ? <ActivityIndicator size="large" color="#FF6B00" style={{marginTop: 50}} /> : (
        <FlatList 
          data={filteredRides} keyExtractor={i => i._id} renderItem={renderItem} contentContainerStyle={styles.listContent} 
          ListEmptyComponent={<View style={{alignItems:'center', marginTop:30}}><Ionicons name="search-outline" size={40} color="#DDD" /><Text style={styles.emptyText}>Aucune course trouvée.</Text></View>}
        />
      )}

      {/* MODAL DÉTAIL */}
      <Modal visible={!!selectedRide} animationType="slide" presentationStyle="pageSheet">
        {selectedRide && (
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Détails & Documents</Text>
              <TouchableOpacity onPress={() => setSelectedRide(null)}><Ionicons name="close-circle" size={30} color="#999" /></TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalContent}>
              
              {/* ALERTE PARTAGE */}
              {selectedRide.isShared && (
                <View style={styles.sharedAlert}>
                  <Ionicons name="people-circle" size={30} color="#EF6C00" />
                  <View style={{marginLeft: 10}}>
                    <Text style={{color: '#E65100', fontWeight: 'bold'}}>Course Partagée</Text>
                    <Text style={{color: '#EF6C00', fontSize: 12}}>De : {selectedRide.sharedByName || "Collègue"}</Text>
                  </View>
                </View>
              )}

              {/* 1. Patient */}
              <View style={styles.detailSection}>
                <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center'}}>
                   <View><Text style={styles.detailLabel}>Patient</Text><Text style={styles.detailValueBig}>{selectedRide.patientName}</Text></View>
                   <View style={[styles.bigTypeBadge, { backgroundColor: selectedRide.type === 'Ambulance' ? '#FFEBEE' : '#E3F2FD' }]}>
                      <Ionicons name="car-sport" size={20} color={selectedRide.type === 'Ambulance' ? '#D32F2F' : '#1976D2'} />
                      <Text style={{color: selectedRide.type === 'Ambulance' ? '#D32F2F' : '#1976D2', fontWeight:'bold', marginLeft:5}}>{selectedRide.type}</Text>
                   </View>
                </View>
              </View>

              {/* 2. Itinéraire */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>📍 Itinéraire</Text>
                <View style={styles.addressLine}><Ionicons name="navigate-circle" size={22} color="#4CAF50" /><Text style={styles.addressText}>{selectedRide.startLocation}</Text></View>
                <View style={{height:20, borderLeftWidth:1, borderLeftColor:'#DDD', marginLeft:10, marginVertical:5}} />
                <View style={styles.addressLine}><Ionicons name="flag" size={22} color="#FF6B00" /><Text style={styles.addressText}>{selectedRide.endLocation}</Text></View>
              </View>

              {/* 3. Documents (AVEC COMPOSANT SCANNER) */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>📸 Dossier Patient</Text>
                
                {loadingDocs ? <ActivityIndicator size="small" color="#999" /> : (
                  <View style={{marginBottom:15}}>
                    {patientDocs.length > 0 ? patientDocs.map((doc, idx) => (
                      <View key={idx} style={styles.docRow}>
                        <Ionicons name="document-text" size={18} color={doc.type === 'PMT' ? '#FF6B00' : '#4CAF50'} />
                        <Text style={styles.docText}>{doc.type} <Text style={{fontSize:10, color:'#999'}}>({moment(doc.uploadDate).format('DD/MM')})</Text></Text>
                      </View>
                    )) : <Text style={styles.noDocText}>Aucun document.</Text>}
                  </View>
                )}

                {/* 👇 GRILLE DES BOUTONS SCANNER REUTILISABLES */}
                <View style={styles.scanGrid}>
                  <DocumentScannerButton 
                    title="PMT" 
                    docType="PMT" 
                    color="#FF6B00" 
                    onScan={handleDocumentScanned} 
                    isLoading={uploading}
                  />
                  <DocumentScannerButton 
                    title="Vitale" 
                    docType="CarteVitale" 
                    color="#4CAF50" 
                    onScan={handleDocumentScanned} 
                    isLoading={uploading}
                  />
                  <DocumentScannerButton 
                    title="Mutuelle" 
                    docType="Mutuelle" 
                    color="#2196F3" 
                    onScan={handleDocumentScanned} 
                    isLoading={uploading}
                  />
                </View>
                
                <TouchableOpacity style={styles.pdfBtn} onPress={generatePDF}>
                  <Ionicons name="document-text" size={20} color="#FFF" style={{marginRight:10}} />
                  <Text style={styles.pdfBtnText}>GÉNÉRER PDF</Text>
                </TouchableOpacity>
              </View>

              {/* 4. Facturation */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>⏱ Facturation</Text>
                <View style={styles.statsRow}>
                   <View style={styles.statBox}><Text style={styles.statBoxValue}>{selectedRide.realDistance || 0} km</Text><Text style={styles.statBoxLabel}>Distance</Text></View>
                   <View style={styles.statBox}><Text style={styles.statBoxValue}>{selectedRide.tolls || 0} €</Text><Text style={styles.statBoxLabel}>Péages</Text></View>
                </View>

                <TouchableOpacity 
                  style={[styles.billingBtn, selectedRide.statuFacturation === 'Facturé' ? styles.billingBtnGreen : styles.billingBtnRed]}
                  onPress={() => toggleBillingStatus(selectedRide)}
                >
                  <Ionicons name={selectedRide.statuFacturation === 'Facturé' ? "checkmark-circle" : "alert-circle"} size={24} color="#FFF" style={{marginRight:10}} />
                  <Text style={styles.billingBtnText}>{selectedRide.statuFacturation === 'Facturé' ? "FACTURÉ (OK)" : "MARQUER FACTURÉ"}</Text>
                </TouchableOpacity>
              </View>

            </ScrollView>
          </View>
        )}
      </Modal>
    </SafeAreaView>
  );
}

// Les styles sont inchangés, ils restent les mêmes que précédemment
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
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
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
  timeRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom:15 },
  timeValue: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  timeLabel: { fontSize: 10, color: '#888', textAlign:'center', textTransform:'uppercase' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor:'#F9F9F9', padding:10, borderRadius:10 },
  statBox: { alignItems:'center' },
  statBoxValue: { fontSize: 18, fontWeight: 'bold', color:'#333' },
  statBoxLabel: { fontSize: 11, color:'#666' },
  addressLine: { flexDirection: 'row', alignItems: 'center' },
  addressText: { marginLeft: 10, fontSize: 14, color: '#444', flex: 1 },
  billingBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 18, borderRadius: 12, marginTop: 10 },
  billingBtnRed: { backgroundColor: '#D32F2F' },
  billingBtnGreen: { backgroundColor: '#388E3C' },
  billingBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  emptyText: { textAlign: 'center', marginTop: 10, color: '#999' },
});