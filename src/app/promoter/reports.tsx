import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/auth-context';
import { downloadPromoterCsv } from '@/lib/download-report';

export default function PromoterReportsScreen() {
  const { sessionToken, user } = useAuth();
  const [working, setWorking] = useState(false);

  async function exportSales() {
    if (!sessionToken) return;
    try {
      setWorking(true);
      await downloadPromoterCsv('/api/promoter/dashboard/export', 'outnow-sales.csv', sessionToken);
    } catch (error) {
      Alert.alert('Export unavailable', error instanceof Error ? error.message : 'Unable to prepare this report.');
    } finally {
      setWorking(false);
    }
  }

  if (user?.role !== 'PROMOTER') return <View style={styles.screen}><SafeAreaView style={styles.center}><Text style={styles.title}>Promoter access required</Text></SafeAreaView></View>;
  return <View style={styles.screen}><SafeAreaView edges={['top']} style={{ flex: 1 }}><View style={styles.top}><Pressable style={styles.circle} onPress={() => router.back()}><Text style={styles.back}>‹</Text></Pressable><Text style={styles.topTitle}>Reports</Text><View style={styles.circlePlaceholder}/></View><ScrollView contentContainerStyle={styles.content}>
    <Text style={styles.eyebrow}>PROMOTER PORTAL</Text><Text style={styles.title}>Exports</Text><Text style={styles.copy}>Download secure CSV reports to save, share or open in a spreadsheet. Customer data is only included in the exported file.</Text>
    <View style={styles.card}><Text style={styles.cardTitle}>Sales and payments</Text><Text style={styles.cardCopy}>All paid orders, ticket types, fees, commission, completed refunds and your net revenue.</Text><Pressable disabled={working} style={[styles.button, working && styles.disabled]} onPress={() => void exportSales()}>{working ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Download sales CSV</Text>}</Pressable></View>
    <View style={styles.card}><Text style={styles.cardTitle}>Event-level exports</Text><Text style={styles.cardCopy}>Open an event to export its check-in audit or pre-sale waitlist. This keeps each report scoped to the right event.</Text><Pressable style={styles.outline} onPress={() => router.push('/promoter/events')}><Text style={styles.outlineText}>Open events</Text></Pressable></View>
    <Text style={styles.note}>Reports are generated on demand and are not stored by OutNow on your device.</Text>
  </ScrollView></SafeAreaView></View>;
}

const styles = StyleSheet.create({ screen:{flex:1,backgroundColor:'#fff'},center:{flex:1,alignItems:'center',justifyContent:'center',padding:24},top:{height:58,paddingHorizontal:18,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},circle:{width:40,height:40,borderRadius:20,borderWidth:1,borderColor:'#e5e7eb',alignItems:'center',justifyContent:'center'},circlePlaceholder:{width:40},back:{fontSize:34,lineHeight:36,marginTop:-3,color:'#111827'},topTitle:{fontWeight:'900',color:'#111827'},content:{padding:18},eyebrow:{color:'#7c3aed',fontSize:11,fontWeight:'900',letterSpacing:1.8,marginTop:8},title:{fontSize:32,fontWeight:'900',color:'#111827',marginTop:8},copy:{fontSize:13,lineHeight:20,color:'#6b7280',marginTop:8},card:{borderWidth:1,borderColor:'#e5e7eb',borderRadius:20,padding:18,marginTop:22},cardTitle:{fontSize:18,fontWeight:'900',color:'#111827'},cardCopy:{fontSize:12,lineHeight:19,color:'#6b7280',marginTop:7},button:{height:48,borderRadius:14,backgroundColor:'#7c3aed',alignItems:'center',justifyContent:'center',marginTop:16},buttonText:{color:'#fff',fontWeight:'900'},outline:{height:48,borderRadius:14,borderWidth:1,borderColor:'#7c3aed',backgroundColor:'#faf8ff',alignItems:'center',justifyContent:'center',marginTop:16},outlineText:{color:'#6d28d9',fontWeight:'900'},disabled:{opacity:.6},note:{fontSize:11,lineHeight:17,color:'#6b7280',marginTop:22,textAlign:'center'} });
