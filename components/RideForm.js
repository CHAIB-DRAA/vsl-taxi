import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, Platform, Switch } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import styles from '../styles/styles';

const RideForm = ({ onCreate }) => {
  const [patientName, setPatientName] = useState('');
  const [dateTime, setDateTime] = useState(null);
  const [returnDateTime, setReturnDateTime] = useState(null);
  const [startLocation, setStartLocation] = useState('');
  const [endLocation, setEndLocation] = useState('');
  const [isRoundTrip, setIsRoundTrip] = useState(false);

  const [showPicker, setShowPicker] = useState(false);
  const [mode, setMode] = useState('date');
  const [isReturn, setIsReturn] = useState(false);

  const handleCreateRide = () => {
    if (!patientName || !dateTime || !startLocation || !endLocation) {
      Alert.alert('Erreur', 'Merci de remplir tous les champs');
      return;
    }

    if (isRoundTrip && !returnDateTime) {
      Alert.alert('Erreur', 'Merci de sélectionner la date et l’heure du retour');
      return;
    }

    onCreate({
      patientName,
      startLocation,
      endLocation,
      date: dateTime.toISOString(),
      returnDate: isRoundTrip ? returnDateTime.toISOString() : null,
      isRoundTrip,
    });

    // Reset
    setPatientName('');
    setDateTime(null);
    setReturnDateTime(null);
    setStartLocation('');
    setEndLocation('');
    setIsRoundTrip(false);
  };

  const showMode = (currentMode, returnTrip = false) => {
    setIsReturn(returnTrip);
    setMode(currentMode);
    setShowPicker(true);
  };

  const onChange = (event, selectedDate) => {
    setShowPicker(Platform.OS === 'ios');
    if (!selectedDate) return;

    if (isReturn) setReturnDateTime(selectedDate);
    else setDateTime(selectedDate);

    if (mode === 'date') setMode('time');
  };

  return (
    <View style={styles.form}>
      <Text style={{ fontWeight: 'bold' }}>Nom du patient</Text>
      <TextInput style={styles.input} value={patientName} onChangeText={setPatientName} placeholder="Ex: John Doe" />

      <Text style={{ fontWeight: 'bold', marginTop: 10 }}>Date & heure du départ</Text>
      <TouchableOpacity onPress={() => showMode('date', false)} style={styles.input}>
        <Text>
          {dateTime
            ? dateTime.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
            : 'Sélectionner la date et l’heure'}
        </Text>
      </TouchableOpacity>

      <Text style={{ fontWeight: 'bold', marginTop: 10 }}>Départ</Text>
      <TextInput style={styles.input} value={startLocation} onChangeText={setStartLocation} placeholder="Ex: 123 Rue..." />

      <Text style={{ fontWeight: 'bold' }}>Arrivée</Text>
      <TextInput style={styles.input} value={endLocation} onChangeText={setEndLocation} placeholder="Ex: 456 Avenue..." />

      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
        <Text style={{ fontWeight: 'bold', marginRight: 10 }}>Aller-Retour</Text>
        <Switch value={isRoundTrip} onValueChange={setIsRoundTrip} />
      </View>

      {isRoundTrip && (
        <>
          <Text style={{ fontWeight: 'bold', marginTop: 10 }}>Date & heure du retour</Text>
          <TouchableOpacity onPress={() => showMode('date', true)} style={styles.input}>
            <Text>
              {returnDateTime
                ? returnDateTime.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                : 'Sélectionner la date et l’heure du retour'}
            </Text>
          </TouchableOpacity>
        </>
      )}

      {showPicker && (
        <DateTimePicker
          value={isReturn ? returnDateTime || new Date() : dateTime || new Date()}
          mode={mode}
          is24Hour={true}
          display="default"
          onChange={onChange}
        />
      )}

      <TouchableOpacity onPress={handleCreateRide} style={{ backgroundColor: '#4CAF50', padding: 15, borderRadius: 10, marginTop: 15 }}>
        <Text style={{ color: '#fff', fontWeight: 'bold', textAlign: 'center' }}>Créer la course</Text>
      </TouchableOpacity>
    </View>
  );
};

export default RideForm;
