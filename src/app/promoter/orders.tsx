import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
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
type Filter = 'ALL'|'PAID'|'PENDING'|'REFUNDED'|'CANCELLED';

function money(value:number){return `£${value.toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2})}`;}
function dateLabel(value:string){const d=new Date(value);return Number.isNaN(d.getTime())?value:new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(d);}

export default function PromoterOrdersScreen(){
  const params=useLocalSearchParams<{eventId?:string}>();
  const eventId=Array.isArray(params.eventId)?params.eventId[0]:params.eventId;
  const {user,sessionToken}=useAuth();
  const [orders,setOrders]=useState<Order[]>([]);const [loading,setLoading]=useState(true);const [refreshing,setRefreshing]=useState(false);const [error,setError]=useState('');
  const [query,setQuery]=useState('');const [filter,setFilter]=useState<Filter>('ALL');

  const load=useCallback(async(refresh=false)=>{
    if(!sessionToken||user?.role!=='PROMOTER')return;
    try{refresh?setRefreshing(true):setLoading(true);setError('');const suffix=eventId?`?eventId=${encodeURIComponent(eventId)}`:'';const data=await apiRequest<Response>(`/api/mobile/promoter/orders${suffix}`,{},sessionToken);setOrders(data.orders||[]);}catch(err){setError(err instanceof Error?err.message:'Unable to load orders.');}finally{setLoading(false);setRefreshing(false);}
  },[eventId,sessionToken,user?.role]);
  useEffect(()=>{void load();},[load]);

  const paidOrders=useMemo(()=>orders.filter(o=>o.status==='PAID'),[orders]);
  const paidTotal=useMemo(()=>paidOrders.reduce((sum,o)=>sum+o.total,0),[paidOrders]);
  const ticketsSold=useMemo(()=>paidOrders.reduce((sum,o)=>sum+o.quantity,0),[paidOrders]);
  const visibleOrders=useMemo(()=>{
    const q=query.trim().toLowerCase();
    return orders.filter(order=>{
      const statusMatch=filter==='ALL'||order.status===filter||order.paymentStatus===filter;
      if(!statusMatch)return false;
      if(!q)return true;
      return [order.orderNumber,order.customerName,order.customerEmail,order.customerPhone||'',order.eventTitle,...order.ticketItems.map(i=>i.name)].join(' ').toLowerCase().includes(q);
    });
  },[orders,query,filter]);

  return <View style={styles.screen}><SafeAreaView edges={['top']} style={styles.safe}>
    <View style={styles.top}><Pressable style={styles.circle} onPress={()=>router.back()}><Text style={styles.back}>‹</Text></Pressable><Text style={styles.topTitle}>Orders</Text><Pressable style={styles.circle} onPress={()=>void load(true)}><Text style={styles.refresh}>↻</Text></Pressable></View>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>void load(true)} colors={['#7c3aed']} tintColor="#7c3aed"/>}>
      <Text style={styles.eyebrow}>PROMOTER PORTAL</Text><Text style={styles.title}>{eventId?'Event orders':'All orders'}</Text><Text style={styles.copy}>Search purchases by customer, order number, event or ticket type.</Text>
      <View style={styles.summary}><Summary label="Orders" value={String(orders.length)}/><Summary label="Paid revenue" value={money(paidTotal)}/><Summary label="Tickets" value={String(ticketsSold)}/></View>

      <View style={styles.searchWrap}><Text style={styles.searchIcon}>⌕</Text><TextInput value={query} onChangeText={setQuery} placeholder="Search orders" placeholderTextColor="#9ca3af" style={styles.searchInput} autoCapitalize="none" autoCorrect={false}/>{query.length>0&&<Pressable onPress={()=>setQuery('')}><Text style={styles.clear}>×</Text></Pressable>}</View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>{(['ALL','PAID','PENDING','REFUNDED','CANCELLED'] as Filter[]).map(item=><Pressable key={item} onPress={()=>setFilter(item)} style={[styles.filter,filter===item&&styles.filterActive]}><Text style={[styles.filterText,filter===item&&styles.filterTextActive]}>{item==='ALL'?'All':item.charAt(0)+item.slice(1).toLowerCase()}</Text></Pressable>)}</ScrollView>

      {loading?<View style={styles.state}><ActivityIndicator size="large" color="#7c3aed"/></View>:error?<View style={styles.state}><Text style={styles.error}>{error}</Text><Pressable style={styles.retry} onPress={()=>void load()}><Text style={styles.retryText}>Try again</Text></Pressable></View>:orders.length===0?<View style={styles.state}><Text style={styles.emptyIcon}>🧾</Text><Text style={styles.emptyTitle}>No orders yet</Text><Text style={styles.emptyCopy}>Customer purchases will appear here after a checkout is completed.</Text><Pressable style={styles.outlineButton} onPress={()=>router.push('/promoter/events')}><Text style={styles.outlineText}>View events</Text></Pressable></View>:visibleOrders.length===0?<View style={styles.state}><Text style={styles.emptyTitle}>No matching orders</Text><Text style={styles.emptyCopy}>Try another search term or change the status filter.</Text><Pressable onPress={()=>{setQuery('');setFilter('ALL');}}><Text style={styles.resetText}>Clear filters</Text></Pressable></View>:<View style={styles.list}>{visibleOrders.map(order=><View key={order.id} style={styles.card}>
        <View style={styles.row}><View style={{flex:1}}><Text style={styles.orderNo}>{order.orderNumber}</Text><Text style={styles.customer}>{order.customerName}</Text></View><Text style={styles.amount}>{money(order.total)}</Text></View>
        <Text style={styles.meta}>{order.eventTitle}</Text><Text style={styles.meta}>{order.customerEmail}{order.customerPhone?` · ${order.customerPhone}`:''}</Text><Text style={styles.meta}>{dateLabel(order.createdAt)}</Text>
        <View style={styles.items}>{order.ticketItems.map(item=><View key={item.id} style={styles.itemRow}><Text style={styles.item}>{item.quantity}× {item.name}</Text><Text style={styles.item}>{money(item.totalPrice)}</Text></View>)}</View>
        <View style={styles.footer}><View style={[styles.pill,order.status==='PAID'&&styles.paid,order.status==='REFUNDED'&&styles.refunded]}><Text style={[styles.pillText,order.status==='PAID'&&styles.paidText,order.status==='REFUNDED'&&styles.refundedText]}>{order.status.replace(/_/g,' ')}</Text></View><Text style={styles.qty}>{order.quantity} ticket{order.quantity===1?'':'s'}</Text></View>
      </View>)}</View>}
      <View style={{height:40}}/>
    </ScrollView>
  </SafeAreaView></View>;
}
function Summary({label,value}:{label:string;value:string}){return <View style={styles.summaryCard}><Text style={styles.summaryLabel}>{label}</Text><Text numberOfLines={1} adjustsFontSizeToFit style={styles.summaryValue}>{value}</Text></View>}
const styles=StyleSheet.create({screen:{flex:1,backgroundColor:'#fff'},safe:{flex:1},top:{height:58,paddingHorizontal:18,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},circle:{width:40,height:40,borderRadius:20,borderWidth:1,borderColor:'#e5e7eb',backgroundColor:'#f9fafb',alignItems:'center',justifyContent:'center'},back:{fontSize:34,lineHeight:36,color:'#111827',marginTop:-3},refresh:{fontSize:20,color:'#7c3aed',fontWeight:'900'},topTitle:{color:'#111827',fontWeight:'900'},content:{paddingHorizontal:18},eyebrow:{color:'#7c3aed',fontSize:11,fontWeight:'900',letterSpacing:1.8,marginTop:10},title:{color:'#111827',fontSize:32,fontWeight:'900',marginTop:8},copy:{color:'#6b7280',fontSize:13,lineHeight:20,marginTop:7},summary:{flexDirection:'row',gap:8,marginTop:20},summaryCard:{flex:1,borderRadius:17,borderWidth:1,borderColor:'#e5e7eb',padding:12,minHeight:84,justifyContent:'space-between'},summaryLabel:{color:'#6b7280',fontSize:10,fontWeight:'700'},summaryValue:{color:'#111827',fontSize:18,fontWeight:'900'},searchWrap:{height:50,borderRadius:15,borderWidth:1,borderColor:'#d1d5db',backgroundColor:'#f9fafb',flexDirection:'row',alignItems:'center',paddingHorizontal:13,marginTop:20},searchIcon:{fontSize:21,color:'#6b7280',marginRight:8},searchInput:{flex:1,color:'#111827',fontSize:14},clear:{fontSize:24,color:'#9ca3af',paddingHorizontal:5},filters:{gap:8,paddingVertical:12},filter:{height:36,borderRadius:18,borderWidth:1,borderColor:'#e5e7eb',backgroundColor:'#fff',paddingHorizontal:14,alignItems:'center',justifyContent:'center'},filterActive:{borderColor:'#7c3aed',backgroundColor:'#f3efff'},filterText:{color:'#6b7280',fontSize:11,fontWeight:'800'},filterTextActive:{color:'#7c3aed'},state:{minHeight:220,marginTop:8,borderRadius:18,borderWidth:1,borderColor:'#e5e7eb',backgroundColor:'#fafafa',alignItems:'center',justifyContent:'center',padding:24},emptyIcon:{fontSize:30,marginBottom:10},emptyTitle:{color:'#111827',fontSize:18,fontWeight:'900',textAlign:'center'},emptyCopy:{color:'#6b7280',fontSize:13,lineHeight:20,textAlign:'center',marginTop:7},error:{color:'#dc2626',textAlign:'center'},retry:{marginTop:14,borderRadius:12,backgroundColor:'#7c3aed',paddingHorizontal:18,paddingVertical:10},retryText:{color:'#fff',fontWeight:'900'},outlineButton:{marginTop:16,borderRadius:12,borderWidth:1,borderColor:'#7c3aed',paddingHorizontal:18,paddingVertical:10},outlineText:{color:'#7c3aed',fontWeight:'900'},resetText:{color:'#7c3aed',fontWeight:'900',marginTop:14},list:{gap:12,marginTop:8},card:{borderRadius:18,borderWidth:1,borderColor:'#e5e7eb',padding:16},row:{flexDirection:'row',alignItems:'flex-start',justifyContent:'space-between',gap:12},orderNo:{color:'#7c3aed',fontSize:10,fontWeight:'900',letterSpacing:.8},customer:{color:'#111827',fontSize:17,fontWeight:'900',marginTop:5},amount:{color:'#111827',fontSize:17,fontWeight:'900'},meta:{color:'#6b7280',fontSize:12,marginTop:5},items:{marginTop:12,paddingTop:10,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:'#e5e7eb',gap:6},itemRow:{flexDirection:'row',justifyContent:'space-between',gap:10},item:{color:'#374151',fontSize:12,fontWeight:'700'},footer:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginTop:13},pill:{borderRadius:999,backgroundColor:'#f3f4f6',paddingHorizontal:10,paddingVertical:7},pillText:{color:'#4b5563',fontSize:9,fontWeight:'900'},paid:{backgroundColor:'#ecfdf5'},paidText:{color:'#166534'},refunded:{backgroundColor:'#fff7ed'},refundedText:{color:'#c2410c'},qty:{color:'#6b7280',fontSize:11,fontWeight:'700'}});
