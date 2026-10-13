import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { apiRequest } from '@/lib/api';

type SignupResponse = {
  success: true;
  requiresVerification: true;
  email: string;
  maskedEmail: string;
};

export default function SignupScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    if (!name.trim() || !email.trim() || !password) {
      setError('Name, email and password are required.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const data = await apiRequest<SignupResponse>('/api/mobile/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ name, email, phone, password, confirmPassword }),
      });

      router.replace({
        pathname: '/verify',
        params: {
          mode: 'signup',
          email: data.email,
          maskedEmail: data.maskedEmail,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create your account.');
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

            <Text style={styles.eyebrow}>JOIN OUTNOW</Text>
            <Text style={styles.title}>Create your account</Text>
            <Text style={styles.copy}>Buy tickets faster and keep every entry pass in one place.</Text>

            <View style={styles.form}>
              <Text style={styles.label}>Full name</Text>
              <TextInput value={name} onChangeText={setName} autoComplete="name" placeholder="Your name" placeholderTextColor="#696974" style={styles.input} />

              <Text style={styles.label}>Email</Text>
              <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" placeholder="you@example.com" placeholderTextColor="#696974" style={styles.input} />

              <Text style={styles.label}>Phone (optional)</Text>
              <TextInput value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" placeholder="Phone number" placeholderTextColor="#696974" style={styles.input} />

              <Text style={styles.label}>Password</Text>
              <TextInput value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" placeholder="At least 8 characters" placeholderTextColor="#696974" style={styles.input} />

              <Text style={styles.label}>Confirm password</Text>
              <TextInput value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry autoComplete="new-password" placeholder="Repeat password" placeholderTextColor="#696974" style={styles.input} />

              {!!error && <Text style={styles.error}>{error}</Text>}

              <Pressable disabled={loading} style={[styles.primary, loading && styles.disabled]} onPress={() => void submit()}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Create account</Text>}
              </Pressable>
            </View>

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Already have an account?</Text>
              <Pressable onPress={() => router.replace('/login')}><Text style={styles.link}>Sign in</Text></Pressable>
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
  content: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 40 },
  topRow: { height: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 30 },
  back: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: '#292932', backgroundColor: '#15151b', alignItems: 'center', justifyContent: 'center' },
  backText: { color: '#fff', fontSize: 34, lineHeight: 36, marginTop: -3 },
  brand: { color: '#fff', fontWeight: '900', letterSpacing: 1.4, fontSize: 17 },
  spacer: { width: 40 },
  eyebrow: { color: '#a78bfa', fontSize: 11, fontWeight: '900', letterSpacing: 1.8 },
  title: { color: '#fff', fontSize: 34, lineHeight: 40, fontWeight: '900', marginTop: 10 },
  copy: { color: '#92929d', fontSize: 15, lineHeight: 22, marginTop: 9 },
  form: { marginTop: 22 },
  label: { color: '#d8d8de', fontSize: 12, fontWeight: '800', marginBottom: 8, marginTop: 13 },
  input: { height: 54, borderRadius: 15, borderWidth: 1, borderColor: '#282831', backgroundColor: '#111116', color: '#fff', paddingHorizontal: 15, fontSize: 15 },
  error: { color: '#fb7185', fontSize: 13, lineHeight: 19, marginTop: 14 },
  primary: { height: 54, borderRadius: 16, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  disabled: { opacity: 0.65 },
  primaryText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  footerRow: { marginTop: 24, flexDirection: 'row', justifyContent: 'center', gap: 7 },
  footerText: { color: '#83838e' },
  link: { color: '#c4b5fd', fontWeight: '800' },
});
