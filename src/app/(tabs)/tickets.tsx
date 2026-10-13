import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TicketsScreen() {
  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.content}>
          <Text style={styles.eyebrow}>YOUR OUTNOW</Text>
          <Text style={styles.title}>My Tickets</Text>
          <Text style={styles.copy}>
            Your purchased tickets and entry QR codes will appear here after sign-in.
          </Text>

          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <Text style={styles.icon}>🎟</Text>
            </View>
            <Text style={styles.cardTitle}>No tickets yet</Text>
            <Text style={styles.cardCopy}>
              When you buy an event ticket with OutNow, it will be stored here for quick access at the venue.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#07070a' },
  safeArea: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 18, paddingTop: 16 },
  eyebrow: { color: '#a78bfa', fontSize: 11, fontWeight: '900', letterSpacing: 1.8 },
  title: { color: '#fff', fontSize: 34, lineHeight: 39, fontWeight: '900', marginTop: 10 },
  copy: { color: '#92929d', fontSize: 15, lineHeight: 22, marginTop: 8, maxWidth: 360 },
  card: { marginTop: 30, minHeight: 260, borderRadius: 22, borderWidth: 1, borderColor: '#202028', backgroundColor: '#101014', alignItems: 'center', justifyContent: 'center', padding: 28 },
  iconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#191522', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  icon: { fontSize: 30 },
  cardTitle: { color: '#fff', fontSize: 20, fontWeight: '900' },
  cardCopy: { color: '#8d8d98', textAlign: 'center', lineHeight: 21, marginTop: 10 },
});
