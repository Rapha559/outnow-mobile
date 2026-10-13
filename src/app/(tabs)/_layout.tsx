import { NativeTabs } from 'expo-router/unstable-native-tabs';

export default function TabsLayout() {
  return (
    <NativeTabs
      backgroundColor="#ffffff"
      tintColor="#7c3aed"
      iconColor={{ default: '#6b7280', selected: '#7c3aed' }}
      labelStyle={{
        default: { color: '#6b7280' },
        selected: { color: '#7c3aed', fontWeight: '700' },
      }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md={{ default: 'home', selected: 'home_filled' }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="explore">
        <NativeTabs.Trigger.Label>Explore</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'magnifyingglass', selected: 'magnifyingglass' }} md={{ default: 'search', selected: 'search' }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="saved">
        <NativeTabs.Trigger.Label>Saved</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'heart', selected: 'heart.fill' }} md={{ default: 'favorite_border', selected: 'favorite' }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="tickets">
        <NativeTabs.Trigger.Label>Tickets</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'ticket', selected: 'ticket.fill' }} md={{ default: 'confirmation_number', selected: 'confirmation_number' }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }} md={{ default: 'account_circle', selected: 'account_circle' }} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
