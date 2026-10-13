import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { AppErrorBoundary } from '@/components/app-error-boundary';
import { AuthProvider } from '@/context/auth-context';

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
  return <AppErrorBoundary><AuthProvider>
    <NotificationObserver/><StatusBar style="dark"/>
    <Stack screenOptions={{headerShown:false,contentStyle:{backgroundColor:'#ffffff'}}}>
      <Stack.Screen name="(tabs)"/><Stack.Screen name="event/[id]"/><Stack.Screen name="organiser/[id]"/><Stack.Screen name="ticket/[id]"/>
      <Stack.Screen name="customer/orders"/><Stack.Screen name="customer/activity"/><Stack.Screen name="customer/checkout-result"/><Stack.Screen name="customer/reminders"/>
      <Stack.Screen name="login"/><Stack.Screen name="signup"/><Stack.Screen name="verify"/><Stack.Screen name="settings"/>
      <Stack.Screen name="promoter/dashboard"/><Stack.Screen name="promoter/analytics"/><Stack.Screen name="promoter/events"/><Stack.Screen name="promoter/create-event"/>
    </Stack>
  </AuthProvider></AppErrorBoundary>;
}
