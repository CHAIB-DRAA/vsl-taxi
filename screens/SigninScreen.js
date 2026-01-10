import React, { useState } from 'react';
import { 
  View, TextInput, TouchableOpacity, Text, StyleSheet, 
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Keyboard, Modal 
} from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons'; // Assure-toi d'avoir installé @expo/vector-icons

const API_URL = 'https://vsl-taxi.onrender.com/api/user'; // Vérifie que c'est la bonne URL (api/user ou api/auth selon ton backend)
// NOTE : Si tu as mis les routes auth dans /api/auth dans le backend, change ici. 
// D'après ton code précédent c'était api/user/login, donc je garde api/user.

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignInScreen({ navigation, onSignIn }) {
  // --- États Connexion ---
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // --- États Mot de Passe Oublié ---
  const [forgotModalVisible, setForgotModalVisible] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  // Validation email
  const isValidEmail = (email) => EMAIL_REGEX.test(email);

  // ==========================================
  // 1. GESTION DU LOGIN (Ton code existant)
  // ==========================================
  const handleSignIn = async () => {
    Keyboard.dismiss();
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
      // Vérifie bien si ton backend attend /login sur /api/user ou /api/auth
      const res = await axios.post(
        `${API_URL}/login`, 
        { email: cleanEmail, password },
        { timeout: 10000 }
      );

      if (res.data && res.data.token) {
        await SecureStore.setItemAsync('token', res.data.token);
        await SecureStore.setItemAsync('userEmail', cleanEmail);

        onSignIn({
          user: res.data.user || { email: cleanEmail }, // Fallback si user n'est pas renvoyé
          token: res.data.token
        });
      } else {
        throw new Error("Réponse serveur invalide");
      }

    } catch (err) {
      console.log('Login failed'); 
      let userMessage = 'Une erreur est survenue.';

      if (err.response) {
        if (err.response.status === 400 || err.response.status === 401 || err.response.status === 404) {
          userMessage = 'Email ou mot de passe incorrect.';
        } else if (err.response.status >= 500) {
          userMessage = 'Erreur serveur. Réessayez plus tard.';
        }
      } else if (err.code === 'ECONNABORTED') {
        userMessage = 'Le serveur ne répond pas (Timeout).';
      }

      Alert.alert('Échec', userMessage);
      setPassword('');

    } finally {
      setTimeout(() => setLoading(false), 500);
    }
  };

  // ==========================================
  // 2. GESTION MOT DE PASSE OUBLIÉ
  // ==========================================
  const handleResetRequest = async () => {
    const cleanResetEmail = resetEmail.trim();

    if (!isValidEmail(cleanResetEmail)) {
      Alert.alert("Erreur", "Veuillez entrer un email valide.");
      return;
    }

    setResetLoading(true);

    try {
      // Appel à la route créée précédemment
      // Attention : vérifie si ta route est /forgot-password ou /api/user/forgot-password
      await axios.post(`${API_URL}/forgot-password`, { 
        email: cleanResetEmail 
      });

      // On ferme le modal et on prévient l'utilisateur
      setForgotModalVisible(false);
      setResetEmail('');
      
      Alert.alert(
        "Email envoyé 📧", 
        "Si ce compte existe, vous recevrez un code de réinitialisation."
      );

    } catch (error) {
      console.log("Reset error", error);
      // Même si l'email n'existe pas (404), pour la sécurité, on peut dire que c'est envoyé
      // Ou alors afficher un message générique.
      if (error.response && error.response.status === 404) {
         Alert.alert("Compte introuvable", "Aucun compte associé à cet email.");
      } else {
         Alert.alert("Erreur", "Impossible d'envoyer la demande. Vérifiez votre connexion.");
      }
    } finally {
      setResetLoading(false);
    }
  };

  // ==========================================
  // RENDU
  // ==========================================
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
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        
        <TextInput
          style={styles.input}
          placeholder="Mot de passe"
          placeholderTextColor="#999"
          secureTextEntry={true}
          autoCapitalize="none"
          value={password}
          onChangeText={setPassword}
        />

        {/* LIEN MOT DE PASSE OUBLIÉ */}
        <TouchableOpacity 
            style={styles.forgotContainer} 
            onPress={() => setForgotModalVisible(true)}
        >
            <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
        </TouchableOpacity>

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

        {/* --- MODAL DE RÉCUPÉRATION --- */}
        <Modal
            animationType="slide"
            transparent={true}
            visible={forgotModalVisible}
            onRequestClose={() => setForgotModalVisible(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <TouchableOpacity 
                        style={styles.closeModalBtn} 
                        onPress={() => setForgotModalVisible(false)}
                    >
                        <Ionicons name="close" size={24} color="#666" />
                    </TouchableOpacity>

                    <Text style={styles.modalTitle}>Réinitialisation</Text>
                    <Text style={styles.modalDesc}>
                        Entrez votre email pour recevoir un code de sécurité.
                    </Text>

                    <TextInput
                        style={[styles.input, {width: '100%', marginTop: 15}]}
                        placeholder="Votre email"
                        placeholderTextColor="#999"
                        autoCapitalize="none"
                        keyboardType="email-address"
                        value={resetEmail}
                        onChangeText={setResetEmail}
                    />

                    <TouchableOpacity 
                        style={[styles.button, {width: '100%', marginTop: 10}]} 
                        onPress={handleResetRequest}
                        disabled={resetLoading}
                    >
                        {resetLoading ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <Text style={styles.buttonText}>Envoyer le code</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>

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
    borderColor: '#E0E0E0', 
    borderWidth: 1, 
    borderRadius: 12, 
    marginBottom: 15, 
    paddingHorizontal: 15, 
    fontSize: 16, 
    color: "#333",
    backgroundColor: '#FFF',
    elevation: 2, 
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  forgotContainer: {
    alignSelf: 'flex-end',
    marginBottom: 25,
    padding: 5
  },
  forgotText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 14
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
  
  // STYLES MODAL
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    elevation: 5
  },
  closeModalBtn: {
    position: 'absolute',
    top: 15,
    right: 15,
    padding: 5
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10
  },
  modalDesc: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 10,
    lineHeight: 20
  }
});