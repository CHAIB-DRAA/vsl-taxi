// --- Polyfills et Librairies ---
import 'react-native-url-polyfill/auto';
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';

// --- Navigation ---
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// --- Services / API / Auth ---
import { supabase } from './lib/supabase';
import { getRides, setToken } from './services/api';

// --- Composants internes ---
import Auth from './components/Auth';
import CreateRideScreen from './screens/CreateRideScreen';
import HistoryScreen from './screens/HistoryScreen';
import AgendaScreen from './screens/AgendaScreen';
import TodayRidesScreen from './screens/TodayRidesScreen';
import SettingsScreen from './screens/SettingsScreen';
import SignupScreen from './screens/SignupScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabs({ session, todayRidesCount, fetchTodayRidesCount, navigation }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          const icons = {
            'Créer': 'add-circle-outline',
            'Agenda': 'calendar-outline',
            'Historique': 'list-outline',
            'Aujourd’hui': 'today-outline',
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
        name="Aujourd’hui"
        component={TodayRidesScreen}
        options={{ tabBarBadge: todayRidesCount || null }}
        listeners={{ focus: fetchTodayRidesCount }}
      />
      <Tab.Screen name="Agenda" component={AgendaScreen} />
      <Tab.Screen name="Historique" component={HistoryScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [todayRidesCount, setTodayRidesCount] = useState(0);

  const fetchTodayRidesCount = useCallback(async () => {
    if (!session) return;
    try {
      const data = await getRides();
      const today = new Date();
      const todayRides = data.filter(
        ride => new Date(ride.date).toDateString() === today.toDateString() && !ride.startTime
      );
      setTodayRidesCount(todayRides.length);
    } catch (err) {
      console.error('Erreur lors du chargement des courses du jour :', err);
    }
  }, [session]);

  useEffect(() => {
    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (session?.access_token) setToken(session.access_token);
    };
    initSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.access_token) {
        setToken(session.access_token);
        fetchTodayRidesCount();
      } else {
        setTodayRidesCount(0);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [fetchTodayRidesCount]);

  if (!session || !session.user) return <SignupScreen />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen
            name="Main"
            options={{ headerShown: false }}
          >
            {props => (
              <MainTabs
                {...props}
                session={session}
                todayRidesCount={todayRidesCount}
                fetchTodayRidesCount={fetchTodayRidesCount}
              />
            )}
          </Stack.Screen>
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{ title: 'Paramètres' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
} 