import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, Alert } from 'react-native';
import moment from 'moment';

const RideModal = ({ visible, ride, onClose, onSave, onDelete }) => {
  const [formData, setFormData] = useState({ patientName: '', startLocation: '', endLocation: '', type: '', date: '' });

  useEffect(() => {
    if (ride) {
      setFormData({
        patientName: ride.patientName,
        startLocation: ride.startLocation,
        endLocation: ride.endLocation,
        type: ride.type,
        date: ride.date,
      });
    }
  }, [ride]);

  const fields = [
    { key: 'patientName', label: 'Nom du patient' },
    { key: 'startLocation', label: 'Départ' },
    { key: 'endLocation', label: 'Arrivée' },
    { key: 'type', label: 'Type' },
    { key: 'date', label: 'Date (YYYY-MM-DD HH:mm)' },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
        <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 20 }}>
          <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 10 }}>Modifier la course</Text>
          {fields.map((f, i) => (
            <TextInput
              key={i}
              placeholder={f.label}
              value={f.key === 'date' ? moment(formData.date).format('YYYY-MM-DD HH:mm') : formData[f.key]}
              onChangeText={text => setFormData(prev => ({ ...prev, [f.key]: f.key === 'date' ? new Date(text).toISOString() : text }))}
              style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 10 }}
            />
          ))}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
            <TouchableOpacity onPress={() => onSave(formData)} style={{ padding: 10, backgroundColor: '#2196F3', borderRadius: 8 }}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Enregistrer</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onDelete()} style={{ padding: 10, backgroundColor: 'red', borderRadius: 8 }}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Supprimer</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={{ padding: 10, backgroundColor: '#555', borderRadius: 8 }}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default RideModal;
