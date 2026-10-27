import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/lib/api';

type Assignment = {
  id: string;
  role: 'SCANNER' | 'MANAGER' | 'BOX_OFFICE' | 'CHECK_IN';
  permissions: { sellTickets:boolean; checkIn:boolean; viewAttendees:boolean; viewDoorSales:boolean; issueComplimentary:boolean };
  event: {
    id: string;
    title: string;
    date: string;
    endDate: string | null;
    venue: string;
    location: string;
    status: string;
    organiser: string;
  };
};

type StaffAccessResponse = {
  success: true;
  hasScannerAccess: boolean;
  assignments: Assignment[];
};

const eventDate = (value: string) =>
  new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));

export default function StaffHomeScreen() {
  const { user, sessionToken, loading: authLoading } = useAuth();
  const dark = useColorScheme() === 'dark';
  const [data, setData] = useState<StaffAccessResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const colors = useMemo(
    () => ({
      bg: dark ? '#080b12' : '#fff',
      card: dark ? '#11151f' : '#fff',
      soft: dark ? '#171c27' : '#f9fafb',
      border: dark ? '#252b38' : '#e5e7eb',
      text: dark ? '#f9fafb' : '#111827',
      sub: dark ? '#9ca3af' : '#6b7280',
    }),
    [dark],
  );

  const load = useCallback(async (refresh = false) => {
    if (!sessionToken) {
      setLoading(false);
      return;
    }
    try {
      refresh ? setRefreshing(true) : setLoading(true);
      setError('');
      setData(await apiRequest<StaffAccessResponse>('/api/mobile/staff/access', {}, sessionToken));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load staff access.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sessionToken]);

  useEffect(() => {
    if (!authLoading) void load();
  }, [authLoading, load]);

  function goBackSafely() {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    if (user?.role === 'PROMOTER') {
      router.replace('/promoter/dashboard');
      return;
    }

    router.replace('/(tabs)/profile');
  }

  if (authLoading || loading) {
    return <View style={[styles.screen, { backgroundColor: colors.bg }]}><SafeAreaView style={styles.center}><ActivityIndicator size="large" color="#7c3aed" /></SafeAreaView></View>;
  }

  if (!user) {
    return <View style={[styles.screen, { backgroundColor: colors.bg }]}><SafeAreaView style={styles.center}><Text style={[styles.title, { color: colors.text }]}>Sign in required</Text><Pressable style={styles.primary} onPress={() => router.replace('/login')}><Text style={styles.primaryText}>Sign in</Text></Pressable></SafeAreaView></View>;
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor="#7c3aed" />}>
          <View style={styles.top}>
            <Pressable style={[styles.circle, { borderColor: colors.border, backgroundColor: colors.soft }]} onPress={goBackSafely}><Text style={[styles.back, { color: colors.text }]}>‹</Text></Pressable>
            <Text style={[styles.topTitle, { color: colors.text }]}>Staff Scanner</Text>
            <View style={{ width: 40 }} />
          </View>

          <Text style={styles.eyebrow}>DOOR TEAM</Text>
          <Text style={[styles.title, { color: colors.text }]}>Your assigned events</Text>
          <Text style={[styles.copy, { color: colors.sub }]}>You only see the event tools a promoter has assigned to your account.</Text>

          {!!error && <View style={styles.error}><Text style={styles.errorText}>{error}</Text></View>}

          {!data?.hasScannerAccess ? (
            <View style={[styles.empty, { borderColor: colors.border, backgroundColor: colors.soft }]}>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No scanner access</Text>
              <Text style={[styles.emptyCopy, { color: colors.sub }]}>A promoter must assign you to an event before you can use the scanner.</Text>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {data.assignments.map((assignment) => (
                <View key={assignment.id} style={[styles.eventCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.row}>
                    <View style={styles.scanBadge}><Text style={styles.scanBadgeText}>{assignment.role.replace('_',' ')}</Text></View>
                    <Text style={[styles.status, { color: colors.sub }]}>{assignment.event.status.replaceAll('_', ' ')}</Text>
                  </View>
                  <Text style={[styles.eventTitle, { color: colors.text }]}>{assignment.event.title}</Text>
                  <Text style={[styles.organiser, { color: colors.sub }]}>{assignment.event.organiser}</Text>
                  <Text style={[styles.meta, { color: colors.sub }]}>{eventDate(assignment.event.date)}</Text>
                  <Text style={[styles.meta, { color: colors.sub }]}>{assignment.event.venue} · {assignment.event.location}</Text>
                  {assignment.permissions.checkIn&&<Pressable style={[styles.openScanner, { backgroundColor: dark ? '#24143d' : '#f5f3ff' }]} onPress={() => router.push({ pathname: '/promoter/scanner', params: { eventId: assignment.event.id, staff: '1' } })}><Text style={styles.openScannerText}>Open scanner →</Text></Pressable>}
                  {assignment.permissions.sellTickets&&<Pressable style={styles.boxOffice} onPress={() => router.push({ pathname: '/promoter/box-office', params: { eventId: assignment.event.id } })}><Text style={styles.boxOfficeText}>Open Box Office →</Text></Pressable>}
                </View>
              ))}
            </View>
          )}
          <View style={{ height: 60 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  content: { paddingHorizontal: 18 },
  top: { height: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  circle: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  back: { fontSize: 34, lineHeight: 36, marginTop: -3 },
  topTitle: { fontWeight: '900' },
  eyebrow: { color: '#7c3aed', fontSize: 10, fontWeight: '900', letterSpacing: 1.8, marginTop: 12 },
  title: { fontSize: 31, fontWeight: '900', marginTop: 8 },
  copy: { fontSize: 13, lineHeight: 20, marginTop: 7, marginBottom: 20 },
  eventCard: { borderWidth: 1, borderRadius: 20, padding: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  scanBadge: { backgroundColor: '#ede9fe', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  scanBadgeText: { color: '#6d28d9', fontSize: 8, fontWeight: '900' },
  status: { fontSize: 8, fontWeight: '800' },
  eventTitle: { fontSize: 18, fontWeight: '900', marginTop: 12 },
  organiser: { fontSize: 11, fontWeight: '700', marginTop: 4 },
  meta: { fontSize: 10, lineHeight: 16, marginTop: 6 },
  openScanner: { minHeight: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  openScannerText: { color: '#7c3aed', fontSize: 11, fontWeight: '900' },
  boxOffice:{ minHeight:42,borderRadius:12,alignItems:'center',justifyContent:'center',marginTop:8,backgroundColor:'#7c3aed' }, boxOfficeText:{color:'#fff',fontSize:11,fontWeight:'900'},
  empty: { minHeight: 180, borderWidth: 1, borderRadius: 20, alignItems: 'center', justifyContent: 'center', padding: 22 },
  emptyTitle: { fontSize: 18, fontWeight: '900' },
  emptyCopy: { fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 7 },
  primary: { backgroundColor: '#7c3aed', borderRadius: 14, minHeight: 48, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  primaryText: { color: '#fff', fontWeight: '900' },
  error: { borderRadius: 14, backgroundColor: '#fef2f2', padding: 12, marginBottom: 14 },
  errorText: { color: '#b91c1c', fontSize: 11 },
});
