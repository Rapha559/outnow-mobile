import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/lib/api';

const SITE = 'https://www.outnowtickets.com';

type SettingsResponse = {
  success: true;
  account: {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: 'CUSTOMER' | 'PROMOTER';
    hasPassword: boolean;
  };
  notifications: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    eventReminders: boolean;
    marketingEmails: boolean;
    orderAlerts: boolean;
    refundAlerts: boolean;
    cancellationAlerts: boolean;
    defaultRefundPolicy: string;
    defaultTicketTaxTreatment: string;
  };
  promoter: null | {
    businessName: string;
    description: string;
    website: string;
    logoUrl: string;
    isVerified: boolean;
    stripeConnected: boolean;
    stripeOnboardingDone: boolean;
    stripeChargesEnabled: boolean;
    stripePayoutsEnabled: boolean;
    sellerDetailsConfirmed: boolean;
    sellerLegalName: string;
    taxResidence: string;
    vatRegistered: boolean;
    vatNumber: string;
  };
};

export default function SettingsScreen() {
  const { user, sessionToken, refreshUser, signOut } = useAuth();
  const [data, setData] = useState<SettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessDescription, setBusinessDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [eventReminders, setEventReminders] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);
  const [orderAlerts, setOrderAlerts] = useState(true);
  const [refundAlerts, setRefundAlerts] = useState(true);
  const [cancellationAlerts, setCancellationAlerts] = useState(true);
  const [defaultRefundPolicy, setDefaultRefundPolicy] = useState('NO_POLICY');
  const [defaultTicketTaxTreatment, setDefaultTicketTaxTreatment] = useState('UK_STANDARD');
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const load = useCallback(async () => {
    if (!sessionToken) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError('');
      const next = await apiRequest<SettingsResponse>('/api/mobile/settings', {}, sessionToken);
      setData(next);
      setName(next.account.name || '');
      setPhone(next.account.phone || '');
      setBusinessName(next.promoter?.businessName || '');
      setBusinessDescription(next.promoter?.description || '');
      setWebsite(next.promoter?.website || '');
      setEmailNotifications(next.notifications.emailNotifications);
      setPushNotifications(next.notifications.pushNotifications);
      setEventReminders(next.notifications.eventReminders);
      setMarketingEmails(next.notifications.marketingEmails);
      setOrderAlerts(next.notifications.orderAlerts);
      setRefundAlerts(next.notifications.refundAlerts);
      setCancellationAlerts(next.notifications.cancellationAlerts);
      setDefaultRefundPolicy(next.notifications.defaultRefundPolicy);
      setDefaultTicketTaxTreatment(next.notifications.defaultTicketTaxTreatment);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load settings.');
    } finally {
      setLoading(false);
    }
  }, [sessionToken]);

  useEffect(() => { void load(); }, [load]);

  async function saveSettings() {
    if (!sessionToken) return;
    try {
      setSaving(true);
      setError('');
      setMessage('');
      await apiRequest('/api/mobile/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          name,
          phone,
          businessName,
          businessDescription,
          website,
          emailNotifications,
          pushNotifications,
          eventReminders,
          marketingEmails,
          orderAlerts,
          refundAlerts,
          cancellationAlerts,
          defaultRefundPolicy,
          defaultTicketTaxTreatment,
        }),
      }, sessionToken);
      await refreshUser();
      setMessage('Settings saved successfully.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save settings.');
    } finally {
      setSaving(false);
    }
  }

  async function savePassword() {
    if (!sessionToken) return;
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    try {
      setPasswordSaving(true);
      setError('');
      setMessage('');
      const result = await apiRequest<{ success: true; message: string }>('/api/mobile/settings/password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, password, confirmPassword }),
      }, sessionToken);
      setCurrentPassword('');
      setPassword('');
      setConfirmPassword('');
      setMessage(result.message);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update password.');
    } finally {
      setPasswordSaving(false);
    }
  }

  if (!user) {
    return <View style={styles.screen}><SafeAreaView style={styles.center}><Text style={styles.title}>Settings</Text><Text style={styles.copy}>Sign in to manage your account settings.</Text><Pressable style={styles.primary} onPress={() => router.replace('/login')}><Text style={styles.primaryText}>Sign in</Text></Pressable></SafeAreaView></View>;
  }

  if (loading) {
    return <View style={styles.screen}><SafeAreaView style={styles.center}><ActivityIndicator size="large" color="#7c3aed"/><Text style={styles.copy}>Loading settings…</Text></SafeAreaView></View>;
  }

  const isPromoter = user.role === 'PROMOTER';

  return <View style={styles.screen}><SafeAreaView edges={['top']} style={styles.safe}><KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <View style={styles.top}><Pressable style={styles.backButton} onPress={() => router.back()}><Text style={styles.back}>‹</Text></Pressable><Text style={styles.topTitle}>Settings</Text><View style={{width:40}}/></View>
    <Text style={styles.eyebrow}>{isPromoter ? 'PROMOTER SETTINGS' : 'CUSTOMER SETTINGS'}</Text>
    <Text style={styles.title}>Your OutNow settings</Text>
    <Text style={styles.copy}>Manage your account, notifications, security{isPromoter ? ', business and event defaults' : ''}.</Text>

    <Section title="Account">
      <Field label="Full name" value={name} onChangeText={setName} placeholder="Your name" />
      <Field label="Email" value={data?.account.email || user.email} editable={false} />
      <Field label="Phone" value={phone} onChangeText={setPhone} placeholder="Optional phone number" keyboardType="phone-pad" />
      <Text style={styles.helper}>Email changes require account verification and are not editable here.</Text>
    </Section>

    <Section title="Notifications">
      <Toggle label="Push notifications" subtitle="Important account and ticket updates on your device" value={pushNotifications} onValueChange={setPushNotifications}/>
      <Toggle label="Email notifications" subtitle="Important order and account updates by email" value={emailNotifications} onValueChange={setEmailNotifications}/>
      <Toggle label="Event reminders" subtitle="Reminders before events you are attending" value={eventReminders} onValueChange={setEventReminders}/>
      <Toggle label="Marketing emails" subtitle="Event recommendations, new releases and OutNow news" value={marketingEmails} onValueChange={setMarketingEmails}/>
      {isPromoter && <>
        <Toggle label="New order alerts" subtitle="Get notified when customers buy tickets" value={orderAlerts} onValueChange={setOrderAlerts}/>
        <Toggle label="Refund alerts" subtitle="Refund requests and refund status changes" value={refundAlerts} onValueChange={setRefundAlerts}/>
        <Toggle label="Cancellation alerts" subtitle="Event cancellation workflow updates" value={cancellationAlerts} onValueChange={setCancellationAlerts}/>
      </>}
    </Section>

    {isPromoter && <Section title="Business profile">
      <Field label="Business / organiser name" value={businessName} onChangeText={setBusinessName} placeholder="OutNow Events Ltd" />
      <Field label="Business description" value={businessDescription} onChangeText={setBusinessDescription} multiline placeholder="Tell customers about your organisation" />
      <Field label="Website" value={website} onChangeText={setWebsite} placeholder="https://example.com" autoCapitalize="none" keyboardType="url" />
      <View style={styles.statusCard}>
        <Status label="Promoter verification" ok={Boolean(data?.promoter?.isVerified)} okText="Verified" noText="Not verified" />
        <Status label="Stripe connected" ok={Boolean(data?.promoter?.stripeConnected)} okText="Connected" noText="Not connected" />
        <Status label="Payouts enabled" ok={Boolean(data?.promoter?.stripePayoutsEnabled)} okText="Enabled" noText="Action needed" />
        <Status label="Seller / tax details" ok={Boolean(data?.promoter?.sellerDetailsConfirmed)} okText="Confirmed" noText="Incomplete" />
      </View>
      <Pressable style={styles.secondary} onPress={() => router.push('/promoter/payouts')}><Text style={styles.secondaryText}>Manage Stripe, payouts & seller details</Text></Pressable>
    </Section>}

    {isPromoter && <Section title="Event defaults">
      <Text style={styles.label}>Default refund policy</Text>
      <View style={styles.chips}>{[
        ['NO_POLICY','Until event'],['NO_REFUNDS','No refunds'],['24_HOURS','24h'],['48_HOURS','48h'],['72_HOURS','72h'],
      ].map(([value,label]) => <Pressable key={value} style={[styles.chip, defaultRefundPolicy === value && styles.chipSelected]} onPress={() => setDefaultRefundPolicy(value)}><Text style={[styles.chipText, defaultRefundPolicy === value && styles.chipTextSelected]}>{label}</Text></Pressable>)}</View>
      <Text style={[styles.label,{marginTop:18}]}>Default UK ticket VAT treatment</Text>
      <View style={styles.chips}>{[['UK_STANDARD','Standard'],['UK_EXEMPT','Exempt']].map(([value,label]) => <Pressable key={value} style={[styles.chip, defaultTicketTaxTreatment === value && styles.chipSelected]} onPress={() => setDefaultTicketTaxTreatment(value)}><Text style={[styles.chipText, defaultTicketTaxTreatment === value && styles.chipTextSelected]}>{label}</Text></Pressable>)}</View>
      <Text style={styles.helper}>These defaults are saved to your account for new-event setup. You can still change each event individually.</Text>
    </Section>}

    <Pressable disabled={saving} style={[styles.primary, saving && styles.disabled]} onPress={() => void saveSettings()}>{saving ? <ActivityIndicator color="#fff"/> : <Text style={styles.primaryText}>Save settings</Text>}</Pressable>

    <Section title="Password & security">
      {data?.account.hasPassword && <Field label="Current password" value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry autoCapitalize="none" />}
      <Field label={data?.account.hasPassword ? 'New password' : 'Create password'} value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />
      <Field label="Confirm password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry autoCapitalize="none" />
      <Text style={styles.helper}>Use at least 8 characters. Changing your password signs out your other active sessions.</Text>
      <Pressable disabled={passwordSaving} style={[styles.secondaryPrimary, passwordSaving && styles.disabled]} onPress={() => void savePassword()}>{passwordSaving ? <ActivityIndicator color="#fff"/> : <Text style={styles.primaryText}>{data?.account.hasPassword ? 'Change password' : 'Create password'}</Text>}</Pressable>
    </Section>

    <Section title="Privacy & legal">
      <MenuRow label="Privacy policy" subtitle="How OutNow handles your data" onPress={() => void WebBrowser.openBrowserAsync(`${SITE}/privacy`)}/>
      <MenuRow label="Terms & conditions" subtitle="OutNow account and ticketing terms" onPress={() => void WebBrowser.openBrowserAsync(`${SITE}/terms`)}/>
      <MenuRow label="Help & support" subtitle="Get help with your account" onPress={() => void WebBrowser.openBrowserAsync(`${SITE}/help`)}/>
    </Section>

    {!!message && <Text style={styles.success}>{message}</Text>}
    {!!error && <Text style={styles.error}>{error}</Text>}
    <Pressable style={styles.signOut} onPress={() => void signOut()}><Text style={styles.signOutText}>Sign out</Text></Pressable>
    <View style={{height:45}}/>
  </ScrollView></KeyboardAvoidingView></SafeAreaView></View>;
}

function Section({title,children}:{title:string;children:React.ReactNode}){return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>}
function Field({label,multiline,...props}:{label:string;multiline?:boolean}&React.ComponentProps<typeof TextInput>){return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput {...props} multiline={multiline} placeholderTextColor="#9ca3af" style={[styles.input,multiline&&styles.textarea,!props.editable&&props.editable===false&&styles.readonly]}/></View>}
function Toggle({label,subtitle,value,onValueChange}:{label:string;subtitle:string;value:boolean;onValueChange:(value:boolean)=>void}){return <View style={styles.toggleRow}><View style={{flex:1}}><Text style={styles.toggleTitle}>{label}</Text><Text style={styles.toggleSub}>{subtitle}</Text></View><Switch value={value} onValueChange={onValueChange} trackColor={{false:'#d1d5db',true:'#c4b5fd'}} thumbColor={value?'#7c3aed':'#f9fafb'}/></View>}
function Status({label,ok,okText,noText}:{label:string;ok:boolean;okText:string;noText:string}){return <View style={styles.statusRow}><Text style={styles.statusLabel}>{label}</Text><Text style={[styles.statusValue,ok?styles.statusOk:styles.statusWarn]}>{ok?okText:noText}</Text></View>}
function MenuRow({label,subtitle,onPress}:{label:string;subtitle:string;onPress:()=>void}){return <Pressable style={styles.menuRow} onPress={onPress}><View style={{flex:1}}><Text style={styles.menuTitle}>{label}</Text><Text style={styles.menuSub}>{subtitle}</Text></View><Text style={styles.chevron}>›</Text></Pressable>}

const styles=StyleSheet.create({
  screen:{flex:1,backgroundColor:'#fff'},safe:{flex:1},center:{flex:1,alignItems:'center',justifyContent:'center',padding:24},content:{paddingHorizontal:18,paddingBottom:30},
  top:{height:58,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},backButton:{width:40,height:40,borderRadius:20,borderWidth:1,borderColor:'#e5e7eb',backgroundColor:'#f9fafb',alignItems:'center',justifyContent:'center'},back:{fontSize:34,lineHeight:36,color:'#111827',marginTop:-3},topTitle:{color:'#111827',fontWeight:'900'},
  eyebrow:{color:'#7c3aed',fontSize:11,fontWeight:'900',letterSpacing:1.7,marginTop:12},title:{color:'#111827',fontSize:32,lineHeight:37,fontWeight:'900',marginTop:8},copy:{color:'#6b7280',fontSize:14,lineHeight:21,marginTop:8,textAlign:'left'},
  section:{marginTop:24,borderRadius:20,borderWidth:1,borderColor:'#e5e7eb',backgroundColor:'#fff',padding:16},sectionTitle:{color:'#111827',fontSize:19,fontWeight:'900',marginBottom:6},field:{marginTop:12},label:{color:'#374151',fontSize:12,fontWeight:'800',marginBottom:7},input:{minHeight:50,borderRadius:14,borderWidth:1,borderColor:'#d1d5db',backgroundColor:'#f9fafb',color:'#111827',paddingHorizontal:14,fontSize:15},textarea:{minHeight:100,paddingTop:13,textAlignVertical:'top'},readonly:{color:'#6b7280',backgroundColor:'#f3f4f6'},helper:{color:'#6b7280',fontSize:11,lineHeight:17,marginTop:10},
  toggleRow:{minHeight:67,flexDirection:'row',alignItems:'center',gap:14,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:'#e5e7eb'},toggleTitle:{color:'#111827',fontSize:14,fontWeight:'900'},toggleSub:{color:'#6b7280',fontSize:11,lineHeight:16,marginTop:3},
  statusCard:{borderRadius:15,backgroundColor:'#fafafa',borderWidth:1,borderColor:'#e5e7eb',paddingHorizontal:13,marginTop:16},statusRow:{minHeight:47,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:'#e5e7eb'},statusLabel:{color:'#4b5563',fontSize:12,fontWeight:'700'},statusValue:{fontSize:11,fontWeight:'900'},statusOk:{color:'#059669'},statusWarn:{color:'#d97706'},
  chips:{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:8},chip:{borderRadius:999,borderWidth:1,borderColor:'#d1d5db',backgroundColor:'#f9fafb',paddingHorizontal:12,paddingVertical:9},chipSelected:{borderColor:'#7c3aed',backgroundColor:'#f3efff'},chipText:{color:'#4b5563',fontSize:12,fontWeight:'700'},chipTextSelected:{color:'#7c3aed'},
  primary:{height:54,borderRadius:16,backgroundColor:'#7c3aed',alignItems:'center',justifyContent:'center',marginTop:24},secondaryPrimary:{height:50,borderRadius:14,backgroundColor:'#7c3aed',alignItems:'center',justifyContent:'center',marginTop:16},primaryText:{color:'#fff',fontWeight:'900'},secondary:{minHeight:48,borderRadius:14,borderWidth:1,borderColor:'#d8b4fe',backgroundColor:'#faf5ff',alignItems:'center',justifyContent:'center',paddingHorizontal:12,marginTop:14},secondaryText:{color:'#7c3aed',fontWeight:'900',fontSize:12,textAlign:'center'},disabled:{opacity:.5},
  menuRow:{minHeight:62,flexDirection:'row',alignItems:'center',borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:'#e5e7eb'},menuTitle:{color:'#111827',fontWeight:'900'},menuSub:{color:'#6b7280',fontSize:11,lineHeight:16,marginTop:3},chevron:{fontSize:26,color:'#9ca3af'},success:{color:'#059669',fontSize:12,fontWeight:'800',textAlign:'center',marginTop:16},error:{color:'#dc2626',fontSize:12,lineHeight:18,textAlign:'center',marginTop:14},signOut:{height:50,borderRadius:15,borderWidth:1,borderColor:'#fecaca',alignItems:'center',justifyContent:'center',marginTop:22},signOutText:{color:'#dc2626',fontWeight:'900'},
});
