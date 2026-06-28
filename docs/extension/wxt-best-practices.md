# WXT Best Practices

This guide is the working standard for `apps/browser-extension/`. Follow it before changing the browser extension.

## Stack Decision

Use WXT + React + TypeScript.

- WXT provides the Manifest V3 extension structure, build flow, entrypoints, and browser compatibility.
- React is for extension-owned UI: popup, options, log page, manual analysis, and optional injected overlay UI.
- Vanilla Web APIs are for page-owned DOM work: scanning text nodes, observing mutations, applying blur, and highlighting Unicode characters.

## Recommended Structure

```text
apps/browser-extension/
|-- entrypoints/
|   |-- background.ts
|   |-- content.ts
|   |-- popup/
|   |   |-- index.html
|   |   `-- main.tsx
|   |-- options/
|   |   |-- index.html
|   |   `-- main.tsx
|   `-- manual-analysis/
|       |-- index.html
|       `-- main.tsx
|-- src/
|   |-- api/
|   |-- detection/
|   |-- dom/
|   |-- messaging/
|   |-- storage/
|   |-- types/
|   `-- unicode/
`-- public/
```

Keep entrypoints thin. Put reusable logic in `src/`.

## Entrypoint Rules

Do not call `browser.*`, `chrome.*`, or page DOM APIs at the top level of entrypoint files. WXT processes entrypoint modules in environments where those globals may not exist.

Use WXT entrypoint functions:

```ts
export default defineBackground(() => {
  browser.runtime.onMessage.addListener(() => {
    // background logic
  })
})
```

```ts
export default defineContentScript({
  matches: ["<all_urls>"],
  main(ctx) {
    // DOM scanning, MutationObserver, blur/highlight
  },
})
```

Prefer `ctx` helpers for content-script timers/listeners where possible so cleanup follows the extension lifecycle.

## React Usage

Use React for UI owned by the extension:

- popup status and settings
- options page
- detection log table
- manual analysis page
- optional floating analysis panel

Do not use React as the main engine for third-party page DOM scanning or mutation. The target page owns that DOM and may re-render it independently.

If injecting React UI into a page, prefer WXT Shadow Root UI for style isolation. Use integrated UI only when style isolation is not needed. Use iframe UI only when strong isolation is worth the extra complexity.

## Content Script Responsibilities

The content script should:

- collect visible text candidates from target pages
- track new content with `MutationObserver`
- send batches for prediction
- apply blur/overlay classes to detected judol text
- highlight suspicious Unicode spans
- avoid destructive changes to page structure

Use `TreeWalker` and text-node aware helpers for scanning. Avoid broad `innerHTML` rewrites.

## Background Responsibilities

The background service worker should:

- coordinate messages between popup/content scripts
- call mock predictor or FastAPI endpoints
- register context menu actions
- centralize extension-level permissions and API access
- update shared storage when needed

Keep model/API contracts in `src/types/` so UI, background, and content scripts agree.

## Storage

Use WXT storage utilities for settings and local state. Suggested key groups:

```text
settings:autoBlur
settings:highlightUnicode
settings:confidenceThreshold
settings:apiEndpoint
stats:session
logs:detections
```

Do not store raw private user data longer than needed. Keep logs small and clearable.

## Messaging

Create typed messaging helpers in `src/messaging/`. Avoid scattered string literals for message names.

Good message names:

```text
prediction:batch
prediction:manual
settings:get
settings:update
logs:add
logs:clear
```

Each message should have explicit request and response types.

## Development Order

1. Build WXT shell with React popup.
2. Add mock detector and typed prediction result.
3. Implement DOM scanner and MutationObserver.
4. Add blur, overlay, and Unicode highlight.
5. Add logs, options, and manual analysis UI.
6. Replace mock detector with FastAPI `/predict/batch`.
