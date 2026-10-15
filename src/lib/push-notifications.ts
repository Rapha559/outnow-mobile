import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { apiRequest } from '@/lib/api';

const PUSH_TOKEN_KEY='outnow_expo_push_token';
const CHANNEL_ID='outnow-updates';

type NotificationsModule = typeof import('expo-notifications');

let notificationsPromise: Promise<NotificationsModule | null> | null = null;

async function getNotifications(): Promise<NotificationsModule | null> {
  if (!notificationsPromise) {
    notificationsPromise = import('expo-notifications').catch((error) => {
      if (__DEV__) {
        console.warn('Push notifications are unavailable in this runtime.', error);
      }
      return null;
    });
  }
  return notificationsPromise;
}

async function ensureAndroidChannel(notifications: NotificationsModule){
  if(Platform.OS!=='android')return;
  await notifications.setNotificationChannelAsync(CHANNEL_ID,{
    name:'OutNow updates',
    importance:notifications.AndroidImportance.HIGH,
    vibrationPattern:[0,250,150,250],
  });
}

function easProjectId(){
  return Constants.expoConfig?.extra?.eas?.projectId??Constants.easConfig?.projectId??null;
}

export async function registerRemotePush(sessionToken:string){
  if(!Device.isDevice)return null;
  const projectId=easProjectId();
  if(!projectId)return null;

  const notifications=await getNotifications();
  if(!notifications)return null;

  await ensureAndroidChannel(notifications);
  const current=await notifications.getPermissionsAsync();
  let status=current.status;
  if(status!=='granted')status=(await notifications.requestPermissionsAsync()).status;
  if(status!=='granted')return null;

  const token=(await notifications.getExpoPushTokenAsync({projectId})).data;
  await apiRequest('/api/mobile/notifications/push-token',{
    method:'POST',
    body:JSON.stringify({token,platform:Platform.OS,deviceName:Device.deviceName||null}),
  },sessionToken);
  await SecureStore.setItemAsync(PUSH_TOKEN_KEY,token);
  return token;
}

export async function unregisterRemotePush(sessionToken:string){
  const token=await SecureStore.getItemAsync(PUSH_TOKEN_KEY);
  try{
    await apiRequest('/api/mobile/notifications/push-token',{
      method:'DELETE',
      body:JSON.stringify(token?{token}:{}),
    },sessionToken);
  }finally{
    await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY);
  }
}

export async function savedRemotePushToken(){
  return SecureStore.getItemAsync(PUSH_TOKEN_KEY);
}
