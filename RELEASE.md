# OutNow Tickets mobile release checklist

The app code is prepared for iOS and Android production builds. Complete the external account/credential items below before store submission.

## Build and native services

- Run `npm install` after pulling so the lockfile is refreshed with the current Expo SDK 57 dependencies, including `expo-dev-client`.
- Run `npx expo-doctor`, `npx expo lint`, and `npx tsc --noEmit`.
- Run `eas init` once for this Expo project if it has not been linked yet. This supplies the EAS project ID used by Expo push tokens.
- Create a development build with `eas build --profile development --platform ios` or `--platform android` and test push notifications on a physical device.
- Create store builds with `eas build --profile production --platform ios` and `eas build --profile production --platform android` only after the checks below pass.

## Apple

- App identifier: `com.outnowtickets.app`.
- Enable Sign in with Apple and Associated Domains for the identifier in Apple Developer.
- Configure APNs credentials for EAS push notifications.
- Set `APPLE_TEAM_ID` on the OutNow backend so `/.well-known/apple-app-site-association` can verify universal links.
- Confirm the Apple privacy manifest / App Privacy answers match the actual data collected by OutNow.
- Prepare App Store screenshots, description, support URL, privacy URL, age rating and review notes.

## Android

- Package: `com.outnowtickets.app`.
- Configure FCM/APNs-equivalent Android push credentials through EAS.
- Obtain the SHA-256 certificate fingerprint for the production signing key and set it as `ANDROID_APP_CERT_SHA256` on the backend. Multiple fingerprints can be comma-separated.
- Confirm `https://outnowtickets.com/.well-known/assetlinks.json` returns the production certificate fingerprint before release.
- Prepare Play Store screenshots, feature graphic, description, support/privacy URLs, content rating and Data safety answers.

## Authentication

- Google mobile OAuth uses the existing OutNow backend OAuth flow and the `outnowtickets://auth/google` callback. Verify the Google Cloud OAuth application allows the production redirect URLs used by the backend.
- Sign in with Apple is implemented for iOS. Verify Apple Developer capability/credentials in the production build.
- Test customer and promoter sign-up/login for email, Google and Apple before submitting.

## Deep links

- Custom scheme: `outnowtickets://`.
- Universal/App Links are configured for `/events/*` and `/tickets/*` on `outnowtickets.com` and `www.outnowtickets.com`.
- Verify the backend well-known endpoints after `APPLE_TEAM_ID` and `ANDROID_APP_CERT_SHA256` are configured.
- Test links from Messages/Mail/Notes on physical iOS and Android devices.

## Notifications

- The app registers an Expo push token after authentication in a development/production build.
- Local event reminders remain available as a fallback.
- Backend reminders send 24-hour and 2-hour event pushes.
- Backend waitlist offers send a push when inventory becomes available.
- Notification taps route back into the relevant OutNow app screen.
- Test notification preferences and sign-out token deactivation.

## Payments and customer flow

- Test Stripe in production-like test mode: successful payment, abandoned checkout, failed payment, expired reservation, promo code, sold-out inventory and waitlist offer.
- Verify the mobile result screen never shows tickets until the backend order is actually paid.
- Verify refunds, transfers, QR check-in, order history and ticket history.

## Promoter flow

- Test event creation/edit/review, media upload, ticket inventory, seller/tax details, Stripe Connect onboarding, analytics, attendees/scanner and payout timing.
- Verify analytics show views, ticket selection, checkout starts, paid orders, likes, shares, refunds and event/ticket performance.

## Legal and support

- Confirm in-app Privacy Policy and Terms point to the production OutNow policies.
- Confirm account deletion request/cancellation flow works and support contact information is current.
- Review UK launch VAT/tax and refund copy with the appropriate legal/accounting adviser before production launch.

Do not submit to either store until the production signing credentials, store metadata, privacy declarations and final payment tests are complete.
