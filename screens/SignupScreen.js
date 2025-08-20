import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import axios from 'axios';

const API_URL = 'https://vsl-taxi.onrender.com/api/user';

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!email || !password) {
      Alert.alert('Erreur', 'Email et mot de passe requis');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/signup`, { email, fullName, password });
      Alert.alert('Succès', `Bienvenue ${res.data.user.fullName || res.data.user.email}`);
      // navigation vers écran de login
    } catch (err) {
      console.error(err.response?.data || err.message);
      Alert.alert('Erreur', err.response?.data?.error || 'Impossible de créer l’utilisateur');
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
        <TouchableOpacity style={styles.button} onPress={handleSignup}>
          <Text style={styles.buttonText}>S'inscrire</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, marginTop: 60 },
  input: {
    height: 50, borderColor: '#ccc', borderWidth: 1, borderRadius: 8,
    marginBottom: 12, paddingHorizontal: 12, fontSize: 16, backgroundColor: '#fff'
  },
  button: {
    backgroundColor: '#4CAF50', padding: 15, borderRadius: 8,
    alignItems: 'center', marginBottom: 12
  },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});
