import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { type ComponentProps, type ReactNode, useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/lib/api';
import { pickAndUploadEventImage, pickAndUploadHeadlinerImage } from '@/lib/event-image-upload';

type Category={id:string;name:string;slug:string};
type TicketDraft={id?:string;key:string;name:string;description:string;price:string;quantity:string;sold:number;maxPerOrder:string;isActive:boolean};
type EventData={id:string;title:string;description:string;ageRestriction:string;date:string;endDate:string|null;doorsOpenAt:string|null;venue:string;location:string;image:string|null;status:string;refundPolicy:string;category:Category;pendingEdit:boolean;ticketTypes:Array<{id:string;name:string;description:string|null;price:number;quantity:number;sold:number;maxPerOrder:number;isActive:boolean}>};
type HeadlinerData={success:true;headlinerName:string;headlinerImageUrl:string};

function datePart(value?:string|null){if(!value)return '';const d=new Date(value);if(Number.isNaN(d.getTime()))return '';const y=d.getFullYear();const m=String(d.getMonth()+1).padStart(2,'0');const day=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${day}`;}
function timePart(value?:string|null){if(!value)return '';const d=new Date(value);if(Number.isNaN(d.getTime()))return '';return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;}
function toIso(date:string,time:string){const d=new Date(`${date}T${time}:00`);if(Number.isNaN(d.getTime()))throw new Error('Enter a valid date and time.');return d.toISOString();}
function newTicket():TicketDraft{return{key:`new-${Date.now()}-${Math.random()}`,name:'',description:'',price:'',quantity:'',sold:0,maxPerOrder:'10',isActive:true};}

export default function EditPromoterEventScreen(){
  const params=useLocalSearchParams<{id:string}>();const id=Array.isArray(params.id)?params.id[0]:params.id;
  const {user,sessionToken}=useAuth();
  const [loading,setLoading]=useState(true);const [saving,setSaving]=useState(false);const [uploading,setUploading]=useState(false);const [error,setError]=useState('');
  const [savingHeadliner,setSavingHeadliner]=useState(false);const [uploadingHeadliner,setUploadingHeadliner]=useState(false);const [headlinerMessage,setHeadlinerMessage]=useState('');
  const [categories,setCategories]=useState<Category[]>([]);const [event,setEvent]=useState<EventData|null>(null);
  const [title,setTitle]=useState('');const [description,setDescription]=useState('');const [ageRestriction,setAgeRestriction]=useState('all');const [categoryId,setCategoryId]=useState('');
  const [headlinerName,setHeadlinerName]=useState('');const [headlinerImageUrl,setHeadlinerImageUrl]=useState('');
  const [eventDate,setEventDate]=useState('');const [startTime,setStartTime]=useState('');const [doorsTime,setDoorsTime]=useState('');const [endTime,setEndTime]=useState('');
  const [venue,setVenue]=useState('');const [location,setLocation]=useState('');const [refundPolicy,setRefundPolicy]=useState('NO_POLICY');const [image,setImage]=useState('');const [tickets,setTickets]=useState<TicketDraft[]>([]);

  const load=useCallback(async()=>{
    if(!id||!sessionToken||user?.role!=='PROMOTER')return;
    try{
      setLoading(true);setError('');
      const [eventData,categoryData,headlinerData]=await Promise.all([
        apiRequest<{success:true;event:EventData}>(`/api/mobile/promoter/events/${id}`,{},sessionToken),
        apiRequest<{success:true;categories:Category[]}>('/api/mobile/promoter/events',{},sessionToken),
        apiRequest<HeadlinerData>(`/api/mobile/promoter/events/${id}/headliner`,{},sessionToken),
      ]);
      const e=eventData.event;setEvent(e);setCategories(categoryData.categories||[]);setTitle(e.title);setDescription(e.description||'');setAgeRestriction(e.ageRestriction||'all');setCategoryId(e.category.id);setEventDate(datePart(e.date));setStartTime(timePart(e.date));setDoorsTime(timePart(e.doorsOpenAt));setEndTime(timePart(e.endDate));setVenue(e.venue);setLocation(e.location);setRefundPolicy(e.refundPolicy||'NO_POLICY');setImage(e.image||'');setHeadlinerName(headlinerData.headlinerName||'');setHeadlinerImageUrl(headlinerData.headlinerImageUrl||'');setTickets(e.ticketTypes.map(t=>({id:t.id,key:t.id,name:t.name,description:t.description||'',price:String(t.price),quantity:String(t.quantity),sold:t.sold,maxPerOrder:String(t.maxPerOrder),isActive:t.isActive})));
    }catch(err){setError(err instanceof Error?err.message:'Unable to load event.');}finally{setLoading(false);}
  },[id,sessionToken,user?.role]);
  useEffect(()=>{void load();},[load]);

  function updateTicket(key:string,field:keyof TicketDraft,value:string|boolean){setTickets(current=>current.map(ticket=>ticket.key===key?{...ticket,[field]:value}:ticket));}
  function removeTicket(key:string){const target=tickets.find(t=>t.key===key);if(target&&target.sold>0){setError('A ticket with sales cannot be removed.');return;}setTickets(current=>current.length===1?current:current.filter(t=>t.key!==key));}

  async function chooseImage(){if(!sessionToken||!id)return;try{setUploading(true);setError('');const uploaded=await pickAndUploadEventImage(sessionToken);if(!uploaded)return;await apiRequest(`/api/mobile/promoter/events/${id}`,{method:'PATCH',body:JSON.stringify({image:uploaded.url})},sessionToken);setImage(uploaded.url);}catch(err){setError(err instanceof Error?err.message:'Unable to update image.');}finally{setUploading(false);}}

  async function chooseHeadlinerImage(){if(!sessionToken)return;try{setUploadingHeadliner(true);setError('');setHeadlinerMessage('');const uploaded=await pickAndUploadHeadlinerImage(sessionToken);if(uploaded){setHeadlinerImageUrl(uploaded.url);setHeadlinerMessage('Picture uploaded. Tap Save headliner changes to publish it.');}}catch(err){setError(err instanceof Error?err.message:'Unable to upload headliner image.');}finally{setUploadingHeadliner(false);}}

  async function saveHeadliner(){if(!sessionToken||!id)return;try{setSavingHeadliner(true);setError('');setHeadlinerMessage('');const data=await apiRequest<{success:true;message:string;headlinerName:string;headlinerImageUrl:string}>(`/api/mobile/promoter/events/${id}/headliner`,{method:'PATCH',body:JSON.stringify({headlinerName,headlinerImageUrl:headlinerImageUrl||null})},sessionToken);setHeadlinerName(data.headlinerName||'');setHeadlinerImageUrl(data.headlinerImageUrl||'');setHeadlinerMessage(data.message||'Headliner updated.');}catch(err){setError(err instanceof Error?err.message:'Unable to update headliner.');}finally{setSavingHeadliner(false);}}

  async function save(){
    if(!sessionToken||!id)return;if(!title.trim()||!eventDate||!startTime||!venue.trim()||!location.trim()||!categoryId){setError('Complete all required event fields.');return;}if(tickets.some(t=>!t.name.trim()||t.price===''||t.quantity==='')){setError('Every ticket needs a name, price and quantity.');return;}
    try{setSaving(true);setError('');const date=toIso(eventDate,startTime);const endDate=endTime?toIso(eventDate,endTime):null;const doorsOpenAt=doorsTime?toIso(eventDate,doorsTime):null;await apiRequest(`/api/mobile/promoter/events/${id}`,{method:'POST',body:JSON.stringify({title,description,ageRestriction,date,endDate,doorsOpenAt,venue,location,categoryId,refundPolicy,ticketTypes:tickets.map(t=>({id:t.id,name:t.name,description:t.description,price:Number(t.price),quantity:Number(t.quantity),maxPerOrder:Number(t.maxPerOrder),isActive:t.isActive}))})},sessionToken);router.replace({pathname:'/promoter/event/[id]',params:{id}});
    }catch(err){setError(err instanceof Error?err.message:'Unable to submit event changes.');}finally{setSaving(false);}
  }

  if(loading)return <View style={styles.screen}><SafeAreaView style={styles.center}><ActivityIndicator size="large" color="#7c3aed"/></SafeAreaView></View>;
  if(!event)return <View style={styles.screen}><SafeAreaView style={styles.center}><Text style={styles.title}>Event unavailable</Text><Text style={styles.error}>{error}</Text></SafeAreaView></View>;

  return <View style={styles.screen}><SafeAreaView edges={['top']} style={styles.safe}><KeyboardAvoidingView style={styles.safe} behavior={Platform.OS==='ios'?'padding':undefined}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <View style={styles.top}><Pressable style={styles.backButton} onPress={()=>router.back()}><Text style={styles.back}>‹</Text></Pressable><Text style={styles.topTitle}>Edit Event</Text><View style={{width:40}}/></View>
    <Text style={styles.eyebrow}>PROMOTER PORTAL</Text><Text style={styles.title}>Edit {event.title}</Text><Text style={styles.copy}>Headliner and cover photo changes can be updated directly. Other event and ticket changes are sent to admin for approval.</Text>
    {event.pendingEdit&&<View style={styles.warning}><Text style={styles.warningTitle}>Edit already pending</Text><Text style={styles.warningText}>You can still update the headliner or cover image while the main event edit is waiting for admin.</Text></View>}

    <Section title="Headliner">
      <Text style={styles.instantBadge}>NO APPROVAL REQUIRED</Text>
      <Field label="Headliner name" value={headlinerName} onChangeText={(v)=>{setHeadlinerName(v);setHeadlinerMessage('');}} placeholder="e.g. Burna Boy" maxLength={160}/>
      <View style={styles.headlinerRow}>{headlinerImageUrl?<Image source={{uri:headlinerImageUrl}} style={styles.headlinerImage} contentFit="cover"/>:<View style={styles.headlinerFallback}><Text style={styles.headlinerFallbackText}>{headlinerName.trim().charAt(0).toUpperCase()||'H'}</Text></View>}<View style={styles.headlinerActions}><Pressable disabled={uploadingHeadliner||savingHeadliner} style={styles.imageButton} onPress={()=>void chooseHeadlinerImage()}>{uploadingHeadliner?<ActivityIndicator color="#7c3aed"/>:<Text style={styles.imageButtonText}>{headlinerImageUrl?'Replace headliner photo':'Choose headliner photo'}</Text>}</Pressable>{!!headlinerImageUrl&&<Pressable disabled={savingHeadliner} onPress={()=>{setHeadlinerImageUrl('');setHeadlinerMessage('Photo removed. Save headliner changes to publish.');}}><Text style={styles.remove}>Remove photo</Text></Pressable>}</View></View>
      {!!headlinerMessage&&<Text style={styles.success}>{headlinerMessage}</Text>}
      <Pressable disabled={savingHeadliner||uploadingHeadliner} style={[styles.secondaryPrimary,(savingHeadliner||uploadingHeadliner)&&styles.disabled]} onPress={()=>void saveHeadliner()}>{savingHeadliner?<ActivityIndicator color="#fff"/>:<Text style={styles.primaryText}>Save headliner changes</Text>}</Pressable>
    </Section>

    <Section title="Cover image">{!!image&&<Image source={{uri:image}} style={styles.cover} contentFit="cover"/>}<Pressable disabled={uploading} style={styles.imageButton} onPress={()=>void chooseImage()}>{uploading?<ActivityIndicator color="#7c3aed"/>:<Text style={styles.imageButtonText}>{image?'Replace cover photo':'Choose cover photo from phone'}</Text>}</Pressable></Section>
    <Section title="Event details"><Field label="Event title *" value={title} onChangeText={setTitle}/><Field label="Description" value={description} onChangeText={setDescription} multiline/><Field label="Age restriction" value={ageRestriction} onChangeText={setAgeRestriction}/></Section>
    <Section title="Category"><View style={styles.chips}>{categories.map(c=><Pressable key={c.id} onPress={()=>setCategoryId(c.id)} style={[styles.chip,categoryId===c.id&&styles.chipSelected]}><Text style={[styles.chipText,categoryId===c.id&&styles.chipTextSelected]}>{c.name}</Text></Pressable>)}</View></Section>
    <Section title="Date & time"><Field label="Event date *" value={eventDate} onChangeText={setEventDate} placeholder="YYYY-MM-DD"/><View style={styles.two}><View style={styles.flex}><Field label="Start *" value={startTime} onChangeText={setStartTime} placeholder="19:30"/></View><View style={styles.flex}><Field label="Doors" value={doorsTime} onChangeText={setDoorsTime} placeholder="18:30"/></View></View><Field label="End" value={endTime} onChangeText={setEndTime} placeholder="23:30"/></Section>
    <Section title="Venue & location"><Field label="Venue *" value={venue} onChangeText={setVenue}/><Field label="Full location *" value={location} onChangeText={setLocation} multiline/></Section>
    <Section title="Refund policy"><View style={styles.chips}>{[['NO_POLICY','Refunds until event'],['NO_REFUNDS','No refunds'],['24_HOURS','24h cutoff'],['48_HOURS','48h cutoff'],['72_HOURS','72h cutoff']].map(([v,l])=><Pressable key={v} onPress={()=>setRefundPolicy(v)} style={[styles.chip,refundPolicy===v&&styles.chipSelected]}><Text style={[styles.chipText,refundPolicy===v&&styles.chipTextSelected]}>{l}</Text></Pressable>)}</View></Section>

    <View style={styles.sectionHead}><Text style={styles.sectionTitle}>Ticket types</Text><Pressable onPress={()=>setTickets(c=>[...c,newTicket()])}><Text style={styles.add}>＋ Add ticket</Text></Pressable></View>
    {tickets.map((ticket,index)=><View key={ticket.key} style={styles.ticketCard}><View style={styles.ticketHead}><Text style={styles.ticketTitle}>Ticket {index+1}{ticket.sold>0?` · ${ticket.sold} sold`:''}</Text>{tickets.length>1&&<Pressable onPress={()=>removeTicket(ticket.key)}><Text style={styles.remove}>Remove</Text></Pressable>}</View><Field label="Name *" value={ticket.name} onChangeText={v=>updateTicket(ticket.key,'name',v)}/><Field label="Description" value={ticket.description} onChangeText={v=>updateTicket(ticket.key,'description',v)}/><View style={styles.two}><View style={styles.flex}><Field label="Price (£) *" value={ticket.price} onChangeText={v=>updateTicket(ticket.key,'price',v)} keyboardType="decimal-pad"/></View><View style={styles.flex}><Field label={`Quantity * (min ${ticket.sold})`} value={ticket.quantity} onChangeText={v=>updateTicket(ticket.key,'quantity',v)} keyboardType="number-pad"/></View></View><Field label="Max per order" value={ticket.maxPerOrder} onChangeText={v=>updateTicket(ticket.key,'maxPerOrder',v)} keyboardType="number-pad"/><Pressable style={[styles.activeToggle,!ticket.isActive&&styles.inactive]} onPress={()=>updateTicket(ticket.key,'isActive',!ticket.isActive)}><Text style={styles.activeText}>{ticket.isActive?'Active ticket':'Inactive ticket'}</Text></Pressable></View>)}

    {!!error&&<Text style={styles.error}>{error}</Text>}
    <Pressable disabled={saving||event.pendingEdit} style={[styles.primary,(saving||event.pendingEdit)&&styles.disabled]} onPress={()=>void save()}>{saving?<ActivityIndicator color="#fff"/>:<Text style={styles.primaryText}>{event.pendingEdit?'Waiting for admin approval':'Submit changes for approval'}</Text>}</Pressable><Text style={styles.note}>Your current live event remains unchanged until an admin approves the main event edit request.</Text><View style={{height:40}}/>
  </ScrollView></KeyboardAvoidingView></SafeAreaView></View>;
}

function Section({title,children}:{title:string;children:ReactNode}){return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>}
function Field({label,multiline,...props}:{label:string;multiline?:boolean}&ComponentProps<typeof TextInput>){return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput {...props} multiline={multiline} placeholderTextColor="#9ca3af" style={[styles.input,multiline&&styles.textarea]}/></View>}

const styles=StyleSheet.create({
  screen:{flex:1,backgroundColor:'#fff'},safe:{flex:1},center:{flex:1,alignItems:'center',justifyContent:'center',padding:24},content:{paddingHorizontal:18,paddingBottom:45},top:{height:58,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},backButton:{width:40,height:40,borderRadius:20,borderWidth:1,borderColor:'#e5e7eb',backgroundColor:'#f9fafb',alignItems:'center',justifyContent:'center'},back:{fontSize:34,lineHeight:36,color:'#111827',marginTop:-3},topTitle:{fontWeight:'900',color:'#111827'},eyebrow:{color:'#7c3aed',fontSize:11,fontWeight:'900',letterSpacing:1.8,marginTop:12},title:{color:'#111827',fontSize:30,lineHeight:36,fontWeight:'900',marginTop:8},copy:{color:'#6b7280',fontSize:13,lineHeight:20,marginTop:9},warning:{marginTop:18,borderRadius:16,borderWidth:1,borderColor:'#fed7aa',backgroundColor:'#fff7ed',padding:14},warningTitle:{color:'#9a3412',fontWeight:'900'},warningText:{color:'#c2410c',fontSize:12,lineHeight:18,marginTop:4},
  section:{marginTop:24,borderRadius:20,borderWidth:1,borderColor:'#e5e7eb',padding:16},sectionHead:{marginTop:24,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},sectionTitle:{color:'#111827',fontSize:18,fontWeight:'900',marginBottom:8},field:{marginTop:10},label:{color:'#374151',fontSize:12,fontWeight:'800',marginBottom:7},input:{minHeight:50,borderRadius:14,borderWidth:1,borderColor:'#d1d5db',backgroundColor:'#f9fafb',color:'#111827',paddingHorizontal:14,fontSize:15},textarea:{minHeight:95,paddingTop:13,textAlignVertical:'top'},two:{flexDirection:'row',gap:10},flex:{flex:1},
  instantBadge:{alignSelf:'flex-start',fontSize:9,fontWeight:'900',letterSpacing:1,color:'#15803d',backgroundColor:'#ecfdf5',borderWidth:1,borderColor:'#a7f3d0',borderRadius:999,paddingHorizontal:9,paddingVertical:5,marginBottom:5},headlinerRow:{flexDirection:'row',alignItems:'center',gap:14,marginTop:14},headlinerImage:{width:92,height:92,borderRadius:46,backgroundColor:'#f3f4f6'},headlinerFallback:{width:92,height:92,borderRadius:46,backgroundColor:'#f3efff',borderWidth:1,borderColor:'#ddd6fe',alignItems:'center',justifyContent:'center'},headlinerFallbackText:{color:'#7c3aed',fontSize:32,fontWeight:'900'},headlinerActions:{flex:1},success:{color:'#15803d',fontSize:12,lineHeight:18,fontWeight:'700',marginTop:10},secondaryPrimary:{height:50,borderRadius:14,backgroundColor:'#7c3aed',alignItems:'center',justifyContent:'center',marginTop:14},
  chips:{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:5},chip:{borderRadius:999,borderWidth:1,borderColor:'#d1d5db',backgroundColor:'#f9fafb',paddingHorizontal:12,paddingVertical:9},chipSelected:{borderColor:'#7c3aed',backgroundColor:'#f3efff'},chipText:{color:'#4b5563',fontSize:12,fontWeight:'700'},chipTextSelected:{color:'#7c3aed'},cover:{width:'100%',aspectRatio:16/9,borderRadius:16,backgroundColor:'#f3f4f6'},imageButton:{minHeight:48,borderRadius:14,borderWidth:1,borderColor:'#7c3aed',backgroundColor:'#faf8ff',alignItems:'center',justifyContent:'center',marginTop:10,paddingHorizontal:12},imageButtonText:{color:'#7c3aed',fontWeight:'900',textAlign:'center'},
  add:{color:'#7c3aed',fontWeight:'900'},ticketCard:{marginTop:12,borderRadius:20,borderWidth:1,borderColor:'#e5e7eb',padding:16},ticketHead:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},ticketTitle:{color:'#111827',fontWeight:'900'},remove:{color:'#dc2626',fontWeight:'800',fontSize:12,marginTop:8},activeToggle:{height:42,borderRadius:12,backgroundColor:'#ecfdf5',borderWidth:1,borderColor:'#a7f3d0',alignItems:'center',justifyContent:'center',marginTop:12},inactive:{backgroundColor:'#f3f4f6',borderColor:'#d1d5db'},activeText:{color:'#166534',fontWeight:'800'},error:{color:'#dc2626',fontSize:13,lineHeight:19,marginTop:18},primary:{height:54,borderRadius:16,backgroundColor:'#7c3aed',alignItems:'center',justifyContent:'center',marginTop:24},primaryText:{color:'#fff',fontWeight:'900'},disabled:{opacity:.5},note:{color:'#6b7280',fontSize:11,textAlign:'center',lineHeight:17,marginTop:10}
});
