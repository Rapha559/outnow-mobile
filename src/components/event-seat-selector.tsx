import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { API_BASE, apiRequest } from '@/lib/api';

export type SelectedSeat = {
  id: string;
  ticketTypeId: string;
  ticketTypeName: string;
  price: number;
  label: string;
};

export type SeatingSeat = {
  id: string;
  sectionName: string;
  rowLabel: string | null;
  seatNumber: string | null;
  x: number;
  y: number;
  kind: 'STANDARD' | 'ACCESSIBLE' | 'COMPANION' | 'TABLE' | string;
  price: number;
  status: 'AVAILABLE' | 'HELD' | 'SOLD' | 'BLOCKED';
  ticketTypeId: string | null;
  ticketTypeName: string | null;
};

export type SeatSelectionState = {
  requiresSeats: boolean;
  holdId: string | null;
  holdToken: string | null;
  expiresAt: string | null;
  selectedSeatIds: string[];
  selectedSeatLabels: string[];
  selectedSeats: SelectedSeat[];
};

type SeatingResponse = {
  success: boolean;
  event?: { canvasWidth?: number; canvasHeight?: number };
  seats?: SeatingSeat[];
  message?: string;
};

type HoldResponse = {
  success: true;
  holdId: string;
  holdToken: string;
  expiresAt: string;
  seatCount: number;
};

type Props = {
  eventId: string;
  sessionToken: string | null;
  onSeatingChange?: (seats: SeatingSeat[]) => void;
  onStateChange: (state: SeatSelectionState) => void;
};

const EMPTY_STATE: SeatSelectionState = {
  requiresSeats: false,
  holdId: null,
  holdToken: null,
  expiresAt: null,
  selectedSeatIds: [],
  selectedSeatLabels: [],
  selectedSeats: [],
};

function seatLabel(seat: SeatingSeat) {
  const row = seat.rowLabel ? `Row ${seat.rowLabel}` : 'No row';
  const number = seat.seatNumber ? `Seat ${seat.seatNumber}` : seat.kind === 'TABLE' ? 'Table' : 'No number';
  return `${seat.sectionName} · ${row} · ${number}`;
}

function seatColour(seat: SeatingSeat, selected: boolean) {
  if (selected) return '#7c3aed';
  if (seat.status === 'HELD') return '#f97316';
  if (seat.status === 'SOLD' || seat.status === 'BLOCKED') return '#475569';
  if (seat.kind === 'ACCESSIBLE') return '#0891b2';
  if (seat.kind === 'COMPANION') return '#0d9488';
  return '#22c55e';
}

export default function EventSeatSelector({ eventId, sessionToken, onSeatingChange, onStateChange }: Props) {
  const [seats, setSeats] = useState<SeatingSeat[]>([]);
  const [canvas, setCanvas] = useState({ width: 1000, height: 700 });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [hold, setHold] = useState<HoldResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [holding, setHolding] = useState(false);
  const [error, setError] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(0);

  const loadSeating = useCallback(async (showLoader = false) => {
    try {
      if (showLoader) setLoading(true);
      const response = await fetch(`${API_BASE}/api/events/${encodeURIComponent(eventId)}/seating`, {
        headers: { accept: 'application/json' },
      });
      const data: SeatingResponse = await response.json();
      if (response.status === 404) {
        setSeats([]);
        onSeatingChange?.([]);
        return;
      }
      if (!response.ok || !data.success) throw new Error(data.message || 'Unable to load seats.');

      const nextSeats = data.seats || [];
      setSeats(nextSeats);
      setCanvas({ width: Number(data.event?.canvasWidth) || 1000, height: Number(data.event?.canvasHeight) || 700 });
      setSelectedIds(current => current.filter(id => nextSeats.some(seat => seat.id === id)));
      onSeatingChange?.(nextSeats);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load seats.');
    } finally {
      setLoading(false);
    }
  }, [eventId, onSeatingChange]);

  useEffect(() => {
    const bootstrap = setTimeout(() => void loadSeating(true), 0);
    return () => clearTimeout(bootstrap);
  }, [loadSeating]);
  useEffect(() => {
    const poll = setInterval(() => void loadSeating(false), 15_000);
    return () => clearInterval(poll);
  }, [loadSeating]);

  useEffect(() => {
    if (!hold?.expiresAt) {
      const clear = setTimeout(() => setSecondsLeft(0), 0);
      return () => clearTimeout(clear);
    }
    const update = () => setSecondsLeft(Math.max(0, Math.ceil((new Date(hold.expiresAt).getTime() - Date.now()) / 1000)));
    const start = setTimeout(update, 0);
    const timer = setInterval(update, 1_000);
    return () => { clearTimeout(start); clearInterval(timer); };
  }, [hold?.expiresAt]);

  useEffect(() => {
    if (!hold || secondsLeft !== 0) return;
    const expiry = setTimeout(() => {
      setHold(null);
      setSelectedIds([]);
      setError('Your 10-minute seat hold expired. Please choose your seats again.');
      void loadSeating(false);
    }, 0);
    return () => clearTimeout(expiry);
  }, [hold, loadSeating, secondsLeft]);

  const selectedSeats = useMemo(() => selectedIds
    .map(id => seats.find(seat => seat.id === id))
    .filter((seat): seat is SeatingSeat => Boolean(seat?.ticketTypeId))
    .map(seat => ({
      id: seat.id,
      ticketTypeId: seat.ticketTypeId!,
      ticketTypeName: seat.ticketTypeName || 'Reserved seat',
      price: seat.price,
      label: seatLabel(seat),
    })), [selectedIds, seats]);

  useEffect(() => {
    onStateChange(selectedSeats.length ? {
      requiresSeats: true,
      holdId: hold?.holdId || null,
      holdToken: hold?.holdToken || null,
      expiresAt: hold?.expiresAt || null,
      selectedSeatIds: selectedIds,
      selectedSeatLabels: selectedSeats.map(seat => seat.label),
      selectedSeats,
    } : EMPTY_STATE);
  }, [hold, onStateChange, selectedIds, selectedSeats]);

  function toggleSeat(seat: SeatingSeat) {
    if (hold || holding || seat.status !== 'AVAILABLE' || !seat.ticketTypeId) return;
    setError('');
    setSelectedIds(current => {
      if (current.includes(seat.id)) return current.filter(id => id !== seat.id);
      if (current.length >= 20) {
        setError('You can select up to 20 reserved seats in one order.');
        return current;
      }
      return [...current, seat.id];
    });
  }

  async function reserveSeats() {
    if (!sessionToken) { setError('Sign in before reserving seats.'); return; }
    if (!selectedIds.length) { setError('Choose at least one available seat.'); return; }
    try {
      setHolding(true);
      setError('');
      const data = await apiRequest<HoldResponse>(`/api/mobile/events/${eventId}/seating/hold`, {
        method: 'POST',
        body: JSON.stringify({ seatIds: selectedIds }),
      }, sessionToken);
      setHold(data);
      await loadSeating(false);
    } catch (holdError) {
      setHold(null);
      setSelectedIds([]);
      setError(holdError instanceof Error ? holdError.message : 'Unable to reserve those seats.');
      await loadSeating(false);
    } finally {
      setHolding(false);
    }
  }

  async function releaseHold() {
    if (!hold || !sessionToken) { setHold(null); return; }
    const current = hold;
    setHold(null);
    try {
      await apiRequest(`/api/mobile/events/${eventId}/seating/hold`, {
        method: 'DELETE',
        body: JSON.stringify({ holdId: current.holdId, holdToken: current.holdToken }),
      }, sessionToken);
    } catch {
      // The server releases an unconfirmed hold automatically after ten minutes.
    }
    setSelectedIds([]);
    await loadSeating(false);
  }

  if (loading && !seats.length) return <View style={styles.card}><ActivityIndicator color="#7c3aed" /><Text style={styles.muted}>Loading seating map…</Text></View>;
  if (!seats.length) return null;

  const sections = [...new Set(seats.map(seat => seat.sectionName))];
  const mm = Math.floor(secondsLeft / 60).toString().padStart(2, '0');
  const ss = (secondsLeft % 60).toString().padStart(2, '0');

  return <View style={styles.card}>
    <View style={styles.titleRow}><Text style={styles.title}>Choose your seats</Text><Pressable disabled={holding} onPress={() => void loadSeating(false)}><Text style={styles.refresh}>Refresh</Text></Pressable></View>
    <Text style={styles.muted}>This is the same live seat map used on the website. Tap available seats, then reserve them for 10 minutes before checkout.</Text>
    <View style={styles.legend}><Text style={styles.legendAvailable}>● Available</Text><Text style={styles.legendSelected}>● Selected</Text><Text style={styles.legendHeld}>● Held</Text><Text style={styles.legendSold}>● Sold</Text></View>
    <View style={styles.mapCanvas}>
      <View style={styles.stage}><Text style={styles.stageText}>STAGE</Text></View>
      {seats.map(seat => {
        const selected = selectedIds.includes(seat.id);
        const unavailable = !selected && seat.status !== 'AVAILABLE';
        const left = Math.max(1, Math.min(97, (seat.x / canvas.width) * 100));
        const top = Math.max(10, Math.min(94, 9 + (seat.y / canvas.height) * 85));
        return <Pressable
          key={seat.id}
          accessibilityLabel={`${seatLabel(seat)}. ${seat.status.toLowerCase()}.`}
          accessibilityRole="button"
          accessibilityState={{ disabled: Boolean(hold) || unavailable || holding, selected }}
          disabled={Boolean(hold) || unavailable || holding}
          onPress={() => toggleSeat(seat)}
          style={[styles.mapSeat, { left: `${left}%`, top: `${top}%`, backgroundColor: seatColour(seat, selected) }, seat.kind === 'TABLE' && styles.tableSeat, unavailable && styles.unavailableSeat, selected && styles.selectedSeat]}
        >
          <Text style={styles.mapSeatText}>{seat.kind === 'ACCESSIBLE' ? '♿' : seat.kind === 'COMPANION' ? 'C' : ''}</Text>
        </Pressable>;
      })}
    </View>
    <View style={styles.sectionChips}>{sections.map(section => <View key={section} style={styles.sectionChip}><Text style={styles.sectionChipText}>{section}</Text></View>)}</View>
    {!!selectedSeats.length && <View style={styles.summary}>{selectedSeats.map(seat => <Text key={seat.id} style={styles.summaryText}>• {seat.label} · {seat.ticketTypeName}</Text>)}</View>}
    {!!error && <Text style={styles.error}>{error}</Text>}
    {hold ? <View style={styles.heldBox}>
      <Text style={styles.heldTitle}>Seats reserved · {mm}:{ss}</Text>
      <Text style={styles.heldText}>Your selected seats are shared with the website and stay held while you continue to checkout.</Text>
      <Pressable disabled={holding} style={styles.changeButton} onPress={() => void releaseHold()}><Text style={styles.changeText}>Change seats</Text></Pressable>
    </View> : <Pressable disabled={!selectedSeats.length || holding} style={[styles.reserveButton, (!selectedSeats.length || holding) && styles.disabled]} onPress={() => void reserveSeats()}>
      {holding ? <ActivityIndicator color="#fff" /> : <Text style={styles.reserveText}>Reserve selected seats</Text>}
    </Pressable>}
  </View>;
}

const styles = StyleSheet.create({
  card: { marginTop: 18, borderRadius: 18, borderWidth: 1, borderColor: '#ddd6fe', backgroundColor: '#faf5ff', padding: 15 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { fontSize: 18, fontWeight: '900', color: '#111827' },
  refresh: { color: '#6d28d9', fontSize: 12, fontWeight: '900' },
  muted: { fontSize: 11, lineHeight: 17, color: '#6b7280', marginTop: 5 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 12 },
  legendAvailable: { color: '#15803d', fontSize: 10, fontWeight: '800' }, legendSelected: { color: '#6d28d9', fontSize: 10, fontWeight: '800' }, legendHeld: { color: '#c2410c', fontSize: 10, fontWeight: '800' }, legendSold: { color: '#475569', fontSize: 10, fontWeight: '800' },
  mapCanvas: { height: 340, marginTop: 14, borderRadius: 15, borderWidth: 1, borderColor: '#ddd6fe', backgroundColor: '#111827', overflow: 'hidden', position: 'relative' },
  stage: { position: 'absolute', zIndex: 1, top: 0, left: '18%', right: '18%', height: 35, borderBottomLeftRadius: 42, borderBottomRightRadius: 42, backgroundColor: '#312e81', alignItems: 'center', justifyContent: 'center' },
  stageText: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  mapSeat: { position: 'absolute', width: 24, height: 24, marginLeft: -12, marginTop: -12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,.65)', alignItems: 'center', justifyContent: 'center' },
  tableSeat: { borderRadius: 6 }, unavailableSeat: { opacity: 0.45 }, selectedSeat: { borderColor: '#fff', borderWidth: 2, shadowColor: '#a78bfa', shadowOpacity: 0.9, shadowRadius: 5, elevation: 3 }, mapSeatText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  sectionChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 12 }, sectionChip: { borderRadius: 999, borderWidth: 1, borderColor: '#c4b5fd', backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 6 }, sectionChipText: { color: '#5b21b6', fontSize: 10, fontWeight: '800' },
  summary: { marginTop: 14, borderRadius: 12, backgroundColor: '#fff', padding: 11, gap: 4 }, summaryText: { fontSize: 11, color: '#374151', fontWeight: '700' }, error: { marginTop: 10, color: '#dc2626', fontSize: 11, fontWeight: '800' },
  reserveButton: { height: 48, borderRadius: 13, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center', marginTop: 14 }, reserveText: { color: '#fff', fontWeight: '900' }, disabled: { opacity: 0.45 },
  heldBox: { marginTop: 14, borderRadius: 13, borderWidth: 1, borderColor: '#86efac', backgroundColor: '#f0fdf4', padding: 12 }, heldTitle: { color: '#166534', fontWeight: '900' }, heldText: { color: '#166534', fontSize: 11, lineHeight: 17, marginTop: 4 },
  changeButton: { height: 38, borderRadius: 10, borderWidth: 1, borderColor: '#16a34a', alignItems: 'center', justifyContent: 'center', marginTop: 10 }, changeText: { color: '#15803d', fontWeight: '900' },
});
