// App.js
import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SignInScreen from './screens/SignInScreen';
import SignUpScreen from './screens/SignUpScreen';
import MainTabs from './screens/MainTabs';

const Stack = createNativeStackNavigator();

export default function App() {
  const [user, setUser] = useState(null);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <>
            <Stack.Screen name="SignIn">
              {props => <SignInScreen {...props} setUser={setUser} />}
            </Stack.Screen>
            <Stack.Screen name="SignUp" component={SignUpScreen} initialParams={{ setUser }} />
          </>
        ) : (
          <Stack.Screen name="Main">
            {props => <MainTabs {...props} user={user} />}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
