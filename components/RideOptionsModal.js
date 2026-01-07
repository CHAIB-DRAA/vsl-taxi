import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import 'moment/locale/fr';

const { width } = Dimensions.get('window');

export default function RideOptionsModal({ 
  visible, 
  onClose, 
  ride, 
  onEdit,           // 👈 NOUVEAU : La fonction pour modifier
  onCreateReturn, 
  onAddToCalendar, 
  onOpenDocs, 
  onShare, 
  onDelete,
  onDispatch 
}) {
  
  if (!ride) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.modalContent}>
          
          {/* HEADER DU MODAL */}
          <View style={styles.header}>
            <View>
                <Text style={styles.patientName}>{ride.patientName}</Text>
                <Text style={styles.rideInfo}>
                    {moment(ride.date).format('HH:mm')} • {ride.startLocation?.split(',')[0]} ➔ {ride.endLocation?.split(',')[0]}
                </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* LISTE DES OPTIONS */}
          <View style={styles.optionsGrid}>

            {/* 👇 BOUTON MODIFIER (NOUVEAU) */}
            <TouchableOpacity style={styles.optionRow} onPress={onEdit}>
                <View style={[styles.iconContainer, { backgroundColor: '#FFF3E0' }]}>
                    <Ionicons name="create-outline" size={24} color="#FF9800" />
                </View>
                <Text style={styles.optionText}>Modifier</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionRow} onPress={onCreateReturn}>
                <View style={[styles.iconContainer, { backgroundColor: '#E3F2FD' }]}>
                    <Ionicons name="swap-horizontal-outline" size={24} color="#2196F3" />
                </View>
                <Text style={styles.optionText}>Créer Retour</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionRow} onPress={onDispatch}>
                <View style={[styles.iconContainer, { backgroundColor: '#E8F5E9' }]}>
                    <Ionicons name="paper-plane-outline" size={24} color="#4CAF50" />
                </View>
                <Text style={styles.optionText}>Envoyer</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionRow} onPress={onShare}>
                <View style={[styles.iconContainer, { backgroundColor: '#F3E5F5' }]}>
                    <Ionicons name="share-social-outline" size={24} color="#9C27B0" />
                </View>
                <Text style={styles.optionText}>Partager</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionRow} onPress={onOpenDocs}>
                <View style={[styles.iconContainer, { backgroundColor: '#E0F2F1' }]}>
                    <Ionicons name="folder-open-outline" size={24} color="#009688" />
                </View>
                <Text style={styles.optionText}>Dossier</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionRow} onPress={onAddToCalendar}>
                <View style={[styles.iconContainer, { backgroundColor: '#FFF8E1' }]}>
                    <Ionicons name="calendar-outline" size={24} color="#FFC107" />
                </View>
                <Text style={styles.optionText}>Agenda</Text>
            </TouchableOpacity>
            
            <View style={styles.divider} />

            <TouchableOpacity style={styles.optionRow} onPress={onDelete}>
                <View style={[styles.iconContainer, { backgroundColor: '#FFEBEE' }]}>
                    <Ionicons name="trash-outline" size={24} color="#D32F2F" />
                </View>
                <Text style={[styles.optionText, { color: '#D32F2F' }]}>Supprimer</Text>
            </TouchableOpacity>

          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 20, paddingBottom: 40 },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25, borderBottomWidth: 1, borderColor: '#F0F0F0', paddingBottom: 15 },
  patientName: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  rideInfo: { fontSize: 14, color: '#666', marginTop: 4 },
  closeBtn: { padding: 5, backgroundColor: '#F5F5F5', borderRadius: 20 },

  optionsGrid: { flexDirection: 'column' },
  optionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  iconContainer: { width: 45, height: 45, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  optionText: { fontSize: 16, fontWeight: '600', color: '#333' },
  
  divider: { height: 1, backgroundColor: '#EEE', marginVertical: 10 }
});