import { router, usePathname } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native';

import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/lib/api';

type StaffAccessResponse = {
  success: true;
  hasScannerAccess: boolean;
  assignments: Array<{
    id: string;
    role: 'SCANNER';
    event: { id: string; title: string };
  }>;
};

export function StaffScannerShortcut() {
  const { user, sessionToken } = useAuth();
  const pathname = usePathname();
  const dark = useColorScheme() === 'dark';
  const [hasScannerAccess, setHasScannerAccess] = useState(false);
  const [assignmentCount, setAssignmentCount] = useState(0);

  useEffect(() => {
    let active = true;

    if (!sessionToken || user?.role !== 'CUSTOMER') {
      setHasScannerAccess(false);
      setAssignmentCount(0);
      return () => {
        active = false;
      };
    }

    apiRequest<StaffAccessResponse>('/api/mobile/staff/access', {}, sessionToken)
      .then((data) => {
        if (!active) return;
        setHasScannerAccess(Boolean(data.hasScannerAccess));
        setAssignmentCount(data.assignments?.length || 0);
      })
      .catch(() => {
        if (!active) return;
        setHasScannerAccess(false);
        setAssignmentCount(0);
      });

    return () => {
      active = false;
    };
  }, [sessionToken, user?.role]);

  const showOnThisScreen = useMemo(
    () => pathname === '/' || pathname === '/profile',
    [pathname],
  );

  if (!hasScannerAccess || !showOnThisScreen) return null;

  return (
    <View pointerEvents="box-none" style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open staff ticket scanner"
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: dark ? '#6d28d9' : '#7c3aed' },
          pressed && styles.pressed,
        ]}
        onPress={() => router.push('/staff')}
      >
        <View style={styles.iconWrap}>
          <Text style={styles.icon}>⌗</Text>
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.title}>Scan tickets</Text>
          <Text style={styles.subtitle}>
            {assignmentCount === 1 ? '1 assigned event' : `${assignmentCount} assigned events`}
          </Text>
        </View>
        <Text style={styles.arrow}>›</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 88,
    zIndex: 50,
  },
  button: {
    minHeight: 64,
    borderRadius: 20,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  pressed: { transform: [{ scale: 0.985 }], opacity: 0.94 },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { color: '#fff', fontSize: 24, fontWeight: '900' },
  textWrap: { flex: 1, marginLeft: 12 },
  title: { color: '#fff', fontSize: 15, fontWeight: '900' },
  subtitle: { color: '#ede9fe', fontSize: 10, fontWeight: '700', marginTop: 3 },
  arrow: { color: '#fff', fontSize: 28, marginLeft: 8 },
});
