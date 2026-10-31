import { StripeTerminalProvider, useStripeTerminal } from '@stripe/stripe-terminal-react-native';
import * as SecureStore from 'expo-secure-store';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MerchantAccessGate, MerchantSecurity } from '@/components/merchant-access-gate';
import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/lib/api';

type TicketType = { id: string; name: string; price: number; remaining: number; maxPerOrder: number; active: boolean };
type BoxOfficeData = {
  success: true;
  event: { id: string; title: string; date: string; venue: string };
  permissions: string[];
  isPromoter: boolean;
  reporting: { count: number; total: number }[];
  ticketTypes: TicketType[];
  feePolicy: { terminal: string; cash: string; free: string; complimentary: string };
};
type SaleResult = {
  success: true;
  state: 'COMPLETED' | 'REQUIRES_TERMINAL';
  orderId: string;
  clientSecret?: string;
  totalPence?: number;
  emailSent?: boolean;
};
type CompleteResult = { success: true; state: 'COMPLETED'; orderId: string; emailSent?: boolean };
type RefundResult = { success: true; state: 'REFUNDED'; orderId: string; refundId?: string; amountPence: number };
type CompletedSale = {
  orderId: string;
  amountPence: number;
  ticketCount: number;
  method: 'STRIPE_TERMINAL' | 'FREE' | 'COMPLIMENTARY';
  emailSent: boolean;
  emailProvided: boolean;
  refunded: boolean;
};

const TAP_TO_PAY_EDUCATION_KEY = 'outnow.tap-to-pay.education.v1';

function newSaleKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

function BoxOfficeContent({ eventId, security }: { eventId: string; security: MerchantSecurity }) {
  const { sessionToken } = useAuth();
  const [data, setData] = useState<BoxOfficeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [method, setMethod] = useState<'STRIPE_TERMINAL' | 'FREE' | 'COMPLIMENTARY'>('STRIPE_TERMINAL');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [working, setWorking] = useState(false);
  const [readerReady, setReaderReady] = useState(false);
  const [educationVisible, setEducationVisible] = useState(false);
  const [completedSale, setCompletedSale] = useState<CompletedSale | null>(null);
  const { initialize, easyConnect, disconnectReader, getConnectionStatus, retrievePaymentIntent, collectPaymentMethod, processPaymentIntent } = useStripeTerminal();

  const load = useCallback(async () => {
    if (!sessionToken || !eventId) return;
    try {
      setLoading(true);
      setError('');
      setData(await apiRequest<BoxOfficeData>(`/api/box-office/events/${eventId}`, {}, sessionToken));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load Box Office.');
    } finally {
      setLoading(false);
    }
  }, [eventId, sessionToken]);

  useEffect(() => {
    const timer = setTimeout(() => { void load(); }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const lines = useMemo(
    () => Object.entries(quantities)
      .filter(([, quantity]) => quantity > 0)
      .map(([ticketTypeId, quantity]) => ({ ticketTypeId, quantity })),
    [quantities]
  );
  const ticketCount = useMemo(() => lines.reduce((sum, line) => sum + line.quantity, 0), [lines]);
  const subtotal = useMemo(
    () => lines.reduce((sum, line) => sum + (data?.ticketTypes.find((ticket) => ticket.id === line.ticketTypeId)?.price || 0) * line.quantity, 0),
    [data, lines]
  );
  const isGenuineFree = subtotal === 0;
  const availableMethods = useMemo(() => isGenuineFree
    ? (['FREE'] as const)
    : (['STRIPE_TERMINAL', ...(data?.permissions.includes('ISSUE_COMPLIMENTARY') ? ['COMPLIMENTARY' as const] : [])] as const),
  [data?.permissions, isGenuineFree]);
  const total = method === 'FREE' || method === 'COMPLIMENTARY' ? 0 : subtotal * 1.05;

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!availableMethods.includes(method as never)) setMethod(availableMethods[0]);
    }, 0);
    return () => clearTimeout(timer);
  }, [availableMethods, method]);

  const change = (id: string, delta: number) => setQuantities((current) => {
    const ticket = data?.ticketTypes.find((item) => item.id === id);
    const next = Math.max(0, Math.min(ticket?.maxPerOrder || 10, ticket?.remaining || 0, (current[id] || 0) + delta));
    return { ...current, [id]: next };
  });

  async function performTapToPayConnection() {
    try {
      setWorking(true);
      setError('');
      const locationId = process.env.EXPO_PUBLIC_STRIPE_TERMINAL_LOCATION_ID || '';
      if (!locationId) throw new Error('Stripe Terminal location is not configured in this build.');
      const initialized = await initialize();
      if (initialized.error) throw new Error(initialized.error.message);
      const connectionStatus = await getConnectionStatus();
      if (connectionStatus === 'connected' || connectionStatus === 'connecting' || connectionStatus === 'reconnecting') {
        const disconnection = await disconnectReader();
        if (!disconnection || disconnection.error) {
          throw new Error(disconnection?.error?.message || 'Unable to disconnect the existing Tap to Pay reader.');
        }
      }
      const connection = await easyConnect({
        discoveryMethod: 'tapToPay',
        locationId,
        merchantDisplayName: 'OutNow Tickets',
        simulated: __DEV__,
      });
      if (connection.error) throw new Error(connection.error.message);
      setReaderReady(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Tap to Pay is unavailable. Confirm the Terminal location and Tap to Pay setup, then try again.');
    } finally {
      setWorking(false);
    }
  }

  async function connectTapToPay() {
    if (!await security.authenticateSensitiveAction('connect Tap to Pay')) {
      setError(`${security.biometricLabel} is required before connecting Tap to Pay.`);
      return;
    }
    try {
      const seenEducation = await SecureStore.getItemAsync(TAP_TO_PAY_EDUCATION_KEY);
      if (seenEducation !== 'seen') {
        setEducationVisible(true);
        return;
      }
    } catch {
      // If secure storage is unavailable, still show the education screen before connecting.
      setEducationVisible(true);
      return;
    }
    await performTapToPayConnection();
  }

  async function continueFromEducation() {
    try { await SecureStore.setItemAsync(TAP_TO_PAY_EDUCATION_KEY, 'seen'); } catch { /* non-blocking */ }
    setEducationVisible(false);
    await performTapToPayConnection();
  }

  async function disconnectTapToPay() {
    try {
      setWorking(true);
      setError('');
      const disconnection = await disconnectReader();
      if (!disconnection || disconnection.error) {
        throw new Error(disconnection?.error?.message || 'Unable to disconnect Tap to Pay.');
      }
      setReaderReady(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to disconnect Tap to Pay.');
    } finally {
      setWorking(false);
    }
  }

  async function submit() {
    if (!sessionToken || !lines.length) return setError('Choose at least one ticket.');
    if (method === 'COMPLIMENTARY' && !data?.permissions.includes('ISSUE_COMPLIMENTARY')) return setError('You do not have complimentary-ticket permission.');
    if (method === 'COMPLIMENTARY') {
      const confirmed = await new Promise<boolean>((resolve) => Alert.alert(
        'Issue complimentary tickets?',
        'No payment will be collected for these paid tickets.',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Issue ticket', style: 'destructive', onPress: () => resolve(true) },
        ]
      ));
      if (!confirmed) return;
      if (!await security.authenticateSensitiveAction('issue complimentary paid tickets')) {
        setError(`${security.biometricLabel} is required to issue complimentary paid tickets.`);
        return;
      }
    }
    if (method === 'STRIPE_TERMINAL' && !readerReady) return setError('Connect Tap to Pay before charging a card.');
    if (method === 'STRIPE_TERMINAL' && !await security.authenticateSensitiveAction('take a card payment')) {
      setError(`${security.biometricLabel} is required before taking a card payment.`);
      return;
    }

    try {
      setWorking(true);
      setError('');
      const selectedMethod = method;
      const selectedEmail = email.trim();
      const selectedTicketCount = ticketCount;
      const selectedAmountPence = Math.round(total * 100);
      const result = await apiRequest<SaleResult>('/api/box-office/sales', {
        method: 'POST',
        body: JSON.stringify({
          eventId,
          lines,
          paymentMethod: selectedMethod,
          customerName: name,
          customerEmail: selectedEmail,
          idempotencyKey: newSaleKey(),
        }),
      }, sessionToken);

      let emailSent = result.emailSent ?? false;
      let amountPence = result.totalPence ?? selectedAmountPence;

      if (result.state === 'REQUIRES_TERMINAL') {
        if (!result.clientSecret) throw new Error('Terminal payment was not prepared.');
        const retrieved = await retrievePaymentIntent(result.clientSecret);
        if (retrieved.error) throw new Error(retrieved.error.message);
        const collected = await collectPaymentMethod({ paymentIntent: retrieved.paymentIntent });
        if (collected.error) throw new Error(collected.error.message);
        const processed = await processPaymentIntent({ paymentIntent: collected.paymentIntent });
        if (processed.error) throw new Error(processed.error.message);
        const complete = await apiRequest<CompleteResult>(`/api/box-office/sales/${result.orderId}/complete`, { method: 'POST' }, sessionToken);
        emailSent = complete.emailSent ?? false;
        amountPence = result.totalPence ?? selectedAmountPence;
      }

      setCompletedSale({
        orderId: result.orderId,
        amountPence,
        ticketCount: selectedTicketCount,
        method: selectedMethod,
        emailSent,
        emailProvided: Boolean(selectedEmail),
        refunded: false,
      });
      setQuantities({});
      setName('');
      setEmail('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to complete this door sale.');
    } finally {
      setWorking(false);
    }
  }

  async function refundCompletedSale() {
    if (!sessionToken || !completedSale || completedSale.method !== 'STRIPE_TERMINAL' || completedSale.refunded) return;
    const confirmed = await new Promise<boolean>((resolve) => Alert.alert(
      'Refund this payment?',
      `Refund £${(completedSale.amountPence / 100).toFixed(2)} and invalidate the issued ticket${completedSale.ticketCount === 1 ? '' : 's'}?`,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Refund payment', style: 'destructive', onPress: () => resolve(true) },
      ]
    ));
    if (!confirmed) return;
    if (!await security.authenticateSensitiveAction('refund a card payment')) {
      setError(`${security.biometricLabel} is required to refund a card payment.`);
      return;
    }

    try {
      setWorking(true);
      setError('');
      await apiRequest<RefundResult>(`/api/box-office/sales/${completedSale.orderId}/refund`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Refunded by Box Office staff' }),
      }, sessionToken);
      setCompletedSale((current) => current ? { ...current, refunded: true } : current);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to refund this payment.');
    } finally {
      setWorking(false);
    }
  }

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#7c3aed" /></View>;

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.top}>
            <Pressable onPress={() => router.back()}><Text style={styles.back}>‹</Text></Pressable>
            <Text style={styles.topTitle}>Box Office</Text>
            <View style={{ width: 30 }} />
          </View>

          <Text style={styles.eyebrow}>DOOR SALES</Text>
          <Text style={styles.title}>{data?.event.title || 'Event'}</Text>
          <Text style={styles.copy}>Fast in-person tickets with event-only staff access.</Text>

          {data?.permissions.includes('VIEW_DOOR_SALES') && (
            <View style={styles.activityCard}>
              <Text style={styles.activityLabel}>DOOR SALES ACTIVITY</Text>
              <Text style={styles.activityValue}>{data.reporting[0]?.count || 0} completed sale{data.reporting[0]?.count === 1 ? '' : 's'} · £{(data.reporting[0]?.total || 0).toFixed(2)}</Text>
            </View>
          )}

          <View style={styles.securityCard}>
            <Text style={styles.securityTitle}>{security.biometricEnabled ? `${security.biometricLabel} protection is on` : 'Protect Box Office'}</Text>
            <Text style={styles.securityCopy}>{security.biometricEnabled
              ? `OutNow asks for ${security.biometricLabel} when Box Office opens and again before Tap to Pay, card payments, refunds, or complimentary paid tickets.`
              : security.biometricAvailable
                ? `Require ${security.biometricLabel} on this device before opening Box Office and taking sensitive merchant actions.`
                : 'Biometric protection is not available in this app build or on this device. Your OutNow sign-in still protects merchant access.'}</Text>
            {security.biometricAvailable && <Pressable onPress={() => void (security.biometricEnabled ? security.disableBiometrics() : security.enableBiometrics())} style={styles.securityButton}>
              <Text style={styles.securityButtonText}>{security.biometricEnabled ? 'Turn off protection' : `Enable ${security.biometricLabel}`}</Text>
            </Pressable>}
            {!!security.notice && <Text style={styles.securityNotice}>{security.notice}</Text>}
          </View>

          {!!error && <View style={styles.error}><Text style={styles.errorText}>{error}</Text></View>}

          {completedSale && (
            <View style={[styles.successCard, completedSale.refunded && styles.refundCard]}>
              <Text style={styles.successEyebrow}>{completedSale.refunded ? 'REFUNDED' : completedSale.method === 'STRIPE_TERMINAL' ? 'PAYMENT APPROVED' : 'SALE COMPLETE'}</Text>
              <Text style={styles.successAmount}>£{(completedSale.amountPence / 100).toFixed(2)}</Text>
              <Text style={styles.successTitle}>
                {completedSale.refunded
                  ? 'Payment refunded and tickets invalidated'
                  : `${completedSale.ticketCount} ticket${completedSale.ticketCount === 1 ? '' : 's'} issued`}
              </Text>
              {!completedSale.refunded && completedSale.emailProvided && (
                <Text style={styles.successMeta}>{completedSale.emailSent ? 'Ticket email sent to customer.' : 'Tickets issued. Email delivery could not be confirmed.'}</Text>
              )}
              {!completedSale.refunded && !completedSale.emailProvided && (
                <Text style={styles.successMeta}>No customer email was supplied.</Text>
              )}
              <View style={styles.successActions}>
                <Pressable style={styles.successSecondary} onPress={() => router.push(`/promoter/scanner?eventId=${encodeURIComponent(eventId)}` as never)}>
                  <Text style={styles.successSecondaryText}>Check in</Text>
                </Pressable>
                <Pressable style={styles.successSecondary} onPress={() => setCompletedSale(null)}>
                  <Text style={styles.successSecondaryText}>New sale</Text>
                </Pressable>
              </View>
              {data?.isPromoter && completedSale.method === 'STRIPE_TERMINAL' && !completedSale.refunded && (
                <Pressable disabled={working} style={styles.refundButton} onPress={() => void refundCompletedSale()}>
                  <Text style={styles.refundButtonText}>{working ? 'Refunding…' : 'Refund payment'}</Text>
                </Pressable>
              )}
            </View>
          )}

          <Text style={styles.section}>Tickets</Text>
          {data?.ticketTypes.map((ticket) => (
            <View key={ticket.id} style={styles.ticket}>
              <View style={{ flex: 1 }}>
                <Text style={styles.ticketName}>{ticket.name}</Text>
                <Text style={styles.muted}>£{ticket.price.toFixed(2)} · {ticket.remaining} left</Text>
              </View>
              <View style={styles.stepper}>
                <Pressable onPress={() => change(ticket.id, -1)} style={styles.step}><Text>−</Text></Pressable>
                <Text style={styles.quantity}>{quantities[ticket.id] || 0}</Text>
                <Pressable onPress={() => change(ticket.id, 1)} style={styles.step}><Text>+</Text></Pressable>
              </View>
            </View>
          ))}

          <Text style={styles.section}>Customer (optional)</Text>
          <TextInput value={name} onChangeText={setName} placeholder="Name" style={styles.input} />
          <TextInput value={email} onChangeText={setEmail} placeholder="Email for ticket and receipt" keyboardType="email-address" autoCapitalize="none" style={styles.input} />

          <Text style={styles.section}>{isGenuineFree ? 'Issue' : 'Payment'}</Text>
          <View style={styles.methods}>
            {availableMethods.map((value) => (
              <Pressable key={value} onPress={() => setMethod(value)} style={[styles.method, method === value && styles.methodActive]}>
                <Text style={[styles.methodText, method === value && styles.methodTextActive]}>
                  {value === 'STRIPE_TERMINAL' ? 'CARD / TAP' : value === 'COMPLIMENTARY' ? 'COMPLIMENTARY' : 'FREE / ISSUE'}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.policy}>{method === 'COMPLIMENTARY' ? data?.feePolicy.complimentary : method === 'FREE' ? data?.feePolicy.free : data?.feePolicy.terminal}</Text>

          {method === 'STRIPE_TERMINAL' && !readerReady && (
            <Pressable disabled={working} onPress={() => void connectTapToPay()} style={styles.reader}>
              <Text style={styles.readerText}>{working ? 'Connecting…' : 'Connect Tap to Pay'}</Text>
            </Pressable>
          )}
          {method === 'STRIPE_TERMINAL' && readerReady && <>
            <Text style={styles.ready}>✓ Tap to Pay is ready</Text>
            <Pressable disabled={working} onPress={() => void disconnectTapToPay()} style={[styles.reader, styles.disconnectReader]}>
              <Text style={styles.disconnectReaderText}>{working ? 'Disconnecting…' : 'Disconnect Tap to Pay'}</Text>
            </Pressable>
          </>}

          <View style={styles.total}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>£{total.toFixed(2)}</Text>
          </View>
          <Pressable disabled={working || !lines.length} onPress={() => void submit()} style={[styles.pay, (!lines.length || working) && styles.disabled]}>
            {working ? <ActivityIndicator color="#fff" /> : (
              <Text style={styles.payText}>{method === 'FREE' ? 'Issue free ticket' : method === 'COMPLIMENTARY' ? 'Issue complimentary ticket' : 'Take payment'}</Text>
            )}
          </Pressable>
          <Text style={styles.notice}>Tap to Pay requires a development or production build; Expo Go cannot use Stripe Terminal.</Text>
        </ScrollView>
      </SafeAreaView>

      <Modal visible={educationVisible} animationType="slide" transparent onRequestClose={() => setEducationVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.educationCard}>
            <Text style={styles.educationEyebrow}>TAP TO PAY ON {Platform.OS === 'android' ? 'ANDROID' : 'IPHONE'}</Text>
            <Text style={styles.educationTitle}>Your {Platform.OS === 'android' ? 'Android phone' : 'iPhone'} is the card reader</Text>
            <Text style={styles.educationCopy}>{Platform.OS === 'android'
              ? 'Accept contactless debit and credit cards and supported digital wallets directly on this Android phone. No separate card reader is needed.'
              : 'Accept contactless debit and credit cards, Apple Pay, and other supported digital wallets directly on this iPhone. No separate card reader is needed.'}</Text>
            <View style={styles.educationStep}><Text style={styles.educationNumber}>1</Text><Text style={styles.educationStepText}>Confirm the ticket total before starting payment.</Text></View>
            <View style={styles.educationStep}><Text style={styles.educationNumber}>2</Text><Text style={styles.educationStepText}>{Platform.OS === 'android' ? 'Ask the customer to hold their contactless card or device near the back of the Android phone when prompted.' : 'Ask the customer to hold their contactless card or device near the top of the iPhone when prompted.'}</Text></View>
            <View style={styles.educationStep}><Text style={styles.educationNumber}>3</Text><Text style={styles.educationStepText}>Keep the {Platform.OS === 'android' ? 'Android phone' : 'iPhone'} still until the payment is approved or declined.</Text></View>
            <Text style={styles.educationFootnote}>{Platform.OS === 'ios' ? 'Apple and Stripe will display the secure payment interface.' : 'Stripe will display the secure contactless payment interface.'}</Text>
            <Pressable style={styles.educationContinue} onPress={() => void continueFromEducation()}><Text style={styles.educationContinueText}>Continue</Text></Pressable>
            <Pressable style={styles.educationCancel} onPress={() => setEducationVisible(false)}><Text style={styles.educationCancelText}>Not now</Text></Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default function BoxOfficeScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const id = Array.isArray(eventId) ? eventId[0] : eventId;
  const { sessionToken, user } = useAuth();
  if (!id || !sessionToken || !user) return <View style={styles.center}><Text>Choose an event after signing in.</Text></View>;

  return (
    <MerchantAccessGate userId={user.id}>{security => <StripeTerminalProvider tokenProvider={async () => {
      const response = await fetch('https://www.outnowtickets.com/api/box-office/terminal/connection-token', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${sessionToken}` },
        body: JSON.stringify({ eventId: id }),
      });
      const body = await response.json();
      if (!response.ok || !body.secret) throw new Error(body.error || 'Terminal token unavailable.');
      return body.secret;
    }}>
      <BoxOfficeContent eventId={id} security={security} />
    </StripeTerminalProvider>}</MerchantAccessGate>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  content: { padding: 18, paddingBottom: 44 },
  top: { height: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { fontSize: 36, lineHeight: 38, color: '#111827' },
  topTitle: { fontSize: 14, fontWeight: '900', color: '#111827' },
  eyebrow: { color: '#7c3aed', fontSize: 10, fontWeight: '900', letterSpacing: 1.6, marginTop: 16 },
  title: { fontSize: 30, fontWeight: '900', color: '#111827', marginTop: 6 },
  copy: { color: '#6b7280', marginTop: 6, marginBottom: 12 },
  activityCard: { borderRadius: 14, backgroundColor: '#f5f3ff', borderWidth: 1, borderColor: '#ddd6fe', padding: 13, marginBottom: 4 },
  activityLabel: { color: '#6d28d9', fontSize: 9, fontWeight: '900', letterSpacing: 1.1 },
  activityValue: { color: '#312e81', fontSize: 12, fontWeight: '900', marginTop: 5 },
  securityCard: { borderRadius: 16, borderWidth: 1, borderColor: '#ddd6fe', backgroundColor: '#faf8ff', padding: 14, marginTop: 8 },
  securityTitle: { color: '#4c1d95', fontSize: 13, fontWeight: '900' },
  securityCopy: { color: '#5b556b', fontSize: 11, lineHeight: 17, marginTop: 5 },
  securityButton: { alignSelf: 'flex-start', borderRadius: 10, borderWidth: 1, borderColor: '#a78bfa', paddingHorizontal: 11, paddingVertical: 8, marginTop: 10 },
  securityButtonText: { color: '#6d28d9', fontSize: 11, fontWeight: '900' },
  securityNotice: { color: '#6d28d9', fontSize: 10, lineHeight: 15, marginTop: 9 },
  section: { fontSize: 15, fontWeight: '900', color: '#111827', marginTop: 22, marginBottom: 8 },
  ticket: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 16, padding: 13, flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  ticketName: { fontWeight: '900', color: '#111827' },
  muted: { fontSize: 11, color: '#6b7280', marginTop: 4 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  step: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#f3efff', alignItems: 'center', justifyContent: 'center' },
  quantity: { fontWeight: '900', minWidth: 14, textAlign: 'center' },
  input: { height: 48, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 13, paddingHorizontal: 13, marginTop: 8, color: '#111827' },
  methods: { flexDirection: 'row', gap: 7 },
  method: { flex: 1, minHeight: 45, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  methodActive: { borderColor: '#7c3aed', backgroundColor: '#f3efff' },
  methodText: { fontSize: 10, fontWeight: '900', color: '#6b7280' },
  methodTextActive: { color: '#6d28d9' },
  policy: { fontSize: 11, lineHeight: 16, color: '#6b7280', marginTop: 10 },
  reader: { height: 48, borderRadius: 13, borderWidth: 1, borderColor: '#7c3aed', alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  readerText: { color: '#6d28d9', fontWeight: '900' },
  disconnectReader: { borderColor: '#d1d5db', backgroundColor: '#fff' },
  disconnectReaderText: { color: '#4b5563', fontWeight: '900' },
  ready: { marginTop: 12, color: '#047857', fontSize: 12, fontWeight: '800' },
  total: { marginTop: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 16 },
  totalLabel: { fontSize: 15, fontWeight: '800' },
  totalValue: { fontSize: 27, fontWeight: '900' },
  pay: { height: 54, borderRadius: 15, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center', marginTop: 15 },
  disabled: { opacity: 0.45 },
  payText: { color: '#fff', fontWeight: '900' },
  notice: { fontSize: 10, color: '#6b7280', lineHeight: 15, textAlign: 'center', marginTop: 13 },
  error: { backgroundColor: '#fef2f2', padding: 12, borderRadius: 12, marginTop: 14 },
  errorText: { color: '#b91c1c', fontSize: 11 },
  successCard: { marginTop: 16, padding: 18, borderRadius: 18, backgroundColor: '#ecfdf5', borderWidth: 1, borderColor: '#a7f3d0' },
  refundCard: { backgroundColor: '#f9fafb', borderColor: '#d1d5db' },
  successEyebrow: { color: '#047857', fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  successAmount: { color: '#111827', fontSize: 32, fontWeight: '900', marginTop: 7 },
  successTitle: { color: '#111827', fontSize: 16, fontWeight: '900', marginTop: 4 },
  successMeta: { color: '#4b5563', fontSize: 11, lineHeight: 16, marginTop: 6 },
  successActions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  successSecondary: { flex: 1, height: 44, borderRadius: 12, borderWidth: 1, borderColor: '#a7f3d0', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  successSecondaryText: { color: '#047857', fontWeight: '900', fontSize: 12 },
  refundButton: { height: 42, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  refundButtonText: { color: '#b91c1c', fontWeight: '900', fontSize: 12 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(17,24,39,0.64)', justifyContent: 'flex-end' },
  educationCard: { backgroundColor: '#fff', padding: 22, paddingBottom: 32, borderTopLeftRadius: 26, borderTopRightRadius: 26 },
  educationEyebrow: { color: '#7c3aed', fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  educationTitle: { color: '#111827', fontSize: 25, fontWeight: '900', marginTop: 8 },
  educationCopy: { color: '#4b5563', fontSize: 14, lineHeight: 20, marginTop: 10, marginBottom: 16 },
  educationStep: { flexDirection: 'row', gap: 11, alignItems: 'flex-start', marginTop: 11 },
  educationNumber: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#f3efff', color: '#6d28d9', textAlign: 'center', lineHeight: 28, fontWeight: '900' },
  educationStepText: { flex: 1, color: '#374151', fontSize: 13, lineHeight: 19, paddingTop: 4 },
  educationFootnote: { color: '#6b7280', fontSize: 11, lineHeight: 16, marginTop: 18 },
  educationContinue: { height: 52, borderRadius: 14, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  educationContinueText: { color: '#fff', fontWeight: '900' },
  educationCancel: { height: 44, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  educationCancelText: { color: '#6b7280', fontWeight: '800' },
});
