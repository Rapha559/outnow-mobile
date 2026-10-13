import * as ImagePicker from 'expo-image-picker';

import { apiRequest } from '@/lib/api';

type SignatureResponse = {
  success: true;
  signature: string;
  timestamp: number;
  folder: string;
  publicId: string;
  cloudName: string;
  apiKey: string;
  resourceType: 'image';
};

type CloudinaryResponse = {
  secure_url?: string;
  error?: { message?: string };
};

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

export async function pickAndUploadEventImage(sessionToken: string) {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Photo library permission is required to choose an event image.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [16, 9],
    quality: 0.9,
  });

  if (result.canceled || !result.assets?.[0]) return null;
  const asset = result.assets[0];

  if (asset.fileSize && asset.fileSize > MAX_IMAGE_SIZE) {
    throw new Error('Choose an image smaller than 10 MB.');
  }

  const signature = await apiRequest<SignatureResponse>(
    '/api/mobile/promoter/upload/signature',
    { method: 'POST', body: JSON.stringify({ resourceType: 'image' }) },
    sessionToken,
  );

  const fileName = asset.fileName || `outnow-event-${Date.now()}.jpg`;
  const mimeType = asset.mimeType || 'image/jpeg';
  const formData = new FormData();

  formData.append(
    'file',
    { uri: asset.uri, name: fileName, type: mimeType } as unknown as Blob,
  );
  formData.append('api_key', signature.apiKey);
  formData.append('timestamp', String(signature.timestamp));
  formData.append('signature', signature.signature);
  formData.append('folder', signature.folder);
  formData.append('public_id', signature.publicId);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`,
    { method: 'POST', body: formData },
  );
  const data = (await response.json()) as CloudinaryResponse;

  if (!response.ok || !data.secure_url) {
    throw new Error(data.error?.message || 'Unable to upload the selected image.');
  }

  return {
    url: data.secure_url,
    localUri: asset.uri,
    width: asset.width,
    height: asset.height,
  };
}
