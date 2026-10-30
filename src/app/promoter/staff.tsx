import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/lib/api';

type StaffEvent = {
  id: string;
  title: string;
  date: string;
  venue: string;
  status: string;
};

type StaffMember = {
  userId: string;
  name: string;
  email: string;
  isActive: boolean;
  assignments: Array<{
    assignmentId: string;
    eventId: string;
    eventTitle: string;
    eventDate: string;
    role: string;
  }>;
};

type StaffResponse = {
  success: true;
  events: StaffEvent[];
  staff: StaffMember[];
};

const eventDate = (value: string) =>
  new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));

export default function PromoterStaffScreen() {
  const { user, sessionToken, loading: authLoading } = useAuth();
  const dark = useColorScheme() === 'dark';
  const [data, setData] = useState<StaffResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'BOX_OFFICE' | 'CHECK_IN' | 'MANAGER'>('BOX_OFFICE');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingEvents, setEditingEvents] = useState<string[]>([]);
  const [error, setError] = useState('');

  const colors = useMemo(
    () => ({
      bg: dark ? '#080b12' : '#ffffff',
      card: dark ? '#11151f' : '#ffffff',
      soft: dark ? '#171c27' : '#f9fafb',
      border: dark ? '#252b38' : '#e5e7eb',
      text: dark ? '#f9fafb' : '#111827',
      sub: dark ? '#9ca3af' : '#6b7280',
    }),
    [dark],
  );

  const load = useCallback(
    async (refresh = false) => {
      if (!sessionToken || user?.role !== 'PROMOTER') return;
      try {
        refresh ? setRefreshing(true) : setLoading(true);
        setError('');
        setData(await apiRequest<StaffResponse>('/api/mobile/promoter/staff', {}, sessionToken));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load staff.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [sessionToken, user?.role],
  );

  useEffect(() => {
    if (!authLoading && user?.role === 'PROMOTER') void load();
    else if (!authLoading) setLoading(false);
  }, [authLoading, user?.role, load]);

  function toggleEvent(id: string, edit = false) {
    const value = edit ? editingEvents : selectedEvents;
    const next = value.includes(id) ? value.filter((eventId) => eventId !== id) : [...value, id];
    edit ? setEditingEvents(next) : setSelectedEvents(next);
  }

  async function addStaff() {
    if (!sessionToken || saving) return;
    if (!email.trim()) return Alert.alert('Email required', 'Enter the staff member’s email address.');
    if (!selectedEvents.length) return Alert.alert('Choose an event', 'Select at least one event for this staff member.');
    try {
      setSaving(true);
      await apiRequest(
        '/api/mobile/promoter/staff',
        { method: 'POST', body: JSON.stringify({ email: email.trim(), eventIds: selectedEvents, role }) },
        sessionToken,
      );
      setEmail('');
      setSelectedEvents([]);
      await load(true);
      Alert.alert('Staff invitation sent', 'Access is limited to the selected events and activates when the recipient signs in.');
    } catch (err) {
      Alert.alert('Could not add staff', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function saveAssignments(userId: string) {
    if (!sessionToken || saving) return;
    try {
      setSaving(true);
      await apiRequest(
        '/api/mobile/promoter/staff',
        { method: 'PATCH', body: JSON.stringify({ userId, eventIds: editingEvents }) },
        sessionToken,
      );
      setEditingUserId(null);
      setEditingEvents([]);
      await load(true);
    } catch (err) {
      Alert.alert('Could not update access', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function removeStaff(member: StaffMember) {
    Alert.alert(
      'Remove scanner access?',
      `${member.name} will immediately lose access to all of your event scanners.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove access',
          style: 'destructive',
          onPress: () => {
            setEditingEvents([]);
            void saveAssignments(member.userId);
          },
        },
      ],
    );
  }

  if (authLoading || loading) {
    return <View style={[styles.screen, { backgroundColor: colors.bg }]}><SafeAreaView style={styles.center}><ActivityIndicator size="large" color="#7c3aed" /></SafeAreaView></View>;
  }

  if (!user || user.role !== 'PROMOTER') {
    return <View style={[styles.screen, { backgroundColor: colors.bg }]}><SafeAreaView style={styles.center}><Text style={[styles.title, { color: colors.text }]}>Promoter access required</Text></SafeAreaView></View>;
  }

  const events = data?.events || [];
  const staff = data?.staff || [];

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor="#7c3aed" />}
        >
          <View style={styles.top}>
            <Pressable style={[styles.circle, { borderColor: colors.border, backgroundColor: colors.soft }]} onPress={() => router.back()}><Text style={[styles.back, { color: colors.text }]}>‹</Text></Pressable>
            <Text style={[styles.topTitle, { color: colors.text }]}>Staff</Text>
            <View style={{ width: 40 }} />
          </View>

          <Text style={styles.eyebrow}>EVENT-ONLY ACCESS</Text>
          <Text style={[styles.title, { color: colors.text }]}>Event staff</Text>
          <Text style={[styles.copy, { color: colors.sub }]}>Give trusted staff operational event access without giving them promoter, finance or event-management access.</Text>

          {!!error && <View style={styles.error}><Text style={styles.errorText}>{error}</Text></View>}

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Add staff member</Text>
            <Text style={[styles.help, { color: colors.sub }]}>Select the event-only role and one or more events. If they do not have an account yet, we will email an invitation.</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="staff@example.com"
              placeholderTextColor={dark ? '#6b7280' : '#9ca3af'}
              style={[styles.input, { color: colors.text, backgroundColor: colors.soft, borderColor: colors.border }]}
            />
            <Text style={[styles.label, { color: colors.text }]}>Role</Text>
            <View style={styles.roleChoices}>
              {([
                ['BOX_OFFICE', 'Box Office'],
                ['CHECK_IN', 'Check-in'],
                ['MANAGER', 'Manager'],
              ] as const).map(([value, label]) => {
                const active = role === value;
                return <Pressable key={value} onPress={() => setRole(value)} style={[styles.roleChoice, { borderColor: active ? '#7c3aed' : colors.border, backgroundColor: active ? (dark ? '#24143d' : '#f5f3ff') : colors.soft }]}><Text style={[styles.roleChoiceText, { color: active ? '#7c3aed' : colors.text }]}>{label}</Text></Pressable>;
              })}
            </View>
            <Text style={[styles.help, { color: colors.sub }]}>{role === 'BOX_OFFICE' ? 'Box Office can scan, sell tickets, take Tap to Pay or cash, issue complimentary tickets and view door-sales activity.' : role === 'CHECK_IN' ? 'Check-in can scan tickets for entry only.' : 'Manager has all event-only Box Office and check-in capabilities.'}</Text>
            <Text style={[styles.label, { color: colors.text }]}>Assigned events</Text>
            <View style={styles.chips}>
              {events.map((event) => {
                const active = selectedEvents.includes(event.id);
                return (
                  <Pressable key={event.id} style={[styles.eventChip, { borderColor: active ? '#7c3aed' : colors.border, backgroundColor: active ? (dark ? '#24143d' : '#f5f3ff') : colors.soft }]} onPress={() => toggleEvent(event.id)}>
                    <Text style={[styles.eventChipTitle, { color: active ? '#7c3aed' : colors.text }]}>{event.title}</Text>
                    <Text style={[styles.eventChipMeta, { color: colors.sub }]}>{eventDate(event.date)} · {event.venue}</Text>
                  </Pressable>
                );
              })}
            </View>
            {!events.length && <Text style={[styles.emptyText, { color: colors.sub }]}>Create an event before assigning staff.</Text>}
            <Pressable style={[styles.primary, (saving || !events.length) && styles.disabled]} disabled={saving || !events.length} onPress={() => void addStaff()}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Invite staff member</Text>}
            </Pressable>
          </View>

          <View style={styles.sectionHead}>
            <Text style={[styles.section, { color: colors.text }]}>Your staff</Text>
            <View style={styles.count}><Text style={styles.countText}>{staff.length}</Text></View>
          </View>

          {!staff.length ? (
            <View style={[styles.empty, { backgroundColor: colors.soft, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>No staff assigned</Text>
              <Text style={[styles.help, { color: colors.sub }]}>Invite a staff member above when you are ready to give event access.</Text>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {staff.map((member) => {
                const editing = editingUserId === member.userId;
                return (
                  <View key={member.userId} style={[styles.staffCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.staffTop}>
                      <View style={[styles.avatar, { backgroundColor: dark ? '#24143d' : '#f3efff' }]}><Text style={styles.avatarText}>{member.name.trim().charAt(0).toUpperCase() || 'S'}</Text></View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.staffName, { color: colors.text }]}>{member.name}</Text>
                        <Text style={[styles.staffEmail, { color: colors.sub }]}>{member.email}</Text>
                      </View>
                      <View style={[styles.activeBadge, !member.isActive && styles.inactiveBadge]}><Text style={[styles.activeText, !member.isActive && styles.inactiveText]}>{member.isActive ? 'ACTIVE' : 'DISABLED'}</Text></View>
                    </View>

                    {editing ? (
                      <>
                        <Text style={[styles.label, { color: colors.text }]}>Assigned events</Text>
                        <View style={styles.chips}>
                          {events.map((event) => {
                            const active = editingEvents.includes(event.id);
                            return (
                              <Pressable key={event.id} style={[styles.eventChip, { borderColor: active ? '#7c3aed' : colors.border, backgroundColor: active ? (dark ? '#24143d' : '#f5f3ff') : colors.soft }]} onPress={() => toggleEvent(event.id, true)}>
                                <Text style={[styles.eventChipTitle, { color: active ? '#7c3aed' : colors.text }]}>{event.title}</Text>
                                <Text style={[styles.eventChipMeta, { color: colors.sub }]}>{eventDate(event.date)}</Text>
                              </Pressable>
                            );
                          })}
                        </View>
                        <View style={styles.actions}>
                          <Pressable style={[styles.secondary, { borderColor: colors.border }]} onPress={() => { setEditingUserId(null); setEditingEvents([]); }}><Text style={[styles.secondaryText, { color: colors.text }]}>Cancel</Text></Pressable>
                          <Pressable style={styles.save} disabled={saving} onPress={() => void saveAssignments(member.userId)}><Text style={styles.primaryText}>{saving ? 'Saving…' : 'Save access'}</Text></Pressable>
                        </View>
                      </>
                    ) : (
                      <>
                        <Text style={[styles.label, { color: colors.text }]}>Assigned events</Text>
                        <View style={styles.assignmentList}>
                          {member.assignments.map((assignment) => (
                            <View key={assignment.assignmentId} style={[styles.assignment, { backgroundColor: colors.soft }]}>
                              <View style={{ flex: 1 }}><Text style={[styles.assignmentTitle, { color: colors.text }]}>{assignment.eventTitle}</Text><Text style={[styles.eventChipMeta, { color: colors.sub }]}>{eventDate(assignment.eventDate)}</Text></View>
                              <Text style={styles.role}>{assignment.role.replaceAll('_', ' ')}</Text>
                            </View>
                          ))}
                        </View>
                        <View style={styles.actions}>
                          <Pressable style={[styles.secondary, { borderColor: colors.border }]} onPress={() => removeStaff(member)}><Text style={styles.removeText}>Remove</Text></Pressable>
                          <Pressable style={styles.manage} onPress={() => { setEditingUserId(member.userId); setEditingEvents(member.assignments.map((assignment) => assignment.eventId)); }}><Text style={styles.manageText}>Manage access</Text></Pressable>
                        </View>
                      </>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          <View style={{ height: 70 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  content: { paddingHorizontal: 18 },
  top: { height: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  circle: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  back: { fontSize: 34, lineHeight: 36, marginTop: -3 },
  topTitle: { fontWeight: '900' },
  eyebrow: { color: '#7c3aed', fontSize: 10, fontWeight: '900', letterSpacing: 1.8, marginTop: 12 },
  title: { fontSize: 32, fontWeight: '900', marginTop: 7 },
  copy: { fontSize: 13, lineHeight: 20, marginTop: 7, marginBottom: 20, maxWidth: 360 },
  card: { borderWidth: 1, borderRadius: 22, padding: 17 },
  cardTitle: { fontSize: 17, fontWeight: '900' },
  help: { fontSize: 11, lineHeight: 17, marginTop: 5 },
  input: { height: 50, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, marginTop: 16, fontSize: 14 },
  label: { fontSize: 11, fontWeight: '900', marginTop: 16, marginBottom: 9 },
  roleChoices: { flexDirection: 'row', gap: 7 },
  roleChoice: { flex: 1, minHeight: 42, borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  roleChoiceText: { fontSize: 9, fontWeight: '900', textAlign: 'center' },
  chips: { gap: 8 },
  eventChip: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 },
  eventChipTitle: { fontSize: 12, fontWeight: '900' },
  eventChipMeta: { fontSize: 9, marginTop: 3 },
  primary: { minHeight: 50, borderRadius: 14, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  primaryText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  disabled: { opacity: 0.5 },
  sectionHead: { marginTop: 28, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  section: { fontSize: 20, fontWeight: '900' },
  count: { minWidth: 28, height: 28, borderRadius: 14, backgroundColor: '#ede9fe', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  countText: { color: '#6d28d9', fontSize: 11, fontWeight: '900' },
  empty: { minHeight: 120, borderWidth: 1, borderRadius: 20, alignItems: 'center', justifyContent: 'center', padding: 20 },
  emptyText: { fontSize: 11, marginTop: 10 },
  staffCard: { borderWidth: 1, borderRadius: 20, padding: 16 },
  staffTop: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  avatar: { width: 43, height: 43, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#7c3aed', fontWeight: '900', fontSize: 16 },
  staffName: { fontSize: 14, fontWeight: '900' },
  staffEmail: { fontSize: 10, marginTop: 3 },
  activeBadge: { backgroundColor: '#ecfdf5', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5 },
  activeText: { color: '#166534', fontSize: 8, fontWeight: '900' },
  inactiveBadge: { backgroundColor: '#fef2f2' },
  inactiveText: { color: '#b91c1c' },
  assignmentList: { gap: 7 },
  assignment: { borderRadius: 12, paddingHorizontal: 11, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 10 },
  assignmentTitle: { fontSize: 11, fontWeight: '800' },
  role: { color: '#7c3aed', fontSize: 8, fontWeight: '900' },
  actions: { flexDirection: 'row', gap: 9, marginTop: 15 },
  secondary: { flex: 1, minHeight: 44, borderWidth: 1, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { fontSize: 11, fontWeight: '900' },
  removeText: { color: '#dc2626', fontSize: 11, fontWeight: '900' },
  manage: { flex: 1.3, minHeight: 44, borderRadius: 13, backgroundColor: '#ede9fe', alignItems: 'center', justifyContent: 'center' },
  manageText: { color: '#6d28d9', fontSize: 11, fontWeight: '900' },
  save: { flex: 1.3, minHeight: 44, borderRadius: 13, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center' },
  error: { backgroundColor: '#fef2f2', borderRadius: 14, padding: 12, marginBottom: 14 },
  errorText: { color: '#b91c1c', fontSize: 11 },
});
