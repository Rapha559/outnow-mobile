import { router } from 'expo-router';
import { type ComponentProps, type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/lib/api';

type AccountType = 'INDIVIDUAL' | 'SOLE_TRADER' | 'COMPANY';
type VerificationState = 'VERIFIED' | 'REVIEW_REQUIRED' | 'FAILED' | 'NOT_APPLICABLE';
type VerificationCheck = { state: VerificationState; label: string; message: string };
type VerificationSummary = { overall: VerificationState; company: VerificationCheck; vat: VerificationCheck; identity: VerificationCheck };
type TaxpayerInfo = {
  accountType: AccountType;
  legalName: string;
  tradingName: string | null;
  taxResidence: string;
  dateOfBirth: string | null;
  hasNationalInsuranceNumber: boolean;
  maskedNationalInsuranceNumber: string | null;
  companyRegistrationNumber: string | null;
  vatRegistered: boolean;
  maskedVatNumber: string | null;
  address: string;
  city: string;
  postcode: string;
  confirmed: boolean;
};
type GetResponse = { success: true; saved: boolean; taxpayerInfo?: TaxpayerInfo; verification?: VerificationSummary };
type SaveResponse = { success: true; message: string; taxpayerInfo: TaxpayerInfo; verification: VerificationSummary };

function stateLabel(state?: VerificationState) {
  if (state === 'VERIFIED') return 'Verified';
  if (state === 'FAILED') return 'Failed';
  if (state === 'NOT_APPLICABLE') return 'Not applicable';
  return 'Review required';
}

export default function PromoterTaxpayerScreen() {
  const { user, sessionToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [verification, setVerification] = useState<VerificationSummary | null>(null);
  const [accountType, setAccountType] = useState<AccountType>('COMPANY');
  const [legalName, setLegalName] = useState('');
  const [tradingName, setTradingName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [nationalInsuranceNumber, setNationalInsuranceNumber] = useState('');
  const [hasNationalInsuranceNumber, setHasNationalInsuranceNumber] = useState(false);
  const [maskedNationalInsuranceNumber, setMaskedNationalInsuranceNumber] = useState<string | null>(null);
  const [companyRegistrationNumber, setCompanyRegistrationNumber] = useState('');
  const [vatRegistered, setVatRegistered] = useState(false);
  const [vatNumber, setVatNumber] = useState('');
  const [maskedVatNumber, setMaskedVatNumber] = useState<string | null>(null);
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postcode, setPostcode] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const isPersonAccount = accountType === 'INDIVIDUAL' || accountType === 'SOLE_TRADER';

  const applyInfo = useCallback((info: TaxpayerInfo) => {
    setAccountType(info.accountType || 'COMPANY');
    setLegalName(info.legalName || '');
    setTradingName(info.tradingName || '');
    setDateOfBirth(info.dateOfBirth || '');
    setHasNationalInsuranceNumber(Boolean(info.hasNationalInsuranceNumber));
    setMaskedNationalInsuranceNumber(info.maskedNationalInsuranceNumber || null);
    setNationalInsuranceNumber('');
    setCompanyRegistrationNumber(info.companyRegistrationNumber || '');
    setVatRegistered(Boolean(info.vatRegistered));
    setMaskedVatNumber(info.maskedVatNumber || null);
    setVatNumber('');
    setAddress(info.address || '');
    setCity(info.city || '');
    setPostcode(info.postcode || '');
    setConfirmed(Boolean(info.confirmed));
  }, []);

  const load = useCallback(async () => {
    if (!sessionToken || user?.role !== 'PROMOTER') { setLoading(false); return; }
    try {
      setLoading(true); setError('');
      const data = await apiRequest<GetResponse>('/api/mobile/promoter/taxpayer', {}, sessionToken);
      if (data.saved && data.taxpayerInfo) applyInfo(data.taxpayerInfo);
      setVerification(data.verification || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load taxpayer information.');
    } finally {
      setLoading(false);
    }
  }, [sessionToken, user?.role, applyInfo]);

  useEffect(() => { void load(); }, [load]);

  const canSubmit = useMemo(() => {
    if (!legalName.trim() || !address.trim() || !city.trim() || !postcode.trim() || !confirmed) return false;
    if (isPersonAccount && !dateOfBirth) return false;
    if (isPersonAccount && !nationalInsuranceNumber.trim() && !hasNationalInsuranceNumber) return false;
    if (accountType === 'COMPANY' && !companyRegistrationNumber.trim()) return false;
    if (vatRegistered && !vatNumber.trim() && !maskedVatNumber) return false;
    return true;
  }, [accountType, address, city, companyRegistrationNumber, confirmed, dateOfBirth, hasNationalInsuranceNumber, isPersonAccount, legalName, maskedVatNumber, nationalInsuranceNumber, postcode, vatNumber, vatRegistered]);

  async function save() {
    if (!sessionToken) return;
    if (!canSubmit) { setError('Complete all required fields and confirm the information is accurate.'); return; }
    try {
      setSaving(true); setError(''); setMessage('');
      const data = await apiRequest<SaveResponse>('/api/mobile/promoter/taxpayer', {
        method: 'POST',
        body: JSON.stringify({
          accountType,
          legalName,
          tradingName,
          taxResidence: 'United Kingdom',
          dateOfBirth: isPersonAccount ? dateOfBirth : null,
          nationalInsuranceNumber: isPersonAccount ? nationalInsuranceNumber : null,
          companyRegistrationNumber: accountType === 'COMPANY' ? companyRegistrationNumber : null,
          vatRegistered,
          vatNumber: vatRegistered ? vatNumber : null,
          address,
          city,
          postcode,
          confirmed,
        }),
      }, sessionToken);
      applyInfo(data.taxpayerInfo);
      setVerification(data.verification);
      setMessage(data.message || 'Taxpayer information saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save taxpayer information.');
    } finally {
      setSaving(false);
    }
  }

  if (!user) return <View style={styles.screen}><SafeAreaView style={styles.center}><Text style={styles.title}>Taxpayer information</Text><Text style={styles.copy}>Sign in to manage promoter taxpayer details.</Text></SafeAreaView></View>;
  if (user.role !== 'PROMOTER') return <View style={styles.screen}><SafeAreaView style={styles.center}><Text style={styles.title}>Not available</Text><Text style={styles.copy}>Taxpayer information is only available to promoters.</Text><Pressable style={styles.secondary} onPress={() => router.back()}><Text style={styles.secondaryText}>Back</Text></Pressable></SafeAreaView></View>;
  if (loading) return <View style={styles.screen}><SafeAreaView style={styles.center}><ActivityIndicator size="large" color="#7c3aed" /></SafeAreaView></View>;

  return <View style={styles.screen}><SafeAreaView edges={['top']} style={styles.safe}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <View style={styles.top}><Pressable style={styles.circle} onPress={() => router.back()}><Text style={styles.back}>‹</Text></Pressable><Text style={styles.topTitle}>Taxpayer info</Text><Pressable style={styles.circle} onPress={() => void load()}><Text style={styles.refresh}>↻</Text></Pressable></View>

    <Text style={styles.eyebrow}>UK TAX & IDENTITY CHECKS</Text>
    <Text style={styles.title}>Taxpayer Information</Text>
    <Text style={styles.copy}>Provide the legal and tax details for the UK seller receiving ticket income through OutNow. Sensitive identifiers are masked after saving.</Text>

    {!!verification && <View style={styles.verificationCard}><Text style={styles.verifyLabel}>VERIFICATION STATUS</Text><Text style={styles.verifyTitle}>{stateLabel(verification.overall)}</Text><VerificationRow check={verification.company} /><VerificationRow check={verification.vat} /><VerificationRow check={verification.identity} /></View>}
    {!!error && <View style={styles.errorBox}><Text style={styles.error}>{error}</Text></View>}
    {!!message && <View style={styles.successBox}><Text style={styles.success}>{message}</Text></View>}

    <Section title="Account type" subtitle="Select the UK seller receiving payments through OutNow.">
      <Choice label="Individual" selected={accountType === 'INDIVIDUAL'} onPress={() => setAccountType('INDIVIDUAL')} />
      <Choice label="Sole trader" selected={accountType === 'SOLE_TRADER'} onPress={() => setAccountType('SOLE_TRADER')} />
      <Choice label="Company" selected={accountType === 'COMPANY'} onPress={() => setAccountType('COMPANY')} />
    </Section>

    <Section title="Legal information" subtitle="Use details that match your official UK documents.">
      <Field label="Legal name" value={legalName} onChangeText={setLegalName} placeholder={accountType === 'COMPANY' ? 'Registered company name' : 'Your full legal name'} />
      <Field label="Trading / business name (optional)" value={tradingName} onChangeText={setTradingName} placeholder="Name customers know your business by" />
      <Read label="Tax residence" value="United Kingdom" />
      {isPersonAccount && <Field label="Date of birth" value={dateOfBirth} onChangeText={setDateOfBirth} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" />}
    </Section>

    <Section title="Tax identification" subtitle="Provide the UK identifier relevant to your account type.">
      {isPersonAccount && <><Field label="National Insurance number" value={nationalInsuranceNumber} onChangeText={(v) => setNationalInsuranceNumber(v.toUpperCase())} placeholder={hasNationalInsuranceNumber ? 'Stored securely — leave blank to keep it' : 'e.g. QQ 12 34 56 C'} autoCapitalize="characters" />{hasNationalInsuranceNumber && <Text style={styles.helper}>Saved securely: {maskedNationalInsuranceNumber || '•••••••'}</Text>}</>}
      {accountType === 'COMPANY' && <Field label="Company registration number" value={companyRegistrationNumber} onChangeText={(v) => setCompanyRegistrationNumber(v.toUpperCase())} placeholder="e.g. 12345678 or SC123456" autoCapitalize="characters" maxLength={8} />}
    </Section>

    <Section title="VAT information" subtitle="Tell us whether this seller is registered for UK VAT.">
      <View style={styles.switchRow}><View style={{ flex: 1 }}><Text style={styles.label}>VAT registered</Text><Text style={styles.helper}>Is this seller registered for UK VAT?</Text></View><Switch value={vatRegistered} onValueChange={setVatRegistered} trackColor={{ true: '#7c3aed' }} /></View>
      {vatRegistered && <><Field label="UK VAT number" value={vatNumber} onChangeText={(v) => setVatNumber(v.toUpperCase())} placeholder={maskedVatNumber ? 'Stored — leave blank to keep it' : 'e.g. GB123456789'} autoCapitalize="characters" />{maskedVatNumber && <Text style={styles.helper}>Saved: {maskedVatNumber}. Enter a new number only if it changed.</Text>}</>}
    </Section>

    <Section title="UK business / residential address" subtitle="Use the UK address associated with the seller's tax details.">
      <Field label="Address" value={address} onChangeText={setAddress} placeholder="Street address" />
      <Field label="City / town" value={city} onChangeText={setCity} placeholder="City or town" />
      <Field label="Postcode" value={postcode} onChangeText={(v) => setPostcode(v.toUpperCase())} placeholder="e.g. BS1 1AA" autoCapitalize="characters" />
    </Section>

    <View style={styles.confirmCard}><Switch value={confirmed} onValueChange={setConfirmed} trackColor={{ true: '#7c3aed' }} /><View style={{ flex: 1 }}><Text style={styles.confirmTitle}>I confirm these details are accurate</Text><Text style={styles.helper}>You are responsible for keeping your seller and tax information up to date.</Text></View></View>

    <Pressable disabled={saving || !canSubmit} style={[styles.primary, (saving || !canSubmit) && styles.disabled]} onPress={() => void save()}>{saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Save taxpayer information</Text>}</Pressable>
    <Text style={styles.footerNote}>Stripe payout verification is separate. You may still need to complete Stripe Connect before payouts can be enabled.</Text>
    <View style={{ height: 40 }} />
  </ScrollView></SafeAreaView></View>;
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text><Text style={styles.sectionSub}>{subtitle}</Text>{children}</View>;
}
function Field(props: ComponentProps<typeof TextInput> & { label: string }) {
  const { label, ...inputProps } = props;
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput {...inputProps} placeholderTextColor="#9ca3af" style={styles.input} /></View>;
}
function Read({ label, value }: { label: string; value: string }) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><View style={styles.read}><Text style={styles.readText}>{value}</Text></View></View>;
}
function Choice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[styles.choice, selected && styles.choiceActive]}><Text style={[styles.choiceText, selected && styles.choiceTextActive]}>{label}</Text><Text style={[styles.choiceMark, selected && styles.choiceMarkActive]}>{selected ? '✓' : '○'}</Text></Pressable>;
}
function VerificationRow({ check }: { check: VerificationCheck }) {
  return <View style={styles.verifyRow}><View style={[styles.verifyDot, check.state === 'VERIFIED' && styles.verifyDotGood, check.state === 'FAILED' && styles.verifyDotBad]} /><View style={{ flex: 1 }}><Text style={styles.verifyName}>{check.label} · {stateLabel(check.state)}</Text><Text style={styles.helper}>{check.message}</Text></View></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' }, safe: { flex: 1 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }, content: { paddingHorizontal: 18, paddingBottom: 24 },
  top: { height: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, circle: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#f9fafb', alignItems: 'center', justifyContent: 'center' }, back: { color: '#111827', fontSize: 34, lineHeight: 36, marginTop: -4 }, refresh: { color: '#7c3aed', fontSize: 20, fontWeight: '900' }, topTitle: { color: '#111827', fontSize: 17, fontWeight: '900' },
  eyebrow: { color: '#7c3aed', fontSize: 10, fontWeight: '900', letterSpacing: 1.4, marginTop: 12 }, title: { color: '#111827', fontSize: 30, fontWeight: '900', marginTop: 6 }, copy: { color: '#6b7280', fontSize: 13, lineHeight: 20, marginTop: 8 },
  verificationCard: { marginTop: 18, borderRadius: 18, borderWidth: 1, borderColor: '#ddd6fe', backgroundColor: '#faf8ff', padding: 15 }, verifyLabel: { color: '#7c3aed', fontSize: 9, fontWeight: '900', letterSpacing: 1.1 }, verifyTitle: { color: '#111827', fontSize: 19, fontWeight: '900', marginTop: 5, marginBottom: 5 }, verifyRow: { flexDirection: 'row', gap: 10, paddingTop: 10 }, verifyDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#f59e0b', marginTop: 5 }, verifyDotGood: { backgroundColor: '#16a34a' }, verifyDotBad: { backgroundColor: '#dc2626' }, verifyName: { color: '#111827', fontSize: 12, fontWeight: '900' },
  section: { marginTop: 18, borderRadius: 18, borderWidth: 1, borderColor: '#e5e7eb', padding: 15 }, sectionTitle: { color: '#111827', fontSize: 18, fontWeight: '900' }, sectionSub: { color: '#6b7280', fontSize: 11, lineHeight: 17, marginTop: 4, marginBottom: 8 }, field: { marginTop: 12 }, label: { color: '#374151', fontSize: 12, fontWeight: '800', marginBottom: 6 }, input: { minHeight: 48, borderRadius: 13, borderWidth: 1, borderColor: '#d1d5db', backgroundColor: '#fff', color: '#111827', paddingHorizontal: 13, fontSize: 14 }, read: { minHeight: 48, borderRadius: 13, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#f9fafb', justifyContent: 'center', paddingHorizontal: 13 }, readText: { color: '#6b7280', fontSize: 14 }, helper: { color: '#6b7280', fontSize: 10, lineHeight: 15, marginTop: 5 },
  choice: { minHeight: 50, borderRadius: 13, borderWidth: 1, borderColor: '#e5e7eb', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, marginTop: 9 }, choiceActive: { borderColor: '#7c3aed', backgroundColor: '#f5f3ff' }, choiceText: { color: '#374151', fontWeight: '800' }, choiceTextActive: { color: '#5b21b6' }, choiceMark: { color: '#9ca3af', fontSize: 18 }, choiceMarkActive: { color: '#7c3aed' },
  switchRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 }, confirmCard: { marginTop: 18, borderRadius: 18, borderWidth: 1, borderColor: '#ddd6fe', backgroundColor: '#faf8ff', padding: 15, flexDirection: 'row', alignItems: 'center', gap: 12 }, confirmTitle: { color: '#111827', fontSize: 13, fontWeight: '900' },
  primary: { minHeight: 52, borderRadius: 15, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center', marginTop: 16 }, primaryText: { color: '#fff', fontWeight: '900', fontSize: 14 }, secondary: { minHeight: 48, minWidth: 140, borderRadius: 14, borderWidth: 1, borderColor: '#d1d5db', alignItems: 'center', justifyContent: 'center', marginTop: 18 }, secondaryText: { color: '#111827', fontWeight: '800' }, disabled: { opacity: 0.45 },
  errorBox: { marginTop: 15, borderRadius: 14, borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fef2f2', padding: 12 }, error: { color: '#b91c1c', fontSize: 12, lineHeight: 18 }, successBox: { marginTop: 15, borderRadius: 14, borderWidth: 1, borderColor: '#bbf7d0', backgroundColor: '#f0fdf4', padding: 12 }, success: { color: '#166534', fontSize: 12, lineHeight: 18 }, footerNote: { color: '#6b7280', fontSize: 10, lineHeight: 16, textAlign: 'center', marginTop: 12 },
});
