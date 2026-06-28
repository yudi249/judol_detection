# JudolLens Frontend Roadmap

This document defines the frontend-first implementation roadmap for the JudolLens browser extension. Focus on a working WXT extension before integrating FastAPI or the final ML model.

## Current Focus

Build the extension frontend end to end:

```text
WXT + React + TypeScript
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

## Milestone 0: Scaffold WXT + React

Goal: the extension project exists and can run in development mode.

- create WXT + React + TypeScript app under `apps/browser-extension/`
- add background, content, popup, options, and manual-analysis entrypoint folders
- keep entrypoints thin and reusable logic under `src/`
- verify the dev command starts

Done when the popup shell loads in a browser.

## Milestone 1: Shared Frontend Types

Goal: all extension parts share the same contracts.

- add prediction types from `api-contract.md`
- add storage types from `storage-model.md`
- add settings defaults
- add typed message names
- add platform detection types

Done when popup, background, content, storage, and mock predictor can import shared types.

## Milestone 2: Mock Predictor

Goal: predictions work without backend services.

- implement keyword and phrase matching
- implement Unicode normalization and suspicious span extraction
- implement deterministic scoring
- map score to label, risk, and action
- return API-compatible results
- add focused tests for normal, judol, Unicode-obfuscated, and false-positive trap cases

Done when `bοnus slοt gacor` returns judol with Unicode evidence.

## Milestone 3: Storage Layer

Goal: extension state can be read and updated consistently.

- implement `settings:extension`
- implement `stats:session`
- implement `logs:detections`
- implement `manual:lastAnalysis`
- add helpers for defaults, updates, log trimming, and clearing logs

Done when popup can read default settings and stats from storage.

## Milestone 4: Popup MVP

Goal: JudolLens has a useful control center.

- show JudolLens header, platform, status, and prediction mode
- add protection, auto-blur, and Unicode-highlight toggles
- show scanned, detected, Unicode suspicious, and last scan counters
- show recent detection summary
- link to Logs and Options
- support active, detected, disabled, unsupported, and error states

Done when popup reflects storage-backed state.

## Milestone 5: Content Script Scanner

Goal: the extension can collect visible text candidates from pages.

- use `TreeWalker` for text-node scanning
- skip unsafe or irrelevant elements
- skip inputs, textareas, editable fields, scripts, and styles
- track processed nodes
- create batched text candidates
- send typed messages to background

Done when the content script can scan the simulation page without changing it.

## Milestone 6: Background Coordinator

Goal: background coordinates prediction and state updates.

- receive batch prediction messages
- call the mock predictor
- update session stats
- append bounded logs
- return prediction results to content script
- handle errors without dropping the whole batch

Done when scanning produces popup counters and recent logs.

## Milestone 7: On-Page Overlay

Goal: detections are visible on the target page.

- apply blur or warning action
- add compact `Terdeteksi JudolLens` label
- highlight suspicious Unicode spans
- avoid broad `innerHTML` rewrites
- avoid duplicate processing

Done when detected judol text on the simulation page is blurred or warned and Unicode spans are highlighted.

## Milestone 8: MutationObserver

Goal: dynamic content is handled.

- observe added nodes
- debounce scan batches
- avoid rescanning unchanged nodes
- process newly inserted simulation posts

Done when a dynamically inserted judol post is detected after page load.

## Milestone 9: Simulation Page

Goal: thesis evaluation has a repeatable local demo target.

- add normal clean text
- add basic judol text
- add Unicode-obfuscated judol text
- add mixed feed
- add dynamic insert button
- keep expected-answer labels out of scannable feed content

Done when the full MVP 1 flow works from simulation page to popup/log evidence.

## Milestone 10: Options + Logs

Goal: MVP 2 adds useful control and research evidence review.

- implement options page settings
- implement log review page summary
- add table, filters, row detail, and clear logs
- show matched terms, Unicode evidence, reasons, action, and model metadata

Done when stored detections can be reviewed and filtered.

## Milestone 11: Manual Analysis

Goal: selected or pasted text can be inspected directly.

- add context menu entry
- store selected text in `manual:lastAnalysis`
- implement manual analysis page
- run mock prediction on pasted or selected text
- show matched terms and Unicode breakdown
- allow saving result to logs

Done when selected page text can be analyzed and saved as evidence.

## MVP Boundaries

MVP 1 is complete after Milestone 9.

MVP 2 is complete after Milestone 11.

FastAPI integration starts only after frontend MVP behavior is stable, unless explicitly requested.

## Verification Focus

Each milestone should include focused verification:

- popup loads and reflects storage
- mock predictor returns deterministic results
- scanner avoids unsafe DOM nodes
- overlay does not break simulation layout
- logs remain bounded
- Unicode evidence appears in popup/log/manual UI
- dynamic insertion is detected
