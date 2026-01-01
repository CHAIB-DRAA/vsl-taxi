import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, 
  Alert, Modal, TextInput, ActivityIndicator, Platform, KeyboardAvoidingView 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker'; // Pour changer la photo de profil

// 👇 Si tu as une API pour update le user
// import { updateUser } from '../services/api'; 

export default function ProfileScreen({ navigation }) {
  // Données simulées (À remplacer par les données de ton Context ou API)
  const [user, setUser] = useState({
    fullName: 'Amine Driver',
    email: 'amine@taxi-vsl.com',
    phone: '06 12 34 56 78',
    avatar: null, // null = image par défaut
    rating: 4.8,
    totalRides: 142,
    licenseNumber: 'TAXI-75-12345'
  });

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editedData, setEditedData] = useState({ ...user });
  const [loading, setLoading] = useState(false);

  // --- 1. CHANGER PHOTO DE PROFIL ---
  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert("Permission requise", "Besoin d'accéder à vos photos !");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      setUser({ ...user, avatar: result.assets[0].uri });
      // TODO: Envoyer l'image au backend ici
    }
  };

  // --- 2. SAUVEGARDER MODIFICATIONS ---
  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      // Simulation appel API
      setTimeout(() => {
        setUser({ ...user, fullName: editedData.fullName, phone: editedData.phone });
        setEditModalVisible(false);
        setLoading(false);
        Alert.alert("Succès", "Profil mis à jour !");
      }, 1000);
      
      // Vrai code API :
      // await updateUser(editedData);
    } catch (err) {
      Alert.alert("Erreur", "Impossible de mettre à jour.");
      setLoading(false);
    }
  };

  // --- 3. MENU ITEMS ---
  const MenuOption = ({ icon, title, subtitle, onPress, color = "#333" }) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={[styles.iconBox, { backgroundColor: '#F5F5F5' }]}>
        <Ionicons name={icon} size={22} color="#FF6B00" />
      </View>
      <View style={{ flex: 1, marginLeft: 15 }}>
        <Text style={[styles.menuTitle, { color }]}>{title}</Text>
        {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={20} color="#CCC" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        
        {/* HEADER PROFILE */}
        <View style={styles.header}>
          <TouchableOpacity onPress={pickImage} style={styles.avatarContainer}>
            {user.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.placeholderAvatar]}>
                <Text style={styles.avatarText}>{user.fullName.charAt(0)}</Text>
              </View>
            )}
            <View style={styles.cameraIcon}>
              <Ionicons name="camera" size={14} color="#FFF" />
            </View>
          </TouchableOpacity>

          <Text style={styles.name}>{user.fullName}</Text>
          <Text style={styles.role}>Chauffeur Taxi / VSL</Text>
          
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={16} color="#FFD700" />
            <Text style={styles.rating}>{user.rating} (Excellent)</Text>
          </View>

          <TouchableOpacity style={styles.editBtn} onPress={() => { setEditedData(user); setEditModalVisible(true); }}>
            <Text style={styles.editBtnText}>Modifier mes infos</Text>
          </TouchableOpacity>
        </View>

        {/* STATS RAPIDES */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user.totalRides}</Text>
            <Text style={styles.statLabel}>Courses</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>1240 €</Text>
            <Text style={styles.statLabel}>Revenus (Mois)</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>560 km</Text>
            <Text style={styles.statLabel}>Distance</Text>
          </View>
        </View>

        {/* SECTION INFOS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mes Coordonnées</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="mail-outline" size={20} color="#666" />
              <Text style={styles.infoText}>{user.email}</Text>
            </View>
            <View style={styles.separator} />
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={20} color="#666" />
              <Text style={styles.infoText}>{user.phone}</Text>
            </View>
            <View style={styles.separator} />
            <View style={styles.infoRow}>
              <Ionicons name="card-outline" size={20} color="#666" />
              <Text style={styles.infoText}>Licence: {user.licenseNumber}</Text>
            </View>
          </View>
        </View>

        {/* SECTION GESTION DU COMPTE */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gestion du Compte</Text>
          
          <MenuOption 
            icon="document-text-outline" 
            title="Mes Documents" 
            subtitle="Permis, Assurance, K-bis..."
            onPress={() => Alert.alert("Documents", "Page de gestion des documents à venir.")}
          />
          <MenuOption 
            icon="lock-closed-outline" 
            title="Sécurité & Mot de passe" 
            onPress={() => Alert.alert("Sécurité", "Changement de mot de passe.")}
          />
          <MenuOption 
            icon="notifications-outline" 
            title="Notifications" 
            onPress={() => Alert.alert("Réglages", "Gestion des préférences push.")}
          />
           <MenuOption 
            icon="help-buoy-outline" 
            title="Aide & Support" 
            onPress={() => Alert.alert("Support", "Contacter le support technique.")}
          />
        </View>

      </ScrollView>

      {/* MODAL EDIT */}
      <Modal visible={editModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Modifier Profil</Text>
            
            <Text style={styles.label}>Nom Complet</Text>
            <TextInput 
              style={styles.input} 
              value={editedData.fullName} 
              onChangeText={t => setEditedData({...editedData, fullName: t})} 
            />

            <Text style={styles.label}>Téléphone</Text>
            <TextInput 
              style={styles.input} 
              value={editedData.phone} 
              keyboardType="phone-pad"
              onChangeText={t => setEditedData({...editedData, phone: t})} 
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditModalVisible(false)}>
                <Text style={styles.cancelText}>Annuler</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProfile} disabled={loading}>
                {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Enregistrer</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  
  // HEADER
  header: { alignItems: 'center', paddingVertical: 30, backgroundColor: '#FFF', borderBottomLeftRadius: 30, borderBottomRightRadius: 30, shadowColor: "#000", shadowOffset: {width:0, height:5}, shadowOpacity:0.05, shadowRadius:10, elevation: 5 },
  avatarContainer: { position: 'relative', marginBottom: 15 },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  placeholderAvatar: { backgroundColor: '#FFE0B2', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 40, color: '#FF6B00', fontWeight: 'bold' },
  cameraIcon: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#FF6B00', width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
  
  name: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  role: { fontSize: 14, color: '#999', marginTop: 2 },
  ratingContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 8, backgroundColor: '#FFF8E1', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  rating: { marginLeft: 5, color: '#FBC02D', fontWeight: 'bold', fontSize: 13 },
  editBtn: { marginTop: 15, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#FF6B00' },
  editBtnText: { color: '#FF6B00', fontWeight: '600', fontSize: 13 },

  // STATS
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', margin: 20, backgroundColor: '#FFF', padding: 20, borderRadius: 15, elevation: 2 },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  statLabel: { fontSize: 12, color: '#999', marginTop: 2 },
  divider: { width: 1, backgroundColor: '#EEE', height: '80%' },

  // SECTIONS
  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  infoCard: { backgroundColor: '#FFF', borderRadius: 15, padding: 15, elevation: 1 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  infoText: { marginLeft: 15, fontSize: 16, color: '#444' },
  separator: { height: 1, backgroundColor: '#F0F0F0', marginLeft: 35 },

  // MENU ITEM
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 15, borderRadius: 15, marginBottom: 10, elevation: 1 },
  iconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  menuTitle: { fontSize: 16, fontWeight: '600' },
  menuSubtitle: { fontSize: 12, color: '#999', marginTop: 2 },

  // MODAL
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 25 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  label: { fontSize: 14, fontWeight: 'bold', color: '#666', marginBottom: 5, marginTop: 10 },
  input: { backgroundColor: '#F5F5F5', borderRadius: 10, padding: 15, fontSize: 16, borderWidth: 1, borderColor: '#EEE' },
  modalActions: { flexDirection: 'row', marginTop: 30, justifyContent: 'space-between' },
  cancelBtn: { flex: 1, padding: 15, alignItems: 'center', marginRight: 10, borderRadius: 12, backgroundColor: '#F5F5F5' },
  saveBtn: { flex: 1, padding: 15, alignItems: 'center', marginLeft: 10, borderRadius: 12, backgroundColor: '#FF6B00' },
  cancelText: { fontWeight: 'bold', color: '#666' },
  saveBtnText: { fontWeight: 'bold', color: '#FFF' },
});