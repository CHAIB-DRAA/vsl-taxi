import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Calendar } from 'react-native-calendars';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://10.0.2.2:5000/api'; // change selon ton backend

export default function AgendaScreen() {
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      const res = await axios.get(`${API_URL}/contacts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setContacts(res.data);
    } catch (err) {
      console.error('Erreur fetchContacts:', err.response?.data || err.message);
      Alert.alert('Erreur', 'Impossible de récupérer vos contacts');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await axios.get(`${API_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(res.data);
    } catch (err) {
      console.error('Erreur fetchUsers:', err.response?.data || err.message);
    }
  };

  const addContact = async (contactId) => {
    try {
      const token = await AsyncStorage.getItem('token');
      await axios.post(`${API_URL}/contacts`, { contactId }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      Alert.alert('Succès', 'Contact ajouté avec succès');
      setModalVisible(false);
      fetchContacts();
    } catch (err) {
      console.error('Erreur addContact:', err.response?.data || err.message);
      Alert.alert('Erreur', err.response?.data?.error || 'Impossible d\'ajouter le contact');
    }
  };

  useEffect(() => {
    fetchContacts();
    fetchUsers();
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity style={styles.toggleButton} onPress={() => setShowCalendar(!showCalendar)}>
        <Text style={styles.toggleText}>{showCalendar ? 'Masquer Calendrier' : 'Afficher Calendrier'}</Text>
      </TouchableOpacity>

      {showCalendar && (
        <Calendar
          onDayPress={(day) => setSelectedDate(day.dateString)}
          markedDates={selectedDate ? { [selectedDate]: { selected: true, selectedColor: 'blue' } } : {}}
        />
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mes contacts</Text>
        {loading ? <ActivityIndicator size="large" color="blue" /> : (
          contacts.length > 0 ? (
            contacts.map((c) => (
              <View key={c._id} style={styles.contactItem}>
                <Text>{c.contactId.name} - {c.contactId.email}</Text>
              </View>
            ))
          ) : (
            <Text>Aucun contact</Text>
          )
        )}
      </View>

      <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
        <Text style={styles.addButtonText}>Ajouter un contact</Text>
      </TouchableOpacity>

      {/* Modal pour ajouter un contact */}
      <Modal visible={modalVisible} animationType="slide">
        <ScrollView contentContainerStyle={styles.modalContainer}>
          <Text style={styles.modalTitle}>Ajouter un contact</Text>
          {users.map((u) => (
            <TouchableOpacity key={u.id} style={styles.userItem} onPress={() => addContact(u.id)}>
              <Text>{u.name} - {u.email}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
            <Text style={styles.closeButtonText}>Fermer</Text>
          </TouchableOpacity>
        </ScrollView>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 15 },
  toggleButton: { backgroundColor: 'blue', padding: 10, borderRadius: 8, marginBottom: 15 },
  toggleText: { color: 'white', textAlign: 'center' },
  section: { marginTop: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  contactItem: { padding: 10, backgroundColor: '#f0f0f0', borderRadius: 5, marginBottom: 8 },
  addButton: { marginTop: 20, backgroundColor: 'green', padding: 12, borderRadius: 8 },
  addButtonText: { color: 'white', textAlign: 'center' },
  modalContainer: { padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  userItem: { padding: 10, borderBottomWidth: 1, borderBottomColor: '#ccc' },
  closeButton: { marginTop: 20, backgroundColor: 'red', padding: 12, borderRadius: 8 },
  closeButtonText: { color: 'white', textAlign: 'center' },
});
