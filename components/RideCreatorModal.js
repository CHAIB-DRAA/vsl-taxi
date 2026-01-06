import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import moment from 'moment';

export default function RideCreatorModal({ visible, onClose, initialData, onSave }) {
  const [formData, setFormData] = useState({
    patientName: '', patientPhone: '', startLocation: '', endLocation: '', 
    date: new Date(), type: 'Aller'
  });
  
  const [showPicker, setShowPicker] = useState(false);

  // Chargement des données quand le modal s'ouvre (ou quand on colle du texte)
  useEffect(() => {
    if (initialData) {
        setFormData(prev => ({
            ...prev,
            ...initialData,
            date: initialData.startTime ? new Date(initialData.startTime) : new Date()
        }));
    }
  }, [initialData]);

  const handleSave = () => {
    if (!formData.patientName || !formData.startLocation) {
        return Alert.alert("Erreur", "Nom et Départ obligatoires.");
    }
    onSave(formData);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
            <Text style={styles.title}>Nouvelle Course 🚕</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={28} color="#666"/></TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{paddingBottom: 20}}>
            <Text style={styles.label}>Patient</Text>
            <TextInput style={styles.input} placeholder="Nom du patient" value={formData.patientName} onChangeText={t => setFormData({...formData, patientName: t})} />

            <Text style={styles.label}>Téléphone</Text>
            <TextInput style={styles.input} placeholder="06..." keyboardType="phone-pad" value={formData.patientPhone} onChangeText={t => setFormData({...formData, patientPhone: t})} />

            <Text style={styles.label}>Heure</Text>
            <TouchableOpacity style={styles.dateBtn} onPress={() => setShowPicker(true)}>
                <Text style={styles.dateText}>{moment(formData.date).format('HH:mm')}</Text>
                <Ionicons name="time" size={20} color="#333"/>
            </TouchableOpacity>
            {showPicker && (
                <DateTimePicker value={formData.date} mode="time" is24Hour={true} display="spinner"
                    onChange={(e, d) => { setShowPicker(false); if(d) setFormData({...formData, date: d}); }}
                />
            )}

            <Text style={styles.label}>Départ 🏠</Text>
            <TextInput style={styles.input} placeholder="Adresse de départ" value={formData.startLocation} onChangeText={t => setFormData({...formData, startLocation: t})} multiline />

            <Text style={styles.label}>Destination 🏥</Text>
            <TextInput style={styles.input} placeholder="Adresse d'arrivée" value={formData.endLocation} onChangeText={t => setFormData({...formData, endLocation: t})} multiline />
            
            <View style={styles.typeContainer}>
                {['Aller', 'Retour', 'Consultation'].map(type => (
                    <TouchableOpacity key={type} style={[styles.typeBtn, formData.type === type && styles.typeBtnActive]} onPress={() => setFormData({...formData, type})}>
                        <Text style={[styles.typeText, formData.type === type && {color: '#FFF'}]}>{type}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>VALIDER LA COURSE</Text>
            </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF', padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 'bold' },
  label: { fontSize: 14, fontWeight: 'bold', color: '#666', marginTop: 15, marginBottom: 5 },
  input: { backgroundColor: '#F5F5F5', padding: 12, borderRadius: 10, fontSize: 16, borderWidth: 1, borderColor: '#EEE' },
  dateBtn: { backgroundColor: '#F5F5F5', padding: 15, borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateText: { fontSize: 18, fontWeight: 'bold' },
  typeContainer: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 20 },
  typeBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, backgroundColor: '#EEE' },
  typeBtnActive: { backgroundColor: '#FF6B00' },
  typeText: { fontWeight: 'bold', color: '#333' },
  saveBtn: { backgroundColor: '#4CAF50', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 30 },
  saveBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});