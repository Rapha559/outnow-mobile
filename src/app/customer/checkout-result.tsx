import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/lib/api';
import { publishTicketRefresh } from '@/lib/ticket-sync';

type IssuedTicket={id:string;ticketNumber:string;status:string;ticketTypeName:string};
type Order={id:string;orderNumber:string;status:string;paymentStatus:string|null;ticketCount:number;tickets:IssuedTicket[];event:{id?:string;title:string}};
type StatusResponse={success:true;order:Order};
type ResultState='checking'|'paid'|'pending'|'failed'|'not-found';
const FAILURE_STATES=new Set(['FAILED','CANCELLED','EXPIRED','REFUNDED']);

export default function CheckoutResultScreen(){
  const params=useLocalSearchParams<{orderId?:string;orderNumber?:string}>();
  const orderId=Array.isArray(params.orderId)?params.orderId[0]:params.orderId;
  const orderNumber=Array.isArray(params.orderNumber)?params.orderNumber[0]:params.orderNumber;
  const {sessionToken}=useAuth();
  const [state,setState]=useState<ResultState>('checking');
  const [order,setOrder]=useState<Order|null>(null);
  const [error,setError]=useState('');
  const checking=useRef(false);

  async function check(){
    if(checking.current)return;
    if(!sessionToken||!orderId){setState('not-found');return;}
    checking.current=true;setState('checking');setError('');
    try{
      let latest:Order|null=null;
      for(let attempt=0;attempt<8;attempt++){
        try{
          const data=await apiRequest<StatusResponse>(`/api/mobile/checkout/status?orderId=${encodeURIComponent(orderId)}`,{},sessionToken);
          const found=data.order;
          latest=found;setOrder(found);
          const payment=String(found.paymentStatus||'').toUpperCase();
          const status=String(found.status||'').toUpperCase();
          if(status==='PAID'||payment==='SUCCEEDED'){
            if((found.ticketCount||found.tickets?.length||0)>0){
              publishTicketRefresh();
              setState('paid');
              return;
            }
            setState('pending');
          }else if(FAILURE_STATES.has(status)||FAILURE_STATES.has(payment)){
            setState('failed');return;
          }else{
            setState('pending');
          }
        }catch(err){
          const message=err instanceof Error?err.message:'Unable to confirm payment.';
          if(message.toLowerCase().includes('not found')){
            if(attempt===7){setState('not-found');setError(message);return;}
          }else{
            setError(message);
          }
        }
        if(attempt<7)await new Promise(resolve=>setTimeout(resolve,1500));
      }
      setState(latest?'pending':'not-found');
    }finally{checking.current=false;}
  }

  useEffect(()=>{void check();},[orderId,sessionToken]);

  const firstTicket=order?.tickets?.[0]||null;
  const readyCount=order?.ticketCount||order?.tickets?.length||0;

  return <View style={styles.screen}><SafeAreaView style={styles.safe}><View style={styles.card}>
    {state==='checking'?<><ActivityIndicator size="large" color="#7c3aed"/><Text style={styles.title}>Checking payment</Text><Text style={styles.copy}>We’re confirming your Stripe payment and preparing your tickets.</Text></>
    :state==='paid'?<><View style={styles.good}><Text style={styles.goodIcon}>✓</Text></View><Text style={styles.title}>Payment confirmed</Text><Text style={styles.copy}>{order?.event.title?`${readyCount} ${readyCount===1?'ticket is':'tickets are'} ready for ${order.event.title}.`:'Your OutNow tickets are ready.'}</Text><Text style={styles.order}>Order {order?.orderNumber||orderNumber||''}</Text>{firstTicket&&readyCount===1?<Pressable style={styles.primary} onPress={()=>router.replace({pathname:'/ticket/[id]',params:{id:firstTicket.id}})}><Text style={styles.primaryText}>Open my ticket</Text></Pressable>:<Pressable style={styles.primary} onPress={()=>router.replace('/(tabs)/tickets')}><Text style={styles.primaryText}>View my tickets</Text></Pressable>}<Pressable style={styles.secondary} onPress={()=>router.replace('/(tabs)/tickets')}><Text style={styles.secondaryText}>All tickets</Text></Pressable><Pressable style={styles.secondary} onPress={()=>router.replace('/customer/orders')}><Text style={styles.secondaryText}>View order history</Text></Pressable></>
    :state==='failed'?<><View style={styles.bad}><Text style={styles.badIcon}>×</Text></View><Text style={styles.title}>Payment wasn’t completed</Text><Text style={styles.copy}>No ticket has been issued for this checkout. You can return to the event and try again.</Text><Text style={styles.order}>Order {order?.orderNumber||orderNumber||''}</Text>{order?.event.id?<Pressable style={styles.primary} onPress={()=>router.replace(`/event/${order.event.id}`)}><Text style={styles.primaryText}>Return to event</Text></Pressable>:null}<Pressable style={styles.secondary} onPress={()=>router.replace('/customer/orders')}><Text style={styles.secondaryText}>View order history</Text></Pressable></>
    :state==='not-found'?<><View style={styles.pending}><Text style={styles.pendingIcon}>?</Text></View><Text style={styles.title}>Checkout status unavailable</Text><Text style={styles.copy}>{error||'We couldn’t find this checkout yet. Check your orders before trying another payment.'}</Text><Pressable style={styles.primary} onPress={()=>router.replace('/customer/orders')}><Text style={styles.primaryText}>View my orders</Text></Pressable><Pressable style={styles.secondary} onPress={()=>router.replace('/(tabs)/tickets')}><Text style={styles.secondaryText}>Go to my tickets</Text></Pressable></>
    :<><View style={styles.pending}><Text style={styles.pendingIcon}>…</Text></View><Text style={styles.title}>Finalising your tickets</Text><Text style={styles.copy}>{error||'Stripe has reported back, but OutNow is still issuing the ticket records. Don’t start another checkout. This normally takes only a few seconds.'}</Text><Pressable style={styles.primary} onPress={()=>void check()}><Text style={styles.primaryText}>Check again</Text></Pressable><Pressable style={styles.secondary} onPress={()=>router.replace('/(tabs)/tickets')}><Text style={styles.secondaryText}>Check My Tickets</Text></Pressable></>}
  </View></SafeAreaView></View>;
}

const styles=StyleSheet.create({screen:{flex:1,backgroundColor:'#fff'},safe:{flex:1,alignItems:'center',justifyContent:'center',padding:22},card:{width:'100%',maxWidth:430,borderRadius:24,borderWidth:1,borderColor:'#e5e7eb',backgroundColor:'#fff',padding:28,alignItems:'center'},title:{color:'#111827',fontSize:27,fontWeight:'900',textAlign:'center',marginTop:18},copy:{color:'#6b7280',fontSize:14,lineHeight:21,textAlign:'center',marginTop:9},good:{width:70,height:70,borderRadius:35,backgroundColor:'#ecfdf5',alignItems:'center',justifyContent:'center'},goodIcon:{color:'#15803d',fontSize:34,fontWeight:'900'},bad:{width:70,height:70,borderRadius:35,backgroundColor:'#fef2f2',alignItems:'center',justifyContent:'center'},badIcon:{color:'#dc2626',fontSize:40,fontWeight:'700',lineHeight:44},pending:{width:70,height:70,borderRadius:35,backgroundColor:'#f3efff',alignItems:'center',justifyContent:'center'},pendingIcon:{color:'#7c3aed',fontSize:34,fontWeight:'900',marginTop:-4},order:{color:'#7c3aed',fontSize:12,fontWeight:'900',marginTop:14},primary:{width:'100%',minHeight:52,borderRadius:15,backgroundColor:'#7c3aed',alignItems:'center',justifyContent:'center',marginTop:22,paddingHorizontal:14},primaryText:{color:'#fff',fontWeight:'900',textAlign:'center'},secondary:{width:'100%',height:50,borderRadius:15,borderWidth:1,borderColor:'#d1d5db',alignItems:'center',justifyContent:'center',marginTop:10},secondaryText:{color:'#111827',fontWeight:'800'}});
