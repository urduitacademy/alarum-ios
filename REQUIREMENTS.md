# iOS Visual Alarm App Requirements

## Product Summary

The app helps users create future alarms that are easier to schedule than the built-in iPhone alarm flow. The MVP focuses on iPhone first and lets users create date-based and repeat-limited alarms, with sound as the primary alert method and vibration/visual flash support as secondary alert methods.

## Problem Statement

Users need a simple way to set alarms for future dates and limited repeat patterns, such as:

- Friday 16th at 9:00 AM
- Every Friday, but only for 2 Fridays
- A one-time alarm for a specific future date

The built-in iPhone alarm experience is not designed around future date-specific alarms or repeat-limited alarms.

## MVP Platform

- iOS first
- iPhone first
- Android planned later
- No account or login required for MVP
- Independent in-app alarm list for MVP

## Core Promise

Let users create future alarms that notify them clearly using:

1. Sound alarm
2. Vibration
3. Visual flash support

## MVP Features

- Create one-time alarms for a specific date and time.
- Create repeating alarms by weekday.
- Support limited repeats, for example every Friday for 2 Fridays only.
- Show all alarms in chronological order, with the earliest alarm at the top.
- Support up to 50 alarms.
- Add an alarm label.
- Edit alarms.
- Delete alarms.
- Snooze alarms for 5 minutes.
- Re-alert every 5 minutes after an alarm fires, up to a maximum of 15 minutes.
- Light mode and dark mode.
- Calendar-style view showing future alarms.
- Warning if visual flash setup is incomplete or unavailable.

## Deferred Features

- Android version.
- Account login.
- Cloud sync.
- Apple Calendar import.
- Google Calendar import.
- Asking users whether calendar events should become alarms.
- Custom snooze length.
- Natural language alarm creation.
- Custom uploaded alarm sounds.

## Alarm Creation

The MVP should use structured controls rather than natural language input.

Required fields:

- Date
- Time
- Label
- Repeat option
- Repeat limit
- Alert preference

Repeat options:

- Does not repeat
- Every selected weekday

Repeat limit options:

- Forever
- Specific number of occurrences

Example:

```text
Start: Friday 16 August 2026, 9:00 AM
Repeat: Every Friday
Limit: 2 occurrences
Result: Friday 16 August 2026 and Friday 23 August 2026 only
```

## Alarm Alert Preferences

Each alarm should support the following preferences.

### Preference 1: Sound Alarm

Sound is the primary alert method.

The app should schedule an iOS local notification with sound where iOS allows it. The MVP should be honest that third-party iOS apps cannot fully behave like Apple Clock alarms in every phone state.

### Preference 2: Vibration And Flashing

Vibration and visual flashing are secondary alert methods.

The app should support vibration/haptics where iOS allows. For flashing, the app should guide the user to enable iPhone LED Flash for Alerts in iOS Accessibility settings.

Important iOS limitation:

The app cannot reliably control the camera torch when the app is closed or the phone is locked. Torch flashing can be used only when the app is open/active. Lock-screen visual flash depends on iOS notification behavior and the user's iPhone Accessibility settings.

## Snooze And Nagging

- Snooze duration: 5 minutes.
- Re-alert interval after alarm fires: 5 minutes.
- Maximum nagging duration: 15 minutes.
- After 15 minutes, the app should stop re-alerting for that alarm occurrence unless the user manually opens or reschedules it.

## Onboarding

The first launch screen should explain permissions in 3 short bullet points.

Suggested copy:

- Notifications: So alarms can appear on your lock screen.
- Sound & Time Sensitive Alerts: So important alarms are shown immediately.
- Flash & Vibration: So you can use visual and silent alert options.

The screen should avoid long paragraphs. Each permission should have a clear setup action where appropriate.

## Time Sensitive Notifications

Time Sensitive Notifications are an iOS notification type for important alerts that should be delivered immediately.

They can break through some Focus settings if the user allows them, but they are not the same as Apple Clock alarms. They do not fully override Silent Mode in the same way as Apple Clock or Apple-approved Critical Alerts.

## Required Permissions

- Notification permission.
- Sound permission as part of notifications.
- Time Sensitive notification permission where available.
- User-guided setup for LED Flash for Alerts.

## iOS Constraints

The app can schedule local notifications that fire while the app is closed or the phone is locked.

However, iOS restricts third-party apps from fully matching the built-in Apple Clock alarm. The MVP should push the limits responsibly while avoiding impossible promises.

Known constraints:

- Silent Mode override is limited unless Apple grants Critical Alerts entitlement.
- Camera torch cannot be reliably controlled while the app is closed.
- LED flash on lock screen depends on iPhone Accessibility settings.
- iOS notification delivery is system-managed.

## Calendar Strategy

MVP:

- Use an independent app alarm list.

Version 2:

- Read Apple Calendar events.
- Ask users if they want to create alarms from calendar events.
- Consider Google Calendar integration later.

## Success Criteria

The MVP is successful if a user can:

- Create a one-time alarm for a future date and time.
- Create an alarm for every Friday, limited to 2 Fridays only.
- Receive a sound notification on the lock screen.
- Use 5-minute snooze.
- Receive follow-up alerts for no more than 15 minutes.
- See all upcoming alarms in chronological order.
- Understand required permissions without reading a wall of text.

