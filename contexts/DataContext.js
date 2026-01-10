import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { getRides, getContacts, respondToShare } from '../services/api'; 
import { Alert } from 'react-native';

const DataContext = createContext();

export const DataProvider = ({ children }) => {
  const [allRides, setAllRides] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pendingInvitation, setPendingInvitation] = useState(null);

  // 1. CHARGEMENT DES DONNÉES (Version Robuste)
  const loadData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      
      console.log("🔄 Sync Global...");

      // 👇 ICI LA CORRECTION : On utilise allSettled pour ne pas tout bloquer en cas d'erreur
      const results = await Promise.allSettled([
        getRides(),     // Index 0
        getContacts()   // Index 1
      ]);

      // --- TRAITEMENT DES COURSES (Index 0) ---
      if (results[0].status === 'fulfilled') {
        const rides = results[0].value || [];
        setAllRides(rides);

        // Détection d'invitation (Uniquement si on a réussi à charger les courses)
        const invitation = rides.find(r => 
          r.isShared && (r.statusPartage === 'pending' || r.shareStatus === 'pending')
        );
        setPendingInvitation(invitation || null);
      } else {
        console.warn("⚠️ Erreur chargement Rides:", results[0].reason);
      }

      // --- TRAITEMENT DES CONTACTS (Index 1) ---
      if (results[1].status === 'fulfilled') {
        setContacts(results[1].value || []);
      } else {
        // C'est souvent lui qui échoue (404), mais maintenant ça ne bloquera plus les courses !
        console.warn("⚠️ Erreur chargement Contacts:", results[1].reason);
      }

    } catch (err) {
      console.error("🔥 Erreur Critique Sync:", err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  // 2. LE TIMER GLOBAL (Toutes les 15s - un peu plus lent pour soulager le serveur)
  useEffect(() => {
    loadData(false); 
    const interval = setInterval(() => {
      loadData(true); 
    }, 15000); // 15 secondes
    return () => clearInterval(interval);
  }, [loadData]);

  // 3. FONCTION DE RÉPONSE GLOBALE
  const handleGlobalRespond = async (rideId, action) => {
    try {
      setLoading(true);
      await respondToShare(rideId, action);
      setPendingInvitation(null); 
      
      const msg = action === 'accepted' ? "Course acceptée !" : "Invitation refusée.";
      setTimeout(() => {
        Alert.alert("Info", msg);
        loadData(true); 
      }, 300);
    } catch (err) {
      console.error("Erreur réponse:", err);
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