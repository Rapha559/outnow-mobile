import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { apiRequest } from '@/lib/api';

type LoginResponse = {
  success: true;
  requiresVerification: true;
  challengeToken: string;
  email: string;
  role: string;
};

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const data = await apiRequest<LoginResponse>('/api/mobile/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, rememberMe: true }),
      });

      router.replace({
        pathname: '/verify',
        params: {
          mode: 'login',
          challengeToken: data.challengeToken,
          maskedEmail: data.email,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.topRow}>
              <Pressable style={styles.back} onPress={() => router.back()}><Text style={styles.backText}>‹</Text></Pressable>
              <Text style={styles.brand}>OUTNOW</Text>
              <View style={styles.spacer} />
            </View>

            <Text style={styles.eyebrow}>WELCOME BACK</Text>
            <Text style={styles.title}>Sign in to OutNow</Text>
            <Text style={styles.copy}>Access your tickets, orders and account from the app.</Text>

            <View style={styles.form}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                placeholder="you@example.com"
                placeholderTextColor="#696974"
                style={styles.input}
              />

              <Text style={styles.label}>Password</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="current-password"
                placeholder="Your password"
                placeholderTextColor="#696974"
                style={styles.input}
              />

              {!!error && <Text style={styles.error}>{error}</Text>}

              <Pressable disabled={loading} style={[styles.primary, loading && styles.disabled]} onPress={() => void submit()}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Continue</Text>}
              </Pressable>
            </View>

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>New to OutNow?</Text>
              <Pressable onPress={() => router.replace('/signup')}><Text style={styles.link}>Create account</Text></Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#07070a' },
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 36 },
  topRow: { height: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 38 },
  back: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: '#292932', backgroundColor: '#15151b', alignItems: 'center', justifyContent: 'center' },
  backText: { color: '#fff', fontSize: 34, lineHeight: 36, marginTop: -3 },
  brand: { color: '#fff', fontWeight: '900', letterSpacing: 1.4, fontSize: 17 },
  spacer: { width: 40 },
  eyebrow: { color: '#a78bfa', fontSize: 11, fontWeight: '900', letterSpacing: 1.8 },
  title: { color: '#fff', fontSize: 34, lineHeight: 40, fontWeight: '900', marginTop: 10 },
  copy: { color: '#92929d', fontSize: 15, lineHeight: 22, marginTop: 9, maxWidth: 360 },
  form: { marginTop: 32 },
  label: { color: '#d8d8de', fontSize: 12, fontWeight: '800', marginBottom: 8, marginTop: 14 },
  input: { height: 54, borderRadius: 15, borderWidth: 1, borderColor: '#282831', backgroundColor: '#111116', color: '#fff', paddingHorizontal: 15, fontSize: 15 },
  error: { color: '#fb7185', fontSize: 13, lineHeight: 19, marginTop: 14 },
  primary: { height: 54, borderRadius: 16, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  disabled: { opacity: 0.65 },
  primaryText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  footerRow: { marginTop: 26, flexDirection: 'row', justifyContent: 'center', gap: 7 },
  footerText: { color: '#83838e' },
  link: { color: '#c4b5fd', fontWeight: '800' },
});
