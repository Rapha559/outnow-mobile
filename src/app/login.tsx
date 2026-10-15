import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppleAuthentication, isAppleSignInAvailable, startAppleAuth } from '@/lib/apple-auth';
import { apiRequest } from '@/lib/api';
import { startMobileGoogleAuth } from '@/lib/google-auth';
import { useAuth } from '@/context/auth-context';

type LoginResponse={success:true;requiresVerification:true;challengeToken:string;email:string;role:string};
type StaffAccessResponse={success:true;hasScannerAccess:boolean;assignments:Array<{id:string;role:'SCANNER'}>};

function isSafeCustomerRedirect(value?:string){
  if(!value||!value.startsWith('/'))return false;
  return value.startsWith('/event/')||value.startsWith('/tickets/transfer/accept');
}

export default function LoginScreen(){
  const params=useLocalSearchParams<{redirect?:string}>();
  const {saveSession}=useAuth();
  const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [loading,setLoading]=useState(false);const [googleLoading,setGoogleLoading]=useState(false);const [appleLoading,setAppleLoading]=useState(false);const [appleAvailable,setAppleAvailable]=useState(false);const [error,setError]=useState('');
  useEffect(()=>{if(Platform.OS==='ios')void isAppleSignInAvailable().then(setAppleAvailable);},[]);
  async function submit(){if(!email.trim()||!password){setError('Enter your email and password.');return;}try{setLoading(true);setError('');const data=await apiRequest<LoginResponse>('/api/mobile/auth/login',{method:'POST',body:JSON.stringify({email,password,rememberMe:true})});router.replace({pathname:'/verify',params:{mode:'login',challengeToken:data.challengeToken,maskedEmail:data.email,...(params.redirect?{redirect:params.redirect}:{})}});}catch(err){setError(err instanceof Error?err.message:'Unable to sign in.');}finally{setLoading(false);}}
  async function googleSignIn(){
    try{
      setGoogleLoading(true);setError('');
      const result=await startMobileGoogleAuth({mode:'login',redirect:params.redirect});
      await saveSession(result.sessionToken,result.user);

      const redirect=result.redirect||params.redirect;
      if(result.user.role==='CUSTOMER'&&isSafeCustomerRedirect(redirect)){
        router.replace(redirect as never);return;
      }
      if(result.user.role==='PROMOTER'){
        router.replace('/promoter/dashboard');return;
      }
      try{
        const staffAccess=await apiRequest<StaffAccessResponse>('/api/mobile/staff/access',{},result.sessionToken);
        if(staffAccess.hasScannerAccess&&staffAccess.assignments.length>0){router.replace('/staff');return;}
      }catch{}
      router.replace('/(tabs)/profile');
    }catch(err){setError(err instanceof Error?err.message:'Google sign-in failed.');}
    finally{setGoogleLoading(false);}
  }
  async function appleSignIn(){try{setAppleLoading(true);setError('');const result=await startAppleAuth({mode:'login'});router.replace({pathname:'/verify',params:{mode:'login',challengeToken:result.challengeToken,maskedEmail:result.email,...(params.redirect?{redirect:params.redirect}:{})}});}catch(err){const message=err instanceof Error?err.message:'Apple sign-in failed.';if(!message.includes('ERR_REQUEST_CANCELED'))setError(message);}finally{setAppleLoading(false);}}
  const busy=loading||googleLoading||appleLoading;
  return <View style={styles.screen}><SafeAreaView style={styles.safeArea}><KeyboardAvoidingView style={styles.flex} behavior={Platform.OS==='ios'?'padding':undefined}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <View style={styles.topRow}><Pressable style={styles.back} onPress={()=>router.back()}><Text style={styles.backText}>‹</Text></Pressable><Text style={styles.brand}>OUTNOW</Text><View style={styles.spacer}/></View>
    <Text style={styles.eyebrow}>WELCOME BACK</Text><Text style={styles.title}>Sign in to OutNow</Text><Text style={styles.copy}>Access your tickets, orders and account from the app.</Text>
    <Pressable disabled={busy} style={[styles.google,busy&&styles.disabled]} onPress={()=>void googleSignIn()}>{googleLoading?<ActivityIndicator color="#111827"/>:<><Text style={styles.googleMark}>G</Text><Text style={styles.googleText}>Continue with Google</Text></>}</Pressable>
    {appleAvailable&&<View style={[styles.appleWrap,busy&&styles.disabled]}>{appleLoading?<View style={styles.appleLoading}><ActivityIndicator color="#fff"/></View>:<AppleAuthentication.AppleAuthenticationButton buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN} buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK} cornerRadius={14} style={styles.appleButton} onPress={()=>void appleSignIn()}/>}</View>}
    <View style={styles.divider}><View style={styles.dividerLine}/><Text style={styles.dividerText}>or use email</Text><View style={styles.dividerLine}/></View>
    <View style={styles.form}><Text style={styles.label}>Email</Text><TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" placeholder="you@example.com" placeholderTextColor="#9ca3af" style={styles.input}/><Text style={styles.label}>Password</Text><TextInput value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" placeholder="Your password" placeholderTextColor="#9ca3af" style={styles.input}/>{!!error&&<Text style={styles.error}>{error}</Text>}<Pressable disabled={busy} style={[styles.primary,busy&&styles.disabled]} onPress={()=>void submit()}>{loading?<ActivityIndicator color="#fff"/>:<Text style={styles.primaryText}>Continue</Text>}</Pressable></View>
    <View style={styles.footerRow}><Text style={styles.footerText}>New to OutNow?</Text><Pressable onPress={()=>router.replace({pathname:'/signup',params:params.redirect?{redirect:params.redirect}:{}})}><Text style={styles.link}>Create account</Text></Pressable></View>
  </ScrollView></KeyboardAvoidingView></SafeAreaView></View>;
}
const styles=StyleSheet.create({screen:{flex:1,backgroundColor:'#fff'},safeArea:{flex:1},flex:{flex:1},content:{flexGrow:1,paddingHorizontal:20,paddingBottom:36},topRow:{height:58,flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:38},back:{width:40,height:40,borderRadius:20,borderWidth:1,borderColor:'#e5e7eb',backgroundColor:'#f9fafb',alignItems:'center',justifyContent:'center'},backText:{color:'#111827',fontSize:34,lineHeight:36,marginTop:-3},brand:{color:'#111827',fontWeight:'900',letterSpacing:1.4,fontSize:17},spacer:{width:40},eyebrow:{color:'#7c3aed',fontSize:11,fontWeight:'900',letterSpacing:1.8},title:{color:'#111827',fontSize:34,lineHeight:40,fontWeight:'900',marginTop:10},copy:{color:'#6b7280',fontSize:15,lineHeight:22,marginTop:9,maxWidth:360},google:{height:54,borderRadius:16,borderWidth:1,borderColor:'#d1d5db',backgroundColor:'#fff',flexDirection:'row',alignItems:'center',justifyContent:'center',gap:11,marginTop:28},googleMark:{color:'#4285F4',fontSize:20,fontWeight:'900'},googleText:{color:'#111827',fontSize:14,fontWeight:'900'},appleWrap:{height:54,marginTop:10},appleButton:{width:'100%',height:54},appleLoading:{width:'100%',height:54,borderRadius:14,backgroundColor:'#000',alignItems:'center',justifyContent:'center'},divider:{flexDirection:'row',alignItems:'center',gap:12,marginTop:23},dividerLine:{flex:1,height:StyleSheet.hairlineWidth,backgroundColor:'#e5e7eb'},dividerText:{color:'#9ca3af',fontSize:11,fontWeight:'700'},form:{marginTop:8},label:{color:'#374151',fontSize:12,fontWeight:'800',marginBottom:8,marginTop:14},input:{height:54,borderRadius:15,borderWidth:1,borderColor:'#d1d5db',backgroundColor:'#f9fafb',color:'#111827',paddingHorizontal:15,fontSize:15},error:{color:'#dc2626',fontSize:13,lineHeight:19,marginTop:14},primary:{height:54,borderRadius:16,backgroundColor:'#7c3aed',alignItems:'center',justifyContent:'center',marginTop:24},disabled:{opacity:.65},primaryText:{color:'#fff',fontSize:15,fontWeight:'900'},footerRow:{marginTop:26,flexDirection:'row',justifyContent:'center',gap:7},footerText:{color:'#6b7280'},link:{color:'#7c3aed',fontWeight:'800'}});
