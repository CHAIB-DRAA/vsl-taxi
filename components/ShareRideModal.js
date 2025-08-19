import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';

const ShareRideModal = ({ visible, contacts, onSelectContact, onClose }) => (
  <Modal visible={visible} animationType="slide" transparent>
    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
      <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>Partager la course</Text>
        {contacts.map(contact => (
          <TouchableOpacity key={contact.id} onPress={() => onSelectContact(contact)} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' }}>
            <Text>{contact.full_name || contact.email}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity onPress={onClose} style={{ marginTop: 10 }}>
          <Text style={{ textAlign: 'center', color: 'red', fontWeight: 'bold' }}>Fermer</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

export default ShareRideModal;
