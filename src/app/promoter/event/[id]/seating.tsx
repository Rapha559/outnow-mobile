import { router, useLocalSearchParams } from 'expo-router';
import { type ComponentProps, useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/lib/api';

type Section = { id: string; name: string; type: string; seatCount: number };
type Generated = { sectionName: string; ticketName: string | null; price: number; seatCount: number };
type SeatingPayload = {
  success: true;
  event: { id: string; title: string; status: string; seatingMode: string; reservedSaleStarts: string | null; reservedSaleEnds: string | null; reservedMaxPerOrder: number | null };
  sections: Section[];
  generated: Generated[];
};
type Pricing = { ticketName: string; price: string; capacity: string };

function dateInput(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function SeatingPricingScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { sessionToken, user } = useAuth();
  const [data, setData] = useState<SeatingPayload | null>(null);
  const [pricing, setPricing] = useState<Record<string, Pricing>>({});
  const [saleStarts, setSaleStarts] = useState('');
  const [saleEnds, setSaleEnds] = useState('');
  const [maxPerOrder, setMaxPerOrder] = useState('10');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const reservedSections = useMemo(() => (data?.sections || []).filter((section) => section.type !== 'STANDING'), [data]);
  const generated = data?.generated || [];
  const seatsGenerated = generated.reduce((total, row) => total + row.seatCount, 0);

  const load = useCallback(async (refresh = false) => {
    if (!id || !sessionToken || user?.role !== 'PROMOTER') return;
    try {
      refresh ? setRefreshing(true) : setLoading(true);
      setError('');
      const next = await apiRequest<SeatingPayload>(`/api/promoter/events/${id}/seating/generate`, {}, sessionToken);
      setData(next);
      setSaleStarts(dateInput(next.event.reservedSaleStarts));
      setSaleEnds(dateInput(next.event.reservedSaleEnds));
      setMaxPerOrder(String(next.event.reservedMaxPerOrder || 10));
      setPricing(Object.fromEntries(next.sections.filter((section) => section.type !== 'STANDING').map((section) => {
        const existing = next.generated.find((row) => row.sectionName === section.name);
        return [section.id, { ticketName: existing?.ticketName || section.name, price: existing ? existing.price.toFixed(2) : '', capacity: String(existing?.seatCount ?? section.seatCount) }];
      })));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load section pricing.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, sessionToken, user?.role]);

  useEffect(() => { void load(); }, [load]);

  function update(sectionId: string, field: keyof Pricing, value: string) {
    setPricing((current) => ({ ...current, [sectionId]: { ...(current[sectionId] || { ticketName: '', price: '', capacity: '' }), [field]: value } }));
  }

  function validate() {
    const names = new Set<string>();
    for (const section of reservedSections) {
      const value = pricing[section.id];
      if (!value?.ticketName.trim()) return `Enter a ticket name for ${section.name}.`;
      const name = value.ticketName.trim().toLocaleLowerCase();
      if (names.has(name)) return 'Each reserved section needs a different ticket name.';
      names.add(name);
      if (!Number.isFinite(Number(value.price)) || Number(value.price) < 0) return `Enter a valid price for ${section.name}.`;
      const capacity = Number(value.capacity);
      if (!Number.isInteger(capacity) || capacity < 1 || capacity > section.seatCount) return `Capacity for ${section.name} must be between 1 and ${section.seatCount}.`;
    }
    const limit = Number(maxPerOrder);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) return 'Reserved tickets per customer must be between 1 and 100.';
    const start = saleStarts ? new Date(saleStarts) : null;
    const end = saleEnds ? new Date(saleEnds) : null;
    if (start && Number.isNaN(start.getTime())) return 'Enter a valid reserved ticket sale start.';
    if (end && Number.isNaN(end.getTime())) return 'Enter a valid reserved ticket sale end.';
    if (start && end && end <= start) return 'Reserved ticket sales must end after they start.';
    return null;
  }

  async function save() {
    if (!id || !sessionToken) return;
    const issue = validate();
    if (issue) { setError(issue); return; }
    try {
      setSaving(true); setError(''); setMessage('');
      const response = await apiRequest<{ success: true; message: string }>(`/api/promoter/events/${id}/seating/generate`, {
        method: 'POST',
        body: JSON.stringify({
          salesRules: { saleStarts: saleStarts ? new Date(saleStarts).toISOString() : null, saleEnds: saleEnds ? new Date(saleEnds).toISOString() : null, maxPerOrder: Number(maxPerOrder) },
          sections: reservedSections.map((section) => ({ sectionId: section.id, ticketName: pricing[section.id].ticketName.trim(), price: Number(pricing[section.id].price), capacity: Number(pricing[section.id].capacity) })),
        }),
      }, sessionToken);
      setMessage(response.message || 'Section pricing saved.');
      await load(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save section pricing.');
    } finally { setSaving(false); }
  }

  function confirmSubmit() {
    if (!id || !sessionToken) return;
    if (!seatsGenerated) { setError('Save section pricing and generate seats before submitting this event.'); return; }
    Alert.alert('Submit event for review?', 'By continuing, you confirm the event details and ticket setup are ready for OutNow review.', [
      { text: 'Not yet', style: 'cancel' },
      { text: 'Submit for review', onPress: () => void submitForReview() },
    ]);
  }

  async function submitForReview() {
    if (!id || !sessionToken) return;
    try {
      setSubmitting(true); setError(''); setMessage('');
      const response = await apiRequest<{ success: true; message: string }>(`/api/promoter/events/${id}/submit-for-review`, { method: 'POST', body: JSON.stringify({ termsAccepted: true }) }, sessionToken);
      setMessage(response.message || 'Event submitted for review.');
      router.replace({ pathname: '/promoter/event/[id]', params: { id } });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to submit this event for review.');
    } finally { setSubmitting(false); }
  }

  if (loading) return <View style={styles.screen}><SafeAreaView style={styles.center}><ActivityIndicator size="large" color="#7c3aed" /></SafeAreaView></View>;
  if (!data) return <View style={styles.screen}><SafeAreaView style={styles.center}><Text style={styles.title}>Seating unavailable</Text><Text style={styles.error}>{error}</Text></SafeAreaView></View>;

  return <View style={styles.screen}><SafeAreaView edges={['top']} style={styles.safe}><View style={styles.top}><Pressable style={styles.circle} onPress={() => router.back()}><Text style={styles.back}>‹</Text></Pressable><Text style={styles.topTitle}>Seating & pricing</Text><Pressable style={styles.circle} onPress={() => void load(true)}><Text style={styles.refresh}>↻</Text></Pressable></View><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor="#7c3aed" colors={['#7c3aed']} />}>
    <Text style={styles.eyebrow}>RESERVED SEATING</Text><Text style={styles.title}>{data.event.title}</Text><Text style={styles.copy}>Set a ticket name, customer price and capacity for each reserved section. Customers will then choose their exact seats.</Text>
    <View style={styles.summary}><Stat label="Reserved sections" value={String(reservedSections.length)} /><Stat label="Seats generated" value={String(seatsGenerated)} /><Stat label="Event status" value={data.event.status.replace(/_/g, ' ')} /></View>
    <View style={styles.rules}><Text style={styles.rulesTitle}>Reserved ticket rules</Text><Field label="Sales start (optional)" value={saleStarts} onChangeText={setSaleStarts} placeholder="YYYY-MM-DDTHH:mm" autoCapitalize="none" /><Field label="Sales end (optional)" value={saleEnds} onChangeText={setSaleEnds} placeholder="YYYY-MM-DDTHH:mm" autoCapitalize="none" /><Field label="Maximum seats per customer" value={maxPerOrder} onChangeText={setMaxPerOrder} keyboardType="number-pad" /></View>
    <Text style={styles.heading}>Section pricing</Text>{reservedSections.map((section) => <View key={section.id} style={styles.section}><View style={styles.sectionHead}><View><Text style={styles.sectionName}>{section.name}</Text><Text style={styles.capacityHint}>Up to {section.seatCount} reservable seats</Text></View><Text style={styles.sectionType}>{section.type.replace(/_/g, ' ')}</Text></View><Field label="Ticket name" value={pricing[section.id]?.ticketName || ''} onChangeText={(value) => update(section.id, 'ticketName', value)} placeholder={`${section.name} Reserved`} /><View style={styles.two}><View style={styles.flex}><Field label="Customer price (£)" value={pricing[section.id]?.price || ''} onChangeText={(value) => update(section.id, 'price', value)} keyboardType="decimal-pad" placeholder="25.00" /></View><View style={styles.flex}><Field label="Capacity" value={pricing[section.id]?.capacity || ''} onChangeText={(value) => update(section.id, 'capacity', value)} keyboardType="number-pad" placeholder={String(section.seatCount)} /></View></View></View>)}
    {!!error && <Text style={styles.error}>{error}</Text>}{!!message && <Text style={styles.success}>{message}</Text>}
    <Pressable disabled={saving || submitting} style={[styles.primary, (saving || submitting) && styles.disabled]} onPress={() => void save()}>{saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Save section pricing & generate seats</Text>}</Pressable>
    {data.event.status === 'DRAFT' && <Pressable disabled={saving || submitting || !seatsGenerated} style={[styles.reviewButton, (saving || submitting || !seatsGenerated) && styles.disabled]} onPress={confirmSubmit}>{submitting ? <ActivityIndicator color="#7c3aed" /> : <Text style={styles.reviewText}>Submit event for review</Text>}</Pressable>}
    <Text style={styles.note}>Changing section prices is locked once customers hold or buy reserved seats.</Text><View style={{ height: 36 }} />
  </ScrollView></SafeAreaView></View>;
}

function Field({ label, ...props }: { label: string } & ComponentProps<typeof TextInput>) { return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput {...props} style={styles.input} placeholderTextColor="#9ca3af" /></View>; }
function Stat({ label, value }: { label: string; value: string }) { return <View style={styles.stat}><Text style={styles.statLabel}>{label}</Text><Text style={styles.statValue}>{value}</Text></View>; }

const styles = StyleSheet.create({
  screen:{flex:1,backgroundColor:'#fff'},safe:{flex:1},center:{flex:1,alignItems:'center',justifyContent:'center',padding:24},content:{paddingHorizontal:18,paddingBottom:30},top:{height:58,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},circle:{width:40,height:40,borderRadius:20,borderWidth:1,borderColor:'#e5e7eb',backgroundColor:'#f9fafb',alignItems:'center',justifyContent:'center'},back:{color:'#111827',fontSize:34,lineHeight:36,marginTop:-3},refresh:{color:'#7c3aed',fontSize:21,fontWeight:'900'},topTitle:{color:'#111827',fontWeight:'900'},eyebrow:{color:'#7c3aed',fontSize:11,fontWeight:'900',letterSpacing:1.7,marginTop:12},title:{color:'#111827',fontSize:30,lineHeight:36,fontWeight:'900',marginTop:8},copy:{color:'#6b7280',fontSize:13,lineHeight:20,marginTop:9},summary:{flexDirection:'row',marginTop:20,borderRadius:18,borderWidth:1,borderColor:'#ddd6fe',backgroundColor:'#faf8ff',overflow:'hidden'},stat:{flex:1,padding:12,borderRightWidth:StyleSheet.hairlineWidth,borderRightColor:'#ddd6fe'},statLabel:{color:'#6d28d9',fontSize:9,fontWeight:'900',letterSpacing:.7,textTransform:'uppercase'},statValue:{color:'#111827',fontSize:13,fontWeight:'900',marginTop:6,textTransform:'capitalize'},rules:{marginTop:20,borderRadius:18,borderWidth:1,borderColor:'#e5e7eb',padding:15},rulesTitle:{color:'#111827',fontSize:16,fontWeight:'900'},heading:{color:'#111827',fontSize:21,fontWeight:'900',marginTop:26,marginBottom:11},section:{borderRadius:19,borderWidth:1,borderColor:'#e5e7eb',padding:15,marginTop:10},sectionHead:{flexDirection:'row',alignItems:'flex-start',justifyContent:'space-between',gap:10},sectionName:{color:'#111827',fontSize:17,fontWeight:'900'},capacityHint:{color:'#6b7280',fontSize:11,marginTop:4},sectionType:{color:'#7c3aed',backgroundColor:'#f3efff',borderRadius:999,paddingHorizontal:9,paddingVertical:5,fontSize:9,fontWeight:'900'},field:{marginTop:12},label:{color:'#374151',fontSize:12,fontWeight:'800',marginBottom:7},input:{height:49,borderRadius:13,borderWidth:1,borderColor:'#d1d5db',backgroundColor:'#f9fafb',paddingHorizontal:13,color:'#111827',fontSize:15},two:{flexDirection:'row',gap:10},flex:{flex:1},error:{color:'#dc2626',fontSize:13,lineHeight:19,marginTop:17},success:{color:'#15803d',fontSize:13,lineHeight:19,fontWeight:'800',marginTop:17},primary:{height:54,borderRadius:16,backgroundColor:'#7c3aed',alignItems:'center',justifyContent:'center',marginTop:22,paddingHorizontal:16},primaryText:{color:'#fff',fontSize:14,fontWeight:'900',textAlign:'center'},reviewButton:{height:52,borderRadius:16,borderWidth:1,borderColor:'#7c3aed',backgroundColor:'#faf8ff',alignItems:'center',justifyContent:'center',marginTop:10},reviewText:{color:'#7c3aed',fontWeight:'900'},disabled:{opacity:.5},note:{color:'#6b7280',fontSize:11,lineHeight:17,textAlign:'center',marginTop:10},
});
