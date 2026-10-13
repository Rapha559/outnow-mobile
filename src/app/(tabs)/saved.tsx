import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/auth-context';
import { API_BASE, apiRequest } from '@/lib/api';

type EventItem={id:string;title:string;date:string;venue:string;location:string;image?:string|null;category:string;price:number|null;promoterName?:string};
type DiscoveryResponse={success:true;likedEvents:EventItem[];recentEvents:EventItem[];recommended:EventItem[];nearby:EventItem[];preferredLocation:string|null};

function imageUrl(value?:string|null){const clean=String(value||'').trim();if(!clean)return `${API_BASE}/images/event-placeholder.jpg`;const secure=/^http:\/\//i.test(clean)?clean.replace(/^http:\/\//i,'https://'):clean;if(/^https:\/\/res\.cloudinary\.com\//i.test(secure))return `${API_BASE}/api/mobile/media/image?url=${encodeURIComponent(secure)}`;return /^https:\/\//i.test(secure)?secure:`${API_BASE}${secure.startsWith('/')?secure:`/${secure}`}`;}
function dateLabel(value:string){const d=new Date(value);return Number.isNaN(d.getTime())?value:new Intl.DateTimeFormat('en-GB',{weekday:'short',day:'numeric',month:'short'}).format(d);}

export default function SavedScreen(){
  const {sessionToken,user}=useAuth();
  const [data,setData]=useState<DiscoveryResponse|null>(null);
  const [loading,setLoading]=useState(true);
  const [refreshing,setRefreshing]=useState(false);
  const [error,setError]=useState('');

  const load=useCallback(async(refresh=false)=>{
    if(!sessionToken){setLoading(false);return;}
    try{if(refresh)setRefreshing(true);else setLoading(true);setError('');setData(await apiRequest<DiscoveryResponse>('/api/mobile/social/discovery',{},sessionToken));}
    catch(err){setError(err instanceof Error?err.message:'Unable to load your saved events.');}
    finally{setLoading(false);setRefreshing(false);}
  },[sessionToken]);

  useEffect(()=>{void load();},[load]);

  if(!user)return <View style={styles.screen}><SafeAreaView style={styles.center}><Text style={styles.eyebrow}>YOUR OUTNOW</Text><Text style={styles.title}>Save the nights you want</Text><Text style={styles.copy}>Sign in to keep liked events, recently viewed events and personalised recommendations synced to your account.</Text><Pressable style={styles.primary} onPress={()=>router.push('/login')}><Text style={styles.primaryText}>Sign in</Text></Pressable></SafeAreaView></View>;

  return <View style={styles.screen}><SafeAreaView edges={['top']} style={styles.safe}><ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>void load(true)} tintColor="#7c3aed" colors={['#7c3aed']}/>}>
    <Text style={styles.eyebrow}>YOUR OUTNOW</Text><Text style={styles.title}>Saved</Text><Text style={styles.copy}>Liked events, recently viewed events and picks chosen from your activity.</Text>
    {loading?<View style={styles.centerBox}><ActivityIndicator size="large" color="#7c3aed"/></View>:error?<View style={styles.centerBox}><Text style={styles.error}>{error}</Text><Pressable style={styles.secondary} onPress={()=>void load()}><Text style={styles.secondaryText}>Try again</Text></Pressable></View>:<>
      <Section title="Liked events" subtitle="Events you saved" events={data?.likedEvents||[]}/>
      <Section title="Recently viewed" subtitle="Pick up where you left off" events={data?.recentEvents||[]}/>
      <Section title="Recommended for you" subtitle="Based on likes, views, purchases and organisers you follow" events={data?.recommended||[]}/>
      <Section title={data?.preferredLocation?`Popular around ${data.preferredLocation}`:'More to explore'} subtitle="Popular events matched to places you browse" events={data?.nearby||[]}/>
    </>}
    <View style={{height:110}}/>
  </ScrollView></SafeAreaView></View>;
}

function Section({title,subtitle,events}:{title:string;subtitle:string;events:EventItem[]}){
  return <View style={styles.section}><View style={styles.sectionHead}><View style={{flex:1}}><Text style={styles.sectionTitle}>{title}</Text><Text style={styles.sectionSub}>{subtitle}</Text></View><Text style={styles.count}>{events.length}</Text></View>{events.length===0?<View style={styles.empty}><Text style={styles.emptyText}>Nothing here yet.</Text></View>:<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>{events.map(event=><Pressable key={event.id} style={styles.card} onPress={()=>router.push(`/event/${event.id}`)}><Image source={{uri:imageUrl(event.image)}} style={styles.image} resizeMode="cover"/><View style={styles.cardBody}><Text style={styles.date}>{dateLabel(event.date)}</Text><Text style={styles.cardTitle} numberOfLines={2}>{event.title}</Text><Text style={styles.meta} numberOfLines={1}>{event.venue||event.location}</Text>{event.price!==null&&<Text style={styles.price}>From £{Number(event.price).toFixed(2)}</Text>}</View></Pressable>)}</ScrollView>}</View>;
}

const styles=StyleSheet.create({screen:{flex:1,backgroundColor:'#fff'},safe:{flex:1},content:{paddingHorizontal:18,paddingTop:18},eyebrow:{color:'#7c3aed',fontSize:11,fontWeight:'900',letterSpacing:1.8},title:{color:'#111827',fontSize:34,fontWeight:'900',marginTop:8},copy:{color:'#6b7280',fontSize:14,lineHeight:21,marginTop:8},section:{marginTop:28},sectionHead:{flexDirection:'row',alignItems:'flex-end',gap:12,marginBottom:12},sectionTitle:{color:'#111827',fontSize:21,fontWeight:'900'},sectionSub:{color:'#6b7280',fontSize:12,lineHeight:17,marginTop:4},count:{color:'#7c3aed',fontWeight:'900',fontSize:13},row:{gap:12,paddingRight:8},card:{width:230,borderRadius:18,borderWidth:1,borderColor:'#e5e7eb',overflow:'hidden',backgroundColor:'#fff'},image:{width:'100%',height:130,backgroundColor:'#f3f4f6'},cardBody:{padding:13},date:{color:'#7c3aed',fontSize:10,fontWeight:'900'},cardTitle:{color:'#111827',fontSize:16,lineHeight:20,fontWeight:'900',marginTop:5},meta:{color:'#6b7280',fontSize:11,marginTop:6},price:{color:'#111827',fontSize:13,fontWeight:'900',marginTop:8},empty:{borderRadius:16,borderWidth:1,borderColor:'#e5e7eb',padding:16,backgroundColor:'#fafafa'},emptyText:{color:'#6b7280'},center:{flex:1,alignItems:'center',justifyContent:'center',padding:28},centerBox:{minHeight:180,alignItems:'center',justifyContent:'center'},error:{color:'#dc2626',textAlign:'center',lineHeight:20},primary:{marginTop:20,minHeight:52,borderRadius:15,backgroundColor:'#7c3aed',paddingHorizontal:22,alignItems:'center',justifyContent:'center'},primaryText:{color:'#fff',fontWeight:'900'},secondary:{marginTop:14,minHeight:46,borderRadius:14,borderWidth:1,borderColor:'#d1d5db',paddingHorizontal:18,alignItems:'center',justifyContent:'center'},secondaryText:{color:'#111827',fontWeight:'800'}});
