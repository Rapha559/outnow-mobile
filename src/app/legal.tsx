import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const SITE='https://www.outnowtickets.com';

export default function LegalScreen(){
  return <View style={styles.screen}><SafeAreaView edges={['top']} style={{flex:1}}>
    <View style={styles.top}><Pressable style={styles.backButton} onPress={()=>router.back()}><Text style={styles.back}>‹</Text></Pressable><Text style={styles.topTitle}>Privacy & terms</Text><View style={{width:40}}/></View>
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>OUTNOW LEGAL</Text><Text style={styles.title}>Your data and your account</Text><Text style={styles.copy}>This page gives you the key points inside the app. The full production policies remain available on outnowtickets.com.</Text>
      <Card title="Privacy"><Text style={styles.body}>OutNow uses account details, ticketing and payment records, app activity and device notification identifiers to provide the service, protect accounts, process purchases, personalise discovery when enabled and communicate important event or account updates.</Text><Text style={styles.body}>Payment card details are handled by Stripe rather than stored by OutNow. You can control marketing, personalised recommendations, anonymous analytics and notifications from Settings.</Text><Pressable style={styles.linkButton} onPress={()=>void WebBrowser.openBrowserAsync(`${SITE}/privacy`)}><Text style={styles.linkText}>Read full Privacy Policy ↗</Text></Pressable></Card>
      <Card title="Terms"><Text style={styles.body}>Tickets are sold for events listed on OutNow. Event-specific sale windows, refund rules, organiser terms, booking fees and eligibility requirements apply at checkout. Tickets must not be duplicated or misused and may be voided when refunded or transferred.</Text><Text style={styles.body}>Promoters are responsible for accurate event information, lawful ticket sales and completing the seller, tax and payout information required by OutNow and Stripe.</Text><Pressable style={styles.linkButton} onPress={()=>void WebBrowser.openBrowserAsync(`${SITE}/terms`)}><Text style={styles.linkText}>Read full Terms ↗</Text></Pressable></Card>
      <Card title="Account controls"><Text style={styles.body}>You can request account deletion from Settings → Account controls. Security alerts, password controls and privacy choices are also available in Settings.</Text></Card>
      <Text style={styles.note}>The website policies are the authoritative legal versions. This in-app summary is provided for convenience.</Text><View style={{height:40}}/>
    </ScrollView>
  </SafeAreaView></View>;
}
function Card({title,children}:{title:string;children:React.ReactNode}){return <View style={styles.card}><Text style={styles.cardTitle}>{title}</Text>{children}</View>}
const styles=StyleSheet.create({screen:{flex:1,backgroundColor:'#fff'},top:{height:58,paddingHorizontal:18,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},backButton:{width:40,height:40,borderRadius:20,borderWidth:1,borderColor:'#e5e7eb',alignItems:'center',justifyContent:'center'},back:{fontSize:34,lineHeight:36,marginTop:-4,color:'#111827'},topTitle:{fontWeight:'900',color:'#111827'},content:{paddingHorizontal:18},eyebrow:{color:'#7c3aed',fontSize:11,fontWeight:'900',letterSpacing:1.7,marginTop:10},title:{fontSize:31,lineHeight:36,fontWeight:'900',color:'#111827',marginTop:8},copy:{color:'#6b7280',fontSize:14,lineHeight:21,marginTop:9},card:{marginTop:18,borderRadius:18,borderWidth:1,borderColor:'#e5e7eb',padding:17,backgroundColor:'#fff'},cardTitle:{fontSize:19,fontWeight:'900',color:'#111827',marginBottom:10},body:{fontSize:13,lineHeight:20,color:'#4b5563',marginBottom:9},linkButton:{alignSelf:'flex-start',marginTop:4,paddingVertical:8},linkText:{color:'#7c3aed',fontWeight:'900',fontSize:13},note:{color:'#6b7280',fontSize:11,lineHeight:17,textAlign:'center',marginTop:18}});
