import * as Calendar from 'expo-calendar';
import { Platform, Alert } from 'react-native';
import moment from 'moment';

// 1. Demander la permission d'accès au calendrier
async function getCalendarPermissions() {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  return status === 'granted';
}

// 2. Trouver le bon calendrier (Google sur Android, iCloud/Local sur iOS)
async function getSystemCalendarId() {
  try {
    if (Platform.OS === 'ios') {
      const defaultCalendar = await Calendar.getDefaultCalendarAsync();
      return defaultCalendar.id;
    } else {
      // Sur Android, on cherche le calendrier principal (souvent lié au compte Google)
      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const mainCalendar = calendars.find(c => c.accessLevel === Calendar.CalendarAccessLevel.OWNER && c.isPrimary);
      return mainCalendar ? mainCalendar.id : calendars[0]?.id;
    }
  } catch (e) {
    console.error("Erreur Calendar ID:", e);
    return null;
  }
}

// 3. Créer un événement unique (Fonction interne)
async function createSingleEvent(calendarId, ride) {
  const startDate = new Date(ride.startTime || ride.date);
  
  // Durée par défaut 45min si pas d'heure de fin définie
  const endDate = ride.endTime 
    ? new Date(ride.endTime) 
    : moment(startDate).add(45, 'minutes').toDate();

  const eventDetails = {
    title: `🚕 ${ride.patientName} (${ride.type})`,
    startDate: startDate,
    endDate: endDate,
    timeZone: 'Europe/Paris',
    location: `${ride.startLocation} ➔ ${ride.endLocation}`,
    notes: `Tel: ${ride.patientPhone || 'N/A'}\nType: ${ride.type}\nStatut: ${ride.status}`,
    alarms: [{ relativeOffset: -30 }] // Rappel 30 min avant
  };

  await Calendar.createEventAsync(calendarId, eventDetails);
}

// 4. FONCTION PRINCIPALE (Celle qui manquait !)
// Elle prend une liste de courses et les ajoute toutes
export async function syncDailyRidesToCalendar(ridesList) {
  if (!ridesList || ridesList.length === 0) {
    return Alert.alert("Info", "Aucune course à synchroniser.");
  }

  const hasPermission = await getCalendarPermissions();
  if (!hasPermission) {
    return Alert.alert("Erreur", "Permission calendrier refusée. Allez dans les réglages.");
  }

  const calendarId = await getSystemCalendarId();
  if (!calendarId) {
    return Alert.alert("Erreur", "Aucun calendrier trouvé sur le téléphone.");
  }

  Alert.alert(
    "Synchroniser l'agenda",
    `Ajouter ces ${ridesList.length} courses à votre calendrier Google/Système ?`,
    [
      { text: "Annuler", style: "cancel" },
      { 
        text: "Confirmer", 
        onPress: async () => {
          let successCount = 0;
          try {
            for (const ride of ridesList) {
              await createSingleEvent(calendarId, ride);
              successCount++;
            }
            Alert.alert("Succès", `${successCount} courses ajoutées à l'agenda ! 📅`);
          } catch (error) {
            console.error(error);
            Alert.alert("Erreur", "Problème lors de la synchronisation.");
          }
        }
      }
    ]
  );
}