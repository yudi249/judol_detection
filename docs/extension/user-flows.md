# Extension User Flows

This document defines the user-facing flows for the browser extension MVP. Keep UI, messaging, and storage changes aligned with these flows.

## Flow Priorities

```text
P0 - required for MVP
- Automatic protection
- Popup monitoring
- Basic options
- Simulation/evaluation

P1 - strong demo additions
- Log review
- Manual analysis

P2 - polish
- Mini inspection overlay
- Export logs
- Notifications
```

The core story for the thesis demo is:

```text
System activates -> detects content -> censors content -> explains why -> stores evidence -> supports evaluation
```

## 1. Automatic Protection Flow

Purpose: prove the proposal requirement for realtime DOM scanning, content censorship, and Unicode highlighting.

```text
User opens YouTube, Telegram Web, X, or simulation page
-> content script starts on matched URL
-> content script scans visible text nodes
-> text candidates are sent as a batch to background
-> background calls mock predictor or FastAPI
-> background returns prediction results
-> content script applies blur/overlay to judol text
-> content script highlights suspicious Unicode spans
-> background stores stats and detection logs
-> popup shows updated session summary
```

Success criteria:

- visible text is scanned without breaking the page layout
- detected judol text receives the configured action
- suspicious Unicode spans can be highlighted
- repeated scans avoid reprocessing the same node unnecessarily
- new lazy-loaded or realtime content is handled by `MutationObserver`

## 2. Popup Monitoring Flow

Purpose: provide the extension's main control center for demo and daily use.

```text
User clicks extension icon
-> popup opens
-> popup reads settings, session stats, and recent logs
-> user sees current platform and protection status
-> user sees scanned count, detected count, and Unicode suspicious count
-> user toggles auto-blur or Unicode highlight
-> user opens Log or Options
```

Popup should show:

- active/inactive protection state
- detected platform
- scanned text count
- detected judol count
- Unicode suspicious count
- recent detections
- auto-blur toggle
- Unicode highlight toggle
- links to log and options pages

## 3. Detection Inspection Flow

Purpose: let users understand why text was censored without overloading the page.

MVP behavior:

```text
User sees blurred text
-> overlay label indicates detected judol content
-> user can open logs for details
```

Polished behavior:

```text
User clicks or hovers overlay
-> mini detail panel appears
-> panel shows confidence, matched terms, and Unicode evidence
```

Keep page overlay lightweight. Full explanations belong in log or manual analysis UI.

## 4. Log Review Flow

Purpose: provide evidence for debugging, demo, and thesis evaluation.

```text
User opens Log page
-> React page reads logs:detections
-> user sees detection table
-> user filters by platform, risk level, label, or Unicode presence
-> user searches snippets
-> user opens a row detail
-> detail shows snippet, confidence, matched terms, Unicode spans, action, and model
-> user can clear logs
```

Logs must store bounded evidence only. Do not store full page histories.

## 5. Manual Analysis Flow

Purpose: support researcher-driven inspection of selected text.

```text
User selects text on a page
-> user opens context menu
-> user selects "Analisis Judol"
-> background receives selected text
-> predictor returns one prediction result
-> manual analysis page or card opens
-> user sees label, confidence, matched terms, and Unicode breakdown
-> user can save the result to logs
```

Manual analysis can use `POST /predict` later. During MVP it may use the same mock predictor as batch detection.

## 6. Options Flow

Purpose: allow safe switching between mock and API modes and tune detection behavior.

```text
User opens Options
-> user selects prediction mode: mock or API
-> user edits API endpoint
-> user sets confidence threshold
-> user chooses censor mode: blur, hide, or warning only
-> user enables or disables Unicode highlight
-> settings are saved to WXT storage
-> background and content scripts use updated settings
```

Required settings:

- prediction mode
- API endpoint
- confidence threshold
- censor mode
- auto-blur enabled
- Unicode highlight enabled
- platform scope

## 7. Simulation and Evaluation Flow

Purpose: make thesis evaluation repeatable and less dependent on dynamic third-party platforms.

```text
User opens local simulation page
-> page contains normal text, judol text, and Unicode-obfuscated judol text
-> extension scans page
-> extension applies blur/highlight
-> popup/log records stats
-> researcher computes detection success rate, false positive rate, scan time, and API time
```

Simulation page should include:

- no-judol scenario
- one judol text
- many judol texts
- normal texts that should not be censored
- Unicode-obfuscated judol text
- dynamic insertion to test `MutationObserver`

## Screen Ownership

```text
Content script
- automatic protection
- page overlay
- Unicode highlight

Background
- prediction coordination
- settings/log/stat updates
- context menu

React popup
- status and quick controls

React log page
- detection history and details

React options page
- configuration

React manual analysis
- selected text explanation
```

## Implementation Order

1. Automatic protection with mock predictor.
2. Popup monitoring with real session stats.
3. Basic options for toggles and threshold.
4. Simulation page for repeatable testing.
5. Log review page.
6. Manual analysis via context menu.
7. Mini inspection overlay.

Do not build P2 polish before P0 and P1 flows are stable.
