// --- Polyfills et Librairies ---
import 'react-native-url-polyfill/auto';
import React, { useState, useEffect, useCallback } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

// --- Services / Auth ---
import { supabase } from './lib/supabase';
import { getRides, setToken } from './services/api';

// --- Screens ---
import SignInScreen from './screens/SignInScreen';
import SignUpScreen from './screens/SignUpScreen';
import CreateRideScreen from './screens/CreateRideScreen';
import TodayRidesScreen from './screens/TodayRidesScreen';
import AgendaScreen from './screens/AgendaScreen';
import HistoryScreen from './screens/HistoryScreen';
import SettingsScreen from './screens/SettingsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// --- MainTabs ---
function MainTabs({ todayRidesCount, fetchTodayRidesCount, navigation }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          const icons = {
            Créer: 'add-circle-outline',
            Aujourd_hui: 'today-outline',
            Agenda: 'calendar-outline',
            Historique: 'list-outline',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007bff',
        tabBarInactiveTintColor: 'gray',
        headerRight: () => (
          <Ionicons
            name="person-circle-outline"
            size={30}
            color="#007bff"
            style={{ marginRight: 15 }}
            onPress={() => navigation.navigate('Settings')}
          />
        ),
      })}
    >
      <Tab.Screen name="Créer" component={CreateRideScreen} />
      <Tab.Screen
        name="Aujourd_hui"
        component={TodayRidesScreen}
        options={{ tabBarBadge: todayRidesCount || null }}
        listeners={{ focus: fetchTodayRidesCount }}
      />
      <Tab.Screen name="Agenda" component={AgendaScreen} />
      <Tab.Screen name="Historique" component={HistoryScreen} />
    </Tab.Navigator>
  );
}

// --- App principal ---
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

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!session ? (
            <>
              <Stack.Screen name="SignIn" component={SignInScreen} />
              <Stack.Screen name="SignUp" component={SignUpScreen} />
            </>
          ) : (
            <>
              <Stack.Screen name="Main">
                {props => (
                  <MainTabs
                    {...props}
                    todayRidesCount={todayRidesCount}
                    fetchTodayRidesCount={fetchTodayRidesCount}
                  />
                )}
              </Stack.Screen>
              <Stack.Screen name="Settings" component={SettingsScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
