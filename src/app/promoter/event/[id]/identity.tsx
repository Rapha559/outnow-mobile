import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/lib/api';
import { pickAndUploadHeadlinerImage } from '@/lib/event-image-upload';

type IdentityData = {
  success: true;
  organiserName: string;
  headlinerName: string;
  headlinerImageUrl: string;
  message?: string;
};

export default function EventIdentityScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { sessionToken } = useAuth();
  const [organiserName, setOrganiserName] = useState('');
  const [headlinerName, setHeadlinerName] = useState('');
  const [headlinerImageUrl, setHeadlinerImageUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    if (!id || !sessionToken) return;
    try {
      setLoading(true);
      setError('');
      const data = await apiRequest<IdentityData>(`/api/mobile/promoter/events/${id}/headliner`, {}, sessionToken);
      setOrganiserName(data.organiserName || '');
      setHeadlinerName(data.headlinerName || '');
      setHeadlinerImageUrl(data.headlinerImageUrl || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load organiser and headliner.');
    } finally {
      setLoading(false);
    }
  }, [id, sessionToken]);

  useEffect(() => { void load(); }, [load]);

  async function choosePhoto() {
    if (!sessionToken) return;
    try {
      setUploading(true);
      setError('');
      setMessage('');
      const uploaded = await pickAndUploadHeadlinerImage(sessionToken);
      if (uploaded) {
        setHeadlinerImageUrl(uploaded.url);
        setMessage('Photo uploaded. Save changes to publish it.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to upload headliner photo.');
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!id || !sessionToken) return;
    try {
      setSaving(true);
      setError('');
      setMessage('');
      const data = await apiRequest<IdentityData>(
        `/api/mobile/promoter/events/${id}/headliner`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            organiserName,
            headlinerName,
            headlinerImageUrl: headlinerImageUrl || null,
          }),
        },
        sessionToken,
      );
      setOrganiserName(data.organiserName || '');
      setHeadlinerName(data.headlinerName || '');
      setHeadlinerImageUrl(data.headlinerImageUrl || '');
      setMessage(data.message || 'Event identity updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save organiser and headliner.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <View style={styles.screen}><SafeAreaView style={styles.center}><ActivityIndicator size="large" color="#7c3aed" /></SafeAreaView></View>;
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={styles.top}>
          <Pressable style={styles.circle} onPress={() => router.back()}><Text style={styles.back}>‹</Text></Pressable>
          <Text style={styles.topTitle}>Organiser & Headliner</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.eyebrow}>PUBLIC EVENT IDENTITY</Text>
          <Text style={styles.title}>Who is behind the event?</Text>
          <Text style={styles.copy}>These details appear on the customer event page and can be updated without an admin review.</Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Organiser</Text>
            <Text style={styles.label}>Organiser name</Text>
            <TextInput value={organiserName} onChangeText={setOrganiserName} maxLength={160} placeholder="e.g. OutNow Events Ltd" placeholderTextColor="#9ca3af" style={styles.input} />
            <Text style={styles.helper}>If left blank, your promoter business name is used.</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Headliner</Text>
            <Text style={styles.label}>Headliner name</Text>
            <TextInput value={headlinerName} onChangeText={setHeadlinerName} maxLength={160} placeholder="e.g. Burna Boy" placeholderTextColor="#9ca3af" style={styles.input} />
            <View style={styles.photoRow}>
              {headlinerImageUrl ? (
                <Image source={{ uri: headlinerImageUrl }} style={styles.photo} contentFit="cover" />
              ) : (
                <View style={styles.photoFallback}><Text style={styles.initial}>{headlinerName.trim().charAt(0).toUpperCase() || 'H'}</Text></View>
              )}
              <View style={styles.photoActions}>
                <Pressable disabled={uploading || saving} style={styles.outlineButton} onPress={() => void choosePhoto()}>
                  {uploading ? <ActivityIndicator color="#7c3aed" /> : <Text style={styles.outlineText}>{headlinerImageUrl ? 'Replace photo' : 'Choose photo'}</Text>}
                </Pressable>
                {!!headlinerImageUrl && <Pressable disabled={saving} onPress={() => { setHeadlinerImageUrl(''); setMessage('Photo removed. Save changes to publish it.'); }}><Text style={styles.remove}>Remove photo</Text></Pressable>}
              </View>
            </View>
          </View>

          {!!error && <Text style={styles.error}>{error}</Text>}
          {!!message && <Text style={styles.success}>{message}</Text>}
          <Pressable disabled={saving || uploading} style={[styles.primary, (saving || uploading) && styles.disabled]} onPress={() => void save()}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Save organiser & headliner</Text>}
          </Pressable>
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' }, safe: { flex: 1 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center' }, content: { paddingHorizontal: 18 },
  top: { height: 58, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, circle: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' }, back: { fontSize: 34, lineHeight: 36, marginTop: -3, color: '#111827' }, topTitle: { color: '#111827', fontWeight: '900' },
  eyebrow: { color: '#7c3aed', fontSize: 11, fontWeight: '900', letterSpacing: 1.6, marginTop: 12 }, title: { color: '#111827', fontSize: 30, lineHeight: 36, fontWeight: '900', marginTop: 8 }, copy: { color: '#6b7280', fontSize: 13, lineHeight: 20, marginTop: 8 },
  section: { marginTop: 22, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 20, padding: 16 }, sectionTitle: { color: '#111827', fontSize: 19, fontWeight: '900', marginBottom: 12 }, label: { color: '#374151', fontSize: 12, fontWeight: '800', marginBottom: 7 }, input: { height: 50, borderRadius: 14, borderWidth: 1, borderColor: '#d1d5db', backgroundColor: '#f9fafb', paddingHorizontal: 14, color: '#111827', fontSize: 15 }, helper: { color: '#6b7280', fontSize: 11, lineHeight: 17, marginTop: 8 },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 16 }, photo: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#f3f4f6' }, photoFallback: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#f3efff', borderWidth: 1, borderColor: '#ddd6fe', alignItems: 'center', justifyContent: 'center' }, initial: { color: '#7c3aed', fontSize: 32, fontWeight: '900' }, photoActions: { flex: 1, gap: 10 }, outlineButton: { minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: '#7c3aed', backgroundColor: '#faf8ff', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 }, outlineText: { color: '#7c3aed', fontWeight: '900', textAlign: 'center' }, remove: { color: '#dc2626', fontSize: 12, fontWeight: '800' },
  error: { color: '#dc2626', fontSize: 13, lineHeight: 19, marginTop: 18 }, success: { color: '#15803d', fontSize: 13, lineHeight: 19, marginTop: 18 }, primary: { height: 54, borderRadius: 16, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center', marginTop: 22 }, primaryText: { color: '#fff', fontWeight: '900' }, disabled: { opacity: 0.5 },
});
