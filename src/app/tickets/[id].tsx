import { Redirect, useLocalSearchParams } from 'expo-router';

// Compatibility for links in reminder emails and universal links.
// The canonical in-app ticket details route is /ticket/[id].
export default function TicketEmailLinkRedirect() {
  const { id } = useLocalSearchParams<{ id: string | string[] }>();
  const ticketId = Array.isArray(id) ? id[0] : id;

  if (!ticketId || !/^[A-Za-z0-9_-]+$/.test(ticketId)) {
    return <Redirect href="/(tabs)/tickets" />;
  }

  return <Redirect href={`/ticket/${encodeURIComponent(ticketId)}` as never} />;
}
