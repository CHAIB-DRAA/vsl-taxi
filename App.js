import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import CreateRideScreen from './screens/CreateRideScreen';
import HistoryScreen from './screens/HistoryScreen';
import AgendaScreen from './screens/AgendaScreen';
import { Ionicons } from '@expo/vector-icons';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ color, size }) => {
            let iconName;
            if (route.name === 'Créer') iconName = 'add-circle-outline';
            else if (route.name === 'Agenda') iconName = 'calendar-outline';
            else if (route.name === 'Historique') iconName = 'list-outline';
            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#007bff',
          tabBarInactiveTintColor: 'gray',
        })}
      >
        <Tab.Screen name="Créer" component={CreateRideScreen} />
        <Tab.Screen name="Agenda" component={AgendaScreen} />
        <Tab.Screen name="Historique" component={HistoryScreen} />
       
      </Tab.Navigator>
    </NavigationContainer>
  );
}
