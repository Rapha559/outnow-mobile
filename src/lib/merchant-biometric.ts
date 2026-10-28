import Constants, { AppOwnership } from 'expo-constants';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const PREFERENCE_KEY_PREFIX = 'outnow_biometric_box_office_enabled:';

export type BiometricCapability = {
  available: boolean;
  label: string;
  unavailableMessage?: string;
};

export type BiometricAuthenticationResult = {
  success: boolean;
  message?: string;
};

function preferenceKey(userId: string) {
  return `${PREFERENCE_KEY_PREFIX}${userId}`;
}

function isNativePlatform() {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

function unavailable(label: string, unavailableMessage: string): BiometricCapability {
  return { available: false, label, unavailableMessage };
}

export async function getMerchantBiometricCapability(): Promise<BiometricCapability> {
  if (!isNativePlatform()) {
    return unavailable('device biometrics', 'Biometric protection is available in the OutNow iOS and Android apps.');
  }

  // Expo Go cannot provide the native Face ID experience on iOS. Avoid presenting
  // a misleading prompt there; a development or production build is required.
  if (Platform.OS === 'ios' && Constants.appOwnership === AppOwnership.Expo) {
    return unavailable('Face ID', 'Face ID protection needs an OutNow development or production build.');
  }

  try {
    const [hasHardware, enrolled, types, level] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
      LocalAuthentication.getEnrolledLevelAsync(),
    ]);

    const hasFace = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
    const hasFingerprint = types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT);
    const label = Platform.OS === 'ios'
      ? hasFace ? 'Face ID' : hasFingerprint ? 'Touch ID' : 'device biometrics'
      : hasFingerprint ? 'fingerprint' : hasFace ? 'face recognition' : 'device biometrics';

    if (!hasHardware) {
      return unavailable(label, 'This device does not support biometric authentication.');
    }
    if (!enrolled || level < LocalAuthentication.SecurityLevel.BIOMETRIC_STRONG) {
      return unavailable(label, `Set up ${label} in your device settings to use biometric protection.`);
    }

    return { available: true, label };
  } catch {
    // A stale development build can be missing this native module. Treat that as
    // unavailable rather than crashing or preventing the merchant from working.
    return unavailable('device biometrics', 'Biometric protection is unavailable in this app build.');
  }
}

export async function isMerchantBiometricEnabled(userId: string): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(preferenceKey(userId))) === 'true';
  } catch {
    return false;
  }
}

export async function setMerchantBiometricEnabled(userId: string, enabled: boolean): Promise<boolean> {
  try {
    const key = preferenceKey(userId);
    if (enabled) {
      await SecureStore.setItemAsync(key, 'true');
    } else {
      await SecureStore.deleteItemAsync(key);
    }
    return true;
  } catch {
    return false;
  }
}

export async function authenticateMerchant(
  capability: BiometricCapability,
  purpose: string,
): Promise<BiometricAuthenticationResult> {
  if (!capability.available) {
    return { success: false, message: capability.unavailableMessage ?? 'Biometric authentication is unavailable.' };
  }

  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: `${capability.label} to ${purpose}`,
      promptDescription: 'Confirm it is you before continuing with this merchant action.',
      cancelLabel: 'Not now',
      fallbackLabel: 'Use Passcode',
      // Device passcode is a secure system fallback after a failed or locked-out
      // biometric attempt, so merchants are not permanently locked out.
      disableDeviceFallback: false,
      biometricsSecurityLevel: 'strong',
    });

    if (result.success) return { success: true };

    switch (result.error) {
      case 'user_cancel':
      case 'system_cancel':
      case 'app_cancel':
        return { success: false, message: 'Authentication was cancelled.' };
      case 'lockout':
        return { success: false, message: `Use your device passcode, then try ${capability.label} again.` };
      case 'not_enrolled':
      case 'not_available':
      case 'passcode_not_set':
        return { success: false, message: `Set up ${capability.label} or a device passcode in Settings, then try again.` };
      default:
        return { success: false, message: `${capability.label} did not verify. Please try again.` };
    }
  } catch {
    return { success: false, message: 'Biometric authentication is unavailable in this app build.' };
  }
}
