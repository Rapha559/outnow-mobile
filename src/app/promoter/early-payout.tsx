import { router } from 'expo-router';
import { File as ExpoFile } from 'expo-file-system';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet,
  Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/auth-context';
import { API_BASE, apiRequest } from '@/lib/api';

type EventOption = { id: string; title: string; venue: string; date: string };
type Check = { key: string; label: string; done: boolean; status: string; note: string | null };
type DocumentMeta = { id: string; category: string; filename: string; sizeBytes: number };
const EVIDENCE_TYPES = [
  { category: 'VENUE_BOOKING', label: 'Venue booking agreement or receipt' },
  { category: 'PERFORMER_CONTRACTS', label: 'Performer / organiser contract' },
  { category: 'BUSINESS_DETAILS', label: 'Business verification document' },
] as const;
type EvidenceCategory = typeof EVIDENCE_TYPES[number]['category'];
type Application = {
  documents: DocumentMeta[];
  id: string; eventId: string; eventTitle: string; amount: number; purpose: string;
  status: string; createdAt: string; reviewNotes: string | null;
  checks: Check[]; checksComplete: boolean;
};
type EarlyPayoutResponse = {
  success: true;
  events: EventOption[];
  applications: Application[];
  transfersEnabled: false;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value || 0);
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  }).format(new Date(value));
}

export default function PromoterEarlyPayoutScreen() {
  const { sessionToken, user } = useAuth();
  const [events, setEvents] = useState<EventOption[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [eventId, setEventId] = useState('');
  const [eventChooserOpen, setEventChooserOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState('');
  const [evidence, setEvidence] = useState<Partial<Record<EvidenceCategory, { uri: string; name: string; mimeType: string; size: number }>>>({});
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async (refresh = false) => {
    if (!sessionToken || user?.role !== 'PROMOTER') {
      setLoading(false);
      return;
    }
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError('');
      const result = await apiRequest<EarlyPayoutResponse>(
        '/api/mobile/promoter/early-payout', {}, sessionToken,
      );
      setEvents(result.events || []);
      setApplications(result.applications || []);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load applications.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sessionToken, user?.role]);

  useEffect(() => { void load(); }, [load]);

  const selectedEvent = events.find(event => event.id === eventId);
  const validAmount = /^\d+(?:\.\d{1,2})?$/.test(amount.trim()) &&
    Number(amount) > 0 && Number(amount) <= 100000;
  const canSubmit = !!sessionToken && !!eventId && validAmount &&
    purpose.trim().length >= 15 && purpose.trim().length <= 1000 &&
    EVIDENCE_TYPES.every(kind => !!evidence[kind.category]) &&
    accepted && !saving;

  async function chooseDocument(category: EvidenceCategory) {
    try {
      const picked = await ExpoFile.pickFileAsync({ mimeTypes: ['application/pdf', 'image/jpeg', 'image/png'] });
      if (picked.canceled || picked.result.length === 0) return;
      const file = picked.result[0];
      const extension = file.name.toLowerCase().split('.').pop();
      if (!['pdf', 'jpg', 'jpeg', 'png'].includes(extension || '')) throw new Error('Choose a PDF, JPG or PNG document.');
      if (file.size <= 0 || file.size > 4 * 1024 * 1024) throw new Error('Document must be 4 MB or smaller.');
      const mimeType = extension === 'pdf' ? 'application/pdf' : extension === 'png' ? 'image/png' : 'image/jpeg';
      setEvidence(previous => ({ ...previous, [category]: { uri: file.uri, name: file.name, mimeType, size: file.size } }));
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to choose document.');
    }
  }

  async function uploadDocument(applicationId: string, category: EvidenceCategory, selectedFile: { uri: string; name: string; mimeType: string }) {
    if (!sessionToken) throw new Error('Session expired.');
    const form = new FormData();
    form.append('applicationId', applicationId);
    form.append('category', category);
    // React Native supports a file URI for multipart uploads.
    form.append('file', { uri: selectedFile.uri, name: selectedFile.name, type: selectedFile.mimeType } as unknown as Blob);
    const response = await fetch(API_BASE + '/api/mobile/promoter/early-payout/documents', {
      method: 'POST',
      headers: { authorization: 'Bearer ' + sessionToken, accept: 'application/json' },
      body: form,
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.error || 'Document upload failed.');
  }

  async function replaceDocument(applicationId: string, category: EvidenceCategory) {
    try {
      const picked = await ExpoFile.pickFileAsync({ mimeTypes: ['application/pdf', 'image/jpeg', 'image/png'] });
      if (picked.canceled || picked.result.length === 0) return;
      const file = picked.result[0];
      const ext = file.name.toLowerCase().split('.').pop();
      if (!['pdf', 'jpg', 'jpeg', 'png'].includes(ext || '') || file.size <= 0 || file.size > 4 * 1024 * 1024) {
        throw new Error('Choose a PDF, JPG or PNG document of at most 4 MB.');
      }
      const mimeType = ext === 'pdf' ? 'application/pdf' : ext === 'png' ? 'image/png' : 'image/jpeg';
      setUploadingKey(applicationId + category); setError('');
      await uploadDocument(applicationId, category, { uri: file.uri, name: file.name, mimeType });
      setMessage('Document uploaded. Admin verification is pending.');
      await load(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to replace document.');
    } finally { setUploadingKey(null); }
  }

  async function submit() {
    if (!sessionToken || !canSubmit) return;
    Alert.alert(
      'Submit eligibility application?',
      'OutNow will review the seven requirements and financial risk. Submitting does not release money or guarantee funding.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Submit application', onPress: () => void performSubmit() },
      ],
    );
  }

  async function performSubmit() {
    if (!sessionToken || !canSubmit) return;
    try {
      setSaving(true);
      setError('');
      setMessage('');
      const result = await apiRequest<{ success: true; id: string; message: string }>(
        '/api/mobile/promoter/early-payout',
        {
          method: 'POST',
          body: JSON.stringify({
            eventId, amount: Number(amount), purpose: purpose.trim(),
            acceptAgreement: accepted,
          }),
        },
        sessionToken,
      );
      const failures: string[] = [];
      for (const kind of EVIDENCE_TYPES) {
        const file = evidence[kind.category];
        if (!file) continue;
        try {
          setUploadingKey(kind.category);
          await uploadDocument(result.id, kind.category, file);
        } catch (reason) {
          failures.push(kind.label + ': ' + (reason instanceof Error ? reason.message : 'Upload failed'));
        }
      }
      if (failures.length) {
        setError('Application created, but some documents failed to upload. Retry them in Your applications: ' + failures.join('; '));
      } else {
        setMessage('Application and all three documents submitted for admin review.');
      }
      setEvidence({});
      setEventId('');
      setAmount('');
      setPurpose('');
      setAccepted(false);
      await load(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not submit application.');
    } finally {
      setSaving(false);
    }
  }

  if (user?.role !== 'PROMOTER') {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.center}>
          <Text style={styles.heading}>Promoter access required</Text>
          <Pressable onPress={() => router.back()}><Text style={styles.link}>Go back</Text></Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} accessibilityLabel="Back to payouts" style={styles.backButton}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Early payouts</Text>
        <Pressable onPress={() => void load(true)} accessibilityLabel="Refresh early payout status" style={styles.backButton}>
          <Text style={styles.refreshText}>↻</Text>
        </Pressable>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor="#7c3aed" />}>
        <Text style={styles.eyebrow}>OUTNOW PROMOTER PORTAL</Text>
        <Text style={styles.title}>Early payout applications</Text>
        <Text style={styles.description}>Apply for eligibility review before your event. OutNow will check seven mandatory requirements and financial exposure. This feature does not send money.</Text>

        {!!error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}
        {!!message && <View style={styles.successBox}><Text style={styles.successText}>{message}</Text></View>}

        {loading ? <ActivityIndicator size="large" color="#7c3aed" style={{ marginVertical: 40 }} /> : (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Request a review</Text>

              <Text style={styles.label}>Upcoming approved event</Text>
              <Pressable style={styles.input} accessibilityRole="button"
                onPress={() => setEventChooserOpen(!eventChooserOpen)}>
                <Text style={selectedEvent ? styles.inputText : styles.placeholder}>
                  {selectedEvent ? `${selectedEvent.title} · ${formatDate(selectedEvent.date)}` : 'Choose an event'}
                </Text>
                <Text style={styles.arrow}>⌄</Text>
              </Pressable>
              {eventChooserOpen && <View style={styles.eventList}>
                {events.length === 0 && <Text style={styles.muted}>No eligible upcoming events are available.</Text>}
                {events.map(event => (
                  <Pressable key={event.id} style={styles.eventItem} onPress={() => {
                    setEventId(event.id);
                    setEventChooserOpen(false);
                  }}>
                    <Text style={styles.eventName}>{event.title}</Text>
                    <Text style={styles.muted}>{formatDate(event.date)} · {event.venue}</Text>
                  </Pressable>
                ))}
              </View>}

              <Text style={styles.label}>Amount requested (£)</Text>
              <TextInput style={styles.input} keyboardType="decimal-pad" placeholder="e.g. 1500.00"
                placeholderTextColor="#9ca3af" value={amount} onChangeText={setAmount} maxLength={12} />

              <Text style={styles.label}>Purpose of the request</Text>
              <TextInput style={[styles.input, styles.multiline]} multiline textAlignVertical="top"
                placeholder="Describe how funds would support this event (at least 15 characters)"
                placeholderTextColor="#9ca3af" value={purpose} onChangeText={setPurpose} maxLength={1000} />

              <Text style={styles.help}>Upload each supporting document (PDF, JPG or PNG, max 4 MB). Only authorised OutNow admins may download them. Do not upload IDs or selfies here — use Stripe Identity.</Text>
              {EVIDENCE_TYPES.map(kind => (
                <View key={kind.category}>
                  <Text style={styles.label}>{kind.label} *</Text>
                  <Pressable accessibilityRole="button" style={styles.fileButton}
                    onPress={() => void chooseDocument(kind.category)}>
                    <Text style={styles.fileButtonText}>{evidence[kind.category]?.name || 'Choose PDF / JPG / PNG'}</Text>
                  </Pressable>
                </View>
              ))}
              <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: accepted }}
                style={styles.agreement} onPress={() => setAccepted(!accepted)}>
                <Text style={styles.checkbox}>{accepted ? '☑' : '☐'}</Text>
                <Text style={styles.agreementText}>I confirm my application is accurate. Future funding requires a separate signed agreement, financial review and written approval. This acknowledgement is not a binding payout agreement.</Text>
              </Pressable>

              <Pressable disabled={!canSubmit} style={[styles.primary, !canSubmit && styles.disabled]} onPress={() => void submit()}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Submit eligibility application</Text>}
              </Pressable>
              <Text style={styles.disclaimer}>Applications do not automatically approve or release any funds.</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Your applications</Text>
              {applications.length === 0 ? <Text style={styles.muted}>No early payout applications yet.</Text> :
                applications.map(app => {
                  const expanded = expandedId === app.id;
                  const completed = app.checks.filter(check => check.done).length;
                  return <View key={app.id} style={styles.application}>
                    <Pressable onPress={() => setExpandedId(expanded ? null : app.id)} accessibilityRole="button" accessibilityState={{ expanded }}>
                      <Text style={styles.eventName}>{app.eventTitle}</Text>
                      <Text style={styles.money}>{formatMoney(app.amount)}</Text>
                      <Text style={styles.muted}>{app.status.replace(/_/g, ' ')} · {completed}/7 requirements verified</Text>
                      <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.min(100, completed / 7 * 100)}%` }]} /></View>
                      <Text style={styles.link}>{expanded ? 'Hide requirements ↑' : 'View requirements ↓'}</Text>
                    </Pressable>
                    {expanded && <>
                      {app.checks.map(check => (
                        <View key={check.key} style={styles.checkRow}>
                          <Text style={[styles.checkIndicator, check.done && styles.checkVerified]}>{check.done ? '✓' : '○'}</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.checkName}>{check.label}</Text>
                            <Text style={styles.muted}>{check.status === 'VERIFIED' ? 'Verified' : check.status === 'REJECTED' ? 'Rejected — action needed' : 'Pending review'}</Text>
                            {!!check.note && <Text style={styles.muted}>{check.note}</Text>}
                          </View>
                        </View>
                      ))}
                      <Text style={styles.cardTitle}>Evidence documents</Text>
                      {EVIDENCE_TYPES.map(kind => {
                        const doc = app.documents?.find(d => d.category === kind.category);
                        return <View key={kind.category} style={styles.evidenceRow}>
                          <Text style={styles.checkName}>{kind.label}</Text>
                          <Text style={[styles.muted, doc && styles.uploaded]}>{doc ? doc.filename : 'Not uploaded'}</Text>
                          {['SUBMITTED', 'IN_REVIEW'].includes(app.status) &&
                            <Pressable disabled={!!uploadingKey} style={styles.fileButton}
                              onPress={() => void replaceDocument(app.id, kind.category)}>
                              <Text style={styles.fileButtonText}>{uploadingKey === app.id + kind.category ? 'Uploading…' : doc ? 'Replace document' : 'Upload document'}</Text>
                            </Pressable>}
                        </View>;
                      })}
                      {!!app.reviewNotes && <Text style={styles.reviewNote}>Admin response: {app.reviewNotes}</Text>}
                    </>}
                  </View>;
                })}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8f7ff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 12 },
  headerTitle: { fontSize: 17, color: '#111827', fontWeight: '800' },
  backButton: { height: 38, width: 38, backgroundColor: '#fff', borderRadius: 19, borderWidth: 1, borderColor: '#e9e5fa', alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 30, color: '#111827', marginTop: -5 },
  refreshText: { fontSize: 25, color: '#7c3aed' },
  content: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 55, gap: 17 },
  eyebrow: { color: '#7c3aed', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  title: { color: '#111827', fontSize: 29, fontWeight: '900' },
  description: { color: '#566074', lineHeight: 21, fontSize: 13 },
  card: { backgroundColor: '#fff', borderColor: '#e5e0f3', borderWidth: 1, borderRadius: 20, padding: 18, gap: 8 },
  cardTitle: { color: '#111827', fontSize: 18, fontWeight: '900', marginBottom: 6 },
  label: { color: '#374151', fontWeight: '800', fontSize: 12, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#ddd6fe', backgroundColor: '#faf9ff', paddingHorizontal: 13, paddingVertical: 13, borderRadius: 11, color: '#111827', minHeight: 48, fontSize: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  inputText: { flex: 1, fontSize: 13, color: '#111827' },
  placeholder: { flex: 1, color: '#9ca3af', fontSize: 13 },
  arrow: { fontSize: 19, color: '#6d28d9' },
  multiline: { minHeight: 83 },
  eventList: { backgroundColor: '#f7f4ff', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#ddd6fe' },
  eventItem: { padding: 14, borderBottomColor: '#e5e0f3', borderBottomWidth: 1 },
  eventName: { color: '#111827', fontWeight: '800', fontSize: 14 },
  help: { color: '#6b7280', fontSize: 11, lineHeight: 17, marginTop: 9 },
  fileButton: { borderWidth: 1, borderColor: '#a78bfa', borderRadius: 11, backgroundColor: '#f5f3ff', padding: 14, marginTop: 6 },
  fileButtonText: { color: '#6d28d9', fontSize: 12, fontWeight: '800' },
  evidenceRow: { paddingVertical: 8, gap: 4 },
  uploaded: { color: '#15803d' },
  muted: { color: '#6b7280', fontSize: 12, lineHeight: 18 },
  agreement: { flexDirection: 'row', gap: 12, paddingVertical: 14, alignItems: 'flex-start' },
  checkbox: { color: '#7c3aed', fontSize: 24, marginTop: -3 },
  agreementText: { color: '#374151', flex: 1, lineHeight: 19, fontSize: 12 },
  primary: { paddingVertical: 15, minHeight: 48, borderRadius: 12, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.5 },
  primaryText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  disclaimer: { color: '#6b7280', textAlign: 'center', fontSize: 11, marginTop: 5 },
  application: { borderTopWidth: 1, borderTopColor: '#ede9f7', paddingTop: 14, paddingBottom: 10, marginTop: 10, gap: 6 },
  money: { color: '#6d28d9', fontWeight: '900', fontSize: 18, marginTop: 3 },
  progressTrack: { height: 7, backgroundColor: '#eee8fa', borderRadius: 8, overflow: 'hidden', marginTop: 10 },
  progressFill: { backgroundColor: '#7c3aed', height: 7, borderRadius: 8 },
  link: { color: '#7c3aed', fontWeight: '800', marginTop: 8, fontSize: 12 },
  checkRow: { flexDirection: 'row', gap: 12, borderBottomWidth: 1, borderBottomColor: '#f0edf8', paddingVertical: 9 },
  checkIndicator: { color: '#9ca3af', fontWeight: '900', fontSize: 21 },
  checkVerified: { color: '#16a34a' },
  checkName: { color: '#111827', fontWeight: '700', fontSize: 12 },
  reviewNote: { color: '#374151', fontSize: 12, lineHeight: 18, marginTop: 10, backgroundColor: '#f3f0fd', padding: 11, borderRadius: 8 },
  errorBox: { padding: 13, backgroundColor: '#fee2e2', borderRadius: 10 },
  errorText: { color: '#991b1b', fontSize: 13 },
  successBox: { padding: 13, backgroundColor: '#dcfce7', borderRadius: 10 },
  successText: { color: '#166534', fontSize: 13 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  heading: { fontSize: 18, fontWeight: '800', color: '#111827' },
});
