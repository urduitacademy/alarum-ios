# SwiftUI Implementation Plan

## Decision

Build Alarum as a native iOS SwiftUI app first.

Reason: Alarum depends on iOS-specific alarm and notification behavior. Native SwiftUI gives the cleanest access to local notifications, Time Sensitive alerts, notification actions, settings links, persistence, and future Apple-specific features.

Update after feasibility testing:

An Expo/EAS feasibility app was successfully built, submitted to TestFlight, installed on the owner's iPhone, and used to test local notification behavior. The Expo/EAS route is now a viable candidate for the MVP build, especially because the owner does not have a MacBook. The final stack decision should compare Expo/EAS delivery speed against pure SwiftUI control after more notification and UI tests.

## Build Principles

- iPhone first.
- Native SwiftUI UI.
- Local-only MVP.
- No account or backend.
- Match the design handoff closely.
- Keep alarm scheduling logic separate from views.
- Prove iOS notification behavior early before polishing every screen.
- The product owner does not have a MacBook, so build and TestFlight distribution must use a Mac-based cloud or borrowed-Mac workflow.

## Proposed Stack

- SwiftUI for app UI.
- SwiftData for local persistence, unless testing shows Core Data is safer for the target iOS version.
- UserNotifications for scheduled local notifications.
- AVFoundation only for active-app torch behavior.
- XCTest for occurrence calculation and scheduler tests.

## Core Modules

### App Shell

- App entry point.
- Appearance handling: System, Light, Dark.
- First-launch onboarding routing.
- Shared design tokens.

### Alarm Model

Alarm fields:

- id
- time
- start date
- label
- repeat weekdays
- occurrence limit
- fired count
- enabled flag
- sound enabled flag
- vibration/flash enabled flag
- created date
- updated date

Derived values:

- next occurrence
- countdown text
- tally state
- confirmation sentence
- date group header

### Alarm Occurrence Calculator

Responsible for:

- one-time alarm occurrence
- repeating weekday occurrences
- limited repeat occurrences
- forever repeat next occurrence
- skip next occurrence
- fired count updates
- confirmation copy

This should be heavily unit-tested because it is the heart of the app.

### Alarm Scheduler

Responsible for:

- converting alarm occurrences into local notification requests
- scheduling the main alarm notification
- scheduling +5 and +10 minute nag notifications
- stopping after 15 minutes
- cancelling stale notification requests
- rebuilding the pending schedule when alarms change or the app foregrounds

### Permission Manager

Responsible for:

- notification permission
- Time Sensitive status where available
- sound notification state
- settings deep links
- LED Flash setup guidance state

### UI Screens

Build screens from the design handoff:

1. Onboarding
2. Alarm list
3. Create/edit alarm
4. Firing screen
5. Calendar view
6. Settings

## Phase 1: Native Feasibility Prototype

Goal: prove the risky platform behavior before building the full UI.

Tasks:

- Create a minimal SwiftUI app.
- Request notification permission.
- Schedule a local notification for 1 minute in the future.
- Use a custom/default sound.
- Test delivery while:
  - app is open
  - app is backgrounded
  - phone is locked
  - phone is in Focus mode
  - phone is on Silent Mode
- Test Time Sensitive notification behavior.
- Add notification actions for Snooze and Stop.
- Schedule +5 and +10 minute nag notifications.

Exit criteria:

- We understand exactly how the MVP alarm behaves on a real iPhone.
- We document any iOS limitations that affect product copy or UX.

## Phase 1A: Build And TestFlight Workflow

Goal: prove that we can build, sign, upload, and install Alarum on the owner's iPhone without a local MacBook.

Required facts:

- Native iOS apps require Apple's build/signing toolchain.
- A Windows machine can hold and edit the source code, but it cannot locally archive and sign a native iOS app for TestFlight.
- TestFlight distribution requires Apple Developer Program membership.
- Uploading to App Store Connect requires an app record, bundle identifier, signing configuration, and a build produced by Xcode or an equivalent Apple-supported upload workflow.

Recommended workflow:

1. Keep source control in Git.
2. Use a Mac-based build environment for archive/sign/upload:
   - Xcode Cloud if the repo is hosted where Apple can access it.
   - A short-term borrowed/rented Mac for first setup.
   - A Mac CI service such as Codemagic, Bitrise, GitHub Actions macOS runners, or MacStadium.
3. Upload builds to App Store Connect.
4. Install builds on the iPhone through TestFlight.

Minimum setup needed:

- Apple Developer Program membership.
- App Store Connect access.
- Bundle identifier, for example `com.alarum.app`.
- A remote Git repository accessible by the chosen build service.
- Signing certificates/profiles managed by Xcode or the chosen CI service.
- TestFlight internal tester added for the owner's Apple Account.

Exit criteria:

- A minimal SwiftUI app builds successfully in a Mac-based environment.
- A build appears in App Store Connect.
- The owner can install the build through TestFlight on their iPhone.

## Phase 2: Data And Scheduling Core

Goal: build reliable alarm logic without being distracted by full visual polish.

Tasks:

- Implement alarm data model.
- Implement local persistence.
- Implement occurrence calculator.
- Add unit tests for:
  - one-time alarms
  - every Friday forever
  - every Friday for 2 occurrences
  - missed/disabled alarms
  - skip next occurrence
  - snooze/nag scheduling windows
- Implement scheduler reconciliation.

Exit criteria:

- Alarm rules can be stored locally.
- Future occurrences are computed correctly.
- Pending notifications can be rebuilt safely.

## Phase 3: MVP UI

Goal: build the six MVP screens using the design handoff.

Tasks:

- Convert design tokens into Swift constants.
- Add local fonts: Archivo and IBM Plex Mono.
- Build reusable components:
  - alarm row
  - next-up card
  - tally row
  - weekday chips
  - alert preference rows
  - permission rows
  - segmented controls
- Build onboarding.
- Build alarm list.
- Build create/edit screen.
- Build firing screen.
- Build calendar view.
- Build settings.

Exit criteria:

- User can create, edit, disable, snooze, stop, skip, and delete alarms.
- UI matches the design handoff closely enough for internal review.

## Phase 4: iPhone Testing

Goal: test the app in realistic user conditions.

Test cases:

- 1-minute test alarm.
- one-time future date alarm.
- every Friday alarm.
- every Friday for 2 Fridays only.
- 50 alarms in the local list.
- alarm disabled before firing.
- alarm snoozed.
- alarm stopped.
- nag notifications stop after 15 minutes.
- app killed before alarm fires.
- phone locked before alarm fires.
- Focus mode enabled.
- Silent Mode enabled.
- LED Flash for Alerts enabled/disabled.

Exit criteria:

- Known limitations are documented in product copy.
- No major scheduling or persistence bug remains.

## Phase 5: TestFlight Build

Goal: prepare for real device beta testing.

Tasks:

- Finalize app icon assets.
- Bundle fonts.
- Configure app display name.
- Configure bundle identifier.
- Add privacy strings.
- Prepare TestFlight notes.
- Archive and upload from Xcode.

Exit criteria:

- First internal TestFlight build is available.

## Key Technical Risks

- iOS Silent Mode behavior may not match user expectations.
- Time Sensitive permission may be misunderstood by users.
- Critical Alerts entitlement may not be approved for a general-purpose alarm app.
- LED Flash for Alerts cannot be controlled directly by the app while closed.
- iOS pending notification limits require rolling scheduling, not scheduling infinite repeats.
- Notification actions must be tested carefully for Snooze and Stop behavior.

## Open Decisions

- Minimum iOS version.
- App bundle identifier.
- Whether to use SwiftData or Core Data.
- Whether the first build should include the full calendar view or only list/create/firing/settings.
- Whether custom alarm sounds are deferred or included as built-in sound options only.

## Immediate Next Step

Create a minimal SwiftUI feasibility project and test local notification behavior on a real iPhone before implementing the full visual design.
