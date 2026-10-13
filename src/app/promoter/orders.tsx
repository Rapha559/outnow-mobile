import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/lib/api';

type OrderItem = { id:string; name:string; quantity:number; unitPrice:number; totalPrice:number };
type Order = {
  id:string; orderNumber:string; customerName:string; customerEmail:string; customerPhone:string|null;
  eventId:string; eventTitle:string; quantity:number; ticketItems:OrderItem[]; subtotal:number; bookingFee:number;
  commission:number; discount:number; total:number; status:string; paymentStatus:string|null; paymentMethod:string|null; createdAt:string;
};

type Response = { success:true; orders:Order[] };

function money(value:number){return `£${value.toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2})}`;}
function dateLabel(value:string){const d=new Date(value);return Number.isNaN(d.getTime())?value:new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(d);}

export default function PromoterOrdersScreen(){
  const params=useLocalSearchParams<{eventId?:string}>();
  const eventId=Array.isArray(params.eventId)?params.eventId[0]:params.eventId;
  const {user,sessionToken}=useAuth();
  const [orders,setOrders]=useState<Order[]>([]);const [loading,setLoading]=useState(true);const [refreshing,setRefreshing]=useState(false);const [error,setError]=useState('');

  const load=useCallback(async(refresh=false)=>{
    if(!sessionToken||user?.role!=='PROMOTER')return;
    try{refresh?setRefreshing(true):setLoading(true);setError('');const query=eventId?`?eventId=${encodeURIComponent(eventId)}`:'';const data=await apiRequest<Response>(`/api/mobile/promoter/orders${query}`,{},sessionToken);setOrders(data.orders||[]);}catch(err){setError(err instanceof Error?err.message:'Unable to load orders.');}finally{setLoading(false);setRefreshing(false);}
  },[eventId,sessionToken,user?.role]);
  useEffect(()=>{void load();},[load]);

  const paidTotal=useMemo(()=>orders.filter(o=>o.status==='PAID').reduce((sum,o)=>sum+o.total,0),[orders]);

  return <View style={styles.screen}><SafeAreaView edges={['top']} style={styles.safe}>
    <View style={styles.top}><Pressable style={styles.circle} onPress={()=>router.back()}><Text style={styles.back}>‹</Text></Pressable><Text style={styles.topTitle}>Orders</Text><Pressable style={styles.circle} onPress={()=>void load()}><Text style={styles.refresh}>↻</Text></Pressable></View>
    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>void load(true)} colors={['#7c3aed']} tintColor="#7c3aed"/>}>
      <Text style={styles.eyebrow}>PROMOTER PORTAL</Text><Text style={styles.title}>{eventId?'Event orders':'All orders'}</Text><Text style={styles.copy}>Customer purchases, payment state and ticket quantities.</Text>
      <View style={styles.summary}><Summary label="Orders" value={String(orders.length)}/><Summary label="Paid total" value={money(paidTotal)}/></View>
      {loading?<View style={styles.state}><ActivityIndicator size="large" color="#7c3aed"/></View>:error?<View style={styles.state}><Text style={styles.error}>{error}</Text></View>:orders.length===0?<View style={styles.state}><Text style={styles.emptyTitle}>No orders yet</Text><Text style={styles.copy}>Orders will appear here after customers complete checkout.</Text></View>:<View style={styles.list}>{orders.map(order=><View key={order.id} style={styles.card}>
        <View style={styles.row}><View style={{flex:1}}><Text style={styles.orderNo}>{order.orderNumber}</Text><Text style={styles.customer}>{order.customerName}</Text></View><Text style={styles.amount}>{money(order.total)}</Text></View>
        <Text style={styles.meta}>{order.eventTitle}</Text><Text style={styles.meta}>{order.customerEmail}</Text><Text style={styles.meta}>{dateLabel(order.createdAt)}</Text>
        <View style={styles.items}>{order.ticketItems.map(item=><View key={item.id} style={styles.itemRow}><Text style={styles.item}>{item.quantity}× {item.name}</Text><Text style={styles.item}>{money(item.totalPrice)}</Text></View>)}</View>
        <View style={styles.footer}><Text style={[styles.pill,order.status==='PAID'&&styles.paid]}>{order.status.replace(/_/g,' ')}</Text><Text style={styles.qty}>{order.quantity} ticket{order.quantity===1?'':'s'}</Text></View>
      </View>)}</View>}
      <View style={{height:40}}/>
    </ScrollView>
  </SafeAreaView></View>;
}
function Summary({label,value}:{label:string;value:string}){return <View style={styles.summaryCard}><Text style={styles.summaryLabel}>{label}</Text><Text style={styles.summaryValue}>{value}</Text></View>}
const styles=StyleSheet.create({screen:{flex:1,backgroundColor:'#fff'},safe:{flex:1},top:{height:58,paddingHorizontal:18,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},circle:{width:40,height:40,borderRadius:20,borderWidth:1,borderColor:'#e5e7eb',backgroundColor:'#f9fafb',alignItems:'center',justifyContent:'center'},back:{fontSize:34,lineHeight:36,color:'#111827',marginTop:-3},refresh:{fontSize:20,color:'#7c3aed',fontWeight:'900'},topTitle:{color:'#111827',fontWeight:'900'},content:{paddingHorizontal:18},eyebrow:{color:'#7c3aed',fontSize:11,fontWeight:'900',letterSpacing:1.8,marginTop:10},title:{color:'#111827',fontSize:32,fontWeight:'900',marginTop:8},copy:{color:'#6b7280',fontSize:13,lineHeight:20,marginTop:7},summary:{flexDirection:'row',gap:10,marginTop:20},summaryCard:{flex:1,borderRadius:17,borderWidth:1,borderColor:'#e5e7eb',padding:15,minHeight:88,justifyContent:'space-between'},summaryLabel:{color:'#6b7280',fontSize:11,fontWeight:'700'},summaryValue:{color:'#111827',fontSize:20,fontWeight:'900'},state:{minHeight:220,marginTop:20,borderRadius:18,borderWidth:1,borderColor:'#e5e7eb',backgroundColor:'#fafafa',alignItems:'center',justifyContent:'center',padding:24},emptyTitle:{color:'#111827',fontSize:18,fontWeight:'900'},error:{color:'#dc2626',textAlign:'center'},list:{gap:12,marginTop:20},card:{borderRadius:18,borderWidth:1,borderColor:'#e5e7eb',padding:16},row:{flexDirection:'row',alignItems:'flex-start',justifyContent:'space-between',gap:12},orderNo:{color:'#7c3aed',fontSize:10,fontWeight:'900',letterSpacing:.8},customer:{color:'#111827',fontSize:17,fontWeight:'900',marginTop:5},amount:{color:'#111827',fontSize:17,fontWeight:'900'},meta:{color:'#6b7280',fontSize:12,marginTop:5},items:{marginTop:12,paddingTop:10,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:'#e5e7eb',gap:6},itemRow:{flexDirection:'row',justifyContent:'space-between',gap:10},item:{color:'#374151',fontSize:12,fontWeight:'700'},footer:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginTop:13},pill:{overflow:'hidden',borderRadius:999,backgroundColor:'#f3f4f6',color:'#4b5563',fontSize:9,fontWeight:'900',paddingHorizontal:10,paddingVertical:7},paid:{backgroundColor:'#ecfdf5',color:'#166534'},qty:{color:'#6b7280',fontSize:11,fontWeight:'700'}});
