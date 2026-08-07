# Alarum Expo/EAS Feasibility

This is a separate Expo feasibility app for Alarum. It exists to test whether we can build and upload to TestFlight from Windows using EAS, without relying on first-time Xcode Cloud setup from a Mac.

It does not replace the native SwiftUI scaffold at the repository root.

## What This Tests

- EAS iOS build using bundle ID `com.alarum.app`
- App Store Connect/TestFlight upload path
- iOS notification permission request
- one-minute local sound notification
- Time Sensitive notification entitlement/config
- notification actions for `Snooze 5 min` and `Stop`
- +5 and +10 minute nag notifications

## Commands

Run from this folder:

```powershell
pnpm install
pnpm typecheck
npx eas login
npx eas init
npx eas build --platform ios --profile production
```

After the build succeeds, use EAS submit or the Expo dashboard to submit the build to App Store Connect/TestFlight.

## Important

This project must use its own Expo/EAS project. Do not connect it to the UITA EAS project ID.

UITA identifiers that must not be reused:

- `com.urduitacademy.mobile`
- `dinovaux`
- `6791972660`
- `4909ed00-d1a6-4441-84b5-333bcd4749ec`

