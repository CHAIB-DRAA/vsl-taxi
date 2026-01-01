import React, { useState } from 'react';
import { 
  View, TextInput, TouchableOpacity, Text, StyleSheet, 
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Keyboard 
} from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = 'https://vsl-taxi.onrender.com/api/user';

// Regex simple mais efficace pour valider le format email
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignInScreen({ navigation, onSignIn }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Fonction utilitaire pour valider l'email
  const isValidEmail = (email) => EMAIL_REGEX.test(email);

  const handleSignIn = async () => {
    Keyboard.dismiss(); // Fermer le clavier par sécurité UX

    // 1. Nettoyage et Validation Locale (Security Layer 1)
    const cleanEmail = email.trim();
    
    if (!cleanEmail || !password) {
      Alert.alert('Attention', 'Veuillez remplir tous les champs.');
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      Alert.alert('Format invalide', 'Veuillez entrer une adresse email valide.');
      return;
    }

    setLoading(true);

    try {
      // 2. Configuration Sécurisée de la Requête (Security Layer 2)
      // On ajoute un timeout pour éviter que la requête ne pende (DoS protection)
      const res = await axios.post(
        `${API_URL}/login`, 
        { email: cleanEmail, password },
        { timeout: 10000 } // 10 secondes max
      );

      // 3. Stockage Sécurisé (Security Layer 3)
      if (res.data && res.data.token) {
        await SecureStore.setItemAsync('token', res.data.token);
        
        // Optionnel : Stocker l'email pour l'UX future, mais jamais le mot de passe
        await SecureStore.setItemAsync('userEmail', cleanEmail);

        // Transition réussie
        onSignIn({
          user: res.data.user,
          token: res.data.token
        });
      } else {
        throw new Error("Réponse serveur invalide");
      }

    } catch (err) {
      // 4. Gestion des Erreurs Obfusquée (Security Layer 4)
      console.log('Login attempt failed'); // On évite console.error avec les détails en prod
      
      let userMessage = 'Une erreur est survenue. Veuillez vérifier votre connexion.';

      if (err.response) {
        // IMPORTANT : Ne jamais dire "Utilisateur inconnu" ou "Mauvais mot de passe".
        // On reste vague pour empêcher l'énumération des comptes.
        if (err.response.status === 400 || err.response.status === 401 || err.response.status === 404) {
          userMessage = 'Email ou mot de passe incorrect.';
        } else if (err.response.status === 429) {
          userMessage = 'Trop de tentatives. Veuillez réessayer plus tard.'; // Si ton backend gère le Rate Limit
        } else if (err.response.status >= 500) {
          userMessage = 'Erreur serveur temporaire. Veuillez réessayer.';
        }
      } else if (err.code === 'ECONNABORTED') {
        userMessage = 'Le serveur met trop de temps à répondre.';
      }

      Alert.alert('Échec de connexion', userMessage);
      
      // Sécurité : On vide le mot de passe en cas d'échec
      setPassword('');

    } finally {
      // 5. Anti-Brute Force Frontend (Security Layer 5)
      // On impose un petit délai artificiel avant de rendre la main à l'utilisateur
      setTimeout(() => {
        setLoading(false);
      }, 500); // 500ms de délai
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Taxi Planning</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#999"
          autoCapitalize="none"
          autoCorrect={false} // Désactive la correction auto pour éviter les erreurs de saisie
          keyboardType="email-address"
          textContentType="emailAddress" // Aide iOS à suggérer l'email
          value={email}
          onChangeText={setEmail}
        />
        
        <TextInput
          style={styles.input}
          placeholder="Mot de passe"
          placeholderTextColor="#999"
          secureTextEntry={true} // Masque le mot de passe
          autoCapitalize="none"
          textContentType="password" // Aide iOS à gérer le trousseau
          value={password}
          onChangeText={setPassword}
        />

        {loading ? (
          <ActivityIndicator size="large" color="#FF6B00" style={{ marginVertical: 20 }} />
        ) : (
          <View style={{ width: '100%' }}>
            <TouchableOpacity 
              style={styles.button} 
              onPress={handleSignIn}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>Se connecter</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.signUpButton]}
              onPress={() => navigation.navigate('SignUp')}
              activeOpacity={0.8}
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
    marginBottom: 40
  },
  input: { 
    height: 55, 
    borderColor: '#E0E0E0', // Plus subtil
    borderWidth: 1, 
    borderRadius: 12, 
    marginBottom: 15, 
    paddingHorizontal: 15, 
    fontSize: 16, 
    color: "#333",
    backgroundColor: '#FFF',
    elevation: 2, // Légère ombre sur Android
    shadowColor: "#000", // Ombre sur iOS
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  button: { 
    backgroundColor: '#FF6B00', 
    paddingVertical: 16, 
    borderRadius: 14, 
    alignItems: 'center', 
    marginBottom: 15,
    elevation: 3,
    shadowColor: "#FF6B00",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  signUpButton: { 
    backgroundColor: '#4CAF50',
    shadowColor: "#4CAF50", 
  },
  buttonText: { 
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: 16,
    letterSpacing: 0.5 
  },
});