# Alarum

Alarum is an iOS-first visual alarm app for future-date alarms and repeat-limited alarms.

## Current Project State

This repository currently contains the product requirements and design handoff package. No app code has been started yet.

## Key Documents

- [REQUIREMENTS.md](REQUIREMENTS.md) - MVP product requirements captured from the initial product discussion.
- [docs/ios-swiftui-feasibility.md](docs/ios-swiftui-feasibility.md) - native iOS feasibility note and stack recommendation.
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
