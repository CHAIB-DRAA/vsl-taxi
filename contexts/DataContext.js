import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { getRides, getContacts, respondToShare } from '../services/api'; 
import { Alert } from 'react-native';

const DataContext = createContext();

export const DataProvider = ({ children }) => {
  const [allRides, setAllRides] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pendingInvitation, setPendingInvitation] = useState(null);

  // 1. CHARGEMENT DES DONNÉES (Fonction partagée)
  const loadData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      
      const [ridesData, contactsData] = await Promise.all([getRides(), getContacts()]);
      
      setAllRides(ridesData || []);
      setContacts(contactsData || []);

      // DÉTECTION GLOBALE D'INVITATION
      const invitation = (ridesData || []).find(r => r.isShared && (r.statusPartage === 'pending' || r.shareStatus === 'pending'));
      setPendingInvitation(invitation || null);

    } catch (err) {
      console.error("Erreur Sync Global:", err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  // 2. LE TIMER GLOBAL (Toutes les 10s)
  useEffect(() => {
    loadData(false); // Premier chargement
    const interval = setInterval(() => {
      console.log("♻️ Polling Global...");
      loadData(true); 
    }, 10000);
    return () => clearInterval(interval);
  }, [loadData]);

  // 3. FONCTION DE RÉPONSE GLOBALE
  const handleGlobalRespond = async (rideId, action) => {
    try {
      setLoading(true);
      await respondToShare(rideId, action);
      setPendingInvitation(null); // On ferme la popup immédiatement
      
      const msg = action === 'accepted' ? "Course acceptée !" : "Invitation refusée.";
      setTimeout(() => {
        Alert.alert("Info", msg);
        loadData(true); // On rafraîchit tout
      }, 300);
    } catch (err) {
      Alert.alert("Erreur", "Impossible de répondre.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DataContext.Provider value={{ 
      allRides, contacts, loading, loadData, 
      pendingInvitation, handleGlobalRespond 
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => useContext(DataContext);