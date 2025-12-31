import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';

// Liste des départements d'Occitanie pour le filtrage
const OCCITANIE_DEPTS = [
  '31', // Haute-Garonne
  '81', // Tarn
  '82', // Tarn-et-Garonne
  '32', // Gers
  '09', // Ariège
  '65', // Hautes-Pyrénées
  '46', // Lot
  '12', // Aveyron
  '11', // Aude
  '34', // Hérault
  '66', // Pyrénées-Orientales
  '48', // Lozère
  '30'  // Gard
];

export default function AddressAutocomplete({ placeholder, value, onSelect, icon }) {
  const [query, setQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const searchAddress = async (text) => {
    setQuery(text);
    if (text.length < 3) {
      setSuggestions([]);
      setShowResults(false);
      return;
    }

    try {
      setLoading(true);
      setShowResults(true);

      // 1. On demande LARGE (limit=15) autour de Toulouse
      const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(text)}&limit=15&lat=43.6047&lon=1.4442`;
      const response = await axios.get(url);
      const rawResults = response.data.features || [];

      // 2. LE FILTRE MAGIQUE : On ne garde que l'Occitanie
      const filteredResults = rawResults.filter(item => {
        const postcode = item.properties.postcode; 
        // Si pas de code postal, on jette. Sinon on regarde les 2 premiers chiffres.
        if (!postcode) return false;
        const deptCode = postcode.substring(0, 2);
        return OCCITANIE_DEPTS.includes(deptCode);
      });

      // 3. On ne garde que les 5 meilleurs résultats locaux
      setSuggestions(filteredResults.slice(0, 5));

    } catch (error) {
      console.error("Erreur adresse:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (item) => {
    const fullAddress = item.properties.label;
    setQuery(fullAddress);
    setShowResults(false);
    setSuggestions([]);
    if (onSelect) onSelect(fullAddress);
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        <Ionicons name={icon || "location-outline"} size={20} color="#666" style={styles.icon} />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          value={query}
          onChangeText={searchAddress}
          onFocus={() => query.length >= 3 && setShowResults(true)}
        />
        {loading && <ActivityIndicator size="small" color="#FF6B00" />}
        {query.length > 0 && (
          <TouchableOpacity onPress={() => { setQuery(''); onSelect(''); setShowResults(false); }}>
            <Ionicons name="close-circle" size={18} color="#CCC" />
          </TouchableOpacity>
        )}
      </View>

      {showResults && suggestions.length > 0 && (
        <View style={styles.suggestionsBox}>
          {suggestions.map((item) => (
            <TouchableOpacity 
              key={item.properties.id} 
              style={styles.suggestionItem}
              onPress={() => handleSelect(item)}
            >
              <Ionicons name="navigate-circle-outline" size={18} color="#FF6B00" />
              <View style={{marginLeft: 10}}>
                <Text style={styles.mainText}>{item.properties.name}</Text>
                <Text style={styles.subText}>{item.properties.city} ({item.properties.postcode})</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { zIndex: 1, marginBottom: 15 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF',
    borderRadius: 12, paddingHorizontal: 15, paddingVertical: 12,
    borderWidth: 1, borderColor: '#EEE', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, elevation: 1
  },
  icon: { marginRight: 5 },
  input: { flex: 1, marginLeft: 5, fontSize: 16, color: '#333' },
  suggestionsBox: {
    position: 'absolute', top: 50, left: 0, right: 0,
    backgroundColor: '#FFF', borderRadius: 10, elevation: 5,
    borderWidth: 1, borderColor: '#EEE', maxHeight: 200, zIndex: 1000
  },
  suggestionItem: {
    flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#F5F5F5'
  },
  mainText: { fontWeight: '600', color: '#333' },
  subText: { fontSize: 12, color: '#888' }
});