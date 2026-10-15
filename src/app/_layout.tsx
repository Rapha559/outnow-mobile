import Constants from 'expo-constants';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

import { AppErrorBoundary } from '@/components/app-error-boundary';
import { AppLaunchIntro } from '@/components/app-launch-intro';
import { StaffScannerShortcut } from '@/components/staff-scanner-shortcut';
import { AuthProvider } from '@/context/auth-context';
import { installSystemThemePreprocessors, setSystemThemeScheme, systemThemeColors } from '@/lib/system-theme';

installSystemThemePreprocessors();
void SplashScreen.preventAutoHideAsync().catch(() => {});

// Keep this in module memory so an Android OAuth activity return can remount
// RootLayout without replaying the entrance animation. A true cold app launch
// reloads the JS bundle, so the intro still appears normally on launch.
let launchIntroShownThisRun=false;

function notificationRoute(data: Record<string, unknown> | undefined){
  if(!data)return '/notifications';

  const url=typeof data.url==='string'?data.url.trim():'';
  if(url.startsWith('/'))return url;

  const ticketId=typeof data.ticketId==='string'?data.ticketId.trim():'';
  if(ticketId)return `/ticket/${encodeURIComponent(ticketId)}`;

  const eventId=typeof data.eventId==='string'?data.eventId.trim():'';
  if(eventId)return `/event/${encodeURIComponent(eventId)}`;

  const orderId=typeof data.orderId==='string'?data.orderId.trim():'';
  if(orderId)return `/customer/orders?orderId=${encodeURIComponent(orderId)}`;

  const transferToken=typeof data.transferToken==='string'?data.transferToken.trim():'';
  if(transferToken)return `/tickets/transfer/accept?token=${encodeURIComponent(transferToken)}`;

  return '/notifications';
}

function NotificationObserver(){
  useEffect(()=>{
    if(Constants.appOwnership==='expo')return;

    let subscription:{remove:()=>void}|undefined;
    let active=true;

    async function setupNotifications(){
      try{
        const Notifications=await import('expo-notifications');
        if(!active)return;

        Notifications.setNotificationHandler({
          handleNotification:async()=>({shouldShowBanner:true,shouldShowList:true,shouldPlaySound:true,shouldSetBadge:true}),
        });

        function open(notification:any){
          const data=notification?.request?.content?.data as Record<string,unknown>|undefined;
          router.push(notificationRoute(data) as never);
        }

        const initial=Notifications.getLastNotificationResponse();
        if(initial?.notification)open(initial.notification);
        subscription=Notifications.addNotificationResponseReceivedListener(response=>open(response.notification));
      }catch{
        if(__DEV__){
          console.warn('Notifications are unavailable in this client. Use a development build for full notification support.');
        }
      }
    }

    void setupNotifications();
    return()=>{
      active=false;
      subscription?.remove();
    };
  },[]);
  return null;
}

export default function RootLayout(){
  const colorScheme=useColorScheme();
  const theme=systemThemeColors(colorScheme);
  setSystemThemeScheme(colorScheme);
  const [showLaunchIntro,setShowLaunchIntro]=useState(!launchIntroShownThisRun);

  useEffect(()=>{
    if(showLaunchIntro)launchIntroShownThisRun=true;
    const timer=setTimeout(()=>{void SplashScreen.hideAsync().catch(()=>{});},100);
    return()=>clearTimeout(timer);
  },[showLaunchIntro]);

  const finishLaunchIntro=useCallback(()=>{
    launchIntroShownThisRun=true;
    setShowLaunchIntro(false);
  },[]);

  return <AppErrorBoundary><AuthProvider>
    <NotificationObserver/><StatusBar style={showLaunchIntro?'light':theme.dark?'light':'dark'}/>
    <Stack key={theme.dark?'dark':'light'} screenOptions={{headerShown:false,contentStyle:{backgroundColor:theme.background}}}>
      <Stack.Screen name="(tabs)"/><Stack.Screen name="event/[id]"/><Stack.Screen name="organiser/[id]"/><Stack.Screen name="ticket/[id]"/>
      <Stack.Screen name="notifications"/><Stack.Screen name="tickets/transfer/accept"/>
      <Stack.Screen name="customer/orders"/><Stack.Screen name="customer/activity"/><Stack.Screen name="customer/checkout-result"/><Stack.Screen name="customer/reminders"/>
      <Stack.Screen name="login"/><Stack.Screen name="signup"/><Stack.Screen name="verify"/><Stack.Screen name="settings"/><Stack.Screen name="staff"/>
      <Stack.Screen name="promoter/dashboard"/><Stack.Screen name="promoter/analytics"/><Stack.Screen name="promoter/events"/><Stack.Screen name="promoter/create-event"/><Stack.Screen name="promoter/scanner"/>
    </Stack>
    <StaffScannerShortcut/>
    {showLaunchIntro&&<AppLaunchIntro onFinish={finishLaunchIntro}/>} 
  </AuthProvider></AppErrorBoundary>;
}
