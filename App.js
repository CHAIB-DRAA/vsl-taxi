import 'react-native-url-polyfill/auto';
import React, { useState, useCallback } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import SignInScreen from './screens/SigninScreen';
import SignUpScreen from './screens/SignupScreen';
import CreateRideScreen from './screens/CreateRideScreen';
import TodayRidesScreen from './screens/TodayRidesScreen';
import AgendaScreen from './screens/AgendaScreen';
import HistoryScreen from './screens/HistoryScreen';
import SettingsScreen from './screens/SettingsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabs({ todayRidesCount, fetchTodayRidesCount, navigation }) {
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

  const fetchTodayRidesCount = useCallback(() => {
    // Ici tu peux appeler ton API pour compter les courses du jour
    setTodayRidesCount(3); // exemple statique
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <Stack.Navigator>
          {!session ? (
            <>
              <Stack.Screen name="SignIn" options={{ headerShown: false }}>
                {props => (
                  <SignInScreen
                    {...props}
                    onSignIn={user => setSession(user)}
                  />
                )}
              </Stack.Screen>
              <Stack.Screen name="SignUp" options={{ headerShown: false }}>
                {props => (
                  <SignUpScreen
                    {...props}
                    onSignUp={user => setSession(user)}
                  />
                )}
              </Stack.Screen>
            </>
          ) : (
            <>
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
                component={SettingsScreen}
                options={{ title: 'Paramètres' }}
              />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
