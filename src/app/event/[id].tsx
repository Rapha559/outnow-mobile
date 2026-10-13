import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/auth-context';
import { API_BASE, apiRequest } from '@/lib/api';

type TicketType = {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  quantity: number;
  sold: number;
  maxPerOrder?: number | null;
  isActive: boolean;
};

type EventDetails = {
  id: string;
  title: string;
  date: string;
  venue: string;
  location: string;
  image?: string | null;
  category: { name: string };
  ticketTypes: TicketType[];
};

type CheckoutResponse = {
  success: true;
  url: string;
  orderId: string;
  orderNumber: string;
  reservationExpiresAt: string;
};

function imageUrl(value?: string | null) {
  if (!value) return `${API_BASE}/images/event-placeholder.jpg`;
  if (/^https?:\/\//i.test(value)) return value;
  return `${API_BASE}${value.startsWith('/') ? value : `/${value}`}`;
}

export default function EventDetailsScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { isAuthenticated, sessionToken } = useAuth();
  const [event, setEvent] = useState<EventDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [checkoutError, setCheckoutError] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!id) return;

    fetch(`${API_BASE}/api/events/${id}/tickets`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || 'Unable to load this event.');
        setEvent(data.event ?? null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load this event.'))
      .finally(() => setLoading(false));
  }, [id]);

  const startingPrice = useMemo(() => {
    if (!event?.ticketTypes?.length) return null;
    return Math.min(...event.ticketTypes.map((ticket) => ticket.price));
  }, [event]);

  const selectedTickets = useMemo(() => {
    if (!event) return [];
    return event.ticketTypes
      .map((ticket) => ({ ticket, quantity: quantities[ticket.id] || 0 }))
      .filter((item) => item.quantity > 0);
  }, [event, quantities]);

  const subtotal = selectedTickets.reduce((total, item) => total + item.ticket.price * item.quantity, 0);
  const bookingFee = subtotal * 0.05;
  const estimatedTotal = subtotal + bookingFee;
  const selectedCount = selectedTickets.reduce((total, item) => total + item.quantity, 0);

  const formattedDate = useMemo(() => {
    if (!event?.date) return '';
    const date = new Date(event.date);
    if (Number.isNaN(date.getTime())) return event.date;
    return new Intl.DateTimeFormat('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }, [event?.date]);

  function changeQuantity(ticket: TicketType, delta: number) {
    const remaining = Math.max(0, ticket.quantity - ticket.sold);
    const max = Math.min(remaining, ticket.maxPerOrder || 10);
    const current = quantities[ticket.id] || 0;
    const next = Math.max(0, Math.min(max, current + delta));
    setQuantities((previous) => ({ ...previous, [ticket.id]: next }));
    setCheckoutError('');
  }

  async function checkout() {
    if (!event) return;

    if (!isAuthenticated || !sessionToken) {
      router.push({ pathname: '/login', params: { redirect: `/event/${event.id}` } });
      return;
    }

    if (selectedTickets.length === 0) {
      setCheckoutError('Choose at least one ticket first.');
      return;
    }

    try {
      setCheckoutLoading(true);
      setCheckoutError('');
      const data = await apiRequest<CheckoutResponse>(
        '/api/mobile/checkout',
        {
          method: 'POST',
          body: JSON.stringify({
            eventId: event.id,
            tickets: selectedTickets.map((item) => ({
              ticketTypeId: item.ticket.id,
              quantity: item.quantity,
            })),
          }),
        },
        sessionToken,
      );

      await WebBrowser.openBrowserAsync(data.url, {
        showTitle: true,
        enableBarCollapsing: true,
      });

      router.replace('/(tabs)/tickets');
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : 'Unable to start checkout.');
    } finally {
      setCheckoutLoading(false);
    }
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.topBar}>
          <Pressable style={styles.backButton} onPress={() => router.back()} accessibilityLabel="Go back">
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <Text style={styles.topTitle}>Event</Text>
          <View style={styles.topSpacer} />
        </View>

        {loading ? (
          <View style={styles.center}><ActivityIndicator size="large" color="#8b5cf6" /></View>
        ) : error || !event ? (
          <View style={styles.center}>
            <Text style={styles.errorTitle}>Event unavailable</Text>
            <Text style={styles.errorCopy}>{error || 'This event could not be found.'}</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content}>
            <Image source={{ uri: imageUrl(event.image) }} style={styles.heroImage} contentFit="cover" />

            <View style={styles.categoryPill}><Text style={styles.categoryText}>{event.category?.name || 'Event'}</Text></View>
            <Text style={styles.title}>{event.title}</Text>
            <Text style={styles.date}>{formattedDate}</Text>

            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>VENUE</Text>
              <Text style={styles.infoTitle}>{event.venue}</Text>
              <Text style={styles.infoCopy}>{event.location}</Text>
            </View>

            <View style={styles.headingRow}>
              <Text style={styles.heading}>Choose tickets</Text>
              {startingPrice !== null && <Text style={styles.startingPrice}>From £{startingPrice.toFixed(2)}</Text>}
            </View>

            {event.ticketTypes.length === 0 ? (
              <View style={styles.emptyTickets}>
                <Text style={styles.emptyTitle}>Tickets coming soon</Text>
                <Text style={styles.emptyCopy}>Ticket options have not been released for this event yet.</Text>
              </View>
            ) : (
              <View style={styles.ticketList}>
                {event.ticketTypes.map((ticket) => {
                  const remaining = Math.max(0, ticket.quantity - ticket.sold);
                  const quantity = quantities[ticket.id] || 0;
                  const unavailable = !ticket.isActive || remaining <= 0;
                  const max = Math.min(remaining, ticket.maxPerOrder || 10);

                  return (
                    <View key={ticket.id} style={styles.ticketCard}>
                      <View style={styles.ticketTop}>
                        <View style={styles.ticketBody}>
                          <Text style={styles.ticketName}>{ticket.name}</Text>
                          {!!ticket.description && <Text style={styles.ticketDescription}>{ticket.description}</Text>}
                          <Text style={styles.remaining}>{remaining > 0 ? `${remaining} remaining` : 'Sold out'}</Text>
                        </View>
                        <Text style={styles.ticketPrice}>£{ticket.price.toFixed(2)}</Text>
                      </View>

                      <View style={styles.quantityRow}>
                        <Pressable disabled={quantity <= 0} style={[styles.quantityButton, quantity <= 0 && styles.quantityDisabled]} onPress={() => changeQuantity(ticket, -1)}>
                          <Text style={styles.quantityButtonText}>−</Text>
                        </Pressable>
                        <View style={styles.quantityValue}><Text style={styles.quantityText}>{quantity}</Text></View>
                        <Pressable disabled={unavailable || quantity >= max} style={[styles.quantityButton, (unavailable || quantity >= max) && styles.quantityDisabled]} onPress={() => changeQuantity(ticket, 1)}>
                          <Text style={styles.quantityButtonText}>+</Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {selectedCount > 0 && (
              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Tickets ({selectedCount})</Text><Text style={styles.summaryValue}>£{subtotal.toFixed(2)}</Text></View>
                <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Booking fee (5%)</Text><Text style={styles.summaryValue}>£{bookingFee.toFixed(2)}</Text></View>
                <View style={[styles.summaryRow, styles.totalRow]}><Text style={styles.totalLabel}>Estimated total</Text><Text style={styles.totalValue}>£{estimatedTotal.toFixed(2)}</Text></View>
              </View>
            )}

            {!!checkoutError && <Text style={styles.checkoutError}>{checkoutError}</Text>}

            <Pressable
              disabled={checkoutLoading || !event.ticketTypes.some((ticket) => ticket.quantity - ticket.sold > 0)}
              onPress={() => void checkout()}
              style={({ pressed }) => [
                styles.buyButton,
                !event.ticketTypes.some((ticket) => ticket.quantity - ticket.sold > 0) && styles.buyButtonDisabled,
                pressed && styles.pressed,
              ]}>
              {checkoutLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buyText}>
                  {!isAuthenticated ? 'Sign in to checkout' : selectedCount > 0 ? `Pay £${estimatedTotal.toFixed(2)} with Stripe` : 'Choose tickets'}
                </Text>
              )}
            </Pressable>

            <Text style={styles.note}>Stripe Checkout opens securely in your browser. Return to OutNow after payment to access your QR ticket.</Text>
            <View style={{ height: 40 }} />
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#07070a' },
  safeArea: { flex: 1 },
  topBar: { height: 58, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#15151b', borderWidth: 1, borderColor: '#292932', alignItems: 'center', justifyContent: 'center' },
  backText: { color: '#fff', fontSize: 34, lineHeight: 36, marginTop: -3 },
  topTitle: { color: '#fff', fontSize: 15, fontWeight: '800' },
  topSpacer: { width: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 10 },
  errorTitle: { color: '#fff', fontSize: 20, fontWeight: '900' },
  errorCopy: { color: '#8e8e99', textAlign: 'center', lineHeight: 20 },
  content: { paddingHorizontal: 18 },
  heroImage: { width: '100%', aspectRatio: 1.25, borderRadius: 22, backgroundColor: '#15151b' },
  categoryPill: { alignSelf: 'flex-start', marginTop: 20, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 999, backgroundColor: '#1b1624', borderWidth: 1, borderColor: '#392b4e' },
  categoryText: { color: '#c4b5fd', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.8 },
  title: { color: '#fff', fontSize: 32, lineHeight: 37, fontWeight: '900', marginTop: 12 },
  date: { color: '#a7a7b1', fontSize: 14, lineHeight: 21, marginTop: 9 },
  infoCard: { marginTop: 22, borderRadius: 18, borderWidth: 1, borderColor: '#23232c', backgroundColor: '#101014', padding: 17 },
  infoLabel: { color: '#8b5cf6', fontSize: 9, fontWeight: '900', letterSpacing: 1.4 },
  infoTitle: { color: '#fff', fontSize: 17, fontWeight: '800', marginTop: 7 },
  infoCopy: { color: '#8e8e99', fontSize: 13, marginTop: 4 },
  headingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 28, marginBottom: 12 },
  heading: { color: '#fff', fontSize: 22, fontWeight: '900' },
  startingPrice: { color: '#c4b5fd', fontWeight: '800', fontSize: 12 },
  emptyTickets: { borderRadius: 18, borderWidth: 1, borderColor: '#23232c', backgroundColor: '#101014', padding: 20 },
  emptyTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
  emptyCopy: { color: '#8e8e99', marginTop: 6, lineHeight: 19 },
  ticketList: { gap: 10 },
  ticketCard: { borderRadius: 17, borderWidth: 1, borderColor: '#23232c', backgroundColor: '#101014', padding: 15 },
  ticketTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  ticketBody: { flex: 1 },
  ticketName: { color: '#fff', fontSize: 16, fontWeight: '900' },
  ticketDescription: { color: '#8e8e99', fontSize: 12, marginTop: 4 },
  remaining: { color: '#a78bfa', fontSize: 10, fontWeight: '800', marginTop: 7 },
  ticketPrice: { color: '#fff', fontSize: 18, fontWeight: '900' },
  quantityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 14, gap: 8 },
  quantityButton: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, borderColor: '#393944', backgroundColor: '#17171d', alignItems: 'center', justifyContent: 'center' },
  quantityDisabled: { opacity: 0.35 },
  quantityButtonText: { color: '#fff', fontSize: 22, fontWeight: '700', lineHeight: 24 },
  quantityValue: { minWidth: 44, height: 38, alignItems: 'center', justifyContent: 'center' },
  quantityText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  summaryCard: { marginTop: 18, borderRadius: 18, borderWidth: 1, borderColor: '#2b2537', backgroundColor: '#121017', padding: 16, gap: 10 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryLabel: { color: '#9b9ba6', fontSize: 12 },
  summaryValue: { color: '#d6d6dc', fontSize: 12, fontWeight: '800' },
  totalRow: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#34303d', paddingTop: 12, marginTop: 2 },
  totalLabel: { color: '#fff', fontSize: 14, fontWeight: '900' },
  totalValue: { color: '#fff', fontSize: 20, fontWeight: '900' },
  checkoutError: { color: '#fb7185', fontSize: 12, lineHeight: 18, marginTop: 14, textAlign: 'center' },
  buyButton: { height: 56, borderRadius: 16, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center', marginTop: 22 },
  buyButtonDisabled: { backgroundColor: '#24242b' },
  buyText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  pressed: { opacity: 0.82 },
  note: { color: '#72727e', fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 10 },
});
