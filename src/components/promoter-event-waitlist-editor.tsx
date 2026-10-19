import { usePathname } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/lib/api';

type WaitlistSettings = {
  enabled: boolean;
  opensAt: string | null;
  closesAt: string | null;
  notifyOnSale: boolean;
  message: string | null;
  count: number;
  saleStarts: string | null;
  salesStarted: boolean;
  locked: boolean;
};

type WaitlistResponse = {
  success: true;
  event: { id: string; title: string; status: string };
  waitlist: WaitlistSettings;
};

function inputValue(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function prettyDate(value: string | null) {
  if (!value) return 'Not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
}

export function PromoterEventWaitlistEditor() {
  const pathname = usePathname();
  const { sessionToken, user } = useAuth();
  const match = pathname.match(/^\/promoter\/event\/([^/]+)\/edit$/);
  const eventId = match?.[1] ? decodeURIComponent(match[1]) : null;
  const visibleForRoute = Boolean(eventId && sessionToken && user?.role === 'PROMOTER');

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [settings, setSettings] = useState<WaitlistSettings | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [opensAt, setOpensAt] = useState('');
  const [closesAt, setClosesAt] = useState('');
  const [notifyOnSale, setNotifyOnSale] = useState(true);
  const [message, setMessage] = useState('');

  async function load() {
    if (!eventId || !sessionToken) return;
    try {
      setLoading(true);
      setError('');
      const data = await apiRequest<WaitlistResponse>(`/api/promoter/events/${encodeURIComponent(eventId)}/waitlist-settings`, {}, sessionToken);
      setSettings(data.waitlist);
      setEnabled(data.waitlist.enabled);
      setOpensAt(inputValue(data.waitlist.opensAt));
      setClosesAt(inputValue(data.waitlist.closesAt));
      setNotifyOnSale(data.waitlist.notifyOnSale);
      setMessage(data.waitlist.message || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load waitlist settings.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!visibleForRoute) {
      setOpen(false);
      setSettings(null);
      return;
    }
    void load();
  }, [eventId, sessionToken, visibleForRoute]);

  async function save() {
    if (!eventId || !sessionToken || settings?.locked) return;
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      const data = await apiRequest<WaitlistResponse>(`/api/promoter/events/${encodeURIComponent(eventId)}/waitlist-settings`, {
        method: 'PATCH',
        body: JSON.stringify({ enabled, opensAt, closesAt, notifyOnSale, message }),
      }, sessionToken);
      setSettings(data.waitlist);
      setSuccess('Waitlist settings updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update waitlist settings.');
    } finally {
      setSaving(false);
    }
  }

  if (!visibleForRoute) return null;

  return <>
    <Pressable style={styles.floating} onPress={() => setOpen(true)}>
      <Text style={styles.floatingText}>Waitlist {settings?.count ? `· ${settings.count}` : ''}</Text>
    </Pressable>

    <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
      <SafeAreaView style={styles.screen}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.eyebrow}>PRE-SALE WAITLIST</Text>
            <Text style={styles.title}>Manage waitlist</Text>
          </View>
          <Pressable style={styles.close} onPress={() => setOpen(false)}><Text style={styles.closeText}>×</Text></Pressable>
        </View>

        {loading ? <View style={styles.center}><ActivityIndicator color="#7c3aed" size="large" /></View> : <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.statCard}><Text style={styles.statValue}>{settings?.count ?? 0}</Text><Text style={styles.statLabel}>people currently waiting</Text></View>

          {settings?.locked && <View style={styles.locked}><Text style={styles.lockedTitle}>Pre-sale waitlist locked</Text><Text style={styles.lockedCopy}>Ticket sales have already started. This event cannot be moved back into pre-sale waitlist mode.</Text></View>}

          <Pressable disabled={Boolean(settings?.locked)} style={[styles.toggleRow, enabled && styles.toggleRowActive, settings?.locked && styles.disabled]} onPress={() => setEnabled((value) => !value)}>
            <View style={[styles.check, enabled && styles.checkActive]}><Text style={styles.checkText}>{enabled ? '✓' : ''}</Text></View>
            <View style={{ flex: 1 }}><Text style={styles.toggleTitle}>Enable pre-sale waitlist</Text><Text style={styles.helper}>Customers can join before ticket sales begin.</Text></View>
          </Pressable>

          <Field label="Waitlist opens" value={opensAt} onChangeText={setOpensAt} editable={!settings?.locked && enabled} placeholder="YYYY-MM-DDTHH:MM" />
          <Text style={styles.helper}>Optional. Leave blank to open as soon as the approved event is public.</Text>

          <Field label="Waitlist closes" value={closesAt} onChangeText={setClosesAt} editable={!settings?.locked && enabled} placeholder="YYYY-MM-DDTHH:MM" />
          <Text style={styles.helper}>Optional. Leave blank to close automatically when ticket sales start.</Text>

          <Text style={styles.label}>Customer message</Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
            editable={!settings?.locked && enabled}
            maxLength={500}
            multiline
            placeholder="Join the waitlist and we’ll notify you when tickets go on sale."
            placeholderTextColor="#9ca3af"
            style={[styles.input, styles.textarea, (!enabled || settings?.locked) && styles.inputDisabled]}
          />

          <Pressable disabled={Boolean(settings?.locked || !enabled)} style={[styles.toggleRow, notifyOnSale && styles.toggleRowActive, (settings?.locked || !enabled) && styles.disabled]} onPress={() => setNotifyOnSale((value) => !value)}>
            <View style={[styles.check, notifyOnSale && styles.checkActive]}><Text style={styles.checkText}>{notifyOnSale ? '✓' : ''}</Text></View>
            <View style={{ flex: 1 }}><Text style={styles.toggleTitle}>Notify when tickets go on sale</Text><Text style={styles.helper}>Send email and mobile notifications to eligible waitlist members.</Text></View>
          </Pressable>

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Ticket sales start</Text>
            <Text style={styles.infoValue}>{prettyDate(settings?.saleStarts ?? null)}</Text>
            <Text style={styles.helper}>Existing waitlist members stay on the list when you edit these settings. Joining never guarantees a ticket.</Text>
          </View>

          {!!error && <Text style={styles.error}>{error}</Text>}
          {!!success && <Text style={styles.success}>{success}</Text>}

          {!settings?.locked && <Pressable disabled={saving} style={[styles.save, saving && styles.disabled]} onPress={() => void save()}>{saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save waitlist settings</Text>}</Pressable>}
          <View style={{ height: 24 }} />
        </ScrollView>}
      </SafeAreaView>
    </Modal>
  </>;
}

function Field({ label, ...props }: { label: string } & React.ComponentProps<typeof TextInput>) {
  return <View style={{ marginTop: 18 }}><Text style={styles.label}>{label}</Text><TextInput {...props} placeholderTextColor="#9ca3af" style={[styles.input, props.editable === false && styles.inputDisabled]} /></View>;
}

const styles = StyleSheet.create({
  floating: { position: 'absolute', right: 18, bottom: 92, zIndex: 50, elevation: 12, minHeight: 46, borderRadius: 23, paddingHorizontal: 18, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: .18, shadowRadius: 10, shadowOffset: { width: 0, height: 5 } },
  floatingText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  screen: { flex: 1, backgroundColor: '#fff' },
  topBar: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { color: '#7c3aed', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  title: { color: '#111827', fontSize: 24, fontWeight: '900', marginTop: 4 },
  close: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  closeText: { color: '#111827', fontSize: 28, lineHeight: 30 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 18 },
  statCard: { borderRadius: 18, borderWidth: 1, borderColor: '#ddd6fe', backgroundColor: '#faf5ff', padding: 16 },
  statValue: { color: '#7c3aed', fontSize: 30, fontWeight: '900' },
  statLabel: { color: '#6b7280', fontSize: 12, marginTop: 3 },
  locked: { marginTop: 16, borderRadius: 16, borderWidth: 1, borderColor: '#fcd34d', backgroundColor: '#fffbeb', padding: 14 },
  lockedTitle: { color: '#92400e', fontWeight: '900' },
  lockedCopy: { color: '#92400e', fontSize: 12, lineHeight: 18, marginTop: 5 },
  toggleRow: { marginTop: 18, borderRadius: 16, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff', padding: 14, flexDirection: 'row', gap: 12, alignItems: 'center' },
  toggleRowActive: { borderColor: '#c4b5fd', backgroundColor: '#faf5ff' },
  check: { width: 28, height: 28, borderRadius: 8, borderWidth: 1, borderColor: '#d1d5db', alignItems: 'center', justifyContent: 'center' },
  checkActive: { borderColor: '#7c3aed', backgroundColor: '#7c3aed' },
  checkText: { color: '#fff', fontWeight: '900' },
  toggleTitle: { color: '#111827', fontSize: 14, fontWeight: '900' },
  helper: { color: '#6b7280', fontSize: 11, lineHeight: 17, marginTop: 4 },
  label: { color: '#374151', fontSize: 12, fontWeight: '800', marginBottom: 7 },
  input: { minHeight: 50, borderRadius: 14, borderWidth: 1, borderColor: '#d1d5db', backgroundColor: '#f9fafb', color: '#111827', paddingHorizontal: 14, fontSize: 14 },
  inputDisabled: { opacity: .5 },
  textarea: { marginTop: 0, minHeight: 100, paddingTop: 12, textAlignVertical: 'top' },
  infoCard: { marginTop: 18, borderRadius: 16, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#f9fafb', padding: 14 },
  infoTitle: { color: '#6b7280', fontSize: 11, fontWeight: '800' },
  infoValue: { color: '#111827', fontSize: 15, fontWeight: '900', marginTop: 5 },
  error: { color: '#dc2626', fontSize: 12, fontWeight: '800', marginTop: 15 },
  success: { color: '#15803d', fontSize: 12, fontWeight: '800', marginTop: 15 },
  save: { minHeight: 54, borderRadius: 16, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center', marginTop: 22 },
  saveText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  disabled: { opacity: .5 },
});
