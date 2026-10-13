import * as WebBrowser from 'expo-web-browser';
import { router, useLocalSearchParams } from 'expo-router';
import { type ComponentProps, type ReactNode, useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/lib/api';

const SITE = 'https://www.outnowtickets.com';

type SettingsResponse = {
  success: true;
  account: { id: string; name: string; email: string; phone: string; role: 'CUSTOMER' | 'PROMOTER'; hasPassword: boolean };
  notifications: {
    emailNotifications: boolean; pushNotifications: boolean; eventReminders: boolean; marketingEmails: boolean;
    orderAlerts: boolean; refundAlerts: boolean; cancellationAlerts: boolean; defaultRefundPolicy: string; defaultTicketTaxTreatment: string;
  };
  promoter: null | {
    businessName: string; description: string; website: string; logoUrl: string; isVerified: boolean; stripeConnected: boolean;
    stripeOnboardingDone: boolean; stripeChargesEnabled: boolean; stripePayoutsEnabled: boolean; sellerDetailsConfirmed: boolean;
    sellerLegalName: string; taxResidence: string; vatRegistered: boolean; vatNumber: string;
  };
};

const TITLES: Record<string, string> = {
  personal: 'Personal details', business: 'Business profile', notifications: 'Notifications', 'event-defaults': 'Event defaults',
  'audience-privacy': 'Audience & privacy', 'payments-payouts': 'Payments & payouts', 'taxpayer-info': 'Taxpayer info',
  'security-alerts': 'Security alerts', password: 'Password', 'account-controls': 'Account controls',
};

export default function SettingsSectionScreen() {
  const { section } = useLocalSearchParams<{ section: string }>();
  const { user, sessionToken, refreshUser, signOut } = useAuth();
  const [data, setData] = useState<SettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
    if (!sessionToken) { setLoading(false); return; }
    try {
      setLoading(true); setError('');
      const next = await apiRequest<SettingsResponse>('/api/mobile/settings', {}, sessionToken);
      setData(next); setName(next.account.name || ''); setPhone(next.account.phone || '');
      setBusinessName(next.promoter?.businessName || ''); setBusinessDescription(next.promoter?.description || ''); setWebsite(next.promoter?.website || '');
      setEmailNotifications(next.notifications.emailNotifications); setPushNotifications(next.notifications.pushNotifications); setEventReminders(next.notifications.eventReminders);
      setMarketingEmails(next.notifications.marketingEmails); setOrderAlerts(next.notifications.orderAlerts); setRefundAlerts(next.notifications.refundAlerts);
      setCancellationAlerts(next.notifications.cancellationAlerts); setDefaultRefundPolicy(next.notifications.defaultRefundPolicy); setDefaultTicketTaxTreatment(next.notifications.defaultTicketTaxTreatment);
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load settings.'); }
    finally { setLoading(false); }
  }, [sessionToken]);

  useEffect(() => { void load(); }, [load]);

  async function patch(body: Record<string, unknown>, successMessage: string) {
    if (!sessionToken) return;
    try {
      setSaving(true); setError(''); setMessage('');
      await apiRequest('/api/mobile/settings', { method: 'PATCH', body: JSON.stringify(body) }, sessionToken);
      await refreshUser(); setMessage(successMessage); await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save settings.'); }
    finally { setSaving(false); }
  }

  async function changePassword() {
    if (!sessionToken) return;
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    try {
      setSaving(true); setError(''); setMessage('');
      const result = await apiRequest<{ success: true; message: string }>('/api/mobile/settings/password', { method: 'POST', body: JSON.stringify({ currentPassword, password, confirmPassword }) }, sessionToken);
      setCurrentPassword(''); setPassword(''); setConfirmPassword(''); setMessage(result.message); await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to update password.'); }
    finally { setSaving(false); }
  }

  if (!user) return <View style={styles.screen}><SafeAreaView style={styles.center}><Text style={styles.title}>Settings</Text><Pressable style={styles.primary} onPress={() => router.replace('/login')}><Text style={styles.primaryText}>Sign in</Text></Pressable></SafeAreaView></View>;
  if (loading) return <View style={styles.screen}><SafeAreaView style={styles.center}><ActivityIndicator size="large" color="#7c3aed" /></SafeAreaView></View>;

  const isPromoter = user.role === 'PROMOTER';
  const title = TITLES[section || ''] || 'Settings';
  if ((section === 'business' || section === 'event-defaults' || section === 'payments-payouts' || section === 'taxpayer-info') && !isPromoter) {
    return <View style={styles.screen}><SafeAreaView style={styles.center}><Text style={styles.title}>Not available</Text><Text style={styles.copy}>This section is only available to promoter accounts.</Text><Pressable style={styles.secondary} onPress={() => router.back()}><Text style={styles.secondaryText}>Back</Text></Pressable></SafeAreaView></View>;
  }

  return <View style={styles.screen}><SafeAreaView edges={['top']} style={styles.safe}><KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <Header title={title} />
    {section === 'personal' && <Card><Field label="Full name" value={name} onChangeText={setName} placeholder="Your name" /><Field label="Email" value={data?.account.email || user.email} editable={false} /><Field label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="Optional phone number" /><Helper>Email changes require verification and are not editable here.</Helper><SaveButton saving={saving} label="Save personal details" onPress={() => void patch({ name, phone }, 'Personal details updated.')} /></Card>}

    {section === 'business' && <Card><Field label="Business / organiser name" value={businessName} onChangeText={setBusinessName} placeholder="Your organisation" /><Field label="Business description" value={businessDescription} onChangeText={setBusinessDescription} multiline placeholder="Tell customers about your organisation" /><Field label="Website" value={website} onChangeText={setWebsite} keyboardType="url" autoCapitalize="none" placeholder="https://example.com" /><Status label="Promoter verification" ok={Boolean(data?.promoter?.isVerified)} yes="Verified" no="Not verified" /><SaveButton saving={saving} label="Save business profile" onPress={() => void patch({ businessName, businessDescription, website }, 'Business profile updated.')} /></Card>}

    {section === 'notifications' && <Card><Toggle label="Push notifications" subtitle="Important account and ticket updates" value={pushNotifications} onValueChange={setPushNotifications} /><Toggle label="Email notifications" subtitle="Important order and account updates" value={emailNotifications} onValueChange={setEmailNotifications} /><Toggle label="Event reminders" subtitle="Reminders before events" value={eventReminders} onValueChange={setEventReminders} />{isPromoter && <><Toggle label="New order alerts" subtitle="Ticket purchase notifications" value={orderAlerts} onValueChange={setOrderAlerts} /><Toggle label="Refund alerts" subtitle="Refund request and status updates" value={refundAlerts} onValueChange={setRefundAlerts} /><Toggle label="Cancellation alerts" subtitle="Event cancellation workflow updates" value={cancellationAlerts} onValueChange={setCancellationAlerts} /></>}<SaveButton saving={saving} label="Save notifications" onPress={() => void patch({ pushNotifications, emailNotifications, eventReminders, orderAlerts, refundAlerts, cancellationAlerts }, 'Notification settings updated.')} /></Card>}

    {section === 'event-defaults' && <Card><Text style={styles.label}>Default refund policy</Text><ChoiceRow value={defaultRefundPolicy} onChange={setDefaultRefundPolicy} choices={[['NO_POLICY','Until event'],['NO_REFUNDS','No refunds'],['24_HOURS','24h'],['48_HOURS','48h'],['72_HOURS','72h']]} /><Text style={[styles.label,{marginTop:18}]}>Default UK ticket VAT treatment</Text><ChoiceRow value={defaultTicketTaxTreatment} onChange={setDefaultTicketTaxTreatment} choices={[['UK_STANDARD','Standard'],['UK_EXEMPT','Exempt']]} /><Helper>These defaults are stored for promoter setup. Individual events can still be changed.</Helper><SaveButton saving={saving} label="Save event defaults" onPress={() => void patch({ defaultRefundPolicy, defaultTicketTaxTreatment }, 'Event defaults updated.')} /></Card>}

    {section === 'audience-privacy' && <Card><Toggle label="Marketing emails" subtitle="Recommendations, releases and OutNow news" value={marketingEmails} onValueChange={setMarketingEmails} /><SaveButton saving={saving} label="Save audience preference" onPress={() => void patch({ marketingEmails }, 'Audience preference updated.')} /><Menu label="Privacy policy" subtitle="How OutNow handles your data" onPress={() => void WebBrowser.openBrowserAsync(`${SITE}/privacy`)} /><Menu label="Terms & conditions" subtitle="Account and ticketing terms" onPress={() => void WebBrowser.openBrowserAsync(`${SITE}/terms`)} /></Card>}

    {section === 'payments-payouts' && <Card><Status label="Stripe connected" ok={Boolean(data?.promoter?.stripeConnected)} yes="Connected" no="Not connected" /><Status label="Onboarding" ok={Boolean(data?.promoter?.stripeOnboardingDone)} yes="Complete" no="Incomplete" /><Status label="Charges enabled" ok={Boolean(data?.promoter?.stripeChargesEnabled)} yes="Enabled" no="Action needed" /><Status label="Payouts enabled" ok={Boolean(data?.promoter?.stripePayoutsEnabled)} yes="Enabled" no="Action needed" /><Pressable style={styles.primary} onPress={() => router.push('/promoter/payouts')}><Text style={styles.primaryText}>Open payouts & Stripe</Text></Pressable></Card>}

    {section === 'taxpayer-info' && <Card><Read label="Seller legal name" value={data?.promoter?.sellerLegalName || 'Not provided'} /><Read label="Tax residence" value={data?.promoter?.taxResidence || 'Not provided'} /><Read label="VAT registered" value={data?.promoter?.vatRegistered ? 'Yes' : 'No'} /><Read label="VAT number" value={data?.promoter?.vatNumber || 'Not provided'} /><Status label="Seller details" ok={Boolean(data?.promoter?.sellerDetailsConfirmed)} yes="Confirmed" no="Incomplete" /><Pressable style={styles.primary} onPress={() => router.push('/promoter/payouts')}><Text style={styles.primaryText}>Manage seller & tax details</Text></Pressable></Card>}

    {section === 'security-alerts' && <Card><View style={styles.securityHero}><View style={styles.securityIcon}><Text style={styles.securityIconText}>✓</Text></View><View style={{flex:1}}><Text style={styles.securityTitle}>Account protection</Text><Text style={styles.securitySub}>Your session is stored securely on this device. Password changes revoke other active sessions.</Text></View></View><Read label="Password" value={data?.account.hasPassword ? 'Set' : 'Not set'} /><Read label="Signed in as" value={data?.account.email || user.email} /><Menu label="Change password" subtitle="Update your sign-in password" onPress={() => router.push('/settings/password' as never)} /></Card>}

    {section === 'password' && <Card>{data?.account.hasPassword && <Field label="Current password" value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry autoCapitalize="none" />}<Field label={data?.account.hasPassword ? 'New password' : 'Create password'} value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" /><Field label="Confirm password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry autoCapitalize="none" /><Helper>Use at least 8 characters. Changing your password signs out your other active sessions.</Helper><SaveButton saving={saving} label={data?.account.hasPassword ? 'Change password' : 'Create password'} onPress={() => void changePassword()} /></Card>}

    {section === 'account-controls' && <Card><Menu label="Help & support" subtitle="Get help with your account" onPress={() => void WebBrowser.openBrowserAsync(`${SITE}/help`)} /><Menu label="Contact OutNow" subtitle="Contact the support team" onPress={() => void WebBrowser.openBrowserAsync(`${SITE}/contact`)} /><Menu label="Request account deletion" subtitle="Contact support to permanently close your account" destructive onPress={() => void WebBrowser.openBrowserAsync(`${SITE}/contact?subject=account-deletion`)} /><Pressable style={styles.signOut} onPress={() => void signOut()}><Text style={styles.signOutText}>Sign out</Text></Pressable></Card>}

    {!!message && <Text style={styles.success}>{message}</Text>}{!!error && <Text style={styles.error}>{error}</Text>}<View style={{height:40}} />
  </ScrollView></KeyboardAvoidingView></SafeAreaView></View>;
}

function Header({title}:{title:string}) { return <><View style={styles.top}><Pressable style={styles.backButton} onPress={() => router.back()}><Text style={styles.back}>‹</Text></Pressable><Text style={styles.topTitle}>{title}</Text><View style={{width:40}} /></View><Text style={styles.eyebrow}>OUTNOW SETTINGS</Text><Text style={styles.title}>{title}</Text></>; }
function Card({children}:{children:ReactNode}) { return <View style={styles.card}>{children}</View>; }
function Field({label,multiline,...props}:{label:string;multiline?:boolean}&ComponentProps<typeof TextInput>) { return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput {...props} multiline={multiline} placeholderTextColor="#9ca3af" style={[styles.input,multiline&&styles.textarea,props.editable===false&&styles.readonly]} /></View>; }
function Helper({children}:{children:ReactNode}) { return <Text style={styles.helper}>{children}</Text>; }
function Toggle({label,subtitle,value,onValueChange}:{label:string;subtitle:string;value:boolean;onValueChange:(value:boolean)=>void}) { return <View style={styles.toggleRow}><View style={{flex:1}}><Text style={styles.toggleTitle}>{label}</Text><Text style={styles.toggleSub}>{subtitle}</Text></View><Switch value={value} onValueChange={onValueChange} trackColor={{false:'#d1d5db',true:'#c4b5fd'}} thumbColor={value?'#7c3aed':'#f9fafb'} /></View>; }
function ChoiceRow({value,onChange,choices}:{value:string;onChange:(value:string)=>void;choices:[string,string][]}) { return <View style={styles.choices}>{choices.map(([id,label]) => <Pressable key={id} style={[styles.choice,value===id&&styles.choiceActive]} onPress={() => onChange(id)}><Text style={[styles.choiceText,value===id&&styles.choiceTextActive]}>{label}</Text></Pressable>)}</View>; }
function SaveButton({saving,label,onPress}:{saving:boolean;label:string;onPress:()=>void}) { return <Pressable disabled={saving} style={[styles.primary,saving&&styles.disabled]} onPress={onPress}>{saving?<ActivityIndicator color="#fff"/>:<Text style={styles.primaryText}>{label}</Text>}</Pressable>; }
function Status({label,ok,yes,no}:{label:string;ok:boolean;yes:string;no:string}) { return <View style={styles.statusRow}><Text style={styles.statusLabel}>{label}</Text><Text style={[styles.statusValue,ok?styles.ok:styles.warn]}>{ok?yes:no}</Text></View>; }
function Read({label,value}:{label:string;value:string}) { return <View style={styles.readRow}><Text style={styles.readLabel}>{label}</Text><Text style={styles.readValue}>{value}</Text></View>; }
function Menu({label,subtitle,onPress,destructive=false}:{label:string;subtitle:string;onPress:()=>void;destructive?:boolean}) { return <Pressable style={styles.menuRow} onPress={onPress}><View style={{flex:1}}><Text style={[styles.menuTitle,destructive&&styles.danger]}>{label}</Text><Text style={styles.menuSub}>{subtitle}</Text></View><Text style={styles.chevron}>›</Text></Pressable>; }

const styles = StyleSheet.create({
  screen:{flex:1,backgroundColor:'#fff'},safe:{flex:1},center:{flex:1,alignItems:'center',justifyContent:'center',padding:24},content:{paddingHorizontal:18,paddingBottom:26},
  top:{height:58,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},backButton:{width:40,height:40,borderRadius:20,borderWidth:1,borderColor:'#e5e7eb',backgroundColor:'#f9fafb',alignItems:'center',justifyContent:'center'},back:{color:'#111827',fontSize:34,lineHeight:36,marginTop:-4},topTitle:{color:'#111827',fontSize:17,fontWeight:'900'},eyebrow:{color:'#7c3aed',fontSize:11,fontWeight:'900',letterSpacing:1.6,marginTop:12},title:{color:'#111827',fontSize:30,fontWeight:'900',marginTop:8},copy:{color:'#6b7280',fontSize:14,lineHeight:21,marginTop:8,textAlign:'center'},
  card:{marginTop:22,borderRadius:22,borderWidth:1,borderColor:'#e5e7eb',backgroundColor:'#fff',padding:16},field:{marginBottom:15},label:{color:'#374151',fontSize:12,fontWeight:'800',marginBottom:7},input:{minHeight:50,borderRadius:14,borderWidth:1,borderColor:'#d1d5db',backgroundColor:'#f9fafb',paddingHorizontal:14,color:'#111827',fontSize:15},textarea:{minHeight:110,textAlignVertical:'top',paddingTop:13},readonly:{color:'#6b7280',backgroundColor:'#f3f4f6'},helper:{color:'#6b7280',fontSize:11,lineHeight:17,marginTop:2},
  primary:{height:50,borderRadius:14,backgroundColor:'#7c3aed',alignItems:'center',justifyContent:'center',marginTop:18},primaryText:{color:'#fff',fontWeight:'900'},secondary:{height:48,borderRadius:14,borderWidth:1,borderColor:'#d1d5db',alignItems:'center',justifyContent:'center',marginTop:16,minWidth:140},secondaryText:{color:'#111827',fontWeight:'800'},disabled:{opacity:.55},
  toggleRow:{minHeight:68,flexDirection:'row',alignItems:'center',gap:12,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:'#e5e7eb'},toggleTitle:{color:'#111827',fontSize:14,fontWeight:'900'},toggleSub:{color:'#6b7280',fontSize:11,lineHeight:16,marginTop:3},choices:{flexDirection:'row',flexWrap:'wrap',gap:8},choice:{paddingHorizontal:13,paddingVertical:9,borderRadius:999,borderWidth:1,borderColor:'#e5e7eb',backgroundColor:'#fff'},choiceActive:{backgroundColor:'#f5f3ff',borderColor:'#c4b5fd'},choiceText:{color:'#4b5563',fontSize:12,fontWeight:'800'},choiceTextActive:{color:'#6d28d9'},
  statusRow:{minHeight:52,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:'#e5e7eb'},statusLabel:{color:'#374151',fontSize:13,fontWeight:'800'},statusValue:{fontSize:12,fontWeight:'900'},ok:{color:'#059669'},warn:{color:'#d97706'},readRow:{paddingVertical:12,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:'#e5e7eb'},readLabel:{color:'#6b7280',fontSize:11,fontWeight:'800'},readValue:{color:'#111827',fontSize:14,fontWeight:'800',marginTop:4},
  menuRow:{minHeight:66,flexDirection:'row',alignItems:'center',gap:12,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:'#e5e7eb'},menuTitle:{color:'#111827',fontSize:14,fontWeight:'900'},menuSub:{color:'#6b7280',fontSize:11,lineHeight:16,marginTop:3},chevron:{color:'#9ca3af',fontSize:25},danger:{color:'#dc2626'},
  securityHero:{flexDirection:'row',gap:12,alignItems:'center',paddingBottom:14,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:'#e5e7eb'},securityIcon:{width:42,height:42,borderRadius:21,backgroundColor:'#ecfdf5',alignItems:'center',justifyContent:'center'},securityIconText:{color:'#059669',fontWeight:'900',fontSize:18},securityTitle:{color:'#111827',fontSize:15,fontWeight:'900'},securitySub:{color:'#6b7280',fontSize:11,lineHeight:16,marginTop:4},
  success:{color:'#047857',backgroundColor:'#ecfdf5',borderRadius:12,padding:12,marginTop:16,fontWeight:'800'},error:{color:'#b91c1c',backgroundColor:'#fef2f2',borderRadius:12,padding:12,marginTop:16,fontWeight:'800'},signOut:{height:50,borderRadius:14,borderWidth:1,borderColor:'#fecaca',alignItems:'center',justifyContent:'center',marginTop:18},signOutText:{color:'#dc2626',fontWeight:'900'},
});
