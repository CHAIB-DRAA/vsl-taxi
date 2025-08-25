// screens/MainTabs.js
import React, { useEffect, useState } from 'react';
import { TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useIsFocused } from '@react-navigation/native';

// Screens internes
import CreateRideScreen from './CreateRideScreen';
import AgendaScreen from './AgendaScreen';
import HistoryScreen from './HistoryScreen';
import TodayRidesScreen from './TodayRidesScreen';
import SettingsScreen from './SettingsScreen';

const Tab = createBottomTabNavigator();
const API_URL = 'https://vsl-taxi.onrender.com/api/rides';

export default function MainTabs({ navigation, todayRidesCount }) {
  const [pendingSharedCount, setPendingSharedCount] = useState(0);
  const isFocused = useIsFocused();

  const fetchPendingShared = async () => {
    console.info('refresh'); // console.info du polling
    try {
      const res = await axios.get(API_URL);
      const rides = res.data || [];
      console.log('Nombre total de courses:', rides.length);

      const pending = rides.filter(
        r => r.isShared && r.statusPartage === 'pending'
      );
      console.log('Courses pending partagées:', pending.length);

      setPendingSharedCount(pending.length);
    } catch (err) {
      console.error('Erreur fetchPendingShared:', err.message);
    }
  };

  useEffect(() => {
    if (!isFocused) return;

    console.log('MainTabs focus détecté, fetchPendingShared exécuté');
    fetchPendingShared();

    const interval = setInterval(() => {
      console.log('Polling toutes les 5 secondes');
      fetchPendingShared();
    }, 5000);

    return () => {
      console.log('MainTabs blur ou unmount, arrêt du polling');
      clearInterval(interval);
    };
  }, [isFocused]);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          const icons = {
            Créer: 'add-circle-outline',
            Agenda: 'calendar-outline',
            Historique: 'list-outline',
            AujourdHui: 'today-outline',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007bff',
        tabBarInactiveTintColor: 'gray',
        headerRight: () => (
          <TouchableOpacity
            onPress={() => navigation.navigate('Settings')}
            style={{ marginRight: 15 }}
          >
            <Ionicons name="person-circle-outline" size={30} color="#007bff" />
          </TouchableOpacity>
        ),
      })}
    >
      <Tab.Screen name="Créer" component={CreateRideScreen} />
      <Tab.Screen
        name="AujourdHui"
        component={TodayRidesScreen}
        options={{ tabBarBadge: todayRidesCount || null }}
      />
      <Tab.Screen name="Agenda" component={AgendaScreen} />
      <Tab.Screen
        name="Historique"
        component={HistoryScreen}
        options={{ tabBarBadge: pendingSharedCount || null }}
      />
    </Tab.Navigator>
  );
}
