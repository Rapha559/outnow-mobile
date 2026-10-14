import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

import { AppErrorBoundary } from '@/components/app-error-boundary';
import { AppLaunchIntro } from '@/components/app-launch-intro';
import { AuthProvider } from '@/context/auth-context';
import { installSystemThemePreprocessors, setSystemThemeScheme, systemThemeColors } from '@/lib/system-theme';

installSystemThemePreprocessors();
void SplashScreen.preventAutoHideAsync().catch(() => {});

Notifications.setNotificationHandler({
  handleNotification:async()=>({shouldShowBanner:true,shouldShowList:true,shouldPlaySound:true,shouldSetBadge:false}),
});

function NotificationObserver(){
  useEffect(()=>{
    function open(notification:Notifications.Notification){const url=notification.request.content.data?.url;if(typeof url==='string')router.push(url as never);}
    const initial=Notifications.getLastNotificationResponse();if(initial?.notification)open(initial.notification);
    const subscription=Notifications.addNotificationResponseReceivedListener(response=>open(response.notification));
    return()=>subscription.remove();
  },[]);
  return null;
}

export default function RootLayout(){
  const colorScheme=useColorScheme();
  const theme=systemThemeColors(colorScheme);
  setSystemThemeScheme(colorScheme);
  const [showLaunchIntro,setShowLaunchIntro]=useState(true);

  useEffect(()=>{
    const timer=setTimeout(()=>{void SplashScreen.hideAsync().catch(()=>{});},100);
    return()=>clearTimeout(timer);
  },[]);

  const finishLaunchIntro=useCallback(()=>{
    setShowLaunchIntro(false);
  },[]);

  return <AppErrorBoundary><AuthProvider>
    <NotificationObserver/><StatusBar style={showLaunchIntro?'light':theme.dark?'light':'dark'}/>
    <Stack key={theme.dark?'dark':'light'} screenOptions={{headerShown:false,contentStyle:{backgroundColor:theme.background}}}>
      <Stack.Screen name="(tabs)"/><Stack.Screen name="event/[id]"/><Stack.Screen name="organiser/[id]"/><Stack.Screen name="ticket/[id]"/>
      <Stack.Screen name="tickets/transfer/accept"/>
      <Stack.Screen name="customer/orders"/><Stack.Screen name="customer/activity"/><Stack.Screen name="customer/checkout-result"/><Stack.Screen name="customer/reminders"/>
      <Stack.Screen name="login"/><Stack.Screen name="signup"/><Stack.Screen name="verify"/><Stack.Screen name="settings"/>
      <Stack.Screen name="promoter/dashboard"/><Stack.Screen name="promoter/analytics"/><Stack.Screen name="promoter/events"/><Stack.Screen name="promoter/create-event"/>
    </Stack>
    {showLaunchIntro&&<AppLaunchIntro onFinish={finishLaunchIntro}/>} 
  </AuthProvider></AppErrorBoundary>;
}
