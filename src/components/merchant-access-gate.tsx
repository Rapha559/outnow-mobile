import { ReactNode, useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  authenticateMerchant,
  BiometricCapability,
  getMerchantBiometricCapability,
  isMerchantBiometricEnabled,
  setMerchantBiometricEnabled,
} from '@/lib/merchant-biometric';

export type MerchantSecurity = {
  biometricEnabled: boolean;
  biometricAvailable: boolean;
  biometricLabel: string;
  notice: string | null;
  enableBiometrics: () => Promise<boolean>;
  disableBiometrics: () => Promise<boolean>;
  authenticateSensitiveAction: (action: string) => Promise<boolean>;
};

type Props = {
  userId: string;
  children: (security: MerchantSecurity) => ReactNode;
};

export function MerchantAccessGate({ userId, children }: Props) {
  const [capability, setCapability] = useState<BiometricCapability>({ available: false, label: 'device biometrics' });
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [checking, setChecking] = useState(true);
  const [locked, setLocked] = useState(false);
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadSecurity() {
      const [nextCapability, enabled] = await Promise.all([
        getMerchantBiometricCapability(),
        isMerchantBiometricEnabled(userId),
      ]);

      if (!active) return;
      setCapability(nextCapability);

      if (enabled && !nextCapability.available) {
        await setMerchantBiometricEnabled(userId, false);
        if (!active) return;
        setNotice(`${nextCapability.unavailableMessage ?? 'Biometric protection is unavailable.'} Your signed-in OutNow session remains available.`);
        setBiometricEnabled(false);
        setLocked(false);
      } else {
        setBiometricEnabled(enabled);
        setLocked(enabled);
      }

      if (active) setChecking(false);
    }

    void loadSecurity();
    return () => {
      active = false;
    };
  }, [userId]);

  const verify = useCallback(async (purpose: string) => {
    setWorking(true);
    const result = await authenticateMerchant(capability, purpose);
    setWorking(false);
    if (!result.success) setNotice(result.message ?? 'Authentication is required to continue.');
    return result.success;
  }, [capability]);

  const unlock = useCallback(async () => {
    setNotice(null);
    const success = await verify('open Box Office');
    if (success) setLocked(false);
  }, [verify]);

  const enableBiometrics = useCallback(async () => {
    if (!capability.available) {
      setNotice(capability.unavailableMessage ?? 'Biometric protection is unavailable on this device.');
      return false;
    }

    setNotice(null);
    const success = await verify('enable Box Office protection');
    if (!success) return false;

    const saved = await setMerchantBiometricEnabled(userId, true);
    if (!saved) {
      setNotice('OutNow could not save this security preference. Please try again.');
      return false;
    }
    setBiometricEnabled(true);
    setNotice(`${capability.label} will be required whenever Box Office is opened on this device.`);
    return true;
  }, [capability, userId, verify]);

  const disableBiometrics = useCallback(async () => {
    if (biometricEnabled && capability.available) {
      setNotice(null);
      const success = await verify('turn off Box Office protection');
      if (!success) return false;
    }

    const saved = await setMerchantBiometricEnabled(userId, false);
    if (!saved) {
      setNotice('OutNow could not update this security preference. Please try again.');
      return false;
    }
    setBiometricEnabled(false);
    setNotice('Biometric protection is off for Box Office on this device.');
    return true;
  }, [biometricEnabled, capability.available, userId, verify]);

  const authenticateSensitiveAction = useCallback(async (action: string) => {
    if (!biometricEnabled) return true;
    if (!capability.available) {
      await setMerchantBiometricEnabled(userId, false);
      setBiometricEnabled(false);
      setNotice(`${capability.unavailableMessage ?? 'Biometric protection is unavailable.'} Your signed-in session remains available.`);
      return true;
    }
    return verify(action);
  }, [biometricEnabled, capability, userId, verify]);

  if (checking) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#7c3aed" /></View>;
  }

  if (locked) {
    return <View style={styles.screen}><SafeAreaView edges={['top']} style={styles.safe}><View style={styles.locked}>
      <Text style={styles.eyebrow}>MERCHANT SECURITY</Text>
      <Text style={styles.title}>Unlock Box Office</Text>
      <Text style={styles.copy}>Confirm with {capability.label} before viewing door sales or accepting Tap to Pay payments.</Text>
      {!!notice && <Text style={styles.error}>{notice}</Text>}
      <Pressable disabled={working} onPress={() => void unlock()} style={[styles.primary, working && styles.disabled]}>
        {working ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Use {capability.label}</Text>}
      </Pressable>
      <Text style={styles.help}>If your biometrics are unavailable, use your device passcode when it is offered. You can return to the event without changing your OutNow sign-in.</Text>
    </View></SafeAreaView></View>;
  }

  return <>{children({
    biometricEnabled,
    biometricAvailable: capability.available,
    biometricLabel: capability.label,
    notice,
    enableBiometrics,
    disableBiometrics,
    authenticateSensitiveAction,
  })}</>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  locked: { flex: 1, justifyContent: 'center', padding: 28 },
  eyebrow: { color: '#7c3aed', fontSize: 10, fontWeight: '900', letterSpacing: 1.7 },
  title: { color: '#111827', fontSize: 32, fontWeight: '900', marginTop: 8 },
  copy: { color: '#6b7280', fontSize: 14, lineHeight: 21, marginTop: 10 },
  primary: { height: 54, borderRadius: 15, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  primaryText: { color: '#fff', fontWeight: '900' },
  disabled: { opacity: 0.55 },
  error: { color: '#b91c1c', fontSize: 12, lineHeight: 18, marginTop: 16 },
  help: { color: '#6b7280', fontSize: 11, lineHeight: 17, marginTop: 16 },
});
