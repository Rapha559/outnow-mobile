import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/lib/api';
import { registerRemotePush, unregisterRemotePush } from '@/lib/push-notifications';

type SettingsResponse = {
  success: true;
  notifications: {
    pushNotifications: boolean;
    emailNotifications: boolean;
    eventReminders: boolean;
    orderAlerts: boolean;
    refundAlerts: boolean;
    cancellationAlerts: boolean;
    transferAlerts: boolean;
    eventUpdateAlerts: boolean;
    waitlistAlerts: boolean;
    payoutAlerts: boolean;
  };
};

type Prefs = SettingsResponse['notifications'];

export default function NotificationSettingsScreen() {
  const { user, sessionToken } = useAuth();
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    if (!sessionToken) { setLoading(false); return; }
    try {
      setLoading(true);
      setError('');
      const data = await apiRequest<SettingsResponse>('/api/mobile/settings', {}, sessionToken);
      setPrefs(data.notifications);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load notification settings.');
    } finally {
      setLoading(false);
    }
  }, [sessionToken]);

  useEffect(() => { void load(); }, [load]);

  function toggle(key: keyof Prefs, value: boolean) {
    setPrefs((current) => current ? { ...current, [key]: value } : current);
  }

  async function save() {
    if (!sessionToken || !prefs) return;
    try {
      setSaving(true);
      setError('');
      setMessage('');
      await apiRequest('/api/mobile/settings', { method: 'PATCH', body: JSON.stringify(prefs) }, sessionToken);
      if (prefs.pushNotifications) {
        await registerRemotePush(sessionToken).catch(() => null);
      } else {
        await unregisterRemotePush(sessionToken).catch(() => null);
      }
      setMessage('Notification preferences updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save notification settings.');
    } finally {
      setSaving(false);
    }
  }

  if (!user) {
    return <View style={styles.screen}><SafeAreaView style={styles.center}><Text style={styles.title}>Notifications</Text><Text style={styles.copy}>Sign in to manage notification preferences.</Text><Pressable style={styles.primary} onPress={() => router.replace('/login')}><Text style={styles.primaryText}>Sign in</Text></Pressable></SafeAreaView></View>;
  }

  if (loading || !prefs) {
    return <View style={styles.screen}><SafeAreaView style={styles.center}><ActivityIndicator size="large" color="#7c3aed" /></SafeAreaView></View>;
  }

  const isPromoter = user.role === 'PROMOTER';

  return <View style={styles.screen}><SafeAreaView edges={['top']} style={styles.safe}><ScrollView contentContainerStyle={styles.content}>
    <View style={styles.top}><Pressable style={styles.backButton} onPress={() => router.back()}><Text style={styles.back}>‹</Text></Pressable><Text style={styles.topTitle}>Notification settings</Text><View style={{width:40}} /></View>

    <Text style={styles.eyebrow}>STAY IN CONTROL</Text>
    <Text style={styles.title}>Notifications</Text>
    <Text style={styles.copy}>Choose which OutNow updates can reach you. Important security messages may still be shown in the app.</Text>

    {!!error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}
    {!!message && <View style={styles.successBox}><Text style={styles.successText}>{message}</Text></View>}

    <Text style={styles.sectionLabel}>DELIVERY</Text>
    <View style={styles.card}>
      <Toggle label="Push notifications" subtitle="Allow OutNow to send alerts to this device" value={prefs.pushNotifications} onValueChange={(value) => toggle('pushNotifications', value)} />
      <Toggle label="Email notifications" subtitle="Receive important account and ticket updates by email" value={prefs.emailNotifications} onValueChange={(value) => toggle('emailNotifications', value)} last />
    </View>

    <Text style={styles.sectionLabel}>CUSTOMER UPDATES</Text>
    <View style={styles.card}>
      <Toggle label="Event reminders" subtitle="Before events you have tickets for" value={prefs.eventReminders} onValueChange={(value) => toggle('eventReminders', value)} />
      <Toggle label="Ticket transfers" subtitle="Tickets sent to you and transfer acceptance updates" value={prefs.transferAlerts} onValueChange={(value) => toggle('transferAlerts', value)} />
      <Toggle label="Orders & payments" subtitle="Purchase confirmations and important order updates" value={prefs.orderAlerts} onValueChange={(value) => toggle('orderAlerts', value)} />
      <Toggle label="Refund updates" subtitle="Refund requests, approvals and payment progress" value={prefs.refundAlerts} onValueChange={(value) => toggle('refundAlerts', value)} />
      <Toggle label="Event changes" subtitle="Schedule, venue and cancellation updates" value={prefs.eventUpdateAlerts} onValueChange={(value) => toggle('eventUpdateAlerts', value)} />
      <Toggle label="Waitlist alerts" subtitle="When a reserved ticket becomes available" value={prefs.waitlistAlerts} onValueChange={(value) => toggle('waitlistAlerts', value)} last={!isPromoter} />
      {isPromoter && <Toggle label="Event cancellations" subtitle="Cancellation workflow and attendee-impact updates" value={prefs.cancellationAlerts} onValueChange={(value) => toggle('cancellationAlerts', value)} last />}
    </View>

    {isPromoter && <><Text style={styles.sectionLabel}>PROMOTER UPDATES</Text><View style={styles.card}>
      <Toggle label="Sales alerts" subtitle="New ticket orders and payment activity" value={prefs.orderAlerts} onValueChange={(value) => toggle('orderAlerts', value)} />
      <Toggle label="Refund alerts" subtitle="Refund requests and processed refunds" value={prefs.refundAlerts} onValueChange={(value) => toggle('refundAlerts', value)} />
      <Toggle label="Payout alerts" subtitle="Payout scheduled, sent or needing attention" value={prefs.payoutAlerts} onValueChange={(value) => toggle('payoutAlerts', value)} last />
    </View></>}

    <Pressable style={({pressed}) => [styles.primary, pressed && {opacity:0.88}]} disabled={saving} onPress={() => void save()}>
      {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Save notification settings</Text>}
    </Pressable>

    <Pressable style={styles.centreLink} onPress={() => router.push('/notifications' as never)}><Text style={styles.centreLinkText}>Open notification centre</Text><Text style={styles.chevron}>›</Text></Pressable>
    <View style={{height:40}} />
  </ScrollView></SafeAreaView></View>;
}

function Toggle({label, subtitle, value, onValueChange, last=false}:{label:string;subtitle:string;value:boolean;onValueChange:(value:boolean)=>void;last?:boolean}) {
  return <View style={[styles.toggleRow,last&&styles.lastRow]}><View style={{flex:1,paddingRight:14}}><Text style={styles.toggleTitle}>{label}</Text><Text style={styles.toggleSub}>{subtitle}</Text></View><Switch value={value} onValueChange={onValueChange} trackColor={{false:'#d1d5db',true:'#c4b5fd'}} thumbColor={value?'#7c3aed':'#f9fafb'} /></View>;
}

const styles=StyleSheet.create({
  screen:{flex:1,backgroundColor:'#fff'},safe:{flex:1},center:{flex:1,alignItems:'center',justifyContent:'center',padding:24},content:{paddingHorizontal:18,paddingBottom:30},
  top:{height:58,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},backButton:{width:40,height:40,borderRadius:20,borderWidth:1,borderColor:'#e5e7eb',backgroundColor:'#f9fafb',alignItems:'center',justifyContent:'center'},back:{fontSize:34,lineHeight:36,marginTop:-4,color:'#111827'},topTitle:{color:'#111827',fontSize:16,fontWeight:'900'},
  eyebrow:{color:'#7c3aed',fontSize:10,fontWeight:'900',letterSpacing:1.8,marginTop:16},title:{color:'#111827',fontSize:34,fontWeight:'900',marginTop:7},copy:{color:'#6b7280',fontSize:13,lineHeight:20,marginTop:7},
  sectionLabel:{color:'#6b7280',fontSize:10,fontWeight:'900',letterSpacing:1.5,marginTop:26,marginBottom:10},card:{borderRadius:20,borderWidth:1,borderColor:'#e5e7eb',backgroundColor:'#fff',overflow:'hidden'},toggleRow:{minHeight:76,paddingHorizontal:15,paddingVertical:12,flexDirection:'row',alignItems:'center',borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:'#e5e7eb'},lastRow:{borderBottomWidth:0},toggleTitle:{color:'#111827',fontSize:14,fontWeight:'900'},toggleSub:{color:'#6b7280',fontSize:11,lineHeight:16,marginTop:4},
  primary:{minHeight:54,borderRadius:17,backgroundColor:'#7c3aed',alignItems:'center',justifyContent:'center',marginTop:24,paddingHorizontal:18},primaryText:{color:'#fff',fontWeight:'900',fontSize:14},centreLink:{minHeight:60,borderRadius:17,borderWidth:1,borderColor:'#e5e7eb',marginTop:11,paddingHorizontal:16,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},centreLinkText:{color:'#111827',fontWeight:'900'},chevron:{color:'#9ca3af',fontSize:25},
  errorBox:{marginTop:16,borderRadius:14,backgroundColor:'#fef2f2',padding:12},errorText:{color:'#b91c1c',fontSize:12,fontWeight:'700'},successBox:{marginTop:16,borderRadius:14,backgroundColor:'#f0fdf4',padding:12},successText:{color:'#15803d',fontSize:12,fontWeight:'700'},
});
