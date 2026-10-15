import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ENABLED_KEY='outnow_event_reminders_enabled';
const IDS_KEY='outnow_event_reminder_ids';
const CHANNEL_ID='event-reminders';

type NotificationsModule = typeof import('expo-notifications');

let notificationsPromise: Promise<NotificationsModule | null> | null = null;

async function getNotifications(): Promise<NotificationsModule | null> {
  if (!notificationsPromise) {
    notificationsPromise = import('expo-notifications').catch((error) => {
      if (__DEV__) {
        console.warn('Event reminders are unavailable in this runtime.', error);
      }
      return null;
    });
  }
  return notificationsPromise;
}

export type ReminderTicket={
  event:{id:string;title:string;date:string;venue:string;location:string;status:string};
};

async function ensureChannel(notifications: NotificationsModule){
  if(Platform.OS==='android'){
    await notifications.setNotificationChannelAsync(CHANNEL_ID,{
      name:'Event reminders',
      importance:notifications.AndroidImportance.HIGH,
      vibrationPattern:[0,250,150,250],
    });
  }
}

async function storedIds(){
  const raw=await SecureStore.getItemAsync(IDS_KEY);
  if(!raw)return [] as string[];
  try{return JSON.parse(raw) as string[];}catch{return [] as string[];}
}

async function clearScheduled(){
  const notifications=await getNotifications();
  const ids=await storedIds();
  if(notifications){
    await Promise.all(ids.map(id=>notifications.cancelScheduledNotificationAsync(id).catch(()=>undefined)));
  }
  await SecureStore.deleteItemAsync(IDS_KEY);
}

export async function remindersEnabled(){
  return (await SecureStore.getItemAsync(ENABLED_KEY))==='1';
}

export async function enableEventReminders(tickets:ReminderTicket[]){
  const notifications=await getNotifications();
  if(!notifications){
    throw new Error('Event reminders require an OutNow development build on this device.');
  }

  await ensureChannel(notifications);
  const existing=await notifications.getPermissionsAsync();
  const permission=existing.status==='granted'?existing:await notifications.requestPermissionsAsync();
  if(permission.status!=='granted')throw new Error('Notification permission was not granted.');
  await SecureStore.setItemAsync(ENABLED_KEY,'1');
  return syncEventReminders(tickets,true);
}

export async function disableEventReminders(){
  await clearScheduled();
  await SecureStore.setItemAsync(ENABLED_KEY,'0');
}

export async function syncEventReminders(tickets:ReminderTicket[],force=false){
  if(!force&&!(await remindersEnabled()))return 0;

  const notifications=await getNotifications();
  if(!notifications)return 0;

  await ensureChannel(notifications);
  const permissions=await notifications.getPermissionsAsync();
  if(permissions.status!=='granted')return 0;
  await clearScheduled();

  const now=Date.now();
  const events=new Map<string,ReminderTicket['event']>();
  for(const ticket of tickets){
    const eventTime=new Date(ticket.event.date).getTime();
    if(Number.isFinite(eventTime)&&eventTime>now&&!['CANCELLED','COMPLETED'].includes(ticket.event.status))events.set(ticket.event.id,ticket.event);
  }

  const ids:string[]=[];
  for(const event of events.values()){
    const eventTime=new Date(event.date).getTime();
    for(const reminder of [{hours:24,label:'Tomorrow'},{hours:2,label:'Starting soon'}]){
      const triggerAt=eventTime-reminder.hours*60*60*1000;
      if(triggerAt<=now+30000)continue;
      const id=await notifications.scheduleNotificationAsync({
        content:{
          title:reminder.label==='Tomorrow'?`${event.title} is tomorrow`:`${event.title} starts in 2 hours`,
          body:`${event.venue} · ${event.location}`,
          data:{url:`/event/${event.id}`,eventId:event.id},
          sound:'default',
        },
        trigger:{
          type:notifications.SchedulableTriggerInputTypes.DATE,
          date:new Date(triggerAt),
          channelId:CHANNEL_ID,
        },
      });
      ids.push(id);
    }
  }
  await SecureStore.setItemAsync(IDS_KEY,JSON.stringify(ids));
  return ids.length;
}
