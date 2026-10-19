import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { type ReactNode } from 'react';

const SITE = 'https://www.outnowtickets.com';

export default function CookiesScreen() {
  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <View style={styles.top}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.back}>‹</Text>
          </Pressable>
          <Text style={styles.topTitle}>Cookies & app storage</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.eyebrow}>OUTNOW PRIVACY</Text>
          <Text style={styles.title}>Cookies & app storage</Text>
          <Text style={styles.copy}>
            How OutNow uses website cookies, secure app storage and similar
            technologies to keep your account secure, remember choices and run
            the service.
          </Text>

          <Card title="Strictly necessary">
            <Text style={styles.body}>
              OutNow uses secure session and verification technology for sign-in,
              account security, checkout, ticket access and protected promoter or
              admin workflows. These technologies are required for requested
              features to work.
            </Text>
          </Card>

          <Card title="Preferences">
            <Text style={styles.body}>
              The app may keep settings such as notification choices,
              personalisation preferences and other options you ask OutNow to
              remember.
            </Text>
          </Card>

          <Card title="Analytics & performance">
            <Text style={styles.body}>
              OutNow may use proportionate analytics and reliability information
              to diagnose errors, measure feature performance and improve the
              product. Where consent is required for a non-essential technology,
              OutNow will provide a choice before enabling it.
            </Text>
          </Card>

          <Card title="Mobile app storage">
            <Text style={styles.body}>
              Native apps do not always use browser cookies. OutNow may instead
              use secure device storage, authentication tokens, app preferences,
              push-notification identifiers and local data needed for deep links,
              tickets and account features.
            </Text>
          </Card>

          <Card title="Third-party services">
            <Text style={styles.body}>
              Features may involve services such as Stripe for payments, Google
              or Apple for supported sign-in, and platform or hosting providers.
              Those services may use their own cookies or storage under their own
              policies.
            </Text>
          </Card>

          <Card title="Your choices">
            <Text style={styles.body}>
              You can manage available privacy, marketing, personalisation and
              notification choices from OutNow Settings. You can also clear app
              data through your device settings or uninstall the app.
            </Text>
            <Text style={styles.body}>
              On the website, browser controls can block or delete cookies, but
              blocking essential cookies may prevent sign-in, checkout or other
              secure features from working correctly.
            </Text>
          </Card>

          <Pressable
            style={styles.fullPolicy}
            onPress={() => void WebBrowser.openBrowserAsync(`${SITE}/cookies`)}>
            <Text style={styles.fullPolicyText}>Read full Cookie Policy ↗</Text>
          </Pressable>

          <Text style={styles.company}>OUTNOW TICKETS LTD · Company number 17519279</Text>
          <Text style={styles.note}>
            The website Cookie Policy is the authoritative version. This in-app
            page is provided for convenience.
          </Text>
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  top: { height: 58, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center' },
  back: { fontSize: 34, lineHeight: 36, marginTop: -4, color: '#111827' },
  topTitle: { fontWeight: '900', color: '#111827' },
  content: { paddingHorizontal: 18 },
  eyebrow: { color: '#7c3aed', fontSize: 11, fontWeight: '900', letterSpacing: 1.7, marginTop: 10 },
  title: { fontSize: 31, lineHeight: 36, fontWeight: '900', color: '#111827', marginTop: 8 },
  copy: { color: '#6b7280', fontSize: 14, lineHeight: 21, marginTop: 9 },
  card: { marginTop: 18, borderRadius: 18, borderWidth: 1, borderColor: '#e5e7eb', padding: 17, backgroundColor: '#fff' },
  cardTitle: { fontSize: 19, fontWeight: '900', color: '#111827', marginBottom: 10 },
  body: { fontSize: 13, lineHeight: 20, color: '#4b5563', marginBottom: 9 },
  fullPolicy: { marginTop: 20, minHeight: 52, borderRadius: 15, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  fullPolicyText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  company: { color: '#111827', fontSize: 11, fontWeight: '900', textAlign: 'center', marginTop: 22 },
  note: { color: '#6b7280', fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 8 },
});
