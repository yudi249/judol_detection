# JudolLens Frontend Roadmap

This document defines the frontend-first implementation roadmap for the JudolLens browser extension. Focus on a working WXT extension before integrating FastAPI or the final ML model.

## Current Focus

Build the extension frontend end to end:

```text
WXT + React + TypeScript
-> Tailwind CSS + shadcn/ui foundation
-> mock predictor
-> storage
-> popup
-> DOM scanner
-> background coordinator
-> on-page overlay
-> MutationObserver
-> simulation page
-> options/logs/manual analysis
```

Delay these until the frontend MVP is stable:

- FastAPI integration
- real ML model inference
- backend deployment
- production API health checks
- model-serving optimization

The mock predictor must remain contract-compatible so the frontend can switch to FastAPI later without UI rewrites.

The UI foundation should use Tailwind CSS, shadcn/ui, and lucide-react for extension-owned React screens. Do not use shadcn components or Tailwind preflight for third-party page DOM overlays.

## Milestone 0: Scaffold WXT + React

Goal: the extension project exists and can run in development mode.

- create WXT + React + TypeScript app under `apps/browser-extension/`
- add background, content, popup, options, and manual-analysis entrypoint folders
- keep entrypoints thin and reusable logic under `src/`
- verify the dev command starts

Done when the popup shell loads in a browser.

## Milestone 1: UI Foundation

Goal: Tailwind CSS and selected shadcn/ui components are ready for JudolLens extension-owned screens.

- install and configure Tailwind CSS for WXT + React
- initialize shadcn/ui with local component output
- install `lucide-react` for icons
- define JudolLens theme tokens from `docs/extension/ui-theme.md`
- add only the first component set needed for MVP UI: Button, Badge, Switch, Input, Textarea, Select, Slider, Table, Tabs, Tooltip, and Separator
- keep content-script page overlays on lightweight scoped CSS, not shadcn

Done when Tailwind classes work in a React extension screen, at least one shadcn/ui component imports successfully, and `pnpm compile` plus `pnpm build` pass.

## Milestone 2: Shared Frontend Types

Goal: all extension parts share the same contracts.

- add prediction types from `api-contract.md`
- add storage types from `storage-model.md`
- add settings defaults
- add typed message names
- add platform detection types

Done when popup, background, content, storage, and mock predictor can import shared types.

## Milestone 3: Mock Predictor

Goal: predictions work without backend services.

- implement keyword and phrase matching
- implement Unicode normalization and suspicious span extraction
- implement deterministic scoring
- map score to label, risk, and action
- return API-compatible results
- add focused tests for normal, judol, Unicode-obfuscated, and false-positive trap cases

Done when `bοnus slοt gacor` returns judol with Unicode evidence.

## Milestone 4: Storage Layer

Goal: extension state can be read and updated consistently.

- implement `settings:extension`
- implement `stats:session`
- implement `logs:detections`
- implement `manual:lastAnalysis`
- add helpers for defaults, updates, log trimming, and clearing logs

Done when popup can read default settings and stats from storage.

## Milestone 5: Popup MVP

Goal: JudolLens has a useful control center.

- show JudolLens header, platform, status, and prediction mode
- add protection, auto-blur, and Unicode-highlight toggles
- show scanned, detected, Unicode suspicious, and last scan counters
- show recent detection summary
- show Logs and Options navigation placeholders until the real pages are built in Milestone 11
- support active, detected, disabled, unsupported, and error states

Done when popup reflects storage-backed state.

EXT-005 renders Logs and Options as visible disabled placeholders. The actual Logs and Options pages are built in Milestone 11.

## Milestone 6: Content Script Scanner

Goal: the extension can collect visible text candidates from pages.

- use `TreeWalker` for text-node scanning
- skip unsafe or irrelevant elements
- skip inputs, textareas, editable fields, scripts, and styles
- track processed nodes
- create batched text candidates
- send typed messages to background

Done when the content script can scan the simulation page without changing it.

EXT-006 implements extraction only: the content script builds a typed scan batch and sends it best-effort to background, but prediction, stats/log writes, overlays, and dynamic rescans wait for later milestones.

## Milestone 7: Background Coordinator

Goal: background coordinates prediction and state updates.

- receive batch prediction messages
- call the mock predictor
- update session stats
- append bounded logs
- return prediction results to content script
- handle errors without dropping the whole batch

Done when scanning produces popup counters and recent logs.

EXT-007 wires `judollens:scan-batch` in the background service worker to the mock predictor and storage helpers. Content scripts still only scan/send, and page overlays remain deferred to Milestone 8.

## Milestone 8: On-Page Overlay

Goal: detections are visible on the target page.

- apply blur or warning action
- add compact `Terdeteksi JudolLens` label
- highlight suspicious Unicode spans
- avoid broad `innerHTML` rewrites
- avoid duplicate processing

Done when detected judol text on the simulation page is blurred or warned and Unicode spans are highlighted.

EXT-008 applies overlays from background prediction responses in the content script. It uses vanilla DOM wrappers and scoped `judollens-*` CSS only; MutationObserver and dynamic rescans remain Milestone 9.

## Milestone 9: MutationObserver

Goal: dynamic content is handled.

- observe added nodes
- debounce scan batches
- avoid rescanning unchanged nodes
- process newly inserted simulation posts

Done when a dynamically inserted judol post is detected after page load.

EXT-009 implements this as added-node-only dynamic scanning: content script starts
a debounced `MutationObserver` after the initial scan, scans only newly added
visible roots, reuses the same processed-node `WeakSet`, and ignores JudolLens
overlay nodes. Product simulation remains Milestone 10; EXT-009 uses an e2e
fixture only for verification.

## Milestone 10: Simulation Page

Goal: thesis evaluation has a repeatable local demo target.

- add normal clean text
- add basic judol text
- add Unicode-obfuscated judol text
- add mixed feed
- add dynamic insert button
- keep expected-answer labels out of scannable feed content

Done when the full MVP 1 flow works from simulation page to popup/log evidence.

EXT-010 implements the simulation as a local HTTP target page under
`apps/browser-extension/simulation/`, served by `pnpm simulation` at
`http://127.0.0.1:4173/`. It is intentionally not a `chrome-extension://`
React page so the content script scans and annotates it like a third-party
target page. Expected answers stay in data attributes/JSON metadata, not visible
feed text.

## Milestone 11: Options + Logs

Goal: MVP 2 adds useful control and research evidence review.

- implement options page settings
- implement log review page summary
- add table, filters, row detail, and clear logs
- show matched terms, Unicode evidence, reasons, action, and model metadata

Done when stored detections can be reviewed and filtered.

EXT-011 implements Options and Logs as real extension-owned React pages.
Options opens in a tab through WXT `options.html`, loads state through the
background coordinator, updates settings through `judollens:update-settings`,
and keeps API health check as a disabled coming-soon item. Logs is an unlisted
extension page at `logs.html` with summary cards, search/platform/risk/Unicode
filters, a detection table, a detail panel, and clear-log behavior. Popup Logs
and Options buttons now navigate to these pages instead of placeholders.

## Milestone 12: Manual Analysis

Goal: selected or pasted text can be inspected directly.

- add context menu entry
- store selected text in `manual:lastAnalysis`
- implement manual analysis page
- run mock prediction on pasted or selected text
- show matched terms and Unicode breakdown
- allow saving result to logs

Done when selected page text can be analyzed and saved as evidence.

## MVP Boundaries

MVP 1 is complete after Milestone 10.

MVP 2 is complete after Milestone 12.

FastAPI integration starts only after frontend MVP behavior is stable, unless explicitly requested.

## Verification Focus

Each milestone should include focused verification:

- popup loads and reflects storage
- popup e2e runs through Playwright with the built extension loaded
- Tailwind and shadcn components compile in extension-owned React screens
- mock predictor returns deterministic results
- scanner avoids unsafe DOM nodes
- overlay does not break simulation layout
- logs remain bounded
- Unicode evidence appears in popup/log/manual UI
- dynamic insertion is detected
