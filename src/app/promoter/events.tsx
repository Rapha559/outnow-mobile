import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/lib/api';

type EventItem = {
  id: string;
  title: string;
  date: string;
  venue: string;
  location: string;
  status: string;
  category: string;
  capacity: number;
  ticketsSold: number;
  revenue: number;
};

type DashboardResponse = { success: true; events: EventItem[] };

export default function PromoterEventsScreen() {
  const { user, sessionToken } = useAuth();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (refresh = false) => {
    if (!sessionToken || user?.role !== 'PROMOTER') return;
    try {
      refresh ? setRefreshing(true) : setLoading(true);
      setError('');
      const data = await apiRequest<DashboardResponse>('/api/mobile/promoter/dashboard', {}, sessionToken);
      setEvents(data.events || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load events.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sessionToken, user?.role]);

  useEffect(() => { void load(); }, [load]);

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor="#fff" />}>
          <View style={styles.topBar}>
            <Pressable style={styles.back} onPress={() => router.back()}><Text style={styles.backText}>‹</Text></Pressable>
            <Text style={styles.topTitle}>Events</Text>
            <Pressable style={styles.add} onPress={() => router.push('/promoter/create-event')}><Text style={styles.addText}>＋</Text></Pressable>
          </View>

          <Text style={styles.eyebrow}>PROMOTER PORTAL</Text>
          <Text style={styles.title}>Your Events</Text>
          <Text style={styles.copy}>Track status, ticket sales and revenue for every event.</Text>

          {loading ? (
            <View style={styles.state}><ActivityIndicator size="large" color="#8b5cf6" /></View>
          ) : error ? (
            <View style={styles.state}><Text style={styles.error}>{error}</Text></View>
          ) : events.length === 0 ? (
            <View style={styles.state}>
              <Text style={styles.emptyTitle}>No events yet</Text>
              <Text style={styles.emptyCopy}>Create your first event from the OutNow mobile app.</Text>
              <Pressable style={styles.primary} onPress={() => router.push('/promoter/create-event')}><Text style={styles.primaryText}>Create event</Text></Pressable>
            </View>
          ) : (
            <View style={styles.list}>
              {events.map((event) => (
                <View key={event.id} style={styles.card}>
                  <Text style={styles.status}>{event.status.replace(/_/g, ' ')}</Text>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <Text style={styles.meta}>{new Date(event.date).toLocaleDateString('en-GB')} · {event.venue}</Text>
                  <View style={styles.row}>
                    <Text style={styles.metric}>{event.ticketsSold}/{event.capacity} sold</Text>
                    <Text style={styles.revenue}>£{event.revenue.toFixed(2)}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#07070a' },
  safeArea: { flex: 1 },
  content: { paddingHorizontal: 18 },
  topBar: { height: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: '#292932', backgroundColor: '#15151b', alignItems: 'center', justifyContent: 'center' },
  backText: { color: '#fff', fontSize: 34, lineHeight: 36, marginTop: -3 },
  topTitle: { color: '#fff', fontSize: 15, fontWeight: '800' },
  add: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center' },
  addText: { color: '#fff', fontSize: 24, fontWeight: '700', marginTop: -2 },
  eyebrow: { color: '#a78bfa', fontSize: 11, fontWeight: '900', letterSpacing: 1.8, marginTop: 16 },
  title: { color: '#fff', fontSize: 34, fontWeight: '900', marginTop: 8 },
  copy: { color: '#92929d', fontSize: 14, lineHeight: 21, marginTop: 8 },
  state: { minHeight: 240, marginTop: 26, borderRadius: 20, borderWidth: 1, borderColor: '#23232c', backgroundColor: '#101014', alignItems: 'center', justifyContent: 'center', padding: 24 },
  error: { color: '#fb7185', textAlign: 'center' },
  emptyTitle: { color: '#fff', fontSize: 19, fontWeight: '900' },
  emptyCopy: { color: '#8b8b95', textAlign: 'center', marginTop: 7, lineHeight: 20 },
  primary: { height: 48, borderRadius: 14, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22, marginTop: 18 },
  primaryText: { color: '#fff', fontWeight: '900' },
  list: { gap: 11, marginTop: 26 },
  card: { borderRadius: 18, borderWidth: 1, borderColor: '#23232c', backgroundColor: '#101014', padding: 16 },
  status: { color: '#a78bfa', fontSize: 9, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  eventTitle: { color: '#fff', fontSize: 18, fontWeight: '900', marginTop: 6 },
  meta: { color: '#868691', fontSize: 12, marginTop: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#2a2a32', marginTop: 14, paddingTop: 12 },
  metric: { color: '#aaaab3', fontSize: 12, fontWeight: '700' },
  revenue: { color: '#fff', fontSize: 13, fontWeight: '900' },
});
