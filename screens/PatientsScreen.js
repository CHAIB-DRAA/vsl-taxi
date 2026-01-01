import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput, 
  ActivityIndicator, Alert, Modal, ScrollView, Image 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import 'moment/locale/fr';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

// Contexte & API
import { useData } from '../contexts/DataContext';
import api, { getPatients, updatePatient, deletePatient, getRides } from '../services/api';

export default function PatientsScreen() {
  const { contacts } = useData(); 

  // --- ÉTATS ---
  const [patients, setPatients] = useState([]);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  // Modals
  const [modalVisible, setModalVisible] = useState(false); // Fiche Patient
  const [shareModalVisible, setShareModalVisible] = useState(false); // Choix Contact
  const [docSelectionModal, setDocSelectionModal] = useState(false); // Choix Docs

  // Sélection pour partage
  const [selectedDocIds, setSelectedDocIds] = useState([]);
  const [shareTarget, setShareTarget] = useState(null); // 'export' ou 'colleague'
  const [targetContact, setTargetContact] = useState(null);

  // Détails Patient
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [activeTab, setActiveTab] = useState('profil');
  const [patientRides, setPatientRides] = useState([]);
  const [patientDocs, setPatientDocs] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Visionneuse
  const [viewerVisible, setViewerVisible] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);

  // Formulaire Edition
  const [formData, setFormData] = useState({ fullName: '', address: '', phone: '' });

  // 1. CHARGEMENT LISTE PRINCIPALE
  const loadPatients = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getPatients();
      const sorted = data.sort((a, b) => a.fullName.localeCompare(b.fullName));
      setPatients(sorted);
      setFilteredPatients(sorted);
    } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadPatients(); }, [loadPatients]);

  // 2. RECHERCHE
  const handleSearch = (text) => {
    setSearch(text);
    if (text) {
      const filtered = patients.filter(p => p.fullName.toLowerCase().includes(text.toLowerCase()));
      setFilteredPatients(filtered);
    } else { setFilteredPatients(patients); }
  };

  // 3. OUVERTURE FICHE & CHARGEMENT DONNÉES
  const openPatientModal = (patient) => {
    setSelectedPatient(patient);
    setFormData({ fullName: patient.fullName, address: patient.address || '', phone: patient.phone || '' });
    setActiveTab('profil');
    setModalVisible(true);
    fetchPatientDetails(patient);
  };

  const fetchPatientDetails = async (patient) => {
    try {
      setLoadingDetails(true);
      
      // A. Historique des courses
      const allRides = await getRides();
      const myRides = allRides.filter(r => r.patientName === patient.fullName);
      myRides.sort((a, b) => new Date(b.date) - new Date(a.date));
      setPatientRides(myRides);

      // B. Documents (Nouvelle méthode via route dédiée)
      // On essaye la route globale, sinon fallback sur les courses
      let allDocs = [];
      try {
         const res = await api.get(`/documents/patient/${patient._id}`);
         allDocs = res.data;
      } catch (e) {
         // Fallback si la route n'existe pas encore
         const docsPromises = myRides.map(r => api.get(`/documents/by-ride/${r._id}`).catch(() => ({ data: [] })));
         const docsResults = await Promise.all(docsPromises);
         allDocs = docsResults.flatMap(res => res.data);
      }

      // Tri et Nettoyage
      allDocs.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
      
      const finalDocs = [];
      const typesVus = {}; 

      allDocs.forEach(doc => {
        if (doc.type === 'PMT') {
          finalDocs.push(doc); // On garde tous les PMT
        } else {
          if (!typesVus[doc.type]) {
            finalDocs.push(doc); // On garde le plus récent des Vitale/Mutuelle
            typesVus[doc.type] = true;
          }
        }
      });
      setPatientDocs(finalDocs);

    } catch (err) { console.log("Erreur détails", err); } 
    finally { setLoadingDetails(false); }
  };

  // --- LOGIQUE PARTAGE ---

  const initiateShareProcess = (mode, contact = null) => {
    setShareTarget(mode);
    setTargetContact(contact);
    
    // Pré-cocher Vitale/Mutuelle, Décocher PMT
    const preSelected = patientDocs
      .filter(d => d.type !== 'PMT')
      .map(d => d._id);
    
    setSelectedDocIds(preSelected);
    setDocSelectionModal(true);
    setShareModalVisible(false);
  };

  const toggleDocSelection = (id) => {
    if (selectedDocIds.includes(id)) {
      setSelectedDocIds(prev => prev.filter(docId => docId !== id));
    } else {
      setSelectedDocIds(prev => [...prev, id]);
    }
  };

  // --- ACTIONS DE TRANSFERT ---

  // OPTION 1 : TRANSFERT APP À APP (API)
  const handleInternalShare = async () => {
    if (!targetContact) return;
    setDocSelectionModal(false);
    setLoading(true); // Petit loading global pour montrer que ça bosse

    try {
      // Appel API Backend
      await api.post('/share/transfert-patient', { 
        patientId: selectedPatient._id,
        targetUserId: targetContact.contactId._id,
        docIds: selectedDocIds // (Optionnel si tu veux filtrer côté back, mais souvent on partage tout l'accès)
      });
      
      Alert.alert(
        "Envoyé !", 
        `Le dossier de ${selectedPatient.fullName} est maintenant accessible sur le téléphone de ${targetContact.contactId.fullName}.`
      );
    } catch (err) { 
      console.error(err);
      Alert.alert("Erreur", "Le transfert a échoué. Vérifiez votre connexion."); 
    } finally {
      setLoading(false);
    }
  };

  // OPTION 2 : WHATSAPP / PDF
  const handleSystemShare = async () => {
    setDocSelectionModal(false);
    try {
        const docsToInclude = patientDocs.filter(doc => selectedDocIds.includes(doc._id));
        
        let imagesHtml = '';
        if (docsToInclude.length > 0) {
            docsToInclude.forEach(doc => {
                imagesHtml += `
                    <div style="margin-bottom: 20px; page-break-inside: avoid;">
                    <p><strong>${doc.type}</strong> (${moment(doc.uploadDate).format('DD/MM/YYYY')})</p>
                    <img src="${doc.imageData}" style="width: 100%; max-height: 600px; object-fit: contain; border: 1px solid #eee;" />
                    </div>
                `;
            });
        } else {
            imagesHtml = `<p>Aucun document sélectionné.</p>`;
        }

        const html = `
          <html>
            <body style="font-family: Helvetica; padding: 40px;">
              <h1 style="color: #FF6B00;">Fiche Patient</h1>
              <h2>${selectedPatient.fullName}</h2>
              <p>Tél: ${selectedPatient.phone || '--'} | Adresse: ${selectedPatient.address || '--'}</p>
              <hr/>
              <h3>Documents</h3>
              ${imagesHtml}
            </body>
          </html>
        `;

        const { uri } = await Print.printToFileAsync({ html });
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });

    } catch (err) { Alert.alert("Erreur", "Génération PDF impossible"); }
  };

  // --- UPDATE & DELETE ---
  const handleSave = async () => {
    try {
      await updatePatient(selectedPatient._id, formData);
      setModalVisible(false);
      Alert.alert("Succès", "Fiche mise à jour");
      loadPatients();
    } catch (err) { Alert.alert("Erreur", "Mise à jour impossible"); }
  };

  const handleDelete = () => {
    Alert.alert("Attention", "Supprimer ce patient ?", [
      { text: "Annuler", style: "cancel" },
      { text: "Supprimer", style: "destructive", onPress: async () => {
          try { await deletePatient(selectedPatient._id); setModalVisible(false); loadPatients(); } 
          catch (err) { Alert.alert("Erreur", "Impossible de supprimer"); }
        } 
      }
    ]);
  };

  // --- RENDUS ---
  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => openPatientModal(item)}>
      <View style={styles.avatar}><Text style={styles.avatarText}>{item.fullName.charAt(0).toUpperCase()}</Text></View>
      <View style={styles.info}><Text style={styles.name}>{item.fullName}</Text><Text style={styles.subInfo}>{item.phone || "Non renseigné"}</Text></View>
      <Ionicons name="chevron-forward" size={20} color="#CCC" />
    </TouchableOpacity>
  );

  const renderContactItem = ({ item }) => (
    <TouchableOpacity style={styles.contactRow} onPress={() => initiateShareProcess('colleague', item)}>
       <View style={styles.contactAvatar}><Text style={styles.contactAvatarText}>{item.contactId?.fullName?.charAt(0)}</Text></View>
       <Text style={styles.contactName}>{item.contactId?.fullName}</Text>
       <Ionicons name="send" size={20} color="#FF6B00" />
    </TouchableOpacity>
  );

  const renderDocSelectionItem = ({ item }) => {
    const isSelected = selectedDocIds.includes(item._id);
    return (
      <TouchableOpacity style={[styles.selectDocRow, isSelected && styles.selectDocRowActive]} onPress={() => toggleDocSelection(item._id)}>
         <Ionicons name={isSelected ? "checkbox" : "square-outline"} size={24} color={isSelected ? "#FF6B00" : "#CCC"} />
         <View style={{marginLeft: 15, flex:1}}>
            <Text style={[styles.selectDocTitle, isSelected && {fontWeight:'bold'}]}>{item.type}</Text>
            <Text style={styles.selectDocDate}>{moment(item.uploadDate).format('DD/MM/YYYY')}</Text>
         </View>
      </TouchableOpacity>
    );
  };

  const renderTabContent = () => {
    if (loadingDetails) return <ActivityIndicator color="#FF6B00" style={{marginTop: 50}} />;

    switch (activeTab) {
      case 'profil':
        return (
          <ScrollView style={styles.tabContent}>
             <View style={styles.inputGroup}><Text style={styles.label}>Nom Complet</Text><TextInput style={styles.input} value={formData.fullName} onChangeText={t => setFormData({...formData, fullName: t})} /></View>
             <View style={styles.inputGroup}><Text style={styles.label}>Téléphone</Text><TextInput style={styles.input} value={formData.phone} keyboardType="phone-pad" onChangeText={t => setFormData({...formData, phone: t})} /></View>
             <View style={styles.inputGroup}><Text style={styles.label}>Adresse</Text><TextInput style={styles.input} value={formData.address} multiline onChangeText={t => setFormData({...formData, address: t})} /></View>
             <TouchableOpacity style={styles.saveBtn} onPress={handleSave}><Text style={styles.saveBtnText}>Enregistrer</Text></TouchableOpacity>
             
             <Text style={styles.sectionHeader}>PARTAGE</Text>
             <TouchableOpacity style={styles.shareBtnColl} onPress={() => setShareModalVisible(true)}>
                <Ionicons name="people" size={20} color="#FFF" style={{marginRight: 10}} />
                <Text style={styles.saveBtnText}>Envoyer à un collègue</Text>
             </TouchableOpacity>
             <TouchableOpacity style={styles.shareBtnPDF} onPress={() => initiateShareProcess('export')}>
                <Ionicons name="document-text" size={20} color="#FF6B00" style={{marginRight: 10}} />
                <Text style={{color:'#FF6B00', fontWeight:'bold'}}>Exporter en PDF</Text>
             </TouchableOpacity>
             <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}><Text style={styles.deleteText}>Supprimer le dossier</Text></TouchableOpacity>
          </ScrollView>
        );

      case 'docs':
        return (
          <FlatList 
            key="docs-grid" data={patientDocs} keyExtractor={(item, idx) => idx.toString()} numColumns={2} contentContainerStyle={{paddingBottom: 20}}
            ListEmptyComponent={<Text style={styles.emptyText}>Aucun document.</Text>}
            renderItem={({item}) => (
              <TouchableOpacity style={styles.docCard} onPress={() => { setSelectedDoc(item); setViewerVisible(true); }}>
                 <Ionicons name={item.type === 'PMT' ? 'document-text' : 'card'} size={32} color={item.type === 'PMT' ? '#5C6BC0' : '#4CAF50'} />
                 <Text style={styles.docTitle}>{item.type}</Text>
                 <Text style={styles.docDate}>{moment(item.uploadDate).format('DD/MM/YY')}</Text>
              </TouchableOpacity>
            )}
          />
        );
      case 'history':
        return (
            <FlatList data={patientRides} keyExtractor={item => item._id} renderItem={({item}) => (
                <View style={styles.historyCard}>
                    <Text style={{fontWeight:'bold', width: 40}}>{moment(item.date).format('DD/MM')}</Text>
                    <View style={{flex:1, marginLeft:10}}><Text style={{fontWeight:'bold', color:'#333'}}>{item.type}</Text><Text style={{fontSize:12, color:'#666'}} numberOfLines={1}>{item.startLocation}</Text></View>
                    <Ionicons name={item.status === 'Terminée' ? "checkmark-circle" : "time"} size={18} color={item.status === 'Terminée' ? "#4CAF50" : "#FF9800"} />
                </View>
            )} />
        );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchHeader}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput style={styles.searchInput} placeholder="Chercher un patient..." value={search} onChangeText={handleSearch} />
        </View>
      </View>

      {loading ? <ActivityIndicator size="large" color="#FF6B00" style={{marginTop: 50}} /> : (
        <FlatList data={filteredPatients} keyExtractor={item => item._id} renderItem={renderItem} contentContainerStyle={{ padding: 15 }} ListEmptyComponent={<Text style={styles.emptyText}>Aucun patient trouvé.</Text>} />
      )}

      {/* MODAL PRINCIPALE */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{selectedPatient?.fullName}</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}><Ionicons name="close" size={28} color="#333" /></TouchableOpacity>
          </View>
          <View style={styles.tabsContainer}>
            {['profil', 'docs', 'history'].map((tab) => (
              <TouchableOpacity key={tab} style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]} onPress={() => setActiveTab(tab)}>
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab === 'profil' ? 'Profil' : tab === 'docs' ? 'Documents' : 'Historique'}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.contentContainer}>{renderTabContent()}</View>
        </View>
      </Modal>

      {/* MODAL COLLÈGUE */}
      <Modal visible={shareModalVisible} animationType="slide" presentationStyle="formSheet">
        <View style={styles.modalContainer}>
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>Destinataire</Text><TouchableOpacity onPress={() => setShareModalVisible(false)}><Ionicons name="close" size={28} color="#333" /></TouchableOpacity></View>
            <FlatList data={contacts} keyExtractor={item => item._id} renderItem={renderContactItem} contentContainerStyle={{padding: 20}} />
        </View>
      </Modal>

      {/* MODAL SÉLECTION DOCS + CHOIX METHODE */}
      <Modal visible={docSelectionModal} animationType="slide" presentationStyle="formSheet">
        <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Documents à joindre</Text>
                <TouchableOpacity onPress={() => setDocSelectionModal(false)}><Ionicons name="close" size={28} color="#333" /></TouchableOpacity>
            </View>
            <View style={{padding:15, backgroundColor:'#FFF3E0'}}><Text style={{color:'#E65100', fontSize:12}}>Sélectionnez les documents.</Text></View>
            <FlatList data={patientDocs} keyExtractor={item => item._id} renderItem={renderDocSelectionItem} contentContainerStyle={{padding:20}} />
            
            <View style={styles.actionFooter}>
                {shareTarget === 'colleague' ? (
                    <View style={{flexDirection:'row', gap:10}}>
                        <TouchableOpacity style={[styles.actionBtn, {backgroundColor:'#2196F3', flex:1}]} onPress={handleInternalShare}>
                            <Ionicons name="cloud-upload" size={20} color="#FFF" style={{marginRight:5}}/>
                            <Text style={styles.actionBtnText}>Transfert App</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionBtn, {backgroundColor:'#4CAF50', flex:1}]} onPress={handleSystemShare}>
                            <Ionicons name="logo-whatsapp" size={20} color="#FFF" style={{marginRight:5}}/>
                            <Text style={styles.actionBtnText}>WhatsApp</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <TouchableOpacity style={[styles.actionBtn, {backgroundColor:'#FF6B00'}]} onPress={handleSystemShare}>
                        <Text style={styles.actionBtnText}>Générer PDF</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
      </Modal>

      <Modal visible={viewerVisible} transparent={true} animationType="fade">
        <View style={styles.viewerOverlay}>
            <TouchableOpacity style={styles.viewerClose} onPress={() => setViewerVisible(false)}><Ionicons name="close-circle" size={40} color="#FFF" /></TouchableOpacity>
            {selectedDoc && <Image source={{ uri: selectedDoc.imageData }} style={styles.fullImage} resizeMode="contain" />}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  searchHeader: { backgroundColor: '#FFF', padding: 15, borderBottomWidth:1, borderBottomColor:'#EEE' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 10, paddingHorizontal: 15, height: 45 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16 },
  
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 15, marginBottom: 10, borderRadius: 12, marginHorizontal: 15, elevation: 1 },
  avatar: { width: 45, height: 45, borderRadius: 25, backgroundColor: '#FFF3E0', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  avatarText: { fontSize: 18, fontWeight: 'bold', color: '#FF6B00' },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  subInfo: { fontSize: 13, color: '#888' },
  
  modalContainer: { flex: 1, backgroundColor: '#F2F2F2' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#FFF' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  
  tabsContainer: { flexDirection: 'row', backgroundColor: '#FFF', paddingHorizontal: 20 },
  tabBtn: { marginRight: 25, paddingBottom: 15 },
  tabBtnActive: { borderBottomWidth: 3, borderBottomColor: '#FF6B00' },
  tabText: { fontSize: 15, color: '#999', fontWeight: '600' },
  tabTextActive: { color: '#FF6B00', fontWeight: 'bold' },
  contentContainer: { flex: 1, padding: 20 },
  tabContent: { flex: 1 },

  inputGroup: { marginBottom: 15 },
  label: { fontSize: 12, color: '#666', marginBottom: 5, fontWeight: 'bold' },
  input: { backgroundColor: '#FFF', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#DDD', fontSize: 16 },
  saveBtn: { backgroundColor: '#4CAF50', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  sectionHeader: { marginTop: 25, marginBottom: 5, fontSize: 12, fontWeight:'bold', color:'#555', letterSpacing:1 },
  shareBtnColl: { backgroundColor: '#FF6B00', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 5, flexDirection:'row', justifyContent:'center' },
  shareBtnPDF: { backgroundColor: '#FFF', borderWidth:1, borderColor:'#FF6B00', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10, flexDirection:'row', justifyContent:'center' },
  saveBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  deleteBtn: { alignItems: 'center', marginTop: 30, padding: 15 },
  deleteText: { color: '#D32F2F', fontWeight: 'bold' },

  contactRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 15, borderRadius: 12, marginBottom: 10 },
  contactAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E3F2FD', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  contactAvatarText: { color: '#1976D2', fontWeight: 'bold', fontSize: 18 },
  contactName: { fontSize: 16, fontWeight: '600', color: '#333', flex: 1 },

  docCard: { backgroundColor: '#FFF', flex: 0.5, margin: 6, padding: 15, borderRadius: 12, alignItems: 'center', justifyContent: 'center', elevation: 2, minHeight: 110 },
  docTitle: { marginTop: 8, fontWeight: '700', color: '#333', fontSize: 13, textAlign:'center' },
  docDate: { fontSize: 10, color: '#999', marginTop: 2 },
  
  historyCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 15, borderRadius: 10, marginBottom: 10 },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 30 },

  selectDocRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 15, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: '#EEE' },
  selectDocRowActive: { borderColor: '#FF6B00', backgroundColor: '#FFF3E0' },
  selectDocTitle: { fontSize: 15, color: '#666' },
  selectDocDate: { fontSize: 12, color: '#999' },
  
  actionFooter: { padding: 20, borderTopWidth: 1, borderColor: '#EEE', backgroundColor: '#FFF' },
  actionBtn: { padding: 15, borderRadius: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  actionBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },

  viewerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  fullImage: { width: '100%', height: '80%' },
  viewerClose: { position: 'absolute', top: 50, right: 20, zIndex: 10 },
});