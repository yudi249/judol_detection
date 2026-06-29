# JudolLens UI Screen Plan

This document defines the product screen plan for JudolLens, the browser extension prototype. Keep UI work aligned with the research-first MVP scope while making the extension clear and convincing during demos.

## UI Direction

JudolLens uses a hybrid UI direction:

- security tool: clear protection state, controls, warnings, and blur behavior
- research dashboard: evidence, confidence, Unicode analysis, and evaluation counters

The popup should feel fast and protective. Logs, manual analysis, and simulation pages should expose the richer research evidence.

## Extension Name

Use `JudolLens` as the extension name in UI, docs, and demo copy.

Positioning:

```text
Research-first browser extension for detecting Unicode-obfuscated Indonesian judol promotion content.
```

## Popup

Purpose: answer the user's main questions within a few seconds.

- Is protection active?
- Which page or platform is being monitored?
- How many text candidates were scanned?
- Was judol or suspicious Unicode detected?

Recommended structure:

```text
JudolLens                         Active
YouTube - Mock mode

Protection
[ON] Page protection
[ON] Auto blur
[ON] Unicode highlight

Session Evidence
Scanned        128
Detected       7
Unicode        3
Last scan      18 ms

Recent Detection
HIGH  0.94
"bonus slot gacor malam ini..."
Terms: bonus, slot, gacor
Unicode: 2 suspicious chars

[Logs] [Options]
```

Required states:

- active clean: protection is active and no detection exists yet
- active detected: recent detections are available
- disabled: page protection is off
- unsupported page: the page cannot be scanned
- API error: API mode failed or is unreachable

MVP 1 requirements:

- header status
- protection, auto-blur, and Unicode-highlight toggles
- scanned, detected, Unicode suspicious, and last scan counters
- recent detection summary
- links to Logs and Options

## Options Page

Purpose: configure daily usage and research experiments.

Recommended sections:

- Detection Mode: mock or API predictor, API endpoint, API health status
- Protection Behavior: threshold, censor mode, auto-blur, Unicode highlight
- Platform Scope: YouTube, Telegram Web, X/Twitter, simulation page
- Research & Privacy: max logs, bounded evidence, source URL behavior, clear logs
- Diagnostics: API status, active model, last mode, test API, reset defaults

Default settings:

```text
Prediction mode: Mock
API endpoint: http://localhost:8000
Threshold: 0.75
Censor mode: Blur
Auto blur: On
Unicode highlight: On
Store bounded evidence: On
Store source URL: Off
Max logs: 200
```

Use a full extension options page, not a cramped popup panel.

## Log Review Page

Purpose: provide evidence for debugging, demos, and thesis evaluation.

Recommended layout:

```text
JudolLens Logs

Summary
Total logs | Judol detected | Unicode suspicious | High risk

Filters
Search | Platform | Risk | Unicode | Mode | Clear logs

Detection Table
Time | Platform | Risk | Confidence | Unicode | Snippet | Action

Detail Panel
Snippet | Prediction | Matched terms | Unicode evidence | Reasons | Model metadata
```

Required table fields:

- time
- platform
- risk level
- confidence
- Unicode presence
- snippet
- action

The detail panel should show Unicode evidence as a structured breakdown:

```text
Character | Normalized | Reason | Unicode name
ο         | o          | homoglyph | GREEK SMALL LETTER OMICRON
```

Privacy rules:

- store snippets, not full page text
- do not store full DOM or full browsing history
- keep source URL optional
- make logs clearable

## Manual Analysis Page

Purpose: inspect a selected or pasted text sample with full evidence.

Supported triggers:

```text
Select page text -> context menu -> Analyze with JudolLens
Open page manually -> paste text -> Analyze
```

Recommended layout:

```text
Input
[textarea]
[Analyze]

Result
Label | Confidence | Risk | Recommended action | Mode | Model | Processing time

Evidence
Matched terms
Unicode breakdown
Reasons

Actions
[Save to logs] [Copy result JSON]
```

MVP 2 requirements:

- context menu entry
- text area input
- analyze button
- result summary
- matched terms
- Unicode breakdown
- save to logs

`Copy result JSON` is useful for thesis writing but can wait if time is tight.

## Simulation Page

Purpose: make extension behavior testable without relying on external platforms.

The simulation page should look like a simple social feed, not a long documentation page.

MVP 1 scenarios:

- normal clean text
- basic judol promotion text
- Unicode-obfuscated judol text
- mixed feed containing normal and judol text
- dynamic insertion button for `MutationObserver` testing

Useful examples:

```text
Besok kita bahas tugas kuliah jam 9 ya
bonus new member slot gacor deposit 10k
bοnus slοt gacor
slot waktu praktikum sudah penuh
```

MVP 2 scenarios:

- invisible character cases
- stylized Unicode cases
- false positive traps
- expected result panel for human evaluation

The extension must detect feed content itself. Do not let content scripts read expected-answer labels as prediction hints.

## On-Page Overlay

Purpose: show detection on the target page without breaking third-party DOM.

Default MVP behavior:

```text
Detected judol text -> blur + compact label
Suspicious Unicode -> inline highlight
Full explanation -> logs or manual analysis
```

Supported visual modes:

- Blur: hide detected text with a compact JudolLens label
- Warning: keep text visible but mark it as suspicious
- Highlight Unicode: mark suspicious spans inline

Recommended label:

```text
Terdeteksi JudolLens
```

Safe DOM rules:

- avoid broad `innerHTML` rewrites
- do not remove original page elements
- skip `script`, `style`, `input`, `textarea`, and editable fields
- use small wrapper spans only when needed
- use stable JudolLens class names such as `judollens-detected`, `judollens-blur`, and `judollens-unicode-span`
- avoid reprocessing the same node repeatedly

EXT-008 implementation notes:

- content script applies overlays only after background returns prediction results
- high-risk `blur` results use `judollens-detected judollens-blur`
- medium-risk `warn` results use `judollens-detected judollens-warning`
- suspicious Unicode characters use `judollens-unicode-span`
- the compact label text is `Terdeteksi JudolLens`
- overlay CSS is injected once per page with `style[data-judollens-style]`

## Visual Tone

Use a calm security visual style with clear research evidence. Avoid a noisy cyberpunk look. Risk badges should be readable and restrained.

Suggested status colors:

- active: blue or green
- warning/Unicode: amber or violet
- high risk: red
- disabled: gray

## Screen Priority

```text
MVP 1:
1. Popup
2. On-page overlay
3. Simulation page

MVP 2:
4. Options page
5. Log review page
6. Manual analysis page
```

Do not polish secondary screens before the automatic protection flow is working end to end.
