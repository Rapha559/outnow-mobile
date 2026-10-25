import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { API_BASE } from '@/lib/api';

function reportError(response: Response) {
  if (response.status === 401) return 'Your session has ended. Please sign in again.';
  if (response.status === 403) return 'You do not have permission to export this report.';
  return 'Unable to prepare this report right now.';
}

/** Fetches an authenticated CSV and presents the platform share sheet. */
export async function downloadPromoterCsv(path: string, filename: string, sessionToken: string) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      accept: 'text/csv',
      authorization: `Bearer ${sessionToken}`,
    },
  });

  if (!response.ok) throw new Error(reportError(response));

  const file = new File(Paths.cache, `${Date.now()}-${filename.replace(/[^a-zA-Z0-9._-]/g, '-')}`);
  await file.write(await response.bytes());

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'text/csv',
      dialogTitle: 'Share OutNow report',
      UTI: 'public.comma-separated-values-text',
    });
    return;
  }

  if (await file.canPreview()) {
    await file.preview({ title: 'OutNow report', mimeType: 'text/csv' });
    return;
  }

  throw new Error('Sharing is not available on this device.');
}
