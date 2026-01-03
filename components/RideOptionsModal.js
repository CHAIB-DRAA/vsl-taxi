import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import * as SMS from 'expo-sms';

export default function RideOptionsModal({ 
  visible, 
  onClose, 
  ride, 
  onCreateReturn, 
  onAddToCalendar, 
  onOpenDocs, 
  onShare, 
  onDelete,
  onDispatch // 👈 IMPORTANT : Vérifie que cette ligne est bien là !
}) {
  if (!ride) return null;

  // --- LOGIQUE SMS INTELLIGENT ---
  const handleSendReminder = async () => {
    if (!ride.patientPhone) {
      Alert.alert("Erreur", "Aucun numéro de téléphone enregistré pour ce patient.");
      return;
    }

    const isAvailable = await SMS.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert("Erreur", "L'envoi de SMS n'est pas disponible sur cet appareil.");
      return;
    }

    const dateStr = moment(ride.date).format('DD/MM');
    const timeStr = moment(ride.startTime || ride.date).format('HH:mm');
    const message = `Bonjour M/Mme ${ride.patientName}, c'est votre transport conventionné 🚑.\n\nJe vous confirme notre rendez-vous pour le ${dateStr} à ${timeStr}.\n\nDépart : ${ride.startLocation}.\n\nMerci de confirmer votre présence par retour de SMS. Cordialement.`;

    await SMS.sendSMSAsync([ride.patientPhone], message);
    onClose(); 
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <TouchableOpacity style={styles.modalOverlay} onPress={onClose} activeOpacity={1}>
        <View style={styles.optionSheet}>
          <View style={styles.sheetHandle} /> 
          <Text style={styles.sheetTitle}>Gérer la course</Text>
          
          <Text style={styles.patientName}>{ride.patientName}</Text>

          {/* 1. RAPPEL SMS */}
          <TouchableOpacity style={styles.sheetBtn} onPress={handleSendReminder}>
            <View style={[styles.iconBox, {backgroundColor: '#E8F5E9'}]}>
              <Ionicons name="chatbubble-ellipses" size={24} color="#2E7D32" />
            </View>
            <View>
                <Text style={styles.sheetBtnText}>Envoyer Rappel SMS</Text>
                <Text style={styles.sheetSubText}>Confirmer la présence (Anti-Lapin)</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* 👇 2. BOUTON DISPATCH (SOUS-TRAITANCE) 👇 */}
          <TouchableOpacity style={styles.sheetBtn} onPress={onDispatch}>
            <View style={[styles.iconBox, {backgroundColor: '#F3E5F5'}]}>
              <Ionicons name="git-network" size={24} color="#7B1FA2" />
            </View>
            <View>
                <Text style={styles.sheetBtnText}>Sous-traiter (Dispatch)</Text>
                <Text style={styles.sheetSubText}>Envoyer à un collègue / Groupe</Text>
            </View>
          </TouchableOpacity>
          {/* 👆 C'est ce bouton qui posait problème s'il n'était pas relié */}

          <View style={styles.divider} />

          {/* 3. CRÉER RETOUR */}
          <TouchableOpacity style={styles.sheetBtn} onPress={onCreateReturn}>
            <View style={[styles.iconBox, {backgroundColor: '#FFF3E0'}]}>
              <Ionicons name="swap-horizontal" size={24} color="#EF6C00" />
            </View>
            <Text style={styles.sheetBtnText}>Créer le Retour</Text>
          </TouchableOpacity>

          {/* 4. GOOGLE AGENDA */}
          <TouchableOpacity style={styles.sheetBtn} onPress={onAddToCalendar}>
            <View style={[styles.iconBox, {backgroundColor: '#E3F2FD'}]}>
              <Ionicons name="calendar" size={24} color="#1565C0" />
            </View>
            <Text style={styles.sheetBtnText}>Ajouter à Google Agenda</Text>
          </TouchableOpacity>

          {/* 5. DOCUMENTS */}
          <TouchableOpacity style={styles.sheetBtn} onPress={onOpenDocs}>
            <View style={[styles.iconBox, {backgroundColor: '#E3F2FD'}]}>
              <Ionicons name="folder-open" size={24} color="#1976D2" />
            </View>
            <Text style={styles.sheetBtnText}>Dossier / BT / PMT</Text>
          </TouchableOpacity>
          
          {/* 6. PARTAGER */}
          <TouchableOpacity style={styles.sheetBtn} onPress={onShare}>
            <View style={[styles.iconBox, {backgroundColor: '#FAFAFA'}]}>
              <Ionicons name="share-social" size={24} color="#333" />
            </View>
            <Text style={styles.sheetBtnText}>Partager à un collègue</Text>
          </TouchableOpacity>
          
          {/* 7. SUPPRIMER */}
          <TouchableOpacity style={styles.sheetBtn} onPress={onDelete}>
            <View style={[styles.iconBox, {backgroundColor: '#FFEBEE'}]}>
              <Ionicons name="trash" size={24} color="#D32F2F" /></View>
            <Text style={[styles.sheetBtnText, { color: '#D32F2F' }]}>Supprimer</Text>
          </TouchableOpacity>

        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  optionSheet: { backgroundColor: '#FFF', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 25, paddingBottom: 40 },
  sheetHandle: { width: 40, height: 4, backgroundColor: '#DDD', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetTitle: { textAlign: 'center', fontWeight: 'bold', fontSize: 18, color: '#999', marginBottom: 5 },
  patientName: { textAlign: 'center', fontWeight: 'bold', fontSize: 20, color: '#333', marginBottom: 25 },
  
  sheetBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  sheetBtnText: { fontSize: 17, fontWeight: '500', color: '#333' },
  sheetSubText: { fontSize: 12, color: '#666', marginTop: 2 },
  
  iconBox: { width: 44, height: 44, borderRadius: 22, justifyContent:'center', alignItems:'center', marginRight: 15 },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 10 }
});