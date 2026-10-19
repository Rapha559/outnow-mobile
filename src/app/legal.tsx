import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { type ReactNode } from 'react';

const SITE='https://www.outnowtickets.com';
const SUPPORT='support@outnowtickets.com';

export default function LegalScreen(){
  return <View style={styles.screen}><SafeAreaView edges={['top']} style={{flex:1}}>
    <View style={styles.top}><Pressable style={styles.backButton} onPress={()=>router.back()}><Text style={styles.back}>‹</Text></Pressable><Text style={styles.topTitle}>Legal & refunds</Text><View style={{width:40}}/></View>
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>OUTNOW LEGAL</Text><Text style={styles.title}>Tickets, refunds and your data</Text><Text style={styles.copy}>Key legal information for using OutNow Tickets on mobile. The full production policies on outnowtickets.com remain the authoritative versions.</Text>

      <Card title="Refunds & cancellations">
        <Text style={styles.body}>Refund eligibility can depend on the event, the ticket type and the refund terms shown when you bought the ticket. You can track submitted refund requests from Orders & refunds in your account.</Text>
        <Text style={styles.body}>When a refund is successfully completed, any affected ticket may be voided and must not be used for entry. If an event is cancelled or materially changed, follow the instructions shown in OutNow and any event-specific notice you receive.</Text>
        <Text style={styles.body}>Booking fees, promoter obligations and the treatment of cancelled-event payments are governed by the applicable OutNow ticketing terms and the terms shown at checkout.</Text>
        <Pressable style={styles.linkButton} onPress={()=>void WebBrowser.openBrowserAsync(`${SITE}/terms`)}><Text style={styles.linkText}>Read full ticketing terms ↗</Text></Pressable>
      </Card>

      <Card title="Privacy">
        <Text style={styles.body}>OutNow uses account details, ticketing and payment records, app activity and device notification identifiers to provide the service, protect accounts, process purchases, personalise discovery when enabled and communicate important event or account updates.</Text>
        <Text style={styles.body}>Payment card details are handled by Stripe rather than stored by OutNow. You can control marketing, personalised recommendations, anonymous analytics and notifications from Settings.</Text>
        <Pressable style={styles.linkButton} onPress={()=>void WebBrowser.openBrowserAsync(`${SITE}/privacy`)}><Text style={styles.linkText}>Read full Privacy Policy ↗</Text></Pressable>
      </Card>

      <Card title="Cookies & app storage">
        <Text style={styles.body}>OutNow uses secure session technology, app storage and similar technologies for sign-in, account security, preferences, notifications and core app functionality.</Text>
        <Pressable style={styles.linkButton} onPress={()=>router.push('/cookies')}><Text style={styles.linkText}>Read Cookies & app storage →</Text></Pressable>
      </Card>

      <Card title="Terms">
        <Text style={styles.body}>Tickets are sold for events listed on OutNow. Event-specific sale windows, refund rules, organiser terms, booking fees and eligibility requirements apply at checkout. Tickets must not be duplicated or misused and may be voided when refunded or transferred.</Text>
        <Text style={styles.body}>Promoters are responsible for accurate event information, lawful ticket sales and completing the seller, tax and payout information required by OutNow and Stripe.</Text>
        <Pressable style={styles.linkButton} onPress={()=>void WebBrowser.openBrowserAsync(`${SITE}/terms`)}><Text style={styles.linkText}>Read full Terms ↗</Text></Pressable>
      </Card>

      <Card title="Account controls">
        <Text style={styles.body}>You can request account deletion from Settings → Account controls. Security alerts, password controls and privacy choices are also available in Settings.</Text>
      </Card>

      <Card title="Need help?">
        <Text style={styles.body}>For ticket, refund, account or event-support questions, contact the OutNow support team.</Text>
        <Pressable style={styles.linkButton} onPress={()=>void Linking.openURL(`mailto:${SUPPORT}`)}><Text style={styles.linkText}>{SUPPORT} ↗</Text></Pressable>
      </Card>

      <Text style={styles.company}>OUTNOW TICKETS LTD · Company number 17519279</Text>
      <Text style={styles.note}>The website policies are the authoritative legal versions. This in-app summary is provided for convenience.</Text><View style={{height:40}}/>
    </ScrollView>
  </SafeAreaView></View>;
}
function Card({title,children}:{title:string;children:ReactNode}){return <View style={styles.card}><Text style={styles.cardTitle}>{title}</Text>{children}</View>}
const styles=StyleSheet.create({screen:{flex:1,backgroundColor:'#fff'},top:{height:58,paddingHorizontal:18,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},backButton:{width:40,height:40,borderRadius:20,borderWidth:1,borderColor:'#e5e7eb',alignItems:'center',justifyContent:'center'},back:{fontSize:34,lineHeight:36,marginTop:-4,color:'#111827'},topTitle:{fontWeight:'900',color:'#111827'},content:{paddingHorizontal:18},eyebrow:{color:'#7c3aed',fontSize:11,fontWeight:'900',letterSpacing:1.7,marginTop:10},title:{fontSize:31,lineHeight:36,fontWeight:'900',color:'#111827',marginTop:8},copy:{color:'#6b7280',fontSize:14,lineHeight:21,marginTop:9},card:{marginTop:18,borderRadius:18,borderWidth:1,borderColor:'#e5e7eb',padding:17,backgroundColor:'#fff'},cardTitle:{fontSize:19,fontWeight:'900',color:'#111827',marginBottom:10},body:{fontSize:13,lineHeight:20,color:'#4b5563',marginBottom:9},linkButton:{alignSelf:'flex-start',marginTop:4,paddingVertical:8},linkText:{color:'#7c3aed',fontWeight:'900',fontSize:13},company:{color:'#111827',fontSize:11,fontWeight:'900',textAlign:'center',marginTop:22},note:{color:'#6b7280',fontSize:11,lineHeight:17,textAlign:'center',marginTop:8}});
