import { router } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/auth-context';

type SettingsItem = {
  key: string;
  label: string;
  subtitle: string;
  icon: string;
  promoterOnly?: boolean;
  route?: '/legal';
};

const ITEMS: SettingsItem[] = [
  { key: 'personal', label: 'Personal details', subtitle: 'Name, email and phone number', icon: '♙' },
  { key: 'business', label: 'Business profile', subtitle: 'Organiser name, description and website', icon: '▥', promoterOnly: true },
  { key: 'notifications', label: 'Notifications', subtitle: 'Push, email, reminders and promoter alerts', icon: '♧' },
  { key: 'event-defaults', label: 'Event defaults', subtitle: 'Refund and UK ticket VAT defaults', icon: '⌘', promoterOnly: true },
  { key: 'audience-privacy', label: 'Audience & privacy', subtitle: 'Marketing choices and personalisation', icon: '♙' },
  { key: 'legal', label: 'Legal, privacy & refunds', subtitle: 'Refund guidance, ticketing terms, privacy and account rights', icon: '§', route: '/legal' },
  { key: 'payments-payouts', label: 'Payments & payouts', subtitle: 'Stripe connection, balances and payout readiness', icon: '▭', promoterOnly: true },
  { key: 'taxpayer-info', label: 'Taxpayer info', subtitle: 'Seller, tax residence and VAT details', icon: '▤', promoterOnly: true },
  { key: 'security-alerts', label: 'Security alerts', subtitle: 'Account protection and session security', icon: '♢' },
  { key: 'password', label: 'Password', subtitle: 'Create or change your password', icon: '▣' },
  { key: 'account-controls', label: 'Account controls', subtitle: 'Sign out, support and account deletion requests', icon: '◇' },
];

export default function SettingsMenuScreen() {
  const { user, loading } = useAuth();

  if (loading) {
    return <View style={styles.screen}><SafeAreaView style={styles.center}><ActivityIndicator size="large" color="#7c3aed" /></SafeAreaView></View>;
  }

  if (!user) {
    return <View style={styles.screen}><SafeAreaView style={styles.center}><Text style={styles.title}>Settings</Text><Text style={styles.copy}>Sign in to manage your settings.</Text><Pressable style={styles.primary} onPress={() => router.replace('/login')}><Text style={styles.primaryText}>Sign in</Text></Pressable></SafeAreaView></View>;
  }

  const isPromoter = user.role === 'PROMOTER';
  const visibleItems = ITEMS.filter((item) => !item.promoterOnly || isPromoter);
  const initials = user.name.trim().split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'O';

  return <View style={styles.screen}><SafeAreaView edges={['top']} style={styles.safe}><ScrollView contentContainerStyle={styles.content}>
    <View style={styles.top}><Pressable style={styles.backButton} onPress={() => router.back()}><Text style={styles.back}>‹</Text></Pressable><Text style={styles.topTitle}>Settings</Text><View style={{ width: 40 }} /></View>

    <View style={styles.accountCard}>
      <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.role}>{isPromoter ? 'Promoter account' : 'Customer account'}</Text>
      </View>
    </View>

    <View style={styles.menu}>
      {visibleItems.map((item, index) => (
        <Pressable
          key={item.key}
          style={[styles.row, index === visibleItems.length - 1 && styles.lastRow]}
          onPress={() => item.route ? router.push(item.route) : router.push(`/settings/${item.key}` as never)}>
          <View style={styles.iconWrap}><Text style={styles.icon}>{item.icon}</Text></View>
          <View style={{ flex: 1 }}><Text style={styles.rowTitle}>{item.label}</Text><Text style={styles.rowSub}>{item.subtitle}</Text></View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      ))}
    </View>
    <View style={{ height: 36 }} />
  </ScrollView></SafeAreaView></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#ffffff' }, safe: { flex: 1 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }, content: { paddingHorizontal: 18, paddingBottom: 28 },
  top: { height: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, backButton: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#f9fafb', alignItems: 'center', justifyContent: 'center' }, back: { color: '#111827', fontSize: 34, lineHeight: 36, marginTop: -4 }, topTitle: { color: '#111827', fontSize: 17, fontWeight: '900' },
  accountCard: { marginTop: 14, borderRadius: 22, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fafafa', padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14 }, avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#ddd6fe', alignItems: 'center', justifyContent: 'center' }, avatarText: { color: '#5b21b6', fontSize: 14, fontWeight: '900' }, name: { color: '#111827', fontSize: 16, fontWeight: '900' }, role: { color: '#6b7280', fontSize: 12, marginTop: 4 },
  menu: { marginTop: 16, borderRadius: 22, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#ffffff', overflow: 'hidden' }, row: { minHeight: 76, paddingHorizontal: 14, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e5e7eb' }, lastRow: { borderBottomWidth: 0 }, iconWrap: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#f5f3ff', alignItems: 'center', justifyContent: 'center' }, icon: { color: '#7c3aed', fontSize: 17, fontWeight: '900' }, rowTitle: { color: '#111827', fontSize: 14, fontWeight: '900' }, rowSub: { color: '#6b7280', fontSize: 11, lineHeight: 16, marginTop: 3 }, chevron: { color: '#9ca3af', fontSize: 25 },
  title: { color: '#111827', fontSize: 30, fontWeight: '900' }, copy: { color: '#6b7280', marginTop: 8, textAlign: 'center' }, primary: { marginTop: 20, minWidth: 150, height: 50, borderRadius: 14, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center' }, primaryText: { color: '#fff', fontWeight: '900' },
});
