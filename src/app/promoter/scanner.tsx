import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/lib/api';

type ScanResult={success:boolean;message?:string;error?:string;attendee?:{ticketNumber:string;ticketType:string;eventTitle:string;customerName:string;customerEmail:string}};

export default function PromoterScannerScreen(){
  const params=useLocalSearchParams<{eventId?:string}>();const eventId=Array.isArray(params.eventId)?params.eventId[0]:params.eventId;
  const {sessionToken,user}=useAuth();const [permission,requestPermission]=useCameraPermissions();const [locked,setLocked]=useState(false);const [working,setWorking]=useState(false);const [result,setResult]=useState<ScanResult|null>(null);

  async function handleScan({data}:{data:string}){
    if(locked||working||!eventId||!sessionToken)return;
    setLocked(true);setWorking(true);setResult(null);
    try{const response=await apiRequest<ScanResult>('/api/mobile/promoter/check-in',{method:'POST',body:JSON.stringify({qrCode:data,eventId,action:'check-in'})},sessionToken);setResult(response);}catch(err){setResult({success:false,error:err instanceof Error?err.message:'Unable to check in ticket.'});}finally{setWorking(false);}
  }

  if(user?.role!=='PROMOTER')return <View style={styles.screen}><SafeAreaView style={styles.center}><Text style={styles.title}>Promoter access required</Text></SafeAreaView></View>;
  if(!eventId)return <View style={styles.screen}><SafeAreaView style={styles.center}><Text style={styles.title}>Choose an event first</Text><Text style={styles.copy}>Open an event and tap Scan tickets.</Text><Pressable style={styles.button} onPress={()=>router.replace('/promoter/events')}><Text style={styles.buttonText}>Open events</Text></Pressable></SafeAreaView></View>;
  if(!permission)return <View style={styles.screen}><SafeAreaView style={styles.center}><ActivityIndicator size="large" color="#7c3aed"/></SafeAreaView></View>;
  if(!permission.granted)return <View style={styles.screen}><SafeAreaView style={styles.center}><Text style={styles.title}>Camera access needed</Text><Text style={styles.copy}>Allow camera access so OutNow can scan ticket QR codes at the door.</Text><Pressable style={styles.button} onPress={()=>void requestPermission()}><Text style={styles.buttonText}>Allow camera</Text></Pressable></SafeAreaView></View>;

  return <View style={styles.screen}><SafeAreaView edges={['top']} style={styles.safe}><View style={styles.top}><Pressable style={styles.circle} onPress={()=>router.back()}><Text style={styles.back}>‹</Text></Pressable><Text style={styles.topTitle}>Ticket Scanner</Text><View style={{width:40}}/></View><View style={styles.cameraWrap}><CameraView style={styles.camera} facing="back" barcodeScannerSettings={{barcodeTypes:['qr']}} onBarcodeScanned={locked?undefined:handleScan}/><View pointerEvents="none" style={styles.overlay}><View style={styles.scanBox}/><Text style={styles.hint}>Place the ticket QR code inside the frame</Text></View></View><View style={styles.panel}>
    {working?<View style={styles.result}><ActivityIndicator color="#7c3aed"/><Text style={styles.copy}>Checking ticket…</Text></View>:result?<View style={[styles.result,result.success?styles.good:styles.bad]}><Text style={[styles.resultTitle,result.success?styles.goodText:styles.badText]}>{result.success?'Entry approved':'Ticket not accepted'}</Text><Text style={styles.resultMessage}>{result.message||result.error}</Text>{result.attendee&&<><Text style={styles.person}>{result.attendee.customerName}</Text><Text style={styles.copy}>{result.attendee.ticketType} · {result.attendee.ticketNumber}</Text></>}</View>:<View style={styles.result}><Text style={styles.ready}>Ready to scan</Text><Text style={styles.copy}>Each valid ticket can only be checked in once.</Text></View>}
    {locked&&!working&&<Pressable style={styles.button} onPress={()=>{setResult(null);setLocked(false);}}><Text style={styles.buttonText}>Scan next ticket</Text></Pressable>}
  </View></SafeAreaView></View>;
}
const styles=StyleSheet.create({screen:{flex:1,backgroundColor:'#fff'},safe:{flex:1},top:{height:58,paddingHorizontal:18,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},circle:{width:40,height:40,borderRadius:20,borderWidth:1,borderColor:'#e5e7eb',backgroundColor:'#f9fafb',alignItems:'center',justifyContent:'center'},back:{fontSize:34,lineHeight:36,color:'#111827',marginTop:-3},topTitle:{fontWeight:'900',color:'#111827'},cameraWrap:{flex:1,marginHorizontal:18,borderRadius:24,overflow:'hidden',backgroundColor:'#111827'},camera:{flex:1},overlay:{position:'absolute',top:0,right:0,bottom:0,left:0,alignItems:'center',justifyContent:'center'},scanBox:{width:'72%',aspectRatio:1,borderRadius:24,borderWidth:3,borderColor:'#fff',backgroundColor:'transparent'},hint:{position:'absolute',bottom:26,color:'#fff',fontSize:12,fontWeight:'800',backgroundColor:'rgba(0,0,0,.45)',paddingHorizontal:13,paddingVertical:8,borderRadius:999},panel:{padding:18},result:{minHeight:94,borderRadius:18,borderWidth:1,borderColor:'#e5e7eb',backgroundColor:'#fafafa',alignItems:'center',justifyContent:'center',padding:16},good:{backgroundColor:'#ecfdf5',borderColor:'#a7f3d0'},bad:{backgroundColor:'#fef2f2',borderColor:'#fecaca'},resultTitle:{fontSize:18,fontWeight:'900'},goodText:{color:'#166534'},badText:{color:'#b91c1c'},resultMessage:{color:'#4b5563',fontSize:12,textAlign:'center',marginTop:5},person:{color:'#111827',fontSize:16,fontWeight:'900',marginTop:10},ready:{color:'#111827',fontSize:18,fontWeight:'900'},copy:{color:'#6b7280',fontSize:12,lineHeight:18,textAlign:'center',marginTop:6},button:{height:50,borderRadius:15,backgroundColor:'#7c3aed',alignItems:'center',justifyContent:'center',marginTop:12,paddingHorizontal:20},buttonText:{color:'#fff',fontWeight:'900'},center:{flex:1,alignItems:'center',justifyContent:'center',padding:28},title:{color:'#111827',fontSize:24,fontWeight:'900',textAlign:'center'}});
