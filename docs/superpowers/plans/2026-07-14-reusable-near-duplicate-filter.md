# Reusable Near-Duplicate Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement task-by-task.

**Goal:** Add reusable token-Jaccard near-duplicate checks and optional candidate-only storage.

**Architecture:** `collection/deduplication.py` canonicalizes text and computes similarity. `CollectionStorage` applies candidate filtering and near-duplicate checks before inserting; collectors remain unchanged except Telegram opts into candidate-only mode.

**Tech Stack:** Python 3.12, sqlite3, pytest.

---

### Task 1: Pure deduplication helpers

- [ ] Write failing tests for URL/mention/number-normalized templates, 0.85 boundary, and clearly different messages.
- [ ] Implement `canonicalize_for_deduplication`, `jaccard_similarity`, and `is_near_duplicate` in `src/judol_detection/collection/deduplication.py`.
- [ ] Run focused tests until PASS.

### Task 2: Storage integration

- [ ] Write failing storage tests for `candidate_only=True` rejecting weak-label zero and near templates being skipped.
- [ ] Add storage configuration, `skipped_non_candidate`, `skipped_near_duplicate`, and comparison against stored canonical forms.
- [ ] Run full pytest until PASS.

### Task 3: Telegram pilot configuration

- [ ] Add CLI `--candidate-only` and `--near-duplicate-threshold` defaults for Telegram pilot.
- [ ] Verify dry-run and record results in project progress artifacts.
