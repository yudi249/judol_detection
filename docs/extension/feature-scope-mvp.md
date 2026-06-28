# Extension MVP Feature Scope

This document defines the feature boundary for the first browser extension MVP. The extension is a research-first prototype for a thesis, while still being usable and convincing during demos.

## MVP Positioning

The MVP should prove this thesis story:

```text
The extension detects Indonesian judol promotion content,
including Unicode-obfuscated variants,
then applies a visible action and stores bounded evidence for evaluation.
```

Treat the extension as a research prototype, not a full consumer safety product yet. Prefer features that support detection, explainability, reproducibility, and thesis evaluation.

## MVP 1: Required Core

Build these first.

- WXT + React + TypeScript shell for popup and extension-owned pages.
- Mock predictor that follows `docs/extension/api-contract.md`.
- Content-script DOM scanner for visible text nodes.
- Batch prediction messaging between content script and background.
- Blur or warning action for detected judol text.
- Unicode highlighting for suspicious characters or spans.
- `MutationObserver` support for dynamically inserted page content.
- Popup monitoring with protection state, platform, scanned count, detected count, and Unicode suspicious count.
- Bounded detection logs with timestamp, platform, snippet, confidence, matched terms, Unicode evidence, action, and model metadata.
- Local simulation page with normal, judol, Unicode-obfuscated, and dynamically inserted examples.

MVP 1 is complete when a demo page can show scanning, detection, blur/warning, Unicode evidence, popup counters, and stored logs without depending on the real ML API.

## MVP 2: Strong Demo Additions

Build these after MVP 1 works end to end.

- Options page for prediction mode, API endpoint, threshold, censor mode, auto-blur, Unicode highlight, and platform scope.
- Log review page with search, filters, row detail, and clear logs action.
- Manual analysis via context menu for selected text.
- Manual analysis UI that explains label, confidence, matched terms, and Unicode breakdown.

MVP 2 should make the prototype easier to explain in a thesis defense and easier to debug during development.

## Post-MVP

Delay these until MVP 1 and MVP 2 are stable.

- FastAPI integration with the real model.
- Real CNN, BiLSTM, IndoBERT, or ensemble inference.
- Report-ready evaluation notebooks and figures.
- Polished mini inspection overlay.
- Export logs.
- Notification system.
- Chrome Web Store packaging.
- Cloud sync or user accounts.
- Running the ML model fully inside the browser.
- Large analytics dashboard.

## Non-Goals

Do not add these during MVP work.

- Store full page histories or full browsing logs.
- Require user login.
- Depend on cloud services for basic demo behavior.
- Build a generic moderation extension for all harmful content.
- Rewrite third-party page DOM with broad `innerHTML` changes.
- Add new prediction response shapes without updating the API contract.

## Feature Acceptance Criteria

Every MVP feature should answer at least one of these questions:

- Does it help prove Unicode-robust judol detection?
- Does it expose evidence useful for thesis evaluation?
- Does it make the extension demo clearer?
- Does it preserve the mock-to-FastAPI migration path?

If the answer is no, postpone the feature.

## Implementation Priority

```text
1. WXT + React shell
2. Shared types and mock predictor
3. Content-script DOM scanner
4. Batch messaging
5. Blur/warning and Unicode highlight
6. Popup monitoring
7. Bounded logs
8. Simulation page
9. Options page
10. Log review page
11. Manual analysis
12. FastAPI integration
```

Keep the prototype small enough that each step can be verified independently.
