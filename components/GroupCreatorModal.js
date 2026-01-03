import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, Modal, TouchableOpacity, FlatList, TextInput, Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function GroupCreatorModal({ visible, onClose, contacts, onSaveGroup }) {
  const [groupName, setGroupName] = useState('');
  const [selectedContactIds, setSelectedContactIds] = useState([]);

  const toggleContact = (id) => {
    if (selectedContactIds.includes(id)) {
      setSelectedContactIds(selectedContactIds.filter(cId => cId !== id));
    } else {
      setSelectedContactIds([...selectedContactIds, id]);
    }
  };

  const handleSave = () => {
    if (!groupName.trim()) return Alert.alert("Erreur", "Donnez un nom au groupe.");
    if (selectedContactIds.length === 0) return Alert.alert("Erreur", "Sélectionnez au moins un collègue.");

    const newGroup = {
      id: Date.now().toString(),
      name: groupName,
      members: contacts.filter(c => selectedContactIds.includes(c._id))
    };

    onSaveGroup(newGroup);
    setGroupName('');
    setSelectedContactIds([]);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Nouveau Groupe 👥</Text>
          <TouchableOpacity onPress={onClose}><Ionicons name="close" size={28} color="#333" /></TouchableOpacity>
        </View>

        <View style={styles.inputContainer}>
            <Text style={styles.label}>Nom du groupe</Text>
            <TextInput 
                style={styles.input} 
                placeholder="Ex: Team Purpan, Équipe de Nuit..." 
                value={groupName}
                onChangeText={setGroupName}
            />
        </View>

        <Text style={styles.labelList}>Sélectionner les membres :</Text>
        
        <FlatList
          data={contacts}
          keyExtractor={item => item._id}
          renderItem={({ item }) => {
            const isSelected = selectedContactIds.includes(item._id);
            return (
              <TouchableOpacity style={[styles.contactRow, isSelected && styles.selectedRow]} onPress={() => toggleContact(item._id)}>
                <View style={styles.rowLeft}>
                    <Ionicons name={isSelected ? "checkbox" : "square-outline"} size={24} color={isSelected ? "#6200EE" : "#AAA"} />
                    <Text style={[styles.name, isSelected && {color: '#6200EE', fontWeight:'bold'}]}>{item.contactId?.fullName}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveText}>CRÉER LE GROUPE ({selectedContactIds.length})</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF', padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 'bold' },
  inputContainer: { marginBottom: 20 },
  label: { fontSize: 14, color: '#666', marginBottom: 8, fontWeight: 'bold' },
  input: { borderWidth: 1, borderColor: '#DDD', borderRadius: 12, padding: 15, fontSize: 16, backgroundColor: '#FAFAFA' },
  labelList: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: '#333' },
  contactRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderColor: '#F0F0F0' },
  selectedRow: { backgroundColor: '#F3E5F5' },
  rowLeft: { flexDirection: 'row', alignItems: 'center' },
  name: { marginLeft: 15, fontSize: 16, color: '#333' },
  saveBtn: { backgroundColor: '#6200EE', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  saveText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});