import React, { useState } from 'react';
import { 
  View, TextInput, TouchableOpacity, Text, StyleSheet, 
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView 
} from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store'; // Plus sécurisé qu'AsyncStorage

const API_URL = 'https://vsl-taxi.onrender.com/api/user';

export default function SignInScreen({ navigation, onSignIn }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    // 1. Nettoyage des données (Trim)
    const cleanEmail = email.trim();
    
    if (!cleanEmail || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/login`, { 
        email: cleanEmail, 
        password 
      });

      // 2. Stockage sécurisé du token
      await SecureStore.setItemAsync('token', res.data.token);

      Alert.alert('Succès', 'Connexion réussie');
      
      // On passe les données au parent (App.js ou AuthContext)
      onSignIn({
        user: res.data.user,
        token: res.data.token
      });
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.response?.data?.message || 'Impossible de se connecter';
      console.error('Signin error:', errorMessage);
      Alert.alert('Erreur de connexion', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    // 3. Ajout du KeyboardAvoidingView pour l'UX
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Taxi Planning</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#666"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Mot de passe"
          placeholderTextColor="#666"
          secureTextEntry
          autoCapitalize="none"
          value={password}
          onChangeText={setPassword}
        />

        {loading ? (
          <ActivityIndicator size="large" color="#FF6B00" style={{ marginVertical: 10 }} />
        ) : (
          <View style={{ width: '100%' }}>
            <TouchableOpacity style={styles.button} onPress={handleSignIn}>
              <Text style={styles.buttonText}>Se connecter</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.signUpButton]}
              onPress={() => navigation.navigate('SignUp')}
            >
              <Text style={styles.buttonText}>Pas de compte ? S'inscrire</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flexGrow: 1, 
    justifyContent: 'center', 
    padding: 20, 
    backgroundColor: '#F8F8F8'
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF6B00',
    textAlign: 'center',
    marginBottom: 30
  },
  input: { 
    height: 55, 
    borderColor: '#FF6B00', 
    borderWidth: 1.5, 
    borderRadius: 12, 
    marginBottom: 15, 
    paddingHorizontal: 15, 
    fontSize: 16, 
    color: "#000",
    backgroundColor: '#FFF'
  },
  button: { 
    backgroundColor: '#FF6B00', 
    paddingVertical: 15, 
    borderRadius: 14, 
    alignItems: 'center', 
    marginBottom: 12
  },
  signUpButton: { backgroundColor: '#4CAF50' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 17 },
});