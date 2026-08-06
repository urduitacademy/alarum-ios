# Alarum — brand and app design brief

For handoff to Claude Design. Source: `REQUIREMENTS.md` (iOS visual alarm app MVP).

Name locked: **Alarum**. Everything outside section 2 is name-independent, so a later rename is
a find-and-replace plus a new mark.

---

## 1. What the product is

An iPhone alarm app for **future dates and counted repeats** — the two things the
built-in Apple Clock alarm cannot do.

The one-sentence positioning:

> Set an alarm for a date, not just a time — and tell it exactly how many times to repeat.

Audience: adults who already own an alarm they trust for waking up, and need a second,
sharper tool for "the thing on the 14th" and "these two Fridays, then stop."

**Do not brand around flash.** Per the requirements, iOS will not let a third-party app
control the torch when closed or locked. Flash and vibration are supported features shown
inside the app; they are not the promise on the App Store page.

Tagline options for the store listing:
- Alarms with an end date.
- Two Fridays, then done.
- Set it for the 14th.

---

## 2. Name and logo

`Alarum` is the archaic form of "alarm" — a stage direction in Shakespeare meaning a bell rung
as a call to arms. It buys three things: it contains the word people actually search for, it is
ownable in a way `Alarm Clock Pro` never will be, and its faintly antique register pairs well
with the instrument-panel visual direction below.

It costs one thing, so design around it: people will hear it as a typo. Two mitigations, both
required.

- **The store subtitle always carries the explanation:** `Alarum — alarms with an end date`
- **The wordmark must look deliberate**, not misspelled. See below.

Note the tradeoff against the `Tick` route. With `Tick`, the name and the mark were the same
object. With `Alarum` the mark has to earn its meaning from the *product* rather than the name —
so the mark stays built on the counted-repeat idea, and the wordmark does more of the work.

### Primary mark — "struck A"

A geometric capital `A`, apex up, with its crossbar rendered as an amber bar that extends
slightly past both legs.

- Two diagonal legs and one horizontal bar. All stroked lines, rounded caps, equal weight
- Crossbar in `Sodium`, extended roughly 10% past each leg so it reads as a strike *through*
  the letter rather than a part of it
- That strike is the same gesture as the tally row in section 4 — one counted occurrence, done
- Legs in `Chalk` on `Graphite`; invert for light contexts
- No fills, no gradients, no bevels, no glow. Every element is a stroke
- Do not soften the `A` into a filled triangle. The counter under the apex stays open

**App icon:** solid `Graphite` squircle, no border, mark inset ~25% on each side. Must stay
legible at 40pt — if the crossbar merges into the legs at that size, shorten the legs rather
than thinning the bar.

**Wordmark:** lowercase `alarum` in Archivo Medium, tracking approx -1%. The word has a
three-beat rhythm (a-la-rum) and six letters of fairly even width, so it sets cleanly on its
own — let it. One optional device, used here and nowhere else: strike the final `u` with a short
amber bar at the same weight as the icon crossbar. It signals an ending, echoes the mark, and
makes the spelling read as a choice.

Never set the wordmark in a serif or a letterpress style. The word is archaic; the treatment
should not be. That contrast is the whole idea.

### Two alternates worth building

- **Struck bell** — a single-stroke bell silhouette with the amber bar struck across it and a
  small dot clapper. Leans into what "alarum" literally means. Warmer and more immediately
  readable, but more generic in an App Store icon grid.
- **Tally strike** — three vertical strokes with a diagonal amber strike across them. The purest
  expression of the counted-repeat idea, with no link to the name. Best if you later decide the
  product story matters more than the monogram.

---

## 3. Visual direction

**The reference image is a night-time instrument panel** — an aircraft cockpit or a
1970s clock radio. Amber illumination on graphite, because amber is what you can read at
3am without wrecking your night vision. That is a functional justification, not a mood
board, and it should be visible in every screen.

Not: cream paper with a serif. Not: pure black with acid green. Not: glassmorphism.

### Colour tokens

| Token | Hex | Role |
|---|---|---|
| `Graphite` | `#1B1E24` | Dark-mode surface, icon background, primary ink in light mode |
| `Slate` | `#252A32` | Dark-mode raised card |
| `Chalk` | `#F2F3F5` | Light-mode surface. Cool grey-white, never warm or cream |
| `Steel` | `#6E7682` | Secondary text, inactive tally strokes, hairlines |
| `Sodium` | `#FFC24B` | The single accent. Next alarm, armed state, primary action, the strike |
| `Rust` | `#C2402F` | Destructive and unavailable only — delete, "flash not set up" |

Rules:
- **One accent.** `Sodium` marks exactly one thing per screen: what happens next. If two
  things are amber on a screen, one of them is wrong.
- `Rust` never appears decoratively. Its presence means something is broken or about to be
  deleted.
- Both modes are first-class. Dark mode is the *default* on first launch — this is an app
  you open in the dark.

### Type

| Role | Face | Notes |
|---|---|---|
| Numerals and times | **IBM Plex Mono**, Medium | Tabular figures. This is the display face. |
| UI, labels, body | **Archivo**, Regular / Medium | Slightly condensed grotesque, signage feel |

Times, dates, counts, and countdowns are always Plex Mono. The justification is real: the
alarm list is a column of times, and tabular monospaced figures keep the colons aligned
down the column. It also makes the app read as an instrument rather than a to-do list.

Sentence case everywhere. Two weights only: Regular and Medium. Never all-caps except the
tiny `AM` / `PM` suffix, which sits at 60% of the numeral size in `Steel`.

Type scale: 40 / 28 / 20 / 16 / 13 / 11.

### Geometry
- Corner radius: 14px on cards, 10px on controls, 8px on chips. Consistent, never mixed
  within a screen.
- Hairlines at 0.5px in `Steel` at 30% opacity. No heavy dividers.
- 8px spacing grid. 20px screen gutters.
- No shadows. Elevation is expressed by surface colour only (`Graphite` → `Slate`).

---

## 4. The signature element: the tally row

This is the one memorable thing. Build it properly and keep everything around it quiet.

A repeat-limited alarm displays its occurrences as vertical strokes:

```
Every Friday                 | | |        3 left
Every Friday       (1 fired) ⁄ | |        2 left
Every Friday       (2 fired) ⁄ ⁄ |        1 left
```

- Remaining occurrences: `Chalk` strokes (dark mode) / `Graphite` strokes (light mode)
- Fired occurrences: `Steel` stroke with a `Steel` diagonal struck through it
- The next occurrence: `Sodium`
- Above 6 occurrences, collapse to `| | | | | ×12` rather than drawing twelve strokes
- Non-repeating alarms show no tally row at all. Forever-repeating alarms show `∞` in
  Plex Mono, `Steel`

**In the create flow, the limit control is the tally itself.** Tapping adds a stroke; tapping
a stroke removes it back to that point. A small `Forever` toggle sits beside it, and a numeric
field appears only past 6. This replaces the generic stepper — the user is drawing the answer.

**When an alarm fires**, the stroke gets struck through with a 200ms draw animation. That is
the only animation in the app that isn't a standard iOS transition. Respect
`prefers-reduced-motion` by cross-fading instead.

---

## 5. Screens to design

### 5.1 Onboarding — one screen, three rows
Per the requirements: three bullets, no paragraphs, each with its own action.

Wordmark and mark at top. Then three rows, each an icon-free row with a title, one line of
`Steel` body copy, and a trailing control:

| Title | Body | Control |
|---|---|---|
| Notifications | So alarms appear on your lock screen. | `Allow` button |
| Sound and time-sensitive alerts | So important alarms show up immediately. | `Allow` button |
| Flash and vibration | For visual and silent alert options. | `Set up` → opens iOS Settings |

Each control turns into a `Steel` checkmark once granted. Footer: a single `Steel` 11px line —
`Alarum uses iOS notifications. It can't fully override Silent Mode like the built-in Clock.`
That honesty line is required by the brief and it belongs here, not buried in settings.

Primary action at the bottom: `Create your first alarm`.

### 5.2 Alarm list — the home screen
Chronological, earliest first. Up to 50 alarms.

- **Next-up card** at the top, full width, `Slate` surface with a `Sodium` left edge:
  large Plex Mono time (40px), date below in 16px, label in `Steel`, and a live
  `in 2 days, 14 hours` countdown in Plex Mono
- **Following alarms** as compact rows: time (20px Plex Mono), date and label stacked,
  tally row right-aligned, toggle at the far right
- Rows group under sticky `Steel` date headers — `Tomorrow`, `Fri 14 Aug`, `Next week`
- Swipe left to delete (`Rust`), swipe right to skip the next occurrence — skipping strikes
  one tally stroke without deleting the alarm
- FAB or nav-bar `+` in `Sodium`
- **Empty state:** the struck-A mark in `Steel` at 25% opacity, then
  `No alarms yet.` and `Set one for a date — this Friday, the 14th, whenever.`

### 5.3 Create / edit alarm
Structured controls only. No natural-language field in the MVP.

Ordered top to bottom, matching the requirements:
1. **Time** — large Plex Mono wheel picker, the visual anchor of the screen
2. **Date** — inline compact calendar, defaults to the next occurrence of the picked time
3. **Label** — single-line text field, placeholder `Dentist`
4. **Repeat** — `Does not repeat` / weekday chips `M T W T F S S`, selected chips in `Sodium`
5. **Limit** — the tally control from section 4. Only visible when a weekday is selected
6. **Alert** — two rows with toggles: `Sound` (on, and marked as primary) and
   `Vibration and flash`

Under the Limit control, live confirmation copy in `Steel`, updating as they tap:
`Friday 14 August and Friday 21 August 2026 only.`
That sentence is the whole product in one line. Give it room.

If flash is enabled but LED Flash for Alerts is off at the OS level, a `Rust` inline notice
appears under the alert row: `Flash needs LED Flash for Alerts turned on in iOS Settings.`
with a `Open Settings` link. Inline, never a modal.

### 5.4 Firing screen
Fullscreen, `Graphite` regardless of mode — it is being read in the dark.

- Time in Plex Mono at maximum scale, `Sodium`
- Label below in 20px `Chalk`
- Two actions: `Snooze 5 min` as a large `Sodium` filled button, `Stop` as a `Steel`
  outlined button. Snooze is bigger because it is the more common action at 6am.
- **Nag indicator:** a thin horizontal bar depleting left to right across the 15-minute
  window, with `Stops nagging in 11 min` in Plex Mono beneath it. The user should be able
  to see that this ends.
- After 15 minutes the screen resolves to a quiet `Alarm ended` state, not silence.

### 5.5 Calendar view
Month grid, reached from a segmented control on the list screen.

- Days with alarms get a `Sodium` dot; days with multiple get a small Plex Mono count
- Today gets a `Sodium` ring; the selected day gets a filled `Slate` cell
- Tapping a day slides up that day's alarms as compact rows below the grid
- Keep the grid restrained — this is a scanning surface, not the main event

### 5.6 Settings
Short list. Appearance (System / Light / Dark), default alert preferences for new alarms,
flash setup status with a re-check action, and an `About iOS alarm limits` row that opens a
plain-language explanation of Silent Mode, torch, and Critical Alerts.

---

## 6. Copy rules
- Active voice, sentence case. `Save alarm`, not `Submit`.
- An action keeps its name through the flow: the button says `Save alarm`, the toast says
  `Alarm saved`.
- Errors say what happened and what to do. `Flash needs LED Flash for Alerts turned on in
  iOS Settings.` — never `Something went wrong.`
- Never claim the app overrides Silent Mode or behaves like the built-in Clock alarm.
- Empty states are invitations, not apologies.

---

## 7. Deliverables requested
1. App icon — 1024pt, plus a 40pt legibility check
2. Wordmark — light and dark
3. The two logo alternates for comparison
4. All six screens in section 5, in dark mode
5. Alarm list and create screens in light mode
6. The tally row as an isolated component spec, all four stroke states

---

## 8. Explicitly out of scope
No account or login. No cloud sync. No calendar import. No natural-language input. No custom
snooze length. No uploaded sounds. No Android. If a screen implies any of these, remove it.
