import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, 
  Alert, SafeAreaView, Modal, ScrollView, TextInput, StatusBar, Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import 'moment/locale/fr';

// Modules natifs
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system'; 

// API & Utils
import api, { getRides, updateRide } from '../services/api'; 
import DocumentScannerButton from '../components/DocumentScannerButton'; 
import { calculatePrice } from '../utils/pricing'; 

export default function HistoryScreen({ navigation }) {
  // --- ÉTATS ---
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState(moment());
  const [searchText, setSearchText] = useState('');

  // --- MODAL & DOCS ---
  const [selectedRide, setSelectedRide] = useState(null);
  const [patientDocs, setPatientDocs] = useState([]); 
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [uploading, setUploading] = useState(false);

  // --- ÉDITION ---
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ realDistance: '', tolls: '', endTime: '' });

  // 1. CHARGEMENT
  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const allRides = await getRides();
      const history = allRides.filter(r => r.status === 'Terminée');      
      history.sort((a, b) => new Date(b.date) - new Date(a.date));
      setRides(history);
    } catch(e) { console.error("Erreur historique:", e); } 
    finally { setLoading(false); }
  }, []);
  
  useEffect(() => { loadHistory(); }, [loadHistory]);

  // 2. LOGIQUE MÉTIER
  const filteredRides = useMemo(() => {
    return rides.filter(r => {
      const sameMonth = moment(r.date).format('MM-YYYY') === currentDate.format('MM-YYYY');
      if (searchText.length === 0) return sameMonth;
      const query = searchText.toLowerCase();
      return sameMonth && (
        (r.patientName && r.patientName.toLowerCase().includes(query)) || 
        (r.startLocation && r.startLocation.toLowerCase().includes(query))
      );
    });
  }, [rides, currentDate, searchText]);

  const stats = useMemo(() => {
    return filteredRides.reduce((acc, curr) => {
        const estimatedPrice = parseFloat(calculatePrice(curr));
        return { 
            km: acc.km + (curr.realDistance || curr.distance || 0), 
            ca: acc.ca + estimatedPrice, 
            count: acc.count + 1 
        };
    }, { km: 0, ca: 0, count: 0 });
  }, [filteredRides]);

  // 3. ACTIONS
  const generateCSV = async () => {
    if (filteredRides.length === 0) return Alert.alert("Info", "Rien à exporter.");
    try {
      let csvContent = "Date;Patient;Départ;Arrivée;Km;Péages;Prix Convention 2025 (€);Facturé\n";
      filteredRides.forEach(ride => {
        const price = calculatePrice(ride); 
        csvContent += `${moment(ride.date).format('DD/MM/YYYY')};${ride.patientName};${ride.startLocation};${ride.endLocation};${ride.realDistance};${ride.tolls};${price};${ride.statuFacturation}\n`;
      });
      const fileUri = FileSystem.cacheDirectory + `Export_${currentDate.format('MM_YYYY')}.csv`;
      await FileSystem.writeAsStringAsync(fileUri, '\uFEFF' + csvContent, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: 'Exporter Excel' });
    } catch (error) { Alert.alert("Erreur", "Export impossible."); }
  };

  const fetchSmartDocuments = async () => {
    try {
      setLoadingDocs(true);
      const res = await api.get(`/documents/by-ride/${selectedRide._id}`);
      setPatientDocs(res.data);
    } catch (err) { console.error(err); } finally { setLoadingDocs(false); }
  };

  useEffect(() => { if (selectedRide) fetchSmartDocuments(); }, [selectedRide]);

  // 4. ÉDITION & SAUVEGARDE
  const toggleEditMode = () => {
    if (!isEditing) {
      setEditData({
        realDistance: String(selectedRide.realDistance || selectedRide.distance || 0),
        tolls: String(selectedRide.tolls || 0),
        endTime: selectedRide.endTime ? moment(selectedRide.endTime).format('HH:mm') : ''
      });
      setIsEditing(true);
    } else { setIsEditing(false); }
  };

  const saveEdit = async () => {
    try {
      setUploading(true);
      const updates = {
        realDistance: parseFloat(editData.realDistance) || 0,
        tolls: parseFloat(editData.tolls) || 0
      };
      
      if (editData.endTime.includes(':')) {
        const [h, m] = editData.endTime.split(':');
        updates.endTime = moment(selectedRide.date).hour(parseInt(h)).minute(parseInt(m)).toISOString();
      }

      const tempRide = { ...selectedRide, ...updates }; 
      const newPrice = calculatePrice(tempRide); 
      updates.price = parseFloat(newPrice); 

      await updateRide(selectedRide._id, updates);
      
      const finalRide = { ...selectedRide, ...updates };
      setSelectedRide(finalRide);
      setRides(prev => prev.map(r => r._id === finalRide._id ? finalRide : r));
      
      setIsEditing(false); 
      Alert.alert("Succès", `Course mise à jour !\nNouveau Prix : ${newPrice} €`);

    } catch (err) { Alert.alert("Erreur", "Mise à jour échouée."); } 
    finally { setUploading(false); }
  };

  const handleDeleteRide = () => {
    Alert.alert("Supprimer ?", "Irréversible.", [
      { text: "Annuler", style: "cancel" },
      { text: "Supprimer", style: "destructive", onPress: async () => {
          await api.delete(`/rides/${selectedRide._id}`);
          setSelectedRide(null); loadHistory();
      }}
    ]);
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

 const handleDocumentScanned = async (uri, docType) => {
    setUploading(true); 
    try {
        const f = new FormData(); 
        f.append('photo', {uri, name:'scan.jpg', type:'image/jpeg'}); 
        f.append('rideId', selectedRide._id); 
        f.append('docType', docType); 
        await api.post('/documents/upload', f); 
        fetchSmartDocuments(); 
    } catch(e) { Alert.alert('Erreur', "Upload impossible"); }
    finally { setUploading(false); }
  };

  // 5. RENDU LISTE
  const renderItem = ({ item }) => {
    const isBilled = item.statuFacturation === 'Facturé';
    const displayPrice = calculatePrice(item); 
    const isAmbulance = item.type === 'Ambulance';

    return (
      <TouchableOpacity style={styles.card} onPress={() => { setIsEditing(false); setSelectedRide(item); }} activeOpacity={0.7}>
        <View style={styles.cardContent}>
          {/* DATE */}
          <View style={styles.dateCol}>
            <Text style={styles.dayText}>{moment(item.date).format('DD')}</Text>
            <Text style={styles.monthText}>{moment(item.date).format('MMM')}</Text>
          </View>
          
          {/* INFO */}
          <View style={styles.detailsCol}>
            <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start'}}>
                <Text style={styles.patientName}>{item.patientName}</Text>
                <View style={[styles.typePill, {backgroundColor: isAmbulance ? '#FFEBEE' : '#E3F2FD'}]}>
                    <Text style={{fontSize:10, fontWeight:'bold', color: isAmbulance ? '#D32F2F' : '#1565C0'}}>{item.type}</Text>
                </View>
            </View>
            
            <View style={styles.infoRow}>
                <Ionicons name="navigate" size={12} color="#999" style={{marginRight:4}}/>
                <Text style={styles.rideInfoText}>{item.realDistance || 0} km</Text>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.priceTextList}>{displayPrice} €</Text>
              
              {isBilled ? (
                 <View style={styles.billedBadge}>
                     <Ionicons name="checkmark-circle" size={12} color="#2E7D32" style={{marginRight:3}}/>
                     <Text style={styles.billedText}>Facturé</Text>
                 </View>
              ) : (
                 <Text style={styles.pendingText}>À facturer</Text>
              )}
            </View>
          </View>
          
          <Ionicons name="chevron-forward" size={18} color="#CCC" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#E65100" />
      
      {/* HEADER COURBÉ */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
            <Text style={styles.headerTitle}>Activité</Text>
            <TouchableOpacity style={styles.exportBtn} onPress={generateCSV}>
                <Ionicons name="download-outline" size={18} color="#FFF" />
                <Text style={styles.exportBtnText}>CSV</Text>
            </TouchableOpacity>
        </View>

        {/* SÉLECTEUR DE MOIS */}
        <View style={styles.monthSelector}>
             <TouchableOpacity onPress={() => setCurrentDate(moment(currentDate).subtract(1, 'month'))} style={styles.monthArrow}>
                <Ionicons name="chevron-back" size={20} color="#FFF" />
             </TouchableOpacity>
             <Text style={styles.monthTitle}>{currentDate.format('MMMM YYYY')}</Text>
             <TouchableOpacity onPress={() => setCurrentDate(moment(currentDate).add(1, 'month'))} style={styles.monthArrow}>
                <Ionicons name="chevron-forward" size={20} color="#FFF" />
             </TouchableOpacity>
        </View>

        {/* STATS RÉSUMÉ INTÉGRÉES AU HEADER */}
        <View style={styles.statsContainer}>
             <View style={styles.statItem}>
                 <Text style={styles.statValue}>{stats.count}</Text>
                 <Text style={styles.statLabel}>Courses</Text>
             </View>
             <View style={styles.statDivider} />
             <View style={styles.statItem}>
                 <Text style={styles.statValue}>{stats.km}</Text>
                 <Text style={styles.statLabel}>Km Total</Text>
             </View>
             <View style={styles.statDivider} />
             <View style={styles.statItem}>
                 <Text style={styles.statValue}>{stats.ca.toFixed(2)} €</Text>
                 <Text style={styles.statLabel}>CA Estimé</Text>
             </View>
        </View>
      </View>

      {/* BARRE RECHERCHE FLOTTANTE */}
      <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput 
              style={styles.searchInput} 
              placeholder="Rechercher patient, lieu..." 
              value={searchText}
              onChangeText={setSearchText}
          />
          {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText('')}>
                  <Ionicons name="close-circle" size={18} color="#CCC" />
              </TouchableOpacity>
          )}
      </View>

      {loading ? <ActivityIndicator size="large" color="#FF6B00" style={{marginTop: 50}} /> : (
        <FlatList 
            data={filteredRides} 
            keyExtractor={i => i._id} 
            renderItem={renderItem} 
            contentContainerStyle={styles.listContent} 
            ListEmptyComponent={<Text style={styles.emptyText}>Aucune course terminée ce mois-ci.</Text>} 
        />
      )}

      {/* MODAL DÉTAIL */}
      <Modal visible={!!selectedRide} animationType="slide" presentationStyle="pageSheet">
        {selectedRide && (
          <View style={styles.modalContainer}>
            {/* Header Modal */}
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setSelectedRide(null)} style={styles.closeModalBtn}>
                  <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Détails Course</Text>
              <View style={{flexDirection: 'row', gap: 10}}>
                <TouchableOpacity onPress={toggleEditMode} style={styles.iconBtn}>
                    <Ionicons name={isEditing ? "close-circle" : "pencil"} size={22} color="#2196F3" />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleDeleteRide} style={styles.iconBtn}>
                    <Ionicons name="trash-outline" size={22} color="#D32F2F" />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              
              {/* PRIX CARD */}
              <View style={styles.priceCard}>
                  <Text style={styles.priceLabel}>MONTANT CONVENTION 2025</Text>
                  <Text style={styles.priceBig}>{calculatePrice(selectedRide)} €</Text>
                  {isEditing && <Text style={{color:'red', fontSize:10, marginTop:5}}>Mode Édition Activé</Text>}
              </View>

              {/* SECTION PATIENT */}
              <View style={styles.sectionCard}>
                 <Text style={styles.sectionHeader}>👤 Patient</Text>
                 <Text style={styles.patientBig}>{selectedRide.patientName}</Text>
                 <View style={styles.tagRow}>
                    <View style={styles.greyTag}><Text style={styles.tagText}>{selectedRide.type}</Text></View>
                    {selectedRide.isRoundTrip && <View style={styles.greyTag}><Text style={styles.tagText}>Aller-Retour</Text></View>}
                 </View>
              </View>

              {/* SECTION TRAJET */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionHeader}>📍 Itinéraire</Text>
                <View style={styles.timelineItem}>
                    <View style={[styles.dot, {backgroundColor:'#4CAF50'}]} />
                    <View style={{flex:1}}>
                        <Text style={styles.addrLabel}>DÉPART</Text>
                        <Text style={styles.addrText}>{selectedRide.startLocation}</Text>
                        <Text style={styles.timeText}>{moment(selectedRide.startTime || selectedRide.date).format('HH:mm')}</Text>
                    </View>
                </View>
                <View style={styles.line} />
                <View style={styles.timelineItem}>
                    <View style={[styles.dot, {backgroundColor:'#FF6B00'}]} />
                    <View style={{flex:1}}>
                        <Text style={styles.addrLabel}>ARRIVÉE</Text>
                        <Text style={styles.addrText}>{selectedRide.endLocation}</Text>
                        <View style={{flexDirection:'row', alignItems:'center'}}>
                            {isEditing ? (
                                <TextInput 
                                    style={styles.inputTime} 
                                    value={editData.endTime} 
                                    placeholder="HH:MM"
                                    onChangeText={t => setEditData({...editData, endTime: t})}
                                />
                            ) : (
                                <Text style={styles.timeText}>{selectedRide.endTime ? moment(selectedRide.endTime).format('HH:mm') : '--:--'}</Text>
                            )}
                        </View>
                    </View>
                </View>
              </View>

              {/* SECTION DONNÉES */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionHeader}>📊 Métriques</Text>
                <View style={styles.metricsRow}>
                   <View style={styles.metricItem}>
                     <Text style={styles.metricLabel}>Distance (km)</Text>
                     {isEditing ? <TextInput style={styles.inputMetric} keyboardType="numeric" value={editData.realDistance} onChangeText={t => setEditData({...editData, realDistance: t})}/> : <Text style={styles.metricValue}>{selectedRide.realDistance || 0}</Text>}
                   </View>
                   <View style={styles.metricItem}>
                     <Text style={styles.metricLabel}>Péages (€)</Text>
                     {isEditing ? <TextInput style={styles.inputMetric} keyboardType="numeric" value={editData.tolls} onChangeText={t => setEditData({...editData, tolls: t})}/> : <Text style={styles.metricValue}>{selectedRide.tolls || 0}</Text>}
                   </View>
                </View>

                <View style={{marginTop: 20}}>
                    {isEditing ? (
                        <TouchableOpacity style={styles.saveBtn} onPress={saveEdit}>
                            <Text style={styles.saveBtnText}>ENREGISTRER & RECALCULER</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity 
                            style={[styles.billBtn, selectedRide.statuFacturation === 'Facturé' ? styles.billBtnDone : styles.billBtnTodo]} 
                            onPress={() => toggleBillingStatus(selectedRide)}
                        >
                            <Ionicons name={selectedRide.statuFacturation === 'Facturé' ? "checkmark-circle" : "ellipse-outline"} size={20} color="#FFF" style={{marginRight:8}}/>
                            <Text style={styles.billBtnText}>{selectedRide.statuFacturation === 'Facturé' ? "FACTURÉ" : "MARQUER FACTURÉ"}</Text>
                        </TouchableOpacity>
                    )}
                </View>
              </View>

              {/* DOCUMENTS */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionHeader}>📎 Pièces Jointes</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginVertical: 10}}>
                    <DocumentScannerButton title="PMT" docType="PMT" color="#FF6B00" onScan={(uri) => handleDocumentScanned(uri, 'PMT')} isLoading={uploading}/>
                    <View style={{width:10}} />
                    <DocumentScannerButton title="Vitale" docType="CarteVitale" color="#4CAF50" onScan={(uri) => handleDocumentScanned(uri, 'CarteVitale')} isLoading={uploading}/>
                </ScrollView>
                
                {patientDocs.map((d, i) => (
                    <View key={i} style={styles.fileRow}>
                        <Ionicons name="document-text-outline" size={20} color="#555" />
                        <Text style={styles.fileText}>{d.type} - {moment(d.uploadDate).format('DD/MM')}</Text>
                    </View>
                ))}
              </View>

              <View style={{height: 40}} />
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F8' },

  // --- HEADER PREMIUM ---
  header: { 
    backgroundColor: '#FF6B00', 
    paddingTop: Platform.OS === 'ios' ? 60 : 50, 
    paddingBottom: 40, // Espace pour la barre de recherche
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30, 
    borderBottomRightRadius: 30,
    elevation: 8, shadowColor: '#FF6B00', shadowOffset:{width:0, height:4}, shadowOpacity:0.3, shadowRadius:8
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#FFF' },
  exportBtn: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, alignItems: 'center' },
  exportBtnText: { color: '#FFF', fontWeight: 'bold', marginLeft: 5, fontSize: 12 },

  monthSelector: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  monthTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', textTransform: 'capitalize', width: 150, textAlign: 'center' },
  monthArrow: { padding: 5 },

  statsContainer: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 16, padding: 15, justifyContent: 'space-between', borderColor: 'rgba(255,255,255,0.3)', borderWidth: 1 },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  statLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 2 },
  statDivider: { width: 1, height: '80%', backgroundColor: 'rgba(255,255,255,0.3)' },

  // --- SEARCH BAR FLOTTANTE ---
  searchContainer: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', 
    marginHorizontal: 20, marginTop: -25, borderRadius: 15, paddingHorizontal: 15, paddingVertical: 12,
    elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, zIndex: 10
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16, color: '#333' },

  // --- LISTE ---
  listContent: { paddingHorizontal: 20, paddingTop: 15, paddingBottom: 100 },
  card: { backgroundColor: '#FFF', borderRadius: 16, marginBottom: 12, elevation: 2, padding: 15 },
  cardContent: { flexDirection: 'row', alignItems: 'center' },
  dateCol: { alignItems: 'center', paddingRight: 15, borderRightWidth: 1, borderRightColor: '#F0F0F0' },
  dayText: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  monthText: { fontSize: 12, color: '#999', textTransform: 'uppercase' },
  detailsCol: { flex: 1, paddingLeft: 15 },
  patientName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  typePill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  rideInfoText: { fontSize: 13, color: '#666' },
  
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  priceTextList: { fontSize: 16, fontWeight: 'bold', color: '#2E7D32' },
  billedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  billedText: { fontSize: 11, fontWeight: 'bold', color: '#2E7D32' },
  pendingText: { fontSize: 11, color: '#F57C00', fontStyle: 'italic' },

  emptyText: { textAlign: 'center', marginTop: 40, color: '#999', fontSize: 16 },

  // --- MODAL PREMIUM ---
  modalContainer: { flex: 1, backgroundColor: '#F4F6F8' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  closeModalBtn: { padding: 5 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  iconBtn: { padding: 5 },
  modalScroll: { padding: 20 },

  priceCard: { backgroundColor: '#E0F2F1', borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#B2DFDB' },
  priceLabel: { fontSize: 12, color: '#00695C', fontWeight: 'bold', letterSpacing: 1 },
  priceBig: { fontSize: 36, fontWeight: '900', color: '#004D40', marginTop: 5 },

  sectionCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 15, elevation: 1 },
  sectionHeader: { fontSize: 15, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  patientBig: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  tagRow: { flexDirection: 'row', marginTop: 10, gap: 10 },
  greyTag: { backgroundColor: '#F5F5F5', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  tagText: { color: '#555', fontSize: 12, fontWeight: '600' },

  timelineItem: { flexDirection: 'row', alignItems: 'flex-start' },
  dot: { width: 12, height: 12, borderRadius: 6, marginTop: 5, marginRight: 15 },
  line: { width: 2, height: 30, backgroundColor: '#EEE', marginLeft: 5, marginVertical: 2 },
  addrLabel: { fontSize: 10, color: '#999', fontWeight: 'bold' },
  addrText: { fontSize: 15, color: '#333', marginBottom: 2 },
  timeText: { fontSize: 13, color: '#555', fontWeight: 'bold' },
  
  metricsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 15 },
  metricItem: { flex: 1, backgroundColor: '#F9FAFB', padding: 15, borderRadius: 12, alignItems: 'center' },
  metricLabel: { fontSize: 12, color: '#666', marginBottom: 5 },
  metricValue: { fontSize: 18, fontWeight: 'bold', color: '#333' },

  // Inputs Edition
  inputMetric: { fontSize: 18, fontWeight: 'bold', color: '#2196F3', borderBottomWidth: 1, borderBottomColor: '#2196F3', textAlign: 'center', width: '80%' },
  inputTime: { fontSize: 13, fontWeight: 'bold', color: '#2196F3', borderBottomWidth: 1, borderBottomColor: '#2196F3', minWidth: 50 },

  saveBtn: { backgroundColor: '#2196F3', padding: 15, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: '#FFF', fontWeight: 'bold' },

  billBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 15, borderRadius: 12 },
  billBtnDone: { backgroundColor: '#388E3C' },
  billBtnTodo: { backgroundColor: '#757575' },
  billBtnText: { color: '#FFF', fontWeight: 'bold' },

  fileRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, backgroundColor: '#FAFAFA', padding: 10, borderRadius: 8 },
  fileText: { marginLeft: 10, color: '#333', fontSize: 13 },
});