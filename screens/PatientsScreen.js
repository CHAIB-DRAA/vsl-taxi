import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput, 
  ActivityIndicator, Alert, Modal, ScrollView 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import 'moment/locale/fr';

// API
import api, { getPatients, updatePatient, deletePatient, getRides } from '../services/api';

export default function PatientsScreen() {
  // --- ÉTATS LISTE PRINCIPALE ---
  const [patients, setPatients] = useState([]);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  // --- ÉTATS MODAL DÉTAILS ---
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [activeTab, setActiveTab] = useState('profil'); // 'profil', 'history', 'docs'
  
  // Données dynamiques du patient
  const [patientRides, setPatientRides] = useState([]);
  const [patientDocs, setPatientDocs] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Formulaire d'édition
  const [formData, setFormData] = useState({ fullName: '', address: '', phone: '' });

  // 1. CHARGEMENT INITIAL DES PATIENTS
  const loadPatients = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getPatients();
      // Tri par ordre alphabétique
      const sorted = data.sort((a, b) => a.fullName.localeCompare(b.fullName));
      setPatients(sorted);
      setFilteredPatients(sorted);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPatients(); }, [loadPatients]);

  // 2. RECHERCHE
  const handleSearch = (text) => {
    setSearch(text);
    if (text) {
      const filtered = patients.filter(p => p.fullName.toLowerCase().includes(text.toLowerCase()));
      setFilteredPatients(filtered);
    } else {
      setFilteredPatients(patients);
    }
  };

  // 3. OUVERTURE FICHE PATIENT (PROFIL + HISTORIQUE + DOCS)
  const openPatientModal = async (patient) => {
    setSelectedPatient(patient);
    setFormData({ fullName: patient.fullName, address: patient.address || '', phone: patient.phone || '' });
    setActiveTab('profil'); // On ouvre sur le profil par défaut
    setModalVisible(true);
    
    // Charger l'historique et les docs
    fetchPatientDetails(patient.fullName);
  };

  const fetchPatientDetails = async (patientName) => {
    try {
      setLoadingDetails(true);
      
      // A. Récupérer toutes les courses et filtrer
      const allRides = await getRides();
      const myRides = allRides.filter(r => r.patientName === patientName);
      
      // Tri du plus récent au plus ancien
      myRides.sort((a, b) => new Date(b.date) - new Date(a.date));
      setPatientRides(myRides);

      // B. Récupérer les documents (Aggrégation des docs de toutes ses courses)
      const docsPromises = myRides.map(r => api.get(`/documents/by-ride/${r._id}`).catch(() => ({ data: [] })));
      const docsResults = await Promise.all(docsPromises);
      
      // On met tout à plat dans un seul tableau
      const allDocs = docsResults.flatMap(res => res.data);
      setPatientDocs(allDocs);

    } catch (err) {
      console.log("Erreur chargement détails patient", err);
    } finally {
      setLoadingDetails(false);
    }
  };

  // 4. SAUVEGARDE MODIFICATIONS
  const handleSave = async () => {
    try {
      await updatePatient(selectedPatient._id, formData);
      setModalVisible(false);
      Alert.alert("Succès", "Fiche mise à jour");
      loadPatients();
    } catch (err) {
      Alert.alert("Erreur", "Mise à jour impossible");
    }
  };

  // 5. SUPPRESSION PATIENT
  const handleDelete = () => {
    Alert.alert("Suppression", "Confirmer la suppression ?", [
      { text: "Annuler", style: "cancel" },
      { text: "Supprimer", style: "destructive", onPress: async () => {
          try {
            await deletePatient(selectedPatient._id);
            setModalVisible(false);
            loadPatients();
          } catch (err) { Alert.alert("Erreur", "Suppression impossible"); }
        } 
      }
    ]);
  };

  // --- RENDU ITEMS LISTE PRINCIPALE ---
  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => openPatientModal(item)}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.fullName.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{item.fullName}</Text>
        <Text style={styles.subInfo}>{item.phone || "Pas de numéro"}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#CCC" />
    </TouchableOpacity>
  );

  // --- RENDU CONTENU MODAL (ONGLETS) ---
  const renderTabContent = () => {
    if (loadingDetails) return <ActivityIndicator color="#FF6B00" style={{marginTop: 50}} />;

    switch (activeTab) {
      case 'profil':
        return (
          <ScrollView style={styles.tabContent}>
             <View style={styles.inputGroup}>
              <Text style={styles.label}>Nom Complet</Text>
              <TextInput style={styles.input} value={formData.fullName} onChangeText={t => setFormData({...formData, fullName: t})} />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Téléphone</Text>
              <TextInput style={styles.input} value={formData.phone} keyboardType="phone-pad" onChangeText={t => setFormData({...formData, phone: t})} />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Adresse Domicile</Text>
              <TextInput style={styles.input} value={formData.address} multiline onChangeText={t => setFormData({...formData, address: t})} />
            </View>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
               <Text style={styles.saveBtnText}>Enregistrer les modifications</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
               <Ionicons name="trash-outline" size={20} color="#D32F2F" />
               <Text style={styles.deleteText}>Supprimer ce patient</Text>
            </TouchableOpacity>
          </ScrollView>
        );

      case 'history':
        return (
          <FlatList 
            key="list-1-col" // CORRECTION ICI : Clé unique
            data={patientRides}
            keyExtractor={item => item._id}
            contentContainerStyle={{paddingBottom: 20}}
            ListEmptyComponent={<Text style={styles.emptyText}>Aucune course enregistrée.</Text>}
            renderItem={({item}) => (
              <View style={styles.historyCard}>
                <View style={styles.historyDate}>
                  <Text style={{fontWeight:'bold', fontSize:16}}>{moment(item.date).format('DD')}</Text>
                  <Text style={{fontSize:12, textTransform:'uppercase'}}>{moment(item.date).format('MMM')}</Text>
                </View>
                <View style={{flex:1, marginLeft:15}}>
                   <Text style={{fontWeight:'bold', color:'#333'}}>{item.type}</Text>
                   <Text style={{fontSize:12, color:'#666'}} numberOfLines={1}>{item.startLocation} ➔ {item.endLocation}</Text>
                </View>
                <View style={[styles.statusBadge, {backgroundColor: item.status === 'Terminée' ? '#E8F5E9' : '#FFF3E0'}]}>
                   <Text style={{fontSize:10, color: item.status === 'Terminée' ? '#2E7D32' : '#EF6C00', fontWeight:'bold'}}>
                     {item.status || 'En attente'}
                   </Text>
                </View>
              </View>
            )}
          />
        );

      case 'docs':
        return (
          <FlatList 
            key="grid-2-col" // CORRECTION ICI : Clé unique
            data={patientDocs}
            keyExtractor={(item, idx) => idx.toString()}
            numColumns={2} // Grille 2 colonnes
            contentContainerStyle={{paddingBottom: 20}}
            ListEmptyComponent={<View style={{alignItems:'center', marginTop:30}}><Ionicons name="document-text-outline" size={40} color="#DDD"/><Text style={styles.emptyText}>Aucun document trouvé.</Text></View>}
            renderItem={({item}) => (
              <View style={styles.docCard}>
                 <Ionicons name={item.type === 'CarteVitale' ? 'card' : 'document-text'} size={30} color="#FF6B00" />
                 <Text style={styles.docTitle}>{item.type}</Text>
                 <Text style={styles.docDate}>{moment(item.uploadDate).format('DD/MM/YYYY')}</Text>
              </View>
            )}
          />
        );
    }
  };

  return (
    <View style={styles.container}>
      {/* HEADER RECHERCHE */}
      <View style={styles.searchHeader}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput style={styles.searchInput} placeholder="Chercher un patient..." value={search} onChangeText={handleSearch} />
        </View>
      </View>

      {/* LISTE PATIENTS */}
      {loading ? <ActivityIndicator size="large" color="#FF6B00" style={{marginTop: 50}} /> : (
        <FlatList
          data={filteredPatients}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 15 }}
          ListEmptyComponent={<Text style={styles.emptyText}>Aucun patient.</Text>}
        />
      )}

      {/* MODAL DÉTAILS COMPLET */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          
          {/* HEADER MODAL */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>{selectedPatient?.fullName}</Text>
              <Text style={styles.modalSubtitle}>{selectedPatient?.phone}</Text>
            </View>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {/* ONGLETS (TABS) */}
          <View style={styles.tabsContainer}>
            {['profil', 'history', 'docs'].map((tab) => (
              <TouchableOpacity 
                key={tab} 
                style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]} 
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                  {tab === 'profil' ? 'Profil' : tab === 'history' ? 'Historique' : 'Documents'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* CONTENU ONGLET */}
          <View style={styles.contentContainer}>
             {renderTabContent()}
          </View>

        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  searchHeader: { backgroundColor: '#FFF', padding: 15, paddingBottom: 10, borderBottomWidth:1, borderBottomColor:'#EEE' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 10, paddingHorizontal: 15, height: 45 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16 },

  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 15, marginBottom: 10, borderRadius: 12, marginHorizontal: 15, elevation: 1 },
  avatar: { width: 45, height: 45, borderRadius: 25, backgroundColor: '#FFF3E0', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  avatarText: { fontSize: 18, fontWeight: 'bold', color: '#FF6B00' },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  subInfo: { fontSize: 13, color: '#888', marginTop: 2 },
  
  // MODAL STYLES
  modalContainer: { flex: 1, backgroundColor: '#F2F2F2' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#FFF' },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  modalSubtitle: { fontSize: 14, color: '#666' },
  closeBtn: { padding: 5 },

  // TABS
  tabsContainer: { flexDirection: 'row', backgroundColor: '#FFF', paddingHorizontal: 20, paddingBottom: 10 },
  tabBtn: { marginRight: 25, paddingBottom: 10 },
  tabBtnActive: { borderBottomWidth: 3, borderBottomColor: '#FF6B00' },
  tabText: { fontSize: 15, color: '#999', fontWeight: '600' },
  tabTextActive: { color: '#FF6B00', fontWeight: 'bold' },

  contentContainer: { flex: 1, padding: 20 },
  tabContent: { flex: 1 },

  // FORMULAIRE PROFIL
  inputGroup: { marginBottom: 15 },
  label: { fontSize: 12, color: '#666', marginBottom: 5, fontWeight: 'bold', textTransform: 'uppercase' },
  input: { backgroundColor: '#FFF', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#DDD', fontSize: 16 },
  saveBtn: { backgroundColor: '#4CAF50', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  saveBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  deleteBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 30, padding: 15 },
  deleteText: { color: '#D32F2F', fontWeight: 'bold', marginLeft: 10 },

  // HISTORIQUE ITEMS
  historyCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 15, borderRadius: 10, marginBottom: 10 },
  historyDate: { alignItems: 'center', borderRightWidth: 1, borderRightColor: '#EEE', paddingRight: 15 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5 },

  // DOCUMENTS ITEMS
  docCard: { backgroundColor: '#FFF', flex: 0.5, margin: 5, padding: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  docTitle: { marginTop: 10, fontWeight: 'bold', color: '#333' },
  docDate: { fontSize: 11, color: '#999', marginTop: 2 },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 30 },
});