import { router } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/auth-context';

type MenuItem={label:string;subtitle:string;route?:'/promoter/dashboard'|'/promoter/events'|'/promoter/orders'|'/promoter/attendees'|'/promoter/payouts'|'/promoter/create-event'|'/login'|'/signup'|'/((tabs))/tickets'};

export default function ProfileScreen() {
  const { user, loading, isAuthenticated, signOut } = useAuth();

  if (loading) {
    return <View style={styles.screen}><SafeAreaView style={styles.center}><ActivityIndicator size="large" color="#7c3aed" /></SafeAreaView></View>;
  }

  const initial = user?.name?.trim().charAt(0).toUpperCase() || 'O';
  const isPromoter = user?.role === 'PROMOTER';
  const promoterMenu:MenuItem[]=[
    {label:'Dashboard',subtitle:'Overview of events, sales and balances',route:'/promoter/dashboard'},
    {label:'Events',subtitle:'Create, edit and manage events',route:'/promoter/events'},
    {label:'Orders',subtitle:'Customer purchases and payments',route:'/promoter/orders'},
    {label:'Attendees',subtitle:'Ticket holders and check-in tools',route:'/promoter/attendees'},
    {label:'Payouts & Stripe',subtitle:'Balances, payout timing and Stripe setup',route:'/promoter/payouts'},
    {label:'Create event',subtitle:'Submit a new event for review',route:'/promoter/create-event'},
  ];

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.eyebrow}>OUTNOW ACCOUNT</Text>
          <Text style={styles.title}>{isPromoter ? 'Promoter Profile' : 'Profile'}</Text>
          <Text style={styles.copy}>{isAuthenticated?isPromoter?'Everything you need to run your OutNow events from mobile.':'Your OutNow account is connected to this device.':'Sign in to manage your tickets, orders and account details.'}</Text>

          <View style={styles.profileCard}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{initial}</Text></View>
            <View style={styles.profileText}><Text style={styles.profileTitle}>{user?.name || 'Welcome to OutNow'}</Text><Text style={styles.profileCopy}>{user?.email || 'Sign in or create an account to keep your tickets with you.'}</Text>{!!user?.role&&<Text style={styles.role}>{user.role}</Text>}</View>
          </View>

          {!isAuthenticated ? <>
            <Pressable style={styles.primaryButton} onPress={()=>router.push('/login')}><Text style={styles.primaryText}>Sign in</Text></Pressable>
            <Pressable style={styles.secondaryButton} onPress={()=>router.push('/signup')}><Text style={styles.secondaryText}>Create account</Text></Pressable>
          </> : isPromoter ? <>
            <View style={styles.quickGrid}>
              <Pressable style={styles.quickCard} onPress={()=>router.push('/promoter/dashboard')}><Text style={styles.quickIcon}>⌂</Text><Text style={styles.quickTitle}>Dashboard</Text></Pressable>
              <Pressable style={styles.quickCard} onPress={()=>router.push('/promoter/create-event')}><Text style={styles.quickIcon}>＋</Text><Text style={styles.quickTitle}>Create event</Text></Pressable>
              <Pressable style={styles.quickCard} onPress={()=>router.push('/promoter/attendees')}><Text style={styles.quickIcon}>✓</Text><Text style={styles.quickTitle}>Attendees</Text></Pressable>
              <Pressable style={styles.quickCard} onPress={()=>router.push('/promoter/payouts')}><Text style={styles.quickIcon}>£</Text><Text style={styles.quickTitle}>Payouts</Text></Pressable>
            </View>
            <View style={styles.menu}>{promoterMenu.map(item=><Pressable key={item.label} style={styles.menuRow} onPress={()=>item.route&&router.push(item.route)}><View style={{flex:1}}><Text style={styles.menuText}>{item.label}</Text><Text style={styles.menuSub}>{item.subtitle}</Text></View><Text style={styles.chevron}>›</Text></Pressable>)}</View>
            <Pressable style={styles.signOutButton} onPress={()=>{void signOut();}}><Text style={styles.signOutText}>Sign out</Text></Pressable>
          </> : <>
            <Pressable style={styles.primaryButton} onPress={()=>router.push('/(tabs)/tickets')}><Text style={styles.primaryText}>View my tickets</Text></Pressable>
            <View style={styles.customerInfo}><Text style={styles.customerInfoTitle}>Your account</Text><Text style={styles.customerInfoText}>Tickets, event updates and purchases stay connected to this account.</Text></View>
            <Pressable style={styles.signOutButton} onPress={()=>{void signOut();}}><Text style={styles.signOutText}>Sign out</Text></Pressable>
          </>}

          <View style={{ height: 110 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({screen:{flex:1,backgroundColor:'#ffffff'},safeArea:{flex:1},center:{flex:1,alignItems:'center',justifyContent:'center'},content:{paddingHorizontal:18,paddingTop:16},eyebrow:{color:'#7c3aed',fontSize:11,fontWeight:'900',letterSpacing:1.8},title:{color:'#111827',fontSize:34,lineHeight:39,fontWeight:'900',marginTop:10},copy:{color:'#6b7280',fontSize:15,lineHeight:22,marginTop:8},profileCard:{marginTop:28,borderRadius:20,borderWidth:1,borderColor:'#e5e7eb',backgroundColor:'#fafafa',padding:18,flexDirection:'row',alignItems:'center',gap:14},avatar:{width:54,height:54,borderRadius:27,backgroundColor:'#f3efff',borderWidth:1,borderColor:'#ddd6fe',alignItems:'center',justifyContent:'center'},avatarText:{color:'#7c3aed',fontSize:19,fontWeight:'900'},profileText:{flex:1},profileTitle:{color:'#111827',fontSize:17,fontWeight:'900'},profileCopy:{color:'#6b7280',fontSize:12,lineHeight:18,marginTop:4},role:{color:'#7c3aed',fontSize:9,fontWeight:'900',letterSpacing:1.1,marginTop:8},primaryButton:{height:52,borderRadius:15,backgroundColor:'#7c3aed',alignItems:'center',justifyContent:'center',marginTop:20},primaryText:{color:'#ffffff',fontSize:15,fontWeight:'900'},secondaryButton:{height:52,borderRadius:15,borderWidth:1,borderColor:'#d1d5db',backgroundColor:'#ffffff',alignItems:'center',justifyContent:'center',marginTop:10},secondaryText:{color:'#111827',fontSize:15,fontWeight:'800'},quickGrid:{flexDirection:'row',flexWrap:'wrap',gap:10,marginTop:20},quickCard:{width:'48.5%',minHeight:94,borderRadius:18,borderWidth:1,borderColor:'#e5e7eb',backgroundColor:'#fff',padding:15,justifyContent:'space-between'},quickIcon:{color:'#7c3aed',fontSize:24,fontWeight:'900'},quickTitle:{color:'#111827',fontSize:14,fontWeight:'900'},menu:{marginTop:20,borderRadius:18,borderWidth:1,borderColor:'#e5e7eb',overflow:'hidden'},menuRow:{minHeight:68,backgroundColor:'#ffffff',borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:'#e5e7eb',flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:10,gap:12},menuText:{color:'#111827',fontWeight:'900'},menuSub:{color:'#6b7280',fontSize:11,lineHeight:16,marginTop:3},chevron:{color:'#9ca3af',fontSize:25},signOutButton:{height:50,borderRadius:15,borderWidth:1,borderColor:'#fecaca',backgroundColor:'#fff',alignItems:'center',justifyContent:'center',marginTop:18},signOutText:{color:'#dc2626',fontSize:14,fontWeight:'900'},customerInfo:{marginTop:18,borderRadius:18,borderWidth:1,borderColor:'#e5e7eb',backgroundColor:'#fafafa',padding:16},customerInfoTitle:{color:'#111827',fontWeight:'900',fontSize:16},customerInfoText:{color:'#6b7280',fontSize:12,lineHeight:19,marginTop:5}});
