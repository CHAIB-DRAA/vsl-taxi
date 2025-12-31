import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import 'moment/locale/fr';

const typeColors = {
  Aller: '#4CAF50',
  Retour: '#1976D2',
  Consultation: '#FF9800',
  Ambulance: '#D32F2F',
  VSL: '#1976D2',
  Autre: '#607D8B',
};

export default function RideCard({ ride, onPress, onRespond, onStatusChange }) {
  const isFinished = !!ride.endTime;
  const isStarted = !!ride.startTime && !ride.endTime;
  const isIncomingShare = ride.isShared && ride.statusPartage === 'pending';
  const hasNote = ride.isShared && ride.shareNote && ride.shareNote.length > 0;
  
  // Fonction GPS
  const openGPS = (address) => {
    if (!address) return;
    const encoded = encodeURIComponent(address);
    Linking.openURL(`https://waze.com/ul?q=${encoded}&navigate=yes`);
  };

  // Fonction Appeler
  const callPatient = () => {
    if (!ride.patientPhone) {
      Alert.alert("Info", "Aucun numéro enregistré pour ce patient.");
      return;
    }
    Linking.openURL(`tel:${ride.patientPhone}`);
  };

  return (
    <TouchableOpacity 
      activeOpacity={0.9}
      onPress={() => !isFinished && onPress && onPress(ride)}
      disabled={isIncomingShare}
      style={[
        styles.card, 
        isFinished && styles.cardFinished,
        isIncomingShare && styles.cardIncoming,
        isStarted && styles.cardActive 
      ]}
    >
      {/* 1. HEADER */}
      <View style={styles.header}>
        <View style={styles.timeContainer}>
          <Ionicons name="time-outline" size={16} color="#333" />
          <Text style={styles.timeText}>
            {ride.startTime 
              ? moment(ride.startTime).format('HH:mm') 
              : moment(ride.date).format('HH:mm')}
          </Text>
        </View>

        <View style={[styles.badge, { backgroundColor: typeColors[ride.type] || typeColors.Autre }]}>
          <Text style={styles.badgeText}>{ride.type}</Text>
        </View>
      </View>

      {/* 2. INFO PARTAGE */}
      {ride.isShared && (
        <View style={{marginBottom: 10}}>
          <View style={styles.sharedBadge}>
            <Ionicons name="arrow-undo" size={12} color="#EF6C00" />
            <Text style={styles.sharedText}>Reçu de {ride.sharedByName || "un collègue"}</Text>
          </View>
          {hasNote && (
            <View style={styles.noteContainer}>
              <Ionicons name="warning" size={18} color="#D84315" style={{marginTop: 2}} />
              <View style={{marginLeft: 10, flex: 1}}>
                <Text style={styles.noteLabel}>NOTE :</Text>
                <Text style={styles.noteText}>"{ride.shareNote}"</Text>
              </View>
            </View>
          )}
        </View>
      )}

      {/* 3. PATIENT & BOUTON APPEL */}
      <View style={styles.patientRow}>
        <Text style={styles.patientName} numberOfLines={1}>{ride.patientName}</Text>
        
        {/* MODIFICATION ICI : J'ai enlevé la condition pour que tu puisses voir le bouton */}
        {/* Le bouton s'affiche toujours, mais s'il n'y a pas de numéro, il est gris */}
        <TouchableOpacity 
          style={[styles.callBtn, !ride.patientPhone && { backgroundColor: '#CCC' }]} 
          onPress={callPatient}
        >
          <Ionicons name="call" size={16} color="#FFF" />
          <Text style={styles.callBtnText}>
            {ride.patientPhone ? "Appeler" : "Pas de n°"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 4. ITINÉRAIRE */}
      <View style={styles.routeContainer}>
        <TouchableOpacity style={styles.addressRow} onPress={() => openGPS(ride.startLocation)}>
          <Ionicons name="navigate-circle" size={18} color={isFinished ? "#999" : "#4CAF50"} />
          <Text style={styles.addressText} numberOfLines={1}>{ride.startLocation}</Text>
        </TouchableOpacity>
        <View style={styles.routeLine} />
        <TouchableOpacity style={styles.addressRow} onPress={() => openGPS(ride.endLocation)}>
          <Ionicons name="flag" size={18} color={isFinished ? "#999" : "#FF6B00"} />
          <Text style={styles.addressText} numberOfLines={1}>{ride.endLocation}</Text>
        </TouchableOpacity>
      </View>

      {/* 5. ACTIONS */}
      {!isIncomingShare && !isFinished && onStatusChange && (
        <View style={styles.actionZone}>
          {!isStarted ? (
            <TouchableOpacity style={[styles.statusBtn, styles.btnStart]} onPress={() => onStatusChange(ride, 'start')}>
              <Ionicons name="play" size={20} color="#FFF" />
              <Text style={styles.statusBtnText}>DÉMARRER</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.statusBtn, styles.btnFinish]} onPress={() => onStatusChange(ride, 'finish')}>
              <Ionicons name="stop" size={20} color="#FFF" />
              <Text style={styles.statusBtnText}>TERMINER</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* 6. RÉPONSE PARTAGE */}
      {isIncomingShare && (
        <View style={styles.footer}>
           <Text style={styles.shareLabel}>Demande reçue :</Text>
           <TouchableOpacity style={[styles.btn, styles.btnAccept]} onPress={() => onRespond(ride._id, 'accepted')}>
             <Text style={styles.btnText}>Accepter</Text>
           </TouchableOpacity>
           <TouchableOpacity style={[styles.btn, styles.btnDecline]} onPress={() => onRespond(ride._id, 'refused')}>
             <Text style={styles.btnText}>Refuser</Text>
           </TouchableOpacity>
        </View>
      )}
      
      {/* 7. INFO FIN */}
      {!isIncomingShare && (ride.isShared || isFinished) && (
         <View style={styles.footerInfo}>
            {isFinished && <Text style={{color:'#888', fontStyle:'italic', fontSize:12}}>Terminée à {moment(ride.endTime).format('HH:mm')}</Text>}
         </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 15, marginBottom: 12, elevation: 3, borderLeftWidth: 4, borderLeftColor: '#DDD' },
  cardFinished: { backgroundColor: '#F2F2F2', opacity: 0.6 },
  cardActive: { borderLeftColor: '#4CAF50', backgroundColor: '#F1F8E9', borderWidth: 1, borderColor: '#C8E6C9' },
  cardIncoming: { borderLeftColor: '#FF9800', backgroundColor: '#FFF8E1' },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  timeContainer: { flexDirection: 'row', alignItems: 'center' },
  timeText: { fontSize: 20, fontWeight: 'bold', marginLeft: 5 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
  
  sharedBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF3E0', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginBottom: 5 },
  sharedText: { color: '#EF6C00', fontSize: 11, fontWeight: 'bold', marginLeft: 4 },
  noteContainer: { flexDirection: 'row', backgroundColor: '#FFCCBC', padding: 8, borderRadius: 8, marginTop: 5, borderLeftWidth: 3, borderLeftColor: '#D84315' },
  noteLabel: { fontSize: 10, color: '#BF360C', fontWeight: 'bold' },
  noteText: { fontSize: 13, color: '#3E2723', fontStyle: 'italic', marginTop: 2 },

  patientRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  patientName: { fontSize: 18, fontWeight: 'bold', flex: 1 },
  
  // STYLE APPEL
  callBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#009688', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, marginLeft: 10 },
  callBtnText: { color: '#FFF', fontSize: 12, fontWeight: 'bold', marginLeft: 5 },
  
  routeContainer: { marginBottom: 15 },
  addressRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  addressText: { marginLeft: 10, color: '#555', fontSize: 15, flex: 1 },
  routeLine: { width: 1, height: 12, backgroundColor: '#DDD', marginLeft: 9, marginVertical: 2 },
  
  actionZone: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#EEE' },
  statusBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 12, borderRadius: 10 },
  btnStart: { backgroundColor: '#4CAF50' },
  btnFinish: { backgroundColor: '#333' },
  statusBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 14, marginLeft: 8, letterSpacing: 1 },
  
  footer: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10, alignItems: 'center' },
  shareLabel: { marginRight: 10, color: '#555', fontStyle:'italic' },
  btn: { padding: 8, borderRadius: 8, marginLeft: 8 },
  btnAccept: { backgroundColor: '#4CAF50' },
  btnDecline: { backgroundColor: '#F44336' },
  btnText: { color: '#FFF', fontWeight: 'bold' },
  footerInfo: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 5 }
});