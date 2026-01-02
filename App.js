import 'react-native-url-polyfill/auto';
import React, { useState, useEffect, useCallback } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context'; 

import * as SecureStore from 'expo-secure-store';
import { ActivityIndicator, View } from 'react-native';
import { DataProvider } from './contexts/DataContext';
import GlobalInvitationModal from './components/GlobalInvitationModal';

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

// --- IMPORTS DES ÉCRANS ---
import SignInScreen from './screens/SigninScreen';
import SignUpScreen from './screens/SignupScreen';
import SettingsScreen from './screens/SettingsScreen';
import MainTabs from './screens/MainTabs'; // Contient HomeScreen
import ContactScreen from './screens/ContactScreen';
import DocumentsScreen from './screens/DocumentsScreen';

// 👇 AJOUT DES ÉCRANS MANQUANTS (Indispensable pour la navigation)
import HistoryScreen from './screens/HistoryScreen';
import PatientsScreen from './screens/PatientsScreen';
import ProfileScreen from './screens/ProfileScreen';
import AddRideScreen from './screens/CreateRideScreen'; 
import FacturationScreen from './screens/FacturationScreen';
// Import de l'API
import api, { getRides } from './services/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const Stack = createNativeStackNavigator();
const SESSION_KEY = 'user_session';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [todayRidesCount, setTodayRidesCount] = useState(0);

  // --- NOTIFICATIONS ---
  const registerForPushNotificationsAsync = async () => {
    let token;
    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') return;
      
      token = (await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      })).data;
    }
    return token;
  };

  const sendTokenToBackend = async (token) => {
    try {
      await api.put('/auth/push-token', { pushToken: token });
    } catch (e) {
      console.log("Erreur token notif");
    }
  };

  // 1. Session
  useEffect(() => {
    const loadSession = async () => {
      try {
        const savedSession = await SecureStore.getItemAsync(SESSION_KEY);
        if (savedSession) setSession(JSON.parse(savedSession));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadSession();
  }, []);

  // 2. Notifs
  useEffect(() => {
    if (session) {
      registerForPushNotificationsAsync().then(token => {
        if (token) sendTokenToBackend(token);
      });
    }
  }, [session]);

  // 3. Login
  const handleLogin = async (data) => {
    try {
      await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(data));
      setSession(data);
    } catch (e) { console.error(e); }
  };

  // 4. Logout
  const handleLogout = async () => {
    try {
      await SecureStore.deleteItemAsync(SESSION_KEY);
      setSession(null);
      setTodayRidesCount(0);
    } catch (error) { console.error(error); }
  };

  // 5. Courses du jour
  const fetchTodayRidesCount = useCallback(async () => {
    if (!session?.token || !session?.user?.id) return;
    try {
      const data = await getRides();
      const todayString = new Date().toDateString();
      const todayRides = data.filter(ride => {
        const rideDate = new Date(ride.date).toDateString();
        const isMyRide = ride.chauffeurId === session.user.id;
        const isVisible = !ride.isShared || (ride.statusPartage !== 'refused');
        return rideDate === todayString && isMyRide && isVisible;
      });
      setTodayRidesCount(todayRides.length);
    } catch (err) {}
  }, [session]);

  useEffect(() => {
    if (session) {
      fetchTodayRidesCount();
      const interval = setInterval(fetchTodayRidesCount, 60000); 
      return () => clearInterval(interval);
    }
  }, [session, fetchTodayRidesCount]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F8F8' }}>
        <ActivityIndicator size="large" color="#FF6B00" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <DataProvider>
          <NavigationContainer>
            <Stack.Navigator>
              {!session ? (
                // --- ÉCRANS NON CONNECTÉS ---
                <Stack.Group screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="SignIn">
                    {props => <SignInScreen {...props} onSignIn={handleLogin} />}
                  </Stack.Screen>
                  <Stack.Screen name="SignUp">
                    {props => <SignUpScreen {...props} onSignUp={handleLogin} />}
                  </Stack.Screen>
                </Stack.Group>
              ) : (
                // --- ÉCRANS CONNECTÉS ---
                <Stack.Group>
                  {/* Écran principal avec les onglets en bas */}
                  <Stack.Screen name="Main" options={{ headerShown: false }}>
                    {props => (
                      <MainTabs
                        {...props}
                        todayRidesCount={todayRidesCount}
                        fetchTodayRidesCount={fetchTodayRidesCount}
                      />
                    )}
                  </Stack.Screen>
                  
                  {/* 👇 ENREGISTREMENT DES ÉCRANS MANQUANTS 👇 */}
                  
                  <Stack.Screen 
                    name="History" 
                    component={HistoryScreen} 
                    options={{ title: 'Historique', headerTintColor: '#FF6B00' }} 
                  />

                  <Stack.Screen 
                    name="Patients" 
                    component={PatientsScreen} 
                    options={{ title: 'Mes Patients', headerTintColor: '#FF6B00' }} 
                  />

                  <Stack.Screen 
                    name="AddRide" 
                    component={AddRideScreen} 
                    options={{ title: 'Nouvelle Course', headerTintColor: '#FF6B00' }} 
                  />

                  <Stack.Screen 
                    name="Profile" 
                    component={ProfileScreen} 
                    options={{ headerShown: false }} 
                  />

                  {/* 👆 FIN DES AJOUTS 👆 */}

                  <Stack.Screen
                    name="Settings"
                    options={{ headerShown: false }} 
                  >
                    {props => <SettingsScreen {...props} onLogout={handleLogout} />}
                  </Stack.Screen>

                  <Stack.Screen 
                    name="Contact" 
                    component={ContactScreen} 
                    options={{ 
                      title: 'Mes Collègues',
                      headerTintColor: '#FF6B00',
                      headerBackTitleVisible: false
                    }} 
                  />

                  <Stack.Screen 
                    name="Documents" 
                    component={DocumentsScreen} 
                    options={{ title: 'Mes Documents', headerTintColor: '#FF6B00' }} 
                  />


<Stack.Screen name="Facturation" component={FacturationScreen} options={{ title: 'Facturation Auto' }} />
                </Stack.Group>
              )}
            </Stack.Navigator>
          </NavigationContainer>
          
          <GlobalInvitationModal />
        </DataProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}