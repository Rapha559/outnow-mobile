import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/lib/api';

type SessionResponse = {
  success: true;
  sessionToken: string;
  expiresAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    role: 'CUSTOMER' | 'PROMOTER';
  };
};

export default function VerifyScreen() {
  const params = useLocalSearchParams<{
    mode?: string;
    email?: string;
    maskedEmail?: string;
    challengeToken?: string;
  }>();
  const { saveSession } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const mode = params.mode === 'signup' ? 'signup' : 'login';

  async function verify() {
    if (!/^[0-9]{6}$/.test(code)) {
      setError('Enter the 6-digit code from your email.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const path = mode === 'signup'
        ? '/api/mobile/auth/signup/verify'
        : '/api/mobile/auth/login/verify';
      const body = mode === 'signup'
        ? { email: params.email, code }
        : { challengeToken: params.challengeToken, code };

      const data = await apiRequest<SessionResponse>(path, {
        method: 'POST',
        body: JSON.stringify(body),
      });

      await saveSession(data.sessionToken, data.user);
      router.replace('/(tabs)/profile');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to verify your code.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.topRow}>
            <Pressable style={styles.back} onPress={() => router.back()}><Text style={styles.backText}>‹</Text></Pressable>
            <Text style={styles.brand}>OUTNOW</Text>
            <View style={styles.spacer} />
          </View>

          <View style={styles.icon}><Text style={styles.iconText}>✉</Text></View>
          <Text style={styles.eyebrow}>EMAIL VERIFICATION</Text>
          <Text style={styles.title}>Check your inbox</Text>
          <Text style={styles.copy}>
            We sent a 6-digit verification code to {params.maskedEmail || params.email || 'your email'}.
          </Text>

          <TextInput
            value={code}
            onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            maxLength={6}
            placeholder="000000"
            placeholderTextColor="#4d4d58"
            style={styles.codeInput}
          />

          {!!error && <Text style={styles.error}>{error}</Text>}

          <Pressable disabled={loading} style={[styles.primary, loading && styles.disabled]} onPress={() => void verify()}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Verify and continue</Text>}
          </Pressable>

          <Text style={styles.note}>Codes expire after 10 minutes. If it expires, return and start again.</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#07070a' },
  safeArea: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 20 },
  topRow: { height: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 42 },
  back: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: '#292932', backgroundColor: '#15151b', alignItems: 'center', justifyContent: 'center' },
  backText: { color: '#fff', fontSize: 34, lineHeight: 36, marginTop: -3 },
  brand: { color: '#fff', fontWeight: '900', letterSpacing: 1.4, fontSize: 17 },
  spacer: { width: 40 },
  icon: { width: 62, height: 62, borderRadius: 31, backgroundColor: '#1b1624', borderWidth: 1, borderColor: '#3a2a51', alignItems: 'center', justifyContent: 'center', marginBottom: 26 },
  iconText: { fontSize: 26 },
  eyebrow: { color: '#a78bfa', fontSize: 11, fontWeight: '900', letterSpacing: 1.8 },
  title: { color: '#fff', fontSize: 34, lineHeight: 40, fontWeight: '900', marginTop: 10 },
  copy: { color: '#92929d', fontSize: 15, lineHeight: 22, marginTop: 9 },
  codeInput: { height: 68, borderRadius: 18, borderWidth: 1, borderColor: '#343440', backgroundColor: '#111116', color: '#fff', textAlign: 'center', fontSize: 30, fontWeight: '900', letterSpacing: 10, marginTop: 32, paddingLeft: 10 },
  error: { color: '#fb7185', fontSize: 13, lineHeight: 19, marginTop: 14 },
  primary: { height: 54, borderRadius: 16, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center', marginTop: 22 },
  disabled: { opacity: 0.65 },
  primaryText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  note: { color: '#6f6f7a', fontSize: 11, textAlign: 'center', lineHeight: 17, marginTop: 14, paddingHorizontal: 14 },
});
