import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, AppState, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/lib/api';

type IdentityStatus = { success: true; identity: { status: string; verified: boolean; required: boolean; updatedAt: string | null } };
type IdentityStart = { success: true; status: string; url: string | null };
type DocumentType = 'passport' | 'driving_license' | 'id_card';
const documents: Array<{type:DocumentType; label:string; description:string}> = [
  {type:'passport',label:'Passport',description:'Photograph your photo and details page'},
  {type:'driving_license',label:'Driving licence',description:'Front and back if requested by Stripe'},
  {type:'id_card',label:'National identity card',description:'Front and back if requested by Stripe'},
];

export function PromoterIdentityCard() {
  const { sessionToken, user } = useAuth();
  const [status, setStatus] = useState('NOT_STARTED');
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [selectedDocument, setSelectedDocument] = useState<DocumentType | null>(null);

  const refresh = useCallback(async () => {
    if (!sessionToken || user?.role !== 'PROMOTER') return;
    try {
      const result = await apiRequest<IdentityStatus>('/api/mobile/promoter/identity', {}, sessionToken);
      setStatus(result.identity.status);
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load verification status.');
    } finally {
      setLoading(false);
    }
  }, [sessionToken, user?.role]);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    const listener = AppState.addEventListener('change', state => {
      if (state === 'active') void refresh();
    });
    return () => listener.remove();
  }, [refresh]);

  async function begin() {
    if (!sessionToken || !selectedDocument) return;
    try {
      setWorking(true);
      setError('');
      const result = await apiRequest<IdentityStart>(
        '/api/mobile/promoter/identity',
        { method: 'POST', body: JSON.stringify({ documentType: selectedDocument }) },
        sessionToken,
      );
      if (result.url) await WebBrowser.openBrowserAsync(result.url);
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to open Stripe verification.');
    } finally {
      setWorking(false);
    }
  }

  const descriptions: Record<string, string> = {
    NOT_STARTED: 'Verify your government ID and matching selfie securely with Stripe.',
    REQUIRES_INPUT: 'Stripe needs you to complete or retry the ID check.',
    PROCESSING: 'Stripe is reviewing your identity documents.',
    VERIFIED: 'Your identity has been verified by Stripe.',
    CANCELED: 'Verification was cancelled. You can start again.',
  };

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>PROMOTER IDENTITY</Text>
      <Text style={styles.title}>{status === 'VERIFIED' ? '✓ Identity verified' : 'Verify your ID'}</Text>
      <Text style={styles.copy}>{descriptions[status] || 'Check your current identity status.'}</Text>
      <Text style={styles.note}>Stripe handles document and selfie collection. OutNow does not store your ID images. This check is separate from Stripe Connect.</Text>
      {!!error && <Text style={styles.error}>{error}</Text>}
      {loading ? <ActivityIndicator color="#7c3aed" /> : (
        <View style={styles.actions}>
          {status !== 'VERIFIED' && status !== 'PROCESSING' && (
            <>
              <Text style={styles.choiceLabel}>Choose your ID document</Text>
              {documents.map(item => (
                <Pressable
                  key={item.type}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: selectedDocument === item.type }}
                  disabled={working}
                  style={[styles.documentOption, selectedDocument === item.type && styles.documentSelected]}
                  onPress={() => setSelectedDocument(item.type)}
                >
                  <Text style={styles.radioIndicator}>{selectedDocument === item.type ? '◉' : '◯'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.documentName}>{item.label}</Text>
                    <Text style={styles.documentDescription}>{item.description}</Text>
                  </View>
                </Pressable>
              ))}
              <Pressable disabled={working || !selectedDocument} style={[styles.button, !selectedDocument && styles.buttonDisabled]} onPress={() => void begin()}>
                {working ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Continue to Stripe verification</Text>}
              </Pressable>
            </>
          )}
          <Pressable disabled={working} style={styles.secondary} onPress={() => void refresh()}>
            <Text style={styles.secondaryText}>Refresh status</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 18, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: '#ddd6fe', backgroundColor: '#faf7ff' },
  eyebrow: { fontSize: 10, color: '#7c3aed', fontWeight: '900', letterSpacing: 1.3 },
  title: { fontSize: 20, color: '#111827', fontWeight: '900', marginTop: 8 },
  copy: { fontSize: 13, color: '#374151', lineHeight: 20, marginTop: 8 },
  note: { fontSize: 11, color: '#6b7280', lineHeight: 17, marginTop: 8 },
  error: { fontSize: 12, color: '#b91c1c', marginTop: 10 },
  actions: { marginTop: 12, gap: 10 },
  button: { minHeight: 48, borderRadius: 12, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center', padding: 10 },
  buttonText: { color: '#fff', fontWeight: '900', fontSize: 13 },
  secondary: { minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: '#c4b5fd' },
  secondaryText: { color: '#6d28d9', fontWeight: '800', fontSize: 12 },
  choiceLabel: { color: '#312e81', fontSize: 13, fontWeight: '900' },
  documentOption: { padding: 12, minHeight: 62, borderRadius: 12, flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: '#fff', borderColor: '#ddd6fe', borderWidth: 1 },
  documentSelected: { borderColor: '#7c3aed', backgroundColor: '#f3e8ff' },
  radioIndicator: { fontSize: 22, color: '#7c3aed' },
  documentName: { fontSize: 13, color: '#111827', fontWeight: '800' },
  documentDescription: { fontSize: 11, marginTop: 3, color: '#6b7280' },
  buttonDisabled: { opacity: 0.5 },
});
