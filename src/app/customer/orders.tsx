import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/auth-context';
import { API_BASE, apiRequest } from '@/lib/api';

type RefundLifecycle={key:string;label:string};
type Refund={
  id:string; amount:number; reason:string|null; status:string; createdAt:string; updatedAt:string;
  lifecycle:RefundLifecycle; failureReason:string|null; transactionId:string|null; processedAt:string|null; canCancel:boolean;
};
type Order={
  id:string;orderNumber:string;status:string;createdAt:string;customerName:string;customerEmail:string;
  subtotal:number;discount:number;bookingFee:number;total:number;paymentStatus:string|null;paymentMethod:string|null;
  event:{id:string;title:string;date:string;endDate:string|null;venue:string;location:string;image:string|null;status:string};
  items:Array<{id:string;ticketTypeId:string;name:string;quantity:number;unitPrice:number;totalPrice:number}>;
  ticketCount:number;refunds:Refund[];
  refund:{canRequest:boolean;remainingRefundable:number;policyLabel:string;message:string};
};
type Response={success:true;orders:Order[]};

function money(value:number){return `£${value.toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2})}`;}
function imageUrl(value:string|null){if(!value)return `${API_BASE}/images/event-placeholder.jpg`;return /^https?:\/\//i.test(value)?value:`${API_BASE}${value.startsWith('/')?value:`/${value}`}`;}
function dateLabel(value:string){const d=new Date(value);return Number.isNaN(d.getTime())?value:new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(d);}
function refundTone(key:string){if(key==='REFUNDED')return styles.refundDone;if(key==='DECLINED'||key==='FAILED'||key==='CANCELLED')return styles.refundBad;if(key==='PROCESSING')return styles.refundProcessing;return styles.refundPending;}

export default function CustomerOrdersScreen(){
  const {isAuthenticated,sessionToken}=useAuth();
  const [orders,setOrders]=useState<Order[]>([]);
  const [loading,setLoading]=useState(true);
  const [refreshing,setRefreshing]=useState(false);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const [query,setQuery]=useState('');
  const [filter,setFilter]=useState('ALL');
  const [refundOrderId,setRefundOrderId]=useState<string|null>(null);
  const [refundAmount,setRefundAmount]=useState('');
  const [refundReason,setRefundReason]=useState('');
  const [submitting,setSubmitting]=useState(false);

  const load=useCallback(async(refresh=false)=>{
    if(!sessionToken){setLoading(false);return;}
    try{
      refresh?setRefreshing(true):setLoading(true);
      setError('');
      const data=await apiRequest<Response>('/api/mobile/orders',{},sessionToken);
      setOrders(data.orders||[]);
    }catch(err){setError(err instanceof Error?err.message:'Unable to load your orders.');}
    finally{setLoading(false);setRefreshing(false);}
  },[sessionToken]);

  useFocusEffect(useCallback(()=>{void load();return()=>{};},[load]));

  const filtered=useMemo(()=>{
    const q=query.trim().toLowerCase();
    return orders.filter(order=>{
      const statusOk=filter==='ALL'||order.status===filter;
      const text=[order.orderNumber,order.event.title,order.event.venue,...order.items.map(i=>i.name)].join(' ').toLowerCase();
      return statusOk&&(!q||text.includes(q));
    });
  },[orders,query,filter]);

  const paidSpend=useMemo(()=>orders.filter(o=>['PAID','PARTIALLY_REFUNDED','REFUNDED'].includes(o.status)).reduce((s,o)=>s+o.total,0),[orders]);

  function openRefund(order:Order){
    setMessage('');setError('');setRefundOrderId(order.id);setRefundAmount(order.refund.remainingRefundable.toFixed(2));setRefundReason('');
  }

  async function submitRefund(order:Order){
    if(!sessionToken)return;
    const amount=Number(refundAmount);
    if(!Number.isFinite(amount)||amount<=0){setError('Enter a valid refund amount.');return;}
    if(amount>order.refund.remainingRefundable){setError(`Maximum refundable amount is ${money(order.refund.remainingRefundable)}.`);return;}
    try{
      setSubmitting(true);setError('');setMessage('');
      await apiRequest('/api/mobile/refunds',{method:'POST',body:JSON.stringify({orderId:order.id,amount,reason:refundReason})},sessionToken);
      setRefundOrderId(null);setRefundAmount('');setRefundReason('');
      setMessage('Refund request submitted. You can track every update below.');
      await load(true);
    }catch(err){setError(err instanceof Error?err.message:'Unable to request refund.');}
    finally{setSubmitting(false);}
  }

  async function cancelRefund(refund:Refund){
    if(!sessionToken)return;
    try{
      setSubmitting(true);setError('');setMessage('');
      await apiRequest('/api/mobile/refunds',{method:'DELETE',body:JSON.stringify({refundId:refund.id})},sessionToken);
      setMessage('Refund request cancelled.');
      await load(true);
    }catch(err){setError(err instanceof Error?err.message:'Unable to cancel refund.');}
    finally{setSubmitting(false);}
  }

  if(!isAuthenticated)return <View style={styles.screen}><SafeAreaView style={styles.center}><Text style={styles.title}>Your orders</Text><Text style={styles.copy}>Sign in to view your OutNow order history.</Text><Pressable style={styles.primary} onPress={()=>router.replace('/login')}><Text style={styles.primaryText}>Sign in</Text></Pressable></SafeAreaView></View>;

  return <View style={styles.screen}><SafeAreaView edges={['top']} style={styles.safe}>
    <View style={styles.top}><Pressable style={styles.circle} onPress={()=>router.back()}><Text style={styles.back}>‹</Text></Pressable><Text style={styles.topTitle}>Orders & refunds</Text><Pressable style={styles.circle} onPress={()=>void load(true)}><Text style={styles.refresh}>↻</Text></Pressable></View>
    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>void load(true)} colors={['#7c3aed']} tintColor="#7c3aed"/>}>
      <Text style={styles.eyebrow}>YOUR OUTNOW</Text><Text style={styles.title}>Orders & refunds</Text><Text style={styles.copy}>Track purchases, request eligible refunds and follow progress from review to completion.</Text>
      <View style={styles.summary}><Metric label="Orders" value={String(orders.length)}/><Metric label="Total purchased" value={money(paidSpend)}/></View>
      {!!message&&<View style={styles.successBox}><Text style={styles.successText}>{message}</Text></View>}
      {!!error&&<View style={styles.errorBox}><Text style={styles.error}>{error}</Text></View>}
      <TextInput value={query} onChangeText={setQuery} placeholder="Search orders or events" placeholderTextColor="#9ca3af" style={styles.search}/>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>{['ALL','PAID','PARTIALLY_REFUNDED','REFUNDED','CANCELLED'].map(item=><Pressable key={item} onPress={()=>setFilter(item)} style={[styles.filter,filter===item&&styles.filterActive]}><Text style={[styles.filterText,filter===item&&styles.filterTextActive]}>{item==='ALL'?'All':item.replace(/_/g,' ')}</Text></Pressable>)}</ScrollView>

      {loading?<View style={styles.state}><ActivityIndicator size="large" color="#7c3aed"/></View>:filtered.length===0?<View style={styles.state}><Text style={styles.emptyTitle}>{orders.length?'No matching orders':'No orders yet'}</Text><Text style={styles.copy}>{orders.length?'Try another search or filter.':'Your completed purchases will appear here.'}</Text></View>:<View style={styles.list}>
        {filtered.map(order=><View key={order.id} style={styles.card}>
          <Image source={{uri:imageUrl(order.event.image)}} style={styles.image} contentFit="cover"/>
          <View style={styles.body}>
            <View style={styles.row}><View style={{flex:1}}><Text style={styles.orderNo}>{order.orderNumber}</Text><Text style={styles.eventTitle}>{order.event.title}</Text></View><Text style={styles.amount}>{money(order.total)}</Text></View>
            <Text style={styles.meta}>{dateLabel(order.createdAt)} · {order.ticketCount} ticket{order.ticketCount===1?'':'s'}</Text><Text style={styles.meta}>{order.event.venue}</Text>
            <View style={styles.items}>{order.items.map(item=><View key={item.id} style={styles.itemRow}><Text style={styles.item}>{item.quantity}× {item.name}</Text><Text style={styles.item}>{money(item.totalPrice)}</Text></View>)}</View>
            <View style={styles.footer}><View style={[styles.pill,['PAID','PARTIALLY_REFUNDED'].includes(order.status)&&styles.paid]}><Text style={[styles.pillText,['PAID','PARTIALLY_REFUNDED'].includes(order.status)&&styles.paidText]}>{order.status.replace(/_/g,' ')}</Text></View><Text style={styles.policy}>{order.refund.policyLabel}</Text></View>

            {order.refunds.length>0&&<View style={styles.refundSection}>
              <Text style={styles.refundHeading}>Refund timeline</Text>
              {order.refunds.map(refund=><View key={refund.id} style={styles.refundCard}>
                <View style={styles.refundTop}><View style={[styles.refundDot,refundTone(refund.lifecycle.key)]}/><View style={{flex:1}}><Text style={styles.refundTitle}>{refund.lifecycle.label}</Text><Text style={styles.refundMeta}>{money(refund.amount)} · Requested {dateLabel(refund.createdAt)}</Text></View></View>
                {!!refund.reason&&<Text style={styles.refundReason}>Reason: {refund.reason}</Text>}
                {!!refund.failureReason&&<Text style={styles.failure}>{refund.failureReason}</Text>}
                {refund.processedAt&&<Text style={styles.refundMeta}>Updated {dateLabel(refund.processedAt)}</Text>}
                {refund.canCancel&&<Pressable disabled={submitting} style={styles.cancelButton} onPress={()=>void cancelRefund(refund)}><Text style={styles.cancelText}>Cancel request</Text></Pressable>}
              </View>)}
            </View>}

            {order.refund.canRequest&&refundOrderId!==order.id&&<Pressable style={styles.refundButton} onPress={()=>openRefund(order)}><Text style={styles.refundButtonText}>Request refund · up to {money(order.refund.remainingRefundable)}</Text></Pressable>}
            {!order.refund.canRequest&&order.refunds.length===0&&<Text style={styles.refundUnavailable}>{order.refund.message}</Text>}

            {refundOrderId===order.id&&<View style={styles.refundForm}>
              <Text style={styles.refundHeading}>Request a refund</Text><Text style={styles.formHelp}>{order.refund.message}</Text>
              <Text style={styles.label}>Amount</Text><TextInput value={refundAmount} onChangeText={setRefundAmount} keyboardType="decimal-pad" style={styles.input} placeholder="0.00"/>
              <Text style={styles.label}>Reason</Text><TextInput value={refundReason} onChangeText={setRefundReason} style={[styles.input,styles.textarea]} multiline placeholder="Tell us why you are requesting a refund"/>
              <View style={styles.formActions}><Pressable disabled={submitting} style={styles.formSecondary} onPress={()=>setRefundOrderId(null)}><Text style={styles.formSecondaryText}>Cancel</Text></Pressable><Pressable disabled={submitting} style={styles.formPrimary} onPress={()=>void submitRefund(order)}>{submitting?<ActivityIndicator color="#fff"/>:<Text style={styles.primaryText}>Submit request</Text>}</Pressable></View>
            </View>}

            <View style={styles.actions}><Pressable style={styles.secondary} onPress={()=>router.push('/(tabs)/tickets')}><Text style={styles.secondaryText}>View tickets</Text></Pressable><Pressable style={styles.secondary} onPress={()=>router.push(`/event/${order.event.id}`)}><Text style={styles.secondaryText}>Event details</Text></Pressable></View>
          </View>
        </View>)}
      </View>}
      <View style={{height:50}}/>
    </ScrollView>
  </SafeAreaView></View>;
}

function Metric({label,value}:{label:string;value:string}){return <View style={styles.metric}><Text style={styles.metricLabel}>{label}</Text><Text style={styles.metricValue}>{value}</Text></View>}

const styles=StyleSheet.create({
  screen:{flex:1,backgroundColor:'#fff'},safe:{flex:1},center:{flex:1,alignItems:'center',justifyContent:'center',padding:28},top:{height:58,paddingHorizontal:18,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},circle:{width:40,height:40,borderRadius:20,borderWidth:1,borderColor:'#e5e7eb',backgroundColor:'#f9fafb',alignItems:'center',justifyContent:'center'},back:{fontSize:34,lineHeight:36,color:'#111827',marginTop:-3},refresh:{fontSize:20,color:'#7c3aed',fontWeight:'900'},topTitle:{color:'#111827',fontWeight:'900'},content:{paddingHorizontal:18},eyebrow:{color:'#7c3aed',fontSize:11,fontWeight:'900',letterSpacing:1.8,marginTop:10},title:{color:'#111827',fontSize:32,fontWeight:'900',marginTop:8},copy:{color:'#6b7280',fontSize:13,lineHeight:20,marginTop:7},summary:{flexDirection:'row',gap:10,marginTop:20},metric:{flex:1,minHeight:88,borderRadius:17,borderWidth:1,borderColor:'#e5e7eb',padding:14,justifyContent:'space-between'},metricLabel:{color:'#6b7280',fontSize:11,fontWeight:'700'},metricValue:{color:'#111827',fontSize:20,fontWeight:'900'},successBox:{marginTop:14,borderRadius:14,backgroundColor:'#ecfdf5',padding:12},successText:{color:'#166534',fontWeight:'800',fontSize:12},errorBox:{marginTop:14,borderRadius:14,backgroundColor:'#fef2f2',padding:12},error:{color:'#b91c1c',fontSize:12,fontWeight:'700'},search:{height:50,borderRadius:15,borderWidth:1,borderColor:'#d1d5db',backgroundColor:'#f9fafb',paddingHorizontal:15,color:'#111827',marginTop:18},filters:{gap:8,paddingVertical:12},filter:{borderRadius:999,borderWidth:1,borderColor:'#d1d5db',paddingHorizontal:13,paddingVertical:9,backgroundColor:'#fff'},filterActive:{borderColor:'#7c3aed',backgroundColor:'#f3efff'},filterText:{color:'#6b7280',fontSize:11,fontWeight:'800'},filterTextActive:{color:'#7c3aed'},state:{minHeight:220,borderRadius:18,borderWidth:1,borderColor:'#e5e7eb',backgroundColor:'#fafafa',alignItems:'center',justifyContent:'center',padding:24,marginTop:8},emptyTitle:{color:'#111827',fontSize:18,fontWeight:'900'},primary:{minWidth:180,height:50,borderRadius:15,backgroundColor:'#7c3aed',alignItems:'center',justifyContent:'center',paddingHorizontal:18,marginTop:18},primaryText:{color:'#fff',fontWeight:'900'},list:{gap:14,marginTop:8},card:{borderRadius:20,borderWidth:1,borderColor:'#e5e7eb',overflow:'hidden',backgroundColor:'#fff'},image:{width:'100%',height:120,backgroundColor:'#f3f4f6'},body:{padding:16},row:{flexDirection:'row',gap:12,justifyContent:'space-between'},orderNo:{color:'#7c3aed',fontSize:9,fontWeight:'900',letterSpacing:.8},eventTitle:{color:'#111827',fontSize:18,fontWeight:'900',marginTop:5},amount:{color:'#111827',fontSize:17,fontWeight:'900'},meta:{color:'#6b7280',fontSize:12,marginTop:5},items:{marginTop:12,paddingTop:10,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:'#e5e7eb',gap:6},itemRow:{flexDirection:'row',justifyContent:'space-between',gap:10},item:{color:'#374151',fontSize:12,fontWeight:'700'},footer:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginTop:14},pill:{borderRadius:999,backgroundColor:'#f3f4f6',paddingHorizontal:10,paddingVertical:7},paid:{backgroundColor:'#ecfdf5'},pillText:{color:'#4b5563',fontSize:9,fontWeight:'900'},paidText:{color:'#166534'},policy:{color:'#6b7280',fontSize:10,fontWeight:'700'},refundSection:{marginTop:16,paddingTop:14,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:'#e5e7eb'},refundHeading:{color:'#111827',fontSize:14,fontWeight:'900'},refundCard:{marginTop:10,borderRadius:15,backgroundColor:'#fafafa',borderWidth:1,borderColor:'#e5e7eb',padding:12},refundTop:{flexDirection:'row',gap:10,alignItems:'flex-start'},refundDot:{width:10,height:10,borderRadius:5,marginTop:5},refundPending:{backgroundColor:'#f59e0b'},refundProcessing:{backgroundColor:'#7c3aed'},refundDone:{backgroundColor:'#16a34a'},refundBad:{backgroundColor:'#dc2626'},refundTitle:{color:'#111827',fontSize:13,fontWeight:'900'},refundMeta:{color:'#6b7280',fontSize:10,marginTop:3},refundReason:{color:'#374151',fontSize:11,lineHeight:17,marginTop:8},failure:{color:'#b91c1c',fontSize:10,lineHeight:16,marginTop:7},cancelButton:{alignSelf:'flex-start',marginTop:10,borderRadius:10,borderWidth:1,borderColor:'#fecaca',paddingHorizontal:11,paddingVertical:8},cancelText:{color:'#dc2626',fontSize:10,fontWeight:'900'},refundButton:{height:46,borderRadius:13,backgroundColor:'#f5f3ff',borderWidth:1,borderColor:'#ddd6fe',alignItems:'center',justifyContent:'center',marginTop:14},refundButtonText:{color:'#7c3aed',fontSize:11,fontWeight:'900'},refundUnavailable:{color:'#9ca3af',fontSize:10,lineHeight:16,marginTop:12},refundForm:{marginTop:14,borderRadius:16,backgroundColor:'#fafafa',borderWidth:1,borderColor:'#ddd6fe',padding:14},formHelp:{color:'#6b7280',fontSize:10,lineHeight:16,marginTop:5},label:{color:'#374151',fontSize:10,fontWeight:'900',marginTop:12,marginBottom:6},input:{minHeight:46,borderRadius:12,borderWidth:1,borderColor:'#d1d5db',backgroundColor:'#fff',paddingHorizontal:12,color:'#111827'},textarea:{minHeight:90,textAlignVertical:'top',paddingTop:12},formActions:{flexDirection:'row',gap:8,marginTop:12},formSecondary:{flex:1,height:44,borderRadius:12,borderWidth:1,borderColor:'#d1d5db',alignItems:'center',justifyContent:'center'},formSecondaryText:{color:'#374151',fontWeight:'900',fontSize:11},formPrimary:{flex:1,height:44,borderRadius:12,backgroundColor:'#7c3aed',alignItems:'center',justifyContent:'center'},actions:{flexDirection:'row',gap:8,marginTop:14},secondary:{flex:1,height:44,borderRadius:13,borderWidth:1,borderColor:'#d1d5db',alignItems:'center',justifyContent:'center'},secondaryText:{color:'#111827',fontSize:11,fontWeight:'900'}
});
