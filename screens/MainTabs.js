import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// 👇 ON IMPORTE LE CONTEXTE POUR LE BADGE DE NOTIFICATION
import { useData } from '../contexts/DataContext';

import HomeScreen from './HomeTabs';
import AgendaScreen from './AgendaScreen';
import CreateRideScreen from './CreateRideScreen';
import HistoryScreen from './HistoryScreen';

const Tab = createBottomTabNavigator();

export default function MainTabs({ navigation }) {
  // 👇 On récupère l'info s'il y a une invitation en attente
  const { pendingInvitation } = useData();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarStyle: {
          backgroundColor: '#FFF', 
          borderTopWidth: 0, 
          elevation: 10, // Ombre Android
          shadowOpacity: 0.1, // Ombre iOS
          shadowRadius: 10,
          height: 60, 
          paddingBottom: 10,
          paddingTop: 5
        },
        tabBarActiveTintColor: '#FF6B00',
        tabBarInactiveTintColor: '#999',
        tabBarLabelStyle: { fontWeight: '600', fontSize: 10 },
        
        tabBarIcon: ({ color, size, focused }) => {
          let iconName;

          if (route.name === 'Accueil') {
            iconName = focused ? 'home' : 'home-outline';
          } 
          else if (route.name === 'Agenda') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } 
          else if (route.name === 'Créer') {
            iconName = focused ? 'add-circle' : 'add-circle-outline';
            // Icône centrale plus grande
            return <Ionicons name={iconName} size={32} color={color} style={{ marginTop: -5 }} />;
          } 
          else if (route.name === 'Historique') {
            iconName = focused ? 'file-tray-full' : 'file-tray-full-outline';
          }

          return (
            <View>
              <Ionicons name={iconName} size={24} color={color} />
              
              {/* 🔥 LE BADGE ROUGE SI INVITATION DANS L'AGENDA 🔥 */}
              {route.name === 'Agenda' && pendingInvitation && (
                <View style={styles.badge} />
              )}
            </View>
          );
        },
        // Bouton réglages en haut à droite
        headerRight: () => (
          <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={{ marginRight: 20 }}>
            <Ionicons name="settings-outline" size={24} color="#333" />
          </TouchableOpacity>
        ),
      })}
    >
      <Tab.Screen name="Accueil" component={HomeScreen} options={{ headerShown: false }} />
      <Tab.Screen name="Agenda" component={AgendaScreen} options={{ title: 'Mon Planning' }} />
      <Tab.Screen name="Créer" component={CreateRideScreen} options={{ title: 'Nouvelle Course' }} />
      <Tab.Screen name="Historique" component={HistoryScreen} options={{ title: 'Comptabilité' }} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    right: -2,
    top: -2,
    backgroundColor: '#D32F2F',
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#FFF'
  }
});