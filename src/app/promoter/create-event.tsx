import { Image } from 'expo-image';
import { router } from 'expo-router';
import { type ComponentProps, type ReactNode, useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/lib/api';
import { pickAndUploadEventImage, pickAndUploadHeadlinerImage } from '@/lib/event-image-upload';

type Category = { id: string; name: string; slug: string };
type TicketDraft = { id: string; name: string; description: string; price: string; quantity: string; maxPerOrder: string };
type TaxProfile = { vatRegistered: boolean; vatNumber: string | null };
type EventSetup = { success: true; categories: Category[]; taxProfile: TaxProfile };
type SettingsDefaults = { success: true; notifications: { defaultRefundPolicy: string; defaultTicketTaxTreatment: string } };
type TaxTreatment = 'UK_STANDARD' | 'UK_REDUCED' | 'UK_ZERO' | 'UK_EXEMPT';

const newTicket = (): TicketDraft => ({ id: `${Date.now()}-${Math.random()}`, name: '', description: '', price: '', quantity: '', maxPerOrder: '10' });
const TAX_OPTIONS: Array<{value:TaxTreatment;label:string;rate:number}> = [
  {value:'UK_STANDARD',label:'Standard 20%',rate:20},
  {value:'UK_REDUCED',label:'Reduced 5%',rate:5},
  {value:'UK_ZERO',label:'Zero rated 0%',rate:0},
  {value:'UK_EXEMPT',label:'VAT exempt',rate:0},
];
function taxRate(treatment:string){return TAX_OPTIONS.find((item)=>item.value===treatment)?.rate??20;}
function splitIncludedVat(gross:number,rate:number){if(!Number.isFinite(gross)||gross<=0||rate<=0)return{net:Math.max(0,gross||0),vat:0};const net=gross/(1+rate/100);return{net,vat:gross-net};}
function money(value:number){return `£${value.toFixed(2)}`;}

export default function CreateEventScreen() {
  const { user, sessionToken } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [taxProfile, setTaxProfile] = useState<TaxProfile>({vatRegistered:false,vatNumber:null});
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingHeadliner, setUploadingHeadliner] = useState(false);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [ageRestriction, setAgeRestriction] = useState('all');
  const [headlinerName, setHeadlinerName] = useState('');
  const [headlinerImageUrl, setHeadlinerImageUrl] = useState('');
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
  const [refundPolicy, setRefundPolicy] = useState('NO_POLICY');
  const [ticketTaxTreatment, setTicketTaxTreatment] = useState<TaxTreatment>('UK_STANDARD');
  const [taxQualificationConfirmed,setTaxQualificationConfirmed]=useState(false);
  const [tickets, setTickets] = useState<TicketDraft[]>([newTicket()]);

  useEffect(() => {
    if (!sessionToken || user?.role !== 'PROMOTER') { setLoadingCategories(false); return; }
    Promise.all([
      apiRequest<EventSetup>('/api/mobile/promoter/events', {}, sessionToken),
      apiRequest<SettingsDefaults>('/api/mobile/settings', {}, sessionToken).catch(() => null),
    ])
      .then(([eventData, settings]) => {
        setCategories(eventData.categories || []);
        setTaxProfile(eventData.taxProfile || {vatRegistered:false,vatNumber:null});
        if (eventData.categories?.[0]) setCategory((current) => current || eventData.categories[0].slug);
        if (settings?.notifications?.defaultRefundPolicy) setRefundPolicy(settings.notifications.defaultRefundPolicy);
        const savedTreatment=settings?.notifications?.defaultTicketTaxTreatment as TaxTreatment|undefined;
        if(eventData.taxProfile?.vatRegistered&&savedTreatment&&TAX_OPTIONS.some((item)=>item.value===savedTreatment)) setTicketTaxTreatment(savedTreatment);
        else setTicketTaxTreatment('UK_STANDARD');
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load event setup.'))
      .finally(() => setLoadingCategories(false));
  }, [sessionToken, user?.role]);

  async function chooseImage() {
    if (!sessionToken) return;
    try { setUploadingImage(true); setError(''); const uploaded = await pickAndUploadEventImage(sessionToken); if (uploaded) setImage(uploaded.url); }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to upload image.'); }
    finally { setUploadingImage(false); }
  }

  async function chooseHeadlinerImage() {
    if (!sessionToken) return;
    try { setUploadingHeadliner(true); setError(''); const uploaded = await pickAndUploadHeadlinerImage(sessionToken); if (uploaded) setHeadlinerImageUrl(uploaded.url); }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to upload headliner image.'); }
    finally { setUploadingHeadliner(false); }
  }

  function updateTicket(id: string, field: keyof TicketDraft, value: string) {
    setTickets((current) => current.map((ticket) => ticket.id === id ? { ...ticket, [field]: value } : ticket));
  }

  async function submit() {
    if (!sessionToken || user?.role !== 'PROMOTER') { setError('Sign in with a promoter account first.'); return; }
    if (!title.trim() || !description.trim() || !category || !eventDate || !startTime || !venue.trim() || !address.trim() || !city.trim() || !postcode.trim()) { setError('Complete all required event fields.'); return; }
    if (tickets.some((ticket) => !ticket.name.trim() || !ticket.price || !ticket.quantity)) { setError('Every ticket needs a name, price and quantity.'); return; }
    if(taxProfile.vatRegistered&&ticketTaxTreatment!=='UK_STANDARD'&&!taxQualificationConfirmed){setError('Confirm that this event qualifies for the selected non-standard VAT treatment.');return;}

    try {
      setSubmitting(true); setError('');
      await apiRequest('/api/mobile/promoter/events', {
        method: 'POST',
        body: JSON.stringify({
          title, description, ageRestriction, headlinerName, headlinerImageUrl, category, eventDate, startTime, doorsOpenTime, endTime,
          venue, address, city, postcode, image, refundPolicy, ticketTaxTreatment:'UK_STANDARD'===ticketTaxTreatment||taxProfile.vatRegistered?ticketTaxTreatment:'UK_STANDARD',taxQualificationConfirmed,
          tickets: tickets.map(({ id: _id, ...ticket }) => ticket),
        }),
      }, sessionToken);
      router.replace('/promoter/events');
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to create event.'); }
    finally { setSubmitting(false); }
  }

  if (user?.role !== 'PROMOTER') {
    return <View style={styles.screen}><SafeAreaView style={styles.center}><Text style={styles.title}>Promoter access required</Text><Pressable style={styles.primary} onPress={() => router.replace('/login')}><Text style={styles.primaryText}>Sign in</Text></Pressable></SafeAreaView></View>;
  }

  const busy = submitting || uploadingImage || uploadingHeadliner;
  const rate=taxProfile.vatRegistered?taxRate(ticketTaxTreatment):0;
  const nonStandard=taxProfile.vatRegistered&&ticketTaxTreatment!=='UK_STANDARD';

  return <View style={styles.screen}><SafeAreaView edges={['top']} style={styles.safeArea}><KeyboardAvoidingView style={styles.safeArea} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <View style={styles.topBar}><Pressable style={styles.back} onPress={() => router.back()}><Text style={styles.backText}>‹</Text></Pressable><Text style={styles.topTitle}>Create Event</Text><View style={styles.spacer} /></View>
    <Text style={styles.eyebrow}>PROMOTER PORTAL</Text><Text style={styles.title}>Create a new event</Text><Text style={styles.copy}>Add the event, headliner, images and ticket details. It will then be sent to OutNow admin for review.</Text>

    <Section title="Event details"><Field label="Event title *" value={title} onChangeText={setTitle} placeholder="Summer Rooftop Party"/><Field label="Description *" value={description} onChangeText={setDescription} placeholder="Tell customers what to expect" multiline/><Field label="Age restriction" value={ageRestriction} onChangeText={setAgeRestriction} placeholder="18+ or all"/></Section>

    <Section title="Headliner"><Field label="Headliner name" value={headlinerName} onChangeText={setHeadlinerName} placeholder="e.g. Burna Boy" maxLength={160}/><Text style={styles.helper}>The main artist, performer or featured act.</Text><View style={styles.headlinerRow}>{headlinerImageUrl ? <Image source={{uri:headlinerImageUrl}} style={styles.headlinerImage} contentFit="cover"/> : <View style={styles.headlinerFallback}><Text style={styles.headlinerFallbackText}>{headlinerName.trim().charAt(0).toUpperCase() || 'H'}</Text></View>}<View style={styles.headlinerActions}><Pressable disabled={uploadingHeadliner} style={styles.imageButton} onPress={() => void chooseHeadlinerImage()}>{uploadingHeadliner?<ActivityIndicator color="#7c3aed"/>:<Text style={styles.imageButtonText}>{headlinerImageUrl?'Replace headliner photo':'Choose headliner photo'}</Text>}</Pressable>{!!headlinerImageUrl&&<Pressable onPress={()=>setHeadlinerImageUrl('')}><Text style={styles.removeText}>Remove photo</Text></Pressable>}</View></View></Section>

    <Section title="Category">{loadingCategories?<ActivityIndicator color="#7c3aed"/>:<View style={styles.chips}>{categories.map((item)=><Pressable key={item.id} onPress={()=>setCategory(item.slug)} style={[styles.chip,category===item.slug&&styles.chipSelected]}><Text style={[styles.chipText,category===item.slug&&styles.chipTextSelected]}>{item.name}</Text></Pressable>)}</View>}</Section>
    <Section title="Date & time"><Field label="Event date *" value={eventDate} onChangeText={setEventDate} placeholder="YYYY-MM-DD"/><View style={styles.twoCol}><View style={styles.flex}><Field label="Start *" value={startTime} onChangeText={setStartTime} placeholder="19:30"/></View><View style={styles.flex}><Field label="Doors" value={doorsOpenTime} onChangeText={setDoorsOpenTime} placeholder="18:30"/></View></View><Field label="End time" value={endTime} onChangeText={setEndTime} placeholder="23:30"/></Section>
    <Section title="Venue & location"><Field label="Venue *" value={venue} onChangeText={setVenue} placeholder="Venue name"/><Field label="Address *" value={address} onChangeText={setAddress} placeholder="Street address"/><View style={styles.twoCol}><View style={styles.flex}><Field label="City *" value={city} onChangeText={setCity} placeholder="London"/></View><View style={styles.flex}><Field label="Postcode *" value={postcode} onChangeText={setPostcode} placeholder="SW1A 1AA"/></View></View></Section>
    <Section title="Cover image">{!!image&&<Image source={{uri:image}} style={styles.coverPreview} contentFit="cover"/>}<Pressable disabled={uploadingImage} style={styles.imageButton} onPress={() => void chooseImage()}>{uploadingImage?<ActivityIndicator color="#7c3aed"/>:<Text style={styles.imageButtonText}>{image?'Replace cover photo':'Choose cover photo from phone'}</Text>}</Pressable>{image?<Text style={styles.uploaded}>✓ Cover photo uploaded securely</Text>:<Text style={styles.helper}>JPG, PNG or WEBP, up to 10 MB.</Text>}</Section>

    <Section title="Ticket settings">
      <Text style={styles.helper}>Your saved promoter defaults are applied automatically when this screen opens.</Text>
      <Text style={styles.smallLabel}>Refund policy</Text><View style={styles.chips}>{[['NO_POLICY','Refunds until event'],['NO_REFUNDS','No refunds'],['24_HOURS','24h cutoff'],['48_HOURS','48h cutoff'],['72_HOURS','72h cutoff']].map(([value,label])=><Pressable key={value} onPress={()=>setRefundPolicy(value)} style={[styles.chip,refundPolicy===value&&styles.chipSelected]}><Text style={[styles.chipText,refundPolicy===value&&styles.chipTextSelected]}>{label}</Text></Pressable>)}</View>
      <Text style={styles.smallLabel}>UK ticket VAT</Text>
      {loadingCategories?<ActivityIndicator color="#7c3aed"/>:taxProfile.vatRegistered?<><Text style={styles.helper}>VAT registered{taxProfile.vatNumber?` · ${taxProfile.vatNumber}`:''}. Ticket prices below are the final VAT-inclusive prices customers see.</Text><View style={styles.chips}>{TAX_OPTIONS.map((item)=><Pressable key={item.value} onPress={()=>{setTicketTaxTreatment(item.value);setTaxQualificationConfirmed(false);}} style={[styles.chip,ticketTaxTreatment===item.value&&styles.chipSelected]}><Text style={[styles.chipText,ticketTaxTreatment===item.value&&styles.chipTextSelected]}>{item.label}</Text></Pressable>)}</View>{nonStandard&&<Pressable style={[styles.confirmBox,taxQualificationConfirmed&&styles.confirmBoxSelected]} onPress={()=>setTaxQualificationConfirmed((value)=>!value)}><Text style={styles.confirmMark}>{taxQualificationConfirmed?'✓':'○'}</Text><Text style={styles.confirmText}>I confirm this event qualifies for the selected non-standard VAT treatment. OutNow does not determine my VAT eligibility.</Text></Pressable>}</>:<View style={styles.noVatBox}><Text style={styles.noVatTitle}>No ticket VAT charged</Text><Text style={styles.helper}>Your promoter tax profile says you are not VAT registered. Ticket prices are still the final customer prices, but no VAT is split out.</Text></View>}
    </Section>

    <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Ticket types</Text><Pressable onPress={()=>setTickets((current)=>[...current,newTicket()])}><Text style={styles.addText}>＋ Add ticket</Text></Pressable></View>
    {tickets.map((ticket,index)=>{const gross=Number(ticket.price)||0;const breakdown=splitIncludedVat(gross,rate);return <View key={ticket.id} style={styles.ticketCard}><View style={styles.ticketHeader}><Text style={styles.ticketTitle}>Ticket {index+1}</Text>{tickets.length>1&&<Pressable onPress={()=>setTickets((current)=>current.filter((item)=>item.id!==ticket.id))}><Text style={styles.removeText}>Remove</Text></Pressable>}</View><Field label="Name *" value={ticket.name} onChangeText={(v)=>updateTicket(ticket.id,'name',v)} placeholder="General Admission"/><Field label="Description" value={ticket.description} onChangeText={(v)=>updateTicket(ticket.id,'description',v)} placeholder="Optional details"/><View style={styles.twoCol}><View style={styles.flex}><Field label="Customer price (£) *" value={ticket.price} onChangeText={(v)=>updateTicket(ticket.id,'price',v)} placeholder="20.00" keyboardType="decimal-pad"/></View><View style={styles.flex}><Field label="Quantity *" value={ticket.quantity} onChangeText={(v)=>updateTicket(ticket.id,'quantity',v)} placeholder="100" keyboardType="number-pad"/></View></View>{gross>0&&<View style={styles.vatBreakdown}><Text style={styles.vatBreakdownTitle}>{taxProfile.vatRegistered?`VAT included at ${rate}%`:'No VAT charged'}</Text><Text style={styles.vatLine}>Customer price: {money(gross)}</Text><Text style={styles.vatLine}>Net before VAT: {money(breakdown.net)}</Text><Text style={styles.vatLine}>Included VAT: {money(breakdown.vat)}</Text></View>}<Field label="Max per order" value={ticket.maxPerOrder} onChangeText={(v)=>updateTicket(ticket.id,'maxPerOrder',v)} placeholder="10" keyboardType="number-pad"/></View>})}

    {!!error&&<Text style={styles.error}>{error}</Text>}
    <Pressable disabled={busy||Boolean(nonStandard&&!taxQualificationConfirmed)} style={[styles.primary,(busy||Boolean(nonStandard&&!taxQualificationConfirmed))&&styles.disabled]} onPress={()=>void submit()}>{submitting?<ActivityIndicator color="#fff"/>:<Text style={styles.primaryText}>Submit event for review</Text>}</Pressable><Text style={styles.submitNote}>The event will remain pending until an OutNow admin approves it.</Text>
  </ScrollView></KeyboardAvoidingView></SafeAreaView></View>;
}

function Section({title,children}:{title:string;children:ReactNode}){return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>}
function Field({label,multiline,...props}:{label:string;multiline?:boolean}&ComponentProps<typeof TextInput>){return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput {...props} multiline={multiline} placeholderTextColor="#9ca3af" style={[styles.input,multiline&&styles.textarea]}/></View>}

const styles=StyleSheet.create({
  screen:{flex:1,backgroundColor:'#fff'},safeArea:{flex:1},center:{flex:1,alignItems:'center',justifyContent:'center',padding:24},content:{paddingHorizontal:18,paddingBottom:50},
  topBar:{height:58,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},back:{width:40,height:40,borderRadius:20,borderWidth:1,borderColor:'#e5e7eb',backgroundColor:'#f9fafb',alignItems:'center',justifyContent:'center'},backText:{color:'#111827',fontSize:34,lineHeight:36,marginTop:-3},topTitle:{color:'#111827',fontSize:15,fontWeight:'800'},spacer:{width:40},
  eyebrow:{color:'#7c3aed',fontSize:11,fontWeight:'900',letterSpacing:1.8,marginTop:12},title:{color:'#111827',fontSize:34,lineHeight:40,fontWeight:'900',marginTop:8},copy:{color:'#6b7280',fontSize:14,lineHeight:22,marginTop:10},
  section:{marginTop:28,borderRadius:20,borderWidth:1,borderColor:'#e5e7eb',backgroundColor:'#fff',padding:16},sectionHeader:{marginTop:28,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},sectionTitle:{color:'#111827',fontSize:19,fontWeight:'900',marginBottom:10},field:{marginTop:10},label:{color:'#374151',fontSize:12,fontWeight:'800',marginBottom:7},input:{minHeight:50,borderRadius:14,borderWidth:1,borderColor:'#d1d5db',backgroundColor:'#f9fafb',color:'#111827',paddingHorizontal:14,fontSize:15},textarea:{minHeight:110,paddingTop:13,textAlignVertical:'top'},twoCol:{flexDirection:'row',gap:10},flex:{flex:1},
  chips:{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:7},chip:{borderRadius:999,borderWidth:1,borderColor:'#d1d5db',backgroundColor:'#f9fafb',paddingHorizontal:12,paddingVertical:9},chipSelected:{borderColor:'#7c3aed',backgroundColor:'#f3efff'},chipText:{color:'#4b5563',fontSize:12,fontWeight:'700'},chipTextSelected:{color:'#7c3aed'},smallLabel:{color:'#374151',fontSize:12,fontWeight:'800',marginTop:13},helper:{color:'#6b7280',fontSize:11,lineHeight:17,marginTop:9},
  confirmBox:{marginTop:12,borderRadius:14,borderWidth:1,borderColor:'#d1d5db',padding:12,flexDirection:'row',gap:10,backgroundColor:'#f9fafb'},confirmBoxSelected:{borderColor:'#7c3aed',backgroundColor:'#faf5ff'},confirmMark:{color:'#7c3aed',fontSize:18,fontWeight:'900'},confirmText:{flex:1,color:'#4b5563',fontSize:11,lineHeight:17,fontWeight:'700'},noVatBox:{marginTop:10,borderRadius:14,backgroundColor:'#f9fafb',borderWidth:1,borderColor:'#e5e7eb',padding:12},noVatTitle:{color:'#111827',fontSize:13,fontWeight:'900'},vatBreakdown:{marginTop:10,borderRadius:14,borderWidth:1,borderColor:'#e9d5ff',backgroundColor:'#faf5ff',padding:12},vatBreakdownTitle:{color:'#7c3aed',fontSize:12,fontWeight:'900',marginBottom:6},vatLine:{color:'#4b5563',fontSize:11,lineHeight:17},
  headlinerRow:{flexDirection:'row',alignItems:'center',gap:14,marginTop:14},headlinerImage:{width:88,height:88,borderRadius:44,backgroundColor:'#f3f4f6'},headlinerFallback:{width:88,height:88,borderRadius:44,backgroundColor:'#f3efff',alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'#ddd6fe'},headlinerFallbackText:{color:'#7c3aed',fontSize:30,fontWeight:'900'},headlinerActions:{flex:1},
  coverPreview:{width:'100%',aspectRatio:16/9,borderRadius:16,backgroundColor:'#f3f4f6',marginTop:6},imageButton:{minHeight:48,borderRadius:14,borderWidth:1,borderColor:'#7c3aed',backgroundColor:'#faf8ff',alignItems:'center',justifyContent:'center',marginTop:10,paddingHorizontal:12},imageButtonText:{color:'#7c3aed',fontWeight:'900',textAlign:'center'},uploaded:{color:'#15803d',fontSize:12,fontWeight:'800',marginTop:9},
  addText:{color:'#7c3aed',fontSize:13,fontWeight:'900'},ticketCard:{marginTop:12,borderRadius:20,borderWidth:1,borderColor:'#e5e7eb',backgroundColor:'#fff',padding:16},ticketHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},ticketTitle:{color:'#111827',fontSize:16,fontWeight:'900'},removeText:{color:'#dc2626',fontSize:12,fontWeight:'800',marginTop:8},error:{color:'#dc2626',fontSize:13,lineHeight:19,marginTop:18},
  primary:{minHeight:54,borderRadius:16,backgroundColor:'#7c3aed',alignItems:'center',justifyContent:'center',marginTop:24,paddingHorizontal:18},primaryText:{color:'#fff',fontSize:15,fontWeight:'900',textAlign:'center'},disabled:{opacity:.55},submitNote:{color:'#6b7280',textAlign:'center',fontSize:11,lineHeight:17,marginTop:10,marginBottom:20},
});