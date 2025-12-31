import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Dimensions 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
// J'ai retiré l'import LinearGradient qui causait l'erreur
import moment from 'moment';
import 'moment/locale/fr';

import { getRides } from '../services/api';

export default function HomeScreen({ navigation }) {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    todayCount: 0,
    weekEarnings: 0,
    nextRide: null
  });

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getRides();
      
      const today = moment().format('YYYY-MM-DD');
      const todayRides = data.filter(r => moment(r.date).format('YYYY-MM-DD') === today);
      const now = moment();
      const upcoming = todayRides
        .filter(r => moment(r.date).isAfter(now))
        .sort((a, b) => new Date(a.date) - new Date(b.date))[0];

      setRides(todayRides);
      setStats({
        todayCount: todayRides.length,
        weekEarnings: todayRides.length * 45, // Estimation
        nextRide: upcoming
      });

    } catch (error) {
      console.error("Dashboard Error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadDashboard} tintColor="#FF6B00"/>}
      >
        {/* HEADER SIMPLE (Remplacement du Gradient) */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>Bonjour,</Text>
              <Text style={styles.date}>{moment().format('dddd D MMMM')}</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.avatarBtn}>
              <Ionicons name="person" size={20} color="#FF6B00" />
            </TouchableOpacity>
          </View>

          {/* STATS CARDS */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Aujourd'hui</Text>
              <Text style={styles.statValue}>{stats.todayCount}</Text>
              <Text style={styles.statSub}>Courses</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Estim. Gains</Text>
              <Text style={styles.statValue}>{stats.weekEarnings}€</Text>
              <Text style={styles.statSub}>Net (approx)</Text>
            </View>
          </View>
        </View>

        {/* SECTION PROCHAINE COURSE */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Prochain Départ</Text>
          {stats.nextRide ? (
            <View style={styles.nextRideCard}>
              <View style={styles.nextRideHeader}>
                <Text style={styles.nextTime}>{moment(stats.nextRide.date).format('HH:mm')}</Text>
                <View style={styles.liveBadge}>
                  <View style={styles.dot} />
                  <Text style={styles.liveText}>À venir</Text>
                </View>
              </View>
              <Text style={styles.patientName}>{stats.nextRide.patientName}</Text>
              
              <View style={styles.routeRow}>
                <Ionicons name="location" size={16} color="#4CAF50" />
                <Text style={styles.routeText} numberOfLines={1}>{stats.nextRide.startLocation}</Text>
              </View>
              <View style={styles.routeLine} />
              <View style={styles.routeRow}>
                <Ionicons name="flag" size={16} color="#FF6B00" />
                <Text style={styles.routeText} numberOfLines={1}>{stats.nextRide.endLocation}</Text>
              </View>

              <TouchableOpacity 
                style={styles.goBtn}
                onPress={() => navigation.navigate('Agenda')}
              >
                <Text style={styles.goBtnText}>Voir détails</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFF" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Ionicons name="bed-outline" size={40} color="#CCC" />
              <Text style={styles.emptyText}>Aucune course à venir aujourd'hui.</Text>
            </View>
          )}
        </View>

        {/* MENU RAPIDE */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Accès Rapide</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Agenda')}>
              <View style={[styles.iconBox, { backgroundColor: '#E3F2FD' }]}>
                <Ionicons name="calendar" size={24} color="#1565C0" />
              </View>
              <Text style={styles.actionText}>Planning</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Contact')}>
              <View style={[styles.iconBox, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="people" size={24} color="#2E7D32" />
              </View>
              <Text style={styles.actionText}>Collègues</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Settings')}>
              <View style={[styles.iconBox, { backgroundColor: '#FFF3E0' }]}>
                <Ionicons name="stats-chart" size={24} color="#EF6C00" />
              </View>
              <Text style={styles.actionText}>Stats</Text>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  // MODIFICATION : Style Header simple (couleur unie)
  header: { 
    backgroundColor: '#FF6B00', // Couleur unie Orange VSL
    padding: 20, 
    paddingTop: 60, 
    borderBottomLeftRadius: 30, 
    borderBottomRightRadius: 30, 
    paddingBottom: 40 
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greeting: { color: 'rgba(255,255,255,0.8)', fontSize: 16 },
  date: { color: '#FFF', fontSize: 22, fontWeight: 'bold', textTransform: 'capitalize' },
  avatarBtn: { width: 40, height: 40, backgroundColor: '#FFF', borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statCard: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 15, padding: 15, width: '48%', alignItems: 'center' },
  statLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginBottom: 5 },
  statValue: { color: '#FFF', fontSize: 24, fontWeight: 'bold' },
  statSub: { color: 'rgba(255,255,255,0.6)', fontSize: 10 },
  section: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  nextRideCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  nextRideHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  nextTime: { fontSize: 28, fontWeight: 'bold', color: '#333' },
  liveBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5E9', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 10 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4CAF50', marginRight: 5 },
  liveText: { color: '#2E7D32', fontWeight: 'bold', fontSize: 12 },
  patientName: { fontSize: 18, color: '#555', marginBottom: 15 },
  routeRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 2 },
  routeText: { marginLeft: 10, color: '#333', flex: 1 },
  routeLine: { height: 15, width: 1, backgroundColor: '#DDD', marginLeft: 7.5, marginVertical: 2 },
  goBtn: { marginTop: 15, backgroundColor: '#FF6B00', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 12, borderRadius: 10 },
  goBtnText: { color: '#FFF', fontWeight: 'bold', marginRight: 5 },
  emptyCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 30, alignItems: 'center', borderStyle: 'dashed', borderWidth: 2, borderColor: '#EEE' },
  emptyText: { color: '#999', marginTop: 10 },
  quickActions: { flexDirection: 'row', justifyContent: 'space-between' },
  actionBtn: { width: '30%', backgroundColor: '#FFF', padding: 15, borderRadius: 15, alignItems: 'center', elevation: 2 },
  iconBox: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  actionText: { fontWeight: '600', color: '#555', fontSize: 12 }
});