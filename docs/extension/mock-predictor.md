# JudolLens Mock Predictor

This document defines the rule-based mock predictor for JudolLens. The mock predictor is a serious baseline for development, demos, and thesis comparison, not a throwaway dummy.

## Goals

The mock predictor must:

- follow `docs/extension/api-contract.md`
- return the same result shape expected from FastAPI
- detect obvious Indonesian judol promotion terms
- detect Unicode obfuscation signals
- produce deterministic confidence scores
- expose matched terms, reasons, Unicode spans, and highlight ranges
- be replaceable by FastAPI without UI changes

## Model Metadata

Use this metadata for mock responses:

```ts
const mockModel = {
  name: "mock-keyword-unicode",
  version: "0.1.0",
  architecture: "rule-based",
  isMock: true,
}
```

## Keyword Dictionary

Strong terms:

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
casino
taruhan
```

Weak or contextual terms:

```text
bet
spin
wd
withdraw
saldo
menang
cuan
akun
daftar
link
```

Phrase matches:

```text
new member
deposit 10k
bonus 100
slot gacor
maxwin hari ini
rtp live
link alternatif
daftar sekarang
withdraw cepat
```

Strong terms should contribute more than weak terms. Weak terms should not trigger high confidence by themselves.

## Unicode Normalization

Normalize text before keyword matching while still preserving original character positions for evidence.

Required handling:

- lowercase text
- normalize compatibility forms with NFKC where appropriate
- map common homoglyphs to Latin lookalikes
- map obvious number substitutions such as `0 -> o`, `1 -> i/l`, `3 -> e`, `4 -> a`, `5 -> s`, `7 -> t`
- remove or flag invisible characters for matching
- preserve spans that explain suspicious characters

Common homoglyph examples:

```text
Greek omicron: ο -> o
Cyrillic a: а -> a
Cyrillic e: е -> e
Cyrillic o: о -> o
Cyrillic p: р -> p
Cyrillic c: с -> c
Cyrillic x: х -> x
Mathematical monospace/fullwidth letters -> Latin letters after NFKC
```

Suspicious Unicode reasons:

```text
homoglyph
invisible
symbol
mixed_script
unknown
```

## Unicode Signals

Flag these conditions:

- homoglyph characters that normalize to Latin letters
- zero-width or invisible characters inside words
- mixed Latin with Greek or Cyrillic in a short token
- stylized Unicode letters that normalize to common Latin terms
- symbol or number substitution that helps form a judol term

Example:

```text
bοnus slοt gacor
```

Expected behavior:

```text
normalized text: bonus slot gacor
matched terms: bonus, slot, gacor
unicode suspicious: true
unicode spans: Greek omicron characters
```

## Scoring Formula

Use deterministic scoring. Suggested formula:

```text
score = 0.05
+ 0.25 for each unique strong keyword match
+ 0.12 for each unique weak keyword match
+ 0.10 for each phrase match
+ 0.12 when suspicious Unicode exists
+ 0.04 for each additional suspicious Unicode span after the first
cap at 0.99
```

Clamp final scores:

```text
minimum: 0.01
maximum: 0.99
```

Avoid double-counting the same term repeatedly. A text with `slot slot slot` should not receive unlimited confidence from one repeated keyword.

## Label, Risk, and Action

Label:

```text
score >= threshold -> judol
score < threshold -> non_judol
```

Default threshold:

```text
0.75
```

Risk level:

```text
score >= 0.85 -> high
score >= 0.65 -> medium
otherwise -> low
```

Action:

```text
high -> blur
medium -> warn
low -> none
non_judol -> none
```

If user settings specify `censorMode`, the UI may map judol results to the configured action, but the mock predictor should still return a recommended action.

## Reasons

Return reasons that explain the score.

```ts
type DetectionReason = {
  type: "keyword" | "unicode" | "model_signal"
  value: string
  weight: number
}
```

Examples:

```json
{ "type": "keyword", "value": "slot", "weight": 0.25 }
{ "type": "keyword", "value": "gacor", "weight": 0.25 }
{ "type": "unicode", "value": "homoglyph", "weight": 0.12 }
```

## Highlight Ranges

Return display highlight ranges for:

- matched terms
- suspicious Unicode spans

Use original text offsets when possible. If normalized matching makes exact offsets ambiguous, prioritize Unicode spans and include matched terms without a highlight range rather than returning incorrect offsets.

## Batch Behavior

For `POST /predict/batch` compatible behavior:

- preserve every input item `id`
- return one result per item unless an item-level error occurs
- keep partial failures in `errors`
- compute summary totals from results
- include processing time in milliseconds

Summary fields:

```text
total_items
judol_count
unicode_suspicious_count
processing_time_ms
```

## Example: Plain Judol Text

Input:

```text
bonus new member slot gacor malam ini
```

Expected:

```text
label: judol
confidence: high
risk: high
action: blur
matched terms: bonus, slot, gacor
phrase matches: new member, slot gacor
unicode suspicious: false
```

## Example: Unicode-Obfuscated Judol Text

Input:

```text
bοnus slοt gacor
```

Expected:

```text
label: judol
risk: high
matched terms: bonus, slot, gacor
unicode suspicious: true
reason: homoglyph
unicode spans: Greek omicron characters normalized as o
```

## Example: False Positive Trap

Input:

```text
slot waktu praktikum sudah penuh
```

Expected:

```text
label: non_judol or low risk
matched terms: slot
confidence: below threshold
action: none
```

One keyword alone should not produce a high-risk result unless supported by more judol context.

## Limitations

The mock predictor is not a substitute for the final ML model.

Known limitations:

- cannot deeply understand context
- can miss slang not in the dictionary
- can over-score keyword-heavy benign text
- uses handcrafted Unicode mappings
- should be treated as a baseline in thesis evaluation

When the FastAPI model is integrated, keep this mock predictor available for offline demos, regression tests, and baseline comparison.
