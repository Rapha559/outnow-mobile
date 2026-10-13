import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/lib/api';

type EventData = {
  id:string; title:string; description:string; ageRestriction:string; date:string; endDate:string|null; doorsOpenAt:string|null;
  venue:string; location:string; image:string|null; status:string; refundPolicy:string; ticketTaxTreatment:string;
  category:{id:string;name:string;slug:string}; pendingEdit:boolean;
  ticketTypes:Array<{id:string;name:string;price:number;quantity:number;sold:number;maxPerOrder:number;isActive:boolean}>;
  stats:{capacity:number;sold:number;revenue:number;paidOrders:number;checkedIn:number};
};

function money(value:number){return `£${value.toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2})}`;}
function dateText(value:string){const date=new Date(value);return Number.isNaN(date.getTime())?value:new Intl.DateTimeFormat('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(date);}

export default function PromoterEventManageScreen(){
  const params=useLocalSearchParams<{id:string}>();
  const id=Array.isArray(params.id)?params.id[0]:params.id;
  const {user,sessionToken}=useAuth();
  const [event,setEvent]=useState<EventData|null>(null);
  const [loading,setLoading]=useState(true);
  const [refreshing,setRefreshing]=useState(false);
  const [error,setError]=useState('');

  const load=useCallback(async(refresh=false)=>{
    if(!id||!sessionToken||user?.role!=='PROMOTER')return;
    try{refresh?setRefreshing(true):setLoading(true);setError('');const data=await apiRequest<{success:true;event:EventData}>(`/api/mobile/promoter/events/${id}`,{},sessionToken);setEvent(data.event);}catch(err){setError(err instanceof Error?err.message:'Unable to load event.');}finally{setLoading(false);setRefreshing(false);}
  },[id,sessionToken,user?.role]);

  useEffect(()=>{void load();},[load]);

  return <View style={styles.screen}><SafeAreaView edges={['top']} style={styles.safe}>
    <View style={styles.top}><Pressable style={styles.circle} onPress={()=>router.back()}><Text style={styles.back}>‹</Text></Pressable><Text style={styles.topTitle}>Manage Event</Text><Pressable style={styles.circle} onPress={()=>void load()}><Text style={styles.refresh}>↻</Text></Pressable></View>
    {loading?<View style={styles.center}><ActivityIndicator size="large" color="#7c3aed"/></View>:error||!event?<View style={styles.center}><Text style={styles.errorTitle}>Event unavailable</Text><Text style={styles.muted}>{error||'This event could not be loaded.'}</Text></View>:
    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>void load(true)} tintColor="#7c3aed"/>}>
      {!!event.image&&<Image source={{uri:event.image}} style={styles.cover} contentFit="cover"/>}
      <View style={styles.statusRow}><View style={styles.statusPill}><Text style={styles.status}>{event.status.replace(/_/g,' ')}</Text></View>{event.pendingEdit&&<View style={styles.pendingPill}><Text style={styles.pending}>EDIT WAITING FOR APPROVAL</Text></View>}</View>
      <Text style={styles.title}>{event.title}</Text><Text style={styles.date}>{dateText(event.date)}</Text><Text style={styles.location}>{event.venue} · {event.location}</Text>

      <View style={styles.grid}><Stat label="Tickets sold" value={`${event.stats.sold}/${event.stats.capacity}`}/><Stat label="Revenue" value={money(event.stats.revenue)}/><Stat label="Paid orders" value={String(event.stats.paidOrders)}/><Stat label="Checked in" value={String(event.stats.checkedIn)}/></View>

      <Pressable disabled={event.pendingEdit} style={[styles.primary,event.pendingEdit&&styles.disabled]} onPress={()=>router.push({pathname:'/promoter/event/[id]/edit',params:{id:event.id}})}><Text style={styles.primaryText}>{event.pendingEdit?'Edit pending admin approval':'Edit event'}</Text></Pressable>

      <View style={styles.section}><Text style={styles.sectionTitle}>Event details</Text><Detail label="Category" value={event.category.name}/><Detail label="Age restriction" value={event.ageRestriction||'All ages'}/><Detail label="Refund policy" value={event.refundPolicy.replace(/_/g,' ')}/><Detail label="VAT treatment" value={event.ticketTaxTreatment.replace(/_/g,' ')}/><Detail label="Description" value={event.description||'No description'}/></View>

      <View style={styles.section}><View style={styles.sectionHead}><Text style={styles.sectionTitle}>Ticket types</Text><Text style={styles.count}>{event.ticketTypes.length}</Text></View>{event.ticketTypes.map(ticket=><View key={ticket.id} style={styles.ticket}><View style={{flex:1}}><Text style={styles.ticketName}>{ticket.name}</Text><Text style={styles.muted}>{ticket.sold}/{ticket.quantity} sold · max {ticket.maxPerOrder}/order</Text></View><Text style={styles.ticketPrice}>{money(ticket.price)}</Text></View>)}</View>

      <View style={styles.section}><Text style={styles.sectionTitle}>Management</Text><Action label="Orders" subtitle="View customer orders and payment status"/><Action label="Attendees" subtitle="View ticket holders and check-ins"/><Action label="Payouts" subtitle="Track this event’s promoter payout"/></View>
      <View style={{height:40}}/>
    </ScrollView>}
  </SafeAreaView></View>;
}

function Stat({label,value}:{label:string;value:string}){return <View style={styles.stat}><Text style={styles.statLabel}>{label}</Text><Text style={styles.statValue}>{value}</Text></View>}
function Detail({label,value}:{label:string;value:string}){return <View style={styles.detail}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View>}
function Action({label,subtitle}:{label:string;subtitle:string}){return <View style={styles.action}><View style={{flex:1}}><Text style={styles.actionTitle}>{label}</Text><Text style={styles.muted}>{subtitle}</Text></View><Text style={styles.chevron}>›</Text></View>}

const styles=StyleSheet.create({screen:{flex:1,backgroundColor:'#fff'},safe:{flex:1},top:{height:58,paddingHorizontal:18,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},circle:{width:40,height:40,borderRadius:20,borderWidth:1,borderColor:'#e5e7eb',backgroundColor:'#f9fafb',alignItems:'center',justifyContent:'center'},back:{fontSize:34,lineHeight:36,color:'#111827',marginTop:-3},refresh:{fontSize:20,color:'#7c3aed',fontWeight:'800'},topTitle:{color:'#111827',fontWeight:'900'},center:{flex:1,alignItems:'center',justifyContent:'center',padding:28,gap:8},content:{paddingHorizontal:18},cover:{width:'100%',aspectRatio:16/9,borderRadius:22,backgroundColor:'#f3f4f6',marginTop:8},statusRow:{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:18},statusPill:{backgroundColor:'#f3efff',borderRadius:999,paddingHorizontal:11,paddingVertical:7},status:{color:'#7c3aed',fontSize:10,fontWeight:'900'},pendingPill:{backgroundColor:'#fff7ed',borderRadius:999,paddingHorizontal:11,paddingVertical:7},pending:{color:'#c2410c',fontSize:9,fontWeight:'900'},title:{fontSize:31,lineHeight:37,fontWeight:'900',color:'#111827',marginTop:12},date:{color:'#7c3aed',fontWeight:'800',marginTop:9},location:{color:'#6b7280',lineHeight:20,marginTop:5},grid:{flexDirection:'row',flexWrap:'wrap',gap:10,marginTop:22},stat:{width:'48.5%',minHeight:90,borderRadius:17,borderWidth:1,borderColor:'#e5e7eb',backgroundColor:'#fff',padding:14,justifyContent:'space-between'},statLabel:{color:'#6b7280',fontSize:11,fontWeight:'700'},statValue:{color:'#111827',fontSize:19,fontWeight:'900'},primary:{height:52,borderRadius:15,backgroundColor:'#7c3aed',alignItems:'center',justifyContent:'center',marginTop:18},primaryText:{color:'#fff',fontWeight:'900'},disabled:{opacity:.5},section:{marginTop:24,borderRadius:20,borderWidth:1,borderColor:'#e5e7eb',padding:16,backgroundColor:'#fff'},sectionHead:{flexDirection:'row',justifyContent:'space-between'},sectionTitle:{fontSize:19,fontWeight:'900',color:'#111827',marginBottom:8},count:{color:'#7c3aed',fontWeight:'900'},detail:{paddingVertical:11,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:'#e5e7eb'},detailLabel:{color:'#6b7280',fontSize:11,fontWeight:'700'},detailValue:{color:'#111827',fontSize:13,fontWeight:'700',marginTop:4,lineHeight:19},ticket:{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:12,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:'#e5e7eb'},ticketName:{color:'#111827',fontWeight:'900',marginBottom:4},ticketPrice:{color:'#111827',fontWeight:'900'},muted:{color:'#6b7280',fontSize:12,lineHeight:18},action:{minHeight:62,flexDirection:'row',alignItems:'center',paddingVertical:9,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:'#e5e7eb'},actionTitle:{color:'#111827',fontWeight:'900',marginBottom:3},chevron:{fontSize:28,color:'#9ca3af'},errorTitle:{color:'#111827',fontSize:20,fontWeight:'900'}});
