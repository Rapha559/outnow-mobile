import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/lib/api';

type PromoterRoute =
  | '/promoter/dashboard'
  | '/promoter/events'
  | '/promoter/orders'
  | '/promoter/attendees'
  | '/promoter/payouts'
  | '/promoter/create-event'
  | '/promoter/analytics';

type PromoterItem = { label: string; subtitle: string; route: PromoterRoute };
type SocialStats = { success: true; followers: number; following: number };

const SITE = 'https://www.outnowtickets.com';

export default function ProfileScreen() {
  const { user, loading, isAuthenticated, signOut, sessionToken } = useAuth();
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 420, useNativeDriver: true }),
    ]).start();
  }, [fade, slide]);

  useEffect(() => {
    if (!sessionToken || user?.role !== 'PROMOTER') {
      setFollowers(0);
      setFollowing(0);
      return;
    }
    apiRequest<SocialStats>('/api/mobile/social/stats', {}, sessionToken)
      .then((data) => {
        setFollowers(data.followers || 0);
        setFollowing(data.following || 0);
      })
      .catch(() => {
        setFollowers(0);
        setFollowing(0);
      });
  }, [sessionToken, user?.role]);

  const initial = user?.name?.trim().charAt(0).toUpperCase() || 'O';
  const isPromoter = user?.role === 'PROMOTER';

  const promoterMenu: PromoterItem[] = useMemo(
    () => [
      { label: 'Dashboard', subtitle: 'Overview of events, sales and balances', route: '/promoter/dashboard' },
      { label: 'Analytics', subtitle: 'Views, followers and conversion', route: '/promoter/analytics' },
      { label: 'Events', subtitle: 'Create, edit and manage events', route: '/promoter/events' },
      { label: 'Orders', subtitle: 'Customer purchases and payments', route: '/promoter/orders' },
      { label: 'Attendees', subtitle: 'Ticket holders and check-in tools', route: '/promoter/attendees' },
      { label: 'Payouts & Stripe', subtitle: 'Balances, payout timing and Stripe setup', route: '/promoter/payouts' },
      { label: 'Create event', subtitle: 'Submit a new event for review', route: '/promoter/create-event' },
    ],
    [],
  );

  if (loading) {
    return (
      <View style={styles.screen}>
        <SafeAreaView style={styles.center}>
          <ActivityIndicator size="large" color="#7c3aed" />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }] }}>
            <View style={styles.header}>
              <View>
                <Text style={styles.eyebrow}>OUTNOW ACCOUNT</Text>
                <Text style={styles.title}>{isPromoter ? 'Promoter Profile' : 'Profile'}</Text>
                <Text style={styles.copy}>
                  {isAuthenticated
                    ? isPromoter
                      ? 'Manage your events, sales and audience from one place.'
                      : 'Your tickets, saved events and account all in one place.'
                    : 'Unlock your tickets, favourites and event activity.'}
                </Text>
              </View>
              <View style={styles.headerMark}><Text style={styles.headerMarkText}>O</Text></View>
            </View>

            {!isAuthenticated ? (
              <GuestProfile />
            ) : isPromoter ? (
              <>
                <AccountCard initial={initial} name={user?.name || 'Promoter'} email={user?.email || ''} role="PROMOTER" followers={followers} following={following} />
                <Text style={styles.sectionEyebrow}>QUICK ACCESS</Text>
                <View style={styles.quickGrid}>
                  <Quick icon="⌂" label="Dashboard" subtitle="Your overview" onPress={() => router.push('/promoter/dashboard')} />
                  <Quick icon="＋" label="Create event" subtitle="Publish something new" onPress={() => router.push('/promoter/create-event')} />
                  <Quick icon="✓" label="Attendees" subtitle="Manage entry" onPress={() => router.push('/promoter/attendees')} />
                  <Quick icon="⚙" label="Settings" subtitle="Account controls" onPress={() => router.push('/settings')} />
                </View>
                <Text style={styles.sectionEyebrow}>MANAGE</Text>
                <View style={styles.menu}>
                  {promoterMenu.map((item) => (
                    <MenuRow key={item.label} icon="›" label={item.label} subtitle={item.subtitle} onPress={() => router.push(item.route)} />
                  ))}
                </View>
                <Pressable style={({ pressed }) => [styles.signOut, pressed && styles.pressed]} onPress={() => void signOut()}>
                  <Text style={styles.signOutText}>Sign out</Text>
                </Pressable>
              </>
            ) : (
              <>
                <AccountCard initial={initial} name={user?.name || 'OutNow user'} email={user?.email || ''} role="CUSTOMER" />
                <Text style={styles.sectionEyebrow}>QUICK ACCESS</Text>
                <View style={styles.quickGrid}>
                  <Quick icon="🎟" label="My tickets" subtitle="Your passes" onPress={() => router.push('/(tabs)/tickets')} />
                  <Quick icon="♥" label="Saved" subtitle="Events you like" onPress={() => router.push('/(tabs)/saved')} />
                  <Quick icon="⇄" label="Activity" subtitle="Transfers & follows" onPress={() => router.push('/customer/activity')} />
                  <Quick icon="⚙" label="Settings" subtitle="Your preferences" onPress={() => router.push('/settings')} />
                </View>
                <Text style={styles.sectionEyebrow}>YOUR ACCOUNT</Text>
                <View style={styles.menu}>
                  <MenuRow icon="♥" label="Saved & discovery" subtitle="Liked events, recent views and recommendations" onPress={() => router.push('/(tabs)/saved')} />
                  <MenuRow icon="⇄" label="Following & transfers" subtitle="Organisers you follow and ticket activity" onPress={() => router.push('/customer/activity')} />
                  <MenuRow icon="🎟" label="My tickets" subtitle="QR codes, transfers and ticket status" onPress={() => router.push('/(tabs)/tickets')} />
                  <MenuRow icon="▣" label="Orders & refunds" subtitle="Purchase history and refund progress" onPress={() => router.push('/customer/orders')} />
                  <MenuRow icon="⚙" label="Settings" subtitle="Notifications, password and privacy" onPress={() => router.push('/settings')} />
                  <MenuRow icon="?" label="Help & support" subtitle="Get help from the OutNow support centre" onPress={() => void WebBrowser.openBrowserAsync(`${SITE}/help`)} />
                </View>
                <Pressable style={({ pressed }) => [styles.signOut, pressed && styles.pressed]} onPress={() => void signOut()}>
                  <Text style={styles.signOutText}>Sign out</Text>
                </Pressable>
              </>
            )}
          </Animated.View>
          <View style={{ height: 120 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function GuestProfile() {
  return (
    <>
      <View style={styles.guestHero}>
        <View style={styles.heroGlowOne} />
        <View style={styles.heroGlowTwo} />
        <View style={styles.guestTop}>
          <View style={styles.guestAvatar}><Text style={styles.guestAvatarText}>O</Text></View>
          <View style={styles.guestBadge}><Text style={styles.guestBadgeText}>GUEST MODE</Text></View>
        </View>
        <Text style={styles.guestTitle}>Welcome to OutNow</Text>
        <Text style={styles.guestCopy}>Sign in to keep your tickets, saved events, orders and transfers together.</Text>
        <View style={styles.previewStats}>
          <PreviewStat value="0" label="Saved" />
          <View style={styles.statDivider} />
          <PreviewStat value="0" label="Tickets" />
          <View style={styles.statDivider} />
          <PreviewStat value="0" label="Orders" />
        </View>
      </View>

      <View style={styles.authSection}>
        <Pressable style={({ pressed }) => [styles.primary, pressed && styles.primaryPressed]} onPress={() => router.push('/login')}>
          <View style={styles.primaryIcon}><Text style={styles.primaryIconText}>→</Text></View>
          <Text style={styles.primaryText}>Sign in</Text>
        </Pressable>
        <Pressable style={({ pressed }) => [styles.secondary, pressed && styles.pressed]} onPress={() => router.push('/signup')}>
          <Text style={styles.secondaryText}>Create account</Text>
        </Pressable>
        <Text style={styles.authHint}>Google and Apple sign-in are available on the next screen.</Text>
      </View>
    </>
  );
}

function AccountCard({ initial, name, email, role, followers, following }: { initial: string; name: string; email: string; role: 'CUSTOMER' | 'PROMOTER'; followers?: number; following?: number }) {
  return (
    <View style={styles.accountCard}>
      <View style={styles.accountAvatar}><Text style={styles.accountAvatarText}>{initial}</Text></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.accountName}>{name}</Text>
        <Text style={styles.accountEmail}>{email}</Text>
        <View style={styles.accountRolePill}><Text style={styles.accountRoleText}>{role}</Text></View>
        {role === 'PROMOTER' && (
          <View style={styles.socialRow}>
            <View style={styles.socialStat}><Text style={styles.socialNumber}>{followers || 0}</Text><Text style={styles.socialLabel}>Followers</Text></View>
            <View style={styles.socialDivider} />
            <View style={styles.socialStat}><Text style={styles.socialNumber}>{following || 0}</Text><Text style={styles.socialLabel}>Following</Text></View>
          </View>
        )}
      </View>
    </View>
  );
}

function PreviewStat({ value, label }: { value: string; label: string }) {
  return <View style={styles.previewStat}><Text style={styles.previewValue}>{value}</Text><Text style={styles.previewLabel}>{label}</Text></View>;
}

function Quick({ icon, label, subtitle, onPress }: { icon: string; label: string; subtitle: string; onPress: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.quick, pressed && styles.quickPressed]} onPress={onPress}>
      <View style={styles.quickIconCircle}><Text style={styles.quickIcon}>{icon}</Text></View>
      <View><Text style={styles.quickTitle}>{label}</Text><Text style={styles.quickSubtitle}>{subtitle}</Text></View>
    </Pressable>
  );
}

function MenuRow({ icon, label, subtitle, onPress }: { icon: string; label: string; subtitle: string; onPress: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.menuRow, pressed && styles.rowPressed]} onPress={onPress}>
      <View style={styles.menuIcon}><Text style={styles.menuIconText}>{icon}</Text></View>
      <View style={{ flex: 1 }}><Text style={styles.menuText}>{label}</Text><Text style={styles.menuSub}>{subtitle}</Text></View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen:{flex:1,backgroundColor:'#fff'},safe:{flex:1},center:{flex:1,alignItems:'center',justifyContent:'center'},content:{paddingHorizontal:18,paddingTop:14},
  header:{flexDirection:'row',alignItems:'flex-start',justifyContent:'space-between',gap:18},eyebrow:{color:'#7c3aed',fontSize:11,fontWeight:'900',letterSpacing:2.1},title:{color:'#111827',fontSize:39,lineHeight:44,fontWeight:'900',marginTop:9},copy:{color:'#6b7280',fontSize:15,lineHeight:22,marginTop:8,maxWidth:320},headerMark:{width:44,height:44,borderRadius:22,backgroundColor:'#f3efff',borderWidth:1,borderColor:'#ddd6fe',alignItems:'center',justifyContent:'center',marginTop:4},headerMarkText:{color:'#7c3aed',fontSize:18,fontWeight:'900'},
  guestHero:{marginTop:26,borderRadius:28,backgroundColor:'#111827',padding:22,minHeight:255,overflow:'hidden'},heroGlowOne:{position:'absolute',width:190,height:190,borderRadius:95,backgroundColor:'#7c3aed',opacity:.32,right:-65,top:-70},heroGlowTwo:{position:'absolute',width:140,height:140,borderRadius:70,backgroundColor:'#a78bfa',opacity:.13,left:-40,bottom:-70},guestTop:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},guestAvatar:{width:58,height:58,borderRadius:29,backgroundColor:'#fff',alignItems:'center',justifyContent:'center'},guestAvatarText:{color:'#7c3aed',fontSize:21,fontWeight:'900'},guestBadge:{borderRadius:999,backgroundColor:'rgba(255,255,255,0.12)',borderWidth:1,borderColor:'rgba(255,255,255,0.18)',paddingHorizontal:11,paddingVertical:7},guestBadgeText:{color:'#ddd6fe',fontSize:9,fontWeight:'900',letterSpacing:1.1},guestTitle:{color:'#fff',fontSize:26,fontWeight:'900',marginTop:22},guestCopy:{color:'#d1d5db',fontSize:13,lineHeight:20,marginTop:7,maxWidth:310},previewStats:{marginTop:20,borderRadius:18,backgroundColor:'rgba(255,255,255,0.08)',paddingVertical:14,flexDirection:'row',alignItems:'center'},previewStat:{flex:1,alignItems:'center'},previewValue:{color:'#fff',fontSize:19,fontWeight:'900'},previewLabel:{color:'#c4b5fd',fontSize:10,fontWeight:'800',marginTop:3},statDivider:{width:1,height:28,backgroundColor:'rgba(255,255,255,0.16)'},
  authSection:{marginTop:18},primary:{minHeight:56,borderRadius:18,backgroundColor:'#7c3aed',flexDirection:'row',alignItems:'center',justifyContent:'center',paddingHorizontal:18},primaryPressed:{transform:[{scale:.985}],opacity:.92},primaryIcon:{position:'absolute',left:12,width:34,height:34,borderRadius:17,backgroundColor:'rgba(255,255,255,0.16)',alignItems:'center',justifyContent:'center'},primaryIconText:{color:'#fff',fontSize:18,fontWeight:'900'},primaryText:{color:'#fff',fontSize:15,fontWeight:'900'},secondary:{minHeight:54,borderRadius:18,borderWidth:1,borderColor:'#d1d5db',backgroundColor:'#fff',alignItems:'center',justifyContent:'center',marginTop:10},secondaryText:{color:'#111827',fontSize:15,fontWeight:'900'},authHint:{color:'#9ca3af',fontSize:10,textAlign:'center',marginTop:10},
  sectionEyebrow:{color:'#6b7280',fontSize:10,fontWeight:'900',letterSpacing:1.5,marginTop:30,marginBottom:12},
  accountCard:{marginTop:26,borderRadius:24,borderWidth:1,borderColor:'#e5e7eb',backgroundColor:'#fafafa',padding:18,flexDirection:'row',alignItems:'flex-start',gap:15},accountAvatar:{width:60,height:60,borderRadius:30,backgroundColor:'#7c3aed',alignItems:'center',justifyContent:'center'},accountAvatarText:{color:'#fff',fontSize:21,fontWeight:'900'},accountName:{color:'#111827',fontSize:18,fontWeight:'900'},accountEmail:{color:'#6b7280',fontSize:12,marginTop:4},accountRolePill:{alignSelf:'flex-start',marginTop:10,borderRadius:999,paddingHorizontal:9,paddingVertical:5,backgroundColor:'#f3efff'},accountRoleText:{color:'#7c3aed',fontSize:8,fontWeight:'900',letterSpacing:1},socialRow:{flexDirection:'row',alignItems:'center',marginTop:14,paddingTop:12,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:'#e5e7eb'},socialStat:{minWidth:78},socialNumber:{color:'#111827',fontSize:17,fontWeight:'900'},socialLabel:{color:'#6b7280',fontSize:11,fontWeight:'700',marginTop:2},socialDivider:{width:1,height:30,backgroundColor:'#e5e7eb',marginHorizontal:16},
  quickGrid:{flexDirection:'row',flexWrap:'wrap',gap:10},quick:{width:'48.5%',minHeight:118,borderRadius:20,borderWidth:1,borderColor:'#e5e7eb',backgroundColor:'#fff',padding:15,justifyContent:'space-between'},quickPressed:{backgroundColor:'#faf5ff',borderColor:'#ddd6fe',transform:[{scale:.985}]},quickIconCircle:{width:38,height:38,borderRadius:12,backgroundColor:'#f5f3ff',alignItems:'center',justifyContent:'center'},quickIcon:{color:'#7c3aed',fontSize:20,fontWeight:'900'},quickTitle:{color:'#111827',fontSize:14,fontWeight:'900'},quickSubtitle:{color:'#6b7280',fontSize:10,marginTop:4},
  menu:{borderRadius:22,borderWidth:1,borderColor:'#e5e7eb',overflow:'hidden',backgroundColor:'#fff'},menuRow:{minHeight:76,paddingHorizontal:14,paddingVertical:10,flexDirection:'row',alignItems:'center',gap:12,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:'#e5e7eb'},rowPressed:{backgroundColor:'#fafafa'},menuIcon:{width:40,height:40,borderRadius:13,backgroundColor:'#f5f3ff',alignItems:'center',justifyContent:'center'},menuIconText:{color:'#7c3aed',fontSize:18,fontWeight:'900'},menuText:{color:'#111827',fontWeight:'900'},menuSub:{color:'#6b7280',fontSize:11,lineHeight:16,marginTop:3},chevron:{color:'#9ca3af',fontSize:26},signOut:{minHeight:52,borderRadius:16,borderWidth:1,borderColor:'#fecaca',backgroundColor:'#fff',alignItems:'center',justifyContent:'center',marginTop:20},signOutText:{color:'#dc2626',fontWeight:'900'},pressed:{opacity:.72},
});
