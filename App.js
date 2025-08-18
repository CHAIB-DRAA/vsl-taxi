import 'react-native-url-polyfill/auto';
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Button } from 'react-native';
import { supabase } from './lib/supabase';
import Auth from './components/Auth';

import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import CreateRideScreen from './screens/CreateRideScreen';
import HistoryScreen from './screens/HistoryScreen';
import AgendaScreen from './screens/AgendaScreen';
import TodayRidesScreen from './screens/TodayRidesScreen';
import { getRides } from './services/api';

const Tab = createBottomTabNavigator();

export default function App() {
  const [session, setSession] = useState(null);
  const [todayRidesCount, setTodayRidesCount] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);

  // Fonction pour récupérer le nombre de courses du jour
  const fetchTodayRidesCount = async () => {
    if (!session) return; // pas connecté
    try {
      const data = await getRides();
      const today = new Date();
      const todayRides = data.filter(
        (ride) =>
          new Date(ride.date).toDateString() === today.toDateString() &&
          !ride.startTime
      );
      setTodayRidesCount(todayRides.length);
    } catch (err) {
      console.error(err);
    }
  };

  // Gestion session Supabase + écoute des changements
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
    };
    init();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      // Met à jour le badge automatiquement quand l'utilisateur se connecte/déconnecte
      if (session) fetchTodayRidesCount();
      else setTodayRidesCount(0);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  if (!session || !session.user) {
    return <Auth />;
  }

  // Déconnexion
  const signOut = async () => {
    await supabase.auth.signOut();
    setModalVisible(false);
    setSession(null);
    setTodayRidesCount(0);
  };

  // Header right icône profil
  const screenOptions = ({ route }) => ({
    tabBarIcon: ({ color, size }) => {
      let iconName;
      if (route.name === 'Créer') iconName = 'add-circle-outline';
      else if (route.name === 'Agenda') iconName = 'calendar-outline';
      else if (route.name === 'Historique') iconName = 'list-outline';
      else if (route.name === 'Aujourd’hui') iconName = 'today-outline';
      return <Ionicons name={iconName} size={size} color={color} />;
    },
    tabBarActiveTintColor: '#007bff',
    tabBarInactiveTintColor: 'gray',
    headerRight: () => (
      <TouchableOpacity onPress={() => setModalVisible(true)} style={{ marginRight: 15 }}>
        <Ionicons name="person-circle-outline" size={30} color="#007bff" />
      </TouchableOpacity>
    ),
  });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <Tab.Navigator screenOptions={screenOptions}>
          <Tab.Screen name="Créer" component={CreateRideScreen} />
          <Tab.Screen
            name="Aujourd’hui"
            component={TodayRidesScreen}
            options={{ tabBarBadge: todayRidesCount ? todayRidesCount : null }}
            listeners={{ focus: () => fetchTodayRidesCount() }}
          />
          <Tab.Screen name="Agenda" component={AgendaScreen} />
          <Tab.Screen name="Historique" component={HistoryScreen} />
        </Tab.Navigator>
      </NavigationContainer>

      {/* Modal profil */}
      <Modal transparent={true} visible={modalVisible} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 10 }}>
              Détails Utilisateur
            </Text>
            <Text>Email : {session.user.email}</Text>
            <Text>ID : {session.user.id}</Text>

            <View style={{ marginTop: 20 }}>
              <Button title="Déconnexion" color="#FF3B30" onPress={signOut} />
            </View>
            <View style={{ marginTop: 10 }}>
              <Button title="Fermer" onPress={() => setModalVisible(false)} />
            </View>
          </View>
        </View>
      </Modal>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    alignItems: 'stretch',
  },
});
