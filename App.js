import 'react-native-url-polyfill/auto';
import React, { useState, useEffect, useCallback } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as SecureStore from 'expo-secure-store';
import { ActivityIndicator, View, Alert } from 'react-native';
import { DataProvider } from './contexts/DataContext'; // <--- IMPORT
import GlobalInvitationModal from './components/GlobalInvitationModal'; // Import de la Modal
// --- IMPORTS NOTIFICATIONS ---
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

// Import des écrans
import SignInScreen from './screens/SigninScreen';
import SignUpScreen from './screens/SignupScreen';
import SettingsScreen from './screens/SettingsScreen';
import MainTabs from './screens/MainTabs';
import ContactScreen from './screens/ContactScreen'; // <--- AJOUTE CECI

// Import de l'API
import api, { getRides } from './services/api';

// Configurer le comportement des notifs quand l'app est ouverte
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

  // --- LOGIQUE NOTIFICATIONS ---
  const registerForPushNotificationsAsync = async () => {
    let token;
    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        // Alert.alert('Erreur', 'Pas de permission pour les notifications !');
        return;
      }
      
      // Récupérer le token (ID unique du téléphone)
      token = (await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      })).data;
      
    } else {
      console.log('Les notifs ne marchent pas sur émulateur');
    }
    return token;
  };

  const sendTokenToBackend = async (token) => {
    try {
      await api.put('/auth/push-token', { pushToken: token });
      console.log("✅ Token notif envoyé au serveur");
    } catch (e) {
      console.log("Erreur envoi token (peut-être pas encore connecté)");
    }
  };

  // 1. Charger la session au démarrage
  useEffect(() => {
    const loadSession = async () => {
      try {
        const savedSession = await SecureStore.getItemAsync(SESSION_KEY);
        if (savedSession) {
          setSession(JSON.parse(savedSession));
        }
      } catch (e) {
        console.error("Erreur chargement session", e);
      } finally {
        setLoading(false);
      }
    };
    loadSession();
  }, []);

  // 2. Gestion des Notifications après connexion
  useEffect(() => {
    if (session) {
      // Dès qu'on a une session active, on enregistre le téléphone
      registerForPushNotificationsAsync().then(token => {
        if (token) sendTokenToBackend(token);
      });
    }
  }, [session]);

  // 3. Fonction de Login
  const handleLogin = async (data) => {
    try {
      await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(data));
      setSession(data);
    } catch (e) {
      console.error("Erreur sauvegarde session", e);
    }
  };

  // 4. Fonction de Logout
  const handleLogout = async () => {
    try {
      await SecureStore.deleteItemAsync(SESSION_KEY);
      setSession(null);
      setTodayRidesCount(0);
      console.log("✅ Déconnexion réussie");
    } catch (error) {
      console.error("❌ Erreur déconnexion", error);
    }
  };

  // 5. Calcul des courses du jour
  const fetchTodayRidesCount = useCallback(async () => {
    if (!session?.token || !session?.user?.id) return;
    try {
      const data = await getRides();
      const todayString = new Date().toDateString();
      
      const todayRides = data.filter(ride => {
        const rideDate = new Date(ride.date).toDateString();
        // Le backend filtre déjà par chauffeurId, mais on vérifie au cas où
        const isMyRide = ride.chauffeurId === session.user.id;
        // On affiche si pas partagée OU si partagée et pas encore refusée/supprimée
        const isVisible = !ride.isShared || (ride.statusPartage !== 'refused');
        return rideDate === todayString && isMyRide && isVisible;
      });

      setTodayRidesCount(todayRides.length);
    } catch (err) {
      console.error('Erreur fetchTodayRidesCount:', err.message);
    }
  }, [session]);

  // Rafraîchissement automatique
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
      <DataProvider>
      <NavigationContainer>
        <Stack.Navigator>
          {!session ? (
            // --- NON CONNECTÉ ---
            <Stack.Group screenOptions={{ headerShown: false }}>
              <Stack.Screen name="SignIn">
                {props => <SignInScreen {...props} onSignIn={handleLogin} />}
              </Stack.Screen>
              <Stack.Screen name="SignUp">
                {props => <SignUpScreen {...props} onSignUp={handleLogin} />}
              </Stack.Screen>
            </Stack.Group>
          ) : (
            // --- CONNECTÉ ---
            <Stack.Group>
              <Stack.Screen name="Main" options={{ headerShown: false }}>
                {props => (
                  <MainTabs
                    {...props}
                    todayRidesCount={todayRidesCount}
                    fetchTodayRidesCount={fetchTodayRidesCount}
                  />
                )}
              </Stack.Screen>
              
              <Stack.Screen
                name="Settings"
                options={{
                  title: 'Paramètres',
                  headerStyle: { backgroundColor: '#fff' },
                  headerTintColor: '#FF6B00',
                }}
              >
                {props => <SettingsScreen {...props} onLogout={handleLogout} />}
              </Stack.Screen>
              <Stack.Screen 
    name="Contact" 
    component={ContactScreen} 
    options={{ 
      title: 'Mes Collègues',
      headerTintColor: '#FF6B00', // Couleur de la flèche retour
      headerBackTitleVisible: false
    }} 
  />
            </Stack.Group>
          )}
        </Stack.Navigator>
      </NavigationContainer>
      <GlobalInvitationModal />

      </DataProvider>
    </GestureHandlerRootView>
  );
}