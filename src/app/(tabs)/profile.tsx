import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.content}>
          <Text style={styles.eyebrow}>OUTNOW ACCOUNT</Text>
          <Text style={styles.title}>Profile</Text>
          <Text style={styles.copy}>Sign in to manage your tickets, orders and account details.</Text>

          <View style={styles.profileCard}>
            <View style={styles.avatar}><Text style={styles.avatarText}>O</Text></View>
            <View style={styles.profileText}>
              <Text style={styles.profileTitle}>Welcome to OutNow</Text>
              <Text style={styles.profileCopy}>Your mobile account experience is being connected to your existing OutNow account.</Text>
            </View>
          </View>

          <Pressable style={styles.primaryButton}>
            <Text style={styles.primaryText}>Sign in</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton}>
            <Text style={styles.secondaryText}>Create account</Text>
          </Pressable>

          <View style={styles.menu}>
            {['Orders', 'Notifications', 'Help & support', 'Privacy & security'].map((item) => (
              <Pressable key={item} style={styles.menuRow}>
                <Text style={styles.menuText}>{item}</Text>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            ))}
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
  copy: { color: '#92929d', fontSize: 15, lineHeight: 22, marginTop: 8 },
  profileCard: { marginTop: 28, borderRadius: 20, borderWidth: 1, borderColor: '#23232c', backgroundColor: '#101014', padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#1d1727', borderWidth: 1, borderColor: '#3a2c50', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 19, fontWeight: '900' },
  profileText: { flex: 1 },
  profileTitle: { color: '#fff', fontSize: 17, fontWeight: '900' },
  profileCopy: { color: '#8d8d98', fontSize: 12, lineHeight: 18, marginTop: 4 },
  primaryButton: { height: 52, borderRadius: 15, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  primaryText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  secondaryButton: { height: 52, borderRadius: 15, borderWidth: 1, borderColor: '#2a2a34', backgroundColor: '#111116', alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  secondaryText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  menu: { marginTop: 24, borderRadius: 18, borderWidth: 1, borderColor: '#202028', overflow: 'hidden' },
  menuRow: { minHeight: 54, backgroundColor: '#101014', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#25252e', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  menuText: { color: '#d9d9df', fontWeight: '700' },
  chevron: { color: '#777782', fontSize: 25 },
});
