import { requireOptionalNativeModule } from 'expo-modules-core';

type AppleWalletNativeModule = {
  presentPassAsync(passURL: string): Promise<void>;
};

const AppleWallet = requireOptionalNativeModule<AppleWalletNativeModule>('AppleWallet');

export async function presentAppleWalletPass(passURL: string): Promise<void> {
  if (!AppleWallet) {
    throw new Error('Apple Wallet support requires the latest version of OutNow.');
  }

  await AppleWallet.presentPassAsync(passURL);
}
