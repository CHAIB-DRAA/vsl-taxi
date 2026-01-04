import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import moment from 'moment';

const { width } = Dimensions.get('window');

export default function IncomingOfferToast({ onRideAccepted }) {
  const [offer, setOffer] = useState(null);
  const slideAnim = useRef(new Animated.Value(-200)).current; // Position cachée (haut)

  // Vérifier les offres toutes les 10 secondes
  useEffect(() => {
    const checkOffers = async () => {
      try {
        const res = await api.get('/dispatch/my-offers');
        if (res.data && res.data.length > 0) {
          // On prend la plus récente
          const newOffer = res.data[0];
          
          // Si c'est une nouvelle offre qu'on n'affiche pas déjà
          if (!offer || offer._id !== newOffer._id) {
            setOffer(newOffer);
            slideDown();
          }
        } else {
            // Si plus d'offre (ex: prise par qqn d'autre), on cache
            if(offer) slideUp();
        }
      } catch (e) {
        // console.log("Polling silencieux...");
      }
    };

    const interval = setInterval(checkOffers, 10000); // Check toutes les 10s
    checkOffers(); // Check immédiat

    return () => clearInterval(interval);
  }, [offer]);

  // Animations
  const slideDown = () => {
    Animated.spring(slideAnim, { toValue: 50, useNativeDriver: true }).start();
  };
  const slideUp = () => {
    Animated.timing(slideAnim, { toValue: -200, duration: 300, useNativeDriver: true }).start(() => setOffer(null));
  };

  // Actions
  const handleAccept = async () => {
    try {
      await api.post(`/dispatch/accept/${offer._id}`);
      Alert.alert("Bravo ! 🏁", "Course ajoutée à votre agenda.");
      slideUp();
      if (onRideAccepted) onRideAccepted(); // Rafraîchir l'agenda
    } catch (e) {
      Alert.alert("Oups", "Trop tard, course déjà prise !");
      slideUp();
    }
  };

  const handleRefuse = () => {
    // Juste masquer pour l'instant (ou appeler une API de refus)
    slideUp();
  };

  if (!offer) return null;

  const isGroupOffer = !!offer.targetGroupId;
  const groupName = isGroupOffer ? offer.targetGroupId.name : "";

  return (
    <Animated.View style={[styles.toastContainer, { transform: [{ translateY: slideAnim }] }]}>
      
      {/* En-tête : Qui envoie ? */}
      <View style={styles.header}>
        <View style={styles.badgeContainer}>
            <Ionicons name={isGroupOffer ? "people" : "person"} size={16} color="#FFF" />
            <Text style={styles.badgeText}>{isGroupOffer ? `GROUPE : ${groupName}` : "OFFRE PRIVÉE"}</Text>
        </View>
        <Text style={styles.sender}>De: {offer.senderId.fullName}</Text>
      </View>

      {/* Détails Course */}
      <View style={styles.content}>
        <Text style={styles.time}>📅 {moment(offer.rideId.date).format('DD/MM à HH:mm')}</Text>
        <Text style={styles.route} numberOfLines={1}>📍 {offer.rideId.startLocation}</Text>
        <Text style={styles.route} numberOfLines={1}>🏁 {offer.rideId.endLocation}</Text>
        <Text style={styles.type}>🚑 {offer.rideId.type}</Text>
      </View>

      {/* Boutons Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={[styles.btn, styles.refuseBtn]} onPress={handleRefuse}>
            <Ionicons name="close" size={20} color="#D32F2F" />
            <Text style={styles.refuseText}>REFUSER</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.btn, styles.acceptBtn]} onPress={handleAccept}>
            <Ionicons name="checkmark" size={20} color="#FFF" />
            <Text style={styles.acceptText}>ACCEPTER</Text>
        </TouchableOpacity>
      </View>

    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute', top: 0, left: 10, right: 10,
    backgroundColor: '#FFF', borderRadius: 16,
    shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 10, elevation: 10,
    zIndex: 9999, overflow: 'hidden'
  },
  header: {
    backgroundColor: '#333', padding: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'
  },
  badgeContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FF9800', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeText: { color: '#FFF', fontWeight: 'bold', fontSize: 10, marginLeft: 5 },
  sender: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
  
  content: { padding: 15 },
  time: { fontSize: 16, fontWeight: 'bold', color: '#6200EE', marginBottom: 5 },
  route: { fontSize: 13, color: '#333', marginBottom: 2 },
  type: { fontSize: 12, color: '#666', marginTop: 5, fontStyle: 'italic' },

  actions: { flexDirection: 'row', borderTopWidth: 1, borderColor: '#EEE' },
  btn: { flex: 1, padding: 15, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  refuseBtn: { backgroundColor: '#FFEBEE' },
  refuseText: { color: '#D32F2F', fontWeight: 'bold', marginLeft: 5 },
  acceptBtn: { backgroundColor: '#4CAF50' },
  acceptText: { color: '#FFF', fontWeight: 'bold', marginLeft: 5 }
});