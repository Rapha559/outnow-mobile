import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { apiRequest } from '@/lib/api';

const PUSH_TOKEN_KEY='outnow_expo_push_token';
const CHANNEL_ID='outnow-updates';

async function ensureAndroidChannel(){
  if(Platform.OS!=='android')return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID,{
    name:'OutNow updates',
    importance:Notifications.AndroidImportance.HIGH,
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

  await ensureAndroidChannel();
  const current=await Notifications.getPermissionsAsync();
  let status=current.status;
  if(status!=='granted')status=(await Notifications.requestPermissionsAsync()).status;
  if(status!=='granted')return null;

  const token=(await Notifications.getExpoPushTokenAsync({projectId})).data;
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
