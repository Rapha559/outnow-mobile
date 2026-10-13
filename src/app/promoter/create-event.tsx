import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/lib/api';
import { pickAndUploadEventImage } from '@/lib/event-image-upload';

type Category = { id: string; name: string; slug: string };
type TicketDraft = { id: string; name: string; description: string; price: string; quantity: string; maxPerOrder: string };

const newTicket = (): TicketDraft => ({ id: `${Date.now()}-${Math.random()}`, name: '', description: '', price: '', quantity: '', maxPerOrder: '10' });

export default function CreateEventScreen() {
  const { user, sessionToken } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [ageRestriction, setAgeRestriction] = useState('all');
  const [category, setCategory] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [doorsOpenTime, setDoorsOpenTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [venue, setVenue] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postcode, setPostcode] = useState('');
  const [image, setImage] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [refundPolicy, setRefundPolicy] = useState('NO_POLICY');
  const [ticketTaxTreatment, setTicketTaxTreatment] = useState('UK_STANDARD');
  const [tickets, setTickets] = useState<TicketDraft[]>([newTicket()]);

  useEffect(() => {
    if (!sessionToken || user?.role !== 'PROMOTER') { setLoadingCategories(false); return; }
    apiRequest<{ success: true; categories: Category[] }>('/api/mobile/promoter/events', {}, sessionToken)
      .then((data) => {
        setCategories(data.categories || []);
        if (data.categories?.[0]) setCategory((current) => current || data.categories[0].slug);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load categories.'))
      .finally(() => setLoadingCategories(false));
  }, [sessionToken, user?.role]);

  async function chooseImage() {
    if (!sessionToken) return;
    try {
      setUploadingImage(true);
      setError('');
      const uploaded = await pickAndUploadEventImage(sessionToken);
      if (uploaded) {
        setImage(uploaded.url);
        setImagePreview(uploaded.localUri);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to upload image.');
    } finally {
      setUploadingImage(false);
    }
  }

  function updateTicket(id: string, field: keyof TicketDraft, value: string) {
    setTickets((current) => current.map((ticket) => ticket.id === id ? { ...ticket, [field]: value } : ticket));
  }

  async function submit() {
    if (!sessionToken || user?.role !== 'PROMOTER') { setError('Sign in with a promoter account first.'); return; }
    if (!title.trim() || !description.trim() || !category || !eventDate || !startTime || !venue.trim() || !address.trim() || !city.trim() || !postcode.trim()) {
      setError('Complete all required event fields.'); return;
    }
    if (tickets.some((ticket) => !ticket.name.trim() || !ticket.price || !ticket.quantity)) {
      setError('Every ticket needs a name, price and quantity.'); return;
    }

    try {
      setSubmitting(true); setError('');
      await apiRequest('/api/mobile/promoter/events', {
        method: 'POST',
        body: JSON.stringify({
          title, description, ageRestriction, category, eventDate, startTime, doorsOpenTime, endTime,
          venue, address, city, postcode, image, refundPolicy, ticketTaxTreatment,
          tickets: tickets.map(({ id: _id, ...ticket }) => ticket),
        }),
      }, sessionToken);
      router.replace('/promoter/events');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create event.');
    } finally { setSubmitting(false); }
  }

  if (user?.role !== 'PROMOTER') {
    return <View style={styles.screen}><SafeAreaView style={styles.center}><Text style={styles.title}>Promoter access required</Text><Pressable style={styles.primary} onPress={() => router.replace('/login')}><Text style={styles.primaryText}>Sign in</Text></Pressable></SafeAreaView></View>;
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <KeyboardAvoidingView style={styles.safeArea} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.topBar}><Pressable style={styles.back} onPress={() => router.back()}><Text style={styles.backText}>‹</Text></Pressable><Text style={styles.topTitle}>Create Event</Text><View style={styles.spacer} /></View>
            <Text style={styles.eyebrow}>PROMOTER PORTAL</Text><Text style={styles.title}>Create a new event</Text><Text style={styles.copy}>Add your event details, cover photo and tickets. It will be sent to OutNow admin for review.</Text>

            <Section title="Event details">
              <Field label="Event title *" value={title} onChangeText={setTitle} placeholder="Summer Rooftop Party" />
              <Field label="Description *" value={description} onChangeText={setDescription} placeholder="Tell customers what to expect" multiline />
              <Field label="Age restriction" value={ageRestriction} onChangeText={setAgeRestriction} placeholder="18+ or all" />
            </Section>

            <Section title="Category">
              {loadingCategories ? <ActivityIndicator color="#7c3aed" /> : <View style={styles.chips}>{categories.map((item) => <Pressable key={item.id} onPress={() => setCategory(item.slug)} style={[styles.chip, category === item.slug && styles.chipSelected]}><Text style={[styles.chipText, category === item.slug && styles.chipTextSelected]}>{item.name}</Text></Pressable>)}</View>}
            </Section>

            <Section title="Date & time">
              <Field label="Event date *" value={eventDate} onChangeText={setEventDate} placeholder="YYYY-MM-DD" />
              <View style={styles.twoCol}><View style={styles.flex}><Field label="Start *" value={startTime} onChangeText={setStartTime} placeholder="19:30" /></View><View style={styles.flex}><Field label="Doors" value={doorsOpenTime} onChangeText={setDoorsOpenTime} placeholder="18:30" /></View></View>
              <Field label="End time" value={endTime} onChangeText={setEndTime} placeholder="23:30" />
            </Section>

            <Section title="Venue & location">
              <Field label="Venue *" value={venue} onChangeText={setVenue} placeholder="Venue name" />
              <Field label="Address *" value={address} onChangeText={setAddress} placeholder="Street address" />
              <View style={styles.twoCol}><View style={styles.flex}><Field label="City *" value={city} onChangeText={setCity} placeholder="London" /></View><View style={styles.flex}><Field label="Postcode *" value={postcode} onChangeText={setPostcode} placeholder="SW1A 1AA" /></View></View>
            </Section>

            <Section title="Cover image">
              {!!(imagePreview || image) && <Image source={{ uri: imagePreview || image }} style={styles.coverPreview} contentFit="cover" />}
              <Pressable disabled={uploadingImage} style={styles.imageButton} onPress={() => void chooseImage()}>
                {uploadingImage ? <ActivityIndicator color="#7c3aed" /> : <Text style={styles.imageButtonText}>{image ? 'Replace cover photo' : 'Choose photo from phone'}</Text>}
              </Pressable>
              {image ? <Text style={styles.uploaded}>✓ Photo uploaded securely</Text> : <Text style={styles.helper}>JPG, PNG or WEBP, up to 10 MB. You can crop it before uploading.</Text>}
            </Section>

            <Section title="Ticket settings">
              <Text style={styles.smallLabel}>Refund policy</Text><View style={styles.chips}>{[['NO_POLICY','Refunds until event'],['NO_REFUNDS','No refunds'],['24_HOURS','24h cutoff'],['48_HOURS','48h cutoff'],['72_HOURS','72h cutoff']].map(([value,label]) => <Pressable key={value} onPress={() => setRefundPolicy(value)} style={[styles.chip, refundPolicy === value && styles.chipSelected]}><Text style={[styles.chipText, refundPolicy === value && styles.chipTextSelected]}>{label}</Text></Pressable>)}</View>
              <Text style={styles.smallLabel}>UK ticket VAT treatment</Text><View style={styles.chips}>{[['UK_STANDARD','Standard'],['UK_EXEMPT','Exempt']].map(([value,label]) => <Pressable key={value} onPress={() => setTicketTaxTreatment(value)} style={[styles.chip, ticketTaxTreatment === value && styles.chipSelected]}><Text style={[styles.chipText, ticketTaxTreatment === value && styles.chipTextSelected]}>{label}</Text></Pressable>)}</View>
            </Section>

            <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Ticket types</Text><Pressable onPress={() => setTickets((current) => [...current, newTicket()])}><Text style={styles.addText}>＋ Add ticket</Text></Pressable></View>
            {tickets.map((ticket, index) => <View key={ticket.id} style={styles.ticketCard}>
              <View style={styles.ticketHeader}><Text style={styles.ticketTitle}>Ticket {index + 1}</Text>{tickets.length > 1 && <Pressable onPress={() => setTickets((current) => current.filter((item) => item.id !== ticket.id))}><Text style={styles.removeText}>Remove</Text></Pressable>}</View>
              <Field label="Name *" value={ticket.name} onChangeText={(v) => updateTicket(ticket.id,'name',v)} placeholder="General Admission" />
              <Field label="Description" value={ticket.description} onChangeText={(v) => updateTicket(ticket.id,'description',v)} placeholder="Optional details" />
              <View style={styles.twoCol}><View style={styles.flex}><Field label="Price (£) *" value={ticket.price} onChangeText={(v) => updateTicket(ticket.id,'price',v)} placeholder="20.00" keyboardType="decimal-pad" /></View><View style={styles.flex}><Field label="Quantity *" value={ticket.quantity} onChangeText={(v) => updateTicket(ticket.id,'quantity',v)} placeholder="100" keyboardType="number-pad" /></View></View>
              <Field label="Max per order" value={ticket.maxPerOrder} onChangeText={(v) => updateTicket(ticket.id,'maxPerOrder',v)} placeholder="10" keyboardType="number-pad" />
            </View>)}

            {!!error && <Text style={styles.error}>{error}</Text>}
            <Pressable disabled={submitting || uploadingImage} style={[styles.primary, (submitting || uploadingImage) && styles.disabled]} onPress={() => void submit()}>{submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Submit event for review</Text>}</Pressable>
            <Text style={styles.submitNote}>The event will remain pending until an OutNow admin approves it.</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) { return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>; }
function Field({ label, multiline, ...props }: { label: string; multiline?: boolean } & React.ComponentProps<typeof TextInput>) { return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput {...props} multiline={multiline} placeholderTextColor="#9ca3af" style={[styles.input, multiline && styles.textarea]} /></View>; }

const styles = StyleSheet.create({
  screen:{flex:1,backgroundColor:'#fff'},safeArea:{flex:1},center:{flex:1,alignItems:'center',justifyContent:'center',padding:24},content:{paddingHorizontal:18,paddingBottom:50},
  topBar:{height:58,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},back:{width:40,height:40,borderRadius:20,borderWidth:1,borderColor:'#e5e7eb',backgroundColor:'#f9fafb',alignItems:'center',justifyContent:'center'},backText:{color:'#111827',fontSize:34,lineHeight:36,marginTop:-3},topTitle:{color:'#111827',fontSize:15,fontWeight:'800'},spacer:{width:40},
  eyebrow:{color:'#7c3aed',fontSize:11,fontWeight:'900',letterSpacing:1.8,marginTop:12},title:{color:'#111827',fontSize:34,lineHeight:40,fontWeight:'900',marginTop:8},copy:{color:'#6b7280',fontSize:14,lineHeight:22,marginTop:10},
  section:{marginTop:28,borderRadius:20,borderWidth:1,borderColor:'#e5e7eb',backgroundColor:'#fff',padding:16},sectionHeader:{marginTop:28,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},sectionTitle:{color:'#111827',fontSize:19,fontWeight:'900',marginBottom:10},field:{marginTop:10},label:{color:'#374151',fontSize:12,fontWeight:'800',marginBottom:7},input:{minHeight:50,borderRadius:14,borderWidth:1,borderColor:'#d1d5db',backgroundColor:'#f9fafb',color:'#111827',paddingHorizontal:14,fontSize:15},textarea:{minHeight:110,paddingTop:13,textAlignVertical:'top'},twoCol:{flexDirection:'row',gap:10},flex:{flex:1},
  chips:{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:7},chip:{borderRadius:999,borderWidth:1,borderColor:'#d1d5db',backgroundColor:'#f9fafb',paddingHorizontal:12,paddingVertical:9},chipSelected:{borderColor:'#7c3aed',backgroundColor:'#f3efff'},chipText:{color:'#4b5563',fontSize:12,fontWeight:'700'},chipTextSelected:{color:'#7c3aed'},smallLabel:{color:'#374151',fontSize:12,fontWeight:'800',marginTop:13},helper:{color:'#6b7280',fontSize:11,lineHeight:17,marginTop:9},
  coverPreview:{width:'100%',aspectRatio:16/9,borderRadius:16,backgroundColor:'#f3f4f6',marginTop:6},imageButton:{height:50,borderRadius:14,borderWidth:1,borderColor:'#7c3aed',backgroundColor:'#faf8ff',alignItems:'center',justifyContent:'center',marginTop:12},imageButtonText:{color:'#7c3aed',fontWeight:'900'},uploaded:{color:'#15803d',fontSize:12,fontWeight:'800',marginTop:9},
  addText:{color:'#7c3aed',fontSize:13,fontWeight:'900'},ticketCard:{marginTop:12,borderRadius:20,borderWidth:1,borderColor:'#e5e7eb',backgroundColor:'#fff',padding:16},ticketHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},ticketTitle:{color:'#111827',fontSize:16,fontWeight:'900'},removeText:{color:'#dc2626',fontSize:12,fontWeight:'800'},error:{color:'#dc2626',fontSize:13,lineHeight:19,marginTop:18},
  primary:{minHeight:54,borderRadius:16,backgroundColor:'#7c3aed',alignItems:'center',justifyContent:'center',marginTop:24,paddingHorizontal:18},primaryText:{color:'#fff',fontSize:15,fontWeight:'900',textAlign:'center'},disabled:{opacity:.55},submitNote:{color:'#6b7280',textAlign:'center',fontSize:11,lineHeight:17,marginTop:10},
});
