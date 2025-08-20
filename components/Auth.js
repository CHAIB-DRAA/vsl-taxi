import React, { useState } from 'react';
import { Alert, StyleSheet, View, TextInput, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import axios from 'axios';

const API_URL = 'https://vsl-taxi.onrender.com/api/user'; // endpoint backend Mongo

export default function Auth() {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs.');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      Alert.alert('Succès', 'Connexion réussie !');
      // navigation vers ton dashboard/agenda
    } catch (err) {
      Alert.alert('Erreur', err.message || 'Connexion échouée');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!email || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs.');
      return;
    }

    setLoading(true);
    try {
      // 1️⃣ Créer l’utilisateur sur Supabase
      const { data: supaData, error: supaError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } }, // stocker full_name si besoin
      });
      if (supaError) throw supaError;

      const userId = supaData.user?.id;
      if (!userId) {
        Alert.alert('Erreur', 'Impossible de récupérer l’identifiant utilisateur Supabase.');
        return;
      }

      // 2️⃣ Synchroniser l’utilisateur dans MongoDB
      try {
        await axios.post(`${API_URL}/sync`, {
          id: userId,
          email,
          fullName,
        });
        console.log('Utilisateur Mongo synchronisé ✅');
      } catch (mongoErr) {
        console.error('Erreur création utilisateur Mongo:', mongoErr.response?.data || mongoErr.message);
      }

      Alert.alert(
        'Inscription réussie',
        'Vérifiez votre boîte mail pour confirmer votre compte.'
      );
    } catch (err) {
      Alert.alert('Erreur', err.message || 'Inscription échouée');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Nom complet (optionnel)"
        value={fullName}
        onChangeText={setFullName}
      />
      <TextInput
        style={styles.input}
        placeholder="email@address.com"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Mot de passe"
        secureTextEntry
        autoCapitalize="none"
        value={password}
        onChangeText={setPassword}
      />

      {loading ? (
        <ActivityIndicator size="large" color="#2196F3" style={{ marginVertical: 10 }} />
      ) : (
        <>
          <TouchableOpacity style={styles.button} onPress={handleSignIn}>
            <Text style={styles.buttonText}>Se connecter</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.button, styles.signUpButton]} onPress={handleSignUp}>
            <Text style={styles.buttonText}>S'inscrire</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 60,
    padding: 20,
  },
  input: {
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 12,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  signUpButton: {
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
