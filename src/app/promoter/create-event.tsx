import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CreateEventScreen() {
  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.topBar}>
            <Pressable style={styles.back} onPress={() => router.back()}><Text style={styles.backText}>‹</Text></Pressable>
            <Text style={styles.topTitle}>Create Event</Text>
            <View style={styles.spacer} />
          </View>

          <Text style={styles.eyebrow}>PROMOTER PORTAL</Text>
          <Text style={styles.title}>Create a new event</Text>
          <Text style={styles.copy}>
            The mobile event builder is the next part of the promoter flow. It will include event details, venue, date and time, category, cover image and ticket types before submission for admin review.
          </Text>

          <View style={styles.card}>
            {['Event details', 'Date & time', 'Venue & location', 'Category', 'Cover image', 'Ticket types', 'Submit for review'].map((item, index) => (
              <View key={item} style={[styles.row, index === 6 && styles.lastRow]}>
                <View style={styles.number}><Text style={styles.numberText}>{index + 1}</Text></View>
                <Text style={styles.rowText}>{item}</Text>
              </View>
            ))}
          </View>

          <Pressable style={styles.primary} onPress={() => router.back()}>
            <Text style={styles.primaryText}>Back to promoter dashboard</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#ffffff' },
  safeArea: { flex: 1 },
  content: { paddingHorizontal: 18, paddingBottom: 40 },
  topBar: { height: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#f9fafb', alignItems: 'center', justifyContent: 'center' },
  backText: { color: '#111827', fontSize: 34, lineHeight: 36, marginTop: -3 },
  topTitle: { color: '#111827', fontSize: 15, fontWeight: '800' },
  spacer: { width: 40 },
  eyebrow: { color: '#7c3aed', fontSize: 11, fontWeight: '900', letterSpacing: 1.8, marginTop: 18 },
  title: { color: '#111827', fontSize: 34, lineHeight: 40, fontWeight: '900', marginTop: 8 },
  copy: { color: '#6b7280', fontSize: 14, lineHeight: 22, marginTop: 10 },
  card: { marginTop: 26, borderRadius: 20, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#ffffff', overflow: 'hidden' },
  row: { minHeight: 62, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e5e7eb' },
  lastRow: { borderBottomWidth: 0 },
  number: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#f3efff', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  numberText: { color: '#7c3aed', fontWeight: '900', fontSize: 12 },
  rowText: { color: '#111827', fontSize: 14, fontWeight: '800' },
  primary: { height: 52, borderRadius: 15, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center', marginTop: 22 },
  primaryText: { color: '#ffffff', fontSize: 14, fontWeight: '900' },
});
