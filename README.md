# Alarum

Alarum is an iOS-first visual alarm app for future-date alarms and repeat-limited alarms.

## Current Project State

This repository contains the product requirements, design handoff package, and a minimal native SwiftUI feasibility app.

## Key Documents

- [REQUIREMENTS.md](REQUIREMENTS.md) - MVP product requirements captured from the initial product discussion.
- [docs/ios-swiftui-feasibility.md](docs/ios-swiftui-feasibility.md) - native iOS feasibility note and stack recommendation.
- [docs/swiftui-implementation-plan.md](docs/swiftui-implementation-plan.md) - phased SwiftUI build plan and technical risk checklist.
- [docs/build-and-testflight-flow.md](docs/build-and-testflight-flow.md) - separate Alarum build/TestFlight flow, using UITA only as a reference.
- [docs/next-session-preflight.md](docs/next-session-preflight.md) - short checklist for the first SwiftUI/TestFlight setup session.
- [design_handoff_alarum/README.md](design_handoff_alarum/README.md) - self-contained design handoff with tokens, typography, geometry, screen specs, measurements, interactions, state, copy rules, and out-of-scope items.
- [design_handoff_alarum/alarum-design-brief.md](design_handoff_alarum/alarum-design-brief.md) - original design brief.

## Design Assets

- `design_handoff_alarum/assets/` - SVG identity assets, app icons, marks, wordmarks, alternates, and tally states.
- `design_handoff_alarum/tokens/` - design tokens in CSS and JSON.
- `design_handoff_alarum/prototypes/` - HTML reference prototypes and supporting JavaScript.

## Important Handoff Notes

1. The wordmark SVGs use live Archivo text. Outline the text before using these SVGs outside the app.
2. The HTML prototypes are visual and interaction references for rebuilding in SwiftUI. They are not production code and should not be ported line by line.

## MVP Build Direction

Build a native SwiftUI iPhone app using the handoff as the source of truth for layout, copy, tokens, and interaction behavior.

## Current App Scaffold

- [Alarum.xcodeproj](Alarum.xcodeproj) - minimal native iOS project.
- [Alarum/AlarumApp.swift](Alarum/AlarumApp.swift) - SwiftUI app entry point.
- [Alarum/ContentView.swift](Alarum/ContentView.swift) - feasibility screen.
- [Alarum/NotificationManager.swift](Alarum/NotificationManager.swift) - local notification permission and scheduling test logic.

The first app build is intentionally small. Its job is to prove TestFlight delivery and iOS notification behavior before the full MVP UI is implemented.
