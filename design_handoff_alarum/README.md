# Handoff: Alarum — iOS visual alarm app, MVP

## Overview

Alarum is an iPhone alarm app for **future dates and counted repeats** — the two things the
built-in Apple Clock alarm cannot do. Positioning: *set an alarm for a date, not just a time —
and tell it exactly how many times to repeat.*

This bundle covers the full MVP surface: app icon, wordmark, two logo alternates, the six
screens from the brief in dark mode, the alarm list and create screens in light mode, and the
tally row as an isolated component spec.

Source of truth for product requirements: `alarum-design-brief.md` (included). Where this README
and the brief disagree, the brief wins on product decisions; this README wins on measurements,
because it reflects what was actually built.

## About the design files

The files in `prototypes/` are **design references authored in HTML**. They are prototypes that
show intended look and behaviour. They are not production code and should not be shipped or
ported line by line.

The task is to **recreate these designs in the target codebase** — for Alarum that means
SwiftUI on iOS, using the app's own view structure, navigation, and notification layer. If no
project exists yet, start a standard SwiftUI app; nothing in these designs requires a web view,
a custom rendering layer, or a third-party UI library.

To open a prototype: serve the `prototypes/` folder over HTTP (e.g. `python3 -m http.server`)
and open the `.dc.html` file. `support.js` must sit alongside them. Fonts load from Google Fonts,
so the first open needs a network connection.

## Fidelity

**High fidelity.** Colours, type sizes, weights, corner radii, spacing, and copy are final and
should be matched exactly. Two things are deliberately approximate and should be replaced with
native controls rather than reproduced:

- the time wheel picker (use `DatePicker` with `.wheel` style, monospaced digits)
- the inline calendar grids (use a native/graphical date picker styled to the tokens)

## Design tokens

`tokens/tokens.css` and `tokens/tokens.json` carry the full set. Summary:

| Token | Hex | Role |
|---|---|---|
| Graphite | `#1B1E24` | Dark-mode surface, icon ground, primary ink in light mode |
| Slate | `#252A32` | Dark-mode raised card |
| Chalk | `#F2F3F5` | Light-mode surface, ink in dark mode. Cool grey-white, never cream |
| Steel | `#6E7682` | Secondary text, inactive tally strokes, hairlines |
| Sodium | `#FFC24B` | The single accent. Next alarm, armed state, primary action, the strike |
| Rust | `#C2402F` | Destructive and unavailable only |

Two values were added during design because the brief defines elevation only for dark mode:

| Token | Hex | Role |
|---|---|---|
| Chalk raised | `#E4E6EA` | Light-mode raised card — the light-mode equivalent of Slate |
| Track off | `#D3D6DC` | Light-mode inactive toggle track |

Rules that must survive implementation:

- **One accent per screen.** Sodium marks exactly one thing: what happens next. Two amber
  elements on a screen means one of them is wrong.
- Rust never appears decoratively. Its presence means broken or about to be deleted.
- **No shadows anywhere.** Elevation is surface colour only (Graphite → Slate, Chalk → Chalk raised).
- Hairlines are 0.5px Steel at ~30% opacity (`rgba(110,118,130,0.35)`). No heavy dividers.
- Dark mode is the **default on first launch**. Both modes are first-class.

### Type

| Role | Face | Notes |
|---|---|---|
| Numerals, times, dates, counts, countdowns | **IBM Plex Mono** Medium | Tabular figures. The display face. |
| UI, labels, body | **Archivo** Regular / Medium | Slightly condensed grotesque |

Scale: 40 / 28 / 20 / 16 / 13 / 11. Two weights only (400, 500). Sentence case everywhere. Never
all-caps except the `AM`/`PM` suffix, which sits at 60% of the numeral size in Steel (e.g. 24px
beside a 40px time).

Anything numeric is Plex Mono with tabular figures — the alarm list is a column of times and the
colons must align down the column. In SwiftUI: `.monospacedDigit()` on the font, or load Plex Mono
and use it directly.

### Geometry

- Corner radius: 14 on cards, 10 on controls, 8 on chips. Never mixed within a screen.
- 8px spacing grid. 20px screen gutters.
- Toggle: 44×26 track, 22px knob, 2px inset. Off = Steel track at 35% (dark) / `#D3D6DC` (light)
  with a Steel knob. On = Sodium track with a Graphite knob (dark) / Chalk knob (light).
- Minimum hit target 44px. The tally strokes in the create flow are 16px wide inside a 44px-tall
  tap area for this reason.

## Assets

All in `assets/`, all vector, all stroke-based — no fills, gradients, bevels or glow anywhere in
the identity.

| File | Use |
|---|---|
| `icon-1024-appstore.svg` | App Store / app icon, full-bleed 1024 square. iOS applies its own mask; do not round the corners yourself. |
| `icon-1024-rounded-preview.svg` | Rounded version for decks and marketing only. |
| `icon-40pt-build.svg` | Separate small-size build: legs shortened, bar weight unchanged, so the strike survives. Use for 40pt and below. |
| `mark-struck-a-dark.svg` / `-light.svg` | Primary mark on transparent ground. Dark = Chalk legs; light = Graphite legs. The amber bar never changes colour. |
| `alt-struck-bell-*.svg` | Alternate 1, for comparison. |
| `alt-tally-strike-*.svg` | Alternate 2, for comparison. |
| `wordmark-dark.svg` / `-light.svg` | Lock-up: mark plus lowercase `alarum`, with the final `u` struck by a short amber bar. |
| `tally-states.svg` | The four tally stroke states, isolated. |

**Two notes on the SVGs:**

1. The wordmarks use **live text** (`<text font-family="Archivo" font-weight="500">`), so they
   render correctly only where Archivo is installed. Before using them in marketing or anywhere
   outside the app, open them in a vector tool and convert the text to outlines, then re-save.
   Inside the app, set the wordmark as text in Archivo Medium at −1% tracking rather than
   shipping the SVG.
2. Mark geometry is authored on a 1024 grid at 70.4px stroke weight, apex up. The crossbar
   extends ~10% past each leg — that overhang is the point: it reads as a strike *through* the
   letter, and it is the same gesture as the tally row. Do not shorten it, do not soften the `A`
   into a filled triangle, and keep the counter under the apex open.

The primary mark is the **struck A**; the two alternates are included for comparison and a
decision, not for production use. Fonts: [Archivo](https://fonts.google.com/specimen/Archivo)
and [IBM Plex Mono](https://fonts.google.com/specimen/IBM+Plex+Mono), both SIL Open Font License —
bundle the static Regular and Medium weights in the app.

## The signature element: the tally row

The one memorable thing in the product. Build it properly and keep everything around it quiet.

A repeat-limited alarm shows its occurrences as vertical strokes. Four states:

| State | Stroke | Rendering |
|---|---|---|
| Remaining | Chalk (dark) / Graphite (light) | Plain vertical stroke |
| Next | Sodium | Plain vertical stroke. Exactly one per row |
| Fired | Steel | Steel diagonal struck through it at the same weight, rotated −38° |
| Forever | — | No strokes. `∞` in Plex Mono, Steel |

Sizes as built: in list rows, 2px wide × 18px tall, 4px gap, 13px strike. In the create control,
3px × 34px, 10px gap, 22px strike, inside 16×44 tap targets.

Rules:

- Above 6 occurrences, collapse to four strokes plus `×12` in 11px Plex Mono Steel — never draw
  twelve strokes.
- Non-repeating alarms show **no tally row at all**.
- Forever-repeating alarms show `∞`.

**In the create flow the limit control *is* the tally.** Tapping `+` adds a stroke; tapping an
existing stroke trims the count back to that point. A `Forever` toggle sits beside it, and a
numeric field appears only past 6. This replaces a stepper — the user draws the answer.

**When an alarm fires**, its stroke is struck through with a **200ms draw** animation: the
diagonal scales from `scaleX(0)` to `scaleX(1)` about its centre, `ease-out`, at the rotated
angle. This is the only animation in the app that isn't a standard iOS transition. Under
`prefers-reduced-motion` (iOS: `UIAccessibility.isReduceMotionEnabled` /
`@Environment(\.accessibilityReduceMotion)`) cross-fade the strike in instead.

In the prototype you can watch this: on the alarm list, tap the tally on the "Gym — two Fridays"
row to skip its next occurrence. It cycles so you can replay it.

## Screens

Coordinates below are from a 393×852pt frame (iPhone 16 / 15 / 14 logical size). The status bar
occupies the top 54pt; the screen body is the remaining 798pt. All screens use 20pt gutters.

### 1. Onboarding — one screen, three rows

*Purpose: grant the three permissions the app needs, then create the first alarm.*

Layout, top to bottom:

- Centred lock-up: 56pt mark, then `alarum` at 28px Archivo Medium with the struck `u`, then
  `Alarms with an end date.` at 16px Steel. 48pt top padding, 40pt below.
- Three Slate cards, 14pt radius, 16pt padding, 8pt apart. Each: title 16px Chalk Medium, body
  13px Steel on one line, trailing control.
- Spacer, then the honesty line at 11px Steel, then the primary button.

| Title | Body | Control |
|---|---|---|
| Notifications | So alarms appear on your lock screen. | `Allow` |
| Sound and time-sensitive alerts | So important alarms show up immediately. | `Allow` |
| Flash and vibration | For visual and silent alert options. | `Set up` → opens iOS Settings |

Controls are 10pt-radius outlined buttons, 0.5px Steel border, 13px Chalk label. Once granted,
each is replaced by a 20×20 **Steel** checkmark (2px stroke, round caps) — not amber; a granted
permission is not "what happens next".

Footer, 11px Steel, required, and it belongs here rather than buried in settings:
`Alarum uses iOS notifications. It can't fully override Silent Mode like the built-in Clock.`

Primary action: full-width Sodium button, 10pt radius, 16pt padding, Graphite label 16px Medium —
`Create your first alarm`.

### 2. Alarm list — home screen

*Purpose: see what fires next and manage up to 50 alarms.* Chronological, earliest first.

- Header: `Alarms` at 28px Archivo Medium, and a 36×36 Sodium `+` button at 10pt radius.
- Segmented control (`List` / `Calendar`): Slate container, 10pt radius, 3pt padding; the
  selected segment is a Graphite pill at 8pt radius with Chalk 13px, the other Steel 13px.
- **Next-up card**: full width, Slate, 14pt radius, **3px Sodium left edge**, 20pt padding.
  Contents: time at 40px Plex Mono Medium in **Sodium** with `AM` at 24px Steel; date at 16px
  Plex Mono Chalk; label at 13px Steel; then a live countdown at 13px Plex Mono Steel —
  `in 2 days, 14 hours`. Recompute every second; format as days + hours above a day, hours +
  minutes below.
- **Following alarms** as compact rows, 14pt vertical padding, separated by 0.5px hairlines:
  time 20px Plex Mono in a 74pt column with the date beneath at 11px Plex Mono Steel; label 13px
  Chalk; tally row right-aligned; 44×26 toggle at the far right. A disabled alarm keeps Chalk
  text and shows an off toggle.
- Rows group under **sticky** date headers at 11px Steel with 0.4px tracking — `Tomorrow`,
  `Fri 14 Aug`, `Next week`. The header background matches the screen surface so rows scroll
  under it cleanly.
- **Swipe left to delete** (Rust). **Swipe right to skip the next occurrence** — skipping strikes
  one tally stroke, with the 200ms draw, and does not delete the alarm. In the HTML prototype
  this is wired to a tap on the tally, because swipe isn't available; implement it as swipe.
- **Empty state**: the struck-A mark in Steel at 25% opacity, then `No alarms yet.` and
  `Set one for a date — this Friday, the 14th, whenever.` Invitation, not apology.

### 3. Create / edit alarm

*Purpose: build one alarm with structured controls.* No natural-language field in the MVP.

Nav bar: `Cancel` 16px Steel, `New alarm` 16px Chalk Medium, `Save` 16px Sodium Medium. Ordered
top to bottom:

1. **Time** — large Plex Mono wheel picker, 196pt tall, the visual anchor. Selected row 40px
   Chalk on a Slate 10pt-radius band spanning the gutters; adjacent rows 20px Steel. `AM`/`PM`
   column at 13px.
2. **Date** — inline compact calendar in a Slate card. Selected day is a Sodium 8pt cell with
   Graphite text; past days Steel at 50%. In light mode this is presented as a condensed row
   (`Date · Fri 14 Aug 2026 ›`) because the full grid does not fit above the alert card — either
   form is acceptable, but be consistent within a build. Defaults to the next occurrence of the
   picked time.
3. **Label** — single-line field, 16px, placeholder `Dentist` in Steel.
4. **Repeat** — weekday chips `M T W T F S S`, 38pt tall, 8pt radius, equal width, 6pt gaps.
   Selected chips are Sodium with Graphite text; unselected are transparent with a 0.5px Steel
   border and Steel text.
5. **Limit** — the tally control. **Only visible when a weekday is selected.** `Forever` toggle
   (38×22, smaller than a row toggle) sits top-right of the card; `n left` at 13px Plex Mono
   Steel sits right of the strokes; the numeric field appears past 6.
6. **Alert** — one Slate card, two rows split by a hairline: `Sound` (on, with `Primary alert` at
   11px Steel beneath) and `Vibration and flash`.

Under the Limit control, **live confirmation copy** at 13px Steel that rewrites as the user taps:
`Friday 14 August and Friday 21 August 2026 only.` That sentence is the whole product in one
line — give it room. Variants as built: no repeat → `Does not repeat.`; forever → `Every Friday,
with no end date.`; 1 → `Friday 14 August 2026 only.`; 2–3 → comma list joined with `and`; 4+ →
`The next 5 Fridays, ending Friday 11 September 2026.`

If flash is enabled but LED Flash for Alerts is off at the OS level, a **Rust** inline notice
appears under the alert row — `Flash needs LED Flash for Alerts turned on in iOS Settings.` —
with a Sodium `Open Settings` link. **Inline, never a modal.**

### 4. Firing screen

*Purpose: be read and dismissed in the dark.* Fullscreen, **Graphite regardless of mode**.

- Time in Plex Mono at maximum scale (96px as built, Medium, −3px tracking) in Sodium, centred.
- Label below at 20px Chalk.
- **Nag indicator**: a 3px bar depleting left to right across the 15-minute window — Sodium fill
  on a Steel-35% track — with `Stops nagging in 11 min` at 13px Plex Mono Steel centred beneath.
  The user must be able to see that this ends.
- Actions: `Snooze 5 min` as a full-width Sodium filled button, 10pt radius, **24pt padding**,
  20px Graphite Medium. `Stop` beneath as an outlined button, 0.5px Steel, 14pt padding, 16px
  Chalk. Snooze is deliberately bigger — it is the more common action at 6am.
- After 15 minutes the screen resolves to a quiet `Alarm ended` state, **not silence**.

### 5. Calendar view

*Purpose: scan a month.* Reached from the segmented control on the list. Keep it restrained.

- Header `August 2026` at 28px Archivo Medium. Weekday letters at 11px Steel, week starting
  Monday to match the repeat chips.
- 7-column grid, 52pt cells, 8pt radius, day numbers 13px Plex Mono.
- Days with one alarm get a 4px Sodium dot; days with several get a small Sodium Plex Mono count
  (11px) instead. Today gets a 0.5px **Sodium ring** and Sodium text; the selected day gets a
  filled Slate cell.
- Tapping a day slides that day's alarms up as compact rows below the grid: time 20px Plex Mono,
  label 13px, meta right-aligned at 11px Plex Mono Steel (`2 left`, `∞`, `×12`, `off`).
  Empty days read `No alarms — 12 August 2026`.

### 6. Settings

Short list, one Slate card per group:

- **Appearance** — segmented `System / Light / Dark`.
- **Default alert preferences for new alarms** — `Default sound`, `Default vibration and flash`.
- **Flash setup status** with a `Re-check` action; status line in Rust when LED Flash for Alerts
  is off.
- **About iOS alarm limits** — disclosure row opening a plain-language explanation of Silent
  Mode, the torch restriction, and Critical Alerts.
- The same 11px Steel honesty line at the foot.

## Interactions and behaviour

| Trigger | Result |
|---|---|
| Onboarding `Allow` / `Set up` | Request the permission; on grant, swap the control for a Steel checkmark |
| `Create your first alarm` | Push the create screen |
| `+` on list or calendar | Push the create screen |
| Tap next-up card / any row | Open edit (the prototype routes the next-up card to the firing screen so it can be reviewed) |
| Swipe left on a row | Reveal delete in Rust |
| Swipe right on a row | Skip next occurrence: strike one tally stroke with the 200ms draw |
| Row toggle | Arm / disarm without deleting |
| Segmented control | Switch list ↔ calendar |
| `Save` | Persist, pop to list, toast `Alarm saved` |
| Weekday chip | Toggle; the Limit card appears once any day is selected |
| Tally `+` / stroke | Set the occurrence count; confirmation copy rewrites live |
| `Forever` | Hide the stroke control; write `∞` to the row |
| Vibration and flash on, OS flash off | Show the inline Rust notice with `Open Settings` |
| Alarm fires | Firing screen; nag bar depletes over 15 min; resolves to `Alarm ended` |
| `Snooze 5 min` / `Stop` | Dismiss and return to the list |

Everything else is a standard iOS transition. No custom easing curves, no parallax, no spring
overshoot. The 200ms strike is the only motion the app owns.

## State

Per alarm: time, date, label, repeat weekdays, occurrence limit (integer or forever), fired
count, enabled flag, sound flag, vibration/flash flag.

App level: appearance preference (System / Light / Dark, default Dark on first launch), the three
permission grants, OS-level LED-Flash-for-Alerts status (re-read on foreground, not cached),
default alert preferences for new alarms, and the current nag window start when an alarm is
firing.

Derived, recomputed rather than stored: the countdown to the next alarm (tick every second), the
tally state per alarm (fired / next / remaining from limit + fired count), the confirmation
sentence, and the date-header grouping.

No account, no login, no cloud sync — local persistence only.

## Copy rules

- Active voice, sentence case. `Save alarm`, not `Submit`.
- An action keeps its name through the flow: the button says `Save alarm`, the toast says
  `Alarm saved`.
- Errors say what happened and what to do: `Flash needs LED Flash for Alerts turned on in iOS
  Settings.` — never `Something went wrong.`
- **Never claim the app overrides Silent Mode or behaves like the built-in Clock alarm.** iOS
  will not let a third-party app control the torch when closed or locked; flash and vibration are
  in-app features, not the promise.
- Empty states are invitations, not apologies.
- Store subtitle always carries the explanation, because the name reads as a typo without it:
  `Alarum — alarms with an end date`.

## Out of scope for the MVP

No account or login. No cloud sync. No calendar import. No natural-language input. No custom
snooze length. No uploaded sounds. No Android. If a screen implies any of these, remove it.

## Files in this bundle

```
README.md                          this document
alarum-design-brief.md             original brand + product brief
assets/                            icon, marks, wordmarks, tally states (SVG)
tokens/tokens.css                  CSS custom properties
tokens/tokens.json                 same values as JSON, for a token pipeline
prototypes/Alarum Prototype.dc.html  six screens dark + list & create light, interactive
prototypes/Alarum Identity.dc.html   icon sizes, wordmarks, three marks, tally spec, tokens
prototypes/support.js                runtime the two prototypes need — keep it beside them
```
