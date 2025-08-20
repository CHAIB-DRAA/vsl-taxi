// screens/MainTabs.js
import React from 'react';
import { TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Screens internes
import CreateRideScreen from './CreateRideScreen';
import AgendaScreen from './AgendaScreen';
import HistoryScreen from './HistoryScreen';
import TodayRidesScreen from './TodayRidesScreen';
import SettingsScreen from './SettingsScreen';

const Tab = createBottomTabNavigator();

export default function MainTabs({ navigation, todayRidesCount }) {
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
      <Tab.Screen name="Historique" component={HistoryScreen} />
    </Tab.Navigator>
  );
}
