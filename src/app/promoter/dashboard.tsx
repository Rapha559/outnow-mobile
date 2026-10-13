import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/lib/api';

type DashboardEvent = {
  id: string;
  title: string;
  date: string;
  venue: string;
  location: string;
  status: string;
  category: string;
  capacity: number;
  ticketsSold: number;
  paidTickets: number;
  revenue: number;
};

type DashboardResponse = {
  success: true;
  promoter: {
    id: string;
    businessName: string;
    isVerified: boolean;
    stripeOnboardingDone: boolean;
    stripeChargesEnabled: boolean;
    stripePayoutsEnabled: boolean;
  };
  stats: {
    totalEvents: number;
    ticketsSold: number;
    paidOrders: number;
    paidRevenue: number;
    netPayout: number;
    refunds: number;
    checkedIn: number;
  };
  payout: {
    pending: number;
    available: number;
    processing: number;
    paid: number;
    outstandingDebt: number;
  };
  events: DashboardEvent[];
};

function money(value: number) {
  return `£${value.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function dateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

export default function PromoterDashboardScreen() {
  const { user, sessionToken, loading: authLoading } = useAuth();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async (refresh = false) => {
    if (!sessionToken || user?.role !== 'PROMOTER') return;
    try {
      refresh ? setRefreshing(true) : setLoading(true);
      setError('');
      const response = await apiRequest<DashboardResponse>('/api/mobile/promoter/dashboard', {}, sessionToken);
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load dashboard.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sessionToken, user?.role]);

  useEffect(() => {
    if (!authLoading && user?.role === 'PROMOTER') void loadDashboard();
    else if (!authLoading) setLoading(false);
  }, [authLoading, user?.role, loadDashboard]);

  const upcomingEvents = useMemo(() => {
    const now = Date.now();
    return (data?.events || [])
      .filter((event) => new Date(event.date).getTime() >= now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [data?.events]);

  if (authLoading || loading) {
    return <View style={styles.screen}><SafeAreaView style={styles.center}><ActivityIndicator size="large" color="#7c3aed" /></SafeAreaView></View>;
  }

  if (!user || user.role !== 'PROMOTER') {
    return <View style={styles.screen}><SafeAreaView style={styles.center}><Text style={styles.errorTitle}>Promoter access required</Text><Text style={styles.errorText}>Sign in with a promoter account to open this dashboard.</Text><Pressable style={styles.primaryButton} onPress={() => router.replace('/login')}><Text style={styles.primaryText}>Sign in</Text></Pressable></SafeAreaView></View>;
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadDashboard(true)} tintColor="#7c3aed" colors={['#7c3aed']} />}>
          <View style={styles.topBar}>
            <Pressable style={styles.backButton} onPress={() => router.back()}><Text style={styles.backText}>‹</Text></Pressable>
            <Text style={styles.topTitle}>Promoter</Text><View style={styles.topSpacer} />
          </View>

          <Text style={styles.eyebrow}>PROMOTER PORTAL</Text>
          <Text style={styles.title}>Dashboard</Text>
          <Text style={styles.subtitle}>{data?.promoter.businessName || user.name}</Text>

          {!!error && <View style={styles.errorBox}><Text style={styles.errorTitle}>Couldn’t load dashboard</Text><Text style={styles.errorText}>{error}</Text><Pressable style={styles.retryButton} onPress={() => void loadDashboard()}><Text style={styles.retryText}>Try again</Text></Pressable></View>}

          {data && <>
            <View style={styles.statusCard}>
              <View><Text style={styles.statusLabel}>ACCOUNT STATUS</Text><Text style={styles.statusTitle}>{data.promoter.isVerified ? 'Verified promoter' : 'Promoter setup in progress'}</Text></View>
              <View style={[styles.statusDot, data.promoter.isVerified && styles.statusDotReady]} />
            </View>

            <View style={styles.statsGrid}>
              <StatCard label="Events" value={String(data.stats.totalEvents)} />
              <StatCard label="Tickets sold" value={data.stats.ticketsSold.toLocaleString()} />
              <StatCard label="Paid revenue" value={money(data.stats.paidRevenue)} />
              <StatCard label="Net payout" value={money(data.stats.netPayout)} />
              <StatCard label="Orders" value={String(data.stats.paidOrders)} />
              <StatCard label="Checked in" value={String(data.stats.checkedIn)} />
            </View>

            <View style={styles.sectionHeader}><View><Text style={styles.sectionTitle}>Payouts</Text><Text style={styles.sectionCopy}>Your current promoter balance</Text></View></View>
            <View style={styles.payoutCard}>
              <PayoutRow label="Pending" value={money(data.payout.pending)} />
              <PayoutRow label="Available" value={money(data.payout.available)} />
              <PayoutRow label="Processing" value={money(data.payout.processing)} />
              <PayoutRow label="Paid out" value={money(data.payout.paid)} last />
              {data.payout.outstandingDebt > 0 && <Text style={styles.debtText}>Outstanding balance: {money(data.payout.outstandingDebt)}</Text>}
            </View>

            <View style={styles.quickActions}>
              <Pressable style={styles.primaryButton} onPress={() => router.push('/promoter/events')}><Text style={styles.primaryText}>Manage events</Text></Pressable>
              <Pressable style={styles.secondaryButton} onPress={() => router.push('/promoter/create-event')}><Text style={styles.secondaryText}>Create event</Text></Pressable>
            </View>

            <View style={styles.sectionHeader}><View><Text style={styles.sectionTitle}>Upcoming events</Text><Text style={styles.sectionCopy}>Your next live events</Text></View><Text style={styles.count}>{upcomingEvents.length}</Text></View>

            {upcomingEvents.length === 0 ? (
              <View style={styles.emptyCard}><Text style={styles.emptyTitle}>No upcoming events</Text><Text style={styles.emptyCopy}>Create an event to start selling tickets from the app.</Text></View>
            ) : (
              <View style={styles.eventList}>{upcomingEvents.slice(0, 6).map((event) => (
                <View key={event.id} style={styles.eventCard}>
                  <View style={styles.eventTopRow}><View style={styles.eventTextWrap}><Text style={styles.eventStatus}>{event.status.replace(/_/g, ' ')}</Text><Text style={styles.eventTitle}>{event.title}</Text><Text style={styles.eventMeta}>{dateLabel(event.date)} · {event.venue}</Text></View></View>
                  <View style={styles.eventNumbers}><Text style={styles.eventNumber}>{event.ticketsSold}/{event.capacity} sold</Text><Text style={styles.eventRevenue}>{money(event.revenue)}</Text></View>
                </View>
              ))}</View>
            )}
          </>}

          <View style={{ height: 50 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return <View style={styles.statCard}><Text style={styles.statLabel}>{label}</Text><Text style={styles.statValue}>{value}</Text></View>;
}

function PayoutRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return <View style={[styles.payoutRow, last && styles.payoutRowLast]}><Text style={styles.payoutLabel}>{label}</Text><Text style={styles.payoutValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#ffffff' }, safeArea: { flex: 1 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }, content: { paddingHorizontal: 18 },
  topBar: { height: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }, backButton: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#f9fafb', alignItems: 'center', justifyContent: 'center' }, backText: { color: '#111827', fontSize: 34, lineHeight: 36, marginTop: -3 }, topTitle: { color: '#111827', fontSize: 15, fontWeight: '800' }, topSpacer: { width: 40 },
  eyebrow: { color: '#7c3aed', fontSize: 11, fontWeight: '900', letterSpacing: 1.8 }, title: { color: '#111827', fontSize: 34, lineHeight: 40, fontWeight: '900', marginTop: 8 }, subtitle: { color: '#6b7280', fontSize: 14, marginTop: 6 },
  statusCard: { marginTop: 24, borderRadius: 18, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fafafa', padding: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, statusLabel: { color: '#7c3aed', fontSize: 9, fontWeight: '900', letterSpacing: 1.3 }, statusTitle: { color: '#111827', fontSize: 16, fontWeight: '800', marginTop: 6 }, statusDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#f59e0b' }, statusDotReady: { backgroundColor: '#22c55e' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 }, statCard: { width: '48.5%', minHeight: 104, borderRadius: 18, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#ffffff', padding: 15, justifyContent: 'space-between' }, statLabel: { color: '#6b7280', fontSize: 11, fontWeight: '700' }, statValue: { color: '#111827', fontSize: 21, fontWeight: '900', marginTop: 14 },
  sectionHeader: { marginTop: 28, marginBottom: 12, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }, sectionTitle: { color: '#111827', fontSize: 21, fontWeight: '900' }, sectionCopy: { color: '#6b7280', fontSize: 11, marginTop: 3 }, count: { color: '#7c3aed', fontSize: 13, fontWeight: '900' },
  payoutCard: { borderRadius: 18, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#ffffff', overflow: 'hidden' }, payoutRow: { minHeight: 52, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e5e7eb' }, payoutRowLast: { borderBottomWidth: 0 }, payoutLabel: { color: '#6b7280', fontSize: 13, fontWeight: '700' }, payoutValue: { color: '#111827', fontSize: 14, fontWeight: '900' }, debtText: { color: '#dc2626', fontSize: 12, fontWeight: '700', paddingHorizontal: 16, paddingBottom: 14 },
  quickActions: { marginTop: 16 }, primaryButton: { height: 52, borderRadius: 15, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center', minWidth: 150, paddingHorizontal: 18 }, primaryText: { color: '#ffffff', fontSize: 14, fontWeight: '900' }, secondaryButton: { height: 52, borderRadius: 15, borderWidth: 1, borderColor: '#d1d5db', backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center', marginTop: 10 }, secondaryText: { color: '#111827', fontSize: 14, fontWeight: '800' },
  emptyCard: { minHeight: 150, borderRadius: 18, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fafafa', alignItems: 'center', justifyContent: 'center', padding: 22 }, emptyTitle: { color: '#111827', fontSize: 17, fontWeight: '900' }, emptyCopy: { color: '#6b7280', fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 6 },
  eventList: { gap: 10 }, eventCard: { borderRadius: 18, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#ffffff', padding: 16 }, eventTopRow: { flexDirection: 'row', alignItems: 'center' }, eventTextWrap: { flex: 1 }, eventStatus: { color: '#7c3aed', fontSize: 9, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' }, eventTitle: { color: '#111827', fontSize: 17, fontWeight: '900', marginTop: 5 }, eventMeta: { color: '#6b7280', fontSize: 12, marginTop: 5 }, eventNumbers: { marginTop: 14, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e5e7eb', flexDirection: 'row', justifyContent: 'space-between' }, eventNumber: { color: '#6b7280', fontSize: 12, fontWeight: '700' }, eventRevenue: { color: '#111827', fontSize: 12, fontWeight: '900' },
  errorBox: { marginTop: 18, borderRadius: 18, borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fef2f2', padding: 18, alignItems: 'center' }, errorTitle: { color: '#111827', fontSize: 18, fontWeight: '900', textAlign: 'center' }, errorText: { color: '#6b7280', textAlign: 'center', lineHeight: 20, marginTop: 7 }, retryButton: { marginTop: 14, backgroundColor: '#7c3aed', borderRadius: 12, paddingHorizontal: 18, paddingVertical: 10 }, retryText: { color: '#ffffff', fontWeight: '900' },
});
