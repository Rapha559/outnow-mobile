import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#07070a' },
        }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="event/[id]" />
      </Stack>
    </>
  );
}
