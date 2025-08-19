// screens/ContactScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Alert } from 'react-native';
import { supabase } from '../lib/supabase';

export default function ContactScreen({ session }) {
  const [contacts, setContacts] = useState([]);
  const [newEmail, setNewEmail] = useState('');
  const userId = session?.user?.id;

  // --- Fetch contacts ---
  const fetchContacts = async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from('contacts')
      .select('contact_id, profiles!contacts_contact_id_fkey(id, email)')
      .eq('user_id', userId);

    if (error) {
      console.error('Erreur fetch contacts:', error);
      return;
    }
    setContacts(data);
  };

  // --- Ajouter un contact ---
  const addContact = async () => {
    if (!newEmail) {
      Alert.alert('Erreur', 'Veuillez entrer un email.');
      return;
    }

    // Vérifier si l’utilisateur existe dans profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', newEmail)
      .single();

    if (profileError || !profile) {
      Alert.alert('Utilisateur introuvable', 'Aucun utilisateur avec cet email.');
      return;
    }

    // Vérifier si ce contact existe déjà
    const { data: existing } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', userId)
      .eq('contact_id', profile.id)
      .single();

    if (existing) {
      Alert.alert('Contact existant', 'Ce contact est déjà ajouté.');
      return;
    }

    // Ajouter le contact
    const { error } = await supabase.from('contacts').insert({
      user_id: userId,
      contact_id: profile.id,
    });

    if (error) {
      console.error('Erreur add contact:', error);
      Alert.alert('Erreur', 'Impossible d’ajouter le contact');
      return;
    }

    setNewEmail('');
    fetchContacts();
  };

  // --- Supprimer un contact ---
  const removeContact = async (contactId) => {
    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('user_id', userId)
      .eq('contact_id', contactId);

    if (error) {
      console.error('Erreur remove contact:', error);
      Alert.alert('Erreur', 'Impossible de supprimer le contact');
      return;
    }

    fetchContacts();
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const renderItem = ({ item }) => (
    <View style={styles.contactCard}>
      <Text>{item.profiles.email}</Text>
      <TouchableOpacity onPress={() => removeContact(item.contact_id)}>
        <Text style={styles.deleteText}>Supprimer</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mes contacts</Text>

      <FlatList
        data={contacts}
        keyExtractor={(item) => item.contact_id}
        renderItem={renderItem}
        ListEmptyComponent={<Text>Aucun contact trouvé</Text>}
      />

      <TextInput
        placeholder="Email du contact"
        value={newEmail}
        onChangeText={setNewEmail}
        style={styles.input}
      />

      <TouchableOpacity style={styles.button} onPress={addContact}>
        <Text style={styles.buttonText}>Ajouter un contact</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f5f6fa' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  contactCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: '#fff',
    marginBottom: 10,
    borderRadius: 10,
    elevation: 2,
  },
  deleteText: { color: 'red', fontWeight: 'bold' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 10,
    marginVertical: 10,
  },
  button: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: 'bold' },
});
