# JudolLens Storage Model

This document defines local extension state for JudolLens. Use object-based storage keys so React pages, background scripts, and content scripts share predictable state shapes.

## Storage Principles

- Store enough evidence for demos, debugging, and thesis evaluation.
- Avoid full page histories, full DOM snapshots, and long private text.
- Keep object shapes versioned with `schemaVersion`.
- Let the background service worker coordinate writes to stats and logs.
- Keep content scripts focused on scanning, messaging, and page annotations.

## Storage Keys

Use these primary keys:

```text
settings:extension
stats:session
logs:detections
manual:lastAnalysis
```

Optional later:

```text
cache:predictions
```

Prefer these object-based keys over many tiny setting keys. Popup and options pages usually need the full settings snapshot, and object keys make default resets, migrations, debugging, and consistent updates simpler.

The canonical frontend type implementation lives in `apps/browser-extension/src/shared/storage.ts`. The storage helper implementation lives in `apps/browser-extension/src/storage/` and is exported through `@/storage`. Keep storage helpers and React/background usage aligned with those exported types.

WXT manifest must include the `storage` permission before any `wxt/utils/storage` helper is used in popup, background, options, logs, or manual analysis pages.

## settings:extension

Used by popup, options, background, and content scripts.

```ts
export type ExtensionSettings = {
  schemaVersion: 1
  predictionMode: "mock" | "api"
  apiEndpoint: string
  threshold: number
  censorMode: "blur" | "warn" | "hide" | "none"
  autoBlur: boolean
  highlightUnicode: boolean
  platformScope: {
    youtube: boolean
    telegram: boolean
    x: boolean
    simulation: boolean
    otherSites: boolean
  }
  maxLogs: number
  storeBoundedEvidence: boolean
  storeSourceUrl: boolean
}
```

Default value:

```ts
export const defaultExtensionSettings: ExtensionSettings = {
  schemaVersion: 1,
  predictionMode: "mock",
  apiEndpoint: "http://localhost:8000",
  threshold: 0.75,
  censorMode: "blur",
  autoBlur: true,
  highlightUnicode: true,
  platformScope: {
    youtube: true,
    telegram: true,
    x: true,
    simulation: true,
    otherSites: false,
  },
  maxLogs: 200,
  storeBoundedEvidence: true,
  storeSourceUrl: false,
}
```

## stats:session

Used mainly by the popup.

```ts
export type SessionStats = {
  schemaVersion: 1
  sessionId: string
  startedAt: string
  updatedAt: string
  protectionStatus: "active" | "disabled" | "unsupported" | "error"
  activePlatform: "youtube" | "telegram" | "x" | "simulation" | "unknown"
  activeUrl?: string
  predictionMode: "mock" | "api"
  scannedCount: number
  detectedCount: number
  unicodeSuspiciousCount: number
  lastScanTimeMs?: number
  lastError?: {
    code: string
    message: string
    occurredAt: string
  }
}
```

Only store `activeUrl` when `settings.storeSourceUrl` is true.

## logs:detections

Used by the log page, popup recent detections, and evaluation work.

```ts
export type DetectionLog = {
  id: string
  timestamp: string
  platform: "youtube" | "telegram" | "x" | "simulation" | "unknown"
  sourceUrl?: string
  snippet: string
  label: "judol" | "non_judol"
  confidence: number
  riskLevel: "low" | "medium" | "high"
  action: "none" | "warn" | "blur" | "hide"
  matchedTerms: string[]
  unicodeAnalysis: {
    hasSuspiciousUnicode: boolean
    suspiciousCount: number
    spans: Array<{
      start: number
      end: number
      char: string
      reason: "homoglyph" | "invisible" | "symbol" | "mixed_script" | "unknown"
      normalizedAs?: string
      unicodeName?: string
    }>
  }
  model: {
    name: string
    version: string
    architecture: string
    isMock: boolean
  }
  requestId?: string
  itemId?: string
}
```

Rules:

- Keep at most `settings.maxLogs` entries.
- Store logs newest-first so popup and log review screens can read recent detections without extra sorting.
- Store short snippets only, around 160-240 characters.
- Do not store full page text or full browsing history.
- Omit `sourceUrl` when `settings.storeSourceUrl` is false.
- Logs must be clearable from the UI.

## manual:lastAnalysis

Used by the manual analysis page and context menu flow.

```ts
export type ManualAnalysisState = {
  schemaVersion: 1
  inputText: string
  sourcePlatform: "youtube" | "telegram" | "x" | "simulation" | "unknown"
  sourceUrl?: string
  analyzedAt?: string
  result?: PredictionResult
}
```

Rules:

- Treat this as temporary state.
- Limit input text length, for example 2,000 characters.
- Clear it when the user clears the manual input.
- Convert the result into a `DetectionLog` only when the user chooses to save it.
- Omit `sourceUrl` when `settings.storeSourceUrl` is false.

## cache:predictions

Do not add persistent prediction cache in MVP 1. Prefer in-memory deduplication in the content script first.

If persistent cache becomes necessary later:

```ts
export type PredictionCache = {
  schemaVersion: 1
  entries: Record<
    string,
    {
      textHash: string
      result: PredictionResult
      cachedAt: string
    }
  >
}
```

## Write Ownership

```text
Popup
- reads settings, stats, and recent logs
- updates quick settings such as protection, auto-blur, and Unicode highlight

Options page
- reads and updates settings
- clears logs through background messaging

Content script
- reads settings
- sends scan candidates and page status to background
- does not write detection logs directly

Background service worker
- updates stats
- appends and trims logs
- updates manual analysis state from context menu
- coordinates mock/API prediction

Manual analysis page
- reads and updates manual:lastAnalysis
- asks background to save selected results to logs
```

## Privacy Requirements

- Keep logs bounded.
- Store snippets, not full pages.
- Keep source URL storage off by default.
- Do not store full DOM, full browsing history, access tokens, or account identifiers.
- Provide clear logs behavior.
- Keep manual selected text temporary unless the user saves it.

## Evaluation Support

This model supports thesis reporting through:

- scanned count
- detected count
- Unicode suspicious count
- confidence and risk level
- matched terms
- Unicode spans
- action applied
- model name and version
- API or mock prediction mode
- scan timing from `lastScanTimeMs`
