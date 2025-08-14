import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import styles from '../styles/styles';

const RideForm = ({ onCreate }) => {
  const [patientName, setPatientName] = useState('');
  const [dateTime, setDateTime] = useState(null);
  const [startLocation, setStartLocation] = useState('');
  const [endLocation, setEndLocation] = useState('');
  const [type, setType] = useState('');

  const [showPicker, setShowPicker] = useState(false);
  const [mode, setMode] = useState('date');

  const handleCreateRide = () => {
    if (!patientName || !dateTime || !startLocation || !endLocation || !type) {
      Alert.alert('Erreur', 'Merci de remplir tous les champs');
      return;
    }

    onCreate({
      patientName,
      date: dateTime.toISOString(),
      startLocation,
      endLocation,
      type,
      startTime: null,
      endTime: null,
      distance: 0,
    });

    // Reset form
    setPatientName('');
    setDateTime(null);
    setStartLocation('');
    setEndLocation('');
    setType('');
  };

  const showMode = (currentMode) => {
    setShowPicker(true);
    setMode(currentMode);
  };

  const onChange = (event, selectedDate) => {
    setShowPicker(Platform.OS === 'ios'); // iOS reste ouvert
    if (selectedDate) setDateTime(selectedDate);
  };

  return (
    <View style={styles.form}>
      <Text style={{ fontWeight: 'bold' }}>Nom du patient</Text>
      <TextInput
        style={styles.input}
        value={patientName}
        onChangeText={setPatientName}
        placeholder="Ex: John Doe"
      />

      <Text style={{ fontWeight: 'bold', marginTop: 10 }}>Date & heure</Text>
      <TouchableOpacity
        onPress={() => showMode('date')}
        style={{
          borderWidth: 1,
          borderColor: '#ccc',
          padding: 12,
          borderRadius: 8,
          backgroundColor: '#fff',
          marginBottom: 10,
        }}
      >
        <Text>
          {dateTime
            ? dateTime.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
            : 'Sélectionner la date et l’heure'}
        </Text>
      </TouchableOpacity>

      {showPicker && (
        <DateTimePicker
          value={dateTime || new Date()}
          mode={mode}
          is24Hour={true}
          display="default"
          onChange={(event, selectedDate) => {
            onChange(event, selectedDate);
            if (mode === 'date' && selectedDate) showMode('time'); // après date, demander l’heure
          }}
        />
      )}

      <Text style={{ fontWeight: 'bold' }}>Départ</Text>
      <TextInput
        style={styles.input}
        value={startLocation}
        onChangeText={setStartLocation}
        placeholder="Ex: 123 Rue..."
      />

      <Text style={{ fontWeight: 'bold' }}>Arrivée</Text>
      <TextInput
        style={styles.input}
        value={endLocation}
        onChangeText={setEndLocation}
        placeholder="Ex: 456 Avenue..."
      />

      <Text style={{ fontWeight: 'bold' }}>Type de course</Text>
      <TextInput
        style={styles.input}
        value={type}
        onChangeText={setType}
        placeholder="Ex: VSL / Taxi"
      />

      <TouchableOpacity
        onPress={handleCreateRide}
        style={{
          backgroundColor: '#4CAF50',
          padding: 15,
          borderRadius: 10,
          marginTop: 15,
        }}
      >
        <Text style={{ color: '#fff', fontWeight: 'bold', textAlign: 'center' }}>
          Créer la course
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default RideForm;
