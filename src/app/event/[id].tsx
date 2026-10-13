import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const API_BASE = 'https://www.outnowtickets.com';

type TicketType = {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  quantity: number;
  sold: number;
  maxPerOrder?: number | null;
  isActive: boolean;
};

type EventDetails = {
  id: string;
  title: string;
  date: string;
  venue: string;
  location: string;
  image?: string | null;
  category: { name: string };
  ticketTypes: TicketType[];
};

function imageUrl(value?: string | null) {
  if (!value) return `${API_BASE}/images/event-placeholder.jpg`;
  if (/^https?:\/\//i.test(value)) return value;
  return `${API_BASE}${value.startsWith('/') ? value : `/${value}`}`;
}

export default function EventDetailsScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [event, setEvent] = useState<EventDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;

    fetch(`${API_BASE}/api/events/${id}/tickets`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || 'Unable to load this event.');
        setEvent(data.event ?? null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load this event.'))
      .finally(() => setLoading(false));
  }, [id]);

  const startingPrice = useMemo(() => {
    if (!event?.ticketTypes?.length) return null;
    return Math.min(...event.ticketTypes.map((ticket) => ticket.price));
  }, [event]);

  const formattedDate = useMemo(() => {
    if (!event?.date) return '';
    const date = new Date(event.date);
    if (Number.isNaN(date.getTime())) return event.date;
    return new Intl.DateTimeFormat('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }, [event?.date]);

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.topBar}>
          <Pressable style={styles.backButton} onPress={() => router.back()} accessibilityLabel="Go back">
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <Text style={styles.topTitle}>Event</Text>
          <View style={styles.topSpacer} />
        </View>

        {loading ? (
          <View style={styles.center}><ActivityIndicator size="large" color="#8b5cf6" /></View>
        ) : error || !event ? (
          <View style={styles.center}>
            <Text style={styles.errorTitle}>Event unavailable</Text>
            <Text style={styles.errorCopy}>{error || 'This event could not be found.'}</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content}>
            <Image source={{ uri: imageUrl(event.image) }} style={styles.heroImage} contentFit="cover" />

            <View style={styles.categoryPill}><Text style={styles.categoryText}>{event.category?.name || 'Event'}</Text></View>
            <Text style={styles.title}>{event.title}</Text>
            <Text style={styles.date}>{formattedDate}</Text>

            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>VENUE</Text>
              <Text style={styles.infoTitle}>{event.venue}</Text>
              <Text style={styles.infoCopy}>{event.location}</Text>
            </View>

            <View style={styles.headingRow}>
              <Text style={styles.heading}>Tickets</Text>
              {startingPrice !== null && <Text style={styles.startingPrice}>From £{startingPrice.toFixed(2)}</Text>}
            </View>

            {event.ticketTypes.length === 0 ? (
              <View style={styles.emptyTickets}>
                <Text style={styles.emptyTitle}>Tickets coming soon</Text>
                <Text style={styles.emptyCopy}>Ticket options have not been released for this event yet.</Text>
              </View>
            ) : (
              <View style={styles.ticketList}>
                {event.ticketTypes.map((ticket) => {
                  const remaining = Math.max(0, ticket.quantity - ticket.sold);
                  return (
                    <View key={ticket.id} style={styles.ticketCard}>
                      <View style={styles.ticketBody}>
                        <Text style={styles.ticketName}>{ticket.name}</Text>
                        {!!ticket.description && <Text style={styles.ticketDescription}>{ticket.description}</Text>}
                        <Text style={styles.remaining}>{remaining > 0 ? `${remaining} remaining` : 'Sold out'}</Text>
                      </View>
                      <Text style={styles.ticketPrice}>£{ticket.price.toFixed(2)}</Text>
                    </View>
                  );
                })}
              </View>
            )}

            <Pressable
              disabled={!event.ticketTypes.some((ticket) => ticket.quantity - ticket.sold > 0)}
              style={({ pressed }) => [
                styles.buyButton,
                !event.ticketTypes.some((ticket) => ticket.quantity - ticket.sold > 0) && styles.buyButtonDisabled,
                pressed && styles.pressed,
              ]}>
              <Text style={styles.buyText}>
                {event.ticketTypes.some((ticket) => ticket.quantity - ticket.sold > 0) ? 'Choose tickets' : 'Tickets unavailable'}
              </Text>
            </Pressable>

            <Text style={styles.note}>Secure checkout will use your existing OutNow payment flow.</Text>
            <View style={{ height: 40 }} />
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#07070a' },
  safeArea: { flex: 1 },
  topBar: { height: 58, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#15151b', borderWidth: 1, borderColor: '#292932', alignItems: 'center', justifyContent: 'center' },
  backText: { color: '#fff', fontSize: 34, lineHeight: 36, marginTop: -3 },
  topTitle: { color: '#fff', fontSize: 15, fontWeight: '800' },
  topSpacer: { width: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 10 },
  errorTitle: { color: '#fff', fontSize: 20, fontWeight: '900' },
  errorCopy: { color: '#8e8e99', textAlign: 'center', lineHeight: 20 },
  content: { paddingHorizontal: 18 },
  heroImage: { width: '100%', aspectRatio: 1.25, borderRadius: 22, backgroundColor: '#15151b' },
  categoryPill: { alignSelf: 'flex-start', marginTop: 20, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 999, backgroundColor: '#1b1624', borderWidth: 1, borderColor: '#392b4e' },
  categoryText: { color: '#c4b5fd', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.8 },
  title: { color: '#fff', fontSize: 32, lineHeight: 37, fontWeight: '900', marginTop: 12 },
  date: { color: '#a7a7b1', fontSize: 14, lineHeight: 21, marginTop: 9 },
  infoCard: { marginTop: 22, borderRadius: 18, borderWidth: 1, borderColor: '#23232c', backgroundColor: '#101014', padding: 17 },
  infoLabel: { color: '#8b5cf6', fontSize: 9, fontWeight: '900', letterSpacing: 1.4 },
  infoTitle: { color: '#fff', fontSize: 17, fontWeight: '800', marginTop: 7 },
  infoCopy: { color: '#8e8e99', fontSize: 13, marginTop: 4 },
  headingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 28, marginBottom: 12 },
  heading: { color: '#fff', fontSize: 22, fontWeight: '900' },
  startingPrice: { color: '#c4b5fd', fontWeight: '800', fontSize: 12 },
  emptyTickets: { borderRadius: 18, borderWidth: 1, borderColor: '#23232c', backgroundColor: '#101014', padding: 20 },
  emptyTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
  emptyCopy: { color: '#8e8e99', marginTop: 6, lineHeight: 19 },
  ticketList: { gap: 10 },
  ticketCard: { minHeight: 86, borderRadius: 17, borderWidth: 1, borderColor: '#23232c', backgroundColor: '#101014', padding: 15, flexDirection: 'row', alignItems: 'center', gap: 12 },
  ticketBody: { flex: 1 },
  ticketName: { color: '#fff', fontSize: 16, fontWeight: '900' },
  ticketDescription: { color: '#8e8e99', fontSize: 12, marginTop: 4 },
  remaining: { color: '#a78bfa', fontSize: 10, fontWeight: '800', marginTop: 7 },
  ticketPrice: { color: '#fff', fontSize: 18, fontWeight: '900' },
  buyButton: { height: 54, borderRadius: 16, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center', marginTop: 22 },
  buyButtonDisabled: { backgroundColor: '#24242b' },
  buyText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  pressed: { opacity: 0.82 },
  note: { color: '#72727e', fontSize: 11, textAlign: 'center', marginTop: 10 },
});
