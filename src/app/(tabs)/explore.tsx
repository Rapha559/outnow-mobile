import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getUserLocation } from '@/lib/user-location';

const API_BASE = 'https://www.outnowtickets.com';

type DateFilter = 'ANY' | 'TODAY' | 'WEEKEND' | '7_DAYS' | '30_DAYS';
type SortMode = 'SOONEST' | 'TRENDING' | 'PRICE_LOW';

type EventItem = {
  id: string;
  title: string;
  date: string;
  dateIso?: string;
  location: string;
  venue: string;
  description?: string;
  category: string;
  image: string;
  price: string;
  totalSold?: number;
  totalCapacity?: number;
  popularityScore?: number;
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

function eventDate(event: EventItem) {
  const value = event.dateIso || event.date;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

function inDateWindow(event: EventItem, filter: DateFilter) {
  if (filter === 'ANY') return true;
  const date = eventDate(event);
  if (!date) return false;
  const now = new Date();

  if (filter === 'TODAY') {
    return date >= startOfDay(now) && date <= endOfDay(now);
  }

  if (filter === 'WEEKEND') {
    const day = now.getDay();
    const untilSaturday = day === 6 ? 0 : (6 - day + 7) % 7;
    const saturday = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() + untilSaturday));
    const sunday = endOfDay(new Date(saturday.getFullYear(), saturday.getMonth(), saturday.getDate() + 1));
    return date >= saturday && date <= sunday;
  }

  const days = filter === '7_DAYS' ? 7 : 30;
  const end = endOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() + days));
  return date >= now && date <= end;
}

export default function ExploreScreen() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [query, setQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [detectedLocation, setDetectedLocation] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [dateFilter, setDateFilter] = useState<DateFilter>('ANY');
  const [sortMode, setSortMode] = useState<SortMode>('SOONEST');
  const [loading, setLoading] = useState(true);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch(`${API_BASE}/api/events`)
      .then((response) => response.json())
      .then((data) => { setEvents(Array.isArray(data?.events) ? data.events : []); setFailedImages({}); })
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, []);

  async function loadCurrentLocation(requestPermission = true) {
    try {
      setLocationLoading(true);
      const location = await getUserLocation(requestPermission);
      if (!location) return;
      const value = location.city || location.district || location.region || '';
      setDetectedLocation(location.label);
      if (value) setLocationQuery((current) => current.trim() ? current : value);
    } finally {
      setLocationLoading(false);
    }
  }

  useEffect(() => { void loadCurrentLocation(true); }, []);

  const categories = useMemo(() => Array.from(new Set(events.map((event) => event.category).filter(Boolean))).sort(), [events]);

  const featured = useMemo(() => [...events]
    .sort((a, b) => (b.popularityScore || b.totalSold || 0) - (a.popularityScore || a.totalSold || 0))
    .slice(0, 3), [events]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    const locationTerm = locationQuery.trim().toLowerCase();

    const result = events.filter((event) => {
      const matchesSearch = !term || [event.title, event.category, event.location, event.venue, event.description || '']
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term));
      const matchesLocation = !locationTerm || [event.location, event.venue]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(locationTerm));
      const matchesCategory = selectedCategory === 'ALL' || event.category === selectedCategory;
      return matchesSearch && matchesLocation && matchesCategory && inDateWindow(event, dateFilter);
    });

    return result.sort((a, b) => {
      if (sortMode === 'TRENDING') return (b.popularityScore || b.totalSold || 0) - (a.popularityScore || a.totalSold || 0);
      if (sortMode === 'PRICE_LOW') return Number(a.price || 0) - Number(b.price || 0);
      const aDate = eventDate(a)?.getTime() || Number.MAX_SAFE_INTEGER;
      const bDate = eventDate(b)?.getTime() || Number.MAX_SAFE_INTEGER;
      return aDate - bDate;
    });
  }, [events, query, locationQuery, selectedCategory, dateFilter, sortMode]);

  const activeFilters = selectedCategory !== 'ALL' || dateFilter !== 'ANY' || !!locationQuery.trim() || sortMode !== 'SOONEST';

  function clearFilters() {
    setLocationQuery('');
    setSelectedCategory('ALL');
    setDateFilter('ANY');
    setSortMode('SOONEST');
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.eyebrow}>EXPLORE OUTNOW</Text>
          <Text style={styles.title}>Find your next event</Text>
          <Text style={styles.copy}>Search by artist, event, venue, category, city or date.</Text>

          <View style={styles.searchWrap}>
            <Text style={styles.searchIcon}>⌕</Text>
            <TextInput value={query} onChangeText={setQuery} placeholder="Search events or artists" placeholderTextColor="#9ca3af" style={styles.searchInput} autoCapitalize="none" />
          </View>

          <View style={styles.locationWrap}>
            <Text style={styles.locationIcon}>⌖</Text>
            <TextInput value={locationQuery} onChangeText={setLocationQuery} placeholder="City or venue" placeholderTextColor="#9ca3af" style={styles.searchInput} autoCapitalize="words" />
            <Pressable disabled={locationLoading} style={styles.locationButton} onPress={() => void loadCurrentLocation(true)}>
              {locationLoading ? <ActivityIndicator size="small" color="#7c3aed" /> : <Text style={styles.locationButtonText}>Near me</Text>}
            </Pressable>
          </View>
          {!!detectedLocation && <Text style={styles.locationHint}>Using your current area: {detectedLocation}</Text>}

          {featured.length > 0 && !query && !activeFilters && (
            <View style={styles.featuredSection}>
              <View style={styles.headingRow}><Text style={styles.heading}>Trending now</Text><Text style={styles.trendingMark}>🔥</Text></View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredList}>
                {featured.map((event) => (
                  <Pressable key={event.id} style={styles.featuredCard} onPress={() => router.push(`/event/${event.id}`)}>
                    <Image source={{ uri: imageUrl(event.image) }} style={styles.featuredImage} resizeMode="cover" />
                    <View style={styles.featuredBody}>
                      <Text style={styles.featuredCategory}>{event.category}</Text>
                      <Text style={styles.featuredTitle} numberOfLines={2}>{event.title}</Text>
                      <Text style={styles.featuredMeta}>{event.date}</Text>
                      <Text style={styles.featuredPrice}>From £{event.price}</Text>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          <Text style={styles.filterLabel}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            <Pressable style={[styles.chip, selectedCategory === 'ALL' && styles.chipSelected]} onPress={() => setSelectedCategory('ALL')}><Text style={[styles.chipText, selectedCategory === 'ALL' && styles.chipTextSelected]}>All</Text></Pressable>
            {categories.map((category) => <Pressable key={category} style={[styles.chip, selectedCategory === category && styles.chipSelected]} onPress={() => setSelectedCategory(category)}><Text style={[styles.chipText, selectedCategory === category && styles.chipTextSelected]}>{category}</Text></Pressable>)}
          </ScrollView>

          <Text style={styles.filterLabel}>When</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsCompact}>
            {([['ANY','Any date'],['TODAY','Today'],['WEEKEND','This weekend'],['7_DAYS','Next 7 days'],['30_DAYS','Next 30 days']] as Array<[DateFilter,string]>).map(([value,label]) => <Pressable key={value} style={[styles.chip, dateFilter === value && styles.chipSelected]} onPress={() => setDateFilter(value)}><Text style={[styles.chipText, dateFilter === value && styles.chipTextSelected]}>{label}</Text></Pressable>)}
          </ScrollView>

          <View style={styles.sortRow}>
            <Text style={styles.filterLabel}>Sort</Text>
            {activeFilters && <Pressable onPress={clearFilters}><Text style={styles.clearText}>Clear filters</Text></Pressable>}
          </View>
          <View style={styles.sortButtons}>
            {([['SOONEST','Soonest'],['TRENDING','Trending'],['PRICE_LOW','Lowest price']] as Array<[SortMode,string]>).map(([value,label]) => <Pressable key={value} style={[styles.sortButton, sortMode === value && styles.sortButtonSelected]} onPress={() => setSortMode(value)}><Text style={[styles.sortText, sortMode === value && styles.sortTextSelected]}>{label}</Text></Pressable>)}
          </View>

          <View style={styles.headingRow}><Text style={styles.heading}>{locationQuery.trim() ? `Events in ${locationQuery.trim()}` : query || activeFilters ? 'Matching events' : 'All upcoming events'}</Text><Text style={styles.count}>{filtered.length}</Text></View>

          {loading ? (
            <View style={styles.stateBox}><ActivityIndicator color="#7c3aed" size="large" /></View>
          ) : filtered.length === 0 ? (
            <View style={styles.stateBox}><Text style={styles.stateTitle}>No matching events</Text><Text style={styles.stateText}>Try clearing a filter, changing the city, or searching another event.</Text>{activeFilters && <Pressable style={styles.clearButton} onPress={clearFilters}><Text style={styles.clearButtonText}>Clear filters</Text></Pressable>}</View>
          ) : (
            <View style={styles.list}>
              {filtered.map((event) => {
                const failed = !!failedImages[event.id];
                return (
                  <Pressable key={event.id} style={styles.row} onPress={() => router.push(`/event/${event.id}`)}>
                    {!failed ? (
                      <Image source={{ uri: imageUrl(event.image) }} style={styles.image} resizeMode="cover" onError={() => setFailedImages((current) => ({ ...current, [event.id]: true }))} />
                    ) : (
                      <View style={styles.imageFallback}><Text style={styles.imageFallbackText}>O</Text></View>
                    )}
                    <View style={styles.rowBody}>
                      <View style={styles.categoryLine}><Text style={styles.category}>{event.category}</Text>{(event.totalSold || 0) > 0 && <Text style={styles.popularText}>{event.totalSold} sold</Text>}</View>
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
  screen: { flex: 1, backgroundColor: '#ffffff' }, safeArea: { flex: 1 }, content: { paddingHorizontal: 18, paddingTop: 16 },
  eyebrow: { color: '#7c3aed', fontSize: 11, fontWeight: '900', letterSpacing: 1.8 }, title: { color: '#111827', fontSize: 34, lineHeight: 39, fontWeight: '900', marginTop: 10 }, copy: { color: '#6b7280', fontSize: 15, lineHeight: 22, marginTop: 8 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', height: 56, borderRadius: 17, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#f9fafb', paddingHorizontal: 15, marginTop: 24 }, locationWrap: { flexDirection: 'row', alignItems: 'center', minHeight: 50, borderRadius: 15, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff', paddingLeft: 15, paddingRight: 6, marginTop: 10 }, searchIcon: { color: '#6b7280', fontSize: 25, marginRight: 8, marginTop: -3 }, locationIcon: { color: '#7c3aed', fontSize: 19, marginRight: 9 }, searchInput: { flex: 1, color: '#111827', fontSize: 15 }, locationButton:{minWidth:68,height:38,borderRadius:11,backgroundColor:'#f5f3ff',borderWidth:1,borderColor:'#ddd6fe',alignItems:'center',justifyContent:'center',paddingHorizontal:9},locationButtonText:{color:'#7c3aed',fontSize:10,fontWeight:'900'},locationHint:{color:'#7c3aed',fontSize:11,fontWeight:'700',marginTop:7,marginLeft:3},
  featuredSection: { marginTop: 24 }, featuredList: { gap: 12, paddingRight: 18 }, featuredCard: { width: 250, borderRadius: 20, overflow: 'hidden', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb' }, featuredImage: { width: '100%', height: 132, backgroundColor: '#f3f4f6' }, featuredBody: { padding: 13 }, featuredCategory: { color: '#7c3aed', fontSize: 9, fontWeight: '900', textTransform: 'uppercase' }, featuredTitle: { color: '#111827', fontSize: 17, lineHeight: 21, fontWeight: '900', marginTop: 5 }, featuredMeta: { color: '#6b7280', fontSize: 11, marginTop: 6 }, featuredPrice: { color: '#111827', fontWeight: '900', marginTop: 8 }, trendingMark: { fontSize: 18 },
  filterLabel: { color: '#374151', fontSize: 12, fontWeight: '900', marginTop: 18, marginBottom: 3 }, chips: { gap: 9, paddingVertical: 10 }, chipsCompact: { gap: 9, paddingVertical: 10 }, chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb' }, chipSelected: { backgroundColor: '#f5f3ff', borderColor: '#7c3aed' }, chipText: { color: '#4b5563', fontWeight: '700', fontSize: 12 }, chipTextSelected: { color: '#6d28d9' },
  sortRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, clearText: { color: '#7c3aed', fontSize: 12, fontWeight: '800', marginTop: 18 }, sortButtons: { flexDirection: 'row', gap: 8, marginTop: 7, marginBottom: 18 }, sortButton: { flex: 1, minHeight: 40, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#f9fafb', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 7 }, sortButtonSelected: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' }, sortText: { color: '#4b5563', fontSize: 11, fontWeight: '800' }, sortTextSelected: { color: '#fff' },
  headingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 12 }, heading: { color: '#111827', fontSize: 21, fontWeight: '800' }, count: { color: '#7c3aed', fontWeight: '800' },
  stateBox: { minHeight: 190, borderRadius: 20, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fafafa', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 }, stateTitle: { color: '#111827', fontSize: 18, fontWeight: '800', textAlign: 'center' }, stateText: { color: '#6b7280', textAlign: 'center', lineHeight: 20 }, clearButton: { marginTop: 8, backgroundColor: '#7c3aed', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 }, clearButtonText: { color: '#fff', fontWeight: '900' },
  list: { gap: 12 }, row: { minHeight: 104, borderRadius: 18, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#ffffff', padding: 10, flexDirection: 'row', alignItems: 'center', gap: 12 }, image: { width: 82, height: 82, borderRadius: 13, backgroundColor: '#f3f4f6' }, imageFallback: { width: 82, height: 82, borderRadius: 13, backgroundColor: '#ede9fe', alignItems: 'center', justifyContent: 'center' }, imageFallbackText: { color: '#7c3aed', fontSize: 30, fontWeight: '900' }, rowBody: { flex: 1 }, categoryLine: { flexDirection: 'row', alignItems: 'center', gap: 7 }, category: { color: '#7c3aed', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 5 }, popularText: { color: '#9ca3af', fontSize: 9, fontWeight: '800', marginBottom: 5 }, eventTitle: { color: '#111827', fontSize: 16, lineHeight: 20, fontWeight: '800' }, meta: { color: '#6b7280', fontSize: 11, marginTop: 3 }, price: { color: '#111827', fontWeight: '900', fontSize: 15, alignSelf: 'flex-end', marginBottom: 8 },
});
