import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import moment from 'moment';

const typeColors = {
  Aller: '#FF5722',
  Retour: '#4CAF50',
  autre: '#2196F3',
};

const RideCard = ({ ride, onPress, onShare, onRespond }) => {
  const isFinished = !!ride.endTime;

  return (
    <View style={{ marginBottom: 15 }}>
      <TouchableOpacity
        onPress={() => !ride.isShared && onPress(ride)}
        disabled={isFinished || ride.isShared}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <View
            style={{
              width: 12,
              height: 12,
              borderRadius: 6,
              backgroundColor: typeColors[ride.type] || typeColors.autre,
              marginTop: 8,
              marginRight: 15,
            }}
          />
          <View
            style={{
              flex: 1,
              backgroundColor: isFinished ? '#e0e0e0' : '#fff',
              padding: 15,
              borderRadius: 12,
              shadowColor: '#000',
              shadowOpacity: 0.1,
              shadowOffset: { width: 0, height: 2 },
              shadowRadius: 5,
              elevation: 3,
            }}
          >
            {isFinished && (
              <View
                style={{
                  position: 'absolute',
                  top: 10,
                  right: 10,
                  backgroundColor: '#4CAF50',
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 4,
                  zIndex: 10,
                }}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>Terminée</Text>
              </View>
            )}

            <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 5, color: isFinished ? '#777' : '#000' }}>
              {ride.patientName}
              {ride.isShared && <Text style={{ fontSize: 12, color: '#FF5722', fontWeight: 'bold' }}> (Partagée)</Text>}
            </Text>

            <Text style={{ color: isFinished ? '#777' : '#555', marginBottom: 3 }}>Départ : {ride.startLocation}</Text>
            <Text style={{ color: isFinished ? '#777' : '#555', marginBottom: 3 }}>Arrivée : {ride.endLocation}</Text>
            <Text style={{ color: isFinished ? '#777' : '#555', marginBottom: 3 }}>
              Heure : {ride.date ? moment(ride.date).format('HH:mm') : ''}
            </Text>
            <Text style={{ color: isFinished ? '#777' : '#555', fontStyle: 'italic' }}>Type : {ride.type}</Text>

            {/* Boutons Accepter / Refuser pour courses partagées non acceptées */}
            {ride.isShared && (ride.status === 'pending' || ride.status === undefined) && onRespond && (
              <View style={{ flexDirection: 'row', marginTop: 10, justifyContent: 'space-between' }}>
                <TouchableOpacity
                  onPress={() => onRespond(ride._id, 'accepted')}
                  style={{ flex: 1, backgroundColor: '#4CAF50', padding: 8, borderRadius: 6, marginRight: 5, alignItems: 'center' }}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Accepter</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => onRespond(ride._id, 'refused')}
                  style={{ flex: 1, backgroundColor: 'red', padding: 8, borderRadius: 6, marginLeft: 5, alignItems: 'center' }}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Refuser</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Bouton Partager pour courses non partagées */}
            {!ride.isShared && onShare && (
              <TouchableOpacity
                style={{ marginTop: 8, backgroundColor: '#25D366', padding: 8, borderRadius: 6, alignItems: 'center' }}
                onPress={() => onShare(ride)}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Partager</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
};

export default RideCard;
