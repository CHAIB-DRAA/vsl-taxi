import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert } from 'react-native';
import { registerUser } from '../services/api';

export default function RegisterScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleRegister = async () => {
    try {
      await registerUser({ email, password });
      Alert.alert('Succès', 'Compte créé ! Vous pouvez vous connecter.');
      navigation.goBack();
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de créer le compte');
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Text>Email</Text>
      <TextInput value={email} onChangeText={setEmail} style={{ borderWidth:1, marginBottom:10, padding:8 }} />
      <Text>Mot de passe</Text>
      <TextInput value={password} onChangeText={setPassword} secureTextEntry style={{ borderWidth:1, marginBottom:10, padding:8 }} />
      <Button title="S’inscrire" onPress={handleRegister} />
    </View>
  );
}
