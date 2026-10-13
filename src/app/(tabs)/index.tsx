import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const API_BASE = 'https://www.outnowtickets.com';

type EventItem = {
  id: string;
  title: string;
  date: string;
  location: string;
  venue: string;
  description: string;
  category: string;
  image: string;
  price: string;
};

function imageUrl(value?: string | null) {
  const clean = String(value || '').trim();
  if (!clean) return `${API_BASE}/images/event-placeholder.jpg`;

  const secure = /^http:\/\//i.test(clean)
    ? clean.replace(/^http:\/\//i, 'https://')
    : clean;

  if (/^https:\/\/res\.cloudinary\.com\//i.test(secure)) {
    return `${API_BASE}/api/mobile/media/image?url=${encodeURIComponent(secure)}`;
  }

  if (/^https:\/\//i.test(secure)) return secure;
  return `${API_BASE}${secure.startsWith('/') ? secure : `/${secure}`}`;
}

export default function HomeScreen() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  async function loadEvents(showRefresh = false) {
    try {
      if (showRefresh) setRefreshing(true);
      setError('');
      const response = await fetch(`${API_BASE}/api/events`);
      const data = await response.json();
      if (!response.ok || !data?.success) throw new Error(data?.message || 'Failed to load events.');
      setEvents(Array.isArray(data.events) ? data.events : []);
      setFailedImages({});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { void loadEvents(); }, []);

  const filteredEvents = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return events;
    return events.filter((event) =>
      [event.title, event.category, event.location, event.venue]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term)),
    );
  }, [events, query]);

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadEvents(true)} tintColor="#7c3aed" colors={['#7c3aed']} />}>
          <View style={styles.header}>
            <View>
              <Text style={styles.brand}>OUTNOW</Text>
              <Text style={styles.brandSub}>TICKETS</Text>
            </View>
            <Pressable style={styles.avatar} accessibilityRole="button" accessibilityLabel="Open profile" onPress={() => router.push('/profile')}>
              <Text style={styles.avatarText}>O</Text>
            </Pressable>
          </View>

          <View style={styles.hero}>
            <Text style={styles.eyebrow}>DISCOVER WHAT'S HAPPENING</Text>
            <Text style={styles.heroTitle}>Your next great night starts here.</Text>
            <Text style={styles.heroCopy}>Find concerts, nightlife, festivals and live experiences across the UK.</Text>
          </View>

          <Pressable style={styles.searchWrap} onPress={() => router.push('/explore')}>
            <Text style={styles.searchIcon}>⌕</Text>
            <TextInput value={query} onChangeText={setQuery} placeholder="Search events, venues or cities" placeholderTextColor="#9ca3af" style={styles.searchInput} autoCapitalize="none" returnKeyType="search" />
          </Pressable>

          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Upcoming events</Text>
              <Text style={styles.sectionSubtitle}>Live from OutNow Tickets</Text>
            </View>
            <Text style={styles.count}>{filteredEvents.length}</Text>
          </View>

          {loading ? (
            <View style={styles.stateBox}><ActivityIndicator size="large" color="#7c3aed" /><Text style={styles.stateText}>Loading events…</Text></View>
          ) : error ? (
            <View style={styles.stateBox}><Text style={styles.stateTitle}>Couldn't load events</Text><Text style={styles.stateText}>{error}</Text><Pressable style={styles.retryButton} onPress={() => void loadEvents()}><Text style={styles.retryText}>Try again</Text></Pressable></View>
          ) : filteredEvents.length === 0 ? (
            <View style={styles.stateBox}>
              <Text style={styles.stateTitle}>{query ? 'No matching events' : 'No upcoming events are live yet'}</Text>
              <Text style={styles.stateText}>{query ? 'Try a different event, venue or city.' : 'New events will appear here as soon as they are approved and published.'}</Text>
            </View>
          ) : (
            <View style={styles.eventList}>
              {filteredEvents.slice(0, 12).map((event) => {
                const imageFailed = !!failedImages[event.id];
                return (
                  <Pressable key={event.id} style={styles.card} onPress={() => router.push(`/event/${event.id}`)}>
                    {!imageFailed ? (
                      <Image
                        source={{ uri: imageUrl(event.image) }}
                        style={styles.cardImage}
                        resizeMode="cover"
                        onError={() => setFailedImages((current) => ({ ...current, [event.id]: true }))}
                      />
                    ) : (
                      <View style={styles.fallbackImage}>
                        <Text style={styles.fallbackMark}>OUTNOW</Text>
                        <Text style={styles.fallbackCopy}>Event cover unavailable</Text>
                      </View>
                    )}
                    <View style={styles.imageFade} />
                    <View style={styles.categoryPill}><Text style={styles.categoryText}>{event.category || 'Event'}</Text></View>
                    <View style={styles.cardBody}>
                      <Text style={styles.eventDate}>{event.date}</Text>
                      <Text style={styles.eventTitle} numberOfLines={2}>{event.title}</Text>
                      <Text style={styles.eventLocation} numberOfLines={1}>{event.venue ? `${event.venue} · ` : ''}{event.location}</Text>
                      <View style={styles.cardFooter}><Text style={styles.fromText}>FROM</Text><Text style={styles.price}>£{event.price}</Text></View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#ffffff' },
  safeArea: { flex: 1 },
  content: { paddingHorizontal: 18, paddingTop: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 },
  brand: { color: '#111827', fontSize: 25, fontWeight: '900', letterSpacing: 1.2 },
  brandSub: { color: '#7c3aed', fontSize: 10, fontWeight: '800', letterSpacing: 4.6, marginTop: -2 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#f3efff', borderWidth: 1, borderColor: '#ddd6fe', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#7c3aed', fontSize: 16, fontWeight: '800' },
  hero: { marginBottom: 22 },
  eyebrow: { color: '#7c3aed', fontSize: 11, fontWeight: '900', letterSpacing: 1.8, marginBottom: 10 },
  heroTitle: { color: '#111827', fontSize: 34, lineHeight: 38, fontWeight: '900', maxWidth: 360 },
  heroCopy: { color: '#6b7280', fontSize: 15, lineHeight: 22, marginTop: 12, maxWidth: 350 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', height: 54, borderRadius: 16, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#f9fafb', paddingHorizontal: 15, marginBottom: 30 },
  searchIcon: { color: '#6b7280', fontSize: 25, marginRight: 8, marginTop: -3 },
  searchInput: { flex: 1, color: '#111827', fontSize: 15 },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 15 },
  sectionTitle: { color: '#111827', fontSize: 22, fontWeight: '800' },
  sectionSubtitle: { color: '#6b7280', fontSize: 12, marginTop: 3 },
  count: { color: '#7c3aed', fontSize: 14, fontWeight: '800' },
  stateBox: { minHeight: 180, borderRadius: 20, backgroundColor: '#fafafa', borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10 },
  stateText: { color: '#6b7280', textAlign: 'center', lineHeight: 20 },
  stateTitle: { color: '#111827', fontSize: 18, fontWeight: '800', textAlign: 'center' },
  retryButton: { marginTop: 7, backgroundColor: '#7c3aed', paddingHorizontal: 18, paddingVertical: 11, borderRadius: 12 },
  retryText: { color: '#ffffff', fontWeight: '800' },
  eventList: { gap: 16 },
  card: { height: 340, borderRadius: 22, overflow: 'hidden', backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e5e7eb', shadowColor: '#111827', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  cardImage: { ...StyleSheet.absoluteFillObject, bottom: 145 },
  fallbackImage: { ...StyleSheet.absoluteFillObject, bottom: 145, backgroundColor: '#f5f3ff', alignItems: 'center', justifyContent: 'center' },
  fallbackMark: { color: '#7c3aed', fontSize: 28, fontWeight: '900', letterSpacing: 2 },
  fallbackCopy: { color: '#6d28d9', fontSize: 12, fontWeight: '700', marginTop: 7 },
  imageFade: { position: 'absolute', left: 0, right: 0, top: 150, height: 45, backgroundColor: 'rgba(255,255,255,0.12)' },
  categoryPill: { position: 'absolute', top: 14, left: 14, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.96)', borderWidth: 1, borderColor: '#ede9fe' },
  categoryText: { color: '#7c3aed', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.8 },
  cardBody: { position: 'absolute', left: 0, right: 0, bottom: 0, minHeight: 145, padding: 18, backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  eventDate: { color: '#7c3aed', fontSize: 12, fontWeight: '900', marginBottom: 7 },
  eventTitle: { color: '#111827', fontSize: 22, lineHeight: 26, fontWeight: '900' },
  eventLocation: { color: '#6b7280', fontSize: 13, marginTop: 8 },
  cardFooter: { flexDirection: 'row', alignItems: 'baseline', marginTop: 14, gap: 6 },
  fromText: { color: '#9ca3af', fontSize: 9, fontWeight: '800', letterSpacing: 1.3 },
  price: { color: '#111827', fontSize: 19, fontWeight: '900' },
  bottomSpacer: { height: 110 },
});
