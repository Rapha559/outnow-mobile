import Constants from 'expo-constants';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/lib/api';

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
};

type NotificationResponse = {
  success: true;
  unreadCount: number;
  notifications: NotificationItem[];
};

async function syncPhoneBadge(count: number) {
  if (Constants.appOwnership === 'expo') return;
  try {
    const Notifications = await import('expo-notifications');
    await Notifications.setBadgeCountAsync(Math.max(0, count));
  } catch {
    // Some Android launchers do not support app icon badges. The in-app count still works.
  }
}

function timeLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const diff = Date.now() - date.getTime();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return 'Just now';
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`;
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(date);
}

function iconFor(type: string) {
  if (type.includes('transfer')) return '⇄';
  if (type.includes('refund')) return '↺';
  if (type.includes('payout')) return '£';
  if (type.includes('waitlist')) return '⌛';
  if (type.includes('event')) return '◫';
  if (type.includes('order') || type.includes('payment')) return '✓';
  return '•';
}

export default function NotificationsScreen() {
  const { user, sessionToken } = useAuth();
  const [data, setData] = useState<NotificationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');

  const load = useCallback(async (refresh = false) => {
    if (!sessionToken) {
      setLoading(false);
      void syncPhoneBadge(0);
      return;
    }
    try {
      refresh ? setRefreshing(true) : setLoading(true);
      setError('');
      const next = await apiRequest<NotificationResponse>('/api/mobile/notifications', {}, sessionToken);
      setData(next);
      void syncPhoneBadge(next.unreadCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load notifications.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sessionToken]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const items = useMemo(() => {
    const list = data?.notifications || [];
    return filter === 'UNREAD' ? list.filter((item) => !item.readAt) : list;
  }, [data?.notifications, filter]);

  async function markRead(item: NotificationItem) {
    if (!sessionToken || item.readAt) return;
    const nextUnreadCount = Math.max(0, (data?.unreadCount || 0) - 1);
    setData((current) => current ? {
      ...current,
      unreadCount: Math.max(0, current.unreadCount - 1),
      notifications: current.notifications.map((entry) => entry.id === item.id ? { ...entry, readAt: new Date().toISOString() } : entry),
    } : current);
    void syncPhoneBadge(nextUnreadCount);
    try {
      await apiRequest('/api/mobile/notifications', { method: 'PATCH', body: JSON.stringify({ id: item.id }) }, sessionToken);
    } catch {
      void load();
    }
  }

  async function markAllRead() {
    if (!sessionToken || !data?.unreadCount) return;
    const now = new Date().toISOString();
    setData((current) => current ? { ...current, unreadCount: 0, notifications: current.notifications.map((item) => ({ ...item, readAt: item.readAt || now })) } : current);
    void syncPhoneBadge(0);
    try {
      await apiRequest('/api/mobile/notifications', { method: 'PATCH', body: JSON.stringify({ markAll: true }) }, sessionToken);
    } catch {
      void load();
    }
  }

  function openItem(item: NotificationItem) {
    void markRead(item);
    const url = typeof item.data?.url === 'string' ? item.data.url : '';
    if (url) { router.push(url as never); return; }
    const ticketId = typeof item.data?.ticketId === 'string' ? item.data.ticketId : '';
    if (ticketId) { router.push(`/ticket/${ticketId}` as never); return; }
    const eventId = typeof item.data?.eventId === 'string' ? item.data.eventId : '';
    if (eventId) { router.push(`/event/${eventId}` as never); return; }
    const orderId = typeof item.data?.orderId === 'string' ? item.data.orderId : '';
    if (orderId) { router.push(`/customer/orders?orderId=${encodeURIComponent(orderId)}` as never); return; }
    const transferToken = typeof item.data?.transferToken === 'string' ? item.data.transferToken : '';
    if (transferToken) { router.push(`/tickets/transfer/accept?token=${encodeURIComponent(transferToken)}` as never); }
  }

  if (!user) {
    return <View style={styles.screen}><SafeAreaView style={styles.center}><Text style={styles.title}>Notifications</Text><Text style={styles.copy}>Sign in to view your OutNow notifications.</Text><Pressable style={styles.primary} onPress={() => router.replace('/login')}><Text style={styles.primaryText}>Sign in</Text></Pressable></SafeAreaView></View>;
  }

  return <View style={styles.screen}><SafeAreaView edges={['top']} style={styles.safe}>
    <View style={styles.top}>
      <Pressable style={styles.backButton} onPress={() => router.back()}><Text style={styles.back}>‹</Text></Pressable>
      <Text style={styles.topTitle}>Notifications</Text>
      <Pressable style={styles.settingsButton} onPress={() => router.push('/settings/notifications' as never)}><Text style={styles.settingsText}>⚙</Text></Pressable>
    </View>

    <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />} contentContainerStyle={styles.content}>
      <View style={styles.headingRow}><View><Text style={styles.eyebrow}>OUTNOW UPDATES</Text><Text style={styles.title}>Notification centre</Text></View>{Boolean(data?.unreadCount) && <View style={styles.unreadBadge}><Text style={styles.unreadBadgeText}>{data?.unreadCount}</Text></View>}</View>
      <Text style={styles.copy}>Tickets, transfers, refunds, events and promoter updates all in one place.</Text>

      <View style={styles.toolbar}>
        <View style={styles.filters}>
          <Pressable style={[styles.filter, filter === 'ALL' && styles.filterActive]} onPress={() => setFilter('ALL')}><Text style={[styles.filterText, filter === 'ALL' && styles.filterTextActive]}>All</Text></Pressable>
          <Pressable style={[styles.filter, filter === 'UNREAD' && styles.filterActive]} onPress={() => setFilter('UNREAD')}><Text style={[styles.filterText, filter === 'UNREAD' && styles.filterTextActive]}>Unread {data?.unreadCount ? `(${data.unreadCount})` : ''}</Text></Pressable>
        </View>
        {Boolean(data?.unreadCount) && <Pressable onPress={() => void markAllRead()}><Text style={styles.markAll}>Mark all read</Text></Pressable>}
      </View>

      {loading ? <View style={styles.loader}><ActivityIndicator size="large" color="#7c3aed" /></View> : error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text><Pressable onPress={() => void load()}><Text style={styles.retry}>Try again</Text></Pressable></View> : items.length ? <View style={styles.list}>
        {items.map((item) => <Pressable key={item.id} style={({pressed}) => [styles.row, !item.readAt && styles.rowUnread, pressed && {opacity:0.78}]} onPress={() => openItem(item)}>
          <View style={[styles.iconWrap, !item.readAt && styles.iconWrapUnread]}><Text style={styles.icon}>{iconFor(item.type)}</Text></View>
          <View style={styles.rowBody}>
            <View style={styles.rowTop}><Text style={[styles.rowTitle, !item.readAt && styles.rowTitleUnread]} numberOfLines={1}>{item.title}</Text><Text style={styles.time}>{timeLabel(item.createdAt)}</Text></View>
            <Text style={styles.rowCopy}>{item.body}</Text>
            {!item.readAt && <View style={styles.newPill}><Text style={styles.newPillText}>NEW</Text></View>}
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>)}
      </View> : <View style={styles.empty}><View style={styles.emptyIcon}><Text style={styles.emptyIconText}>✓</Text></View><Text style={styles.emptyTitle}>{filter === 'UNREAD' ? 'You’re all caught up' : 'No notifications yet'}</Text><Text style={styles.emptyCopy}>{filter === 'UNREAD' ? 'There are no unread notifications.' : 'Important OutNow updates will appear here.'}</Text></View>}
      <View style={{height:60}} />
    </ScrollView>
  </SafeAreaView></View>;
}

const styles=StyleSheet.create({
  screen:{flex:1,backgroundColor:'#fff'},safe:{flex:1},center:{flex:1,alignItems:'center',justifyContent:'center',padding:24},content:{paddingHorizontal:18},
  top:{height:58,paddingHorizontal:18,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},backButton:{width:40,height:40,borderRadius:20,borderWidth:1,borderColor:'#e5e7eb',alignItems:'center',justifyContent:'center'},back:{fontSize:34,lineHeight:36,marginTop:-4,color:'#111827'},topTitle:{fontSize:16,fontWeight:'900',color:'#111827'},settingsButton:{width:40,height:40,borderRadius:20,backgroundColor:'#f5f3ff',alignItems:'center',justifyContent:'center'},settingsText:{fontSize:17,color:'#7c3aed'},
  headingRow:{flexDirection:'row',alignItems:'flex-end',justifyContent:'space-between',gap:12,marginTop:10},eyebrow:{color:'#7c3aed',fontSize:10,fontWeight:'900',letterSpacing:1.8},title:{color:'#111827',fontSize:33,fontWeight:'900',marginTop:7},copy:{color:'#6b7280',fontSize:13,lineHeight:20,marginTop:7},unreadBadge:{minWidth:32,height:32,borderRadius:16,backgroundColor:'#7c3aed',alignItems:'center',justifyContent:'center',paddingHorizontal:8},unreadBadgeText:{color:'#fff',fontWeight:'900'},
  toolbar:{marginTop:22,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10},filters:{flexDirection:'row',gap:8},filter:{paddingHorizontal:13,paddingVertical:8,borderRadius:999,backgroundColor:'#f3f4f6'},filterActive:{backgroundColor:'#111827'},filterText:{color:'#6b7280',fontSize:11,fontWeight:'900'},filterTextActive:{color:'#fff'},markAll:{color:'#7c3aed',fontSize:11,fontWeight:'900'},
  loader:{minHeight:260,alignItems:'center',justifyContent:'center'},list:{marginTop:14,borderRadius:22,borderWidth:1,borderColor:'#e5e7eb',overflow:'hidden'},row:{minHeight:96,padding:14,flexDirection:'row',alignItems:'center',gap:12,backgroundColor:'#fff',borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:'#e5e7eb'},rowUnread:{backgroundColor:'#faf7ff'},iconWrap:{width:44,height:44,borderRadius:14,backgroundColor:'#f3f4f6',alignItems:'center',justifyContent:'center'},iconWrapUnread:{backgroundColor:'#ede9fe'},icon:{color:'#7c3aed',fontSize:18,fontWeight:'900'},rowBody:{flex:1},rowTop:{flexDirection:'row',alignItems:'center',gap:8},rowTitle:{flex:1,color:'#374151',fontSize:14,fontWeight:'800'},rowTitleUnread:{color:'#111827',fontWeight:'900'},time:{color:'#9ca3af',fontSize:9,fontWeight:'700'},rowCopy:{color:'#6b7280',fontSize:11,lineHeight:17,marginTop:4},newPill:{alignSelf:'flex-start',marginTop:7,borderRadius:999,backgroundColor:'#7c3aed',paddingHorizontal:7,paddingVertical:3},newPillText:{color:'#fff',fontSize:7,fontWeight:'900',letterSpacing:1},chevron:{color:'#9ca3af',fontSize:24},
  empty:{marginTop:28,borderRadius:24,borderWidth:1,borderColor:'#e5e7eb',backgroundColor:'#fafafa',padding:28,alignItems:'center'},emptyIcon:{width:54,height:54,borderRadius:27,backgroundColor:'#ede9fe',alignItems:'center',justifyContent:'center'},emptyIconText:{color:'#7c3aed',fontSize:20,fontWeight:'900'},emptyTitle:{color:'#111827',fontSize:18,fontWeight:'900',marginTop:15},emptyCopy:{color:'#6b7280',fontSize:12,lineHeight:18,textAlign:'center',marginTop:6},
  errorBox:{marginTop:22,borderRadius:18,backgroundColor:'#fef2f2',padding:16},errorText:{color:'#b91c1c',fontSize:12},retry:{color:'#7c3aed',fontWeight:'900',marginTop:10},primary:{marginTop:20,minWidth:150,height:50,borderRadius:14,backgroundColor:'#7c3aed',alignItems:'center',justifyContent:'center'},primaryText:{color:'#fff',fontWeight:'900'},
});
