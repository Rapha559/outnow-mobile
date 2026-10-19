import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { apiRequest } from '@/lib/api';

type WaitlistPayload = {
  success: true;
  waitlist: {
    enabled: boolean;
    open: boolean;
    opensAt: string | null;
    closesAt: string | null;
    notifyOnSale: boolean;
    message: string | null;
    count: number;
    salesStart: string | null;
    joined: boolean;
  };
};

type Props = {
  eventId: string;
  isAuthenticated: boolean;
  sessionToken?: string | null;
  onVisibilityChange?: (visible: boolean) => void;
};

function formatDate(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default function EventPreSaleWaitlistCard({ eventId, isAuthenticated, sessionToken, onVisibilityChange }: Props) {
  const [data, setData] = useState<WaitlistPayload['waitlist'] | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function refresh() {
    try {
      const result = await apiRequest<WaitlistPayload>(`/api/mobile/events/${encodeURIComponent(eventId)}/presale-waitlist`, {}, sessionToken || undefined);
      setData(result.waitlist);
      const salesStart = result.waitlist.salesStart ? new Date(result.waitlist.salesStart).getTime() : 0;
      onVisibilityChange?.(Boolean(result.waitlist.enabled && salesStart > Date.now()));
    } catch {
      setData(null);
      onVisibilityChange?.(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, [eventId, sessionToken]);

  if (!data?.enabled || !data.salesStart || new Date(data.salesStart).getTime() <= Date.now()) {
    return null;
  }

  async function join() {
    if (!isAuthenticated || !sessionToken) {
      router.push({ pathname: '/login', params: { redirect: `/event/${eventId}` } });
      return;
    }
    try {
      setBusy(true);
      setMessage('');
      const result = await apiRequest<{ success: true; message: string }>(
        `/api/mobile/events/${encodeURIComponent(eventId)}/presale-waitlist`,
        { method: 'POST' },
        sessionToken,
      );
      setMessage(result.message);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to join the waitlist.');
    } finally {
      setBusy(false);
    }
  }

  async function leave() {
    if (!sessionToken) return;
    try {
      setBusy(true);
      setMessage('');
      const result = await apiRequest<{ success: true; message: string }>(
        `/api/mobile/events/${encodeURIComponent(eventId)}/presale-waitlist`,
        { method: 'DELETE' },
        sessionToken,
      );
      setMessage(result.message);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to leave the waitlist.');
    } finally {
      setBusy(false);
    }
  }

  const saleText = formatDate(data.salesStart);
  const opensText = formatDate(data.opensAt);

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>PRE-SALE WAITLIST</Text>
      <Text style={styles.title}>{data.open ? 'Join the event waitlist' : 'Waitlist opening soon'}</Text>
      <Text style={styles.copy}>{data.message || 'Join the waitlist to be notified when tickets go on sale.'}</Text>
      {!!saleText && <Text style={styles.sale}>Tickets go on sale {saleText}</Text>}
      {!data.open && !!opensText && <Text style={styles.opens}>Waitlist opens {opensText}</Text>}
      <View style={styles.metaRow}><Text style={styles.meta}>{data.count} joined</Text><Text style={styles.meta}>Joining does not guarantee a ticket</Text></View>

      {data.joined ? (
        <>
          <View style={styles.joined}><Text style={styles.joinedText}>✓ You are on the waitlist</Text></View>
          <Pressable disabled={busy} onPress={() => void leave()} style={[styles.secondary, busy && styles.disabled]}>
            {busy ? <ActivityIndicator color="#7c3aed" /> : <Text style={styles.secondaryText}>Leave waitlist</Text>}
          </Pressable>
        </>
      ) : (
        <Pressable disabled={busy || !data.open} onPress={() => void join()} style={[styles.primary, (!data.open || busy) && styles.disabled]}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{data.open ? (isAuthenticated ? 'Join waitlist' : 'Sign in & join waitlist') : 'Waitlist not open yet'}</Text>}
        </Pressable>
      )}

      {!!message && <Text style={styles.message}>{message}</Text>}
      {data.notifyOnSale && <Text style={styles.note}>OutNow will send an email and, where enabled, a phone notification when ticket sales open.</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card:{marginTop:22,borderRadius:20,borderWidth:1,borderColor:'#ddd6fe',backgroundColor:'#faf5ff',padding:16},
  eyebrow:{color:'#7c3aed',fontSize:10,fontWeight:'900',letterSpacing:1.4},
  title:{color:'#111827',fontSize:21,fontWeight:'900',marginTop:6},
  copy:{color:'#4b5563',fontSize:13,lineHeight:20,marginTop:8},
  sale:{color:'#111827',fontSize:13,fontWeight:'900',marginTop:12},
  opens:{color:'#7c3aed',fontSize:12,fontWeight:'800',marginTop:5},
  metaRow:{marginTop:12,gap:4},meta:{color:'#6b7280',fontSize:10,lineHeight:15},
  joined:{marginTop:14,borderRadius:13,backgroundColor:'#ecfdf5',borderWidth:1,borderColor:'#bbf7d0',padding:12,alignItems:'center'},
  joinedText:{color:'#166534',fontWeight:'900'},
  primary:{height:50,borderRadius:14,backgroundColor:'#7c3aed',alignItems:'center',justifyContent:'center',marginTop:14},
  primaryText:{color:'#fff',fontWeight:'900'},
  secondary:{height:46,borderRadius:14,borderWidth:1,borderColor:'#7c3aed',alignItems:'center',justifyContent:'center',marginTop:9},
  secondaryText:{color:'#7c3aed',fontWeight:'900'},
  disabled:{opacity:.5},message:{color:'#374151',fontSize:11,textAlign:'center',marginTop:10,fontWeight:'700'},
  note:{color:'#6b7280',fontSize:10,lineHeight:15,textAlign:'center',marginTop:9},
});