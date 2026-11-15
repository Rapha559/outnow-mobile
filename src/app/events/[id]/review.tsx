import { Redirect, useLocalSearchParams } from 'expo-router';

// Compatibility for review invitation emails and universal links.
// The review form is part of the canonical in-app event details screen.
export default function ReviewInvitationRedirect() {
  const { id } = useLocalSearchParams<{ id: string | string[] }>();
  const eventId = Array.isArray(id) ? id[0] : id;

  if (!eventId || !/^[A-Za-z0-9_-]+$/.test(eventId)) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href={`/event/${encodeURIComponent(eventId)}?review=1` as never} />;
}
