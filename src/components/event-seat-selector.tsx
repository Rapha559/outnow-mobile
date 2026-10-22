import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { API_BASE, apiRequest } from '@/lib/api';

export type SeatSelectionState = {
  requiresSeats: boolean;
  holdId: string | null;
  holdToken: string | null;
  expiresAt: string | null;
  selectedSeatIds: string[];
  selectedSeatLabels: string[];
};

type SelectedTicket = { ticketTypeId: string; name: string; quantity: number };
type Seat = {
  id: string;
  sectionName: string;
  rowLabel: string | null;
  seatNumber: string | null;
  kind: string;
  price: number;
  status: string;
  ticketTypeId: string | null;
  ticketTypeName: string | null;
};
type SeatingResponse = { success: true; seats: Seat[] };
type HoldResponse = { success: true; holdId: string; holdToken: string; expiresAt: string; seatCount: number };

type Props = {
  eventId: string;
  sessionToken: string | null;
  selectedTickets: SelectedTicket[];
  onStateChange: (state: SeatSelectionState) => void;
};

const EMPTY_STATE: SeatSelectionState = {
  requiresSeats: false,
  holdId: null,
  holdToken: null,
  expiresAt: null,
  selectedSeatIds: [],
  selectedSeatLabels: [],
};

function seatLabel(seat: Seat) {
  return `${seat.sectionName} · Row ${seat.rowLabel || '—'} · Seat ${seat.seatNumber || '—'}`;
}

export default function EventSeatSelector({ eventId, sessionToken, selectedTickets, onStateChange }: Props) {
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [hold, setHold] = useState<HoldResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [holding, setHolding] = useState(false);
  const [error, setError] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(0);

  const reservedTypeIds = useMemo(() => new Set(seats.map(seat => seat.ticketTypeId).filter(Boolean) as string[]), [seats]);
  const requiredByType = useMemo(() => {
    const map = new Map<string, number>();
    for (const ticket of selectedTickets) if (reservedTypeIds.has(ticket.ticketTypeId)) map.set(ticket.ticketTypeId, ticket.quantity);
    return map;
  }, [selectedTickets, reservedTypeIds]);
  const requiredCount = [...requiredByType.values()].reduce((sum, value) => sum + value, 0);
  const requiresSeats = requiredCount > 0;
  const selectedSeats = useMemo(() => selectedIds.map(id => seats.find(seat => seat.id === id)).filter(Boolean) as Seat[], [selectedIds, seats]);
  const selectedCountByType = useMemo(() => {
    const map = new Map<string, number>();
    for (const seat of selectedSeats) if (seat.ticketTypeId) map.set(seat.ticketTypeId, (map.get(seat.ticketTypeId) || 0) + 1);
    return map;
  }, [selectedSeats]);
  const exactSelection = requiresSeats && [...requiredByType.entries()].every(([id, quantity]) => (selectedCountByType.get(id) || 0) === quantity) && selectedIds.length === requiredCount;

  async function loadSeating() {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`${API_BASE}/api/events/${eventId}/seating`, { headers: { accept: 'application/json' } });
      if (response.status === 404) {
        setSeats([]);
        return;
      }
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || 'Unable to load seats.');
      setSeats((data as SeatingResponse).seats || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load seats.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadSeating(); }, [eventId]);

  useEffect(() => {
    if (!hold?.expiresAt) { setSecondsLeft(0); return; }
    const update = () => setSecondsLeft(Math.max(0, Math.ceil((new Date(hold.expiresAt).getTime() - Date.now()) / 1000)));
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [hold?.expiresAt]);

  useEffect(() => {
    if (hold && secondsLeft === 0) {
      setHold(null);
      setSelectedIds(current => current.length ? [] : current);
      setError('Your seat hold expired. Please choose your seats again.');
      void loadSeating();
    }
  }, [secondsLeft, hold]);

  useEffect(() => {
    if (!requiresSeats) {
      setSelectedIds(current => current.length ? [] : current);
      setHold(current => current ? null : current);
      onStateChange(EMPTY_STATE);
      return;
    }
    onStateChange({
      requiresSeats: true,
      holdId: hold?.holdId || null,
      holdToken: hold?.holdToken || null,
      expiresAt: hold?.expiresAt || null,
      selectedSeatIds: selectedIds,
      selectedSeatLabels: selectedSeats.map(seatLabel),
    });
  }, [requiresSeats, hold, selectedIds, selectedSeats, onStateChange]);

  useEffect(() => {
    if (!hold) return;
    const stillMatches = exactSelection && selectedIds.length === requiredCount;
    if (!stillMatches) void releaseHold();
  }, [selectedTickets]);

  function toggleSeat(seat: Seat) {
    if (hold || seat.status !== 'AVAILABLE' || !seat.ticketTypeId) return;
    const required = requiredByType.get(seat.ticketTypeId) || 0;
    if (!required) return;
    setError('');
    setSelectedIds(current => {
      if (current.includes(seat.id)) return current.filter(id => id !== seat.id);
      const sameTypeCount = current.map(id => seats.find(item => item.id === id)).filter(item => item?.ticketTypeId === seat.ticketTypeId).length;
      if (sameTypeCount >= required) return current;
      return [...current, seat.id];
    });
  }

  async function reserveSeats() {
    if (!sessionToken) { setError('Sign in before reserving seats.'); return; }
    if (!exactSelection) { setError('Choose the correct number of seats for each reserved ticket type.'); return; }
    try {
      setHolding(true);
      setError('');
      const data = await apiRequest<HoldResponse>(`/api/mobile/events/${eventId}/seating/hold`, {
        method: 'POST',
        body: JSON.stringify({ seatIds: selectedIds }),
      }, sessionToken);
      setHold(data);
      await loadSeating();
    } catch (err) {
      setHold(null);
      setSelectedIds(current => current.length ? [] : current);
      setError(err instanceof Error ? err.message : 'Unable to reserve those seats.');
      await loadSeating();
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
    } catch {}
    setSelectedIds(currentIds => currentIds.length ? [] : currentIds);
    await loadSeating();
  }

  if (loading && !seats.length) return <View style={styles.card}><ActivityIndicator color="#7c3aed" /><Text style={styles.muted}>Loading reserved seating…</Text></View>;
  if (!requiresSeats) return null;

  const relevantSeats = seats.filter(seat => seat.ticketTypeId && requiredByType.has(seat.ticketTypeId));
  const sections = [...new Set(relevantSeats.map(seat => seat.sectionName))];
  const mm = Math.floor(secondsLeft / 60).toString().padStart(2, '0');
  const ss = (secondsLeft % 60).toString().padStart(2, '0');

  return <View style={styles.card}>
    <Text style={styles.title}>Choose your seats</Text>
    <Text style={styles.muted}>Select {requiredCount} reserved {requiredCount === 1 ? 'seat' : 'seats'}. Sold or currently held seats cannot be selected.</Text>
    {sections.map(section => <View key={section} style={styles.section}>
      <Text style={styles.sectionTitle}>{section}</Text>
      {[...new Set(relevantSeats.filter(seat => seat.sectionName === section).map(seat => seat.rowLabel || '—'))].map(row => <View key={`${section}-${row}`} style={styles.rowBlock}>
        <Text style={styles.rowLabel}>Row {row}</Text>
        <View style={styles.seatGrid}>{relevantSeats.filter(seat => seat.sectionName === section && (seat.rowLabel || '—') === row).map(seat => {
          const selected = selectedIds.includes(seat.id);
          const available = seat.status === 'AVAILABLE';
          const needed = Boolean(seat.ticketTypeId && requiredByType.get(seat.ticketTypeId));
          return <Pressable key={seat.id} disabled={hold !== null || !available || !needed} onPress={() => toggleSeat(seat)} style={[styles.seat, selected && styles.seatSelected, (!available || !needed) && styles.seatUnavailable]}>
            <Text style={[styles.seatText, selected && styles.seatTextSelected]}>{seat.seatNumber || '—'}</Text>
          </Pressable>;
        })}</View>
      </View>)}
    </View>)}
    {!!selectedSeats.length && <View style={styles.summary}>{selectedSeats.map(seat => <Text key={seat.id} style={styles.summaryText}>• {seatLabel(seat)} · {seat.ticketTypeName || 'Reserved'}</Text>)}</View>}
    {!!error && <Text style={styles.error}>{error}</Text>}
    {hold ? <View style={styles.heldBox}>
      <Text style={styles.heldTitle}>Seats reserved ✓</Text>
      <Text style={styles.heldText}>Complete checkout within {mm}:{ss}. Your hold is extended when checkout starts.</Text>
      <Pressable style={styles.changeButton} onPress={() => void releaseHold()}><Text style={styles.changeText}>Change seats</Text></Pressable>
    </View> : <Pressable disabled={!exactSelection || holding} style={[styles.reserveButton, (!exactSelection || holding) && styles.disabled]} onPress={() => void reserveSeats()}>
      {holding ? <ActivityIndicator color="#fff" /> : <Text style={styles.reserveText}>{exactSelection ? `Reserve ${requiredCount} ${requiredCount === 1 ? 'seat' : 'seats'}` : `Choose ${requiredCount - selectedIds.length} more`}</Text>}
    </Pressable>}
  </View>;
}

const styles = StyleSheet.create({
  card:{marginTop:18,borderRadius:18,borderWidth:1,borderColor:'#ddd6fe',backgroundColor:'#faf5ff',padding:15},
  title:{fontSize:18,fontWeight:'900',color:'#111827'},muted:{fontSize:11,lineHeight:17,color:'#6b7280',marginTop:5},
  section:{marginTop:16},sectionTitle:{fontSize:14,fontWeight:'900',color:'#7c3aed'},rowBlock:{marginTop:10},rowLabel:{fontSize:11,fontWeight:'800',color:'#4b5563',marginBottom:7},
  seatGrid:{flexDirection:'row',flexWrap:'wrap',gap:7},seat:{minWidth:40,height:38,paddingHorizontal:9,borderRadius:10,borderWidth:1,borderColor:'#c4b5fd',backgroundColor:'#fff',alignItems:'center',justifyContent:'center'},
  seatSelected:{backgroundColor:'#7c3aed',borderColor:'#7c3aed'},seatUnavailable:{backgroundColor:'#e5e7eb',borderColor:'#d1d5db',opacity:.55},seatText:{fontSize:11,fontWeight:'900',color:'#4c1d95'},seatTextSelected:{color:'#fff'},
  summary:{marginTop:14,borderRadius:12,backgroundColor:'#fff',padding:11,gap:4},summaryText:{fontSize:11,color:'#374151',fontWeight:'700'},error:{marginTop:10,color:'#dc2626',fontSize:11,fontWeight:'800'},
  reserveButton:{height:48,borderRadius:13,backgroundColor:'#7c3aed',alignItems:'center',justifyContent:'center',marginTop:14},reserveText:{color:'#fff',fontWeight:'900'},disabled:{opacity:.45},
  heldBox:{marginTop:14,borderRadius:13,borderWidth:1,borderColor:'#86efac',backgroundColor:'#f0fdf4',padding:12},heldTitle:{color:'#166534',fontWeight:'900'},heldText:{color:'#166534',fontSize:11,lineHeight:17,marginTop:4},
  changeButton:{height:38,borderRadius:10,borderWidth:1,borderColor:'#16a34a',alignItems:'center',justifyContent:'center',marginTop:10},changeText:{color:'#15803d',fontWeight:'900'},
});
