import { router } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/auth-context';

export default function ProfileScreen() {
  const { user, loading, isAuthenticated, signOut } = useAuth();

  if (loading) {
    return (
      <View style={styles.screen}>
        <SafeAreaView style={styles.center}>
          <ActivityIndicator size="large" color="#8b5cf6" />
        </SafeAreaView>
      </View>
    );
  }

  const initial = user?.name?.trim().charAt(0).toUpperCase() || 'O';
  const isPromoter = user?.role === 'PROMOTER';

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.eyebrow}>OUTNOW ACCOUNT</Text>
          <Text style={styles.title}>{isPromoter ? 'Promoter Profile' : 'Profile'}</Text>
          <Text style={styles.copy}>
            {isAuthenticated
              ? isPromoter
                ? 'Manage your promoter account and open your mobile dashboard.'
                : 'Your OutNow account is connected to this device.'
              : 'Sign in to manage your tickets, orders and account details.'}
          </Text>

          <View style={styles.profileCard}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{initial}</Text></View>
            <View style={styles.profileText}>
              <Text style={styles.profileTitle}>{user?.name || 'Welcome to OutNow'}</Text>
              <Text style={styles.profileCopy}>
                {user?.email || 'Sign in or create an account to keep your tickets with you.'}
              </Text>
              {!!user?.role && <Text style={styles.role}>{user.role}</Text>}
            </View>
          </View>

          {!isAuthenticated ? (
            <>
              <Pressable style={styles.primaryButton} onPress={() => router.push('/login')}>
                <Text style={styles.primaryText}>Sign in</Text>
              </Pressable>
              <Pressable style={styles.secondaryButton} onPress={() => router.push('/signup')}>
                <Text style={styles.secondaryText}>Create account</Text>
              </Pressable>
            </>
          ) : isPromoter ? (
            <>
              <Pressable style={styles.primaryButton} onPress={() => router.push('/promoter/dashboard')}>
                <Text style={styles.primaryText}>Open promoter dashboard</Text>
              </Pressable>
              <Pressable
                style={styles.secondaryButton}
                onPress={() => {
                  void signOut();
                }}>
                <Text style={styles.secondaryText}>Sign out</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Pressable style={styles.primaryButton} onPress={() => router.push('/(tabs)/tickets')}>
                <Text style={styles.primaryText}>View my tickets</Text>
              </Pressable>
              <Pressable
                style={styles.secondaryButton}
                onPress={() => {
                  void signOut();
                }}>
                <Text style={styles.secondaryText}>Sign out</Text>
              </Pressable>
            </>
          )}

          <View style={styles.menu}>
            {(isPromoter
              ? ['Dashboard', 'Events', 'Orders', 'Attendees', 'Payouts', 'Settings']
              : ['Orders', 'Notifications', 'Help & support', 'Privacy & security']
            ).map((item) => (
              <Pressable
                key={item}
                style={styles.menuRow}
                onPress={() => {
                  if (item === 'Dashboard') router.push('/promoter/dashboard');
                }}>
                <Text style={styles.menuText}>{item}</Text>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            ))}
          </View>
          <View style={{ height: 110 }} />
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
  copy: { color: '#92929d', fontSize: 15, lineHeight: 22, marginTop: 8 },
  profileCard: { marginTop: 28, borderRadius: 20, borderWidth: 1, borderColor: '#23232c', backgroundColor: '#101014', padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#1d1727', borderWidth: 1, borderColor: '#3a2c50', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 19, fontWeight: '900' },
  profileText: { flex: 1 },
  profileTitle: { color: '#fff', fontSize: 17, fontWeight: '900' },
  profileCopy: { color: '#8d8d98', fontSize: 12, lineHeight: 18, marginTop: 4 },
  role: { color: '#a78bfa', fontSize: 9, fontWeight: '900', letterSpacing: 1.1, marginTop: 8 },
  primaryButton: { height: 52, borderRadius: 15, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  primaryText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  secondaryButton: { height: 52, borderRadius: 15, borderWidth: 1, borderColor: '#2a2a34', backgroundColor: '#111116', alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  secondaryText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  menu: { marginTop: 24, borderRadius: 18, borderWidth: 1, borderColor: '#202028', overflow: 'hidden' },
  menuRow: { minHeight: 54, backgroundColor: '#101014', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#25252e', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  menuText: { color: '#d9d9df', fontWeight: '700' },
  chevron: { color: '#777782', fontSize: 25 },
});
