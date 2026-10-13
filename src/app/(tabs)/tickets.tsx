import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/auth-context';
import { API_BASE, apiRequest } from '@/lib/api';

type MobileTicket = {
  id: string;
  ticketNumber: string;
  status: string;
  attendeeName?: string | null;
  attendeeEmail?: string | null;
  qrCode: string;
  qrDataUrl: string;
  ticketType: { id: string; name: string; price: number };
  order: { id: string; orderNumber: string; status: string; total: number };
  event: {
    id: string;
    title: string;
    date: string;
    endDate?: string | null;
    venue: string;
    location: string;
    image?: string | null;
    status: string;
  };
};

function imageUrl(value?: string | null) {
  if (!value) return `${API_BASE}/images/event-placeholder.jpg`;
  if (/^https?:\/\//i.test(value)) return value;
  return `${API_BASE}${value.startsWith('/') ? value : `/${value}`}`;
}

export default function TicketsScreen() {
  const { loading: authLoading, isAuthenticated, sessionToken } = useAuth();
  const [tickets, setTickets] = useState<MobileTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  async function loadTickets(refresh = false) {
    if (!sessionToken) return;
    try {
      refresh ? setRefreshing(true) : setLoading(true);
      setError('');
      const data = await apiRequest<{ success: true; tickets: MobileTicket[] }>(
        '/api/mobile/tickets',
        {},
        sessionToken,
      );
      setTickets(data.tickets || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load your tickets.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (sessionToken) void loadTickets();
    else setTickets([]);
  }, [sessionToken]);

  if (authLoading) {
    return <View style={styles.screen}><SafeAreaView style={styles.center}><ActivityIndicator size="large" color="#8b5cf6" /></SafeAreaView></View>;
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={isAuthenticated ? <RefreshControl refreshing={refreshing} onRefresh={() => void loadTickets(true)} tintColor="#fff" /> : undefined}>
          <Text style={styles.eyebrow}>YOUR OUTNOW</Text>
          <Text style={styles.title}>My Tickets</Text>
          <Text style={styles.copy}>Your purchased tickets and live entry QR codes are stored here.</Text>

          {!isAuthenticated ? (
            <View style={styles.stateCard}>
              <View style={styles.iconCircle}><Text style={styles.icon}>🎟</Text></View>
              <Text style={styles.cardTitle}>Sign in to see your tickets</Text>
              <Text style={styles.cardCopy}>Use the same OutNow account you used when purchasing.</Text>
              <Pressable style={styles.primary} onPress={() => router.push('/login')}><Text style={styles.primaryText}>Sign in</Text></Pressable>
              <Pressable style={styles.secondary} onPress={() => router.push('/signup')}><Text style={styles.secondaryText}>Create account</Text></Pressable>
            </View>
          ) : loading ? (
            <View style={styles.stateCard}><ActivityIndicator size="large" color="#8b5cf6" /><Text style={styles.cardCopy}>Loading your tickets…</Text></View>
          ) : error ? (
            <View style={styles.stateCard}>
              <Text style={styles.cardTitle}>Couldn't load tickets</Text>
              <Text style={styles.cardCopy}>{error}</Text>
              <Pressable style={styles.primary} onPress={() => void loadTickets()}><Text style={styles.primaryText}>Try again</Text></Pressable>
            </View>
          ) : tickets.length === 0 ? (
            <View style={styles.stateCard}>
              <View style={styles.iconCircle}><Text style={styles.icon}>🎟</Text></View>
              <Text style={styles.cardTitle}>No tickets yet</Text>
              <Text style={styles.cardCopy}>After your Stripe payment is confirmed, your ticket will appear here automatically.</Text>
              <Pressable style={styles.primary} onPress={() => router.push('/(tabs)/explore')}><Text style={styles.primaryText}>Explore events</Text></Pressable>
            </View>
          ) : (
            <View style={styles.ticketList}>
              {tickets.map((ticket) => {
                const eventDate = new Date(ticket.event.date);
                const dateText = Number.isNaN(eventDate.getTime())
                  ? ticket.event.date
                  : new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(eventDate);
                const valid = ticket.status === 'VALID';

                return (
                  <View key={ticket.id} style={styles.ticketCard}>
                    <Image source={{ uri: imageUrl(ticket.event.image) }} style={styles.eventImage} contentFit="cover" />
                    <View style={styles.ticketBody}>
                      <View style={styles.statusRow}>
                        <Text style={styles.typeLabel}>{ticket.ticketType.name}</Text>
                        <View style={[styles.statusPill, !valid && styles.statusPillMuted]}><Text style={styles.statusText}>{ticket.status}</Text></View>
                      </View>
                      <Text style={styles.eventTitle}>{ticket.event.title}</Text>
                      <Text style={styles.meta}>{dateText}</Text>
                      <Text style={styles.meta}>{ticket.event.venue} · {ticket.event.location}</Text>

                      <View style={styles.qrWrap}>
                        <Image source={{ uri: ticket.qrDataUrl }} style={styles.qrImage} contentFit="contain" />
                      </View>
                      <Text style={styles.ticketNumber}>{ticket.ticketNumber}</Text>
                      <Text style={styles.orderNumber}>Order {ticket.order.orderNumber}</Text>
                      <Text style={styles.scanNote}>Show this QR code at the entrance. Do not share it publicly.</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
          <View style={{ height: 120 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#07070a' },
  safeArea: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 18, paddingTop: 16 },
  eyebrow: { color: '#a78bfa', fontSize: 11, fontWeight: '900', letterSpacing: 1.8 },
  title: { color: '#fff', fontSize: 34, lineHeight: 39, fontWeight: '900', marginTop: 10 },
  copy: { color: '#92929d', fontSize: 15, lineHeight: 22, marginTop: 8, maxWidth: 360 },
  stateCard: { marginTop: 30, minHeight: 260, borderRadius: 22, borderWidth: 1, borderColor: '#202028', backgroundColor: '#101014', alignItems: 'center', justifyContent: 'center', padding: 28 },
  iconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#191522', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  icon: { fontSize: 30 },
  cardTitle: { color: '#fff', fontSize: 20, fontWeight: '900', textAlign: 'center' },
  cardCopy: { color: '#8d8d98', textAlign: 'center', lineHeight: 21, marginTop: 10 },
  primary: { minWidth: 190, height: 50, borderRadius: 15, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center', marginTop: 20, paddingHorizontal: 18 },
  primaryText: { color: '#fff', fontWeight: '900' },
  secondary: { minWidth: 190, height: 48, borderRadius: 15, borderWidth: 1, borderColor: '#2c2c36', alignItems: 'center', justifyContent: 'center', marginTop: 9 },
  secondaryText: { color: '#fff', fontWeight: '800' },
  ticketList: { marginTop: 28, gap: 18 },
  ticketCard: { borderRadius: 24, borderWidth: 1, borderColor: '#252530', backgroundColor: '#101014', overflow: 'hidden' },
  eventImage: { width: '100%', height: 150, backgroundColor: '#17171d' },
  ticketBody: { padding: 18 },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  typeLabel: { color: '#c4b5fd', fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  statusPill: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, backgroundColor: '#143522' },
  statusPillMuted: { backgroundColor: '#292930' },
  statusText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  eventTitle: { color: '#fff', fontSize: 23, lineHeight: 28, fontWeight: '900', marginTop: 11 },
  meta: { color: '#9696a1', fontSize: 12, lineHeight: 18, marginTop: 4 },
  qrWrap: { alignSelf: 'center', backgroundColor: '#fff', borderRadius: 18, padding: 12, marginTop: 22 },
  qrImage: { width: 220, height: 220 },
  ticketNumber: { color: '#fff', textAlign: 'center', fontSize: 13, fontWeight: '900', letterSpacing: 1, marginTop: 14 },
  orderNumber: { color: '#777783', textAlign: 'center', fontSize: 10, marginTop: 4 },
  scanNote: { color: '#7c7c87', textAlign: 'center', fontSize: 10, lineHeight: 15, marginTop: 12 },
});
