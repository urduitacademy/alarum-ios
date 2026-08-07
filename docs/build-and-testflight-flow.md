# Build And TestFlight Flow

## Decision

Alarum is a separate app and must have its own build, signing, App Store Connect, TestFlight, and optional Expo/EAS setup.

Do not overwrite or reuse the UITA Mobile App configuration.

## Existing UITA Reference

The UITA Mobile App is useful as a reference for how the owner has configured mobile app delivery, but its identifiers belong only to UITA.

Observed UITA values:

- App name: `URDU IT Academy`
- Expo slug: `dinovaux`
- Expo/EAS project ID: `4909ed00-d1a6-4441-84b5-333bcd4749ec`
- iOS bundle identifier: `com.urduitacademy.mobile`
- App Store Connect app ID: `6791972660`
- EAS submit target: App Store Connect app ID `6791972660`

These values must not be used for Alarum.

## Alarum Required Identifiers

Alarum needs its own:

- App Store Connect app record.
- Bundle identifier, for example `com.alarum.app` or another available reverse-DNS identifier.
- Apple signing/provisioning setup.
- TestFlight tester group.
- Git remote repository.
- Build service project, if using a cloud build service.

## Important Platform Constraint

The owner has Windows and an iPhone, but not a MacBook.

Windows can be used for:

- source code editing
- Git
- documentation
- asset management
- triggering some cloud builds

A Mac-based environment is still required for:

- compiling native iOS code
- archiving
- signing
- uploading the build to App Store Connect
- distributing through TestFlight

## Build Service Options

### Option 1: Xcode Cloud

Best fit for a pure native SwiftUI app if setup access is available.

Pros:

- Apple-native workflow.
- Direct App Store Connect integration.
- Good fit for SwiftUI/Xcode projects.

Cons:

- Usually expects the project to be in a remote Git provider.
- Setup may require Apple/Xcode-side configuration.

### Option 2: Expo EAS Build

Potential cloud build path because the owner already has Expo access.

Useful facts from Expo documentation:

- EAS Build is a hosted service for building app binaries for Expo and React Native projects.
- Expo documentation also states EAS Build is designed to work for native projects and uses macOS runners for iOS builds.
- EAS CLI can manage iOS signing credentials and upload builds when configured.

Risk:

- Alarum is planned as pure SwiftUI, not React Native/Expo. Before relying on EAS, we must prove that a minimal SwiftUI/Xcode project can build and submit successfully through EAS in a separate Alarum project.

Current repo status:

- A separate `expo-feasibility/` app has been added to test the Expo/EAS route without overwriting the native SwiftUI scaffold.
- This app uses the same Alarum bundle identifier, `com.alarum.app`, and must be connected to a new Alarum EAS project, not the existing UITA EAS project.
- The first Expo/EAS test should prove TestFlight upload and local notification behavior only.

### Option 3: Mac CI Provider

Examples:

- Codemagic
- Bitrise
- GitHub Actions macOS runners
- MacStadium

Pros:

- Standard way to build native iOS without owning a Mac.
- Works with pure SwiftUI/Xcode projects.

Cons:

- Requires setup of signing credentials and secrets.
- May have cost once builds become frequent.

### Option 4: Borrowed Or Rented Mac

Useful for the first project setup, certificate troubleshooting, and App Store Connect upload checks.

Pros:

- Most direct debugging path.
- Xcode can reveal project/signing errors clearly.

Cons:

- Not a scalable day-to-day workflow.

## Recommended Alarum Flow

1. Keep Alarum separate from UITA.
2. Create a remote Git repository for Alarum.
3. Create an App Store Connect record for Alarum.
4. Reserve a unique Alarum bundle identifier.
5. Create a minimal SwiftUI feasibility app.
6. Prove one cloud build path:
   - preferred: Xcode Cloud or a Mac CI provider for pure SwiftUI
   - experimental: EAS Build only if a pure SwiftUI build works cleanly
7. Upload the minimal app to TestFlight.
8. Install it on the owner's iPhone.
9. Only after that, build the full Alarum MVP UI and scheduling system.

## First TestFlight Milestone

The first TestFlight build should be intentionally small.

It should only prove:

- app installs on the owner's iPhone
- notification permission prompt works
- sound notification can be scheduled
- Time Sensitive notification request path works where available
- Stop/Snooze notification actions can be registered

This avoids investing in the full app before the distribution pipeline is proven.

## Sources

- Expo EAS Build introduction: https://docs.expo.dev/build/introduction/
- Expo iOS build process: https://docs.expo.dev/build-reference/ios-builds/
- Expo first build guide: https://docs.expo.dev/build/setup/
- Apple upload builds: https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds/
- Apple Developer Program: https://developer.apple.com/programs/
