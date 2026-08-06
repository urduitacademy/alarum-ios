# iOS SwiftUI Feasibility Note

## Purpose

Before choosing React Native/Expo or native SwiftUI for Alarum, validate whether the MVP alarm requirements are better served by native iOS.

This note focuses on iPhone/iOS only.

## Recommendation

Start Alarum as a native iOS SwiftUI app.

Reason: the MVP depends heavily on iOS notification behavior, interruption levels, notification settings, app settings deep links, local scheduling, and careful handling of platform limits. Native SwiftUI gives the most direct access to those APIs and reduces the risk of discovering a bridge/plugin limitation after the app is already built.

React Native/Expo remains a good option for general content apps like UITA, but Alarum is closer to a platform-behavior app than a content app.

## What Native SwiftUI Helps With

- Direct use of `UserNotifications`.
- Direct use of `UNCalendarNotificationTrigger` for date/time-based alarms.
- Direct use of notification interruption levels such as Time Sensitive.
- Direct inspection of notification permission state.
- Direct deep links into app notification settings.
- Native SwiftUI UI implementation matching the supplied design handoff.
- Local persistence with SwiftData or Core Data.
- Easier future work if the app needs native extensions, widgets, Live Activities, or entitlement-specific behavior.

## What Native SwiftUI Still Cannot Bypass

Native code does not remove Apple's system restrictions.

- The app cannot fully behave like Apple Clock.
- The app cannot guarantee sound when the phone is muted unless Apple grants Critical Alerts entitlement.
- Time Sensitive notifications can break through Focus and scheduled delivery, but not the Ring/Silent switch.
- Critical Alerts can bypass mute and Focus, but require a special Apple entitlement.
- The app cannot reliably control the camera torch while closed or locked.
- Local notification delivery is system-managed and not guaranteed like a real-time process.

## MVP Alarm Strategy

Use local notifications for scheduled alarms.

For each alarm occurrence:

- Schedule a local notification using date/time components.
- Set notification content title, body, sound, category, and interruption level.
- Use Time Sensitive interruption level where appropriate and user-authorized.
- Include notification actions for Stop and Snooze if feasible.
- Schedule follow-up nag notifications at +5 and +10 minutes.
- Stop nagging after 15 minutes.

For repeat-limited alarms:

- Store the alarm rule locally.
- Compute individual upcoming occurrences.
- Schedule only the needed upcoming notifications.
- Reconcile pending notifications whenever the app opens, foregrounds, or an alarm is edited.

## 50 Alarm Constraint

iOS has a practical pending local notification limit. The legacy Apple documentation states that the system keeps the soonest-firing 64 scheduled local notifications and discards the rest.

For Alarum, this means 50 alarms are possible, but the app should not naively schedule every future repeat forever.

Recommended approach:

- Maintain alarm rules in local storage.
- Keep a rolling schedule of the nearest upcoming notification occurrences.
- Rebuild pending notification requests when alarms are changed or the app returns to foreground.
- For forever repeats, schedule the next occurrence only, then schedule the next one after the user interacts or the app foregrounds.

## Flash Strategy

There are two different concepts:

1. iOS LED Flash for Alerts
2. App-controlled camera torch

The MVP should rely on user-guided setup for iOS LED Flash for Alerts. The app should explain this honestly and show warnings when flash is requested but OS setup is incomplete or unknown.

App-controlled torch flashing can only be treated as an in-app active experience. It should not be promised for closed-app or locked-phone alarms.

## Proposed Native Architecture

- SwiftUI for UI.
- SwiftData for local alarm storage, unless deployment target or testing suggests Core Data.
- UserNotifications framework for local scheduling.
- AVFoundation only for optional active-app torch behavior.
- App-level services:
  - `AlarmStore`
  - `AlarmScheduler`
  - `NotificationPermissionManager`
  - `AlarmOccurrenceCalculator`
  - `SettingsDeepLinker`

## Stack Decision

Choose SwiftUI for the first build.

Decision rationale:

- Lower platform-risk for alarm behavior.
- Better fit for iOS-first MVP.
- Cleaner path to Time Sensitive, notification actions, settings links, and future Apple-specific features.
- Avoids depending on Expo plugin support for the app's most important behavior.

## Sources

- Apple User Notifications: https://developer.apple.com/documentation/usernotifications/
- Scheduling local notifications: https://developer.apple.com/documentation/usernotifications/scheduling-a-notification-locally-from-your-app
- Time Sensitive notifications: https://developer.apple.com/documentation/usernotifications/unnotificationinterruptionlevel/timesensitive
- Critical Alerts entitlement: https://developer.apple.com/documentation/bundleresources/entitlements/com.apple.developer.usernotifications.critical-alerts
- Apple notification interruption levels: https://developer.apple.com/design/human-interface-guidelines/managing-notifications
- Notification sounds: https://developer.apple.com/documentation/usernotifications/unnotificationsound
- Torch control: https://developer.apple.com/documentation/avfoundation/avcapturedevice/torchmode-swift.property
- Open notification settings: https://developer.apple.com/documentation/uikit/uiapplication/opennotificationsettingsurlstring

