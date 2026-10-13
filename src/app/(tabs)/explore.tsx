import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
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

function imageUrl(value?: string | null) {
  const clean = String(value || '').trim();
  if (!clean) return `${API_BASE}/images/event-placeholder.jpg`;
  const secure = /^http:\/\//i.test(clean) ? clean.replace(/^http:\/\//i, 'https://') : clean;
  if (/^https:\/\/res\.cloudinary\.com\//i.test(secure)) {
    return `${API_BASE}/api/mobile/media/image?url=${encodeURIComponent(secure)}`;
  }
  if (/^https:\/\//i.test(secure)) return secure;
  return `${API_BASE}${secure.startsWith('/') ? secure : `/${secure}`}`;
}

export default function ExploreScreen() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch(`${API_BASE}/api/events`)
      .then((response) => response.json())
      .then((data) => { setEvents(Array.isArray(data?.events) ? data.events : []); setFailedImages({}); })
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => Array.from(new Set(events.map((event) => event.category).filter(Boolean))), [events]);
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return events;
    return events.filter((event) => [event.title, event.category, event.location, event.venue].filter(Boolean).some((value) => value.toLowerCase().includes(term)));
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
            <TextInput autoFocus value={query} onChangeText={setQuery} placeholder="Search OutNow" placeholderTextColor="#9ca3af" style={styles.searchInput} autoCapitalize="none" />
          </View>

          {categories.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {categories.map((category) => <Pressable key={category} style={styles.chip} onPress={() => setQuery(category)}><Text style={styles.chipText}>{category}</Text></Pressable>)}
            </ScrollView>
          )}

          <View style={styles.headingRow}><Text style={styles.heading}>{query ? 'Search results' : 'All upcoming events'}</Text><Text style={styles.count}>{filtered.length}</Text></View>

          {loading ? (
            <View style={styles.stateBox}><ActivityIndicator color="#7c3aed" size="large" /></View>
          ) : filtered.length === 0 ? (
            <View style={styles.stateBox}><Text style={styles.stateTitle}>{query ? 'No results found' : 'No upcoming events are live yet'}</Text><Text style={styles.stateText}>{query ? 'Try a different search.' : 'Approved future events will appear here automatically.'}</Text></View>
          ) : (
            <View style={styles.list}>
              {filtered.map((event) => {
                const failed = !!failedImages[event.id];
                return (
                  <Pressable key={event.id} style={styles.row} onPress={() => router.push(`/event/${event.id}`)}>
                    {!failed ? (
                      <Image
                        source={{ uri: imageUrl(event.image) }}
                        style={styles.image}
                        resizeMode="cover"
                        onError={() => setFailedImages((current) => ({ ...current, [event.id]: true }))}
                      />
                    ) : (
                      <View style={styles.imageFallback}><Text style={styles.imageFallbackText}>O</Text></View>
                    )}
                    <View style={styles.rowBody}>
                      <Text style={styles.category}>{event.category}</Text>
                      <Text style={styles.eventTitle} numberOfLines={2}>{event.title}</Text>
                      <Text style={styles.meta} numberOfLines={1}>{event.date}</Text>
                      <Text style={styles.meta} numberOfLines={1}>{event.venue || event.location}</Text>
                    </View>
                    <Text style={styles.price}>£{event.price}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}
          <View style={{ height: 110 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#ffffff' },
  safeArea: { flex: 1 },
  content: { paddingHorizontal: 18, paddingTop: 16 },
  eyebrow: { color: '#7c3aed', fontSize: 11, fontWeight: '900', letterSpacing: 1.8 },
  title: { color: '#111827', fontSize: 34, lineHeight: 39, fontWeight: '900', marginTop: 10 },
  copy: { color: '#6b7280', fontSize: 15, lineHeight: 22, marginTop: 8 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', height: 56, borderRadius: 17, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#f9fafb', paddingHorizontal: 15, marginTop: 24 },
  searchIcon: { color: '#6b7280', fontSize: 25, marginRight: 8, marginTop: -3 },
  searchInput: { flex: 1, color: '#111827', fontSize: 16 },
  chips: { gap: 9, paddingVertical: 16 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: '#f5f3ff', borderWidth: 1, borderColor: '#ddd6fe' },
  chipText: { color: '#6d28d9', fontWeight: '700', fontSize: 12 },
  headingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 12 },
  heading: { color: '#111827', fontSize: 21, fontWeight: '800' },
  count: { color: '#7c3aed', fontWeight: '800' },
  stateBox: { minHeight: 190, borderRadius: 20, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fafafa', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  stateTitle: { color: '#111827', fontSize: 18, fontWeight: '800', textAlign: 'center' },
  stateText: { color: '#6b7280', textAlign: 'center', lineHeight: 20 },
  list: { gap: 12 },
  row: { minHeight: 104, borderRadius: 18, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#ffffff', padding: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
  image: { width: 82, height: 82, borderRadius: 13, backgroundColor: '#f3f4f6' },
  imageFallback: { width: 82, height: 82, borderRadius: 13, backgroundColor: '#ede9fe', alignItems: 'center', justifyContent: 'center' },
  imageFallbackText: { color: '#7c3aed', fontSize: 30, fontWeight: '900' },
  rowBody: { flex: 1 },
  category: { color: '#7c3aed', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 5 },
  eventTitle: { color: '#111827', fontSize: 16, lineHeight: 20, fontWeight: '800' },
  meta: { color: '#6b7280', fontSize: 11, marginTop: 3 },
  price: { color: '#111827', fontWeight: '900', fontSize: 15, alignSelf: 'flex-end', marginBottom: 8 },
});
