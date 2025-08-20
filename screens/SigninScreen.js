import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import axios from 'axios';

const API_URL = 'https://vsl-taxi.onrender.com/api/user'; // ton backend Mongo

export default function SigninScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignin = async () => {
    if (!email || !password) {
      Alert.alert('Erreur', 'Email et mot de passe requis');
      return;
    }

    setLoading(true);
    try {
      // Ici on simule la connexion : vérifier email + password
      const res = await axios.get(`${API_URL}`, { params: { email } });
      const user = res.data.find(u => u.email === email);

      if (!user || user.password !== password) {
        Alert.alert('Erreur', 'Email ou mot de passe incorrect');
      } else {
        Alert.alert('Succès', `Bienvenue ${user.fullName || user.email}`);
        // Ici tu peux naviguer vers ton dashboard
      }
    } catch (err) {
      console.error(err.response?.data || err.message);
      Alert.alert('Erreur', 'Impossible de se connecter');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Email"
        style={styles.input}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        placeholder="Mot de passe"
        style={styles.input}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {loading ? (
        <ActivityIndicator size="large" color="#2196F3" />
      ) : (
        <TouchableOpacity style={styles.button} onPress={handleSignin}>
          <Text style={styles.buttonText}>Se connecter</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, marginBottom: 12 },
  button: { backgroundColor: '#2196F3', padding: 15, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
