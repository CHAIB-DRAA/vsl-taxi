import React from 'react';
import { View, Text, FlatList, Button } from 'react-native';
import styles from '../styles/styles';

const RideHistory = ({ rides, onStart, onFinish }) => {
  // Fonction utilitaire pour formater date et heure
  const formatDateTime = (date) => {
    if (!date) return null;
    const d = new Date(date);
    return d.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Rendu d'un élément de la liste
  const renderRide = ({ item, index }) => (
    <View style={styles.ride}>
      <Text style={{ fontWeight: 'bold' }}>Patient : {item.patientName}</Text>
      <Text>Date & heure : {formatDateTime(item.date) || 'Non renseignée'}</Text>
      <Text>Départ : {item.startLocation}</Text>
      <Text>Arrivée : {item.endLocation}</Text>
      <Text>Type : {item.type}</Text>
      <Text>
        Début de la course : {formatDateTime(item.startTime) || 'Non démarrée'}
      </Text>
      <Text>
        Fin de la course : {formatDateTime(item.endTime) || 'Non terminée'}
      </Text>
      <Text>
        Distance parcourue : {item.distance ? `${item.distance} km` : 'Non renseignée'}
      </Text>

      <View style={styles.buttonContainer}>
        {!item.startTime && (
          <Button title="Démarrer la course" onPress={() => onStart(index)} />
        )}
        {item.startTime && !item.endTime && (
          <Button title="Finir la course" onPress={() => onFinish(index)} />
        )}
      </View>
    </View>
  );

  return (
    <View>
      {rides.length === 0 ? (
        <Text style={{ textAlign: 'center', marginTop: 10 }}>
          Aucune course enregistrée pour le moment.
        </Text>
      ) : (
        <FlatList
          data={rides}
          renderItem={renderRide}
          keyExtractor={(item, index) => item._id ?? index.toString()}
        />
      )}
    </View>
  );
};

export default RideHistory;
