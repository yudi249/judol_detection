# Extension API Contract

This document defines the prediction contract shared by the WXT extension, mock predictor, FastAPI backend, storage logs, and React UI. Keep mock and real API responses compatible.

## Design Goals

The contract must support:

- detection: classify text as judol or non-judol
- UI action: tell the extension whether to blur, warn, hide, or do nothing
- explainability: expose matched terms, reasons, and Unicode evidence
- evaluation: expose counts and latency for thesis reporting
- migration: allow the mock predictor to be replaced by FastAPI without rewriting UI

## Endpoints

MVP endpoints:

```http
GET /health
POST /predict
POST /predict/batch
```

Use `/predict` for manual analysis of one text. Use `/predict/batch` for content script DOM batches.

## Batch Request

```json
{
  "request_id": "req_20260628_001",
  "source": {
    "url": "https://www.youtube.com/watch?v=abc",
    "platform": "youtube",
    "page_title": "Video Example",
    "captured_at": "2026-06-28T10:15:30+07:00"
  },
  "client": {
    "extension_version": "0.1.0",
    "prediction_mode": "mock",
    "threshold": 0.75
  },
  "items": [
    {
      "id": "node_001",
      "text": "bonus new member slot gacor malam ini",
      "context": {
        "kind": "comment",
        "selector_hint": "ytd-comment-thread-renderer",
        "visible": true,
        "language_hint": "id"
      }
    }
  ]
}
```

### Request Field Rationale

- `request_id`: links extension logs, API logs, and evaluation traces
- `source.url`: records where the scan occurred
- `source.platform`: enables filtering by YouTube, Telegram Web, X, or simulation page
- `source.captured_at`: supports timeline logs and evaluation
- `client.extension_version`: preserves reproducibility as the extension changes
- `client.prediction_mode`: distinguishes mock, API, and future offline modes
- `client.threshold`: lets UI and backend share the same action threshold
- `items[].id`: maps each prediction back to the correct DOM candidate
- `items[].context.kind`: helps UI explain whether text came from a comment, post, or message
- `items[].context.selector_hint`: supports debugging without storing full sensitive selectors
- `items[].context.visible`: marks text relevant to the user-facing page
- `items[].context.language_hint`: records the Indonesian-language research scope

## Batch Response

```json
{
  "request_id": "req_20260628_001",
  "model": {
    "name": "mock-keyword-unicode",
    "version": "0.1.0",
    "architecture": "mock",
    "is_mock": true
  },
  "summary": {
    "total_items": 1,
    "judol_count": 1,
    "unicode_suspicious_count": 0,
    "processing_time_ms": 18
  },
  "results": [
    {
      "id": "node_001",
      "label": "judol",
      "confidence": 0.94,
      "risk_level": "high",
      "action": "blur",
      "reasons": [
        { "type": "keyword", "value": "slot", "weight": 0.3 },
        { "type": "keyword", "value": "gacor", "weight": 0.25 },
        { "type": "keyword", "value": "bonus", "weight": 0.18 }
      ],
      "matched_terms": ["bonus", "slot", "gacor"],
      "unicode_analysis": {
        "has_suspicious_unicode": false,
        "suspicious_count": 0,
        "spans": []
      },
      "display": {
        "snippet": "bonus new member slot gacor malam ini",
        "highlight_ranges": [
          { "start": 0, "end": 5, "kind": "matched_term" },
          { "start": 17, "end": 21, "kind": "matched_term" },
          { "start": 22, "end": 27, "kind": "matched_term" }
        ]
      }
    }
  ],
  "errors": []
}
```

### Response Field Rationale

- `model`: identifies mock, CNN, BiLSTM, or IndoBERT output
- `model.is_mock`: prevents demo mock results from being confused with final model results
- `summary`: feeds popup stats without recomputing every item
- `processing_time_ms`: supports API latency and end-to-end evaluation
- `risk_level`: gives UI stable badge levels
- `action`: lets the backend recommend `none`, `warn`, `blur`, or `hide`
- `reasons`: provides explainability for logs and manual analysis
- `matched_terms`: highlights judol terms in UI
- `unicode_analysis`: supports the thesis focus on Unicode manipulation
- `display.snippet`: stores a bounded text preview instead of full page history
- `display.highlight_ranges`: lets UI highlight terms and Unicode spans consistently
- `errors`: allows partial failure without dropping the whole batch

## Unicode Evidence Example

For text such as `ѕlοt gаcοr`, return spans with Unicode details:

```json
{
  "unicode_analysis": {
    "has_suspicious_unicode": true,
    "suspicious_count": 4,
    "spans": [
      {
        "start": 0,
        "end": 1,
        "char": "ѕ",
        "reason": "homoglyph",
        "normalized_as": "s",
        "unicode_name": "CYRILLIC SMALL LETTER DZE"
      },
      {
        "start": 2,
        "end": 3,
        "char": "ο",
        "reason": "homoglyph",
        "normalized_as": "o",
        "unicode_name": "GREEK SMALL LETTER OMICRON"
      }
    ]
  }
}
```

## TypeScript Contract

Use camelCase in extension TypeScript and map to snake_case only at API boundaries if needed.

```ts
export type JudolLabel = "judol" | "non_judol"
export type RiskLevel = "low" | "medium" | "high"
export type DetectionAction = "none" | "warn" | "blur" | "hide"
export type PredictionMode = "mock" | "api" | "offline"

export type UnicodeSpan = {
  start: number
  end: number
  char: string
  reason: "homoglyph" | "invisible" | "symbol" | "mixed_script" | "unknown"
  normalizedAs?: string
  unicodeName?: string
}

export type HighlightRange = {
  start: number
  end: number
  kind: "matched_term" | "unicode_suspicious"
}

export type DetectionReason = {
  type: "keyword" | "unicode" | "model_signal"
  value: string
  weight: number
}

export type PredictionResult = {
  id: string
  label: JudolLabel
  confidence: number
  riskLevel: RiskLevel
  action: DetectionAction
  reasons: DetectionReason[]
  matchedTerms: string[]
  unicodeAnalysis: {
    hasSuspiciousUnicode: boolean
    suspiciousCount: number
    spans: UnicodeSpan[]
  }
  display: {
    snippet: string
    highlightRanges: HighlightRange[]
  }
}
```

## Mock Predictor Rules

The mock predictor should return the same shape as FastAPI. Initial judol terms:

```text
slot
gacor
deposit
bonus
maxwin
rtp
scatter
pragmatic
togel
jackpot
```

Mock confidence should be deterministic. For example, increase confidence based on keyword count and suspicious Unicode count, then cap at `0.99`.

## Log Mapping

Detection logs should store bounded evidence:

```ts
export type DetectionLog = {
  id: string
  timestamp: string
  platform: string
  sourceUrl: string
  snippet: string
  label: JudolLabel
  confidence: number
  riskLevel: RiskLevel
  action: DetectionAction
  matchedTerms: string[]
  hasSuspiciousUnicode: boolean
  modelName: string
  modelVersion: string
}
```

Do not store full page text or full browsing history.
