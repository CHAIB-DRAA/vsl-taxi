import React, { useState, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import CreateRideScreen from './CreateRideScreen';
import TodayRidesScreen from './TodayRidesScreen';
import AgendaScreen from './AgendaScreen';
import HistoryScreen from './HistoryScreen';
import { getRides } from '../services/api';

const Tab = createBottomTabNavigator();

export default function HomeTabs() {
  const [todayRidesCount, setTodayRidesCount] = useState(0);

  const fetchTodayRidesCount = async () => {
    try {
      const data = await getRides();
      const today = new Date();
      const todayRides = data.filter(ride => {
        const rideDate = new Date(ride.date);
        return rideDate.toDateString() === today.toDateString() && !ride.startTime;
      });
      setTodayRidesCount(todayRides.length);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTodayRidesCount();
  }, []);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === 'Créer') iconName = 'add-circle-outline';
          else if (route.name === 'Agenda') iconName = 'calendar-outline';
          else if (route.name === 'Historique') iconName = 'list-outline';
          else if (route.name === 'aujourdui') iconName = 'today-outline';

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007bff',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen name="Créer" component={CreateRideScreen} />
      <Tab.Screen
        name="aujourdui"
        component={TodayRidesScreen}
        options={{ tabBarBadge: todayRidesCount ? todayRidesCount : null }}
        listeners={{
          focus: () => fetchTodayRidesCount(),
        }}
      />
      <Tab.Screen name="Agenda" component={AgendaScreen} />
      <Tab.Screen name="Historique" component={HistoryScreen} />
    </Tab.Navigator>
  );
}
