import * as ImagePicker from 'expo-image-picker';

import { apiRequest } from '@/lib/api';

type ResourceType = 'image' | 'video';
type SignatureResponse = {
  success: true;
  signature: string;
  timestamp: number;
  folder: string;
  publicId: string;
  cloudName: string;
  apiKey: string;
  resourceType: ResourceType;
};

type CloudinaryResponse = {
  secure_url?: string;
  error?: { message?: string };
};

type UploadOptions = {
  aspect: [number, number];
  filePrefix: string;
  permissionError: string;
};

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE = 100 * 1024 * 1024;

async function uploadAsset(
  sessionToken: string,
  asset: ImagePicker.ImagePickerAsset,
  resourceType: ResourceType,
  filePrefix: string,
) {
  const maxSize = resourceType === 'video' ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
  if (asset.fileSize && asset.fileSize > maxSize) {
    throw new Error(resourceType === 'video' ? 'Choose a video smaller than 100 MB.' : 'Choose an image smaller than 10 MB.');
  }

  const signature = await apiRequest<SignatureResponse>(
    '/api/mobile/promoter/upload/signature',
    { method: 'POST', body: JSON.stringify({ resourceType }) },
    sessionToken,
  );

  const extension = resourceType === 'video' ? 'mp4' : 'jpg';
  const fileName = asset.fileName || `${filePrefix}-${Date.now()}.${extension}`;
  const mimeType = asset.mimeType || (resourceType === 'video' ? 'video/mp4' : 'image/jpeg');
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
    `https://api.cloudinary.com/v1_1/${signature.cloudName}/${resourceType}/upload`,
    { method: 'POST', body: formData },
  );
  const data = (await response.json()) as CloudinaryResponse;

  if (!response.ok || !data.secure_url) {
    throw new Error(data.error?.message || `Unable to upload the selected ${resourceType}.`);
  }

  return {
    url: data.secure_url,
    localUri: data.secure_url,
    width: asset.width,
    height: asset.height,
    type: resourceType === 'video' ? ('VIDEO' as const) : ('IMAGE' as const),
  };
}

async function pickAndUploadImage(sessionToken: string, options: UploadOptions) {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error(options.permissionError);
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: options.aspect,
    quality: 0.9,
  });

  if (result.canceled || !result.assets?.[0]) return null;
  return uploadAsset(sessionToken, result.assets[0], 'image', options.filePrefix);
}

export function pickAndUploadEventImage(sessionToken: string) {
  return pickAndUploadImage(sessionToken, {
    aspect: [16, 9],
    filePrefix: 'outnow-event',
    permissionError: 'Photo library permission is required to choose an event image.',
  });
}

export function pickAndUploadHeadlinerImage(sessionToken: string) {
  return pickAndUploadImage(sessionToken, {
    aspect: [1, 1],
    filePrefix: 'outnow-headliner',
    permissionError: 'Photo library permission is required to choose a headliner image.',
  });
}

export async function pickAndUploadEventMedia(sessionToken: string) {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Photo library permission is required to add event media.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images', 'videos'],
    allowsEditing: false,
    quality: 0.9,
  });

  if (result.canceled || !result.assets?.[0]) return null;
  const asset = result.assets[0];
  const resourceType: ResourceType = asset.type === 'video' ? 'video' : 'image';
  return uploadAsset(sessionToken, asset, resourceType, 'outnow-media');
}
