import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const API_BASE = 'https://www.outnowtickets.com';

type EventItem = {
  id: string;
  title: string;
  date: string;
  location: string;
  venue: string;
  category: string;
  image: string;
  price: string;
};

function imageUrl(value: string) {
  if (!value) return `${API_BASE}/images/event-placeholder.jpg`;
  if (/^https?:\/\//i.test(value)) return value;
  return `${API_BASE}${value.startsWith('/') ? value : `/${value}`}`;
}

export default function ExploreScreen() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/events`)
      .then((response) => response.json())
      .then((data) => setEvents(Array.isArray(data?.events) ? data.events : []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(
    () => Array.from(new Set(events.map((event) => event.category).filter(Boolean))),
    [events],
  );

  const filtered = useMemo(() => {
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
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.eyebrow}>EXPLORE OUTNOW</Text>
          <Text style={styles.title}>Find your next event</Text>
          <Text style={styles.copy}>Search by artist, event, venue, category or city.</Text>

          <View style={styles.searchWrap}>
            <Text style={styles.searchIcon}>⌕</Text>
            <TextInput
              autoFocus
              value={query}
              onChangeText={setQuery}
              placeholder="Search OutNow"
              placeholderTextColor="#777b87"
              style={styles.searchInput}
              autoCapitalize="none"
            />
          </View>

          {categories.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {categories.map((category) => (
                <Pressable key={category} style={styles.chip} onPress={() => setQuery(category)}>
                  <Text style={styles.chipText}>{category}</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}

          <View style={styles.headingRow}>
            <Text style={styles.heading}>{query ? 'Search results' : 'All upcoming events'}</Text>
            <Text style={styles.count}>{filtered.length}</Text>
          </View>

          {loading ? (
            <View style={styles.stateBox}><ActivityIndicator color="#8b5cf6" size="large" /></View>
          ) : filtered.length === 0 ? (
            <View style={styles.stateBox}>
              <Text style={styles.stateTitle}>{query ? 'No results found' : 'No upcoming events are live yet'}</Text>
              <Text style={styles.stateText}>{query ? 'Try a different search.' : 'Approved future events will appear here automatically.'}</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {filtered.map((event) => (
                <Pressable key={event.id} style={styles.row} onPress={() => router.push(`/event/${event.id}`)}>
                  <Image source={{ uri: imageUrl(event.image) }} style={styles.image} contentFit="cover" />
                  <View style={styles.rowBody}>
                    <Text style={styles.category}>{event.category}</Text>
                    <Text style={styles.eventTitle} numberOfLines={2}>{event.title}</Text>
                    <Text style={styles.meta} numberOfLines={1}>{event.date}</Text>
                    <Text style={styles.meta} numberOfLines={1}>{event.venue || event.location}</Text>
                  </View>
                  <Text style={styles.price}>£{event.price}</Text>
                </Pressable>
              ))}
            </View>
          )}
          <View style={{ height: 110 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#07070a' },
  safeArea: { flex: 1 },
  content: { paddingHorizontal: 18, paddingTop: 16 },
  eyebrow: { color: '#a78bfa', fontSize: 11, fontWeight: '900', letterSpacing: 1.8 },
  title: { color: '#fff', fontSize: 34, lineHeight: 39, fontWeight: '900', marginTop: 10 },
  copy: { color: '#92929d', fontSize: 15, lineHeight: 22, marginTop: 8 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', height: 56, borderRadius: 17, borderWidth: 1, borderColor: '#292933', backgroundColor: '#111116', paddingHorizontal: 15, marginTop: 24 },
  searchIcon: { color: '#9d9daa', fontSize: 25, marginRight: 8, marginTop: -3 },
  searchInput: { flex: 1, color: '#fff', fontSize: 16 },
  chips: { gap: 9, paddingVertical: 16 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: '#15151b', borderWidth: 1, borderColor: '#292933' },
  chipText: { color: '#d7d7df', fontWeight: '700', fontSize: 12 },
  headingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 12 },
  heading: { color: '#fff', fontSize: 21, fontWeight: '800' },
  count: { color: '#8b5cf6', fontWeight: '800' },
  stateBox: { minHeight: 190, borderRadius: 20, borderWidth: 1, borderColor: '#202028', backgroundColor: '#101014', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  stateTitle: { color: '#fff', fontSize: 18, fontWeight: '800', textAlign: 'center' },
  stateText: { color: '#8d8d98', textAlign: 'center', lineHeight: 20 },
  list: { gap: 12 },
  row: { minHeight: 104, borderRadius: 18, borderWidth: 1, borderColor: '#202028', backgroundColor: '#101014', padding: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
  image: { width: 82, height: 82, borderRadius: 13, backgroundColor: '#17171d' },
  rowBody: { flex: 1 },
  category: { color: '#a78bfa', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 5 },
  eventTitle: { color: '#fff', fontSize: 16, lineHeight: 20, fontWeight: '800' },
  meta: { color: '#8c8c98', fontSize: 11, marginTop: 3 },
  price: { color: '#fff', fontWeight: '900', fontSize: 15, alignSelf: 'flex-end', marginBottom: 8 },
});
