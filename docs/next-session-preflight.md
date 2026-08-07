# Next Session Preflight

## Goal

Prepare Alarum for the first native SwiftUI feasibility build and TestFlight pipeline test.

The first build should be intentionally small. It only needs to prove that a separate Alarum app can be built, signed, uploaded, installed on the owner's iPhone, and used to test local notification behavior.

## Owner Needs Ready

- Apple Developer Program access.
- App Store Connect access.
- iPhone with TestFlight installed.
- Apple Account email to add as internal tester if needed.
- Decision on final app name for the App Store record.
- Decision on bundle identifier.
- Decision on where the remote Git repo should live.

## Recommended Alarum Identifiers

Working values until changed:

- App name: `Alarum`
- Store subtitle: `Alarms with an end date`
- Bundle identifier option: `com.alarum.app`
- Internal project name: `Alarum`
- Git repository name option: `alarum-ios`

Before creating external records, confirm the bundle identifier is available and owned by the Apple Developer account.

## Do Not Reuse

Do not reuse UITA values:

- `com.urduitacademy.mobile`
- `dinovaux`
- `6791972660`
- `4909ed00-d1a6-4441-84b5-333bcd4749ec`

## First Technical Milestone

Create a minimal SwiftUI project that can:

- launch on iPhone
- request notification permission
- request or use Time Sensitive notification capability where available
- schedule a sound notification 1 minute in the future
- register Stop and Snooze notification actions
- schedule follow-up nag notifications at +5 and +10 minutes
- stop nagging after 15 minutes
- show a simple in-app status screen with permission and scheduling state

## Free-First Build Route

Preferred order:

1. Xcode Cloud, because it is Apple-native and includes a free monthly allowance with Apple Developer Program membership.
2. Expo EAS only as a proof, because Alarum is planned as pure SwiftUI and must not share UITA configuration.
3. Other Mac CI services only if Xcode Cloud blocks us.

## Design Is Not Blocking The First Build

The feasibility build does not need the full six-screen UI.

Design items needed before full MVP UI:

- final app icon choice
- outlined wordmark assets for non-app use
- production 1024 PNG app icon
- font files for Archivo and IBM Plex Mono
- final built-in alarm sound choice
- final name and tagline

## Next Session Agenda

1. Confirm app name, bundle identifier, and Git remote location.
2. Decide whether to create the remote repo first.
3. Create or prepare the minimal SwiftUI project.
4. Decide which cloud build path to try first.
5. Prepare the first TestFlight feasibility target.

