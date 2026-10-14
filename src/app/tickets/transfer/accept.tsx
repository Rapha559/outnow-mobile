import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/auth-context';
import { API_BASE, apiRequest } from '@/lib/api';
import { publishTicketRefresh } from '@/lib/ticket-sync';

type TransferPreview = {
  id: string;
  status: string;
  expiresAt: string;
  isRecipient: boolean;
  isTicketAvailable: boolean;
  alreadyAcceptedByCurrentUser: boolean;
  sender: { name: string };
  recipient: { email: string; name: string | null };
  ticket: {
    id: string;
    ticketNumber: string;
    ticketType: string;
    event: {
      id: string;
      title: string;
      date: string;
      endDate: string | null;
      venue: string;
      location: string;
      image: string | null;
    };
  };
};

type PreviewResponse = { success: true; transfer: TransferPreview };
type AcceptResponse = { success: true; ticketId: string; alreadyAccepted: boolean };

function imageUrl(value?: string | null) {
  if (!value) return `${API_BASE}/images/event-placeholder.jpg`;
  return /^https?:\/\//i.test(value) ? value : `${API_BASE}${value.startsWith('/') ? value : `/${value}`}`;
}

function dateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default function TicketTransferAcceptScreen() {
  const params = useLocalSearchParams<{ token?: string }>();
  const token = Array.isArray(params.token) ? params.token[0] : params.token;
  const { loading: authLoading, isAuthenticated, sessionToken } = useAuth();
  const [transfer, setTransfer] = useState<TransferPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState('');
  const [acceptedTicketId, setAcceptedTicketId] = useState('');

  const redirectPath = token ? `/tickets/transfer/accept?token=${encodeURIComponent(token)}` : '/(tabs)/tickets';

  const load = useCallback(async () => {
    if (authLoading) return;
    if (!token || !/^[a-f0-9]{64}$/.test(token)) {
      setError('This transfer link is invalid.');
      setLoading(false);
      return;
    }
    if (!isAuthenticated || !sessionToken) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      const data = await apiRequest<PreviewResponse>(
        `/api/mobile/ticket-transfers/accept?token=${encodeURIComponent(token)}`,
        {},
        sessionToken,
      );
      setTransfer(data.transfer);
      if (data.transfer.alreadyAcceptedByCurrentUser) {
        setAcceptedTicketId(data.transfer.ticket.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load this ticket transfer.');
    } finally {
      setLoading(false);
    }
  }, [authLoading, isAuthenticated, sessionToken, token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function acceptTransfer() {
    if (!sessionToken || !token || accepting) return;
    try {
      setAccepting(true);
      setError('');
      const data = await apiRequest<AcceptResponse>(
        '/api/mobile/ticket-transfers/accept',
        { method: 'POST', body: JSON.stringify({ token }) },
        sessionToken,
      );
      setAcceptedTicketId(data.ticketId);
      publishTicketRefresh();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to accept this ticket transfer.');
    } finally {
      setAccepting(false);
    }
  }

  if (authLoading || loading) {
    return <View style={styles.screen}><SafeAreaView style={styles.center}><ActivityIndicator size="large" color="#7c3aed"/><Text style={styles.loadingText}>Loading ticket transfer…</Text></SafeAreaView></View>;
  }

  if (!isAuthenticated) {
    return <View style={styles.screen}><SafeAreaView style={styles.center}><View style={styles.iconCircle}><Text style={styles.icon}>🎟</Text></View><Text style={styles.eyebrow}>TICKET TRANSFER</Text><Text style={styles.title}>Sign in to receive your ticket</Text><Text style={styles.copy}>Use the email address that received the OutNow transfer invitation.</Text><Pressable style={styles.primary} onPress={() => router.replace({ pathname: '/login', params: { redirect: redirectPath } })}><Text style={styles.primaryText}>Sign in</Text></Pressable><Pressable style={styles.secondary} onPress={() => router.replace({ pathname: '/signup', params: { redirect: redirectPath } })}><Text style={styles.secondaryText}>Create account</Text></Pressable></SafeAreaView></View>;
  }

  if (!transfer) {
    return <View style={styles.screen}><SafeAreaView style={styles.center}><Text style={styles.eyebrow}>TRANSFER UNAVAILABLE</Text><Text style={styles.title}>We couldn’t open this transfer</Text><Text style={styles.copy}>{error || 'The invitation may be invalid or expired.'}</Text><Pressable style={styles.primary} onPress={() => void load()}><Text style={styles.primaryText}>Try again</Text></Pressable><Pressable style={styles.secondary} onPress={() => router.replace('/(tabs)/tickets')}><Text style={styles.secondaryText}>My Tickets</Text></Pressable></SafeAreaView></View>;
  }

  const accepted = transfer.status === 'ACCEPTED' && transfer.alreadyAcceptedByCurrentUser;
  const pending = transfer.status === 'PENDING';
  const canAccept = pending && transfer.isRecipient && transfer.isTicketAvailable;

  return <View style={styles.screen}><SafeAreaView edges={['top']} style={styles.safe}><ScrollView contentContainerStyle={styles.content}>
    <View style={styles.top}><Pressable style={styles.circle} onPress={() => router.back()}><Text style={styles.back}>‹</Text></Pressable><Text style={styles.brand}>OUTNOW</Text><View style={styles.circleSpacer}/></View>
    <Text style={styles.eyebrow}>{accepted ? 'TRANSFER ACCEPTED' : 'YOU’VE RECEIVED A TICKET'}</Text>
    <Text style={styles.title}>{transfer.ticket.event.title}</Text>
    <Text style={styles.copy}>{accepted ? 'This ticket is now in your OutNow account.' : `${transfer.sender.name} sent you an OutNow ticket.`}</Text>

    <Image source={{ uri: imageUrl(transfer.ticket.event.image) }} style={styles.hero} contentFit="cover" />

    <View style={styles.ticketCard}>
      <View style={styles.ticketTop}><Text style={styles.ticketType}>{transfer.ticket.ticketType}</Text><View style={[styles.statusBadge, accepted && styles.acceptedBadge]}><Text style={[styles.statusText, accepted && styles.acceptedText]}>{accepted ? 'ACCEPTED' : transfer.status}</Text></View></View>
      <Text style={styles.eventTitle}>{transfer.ticket.event.title}</Text>
      <Text style={styles.meta}>{dateTime(transfer.ticket.event.date)}</Text>
      <Text style={styles.meta}>{transfer.ticket.event.venue}{transfer.ticket.event.location ? ` · ${transfer.ticket.event.location}` : ''}</Text>
      <View style={styles.divider}/>
      <Text style={styles.label}>Sent by</Text><Text style={styles.value}>{transfer.sender.name}</Text>
      <Text style={styles.label}>Transfer expires</Text><Text style={styles.value}>{dateTime(transfer.expiresAt)}</Text>
    </View>

    {!!error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}

    {!transfer.isRecipient ? <View style={styles.notice}><Text style={styles.noticeTitle}>Wrong account</Text><Text style={styles.noticeText}>This ticket was sent to {transfer.recipient.email}. Sign in with that email address to accept it.</Text></View>
    : accepted ? <View style={styles.success}><Text style={styles.successIcon}>✓</Text><View style={styles.successBody}><Text style={styles.successTitle}>Ticket is yours</Text><Text style={styles.successText}>A new QR code has been generated and the sender’s old QR code no longer works.</Text></View></View>
    : !pending ? <View style={styles.notice}><Text style={styles.noticeTitle}>Transfer unavailable</Text><Text style={styles.noticeText}>{transfer.status === 'EXPIRED' ? 'This transfer invitation has expired. Ask the sender to send it again.' : 'This transfer is no longer available.'}</Text></View>
    : !transfer.isTicketAvailable ? <View style={styles.notice}><Text style={styles.noticeTitle}>Ticket unavailable</Text><Text style={styles.noticeText}>This ticket can no longer be transferred.</Text></View>
    : null}

    {canAccept && <Pressable disabled={accepting} style={[styles.primary, accepting && styles.disabled]} onPress={() => void acceptTransfer()}>{accepting ? <ActivityIndicator color="#fff"/> : <Text style={styles.primaryText}>Accept ticket</Text>}</Pressable>}
    {(acceptedTicketId || accepted) && <Pressable style={styles.primary} onPress={() => router.replace({ pathname: '/ticket/[id]', params: { id: acceptedTicketId || transfer.ticket.id } })}><Text style={styles.primaryText}>Open my ticket</Text></Pressable>}
    <Pressable style={styles.secondary} onPress={() => router.replace('/(tabs)/tickets')}><Text style={styles.secondaryText}>Go to My Tickets</Text></Pressable>
    <Text style={styles.security}>For your security, OutNow changes the ticket QR code when ownership is transferred.</Text>
    <View style={{ height: 40 }}/>
  </ScrollView></SafeAreaView></View>;
}

const styles = StyleSheet.create({
  screen:{flex:1,backgroundColor:'#fff'},safe:{flex:1},center:{flex:1,alignItems:'center',justifyContent:'center',padding:28},content:{paddingHorizontal:18,paddingBottom:30},
  top:{height:58,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},circle:{width:40,height:40,borderRadius:20,borderWidth:1,borderColor:'#e5e7eb',backgroundColor:'#f9fafb',alignItems:'center',justifyContent:'center'},circleSpacer:{width:40},back:{fontSize:34,lineHeight:36,color:'#111827',marginTop:-3},brand:{color:'#111827',fontSize:17,fontWeight:'900',letterSpacing:1.5},
  iconCircle:{width:68,height:68,borderRadius:34,backgroundColor:'#f3efff',alignItems:'center',justifyContent:'center',marginBottom:22},icon:{fontSize:30},eyebrow:{color:'#7c3aed',fontSize:11,fontWeight:'900',letterSpacing:1.8,textAlign:'center'},title:{color:'#111827',fontSize:30,lineHeight:36,fontWeight:'900',textAlign:'center',marginTop:10},copy:{color:'#6b7280',fontSize:14,lineHeight:21,textAlign:'center',marginTop:9},loadingText:{color:'#6b7280',marginTop:12},
  hero:{width:'100%',aspectRatio:16/9,borderRadius:22,backgroundColor:'#f3f4f6',marginTop:24},ticketCard:{marginTop:16,borderRadius:20,borderWidth:1,borderColor:'#e5e7eb',backgroundColor:'#fff',padding:18},ticketTop:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12},ticketType:{color:'#7c3aed',fontSize:11,fontWeight:'900',letterSpacing:1,textTransform:'uppercase'},statusBadge:{borderRadius:999,backgroundColor:'#f3f4f6',paddingHorizontal:10,paddingVertical:6},acceptedBadge:{backgroundColor:'#ecfdf5'},statusText:{color:'#4b5563',fontSize:9,fontWeight:'900'},acceptedText:{color:'#166534'},eventTitle:{color:'#111827',fontSize:22,fontWeight:'900',marginTop:12},meta:{color:'#6b7280',fontSize:12,lineHeight:18,marginTop:5},divider:{height:StyleSheet.hairlineWidth,backgroundColor:'#e5e7eb',marginVertical:15},label:{color:'#9ca3af',fontSize:9,fontWeight:'800',textTransform:'uppercase',letterSpacing:.8,marginTop:8},value:{color:'#111827',fontSize:13,fontWeight:'800',marginTop:3},
  notice:{marginTop:16,borderRadius:16,borderWidth:1,borderColor:'#fde68a',backgroundColor:'#fffbeb',padding:14},noticeTitle:{color:'#92400e',fontSize:13,fontWeight:'900'},noticeText:{color:'#92400e',fontSize:12,lineHeight:18,marginTop:4},success:{marginTop:16,borderRadius:16,borderWidth:1,borderColor:'#bbf7d0',backgroundColor:'#ecfdf5',padding:14,flexDirection:'row',gap:12,alignItems:'center'},successIcon:{width:34,height:34,borderRadius:17,backgroundColor:'#16a34a',color:'#fff',fontSize:21,fontWeight:'900',textAlign:'center',lineHeight:34},successBody:{flex:1},successTitle:{color:'#166534',fontSize:14,fontWeight:'900'},successText:{color:'#166534',fontSize:11,lineHeight:17,marginTop:3},errorBox:{marginTop:16,borderRadius:14,borderWidth:1,borderColor:'#fecaca',backgroundColor:'#fef2f2',padding:12},errorText:{color:'#dc2626',fontSize:12,textAlign:'center'},
  primary:{minHeight:52,borderRadius:15,backgroundColor:'#7c3aed',alignItems:'center',justifyContent:'center',marginTop:16,paddingHorizontal:16},primaryText:{color:'#fff',fontSize:14,fontWeight:'900'},secondary:{minHeight:50,borderRadius:15,borderWidth:1,borderColor:'#d1d5db',alignItems:'center',justifyContent:'center',marginTop:10,paddingHorizontal:16},secondaryText:{color:'#111827',fontWeight:'800'},disabled:{opacity:.65},security:{color:'#9ca3af',fontSize:10,lineHeight:16,textAlign:'center',marginTop:14,paddingHorizontal:12},
});
