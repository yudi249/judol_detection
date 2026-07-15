# Paper-Based Keyword Evidence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace flat keyword weak labels with paper-based tiered evidence rules.

**Architecture:** Keep the public `classify_weak_label(text)` API. Internal keyword groups and contact detection produce deterministic `WeakLabelResult` reasons; collection storage and Telegram discovery consume the unchanged result.

**Tech Stack:** Python 3.12, pytest.

---

### Task 1: Specify evidence behavior in tests

**Files:** Modify `tests/unit/test_collection_keywords.py`.

- [ ] Add failing cases: `slot` is positive with `strong:slot`; `bonus` and `untung` alone are negative; `bonus deposit` is positive; `deposit https://example.test` is positive; `b0nus` without another signal is negative.
- [ ] Run `uv run --no-cache python -m pytest tests/unit/test_collection_keywords.py -q`; expected failure because the flat matcher labels ambiguous terms positive.

### Task 2: Implement tiers and deterministic reasons

**Files:** Modify `src/judol_detection/collection/keywords.py`.

- [ ] Define ordered strong phrases/terms, supporting terms, access/transaction supporting terms, and contact regex from the approved spec.
- [ ] Implement the four decision rules in the spec without changing `WeakLabelResult` fields or `classify_weak_label` signature.
- [ ] Run focused tests; expected PASS.

### Task 3: Verify downstream compatibility and document evidence

**Files:** Modify `docs/research/judol-keyword-baseline.md`, `claude-progress.md`, `feature_list.json`.

- [ ] Run `uv run --no-cache python -m pytest` and a Telegram collector dry-run.
- [ ] Record the paper-based tier decision, exact verification command, and result. Commit only after all checks pass.

## Self-review

The plan changes only weak-label classification, preserves collector/storage contracts, and covers strong, ambiguous, contact, phrase, and obfuscation behavior.
