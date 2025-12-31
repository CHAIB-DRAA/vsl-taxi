import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';

import HomeScreen from './HomeTabs';
import AgendaScreen from './AgendaScreen';
import CreateRideScreen from './CreateRideScreen';
import HistoryScreen from './HistoryScreen'; // <--- NOUVEAU

const Tab = createBottomTabNavigator();

export default function MainTabs({ navigation }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarStyle: {
          backgroundColor: '#FFF', borderTopWidth: 0, elevation: 10,
          shadowOpacity: 0.1, height: 60, paddingBottom: 10,
        },
        tabBarActiveTintColor: '#FF6B00',
        tabBarInactiveTintColor: '#999',
        tabBarLabelStyle: { fontWeight: '600', fontSize: 10 },
        
        tabBarIcon: ({ color, size, focused }) => {
          let iconName;

          if (route.name === 'Accueil') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Agenda') iconName = focused ? 'calendar' : 'calendar-outline';
          else if (route.name === 'Créer') {
            iconName = focused ? 'add-circle' : 'add-circle-outline';
            return <Ionicons name={iconName} size={32} color={color} style={{ marginTop: -5 }} />;
          } 
          else if (route.name === 'Historique') iconName = focused ? 'file-tray-full' : 'file-tray-full-outline'; // Icône dossier

          return <Ionicons name={iconName} size={24} color={color} />;
        },
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
      
      {/* L'Onglet Historique remplace Collègues ici pour l'accès rapide */}
      <Tab.Screen name="Historique" component={HistoryScreen} options={{ title: 'Comptabilité' }} />
      
    </Tab.Navigator>
  );
}