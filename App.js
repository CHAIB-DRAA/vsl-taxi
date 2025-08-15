import React, { useEffect, useState, useCallback } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer, useFocusEffect } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import CreateRideScreen from './screens/CreateRideScreen';
import HistoryScreen from './screens/HistoryScreen';
import AgendaScreen from './screens/AgendaScreen';
import TodayRidesScreen from './screens/TodayRidesScreen';
import { getRides } from './services/api';

const Tab = createBottomTabNavigator();

export default function App() {
  const [todayRidesCount, setTodayRidesCount] = useState(0);

  const fetchTodayRidesCount = async () => {
    try {
      const data = await getRides();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayRides = data.filter(ride => {
        const rideDate = new Date(ride.date);
        rideDate.setHours(0, 0, 0, 0);
        return rideDate.getTime() === today.getTime() && !ride.startTime;
      });

      setTodayRidesCount(todayRides.length);
    } catch (err) {
      console.error('Erreur en récupérant les courses d’aujourd’hui:', err);
    }
  };

  // Rafraîchissement toutes les 60 secondes
  useEffect(() => {
    fetchTodayRidesCount();
    const interval = setInterval(fetchTodayRidesCount, 60000);
    return () => clearInterval(interval);
  }, []);

  // Wrapper pour l'écran Aujourd’hui pour rafraîchir au focus
  const TodayRidesWrapper = (props) => {
    useFocusEffect(
      useCallback(() => {
        fetchTodayRidesCount();
      }, [])
    );
    return <TodayRidesScreen {...props} />;
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ color, size }) => {
              let iconName;
              if (route.name === 'Créer') iconName = 'add-circle-outline';
              else if (route.name === 'Aujourd’hui') iconName = 'today-outline';
              else if (route.name === 'Agenda') iconName = 'calendar-outline';
              else if (route.name === 'Historique') iconName = 'list-outline';
              return <Ionicons name={iconName} size={size} color={color} />;
            },
            tabBarActiveTintColor: '#007bff',
            tabBarInactiveTintColor: 'gray',
          })}
        >
          <Tab.Screen name="Créer" component={CreateRideScreen} />
          <Tab.Screen
            name="Aujourd’hui"
            component={TodayRidesWrapper}
            options={{ tabBarBadge: todayRidesCount ? todayRidesCount : null }}
          />
          <Tab.Screen name="Agenda" component={AgendaScreen} />
          <Tab.Screen name="Historique" component={HistoryScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
