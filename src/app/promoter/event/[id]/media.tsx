import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/lib/api';
import { pickAndUploadEventMedia } from '@/lib/event-image-upload';

type MediaItem = { id?: string; url: string; type: 'IMAGE' | 'VIDEO'; sortOrder?: number };
type MediaResponse = { success: true; media: MediaItem[]; coverImage: string | null; limits: { maxMedia: number; maxVideos: number }; message?: string };

export default function EventMediaScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { sessionToken } = useAuth();
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [limits, setLimits] = useState({ maxMedia: 10, maxVideos: 3 });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    if (!id || !sessionToken) return;
    try {
      setLoading(true);
      setError('');
      const data = await apiRequest<MediaResponse>(`/api/mobile/promoter/events/${id}/media`, {}, sessionToken);
      setMedia(data.media || []);
      if (data.limits) setLimits(data.limits);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load event media.');
    } finally {
      setLoading(false);
    }
  }, [id, sessionToken]);

  useEffect(() => { void load(); }, [load]);

  async function addMedia() {
    if (!sessionToken || media.length >= limits.maxMedia) return;
    try {
      setUploading(true);
      setError('');
      setMessage('');
      const uploaded = await pickAndUploadEventMedia(sessionToken);
      if (!uploaded) return;
      if (uploaded.type === 'VIDEO' && media.filter((item) => item.type === 'VIDEO').length >= limits.maxVideos) {
        setError(`You can add up to ${limits.maxVideos} videos.`);
        return;
      }
      setMedia((current) => [...current, { url: uploaded.url, type: uploaded.type }]);
      setMessage('Media uploaded. Save gallery changes to publish it.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add media.');
    } finally {
      setUploading(false);
    }
  }

  function removeAt(index: number) {
    setMedia((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setMessage('Media removed. Save gallery changes to publish it.');
  }

  function move(index: number, direction: -1 | 1) {
    setMedia((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) return current;
      const copy = [...current];
      [copy[index], copy[nextIndex]] = [copy[nextIndex], copy[index]];
      return copy;
    });
  }

  async function save() {
    if (!id || !sessionToken) return;
    if (media.length > 0 && !media.some((item) => item.type === 'IMAGE')) {
      setError('Your gallery must contain at least one photo.');
      return;
    }
    try {
      setSaving(true);
      setError('');
      setMessage('');
      const data = await apiRequest<MediaResponse>(
        `/api/mobile/promoter/events/${id}/media`,
        { method: 'PATCH', body: JSON.stringify({ media: media.map(({ url, type }) => ({ url, type })) }) },
        sessionToken,
      );
      setMedia(data.media || []);
      setMessage(data.message || 'Event gallery updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save event media.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <View style={styles.screen}><SafeAreaView style={styles.center}><ActivityIndicator size="large" color="#7c3aed" /></SafeAreaView></View>;
  }

  const videoCount = media.filter((item) => item.type === 'VIDEO').length;

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={styles.top}>
          <Pressable style={styles.circle} onPress={() => router.back()}><Text style={styles.back}>‹</Text></Pressable>
          <Text style={styles.topTitle}>Event Media</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.eyebrow}>PHOTOS & VIDEOS</Text>
          <Text style={styles.title}>Build your event gallery</Text>
          <Text style={styles.copy}>Add up to {limits.maxMedia} media items, including up to {limits.maxVideos} videos. The first photo becomes the event cover.</Text>

          <View style={styles.summary}><Text style={styles.summaryText}>{media.length}/{limits.maxMedia} items</Text><Text style={styles.summaryText}>{videoCount}/{limits.maxVideos} videos</Text></View>

          <Pressable disabled={uploading || media.length >= limits.maxMedia} style={[styles.addButton, (uploading || media.length >= limits.maxMedia) && styles.disabled]} onPress={() => void addMedia()}>
            {uploading ? <ActivityIndicator color="#7c3aed" /> : <Text style={styles.addText}>＋ Add photo or video</Text>}
          </Pressable>

          <View style={styles.list}>
            {media.length === 0 ? (
              <View style={styles.empty}><Text style={styles.emptyTitle}>No gallery media yet</Text><Text style={styles.copy}>Add at least one photo to create the public gallery.</Text></View>
            ) : media.map((item, index) => (
              <View key={`${item.url}-${index}`} style={styles.card}>
                {item.type === 'IMAGE' ? (
                  <Image source={{ uri: item.url }} style={styles.preview} contentFit="cover" />
                ) : (
                  <Pressable style={styles.videoPreview} onPress={() => void WebBrowser.openBrowserAsync(item.url)}>
                    <Text style={styles.videoIcon}>▶</Text>
                    <Text style={styles.videoLabel}>Video {index + 1}</Text>
                    <Text style={styles.videoHint}>Tap to preview</Text>
                  </Pressable>
                )}
                <View style={styles.cardBody}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>{index === 0 && item.type === 'IMAGE' ? 'Cover photo' : item.type === 'VIDEO' ? 'Video' : 'Photo'}</Text>
                    <Text style={styles.itemSub}>{item.type === 'VIDEO' ? 'Public gallery video' : 'Public gallery image'}</Text>
                  </View>
                  <View style={styles.controls}>
                    <Pressable disabled={index === 0} style={[styles.smallButton, index === 0 && styles.disabled]} onPress={() => move(index, -1)}><Text style={styles.smallButtonText}>↑</Text></Pressable>
                    <Pressable disabled={index === media.length - 1} style={[styles.smallButton, index === media.length - 1 && styles.disabled]} onPress={() => move(index, 1)}><Text style={styles.smallButtonText}>↓</Text></Pressable>
                    <Pressable style={styles.removeButton} onPress={() => removeAt(index)}><Text style={styles.removeText}>Remove</Text></Pressable>
                  </View>
                </View>
              </View>
            ))}
          </View>

          {!!error && <Text style={styles.error}>{error}</Text>}
          {!!message && <Text style={styles.success}>{message}</Text>}
          <Pressable disabled={saving || uploading} style={[styles.primary, (saving || uploading) && styles.disabled]} onPress={() => void save()}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Save gallery changes</Text>}
          </Pressable>
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' }, safe: { flex: 1 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center' }, content: { paddingHorizontal: 18 },
  top: { height: 58, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, circle: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#f9fafb', alignItems: 'center', justifyContent: 'center' }, back: { fontSize: 34, lineHeight: 36, marginTop: -3, color: '#111827' }, topTitle: { color: '#111827', fontWeight: '900' },
  eyebrow: { color: '#7c3aed', fontSize: 11, fontWeight: '900', letterSpacing: 1.6, marginTop: 12 }, title: { color: '#111827', fontSize: 30, lineHeight: 36, fontWeight: '900', marginTop: 8 }, copy: { color: '#6b7280', fontSize: 13, lineHeight: 20, marginTop: 8 },
  summary: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 18, padding: 14, borderRadius: 16, backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb' }, summaryText: { color: '#374151', fontSize: 12, fontWeight: '800' },
  addButton: { height: 50, borderRadius: 15, borderWidth: 1, borderColor: '#7c3aed', backgroundColor: '#faf8ff', alignItems: 'center', justifyContent: 'center', marginTop: 14 }, addText: { color: '#7c3aed', fontWeight: '900' }, list: { gap: 14, marginTop: 18 },
  empty: { borderRadius: 18, borderWidth: 1, borderColor: '#e5e7eb', padding: 20, alignItems: 'center' }, emptyTitle: { color: '#111827', fontWeight: '900', fontSize: 17 },
  card: { borderRadius: 20, borderWidth: 1, borderColor: '#e5e7eb', overflow: 'hidden', backgroundColor: '#fff' }, preview: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#f3f4f6' }, videoPreview: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#f3efff', alignItems: 'center', justifyContent: 'center' }, videoIcon: { color: '#7c3aed', fontSize: 34, fontWeight: '900' }, videoLabel: { color: '#111827', fontWeight: '900', marginTop: 8 }, videoHint: { color: '#6b7280', fontSize: 11, marginTop: 3 },
  cardBody: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }, itemTitle: { color: '#111827', fontWeight: '900' }, itemSub: { color: '#6b7280', fontSize: 11, marginTop: 3 }, controls: { flexDirection: 'row', alignItems: 'center', gap: 7 }, smallButton: { width: 36, height: 36, borderRadius: 11, borderWidth: 1, borderColor: '#d1d5db', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' }, smallButtonText: { color: '#374151', fontWeight: '900' }, removeButton: { height: 36, paddingHorizontal: 10, borderRadius: 11, backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center' }, removeText: { color: '#dc2626', fontSize: 11, fontWeight: '900' },
  error: { color: '#dc2626', fontSize: 13, lineHeight: 19, marginTop: 18 }, success: { color: '#15803d', fontSize: 13, lineHeight: 19, marginTop: 18 }, primary: { height: 54, borderRadius: 16, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center', marginTop: 22 }, primaryText: { color: '#fff', fontWeight: '900' }, disabled: { opacity: 0.45 },
});
